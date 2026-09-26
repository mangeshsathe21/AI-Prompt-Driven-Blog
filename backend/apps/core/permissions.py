"""
GreenTalk — Custom DRF Permission Classes
==========================================
Three role levels:
  user         — authenticated, owns their own content
  blog_admin   — moderates all content (posts / comments / listings)
  super_admin  — full platform control (users / site settings / audit logs)

Each permission class is documented with the endpoints it protects.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsOwnerOrReadOnly(BasePermission):
    """
    Object-level permission.
    - Read  (GET, HEAD, OPTIONS): any authenticated or anonymous user.
    - Write (POST, PUT, PATCH, DELETE): only the object owner.

    The view must pass the object to check_object_permissions().
    Objects must have either `author`, `user`, `seller`, or `owner` attribute.
    """

    def has_object_permission(self, request, view, obj):
        # Safe methods are always allowed (read-only access)
        if request.method in SAFE_METHODS:
            return True

        # Determine owner field — support multiple naming conventions
        owner = (
            getattr(obj, "author", None)
            or getattr(obj, "user", None)
            or getattr(obj, "seller", None)
            or getattr(obj, "owner", None)
            or getattr(obj, "buyer", None)
        )
        return owner == request.user


class IsBlogAdminOrSuperAdmin(BasePermission):
    """
    Grants access to users with role 'blog_admin' or 'super_admin'.
    Used for: post moderation, comment moderation, category/tag management.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ("blog_admin", "super_admin")
        )


class IsSuperAdmin(BasePermission):
    """
    Grants access only to users with role 'super_admin'.
    Used for: user management, site settings, audit log viewing.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "super_admin"
        )


class IsOwnerOrBlogAdmin(BasePermission):
    """
    Allows write access if the requesting user is the object owner
    OR has blog_admin / super_admin role.
    Used for: editing/deleting comments, listings where admins can moderate.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True

        if request.user.role in ("blog_admin", "super_admin"):
            return True

        owner = (
            getattr(obj, "author", None)
            or getattr(obj, "user", None)
            or getattr(obj, "seller", None)
        )
        return owner == request.user


class IsAuthenticatedOrReadOnly(BasePermission):
    """
    Standard: read-only for anonymous, full access for authenticated.
    Overrides DRF default to be explicit.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated


class IsVerifiedUser(BasePermission):
    """
    Requires the user to have confirmed their email address.
    Used for: creating posts, listings — prevents spam from unverified accounts.
    """

    message = "Email verification required before performing this action."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_verified
        )
