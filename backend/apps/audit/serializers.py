from rest_framework import serializers
from apps.accounts.serializers import UserPublicSerializer
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor = UserPublicSerializer(read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id", "actor", "action", "target_table",
            "target_id", "metadata", "ip_address", "created_at",
        ]
        read_only_fields = fields
