"""
GreenTalk — Accounts Views
============================
JWT auth endpoints:
  POST /api/auth/register/
  POST /api/auth/login/
  POST /api/auth/logout/
  POST /api/auth/token/refresh/
  POST /api/auth/verify-email/
  POST /api/auth/forgot-password/
  POST /api/auth/reset-password/
  GET/PATCH /api/auth/profile/
  PATCH /api/auth/change-password/

Admin user management (super_admin only):
  GET/POST /api/admin/users/
  GET/PATCH /api/admin/users/<id>/

SECURITY:
- Access token returned in JSON response body only (never cookie).
- Refresh token set as HttpOnly, Secure, SameSite=Strict cookie.
- Login and registration are rate-limited via throttle classes.
- Tokens are blacklisted on logout (requires simplejwt blacklist app).
"""

import logging
from django.conf import settings
from django.contrib.auth import authenticate
from django.utils import timezone

from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from apps.core.permissions import IsSuperAdmin
from apps.core.throttles import (
    LoginRateThrottle, PasswordResetRateThrottle, RegisterRateThrottle
)
from apps.audit.utils import log_action

from .models import User, EmailVerificationToken, PasswordResetToken
from .serializers import (
    RegisterSerializer, LoginSerializer, UserDetailSerializer,
    UserUpdateSerializer, ChangePasswordSerializer,
    ForgotPasswordSerializer, ResetPasswordSerializer,
    VerifyEmailSerializer, AdminUserSerializer,
)
from .emails import (
    send_verification_email, send_password_reset_email,
    send_welcome_email,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

REFRESH_COOKIE_NAME = "refresh_token"


def _set_refresh_cookie(response: Response, refresh_token: str) -> Response:
    """
    Store refresh token in HttpOnly, Secure, SameSite=Strict cookie.
    The JS frontend CANNOT read this cookie — prevents XSS token theft.
    SameSite=Strict prevents CSRF exploitation of the cookie.
    """
    secure = getattr(settings, "JWT_REFRESH_COOKIE_SECURE", not settings.DEBUG)
    samesite = getattr(settings, "JWT_REFRESH_COOKIE_SAMESITE", "Strict")
    max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())

    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=max_age,
        httponly=True,    # not accessible via JavaScript
        secure=secure,    # HTTPS only in production
        samesite=samesite,
        path="/api/auth/",  # restrict cookie scope to auth endpoints only
    )
    return response


def _clear_refresh_cookie(response: Response) -> Response:
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/api/auth/")
    return response


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

