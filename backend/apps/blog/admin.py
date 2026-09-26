"""
GreenTalk — Blog Django Admin
================================
Customised admin for Post, Category, Tag, Comment.
Bulk approve/reject actions for blog admins.
"""

from django.contrib import admin
from django.utils import timezone
from .models import Category, Tag, Post, PostTag, Comment, Like


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display  = ["name", "slug", "parent", "sort_order", "is_active"]
    list_filter   = ["is_active", "parent"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["sort_order", "name"]


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display  = ["name", "slug", "created_at"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}


class PostTagInline(admin.TabularInline):
    model = PostTag
    extra = 1


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display  = [
        "title", "author", "category", "status",
        "views_count", "created_at", "published_at",
    ]
    list_filter   = ["status", "category", "created_at"]
    search_fields = ["title", "author__email", "slug"]
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ["views_count", "search_vector", "created_at", "updated_at"]
    inlines       = [PostTagInline]
    ordering      = ["-created_at"]
    actions       = ["approve_posts", "reject_posts", "unpublish_posts"]

    @admin.action(description="Approve and publish selected posts")
    def approve_posts(self, request, queryset):
        queryset.filter(status__in=["pending", "draft"]).update(
            status="published",
            published_at=timezone.now(),
        )

    @admin.action(description="Reject selected posts")
    def reject_posts(self, request, queryset):
        queryset.update(status="rejected")

    @admin.action(description="Unpublish selected posts (back to draft)")
    def unpublish_posts(self, request, queryset):
        queryset.filter(status="published").update(status="draft", published_at=None)


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display  = ["id", "user", "post", "status", "created_at"]
    list_filter   = ["status", "created_at"]
    search_fields = ["content", "user__email"]
    actions       = ["hide_comments", "flag_comments", "unhide_comments"]

    @admin.action(description="Hide selected comments")
    def hide_comments(self, request, queryset):
        queryset.update(status="hidden")

    @admin.action(description="Flag selected comments")
    def flag_comments(self, request, queryset):
        queryset.update(status="flagged")

    @admin.action(description="Make selected comments visible")
    def unhide_comments(self, request, queryset):
        queryset.update(status="visible")
