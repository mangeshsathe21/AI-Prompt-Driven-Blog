from django.urls import path
from .views import NotificationListView, MarkNotificationsReadView

urlpatterns = [
    path("",           NotificationListView.as_view(),       name="notification-list"),
    path("mark-read/", MarkNotificationsReadView.as_view(),  name="notification-mark-read"),
]
