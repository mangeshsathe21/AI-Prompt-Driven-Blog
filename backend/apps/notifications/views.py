"""
GreenTalk — Notifications Views
=================================
  GET  /api/notifications/           — list own notifications (unread first)
  POST /api/notifications/mark-read/ — mark specific or all as read
"""

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.core.pagination import StandardResultsPagination
from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """GET /api/notifications/ — paginated list of own notifications."""
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        unread_only = self.request.query_params.get("unread")
        if unread_only:
            qs = qs.filter(is_read=False)
        return qs


class MarkNotificationsReadView(APIView):
    """
    POST /api/notifications/mark-read/
    Body: {"ids": [1,2,3]}  — mark specific notifications as read
          {}                 — mark ALL as read if no ids provided
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        ids = request.data.get("ids")
        qs = Notification.objects.filter(user=request.user, is_read=False)
        if ids:
            qs = qs.filter(id__in=ids)
        updated = qs.update(is_read=True)
        return Response({"marked_read": updated}, status=status.HTTP_200_OK)
