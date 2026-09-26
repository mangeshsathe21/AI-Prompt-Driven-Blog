"""
GreenTalk — Local Development Settings
=======================================
Extends base.py with dev-friendly settings.
Never use these in production.

Activate: DJANGO_SETTINGS_MODULE=greentalk.settings.local
"""

from .base import *  # noqa: F401, F403

# ---------------------------------------------------------------------------
# Development overrides
# ---------------------------------------------------------------------------
DEBUG = True

# Accept any host in local dev
ALLOWED_HOSTS = ["*"]

# ---------------------------------------------------------------------------
# Security — relaxed for local dev (NEVER relax in production)
# ---------------------------------------------------------------------------
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

JWT_REFRESH_COOKIE_SECURE = False
JWT_REFRESH_COOKIE_SAMESITE = "Lax"

# ---------------------------------------------------------------------------
# Email — console backend: emails printed to terminal, no real sending
# ---------------------------------------------------------------------------
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# ---------------------------------------------------------------------------
# Throttle — looser in development so tests don't hit rate limits
# Rebuild the full dict rather than merging, to avoid key conflicts.
# ---------------------------------------------------------------------------
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {  # noqa: F405
    "anon": "1000/hour",
    "user": "10000/hour",
    "login": "100/minute",
    "password_reset": "100/hour",
    "register": "100/hour",
}

# ---------------------------------------------------------------------------
# CORS — allow React dev server
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# ---------------------------------------------------------------------------
# Logging — INFO in dev (DEBUG was flooding the console with SQL/autoreload)
# Change to DEBUG if you need to trace SQL queries.
# ---------------------------------------------------------------------------
LOGGING["loggers"]["apps"]["level"] = "INFO"   # noqa: F405
LOGGING["loggers"]["django"]["level"] = "WARNING"  # noqa: F405
