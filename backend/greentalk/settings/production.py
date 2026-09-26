"""
GreenTalk — Production Settings
================================
Extends base.py with hardened security settings for Ubuntu 24.04 LTS.
Activate: DJANGO_SETTINGS_MODULE=greentalk.settings.production

All secrets MUST be in the production .env file — never hardcoded here.
"""

from .base import *  # noqa: F401, F403

# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------
DEBUG = False

# ALLOWED_HOSTS is loaded from .env in base.py
# Production .env example:
#   DJANGO_ALLOWED_HOSTS=greentalk.io,www.greentalk.io

# ---------------------------------------------------------------------------
# SECURITY HEADERS
# SecurityMiddleware enforces these. Each setting is commented with its purpose.
# ---------------------------------------------------------------------------

# Force all HTTP requests to HTTPS
SECURE_SSL_REDIRECT = True

# HSTS: tell browsers to only use HTTPS for 1 year (31536000 seconds)
# includeSubDomains: applies to all subdomains
# preload: allows submission to browser HSTS preload lists
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Prevent browser from MIME-sniffing content type (XSS mitigation)
SECURE_CONTENT_TYPE_NOSNIFF = True

# Enable browser's built-in XSS filter
SECURE_BROWSER_XSS_FILTER = True

# Clickjacking protection — only allow in same origin frames
X_FRAME_OPTIONS = "DENY"

# Session cookie: only sent over HTTPS
SESSION_COOKIE_SECURE = True
# Session cookie: not accessible via JavaScript (XSS mitigation)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"

# CSRF cookie: only sent over HTTPS
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"

# Referrer policy
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

# ---------------------------------------------------------------------------
# JWT Refresh Token Cookie — production (strict security)
# The refresh token is stored ONLY in this HttpOnly cookie.
# The access token is returned in JSON response body only.
# ---------------------------------------------------------------------------
JWT_REFRESH_COOKIE_SECURE = True
JWT_REFRESH_COOKIE_SAMESITE = "Strict"  # prevents CSRF on cookie-based requests

# ---------------------------------------------------------------------------
# Content Security Policy
# Restricts what resources the browser can load.
# Adjust src directives to match your actual CDNs/fonts.
# ---------------------------------------------------------------------------
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"

# ---------------------------------------------------------------------------
# Database — production should use SCRAM-SHA-256 + SSL
# ---------------------------------------------------------------------------
DATABASES["default"]["OPTIONS"] = {  # noqa: F405
    "connect_timeout": 10,
    "sslmode": "require",  # enforce SSL connection to PostgreSQL
}

# ---------------------------------------------------------------------------
# Email — Gmail SMTP (App Password, no paid service)
# All values loaded from production .env
# ---------------------------------------------------------------------------
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
# EMAIL_HOST, EMAIL_PORT, EMAIL_USE_TLS, EMAIL_HOST_USER,
# EMAIL_HOST_PASSWORD, DEFAULT_FROM_EMAIL — all from base.py via .env

# ---------------------------------------------------------------------------
# Static files — WhiteNoise serves compressed + cached static files
# No separate nginx static config needed
# ---------------------------------------------------------------------------
# Static files — WhiteNoise (Django 4.2+ STORAGES format)
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# ---------------------------------------------------------------------------
# Throttling — tighter in production
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {  # type: ignore[assignment]
    **globals().get("REST_FRAMEWORK", {}),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/hour",
        "user": "1000/hour",
        "login": "5/minute",        # 5 login attempts per minute per IP
        "password_reset": "3/hour", # 3 reset requests per hour per IP
        "register": "5/hour",
    },
}

# ---------------------------------------------------------------------------
# CORS — production: only whitelist known frontend origin(s)
# CORS_ALLOWED_ORIGINS is loaded from .env in base.py
# Never set CORS_ALLOW_ALL_ORIGINS = True in production
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Logging — file-based in production
# ---------------------------------------------------------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": "/var/log/greentalk/django.log",
            "maxBytes": 10 * 1024 * 1024,  # 10MB per file
            "backupCount": 5,
            "formatter": "verbose",
        },
        "security_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": "/var/log/greentalk/security.log",
            "maxBytes": 10 * 1024 * 1024,
            "backupCount": 10,
            "formatter": "verbose",
        },
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["file", "console"],
        "level": "WARNING",
    },
    "loggers": {
        "django": {"handlers": ["file"], "level": "WARNING", "propagate": False},
        "django.security": {
            "handlers": ["security_file"],
            "level": "WARNING",
            "propagate": False,
        },
        "apps": {"handlers": ["file"], "level": "INFO", "propagate": False},
    },
}
