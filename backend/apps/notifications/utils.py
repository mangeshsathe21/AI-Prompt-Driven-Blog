"""
GreenTalk — Notification Utilities
=====================================
Helper to create in-app notifications without circular imports.
"""

import logging

logger = logging.getLogger(__name__)


def notify_user(user, notif_type: str, message: str,
                related_object_type: str = "", related_object_id=None) -> None:
    """
    Create a Notification record for a user.
    Silently ignores errors so that notification failure
    never breaks the main business flow.
    """
    try:
        from .models import Notification
        Notification.objects.create(
            user=user,
            type=notif_type,
            message=message,
            related_object_type=related_object_type,
            related_object_id=related_object_id,
        )
    except Exception as e:
        logger.error("Failed to create notification for user %s: %s", user.pk, e)
