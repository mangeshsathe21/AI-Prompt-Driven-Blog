"""
GreenTalk — Accounts Models
=============================
Custom User model extending AbstractUser.
Adds role, verification, phone, bio, avatar.

Companion UserProfile model holds location and preferences.
Token models handle email verification and password resets.

SECURITY:
- Passwords handled entirely by Django (PBKDF2-SHA256).
  Never set password directly on the field — always use set_password().
- Tokens use os.urandom (via secrets module) for 32-byte entropy.
- Expired/used tokens must be checked before accepting.
"""

import secrets
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta

from apps.core.file_upload import avatar_upload_path


class User(AbstractUser):
    """
    Custom User model — AUTH_USER_MODEL = 'accounts.User'.

    Role hierarchy:
      user         — regular community member
      blog_admin   — content moderator
      super_admin  — full platform control
    """

    ROLE_USER = "user"
    ROLE_BLOG_ADMIN = "blog_admin"
    ROLE_SUPER_ADMIN = "super_admin"

    ROLE_CHOICES = [
        (ROLE_USER,        "User"),
        (ROLE_BLOG_ADMIN,  "Blog Admin"),
        (ROLE_SUPER_ADMIN, "Super Admin"),
    ]

    # Role field — default is regular user
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default=ROLE_USER,
        db_index=True,
    )

    # Email must be unique — used for login and notifications
    email = models.EmailField(unique=True)

    # Email verification gate — set True after link is clicked
    is_verified = models.BooleanField(default=False, db_index=True)

    phone = models.CharField(max_length=20, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)

    # Avatar stored with randomised filename (see file_upload.py)
    avatar = models.ImageField(
        upload_to=avatar_upload_path,
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Use email as the login identifier instead of username
    USERNAME_FIELD = "email"
    # username is still required (Django admin compatibility)
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    class Meta:
        db_table = "users"
        ordering = ["-created_at"]
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return f"{self.email} ({self.role})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username

    @property
    def is_blog_admin(self):
        return self.role in (self.ROLE_BLOG_ADMIN, self.ROLE_SUPER_ADMIN)

    @property
    def is_super_admin(self):
        return self.role == self.ROLE_SUPER_ADMIN


class UserProfile(models.Model):
    """
    One-to-one extension of User.
    Holds location, garden preferences, and external links.
    Created automatically via post_save signal on User creation.
    """

    GARDEN_HOME = "home"
    GARDEN_OPEN = "open_land"
    GARDEN_BOTH = "both"

    GARDEN_CHOICES = [
        (GARDEN_HOME, "Home Garden"),
        (GARDEN_OPEN, "Open Land"),
        (GARDEN_BOTH, "Both"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default="India")
    postal_code = models.CharField(max_length=20, blank=True)
    garden_type = models.CharField(
        max_length=20,
        choices=GARDEN_CHOICES,
        blank=True,
        null=True,
    )
    # Stored as JSON: {"notifications": true, "newsletter": false}
    preferences = models.JSONField(default=dict, blank=True)
    website_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_profiles"
        verbose_name = "User Profile"

    def __str__(self):
        return f"Profile: {self.user.email}"


class EmailVerificationToken(models.Model):
    """
    One-time token for email address verification.

    SECURITY:
    - Token is 32 random bytes → 64 hex chars → 256-bit entropy
    - Expires in 24 hours
    - Can only be used once (used=True after consumption)
    - Old unused tokens are invalidated when a new one is created
      (handled in the view/serializer)
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="verification_tokens",
    )
    token = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "email_verification_tokens"

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_hex(32)  # 64-char hex string
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        return not self.used and timezone.now() < self.expires_at

    def __str__(self):
        return f"VerificationToken({self.user.email}, valid={self.is_valid})"


class PasswordResetToken(models.Model):
    """
    One-time token for password reset flow.

    SECURITY:
    - 32-byte random token (256-bit entropy)
    - Expires in 1 hour
    - Single use only
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="password_reset_tokens",
    )
    token = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "password_reset_tokens"

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_hex(32)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=1)
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        return not self.used and timezone.now() < self.expires_at

    def __str__(self):
        return f"PasswordResetToken({self.user.email}, valid={self.is_valid})"
