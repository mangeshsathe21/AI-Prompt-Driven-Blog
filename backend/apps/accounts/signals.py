"""
GreenTalk — Accounts Signals
==============================
Auto-create UserProfile when a new User is saved.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, UserProfile


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Create a UserProfile automatically on new User creation."""
    if created:
        UserProfile.objects.get_or_create(user=instance)
