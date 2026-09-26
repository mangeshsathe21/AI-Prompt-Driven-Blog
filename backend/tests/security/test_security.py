"""
GreenTalk — Security Tests
============================
Tests: SQL injection, XSS payloads, CSRF, role escalation,
       unauthenticated access, rate limit headers.
"""

import pytest
from django.urls import reverse
from apps.blog.models import Post
from apps.core.sanitizer import sanitize_post_content, sanitize_comment_content


# ---------------------------------------------------------------------------
# XSS Prevention
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestXSSPrevention:

    def test_script_tag_stripped_from_post_content(self):
        """nh3 must strip <script> tags from post content."""
        malicious = '<p>Hello</p><script>alert("xss")</script>'
        result = sanitize_post_content(malicious)
        assert "<script>" not in result
        assert "Hello" in result

    def test_event_handler_stripped_from_post_content(self):
        """onclick and other event handlers must be removed."""
        malicious = '<p onclick="alert(1)">Click me</p>'
        result = sanitize_post_content(malicious)
        assert "onclick" not in result
        assert "Click me" in result

    def test_iframe_stripped_from_post_content(self):
        malicious = '<iframe src="http://evil.com"></iframe><p>content</p>'
        result = sanitize_post_content(malicious)
        assert "<iframe" not in result
        assert "content" in result

    def test_script_tag_stripped_from_comment(self):
        malicious = 'Nice post! <script>document.cookie</script>'
        result = sanitize_comment_content(malicious)
        assert "<script>" not in result
        assert "Nice post!" in result

    def test_xss_in_post_via_api_is_sanitized(self, admin_client, category):
        """End-to-end: XSS payload submitted via API must be stored sanitized."""
        url = reverse("post-list")
        response = admin_client.post(url, {
            "title": "XSS API Test",
            "content": '<p>Safe</p><script>evil()</script>',
            "category": category.pk,
        })
        assert response.status_code == 201
        post = Post.objects.get(slug=response.data["slug"])
        assert "<script>" not in post.content


# ---------------------------------------------------------------------------
# SQL Injection
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestSQLInjection:

    def test_sql_injection_in_search_param(self, api_client):
        """
        SQL injection attempt in ?q= param must NOT cause errors.
        Django's SearchQuery uses parameterized queries — safe by design.
        """
        url = reverse("post-search")
        malicious = "'; DROP TABLE posts; --"
        response = api_client.get(url, {"q": malicious})
        # Must return 200 (empty results), not 500
        assert response.status_code == 200

    def test_sql_injection_in_filter_param(self, api_client):
        """SQL injection in ?location= must be handled safely."""
        url = reverse("exchange-listing-list")
        malicious = "Pune' OR '1'='1"
        response = api_client.get(url, {"location": malicious})
        assert response.status_code == 200

    def test_sql_injection_in_post_slug(self, api_client):
        """Accessing a post with injection-like slug must return 404 gracefully."""
        url = reverse("post-detail", kwargs={"slug": "'; DROP TABLE posts; --"})
        response = api_client.get(url)
        assert response.status_code in (404, 400)


# ---------------------------------------------------------------------------
# Role Escalation
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestRoleEscalation:

    def test_user_cannot_access_admin_audit_logs(self, user_client):
        url = reverse("admin-audit:audit-log-list")
        response = user_client.get(url)
        assert response.status_code == 403

    def test_blog_admin_cannot_access_audit_logs(self, admin_client):
        url = reverse("admin-audit:audit-log-list")
        response = admin_client.get(url)
        assert response.status_code == 403

    def test_user_cannot_approve_post(self, user_client, pending_post):
        url = reverse("post-approve", kwargs={"slug": pending_post.slug})
        response = user_client.post(url)
        assert response.status_code == 403

    def test_anonymous_cannot_create_post(self, api_client, category):
        url = reverse("post-list")
        response = api_client.post(url, {
            "title": "Anonymous Post",
            "content": "<p>Content</p>",
            "category": category.pk,
        })
        assert response.status_code == 401

    def test_user_cannot_delete_others_comment(self, category, published_post):
        from django.contrib.auth import get_user_model
        from tests.conftest import get_auth_client
        from apps.blog.models import Comment
        User = get_user_model()

        commenter = User.objects.create_user(
            email="commenter@test.com", username="commenter",
            password="TestPass@1234", is_verified=True,
        )
        other = User.objects.create_user(
            email="other3@test.com", username="other3",
            password="TestPass@1234", is_verified=True,
        )
        comment = Comment.objects.create(
            post=published_post, user=commenter, content="My comment"
        )
        client = get_auth_client(other)
        url = reverse("comment-detail", kwargs={"pk": comment.pk})
        response = client.delete(url)
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAuthentication:

    def test_invalid_token_rejected(self, api_client, published_post):
        api_client.credentials(HTTP_AUTHORIZATION="Bearer invalidtoken123")
        url = reverse("post-list")
        response = api_client.post(url, {"title": "Test", "content": "<p>Test</p>"})
        assert response.status_code == 401

    def test_expired_token_rejected(self, api_client):
        """Use a manually crafted expired token."""
        import jwt
        from django.conf import settings
        from datetime import datetime, timezone as tz
        payload = {
            "user_id": 999,
            "exp": datetime(2020, 1, 1, tzinfo=tz.utc).timestamp(),
            "token_type": "access",
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        url = reverse("auth:auth-profile")
        response = api_client.get(url)
        assert response.status_code == 401
