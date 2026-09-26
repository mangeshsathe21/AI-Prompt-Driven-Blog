"""
GreenTalk — Audit Log Model
=============================
Append-only log of all moderation and admin actions.
Super admin can view; no one can update or delete entries.

Fields mirror the DB schema's audit_logs table.
"""

from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    """
    SECURITY: This model's save() prevents updates (only inserts allowed).
    The DB table has UPDATE/DELETE revoked from the app role in schema.sql.
    """
    actor       = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,   # preserve log entry if actor is deleted
        related_name="audit_logs",
    )
    action      = models.CharField(max_length=100, db_index=True)  # e.g. "post.approve"
    target_table = models.CharField(max_length=100)
    target_id   = models.BigIntegerField(null=True, blank=True)
    metadata    = models.JSONField(default=dict, blank=True)
    ip_address  = models.GenericIPAddressField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at"]
        # Prevent updates at ORM level — this is an append-only table
        # Django admin and views should only create, never update

    def save(self, *args, **kwargs):
        # SECURITY: Prevent any update — only INSERT is allowed
        if self.pk:
            raise ValueError(
                "AuditLog entries are immutable. "
                "Do not update audit log records."
            )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # SECURITY: Prevent deletion of audit log records
        raise ValueError("AuditLog entries cannot be deleted.")

    def __str__(self):
        return f"[{self.created_at}] {self.actor_id} → {self.action} on {self.target_table}:{self.target_id}"
