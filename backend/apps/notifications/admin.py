from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ["user", "type", "is_read", "created_at"]
    list_filter   = ["type", "is_read"]
    search_fields = ["user__email", "message"]
    readonly_fields = ["created_at"]
    actions = ["mark_read"]

    @admin.action(description="Mark selected notifications as read")
    def mark_read(self, request, queryset):
        queryset.update(is_read=True)
