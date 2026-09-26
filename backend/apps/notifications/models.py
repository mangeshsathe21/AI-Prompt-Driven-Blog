"""
GreenTalk — Notifications Model
=================================
In-app notifications for users. Triggered by:
  - Comment reply on own post/comment
  - Post liked
  - Post approved/rejected
  - Listing status update
  - Order status update
  - System messages
"""

from django.db import models
from django.conf import settings


class Notification(models.Model):
    TYPE_COMMENT_REPLY   = "comment_reply"
    TYPE_POST_LIKED      = "post_liked"
    TYPE_POST_APPROVED   = "post_approved"
    TYPE_POST_REJECTED   = "post_rejected"
    TYPE_LISTING_INTEREST = "listing_interest"
    TYPE_ORDER_UPDATE    = "order_update"
    TYPE_SYSTEM          = "system_message"

    TYPE_CHOICES = [
        (TYPE_COMMENT_REPLY,    "Comment Reply"),
        (TYPE_POST_LIKED,       "Post Liked"),
        (TYPE_POST_APPROVED,    "Post Approved"),
        (TYPE_POST_REJECTED,    "Post Rejected"),
        (TYPE_LISTING_INTEREST, "Listing Interest"),
        (TYPE_ORDER_UPDATE,     "Order Update"),
        (TYPE_SYSTEM,           "System Message"),
    ]

    user                = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        db_index=True,
    )
    type                = models.CharField(max_length=30, choices=TYPE_CHOICES)
    message             = models.TextField()
    is_read             = models.BooleanField(default=False, db_index=True)
    related_object_type = models.CharField(max_length=50, blank=True)
    related_object_id   = models.BigIntegerField(null=True, blank=True)
    created_at          = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Notification({self.type}) → {self.user_id}"
