"""
GreenTalk — Account / Auth Tests
==================================
Tests: registration, login, token refresh, logout,
       email verification, password reset, profile, role escalation.
"""

import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestRegistration:

    def test_register_success(self, api_client):
        url = reverse("auth:auth-register")
        data = {
            "email": "newuser@test.com",
            "username": "newuser",
            "first_name": "New",
            "last_name": "User",
            "password": "StrongPass@1234",
            "password_confirm": "StrongPass@1234",
        }
        response = api_client.post(url, data)
        assert response.status_code == 201
        assert "email" in response.data
        assert User.objects.filter(email="newuser@test.com").exists()
        # New user should NOT be verified yet
        user = User.objects.get(email="newuser@test.com")
        assert user.is_verified is False

    def test_register_duplicate_email(self, api_client, regular_user):
        url = reverse("auth:auth-register")
        data = {
            "email": regular_user.email,
            "username": "differentuser",
            "password": "StrongPass@1234",
            "password_confirm": "StrongPass@1234",
        }
        response = api_client.post(url, data)
        assert response.status_code == 400

    def test_register_weak_password_rejected(self, api_client):
        url = reverse("auth:auth-register")
        data = {
            "email": "weak@test.com",
            "username": "weakpassuser",
            "password": "123456",
            "password_confirm": "123456",
        }
        response = api_client.post(url, data)
        assert response.status_code == 400

    def test_register_password_mismatch(self, api_client):
        url = reverse("auth:auth-register")
        data = {
            "email": "mismatch@test.com",
            "username": "mismatchuser",
            "password": "StrongPass@1234",
            "password_confirm": "DifferentPass@1234",
        }
        response = api_client.post(url, data)
        assert response.status_code == 400

    def test_register_creates_user_profile(self, api_client):
        """User profile must be auto-created on registration."""
        url = reverse("auth:auth-register")
        data = {
            "email": "profiletest@test.com",
            "username": "profiletest",
            "password": "StrongPass@1234",
            "password_confirm": "StrongPass@1234",
        }
        api_client.post(url, data)
        user = User.objects.get(email="profiletest@test.com")
        assert hasattr(user, "profile")


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestLogin:

    def test_login_success(self, api_client, regular_user):
        url = reverse("auth:auth-login")
        response = api_client.post(url, {
            "email": regular_user.email,
            "password": "TestPass@1234",
        })
        assert response.status_code == 200
        # Access token in response body
        assert "access" in response.data
        # Refresh token in HttpOnly cookie
        assert "refresh_token" in response.cookies

    def test_login_wrong_password(self, api_client, regular_user):
        url = reverse("auth:auth-login")
        response = api_client.post(url, {
            "email": regular_user.email,
            "password": "WrongPassword",
        })
        assert response.status_code == 401

    def test_login_inactive_user(self, api_client, regular_user):
        regular_user.is_active = False
        regular_user.save()
        url = reverse("auth:auth-login")
        response = api_client.post(url, {
            "email": regular_user.email,
            "password": "TestPass@1234",
        })
        assert response.status_code == 403

    def test_login_response_has_user_info(self, api_client, regular_user):
        url = reverse("auth:auth-login")
        response = api_client.post(url, {
            "email": regular_user.email,
            "password": "TestPass@1234",
        })
        assert response.data["user"]["email"] == regular_user.email
        assert response.data["user"]["role"] == "user"


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestProfile:

    def test_get_profile_authenticated(self, user_client, regular_user):
        url = reverse("auth:auth-profile")
        response = user_client.get(url)
        assert response.status_code == 200
        assert response.data["email"] == regular_user.email

    def test_get_profile_unauthenticated(self, api_client):
        url = reverse("auth:auth-profile")
        response = api_client.get(url)
        assert response.status_code == 401

    def test_patch_profile(self, user_client, regular_user):
        url = reverse("auth:auth-profile")
        response = user_client.patch(url, {"first_name": "Updated"})
        assert response.status_code == 200
        regular_user.refresh_from_db()
        assert regular_user.first_name == "Updated"

    def test_user_cannot_change_own_role(self, user_client, regular_user):
        """Role escalation prevention: user cannot promote themselves."""
        url = reverse("auth:auth-profile")
        response = user_client.patch(url, {"role": "super_admin"})
        # Role field is not in UserUpdateSerializer — should be ignored
        assert response.status_code == 200
        regular_user.refresh_from_db()
        assert regular_user.role == "user"  # unchanged


# ---------------------------------------------------------------------------
# Admin User Management — Role Escalation Tests
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAdminUserManagement:

    def test_regular_user_cannot_access_admin_users(self, user_client):
        """SECURITY: regular user cannot access /api/admin/users/."""
        url = reverse("admin-users:admin-user-list")
        response = user_client.get(url)
        assert response.status_code == 403

    def test_blog_admin_cannot_access_admin_users(self, admin_client):
        """SECURITY: blog_admin cannot access user management — super_admin only."""
        url = reverse("admin-users:admin-user-list")
        response = admin_client.get(url)
        assert response.status_code == 403

    def test_super_admin_can_list_users(self, super_client):
        url = reverse("admin-users:admin-user-list")
        response = super_client.get(url)
        assert response.status_code == 200

    def test_super_admin_can_deactivate_user(self, super_client, regular_user):
        url = reverse("admin-users:admin-user-detail", kwargs={"pk": regular_user.pk})
        response = super_client.patch(url, {"is_active": False})
        assert response.status_code == 200
        regular_user.refresh_from_db()
        assert regular_user.is_active is False
