"""
GreenTalk — Shared pytest fixtures
=====================================
Provides reusable factories for User, Post, Category, Listing, etc.
Uses factory_boy for declarative model factories.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


# ---------------------------------------------------------------------------
# API Client helpers
# ---------------------------------------------------------------------------

@pytest.fixture
def api_client():
    return APIClient()


def get_auth_client(user):
    """Return an APIClient with a valid JWT access token for the given user."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")
    return client


# ---------------------------------------------------------------------------
# User fixtures (one per role)
# ---------------------------------------------------------------------------

@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        email="user@test.com",
        username="testuser",
        password="TestPass@1234",
        first_name="Test",
        last_name="User",
        role="user",
        is_verified=True,
    )


@pytest.fixture
def blog_admin_user(db):
    return User.objects.create_user(
        email="admin@test.com",
        username="blogadmin",
        password="AdminPass@1234",
        first_name="Blog",
        last_name="Admin",
        role="blog_admin",
        is_verified=True,
        is_staff=True,
    )


@pytest.fixture
def super_admin_user(db):
    return User.objects.create_user(
        email="super@test.com",
        username="superadmin",
        password="SuperPass@1234",
        first_name="Super",
        last_name="Admin",
        role="super_admin",
        is_verified=True,
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def unverified_user(db):
    return User.objects.create_user(
        email="unverified@test.com",
        username="unverified",
        password="TestPass@1234",
        role="user",
        is_verified=False,
    )


# ---------------------------------------------------------------------------
# Authenticated client fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def user_client(regular_user):
    return get_auth_client(regular_user)


@pytest.fixture
def admin_client(blog_admin_user):
    return get_auth_client(blog_admin_user)


@pytest.fixture
def super_client(super_admin_user):
    return get_auth_client(super_admin_user)


# ---------------------------------------------------------------------------
# Blog fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def category(db):
    from apps.blog.models import Category
    return Category.objects.create(
        name="Home Gardening",
        slug="home-gardening",
        description="Home gardening tips",
    )


@pytest.fixture
def published_post(db, blog_admin_user, category):
    from apps.blog.models import Post
    from django.utils import timezone
    return Post.objects.create(
        title="Test Published Post",
        slug="test-published-post",
        content="<p>Test content about plants.</p>",
        excerpt="Test excerpt",
        author=blog_admin_user,
        category=category,
        status=Post.STATUS_PUBLISHED,
        published_at=timezone.now(),
    )


@pytest.fixture
def pending_post(db, regular_user, category):
    from apps.blog.models import Post
    return Post.objects.create(
        title="Test Pending Post",
        slug="test-pending-post",
        content="<p>Pending content.</p>",
        author=regular_user,
        category=category,
        status=Post.STATUS_PENDING,
    )


# ---------------------------------------------------------------------------
# Marketplace fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def plant(db):
    from apps.marketplace.models import Plant
    return Plant.objects.create(
        name="Tulsi",
        scientific_name="Ocimum tenuiflorum",
        category="herb",
    )


@pytest.fixture
def purchase_listing(db, regular_user, plant):
    from apps.marketplace.models import PurchaseListing
    return PurchaseListing.objects.create(
        seller=regular_user,
        plant=plant,
        title="Tulsi Seedlings",
        price="60.00",
        stock_quantity=10,
        status="active",
    )
