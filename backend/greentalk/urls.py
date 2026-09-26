"""
GreenTalk — Root URL Configuration
=====================================
All API routes mounted under /api/.
Also exposes: /admin/, /sitemap.xml, /robots.txt, /api/docs/ (Swagger).
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.sitemaps.views import sitemap
from django.views.generic import TemplateView
from django.http import HttpResponse

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

from apps.blog.sitemaps import PostSitemap, CategorySitemap
from apps.accounts.urls import auth_urlpatterns, admin_user_urlpatterns
from apps.audit.urls import urlpatterns as audit_urlpatterns


# ---------------------------------------------------------------------------
# Sitemaps
# ---------------------------------------------------------------------------
sitemaps = {
    "posts":      PostSitemap,
    "categories": CategorySitemap,
}


# ---------------------------------------------------------------------------
# robots.txt
# ---------------------------------------------------------------------------
def robots_txt(request):
    """
    Serve robots.txt.
    Disallows /admin/ and /api/ from crawlers (SEO: only frontend routes indexed).
    """
    lines = [
        "User-agent: *",
        "Disallow: /admin/",
        "Disallow: /api/",
        f"Sitemap: {settings.SITE_URL}/sitemap.xml",
    ]
    return HttpResponse("\n".join(lines), content_type="text/plain")


# ---------------------------------------------------------------------------
# URL patterns
# ---------------------------------------------------------------------------
urlpatterns = [
    # Django Admin (restricted to staff/superuser)
    path("admin/", admin.site.urls),

    # OpenAPI Schema + Swagger UI + ReDoc
    path("api/schema/",        SpectacularAPIView.as_view(),      name="schema"),
    path("api/docs/",          SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/docs/redoc/",    SpectacularRedocView.as_view(url_name="schema"),   name="redoc"),

    # Auth endpoints: /api/auth/
    path("api/auth/", include((auth_urlpatterns, "auth"))),

    # Blog: /api/ (posts, categories, tags, comments, likes, search)
    path("api/", include("apps.blog.urls")),

    # Marketplace: /api/ (plants, exchange-listings, purchase-listings, orders)
    path("api/", include("apps.marketplace.urls")),

    # Notifications: /api/notifications/
    path("api/notifications/", include("apps.notifications.urls")),

    # Super Admin: /api/admin/users/ and /api/admin/audit-logs/
    path("api/admin/users/", include((admin_user_urlpatterns, "admin-users"))),
    path("api/admin/",       include((audit_urlpatterns, "admin-audit"))),

    # SEO
    path("sitemap.xml", sitemap, {"sitemaps": sitemaps}, name="django.contrib.sitemaps.views.sitemap"),
    path("robots.txt",  robots_txt, name="robots-txt"),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
