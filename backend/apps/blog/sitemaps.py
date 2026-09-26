"""
GreenTalk — Blog Sitemap
=========================
Exposes published posts for SEO crawlers via /sitemap.xml.
Uses Django's built-in sitemaps framework.
"""

from django.contrib.sitemaps import Sitemap
from django.urls import reverse
from .models import Post, Category


class PostSitemap(Sitemap):
    changefreq = "weekly"
    priority = 0.8
    protocol = "https"

    def items(self):
        return Post.objects.filter(status="published").order_by("-published_at")

    def lastmod(self, obj):
        return obj.updated_at

    def location(self, obj):
        # Frontend URL — the React app handles this route
        return f"/posts/{obj.slug}/"


class CategorySitemap(Sitemap):
    changefreq = "monthly"
    priority = 0.6
    protocol = "https"

    def items(self):
        return Category.objects.filter(is_active=True)

    def location(self, obj):
        return f"/category/{obj.slug}/"
