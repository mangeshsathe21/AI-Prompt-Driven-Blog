"""
GreenTalk — Accounts Django Admin
====================================
Customised admin for User and UserProfile.
Only staff (blog_admin, super_admin) can log into Django admin.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import User, UserProfile, EmailVerificationToken, PasswordResetToken


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = "Profile"
    extra = 0
    fields = ["city", "state", "country", "garden_type", "preferences", "website_url"]


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]

    list_display = [
        "email", "username", "full_name", "role",
        "is_verified", "is_active", "is_staff", "date_joined",
    ]
    list_filter = ["role", "is_verified", "is_active", "is_staff"]
    search_fields = ["email", "username", "first_name", "last_name"]
    ordering = ["-date_joined"]

    fieldsets = (
        (None, {"fields": ("email", "username", "password")}),
        (_("Personal Info"), {"fields": ("first_name", "last_name", "phone", "bio", "avatar")}),
        (_("GreenTalk Role"), {"fields": ("role", "is_verified")}),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active", "is_staff", "is_superuser",
                    "groups", "user_permissions",
                ),
            },
        ),
        (_("Important Dates"), {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email", "username", "first_name", "last_name",
                    "role", "password1", "password2",
                ),
            },
        ),
    )

    # Bulk actions
    actions = ["activate_users", "deactivate_users", "make_blog_admin"]

    @admin.action(description="Activate selected users")
    def activate_users(self, request, queryset):
        queryset.update(is_active=True)

    @admin.action(description="Deactivate selected users")
    def deactivate_users(self, request, queryset):
        queryset.update(is_active=False)

    @admin.action(description="Set role to Blog Admin")
    def make_blog_admin(self, request, queryset):
        queryset.update(role=User.ROLE_BLOG_ADMIN)


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ["user", "token", "expires_at", "used", "created_at"]
    list_filter = ["used"]
    search_fields = ["user__email"]
    readonly_fields = ["token", "created_at"]


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ["user", "token", "expires_at", "used", "created_at"]
    list_filter = ["used"]
    search_fields = ["user__email"]
    readonly_fields = ["token", "created_at"]
