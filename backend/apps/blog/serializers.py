"""
GreenTalk — Blog Serializers
==============================
Handles post creation workflow, content sanitization, slug generation,
and role-based status enforcement.

SECURITY:
- Post content is sanitized via apps.core.sanitizer.sanitize_post_content()
  before being stored — server-side XSS prevention.
- Comment content is sanitized via sanitize_comment_content().
- Status field is NEVER accepted from the client payload on create/update
  by regular users — enforced in PostWriteSerializer.validate().
- Slug is auto-generated server-side — never trusted from client.
"""

from rest_framework import serializers
from django.contrib.postgres.search import SearchQuery, SearchRank
from django.utils import timezone

from apps.accounts.serializers import UserPublicSerializer
from apps.core.sanitizer import sanitize_post_content, sanitize_comment_content
from apps.core.utils import generate_unique_slug

from .models import Category, Tag, Post, Comment, Like


# ---------------------------------------------------------------------------
# Category
# ---------------------------------------------------------------------------

class CategorySerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id", "name", "slug", "description",
            "parent", "sort_order", "is_active", "children",
        ]
        read_only_fields = ["slug"]

    def get_children(self, obj):
        # Only include direct children for nested display; avoid recursion
        children = obj.children.filter(is_active=True)
        return CategorySerializer(children, many=True).data

    def create(self, validated_data):
        if not validated_data.get("slug"):
            validated_data["slug"] = generate_unique_slug(Category, validated_data["name"])
        return super().create(validated_data)


class CategoryListSerializer(serializers.ModelSerializer):
    """Flat list — used for dropdowns and post filters."""
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "parent", "is_active"]


# ---------------------------------------------------------------------------
# Tag
# ---------------------------------------------------------------------------

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name", "slug"]
        read_only_fields = ["slug"]

    def create(self, validated_data):
        if not validated_data.get("slug"):
            validated_data["slug"] = generate_unique_slug(Tag, validated_data["name"])
        return super().create(validated_data)


# ---------------------------------------------------------------------------
# Post
# ---------------------------------------------------------------------------

class PostListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for post list views.
    Includes like_count and comment_count as computed fields.
    Does NOT include full content (for performance).
    """
    author       = UserPublicSerializer(read_only=True)
    category     = CategoryListSerializer(read_only=True)
    tags         = TagSerializer(many=True, read_only=True)
    like_count   = serializers.IntegerField(read_only=True)
    comment_count = serializers.IntegerField(read_only=True)
    featured_image_url = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id", "title", "slug", "excerpt", "author", "category",
            "tags", "status", "featured_image_url", "views_count",
            "like_count", "comment_count",
            "seo_meta_title", "seo_meta_description",
            "created_at", "published_at",
        ]

    def get_featured_image_url(self, obj):
        request = self.context.get("request")
        if obj.featured_image:
            return request.build_absolute_uri(obj.featured_image.url) if request else obj.featured_image.url
        return None


class PostDetailSerializer(PostListSerializer):
    """Full post detail — includes sanitized HTML content."""
    class Meta(PostListSerializer.Meta):
        fields = PostListSerializer.Meta.fields + ["content", "updated_at"]


class PostWriteSerializer(serializers.ModelSerializer):
    """
    Used for POST (create) and PUT/PATCH (update) of posts.
    Enforces status workflow based on author's role.
    Sanitizes HTML content before storage.
    Auto-generates slug from title.
    """
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Tag.objects.all(),
        required=False,
        source="tags",
    )

    class Meta:
        model = Post
        fields = [
            "title", "content", "excerpt", "category",
            "tag_ids", "featured_image",
            "seo_meta_title", "seo_meta_description",
        ]

    def validate_content(self, value):
        """Sanitize HTML content server-side (XSS prevention)."""
        return sanitize_post_content(value)

    def validate_excerpt(self, value):
        """Strip all HTML from excerpt — must be plain text."""
        if value:
            from apps.core.sanitizer import strip_all_html
            return strip_all_html(value)
        return value

    def _determine_status(self, user) -> str:
        """
        WORKFLOW ENFORCEMENT:
        - role=user → status=pending (requires blog_admin approval)
        - role=blog_admin/super_admin → status=published (auto-publish)
          unless POST_AUTO_PUBLISH_FOR_ADMINS is False in settings
        The client CANNOT override this by sending a 'status' field.
        """
        from django.conf import settings
        if user.role in ("blog_admin", "super_admin"):
            auto_publish = getattr(settings, "POST_AUTO_PUBLISH_FOR_ADMINS", True)
            return Post.STATUS_PUBLISHED if auto_publish else Post.STATUS_PENDING
        return Post.STATUS_PENDING

    def create(self, validated_data):
        tags = validated_data.pop("tags", [])
        request = self.context["request"]
        user = request.user

        # Auto-generate slug — never trust client
        validated_data["slug"] = generate_unique_slug(Post, validated_data["title"])

        # Enforce status based on role (cannot be overridden by client)
        validated_data["status"] = self._determine_status(user)
        validated_data["author"] = user

        if validated_data["status"] == Post.STATUS_PUBLISHED:
            validated_data["published_at"] = timezone.now()

        post = Post.objects.create(**validated_data)
        if tags:
            post.tags.set(tags)
        return post

    def update(self, instance, validated_data):
        tags = validated_data.pop("tags", None)

        # Regenerate slug if title changed
        if "title" in validated_data and validated_data["title"] != instance.title:
            validated_data["slug"] = generate_unique_slug(Post, validated_data["title"])

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if tags is not None:
            instance.tags.set(tags)
        return instance


# ---------------------------------------------------------------------------
# Comment
# ---------------------------------------------------------------------------

class CommentSerializer(serializers.ModelSerializer):
    """
    Read serializer — includes author and nested replies (1 level).
    """
    author = UserPublicSerializer(source="user", read_only=True)
    replies = serializers.SerializerMethodField()
    like_count = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id", "post", "author", "parent", "content",
            "status", "like_count", "replies", "created_at",
        ]
        read_only_fields = ["status", "created_at"]

    def get_replies(self, obj):
        # Only return top-level replies (1 level deep for performance)
        if obj.parent is None:
            replies = obj.replies.filter(status=Comment.STATUS_VISIBLE).order_by("created_at")
            return CommentSerializer(replies, many=True, context=self.context).data
        return []

    def get_like_count(self, obj):
        return obj.likes.count()


class CommentWriteSerializer(serializers.ModelSerializer):
    """
    Write serializer for creating/updating comments.
    Sanitizes content before storage.
    """
    class Meta:
        model = Comment
        fields = ["post", "parent", "content"]

    def validate_content(self, value):
        """Sanitize comment HTML (XSS prevention)."""
        return sanitize_comment_content(value)

    def validate(self, attrs):
        # Prevent replying to a comment from a different post
        parent = attrs.get("parent")
        if parent and parent.post != attrs.get("post"):
            raise serializers.ValidationError(
                {"parent": "Parent comment does not belong to this post."}
            )
        # Prevent replying to a reply (max 2 levels deep: post → comment → reply)
        if parent and parent.parent is not None:
            raise serializers.ValidationError(
                {"parent": "Cannot reply more than 2 levels deep."}
            )
        return attrs

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


# ---------------------------------------------------------------------------
# Like
# ---------------------------------------------------------------------------

class LikeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Like
        fields = ["id", "user", "post", "comment", "created_at"]
        read_only_fields = ["user", "created_at"]

    def validate(self, attrs):
        post    = attrs.get("post")
        comment = attrs.get("comment")
        if post is None and comment is None:
            raise serializers.ValidationError("Either post or comment must be specified.")
        if post is not None and comment is not None:
            raise serializers.ValidationError("Specify either post or comment, not both.")
        return attrs
