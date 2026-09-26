"""
GreenTalk — Blog Post Tests
==============================
Tests: post CRUD, status workflow, moderation, permissions, likes.
"""

import pytest
from django.urls import reverse
from apps.blog.models import Post, Like


@pytest.mark.django_db
class TestPostWorkflow:

    def test_regular_user_post_is_pending(self, user_client, category):
        """Posts by role=user MUST be saved as pending — never published directly."""
        url = reverse("post-list")
        data = {
            "title": "My Garden Post",
            "content": "<p>I love plants!</p>",
            "excerpt": "I love plants!",
            "category": category.pk,
        }
        response = user_client.post(url, data)
        assert response.status_code == 201
        post = Post.objects.get(slug=response.data["slug"])
        assert post.status == Post.STATUS_PENDING

    def test_admin_post_is_published(self, admin_client, category):
        """Posts by role=blog_admin MUST auto-publish (default config)."""
        url = reverse("post-list")
        data = {
            "title": "Admin Post",
            "content": "<p>Admin content.</p>",
            "excerpt": "Admin content.",
            "category": category.pk,
        }
        response = admin_client.post(url, data)
        assert response.status_code == 201
        post = Post.objects.get(slug=response.data["slug"])
        assert post.status == Post.STATUS_PUBLISHED
        assert post.published_at is not None

    def test_client_cannot_override_status(self, user_client, category):
        """SECURITY: client-sent status field MUST be ignored."""
        url = reverse("post-list")
        data = {
            "title": "Sneaky Post",
            "content": "<p>Content.</p>",
            "category": category.pk,
            "status": "published",  # should be ignored
        }
        response = user_client.post(url, data)
        assert response.status_code == 201
        post = Post.objects.get(slug=response.data["slug"])
        assert post.status == Post.STATUS_PENDING  # must still be pending

    def test_unverified_user_cannot_create_post(self, api_client, unverified_user, category):
        from tests.conftest import get_auth_client
        client = get_auth_client(unverified_user)
        url = reverse("post-list")
        response = client.post(url, {
            "title": "Unverified Post",
            "content": "<p>Content.</p>",
        })
        assert response.status_code == 403

    def test_anonymous_can_list_published_posts(self, api_client, published_post):
        url = reverse("post-list")
        response = api_client.get(url)
        assert response.status_code == 200
        slugs = [p["slug"] for p in response.data["results"]]
        assert published_post.slug in slugs

    def test_pending_post_not_visible_to_anonymous(self, api_client, pending_post):
        url = reverse("post-list")
        response = api_client.get(url)
        slugs = [p["slug"] for p in response.data["results"]]
        assert pending_post.slug not in slugs

    def test_author_can_see_own_pending_post(self, user_client, pending_post):
        url = reverse("post-list")
        response = user_client.get(url)
        slugs = [p["slug"] for p in response.data["results"]]
        assert pending_post.slug in slugs

    def test_admin_can_approve_post(self, admin_client, pending_post):
        url = reverse("post-approve", kwargs={"slug": pending_post.slug})
        response = admin_client.post(url)
        assert response.status_code == 200
        pending_post.refresh_from_db()
        assert pending_post.status == Post.STATUS_PUBLISHED
        assert pending_post.published_at is not None

    def test_regular_user_cannot_approve_post(self, user_client, pending_post):
        url = reverse("post-approve", kwargs={"slug": pending_post.slug})
        response = user_client.post(url)
        assert response.status_code == 403

    def test_admin_can_reject_post(self, admin_client, pending_post):
        url = reverse("post-reject", kwargs={"slug": pending_post.slug})
        response = admin_client.post(url, {"reason": "Off-topic content"})
        assert response.status_code == 200
        pending_post.refresh_from_db()
        assert pending_post.status == Post.STATUS_REJECTED

    def test_xss_content_is_sanitized(self, admin_client, category):
        """SECURITY: XSS payload in post content must be stripped."""
        url = reverse("post-list")
        xss_content = '<p>Normal text</p><script>alert("xss")</script>'
        response = admin_client.post(url, {
            "title": "XSS Test Post",
            "content": xss_content,
            "category": category.pk,
        })
        assert response.status_code == 201
        post = Post.objects.get(slug=response.data["slug"])
        assert "<script>" not in post.content
        assert "Normal text" in post.content  # safe content preserved

    def test_slug_auto_generated(self, admin_client, category):
        url = reverse("post-list")
        response = admin_client.post(url, {
            "title": "Auto Slug Test Post",
            "content": "<p>Content.</p>",
            "category": category.pk,
        })
        assert response.status_code == 201
        assert response.data["slug"] == "auto-slug-test-post"

    def test_owner_can_edit_own_post(self, user_client, pending_post):
        url = reverse("post-detail", kwargs={"slug": pending_post.slug})
        response = user_client.patch(url, {"excerpt": "Updated excerpt"})
        assert response.status_code == 200

    def test_other_user_cannot_edit_post(self, admin_client, pending_post):
        """blog_admin can edit any post — test with a different regular user."""
        from django.contrib.auth import get_user_model
        from tests.conftest import get_auth_client
        User = get_user_model()
        other = User.objects.create_user(
            email="other@test.com", username="other",
            password="TestPass@1234", role="user", is_verified=True
        )
        client = get_auth_client(other)
        url = reverse("post-detail", kwargs={"slug": pending_post.slug})
        response = client.patch(url, {"excerpt": "Hacked"})
        assert response.status_code == 403


@pytest.mark.django_db
class TestLikes:

    def test_like_post(self, user_client, published_post):
        url = reverse("like-toggle")
        response = user_client.post(url, {"post": published_post.pk})
        assert response.status_code == 201
        assert response.data["liked"] is True

    def test_unlike_post(self, user_client, published_post):
        url = reverse("like-toggle")
        user_client.post(url, {"post": published_post.pk})  # like
        response = user_client.post(url, {"post": published_post.pk})  # unlike
        assert response.status_code == 200
        assert response.data["liked"] is False

    def test_duplicate_like_not_created(self, user_client, published_post, regular_user):
        """Duplicate like toggles off — DB unique constraint never violated."""
        url = reverse("like-toggle")
        user_client.post(url, {"post": published_post.pk})
        user_client.post(url, {"post": published_post.pk})  # unlike
        user_client.post(url, {"post": published_post.pk})  # like again
        assert Like.objects.filter(post=published_post, user=regular_user).count() == 1

    def test_anonymous_cannot_like(self, api_client, published_post):
        url = reverse("like-toggle")
        response = api_client.post(url, {"post": published_post.pk})
        assert response.status_code == 401
