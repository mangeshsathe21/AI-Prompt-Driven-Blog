"""
GreenTalk — Accounts Email Senders
=====================================
All transactional emails for the accounts module.
Uses Django's send_mail() — backend is configured via settings.EMAIL_BACKEND.

Local dev  → console backend (prints to terminal)
Production → Gmail SMTP (App Password via .env)
"""

import logging
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


def send_verification_email(user, token: str) -> None:
    """
    Send email verification link to new user.
    Link points to the FRONTEND_URL so the React app handles the UI,
    then POSTs the token to /api/auth/verify-email/.
    """
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    subject = "Verify your GreenTalk account"

    html_message = render_to_string("email/verify_email.html", {
        "user": user,
        "verify_url": verify_url,
    })
    plain_message = (
        f"Hi {user.first_name or user.username},\n\n"
        f"Please verify your email by visiting:\n{verify_url}\n\n"
        f"This link expires in 24 hours.\n\nGreenTalk Team"
    )

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as e:
        logger.error("Failed to send verification email to %s: %s", user.email, e)


def send_welcome_email(user) -> None:
    """Sent after email is successfully verified."""
    subject = "Welcome to GreenTalk! 🌱"
    plain_message = (
        f"Hi {user.first_name or user.username},\n\n"
        f"Your email has been verified. Welcome to the GreenTalk community!\n\n"
        f"Start by exploring posts or sharing your first plant story.\n\n"
        f"{settings.FRONTEND_URL}\n\nGreenTalk Team"
    )
    html_message = render_to_string("email/welcome.html", {"user": user})

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as e:
        logger.error("Failed to send welcome email to %s: %s", user.email, e)


def send_password_reset_email(user, token: str) -> None:
    """
    Send password reset link.
    Link points to frontend — React app shows reset form,
    then POSTs token + new_password to /api/auth/reset-password/.
    """
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    subject = "Reset your GreenTalk password"

    html_message = render_to_string("email/password_reset.html", {
        "user": user,
        "reset_url": reset_url,
    })
    plain_message = (
        f"Hi {user.first_name or user.username},\n\n"
        f"Reset your password by visiting:\n{reset_url}\n\n"
        f"This link expires in 1 hour. If you didn't request this, ignore this email.\n\n"
        f"GreenTalk Team"
    )

    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as e:
        logger.error("Failed to send password reset email to %s: %s", user.email, e)
