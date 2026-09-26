"""
GreenTalk — Blog Views
========================
ViewSets for: Category, Tag, Post, Comment, Like, Search.

Endpoint summary:
  /api/categories/          — list, create (blog_admin+)
  /api/categories/<id>/     — retrieve, update, delete (blog_admin+)
  /api/tags/                — list, create (blog_admin+)
  /api/tags/<id>/           — retrieve, update, delete (blog_admin+)
  /api/posts/               — list (public), create (authenticated+verified)
  /api/posts/<slug>/        — retrieve (public), update/delete (owner or admin)
  /api/posts/<slug>/approve/— POST: blog_admin+ approves post
  /api/posts/<slug>/reject/ — POST: blog_admin+ rejects post
  /api/posts/<slug>/unpublish/ — POST: blog_admin+ unpublishes
  /api/comments/            — list by post, create (authenticated+verified)
  /api/comments/<id>/       — update/delete (owner or admin)
  /api/likes/               — POST to toggle like, GET own likes
  /api/search/              — full-text search across published posts
"""

import logging
from django.db.models import Count, F
from django.contrib.postgres.search import SearchQuery, SearchRank
from django.utils import timezone

from rest_framework import viewsets, generics, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.views import APIView

from apps.core.permissions import (
    IsBlogAdminOrSuperAdmin, IsOwnerOrBlogAdmin, IsVerifiedUser,
)
from apps.core.mixins import AuditLogMixin
from apps.core.pagination import StandardResultsPagination
from apps.audit.utils import log_action

from .models import Category, Tag, Post, Comment, Like
from .serializers import (
    CategorySerializer, CategoryListSerializer,
    TagSerializer,
    PostListSerializer, PostDetailSerializer, PostWriteSerializer,
    CommentSerializer, CommentWriteSerializer,
    LikeSerializer,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Category ViewSet
# ---------------------------------------------------------------------------

class CategoryViewSet(viewsets.ModelViewSet):
    """
    list   — public
    create/update/delete — blog_admin or super_admin only
    """
    queryset = Category.objects.filter(is_active=True).prefetch_related("children")
    lookup_field = "slug"

    def get_serializer_class(self):
        if self.action == "list":
            return CategoryListSerializer
        return CategorySerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated(), IsBlogAdminOrSuperAdmin()]

    def perform_create(self, serializer):
        instance = serializer.save()
        log_action(self.request.user, "category.create", "categories", instance.pk, request=self.request)

    def perform_destroy(self, instance):
        log_action(self.request.user, "category.delete", "categories", instance.pk, request=self.request)
        instance.is_active = False  # soft delete
        instance.save(update_fields=["is_active"])


# ---------------------------------------------------------------------------
# Tag ViewSet
# ---------------------------------------------------------------------------

class TagViewSet(viewsets.ModelViewSet):
    """
    list   — public
    create/update/delete — blog_admin or super_admin only
    """
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    lookup_field = "slug"
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated(), IsBlogAdminOrSuperAdmin()]


# ---------------------------------------------------------------------------
# Post ViewSet
# ---------------------------------------------------------------------------

class PostViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    Full blog post CRUD + moderation actions.

    Public read: only status=published posts.
    Author read: own posts of any status.
    Admin read: all posts.

    Status workflow enforced in serializer — not trusted from client.
    """
    audit_log_resource = "post"
    lookup_field = "slug"
    pagination_class = StandardResultsPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "excerpt"]
    ordering_fields = ["published_at", "created_at", "views_count"]
    ordering = ["-published_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Post.objects.select_related("author", "category") \
                         .prefetch_related("tags") \
                         .annotate(
                             like_count=Count("likes", distinct=True),
                             comment_count=Count(
                                 "comments", distinct=True,
                                 filter=__import__("django.db.models", fromlist=["Q"]).Q(
                                     comments__status=Comment.STATUS_VISIBLE
                                 )
                             )
                         )

        if not user or not user.is_authenticated:
            # Anonymous: published posts only
            return qs.filter(status=Post.STATUS_PUBLISHED)

        if user.role in ("blog_admin", "super_admin"):
            # Admins see everything; filter by status param if provided
            status_filter = self.request.query_params.get("status")
            if status_filter:
                qs = qs.filter(status=status_filter)
            return qs

        # Authenticated regular user: own posts (any status) + other published posts
        from django.db.models import Q
        return qs.filter(
            Q(status=Post.STATUS_PUBLISHED) | Q(author=user)
        )

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return PostWriteSerializer
        if self.action == "list":
            return PostListSerializer
        return PostDetailSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action in ("approve", "reject", "unpublish"):
            return [IsAuthenticated(), IsBlogAdminOrSuperAdmin()]
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOwnerOrBlogAdmin()]
        # create
        return [IsAuthenticated(), IsVerifiedUser()]

    def retrieve(self, request, *args, **kwargs):
        """Increment view count on every retrieve (published posts only)."""
        instance = self.get_object()
        if instance.status == Post.STATUS_PUBLISHED:
            Post.objects.filter(pk=instance.pk).update(views_count=F("views_count") + 1)
            instance.views_count += 1
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    # ---- Moderation actions ----

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, slug=None):
        """POST /api/posts/<slug>/approve/ — blog_admin+ only."""
        post = self.get_object()
        if post.status == Post.STATUS_PUBLISHED:
            return Response({"message": "Post is already published."})
        post.status = Post.STATUS_PUBLISHED
        post.published_at = timezone.now()
        post.save(update_fields=["status", "published_at", "updated_at"])
        log_action(request.user, "post.approve", "posts", post.pk, request=request)

        # Notify post author
        from apps.notifications.utils import notify_user
        if post.author:
            notify_user(
                user=post.author,
                notif_type="post_approved",
                message=f'Your post "{post.title}" has been published.',
                related_object_type="post",
                related_object_id=post.pk,
            )
        return Response({"message": "Post approved and published.", "status": post.status})

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, slug=None):
        """POST /api/posts/<slug>/reject/ — blog_admin+ only."""
        post = self.get_object()
        post.status = Post.STATUS_REJECTED
        post.save(update_fields=["status", "updated_at"])
        log_action(request.user, "post.reject", "posts", post.pk,
                   metadata={"reason": request.data.get("reason", "")}, request=request)

        from apps.notifications.utils import notify_user
        if post.author:
            notify_user(
                user=post.author,
                notif_type="post_rejected",
                message=f'Your post "{post.title}" was not approved.',
                related_object_type="post",
                related_object_id=post.pk,
            )
        return Response({"message": "Post rejected.", "status": post.status})

    @action(detail=True, methods=["post"], url_path="unpublish")
    def unpublish(self, request, slug=None):
        """POST /api/posts/<slug>/unpublish/ — blog_admin+ only."""
        post = self.get_object()
        post.status = Post.STATUS_DRAFT
        post.published_at = None
        post.save(update_fields=["status", "published_at", "updated_at"])
        log_action(request.user, "post.unpublish", "posts", post.pk, request=request)
        return Response({"message": "Post unpublished.", "status": post.status})


# ---------------------------------------------------------------------------
# Comment ViewSet
# ---------------------------------------------------------------------------

class CommentViewSet(viewsets.ModelViewSet):
    """
    Threaded comments. Filtered by post via ?post=<id>.
    create — authenticated + verified
    update/delete — owner or admin
    moderate (hide/flag) — blog_admin+
    """
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        qs = Comment.objects.select_related("user", "post").prefetch_related("replies")
        post_id = self.request.query_params.get("post")
        if post_id:
            qs = qs.filter(post_id=post_id, parent__isnull=True)  # top-level only

        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.filter(status=Comment.STATUS_VISIBLE)
        if user.role in ("blog_admin", "super_admin"):
            return qs
        return qs.filter(status=Comment.STATUS_VISIBLE)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return CommentWriteSerializer
        return CommentSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action in ("moderate",):
            return [IsAuthenticated(), IsBlogAdminOrSuperAdmin()]
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOwnerOrBlogAdmin()]
        return [IsAuthenticated(), IsVerifiedUser()]

    def perform_create(self, serializer):
        comment = serializer.save()
        # Notify parent comment author on reply
        if comment.parent and comment.parent.user:
            from apps.notifications.utils import notify_user
            notify_user(
                user=comment.parent.user,
                notif_type="comment_reply",
                message=f"{comment.user.full_name} replied to your comment.",
                related_object_type="comment",
                related_object_id=comment.pk,
            )

    @action(detail=True, methods=["post"], url_path="moderate")
    def moderate(self, request, pk=None):
        """POST /api/comments/<id>/moderate/ — blog_admin+ only."""
        comment = self.get_object()
        new_status = request.data.get("status")
        if new_status not in (Comment.STATUS_VISIBLE, Comment.STATUS_HIDDEN, Comment.STATUS_FLAGGED):
            return Response({"error": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
        comment.status = new_status
        comment.save(update_fields=["status"])
        log_action(request.user, f"comment.{new_status}", "comments", comment.pk, request=request)
        return Response({"message": f"Comment status set to {new_status}."})


# ---------------------------------------------------------------------------
# Like Toggle View
# ---------------------------------------------------------------------------

class LikeToggleView(APIView):
    """
    POST /api/likes/
    Toggle like/unlike on a post or comment.
    Returns liked=True/False and updated count.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        post_id    = request.data.get("post")
        comment_id = request.data.get("comment")

        if not post_id and not comment_id:
            return Response(
                {"error": "Provide either 'post' or 'comment' id."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if post_id and comment_id:
            return Response(
                {"error": "Provide either 'post' or 'comment', not both."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        filters = {"user": request.user}
        count_qs = None

        if post_id:
            filters["post_id"] = post_id
            try:
                post = Post.objects.get(pk=post_id, status=Post.STATUS_PUBLISHED)
            except Post.DoesNotExist:
                return Response({"error": "Post not found."}, status=status.HTTP_404_NOT_FOUND)
            count_qs = Like.objects.filter(post=post)
        else:
            filters["comment_id"] = comment_id
            try:
                comment = Comment.objects.get(pk=comment_id)
            except Comment.DoesNotExist:
                return Response({"error": "Comment not found."}, status=status.HTTP_404_NOT_FOUND)
            count_qs = Like.objects.filter(comment=comment)

        like, created = Like.objects.get_or_create(**filters)
        if not created:
            like.delete()
            return Response({
                "liked": False,
                "count": count_qs.count(),
            })

        return Response({
            "liked": True,
            "count": count_qs.count(),
        }, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Full-Text Search View
# ---------------------------------------------------------------------------

class PostSearchView(generics.ListAPIView):
    """
    GET /api/search/?q=<query>
    Full-text search on published posts using PostgreSQL tsvector.
    Falls back to icontains if tsvector not populated.
    """
    serializer_class = PostListSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardResultsPagination

    def get_queryset(self):
        query_str = self.request.query_params.get("q", "").strip()
        category  = self.request.query_params.get("category")

        if not query_str:
            return Post.objects.none()

        # SECURITY: SearchQuery uses parameterized queries internally —
        # no string interpolation into SQL.
        search_query = SearchQuery(query_str, search_type="plainto")

        qs = Post.objects.filter(
            status=Post.STATUS_PUBLISHED,
            search_vector=search_query,
        ).annotate(
            rank=SearchRank("search_vector", search_query),
            like_count=Count("likes", distinct=True),
            comment_count=Count(
                "comments", distinct=True,
                filter=__import__("django.db.models", fromlist=["Q"]).Q(
                    comments__status=Comment.STATUS_VISIBLE
                )
            ),
        ).select_related("author", "category") \
         .prefetch_related("tags") \
         .order_by("-rank", "-published_at")

        if category:
            qs = qs.filter(category__slug=category)

        return qs
