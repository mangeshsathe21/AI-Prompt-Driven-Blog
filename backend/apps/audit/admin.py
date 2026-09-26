from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display  = ["id", "actor", "action", "target_table", "target_id", "ip_address", "created_at"]
    list_filter   = ["action", "target_table"]
    search_fields = ["actor__email", "action", "target_table"]
    readonly_fields = [
        "actor", "action", "target_table", "target_id",
        "metadata", "ip_address", "created_at",
    ]
    ordering = ["-created_at"]

    def has_add_permission(self, request):
        return False  # Audit logs are created only by the app, never via admin UI

    def has_change_permission(self, request, obj=None):
        return False  # Immutable

    def has_delete_permission(self, request, obj=None):
        return False  # Cannot delete audit log entries
