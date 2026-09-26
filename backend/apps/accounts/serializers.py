"""
GreenTalk — Accounts Serializers
==================================
Handles registration, profile, and token flows.

SECURITY:
- Passwords are never returned in responses (write_only=True).
- Role field is read-only for regular users; only super_admin can change it
  (enforced via view-level logic, not just serializer).
- Input validation uses Django's built-in password validators.
"""

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .models import User, UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "city", "state", "country", "postal_code",
            "garden_type", "preferences", "website_url",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class UserPublicSerializer(serializers.ModelSerializer):
    """
    Read-only public representation of a user.
    Used for post author info, comment author info — does NOT expose email.
    """
    full_name = serializers.CharField(read_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "full_name", "avatar_url", "role", "created_at"]
        read_only_fields = fields

    def get_avatar_url(self, obj):
        request = self.context.get("request")
        if obj.avatar and hasattr(obj.avatar, "url"):
            return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url
        return None


class UserDetailSerializer(serializers.ModelSerializer):
    """
    Full user detail — used for /api/auth/profile/ (authenticated user only).
    Exposes email, is_verified. Never exposes password.
    """
    profile = UserProfileSerializer(read_only=True)
    full_name = serializers.CharField(read_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "full_name", "role", "is_verified", "phone", "bio",
            "avatar_url", "profile", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "email", "role", "is_verified", "created_at", "updated_at"]

    def get_avatar_url(self, obj):
        request = self.context.get("request")
        if obj.avatar and hasattr(obj.avatar, "url"):
            return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url
        return None


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Used for PATCH /api/auth/profile/ — user edits own profile.
    Does not allow email/role changes (handled via separate endpoints).
    """
    profile = UserProfileSerializer(required=False)

    class Meta:
        model = User
        fields = ["first_name", "last_name", "username", "phone", "bio", "avatar", "profile"]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", None)
        # Update User fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        # Update nested profile
        if profile_data:
            profile = instance.profile
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    """
    POST /api/auth/register/
    Validates password strength using Django's AUTH_PASSWORD_VALIDATORS.
    """
    email = serializers.EmailField(
        validators=[UniqueValidator(queryset=User.objects.all(),
                                   message="An account with this email already exists.")]
    )
    username = serializers.CharField(
        validators=[UniqueValidator(queryset=User.objects.all(),
                                   message="This username is already taken.")]
    )
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["email", "username", "first_name", "last_name", "password", "password_confirm"]

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        # Run Django's password validators (CommonPassword, NumericOnly, etc.)
        try:
            validate_password(attrs["password"])
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        user = User.objects.create_user(
            email=validated_data["email"],
            username=validated_data["username"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            password=validated_data["password"],
            is_active=True,
            is_verified=False,  # requires email verification
        )
        return user


class LoginSerializer(serializers.Serializer):
    """
    POST /api/auth/login/
    Accepts email + password. Returns JWT tokens.
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ChangePasswordSerializer(serializers.Serializer):
    """PATCH /api/auth/change-password/"""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Passwords do not match."}
            )
        try:
            validate_password(attrs["new_password"])
        except DjangoValidationError as e:
            raise serializers.ValidationError({"new_password": list(e.messages)})
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    """POST /api/auth/forgot-password/"""
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    """POST /api/auth/reset-password/"""
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Passwords do not match."}
            )
        try:
            validate_password(attrs["new_password"])
        except DjangoValidationError as e:
            raise serializers.ValidationError({"new_password": list(e.messages)})
        return attrs


class VerifyEmailSerializer(serializers.Serializer):
    """POST /api/auth/verify-email/"""
    token = serializers.CharField()


class AdminUserSerializer(serializers.ModelSerializer):
    """
    Used by super_admin for /api/admin/users/ — can read/set role and is_active.
    Password is excluded (super admin resets via separate flow if needed).
    """
    class Meta:
        model = User
        fields = [
            "id", "email", "username", "first_name", "last_name",
            "role", "is_active", "is_verified", "date_joined", "last_login",
        ]
        read_only_fields = ["id", "email", "date_joined", "last_login"]
