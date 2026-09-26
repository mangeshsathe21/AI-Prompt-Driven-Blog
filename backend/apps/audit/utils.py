"""
GreenTalk — Audit Logging Utilities
=====================================
Call log_action() from any view or serializer to record a moderation
or admin action in the audit_logs table.
"""

import logging
from apps.core.utils import get_client_ip

logger = logging.getLogger(__name__)


def log_action(
    actor,
    action: str,
    target_table: str,
    target_id=None,
    metadata: dict = None,
    request=None,
) -> None:
    """
    Create an immutable AuditLog entry.

    Import is deferred to avoid circular imports at module load time.
    Errors are caught silently so that a logging failure never breaks
    the actual business logic flow.

    Args:
        actor        : User instance (may be None for system actions)
        action       : dot-notation string, e.g. "post.approve"
        target_table : DB table name string, e.g. "posts"
        target_id    : PK of the affected row (optional)
        metadata     : extra context dict (optional)
        request      : DRF Request object for IP extraction (optional)
    """
    try:
        from .models import AuditLog
        ip = get_client_ip(request) if request else None
        AuditLog.objects.create(
            actor=actor,
            action=action,
            target_table=target_table,
            target_id=target_id,
            metadata=metadata or {},
            ip_address=ip,
        )
    except Exception as e:
        logger.error("Failed to write audit log [%s on %s:%s]: %s", action, target_table, target_id, e)
