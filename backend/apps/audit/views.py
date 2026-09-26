"""
GreenTalk — Audit Log Views
=============================
  GET /api/admin/audit-logs/ — super_admin only, read-only, paginated
"""

from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import IsSuperAdmin
from apps.core.pagination import LargeResultsPagination
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogListView(generics.ListAPIView):
    """
    GET /api/admin/audit-logs/
    Super Admin only. Supports filtering by action and ordering by created_at.
    """
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    pagination_class = LargeResultsPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["action", "target_table", "actor__email"]
    ordering_fields = ["created_at", "action"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = AuditLog.objects.select_related("actor").all()
        action_filter = self.request.query_params.get("action")
        table_filter  = self.request.query_params.get("table")
        if action_filter:
            qs = qs.filter(action__icontains=action_filter)
        if table_filter:
            qs = qs.filter(target_table=table_filter)
        return qs