class RegisterView(APIView):
    """
    POST /api/auth/register/
    Creates a new user account and sends a verification email.
    Rate-limited: 5/hour per IP (RegisterRateThrottle).
    """
    permission_classes = [AllowAny]
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Create and send verification token
        token_obj = EmailVerificationToken.objects.create(user=user)
        send_verification_email(user, token_obj.token)

        log_action(actor=user, action="user.register",
                   target_table="users", target_id=user.pk, request=request)

        return Response(
            {
                "message": "Registration successful. Please check your email to verify your account.",
                "user_id": user.id,
                "email": user.email,
            },
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class LoginView(APIView):
    """
    POST /api/auth/login/
    Returns access token in body; sets refresh token as HttpOnly cookie.
    Rate-limited: 5/minute per IP (LoginRateThrottle).
    """
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        # authenticate() uses USERNAME_FIELD (email) for lookup
        user = authenticate(request, username=email, password=password)

        if user is None:
            logger.warning("Failed login attempt for email: %s", email)
            return Response(
                {"error": True, "message": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {"error": True, "message": "Account is deactivated. Contact support."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Issue JWT tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        log_action(actor=user, action="user.login",
                   target_table="users", target_id=user.pk, request=request)

        response = Response(
            {
                "access": access_token,
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "role": user.role,
                    "is_verified": user.is_verified,
                    "full_name": user.full_name,
                },
            },
            status=status.HTTP_200_OK,
        )
        return _set_refresh_cookie(response, refresh_token)


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklists the refresh token (requires token_blacklist app).
    Clears the refresh token cookie.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                # Token already expired or invalid — still clear cookie
                pass

        log_action(actor=request.user, action="user.logout",
                   target_table="users", target_id=request.user.pk, request=request)

        response = Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)
        return _clear_refresh_cookie(response)


# ---------------------------------------------------------------------------
# Token Refresh
# ---------------------------------------------------------------------------

class TokenRefreshView(APIView):
    """
    POST /api/auth/token/refresh/
    Reads refresh token from HttpOnly cookie, returns new access token.
    Rotate refresh token (new cookie set, old blacklisted).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)

        if not refresh_token:
            return Response(
                {"error": True, "message": "Refresh token not found."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            token = RefreshToken(refresh_token)
            new_access = str(token.access_token)

            # Rotate: issue new refresh token, blacklist old one
            token.blacklist()
            user_id = token.payload.get("user_id")
            user = User.objects.get(pk=user_id)
            new_refresh = RefreshToken.for_user(user)

            response = Response(
                {"access": str(new_access)},
                status=status.HTTP_200_OK,
            )
            return _set_refresh_cookie(response, str(new_refresh))

        except (TokenError, User.DoesNotExist) as e:
            return Response(
                {"error": True, "message": "Invalid or expired refresh token."},
                status=status.HTTP_401_UNAUTHORIZED,
            )


# ---------------------------------------------------------------------------
# Email Verification
# ---------------------------------------------------------------------------

class VerifyEmailView(APIView):
    """
    POST /api/auth/verify-email/
    Accepts the token from the verification email link.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token_str = serializer.validated_data["token"]

        try:
            token_obj = EmailVerificationToken.objects.select_related("user").get(
                token=token_str
            )
        except EmailVerificationToken.DoesNotExist:
            return Response(
                {"error": True, "message": "Invalid verification token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not token_obj.is_valid:
            return Response(
                {"error": True, "message": "Verification token has expired or already been used."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = token_obj.user
        user.is_verified = True
        user.save(update_fields=["is_verified", "updated_at"])
        token_obj.used = True
        token_obj.save(update_fields=["used"])

        send_welcome_email(user)
        log_action(actor=user, action="user.verify_email",
                   target_table="users", target_id=user.pk, request=request)

        return Response({"message": "Email verified successfully."}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Forgot / Reset Password
# ---------------------------------------------------------------------------

class ForgotPasswordView(APIView):
    """
    POST /api/auth/forgot-password/
    Sends a password reset link to the provided email.
    Always returns 200 even if email not found (prevents user enumeration).
    Rate-limited: 3/hour.
    """
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        try:
            user = User.objects.get(email=email, is_active=True)
            # Invalidate any existing unused tokens
            PasswordResetToken.objects.filter(user=user, used=False).update(used=True)
            token_obj = PasswordResetToken.objects.create(user=user)
            send_password_reset_email(user, token_obj.token)
        except User.DoesNotExist:
            # SECURITY: Do not reveal whether the email exists
            pass

        return Response(
            {"message": "If an account with that email exists, a reset link has been sent."},
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    """
    POST /api/auth/reset-password/
    Accepts token + new password. Marks token as used.
    Rate-limited: 3/hour.
    """
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token_str = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        try:
            token_obj = PasswordResetToken.objects.select_related("user").get(token=token_str)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"error": True, "message": "Invalid reset token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not token_obj.is_valid:
            return Response(
                {"error": True, "message": "Reset token has expired or already been used."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = token_obj.user
        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])
        token_obj.used = True
        token_obj.save(update_fields=["used"])

        log_action(actor=user, action="user.password_reset",
                   target_table="users", target_id=user.pk, request=request)

        return Response({"message": "Password reset successfully."}, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Profile (authenticated user)
# ---------------------------------------------------------------------------

class ProfileView(APIView):
    """
    GET  /api/auth/profile/  — returns full authenticated user details
    PATCH /api/auth/profile/ — updates own profile (name, bio, avatar, etc.)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserDetailSerializer(request.user, context={"request": request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserUpdateSerializer(
            request.user, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            UserDetailSerializer(request.user, context={"request": request}).data
        )


class ChangePasswordView(APIView):
    """PATCH /api/auth/change-password/"""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"error": True, "message": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password", "updated_at"])

        log_action(actor=user, action="user.change_password",
                   target_table="users", target_id=user.pk, request=request)

        return Response({"message": "Password changed successfully."})


# ---------------------------------------------------------------------------
# Admin: User Management (Super Admin only)
# ---------------------------------------------------------------------------

class AdminUserListView(generics.ListCreateAPIView):
    """
    GET  /api/admin/users/  — list all users
    POST /api/admin/users/  — create a user (super admin seeding)
    Super Admin only.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all().select_related("profile").order_by("-date_joined")
    search_fields = ["email", "username", "first_name", "last_name"]
    ordering_fields = ["date_joined", "role", "is_active"]


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/admin/users/<id>/ — view user details
    PATCH /api/admin/users/<id>/ — update role / deactivate / reactivate
    Super Admin only.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all()

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(
            actor=self.request.user,
            action="user.admin_update",
            target_table="users",
            target_id=instance.pk,
            metadata={"fields_changed": list(serializer.validated_data.keys())},
            request=self.request,
        )
