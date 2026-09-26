"""Blog URL configuration."""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, TagViewSet, PostViewSet,
    CommentViewSet, LikeToggleView, PostSearchView,
)

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("tags",       TagViewSet,      basename="tag")
router.register("posts",      PostViewSet,     basename="post")
router.register("comments",   CommentViewSet,  basename="comment")

urlpatterns = [
    path("", include(router.urls)),
    path("likes/",  LikeToggleView.as_view(),  name="like-toggle"),
    path("search/", PostSearchView.as_view(),  name="post-search"),
]
