"""
GreenTalk — Custom Throttle Classes
=====================================
Extends DRF's ScopedRateThrottle for specific endpoint scopes.
Rates are configured in settings.REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'].
"""

from rest_framework.throttling import ScopedRateThrottle, AnonRateThrottle


class LoginRateThrottle(ScopedRateThrottle):
    """
    Applied to login endpoint.
    Rate: 5/minute in production (prevents brute-force password guessing).
    Scope key: 'login' — configure rate in settings.
    """
    scope = "login"


class PasswordResetRateThrottle(ScopedRateThrottle):
    """
    Applied to forgot-password and reset-password endpoints.
    Rate: 3/hour in production (prevents email flooding).
    Scope key: 'password_reset'
    """
    scope = "password_reset"


class RegisterRateThrottle(ScopedRateThrottle):
    """
    Applied to registration endpoint.
    Rate: 5/hour in production (prevents mass account creation).
    Scope key: 'register'
    """
    scope = "register"
