"""
GreenTalk — Shared Utility Functions
"""

import re
from slugify import slugify
from django.utils.crypto import get_random_string


def generate_unique_slug(model_class, title: str, slug_field: str = "slug") -> str:
    """
    Generate a URL-safe slug from title. If a duplicate exists in the DB,
    append a short random suffix until unique.

    SECURITY: slug is validated against ^[a-z0-9\\-]+$ in the DB schema.
    slugify() ensures only safe characters are produced.

    Example:
        "Getting Started!" → "getting-started"
        (if taken) → "getting-started-k3x9"
    """
    base_slug = slugify(title, max_length=280)
    slug = base_slug

    while model_class._default_manager.filter(**{slug_field: slug}).exists():
        suffix = get_random_string(length=4, allowed_chars="abcdefghijklmnopqrstuvwxyz0123456789")
        slug = f"{base_slug[:275]}-{suffix}"

    return slug


def get_client_ip(request) -> str:
    """
    Extract the real client IP from the request.
    Checks X-Forwarded-For header first (set by nginx/reverse proxy),
    falls back to REMOTE_ADDR.

    SECURITY: Only trust X-Forwarded-For when behind a known proxy.
    In production, nginx should strip/set this header.
    """
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        # X-Forwarded-For can be a comma-separated list: client, proxy1, proxy2
        ip = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR", "")
    return ip
