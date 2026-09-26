"""Accounts URL configuration."""

from django.urls import path
from .views import (
    RegisterView, LoginView, LogoutView, TokenRefreshView,
    VerifyEmailView, ForgotPasswordView, ResetPasswordView,
    ProfileView, ChangePasswordView,
    AdminUserListView, AdminUserDetailView,
)

# /api/auth/
auth_urlpatterns = [
    path("register/",        RegisterView.as_view(),        name="auth-register"),
    path("login/",           LoginView.as_view(),           name="auth-login"),
    path("logout/",          LogoutView.as_view(),          name="auth-logout"),
    path("token/refresh/",   TokenRefreshView.as_view(),    name="auth-token-refresh"),
    path("verify-email/",    VerifyEmailView.as_view(),     name="auth-verify-email"),
    path("forgot-password/", ForgotPasswordView.as_view(),  name="auth-forgot-password"),
    path("reset-password/",  ResetPasswordView.as_view(),   name="auth-reset-password"),
    path("profile/",         ProfileView.as_view(),         name="auth-profile"),
    path("change-password/", ChangePasswordView.as_view(),  name="auth-change-password"),
]

# /api/admin/users/
admin_user_urlpatterns = [
    path("",      AdminUserListView.as_view(),          name="admin-user-list"),
    path("<int:pk>/", AdminUserDetailView.as_view(),    name="admin-user-detail"),
]
