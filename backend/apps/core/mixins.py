"""
GreenTalk — Reusable View Mixins
=================================
"""

import logging
from apps.audit.utils import log_action

logger = logging.getLogger(__name__)


class AuditLogMixin:
    """
    Mixin for ModelViewSet views that should write to audit_logs on
    create / update / destroy.

    Usage:
        class PostViewSet(AuditLogMixin, viewsets.ModelViewSet):
            audit_log_resource = "post"
    """
    audit_log_resource: str = "object"

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(
            actor=self.request.user,
            action=f"{self.audit_log_resource}.create",
            target_table=instance.__class__.__name__.lower(),
            target_id=instance.pk,
            request=self.request,
        )
        return instance

    def perform_update(self, serializer):
        instance = serializer.save()
        log_action(
            actor=self.request.user,
            action=f"{self.audit_log_resource}.update",
            target_table=instance.__class__.__name__.lower(),
            target_id=instance.pk,
            request=self.request,
        )
        return instance

    def perform_destroy(self, instance):
        log_action(
            actor=self.request.user,
            action=f"{self.audit_log_resource}.delete",
            target_table=instance.__class__.__name__.lower(),
            target_id=instance.pk,
            request=self.request,
        )
        instance.delete()
