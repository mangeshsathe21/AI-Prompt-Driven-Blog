"""
GreenTalk — Blog Models
========================
Models: Category, Tag, Post, PostTag, Comment, Like

SECURITY:
- Post.content is sanitized via apps.core.sanitizer before storage (in serializer).
- Comment.content is similarly sanitized.
- Slugs are auto-generated and validated to [a-z0-9-] only.
- SQL injection: no raw SQL; all queries via Django ORM.
- Post status workflow enforced in serializer/view — never trust client-sent status.

Status Workflow:
  role=user       → status=pending  (requires blog_admin approval)
  role=blog_admin / super_admin → status=published (auto-publish, configurable)
"""

from django.db import models
from django.conf import settings
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField

from apps.core.file_upload import post_image_upload_path


class Category(models.Model):
    """
    Hierarchical category (self-referencing parent).
    Top-level parent_id = NULL.
    4 seeded categories: Home Gardening, Open Land Plantation,
    Land Restoration, Plant Care Guides.
    """
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, db_index=True)
    description = models.TextField(blank=True)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="children",
    )
    sort_order = models.SmallIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "categories"
        verbose_name_plural = "categories"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name


class Tag(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=110, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tags"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Post(models.Model):
    """
    Blog post with full-text search via PostgreSQL tsvector.

    Status transitions:
      draft     → pending   (user submits for review)
      pending   → published (blog_admin approves)
      pending   → rejected  (blog_admin rejects)
      published → draft     (unpublish)

    The search_vector field is updated by a PostgreSQL trigger
    (defined in db/schema.sql). Django reads it for FTS queries.
    """
    STATUS_DRAFT     = "draft"
    STATUS_PENDING   = "pending"
    STATUS_PUBLISHED = "published"
    STATUS_REJECTED  = "rejected"

    STATUS_CHOICES = [
        (STATUS_DRAFT,     "Draft"),
        (STATUS_PENDING,   "Pending Review"),
        (STATUS_PUBLISHED, "Published"),
        (STATUS_REJECTED,  "Rejected"),
    ]

    title           = models.CharField(max_length=300)
    slug            = models.SlugField(max_length=320, unique=True, db_index=True)
    # content stored as sanitized HTML — bleach/nh3 applied in serializer
    content         = models.TextField()
    excerpt         = models.CharField(max_length=500, blank=True)
    author          = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name="posts",
        db_index=True,
    )
    category        = models.ForeignKey(
        Category,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="posts",
        db_index=True,
    )
    tags            = models.ManyToManyField(Tag, through="PostTag", blank=True)
    status          = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        db_index=True,
    )
    featured_image  = models.ImageField(
        upload_to=post_image_upload_path,
        null=True,
        blank=True,
    )
    views_count     = models.PositiveIntegerField(default=0)
    seo_meta_title  = models.CharField(max_length=160, blank=True)
    seo_meta_description = models.CharField(max_length=320, blank=True)

    # PostgreSQL full-text search vector (maintained by DB trigger)
    search_vector   = SearchVectorField(null=True, blank=True)

    created_at      = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at      = models.DateTimeField(auto_now=True)
    published_at    = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        db_table = "posts"
        ordering = ["-published_at", "-created_at"]
        indexes = [
            GinIndex(fields=["search_vector"], name="idx_posts_search_vector"),
            models.Index(fields=["status", "-published_at"], name="idx_posts_status_pub"),
        ]

    def __str__(self):
        return self.title

    @property
    def like_count(self):
        return self.likes.count()

    @property
    def comment_count(self):
        return self.comments.filter(status=Comment.STATUS_VISIBLE).count()


class PostTag(models.Model):
    """Explicit M2M through model for post-tag relationship."""
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    tag  = models.ForeignKey(Tag,  on_delete=models.CASCADE)

    class Meta:
        db_table = "post_tags"
        unique_together = [("post", "tag")]


class Comment(models.Model):
    """
    Threaded comments via self-referencing parent.
    Max nesting depth: enforced at view level (recommended 3 levels).
    Content sanitized via nh3 before storage.
    """
    STATUS_VISIBLE = "visible"
    STATUS_HIDDEN  = "hidden"
    STATUS_FLAGGED = "flagged"

    STATUS_CHOICES = [
        (STATUS_VISIBLE, "Visible"),
        (STATUS_HIDDEN,  "Hidden"),
        (STATUS_FLAGGED, "Flagged"),
    ]

    post    = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name="comments",
        db_index=True,
    )
    user    = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name="comments",
    )
    parent  = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="replies",
    )
    content = models.TextField()
    status  = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_VISIBLE,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "comments"
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment by {self.user_id} on Post {self.post_id}"


class Like(models.Model):
    """
    Polymorphic like: targets either a Post OR a Comment (not both).
    Uniqueness enforced at DB level (UNIQUE constraints in schema.sql).
    """
    user       = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="likes",
    )
    post       = models.ForeignKey(
        Post,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="likes",
    )
    comment    = models.ForeignKey(
        Comment,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="likes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "likes"
        # Enforce uniqueness at ORM level (mirrors DB UNIQUE constraints)
        constraints = [
            models.UniqueConstraint(
                fields=["user", "post"],
                condition=models.Q(post__isnull=False),
                name="unique_user_post_like",
            ),
            models.UniqueConstraint(
                fields=["user", "comment"],
                condition=models.Q(comment__isnull=False),
                name="unique_user_comment_like",
            ),
        ]

    def __str__(self):
        target = f"post {self.post_id}" if self.post_id else f"comment {self.comment_id}"
        return f"Like by {self.user_id} on {target}"
