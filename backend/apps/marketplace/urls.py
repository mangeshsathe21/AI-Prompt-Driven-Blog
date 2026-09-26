from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PlantViewSet, ExchangeListingViewSet, PurchaseListingViewSet, OrderViewSet

router = DefaultRouter()
router.register("plants",             PlantViewSet,           basename="plant")
router.register("exchange-listings",  ExchangeListingViewSet, basename="exchange-listing")
router.register("purchase-listings",  PurchaseListingViewSet, basename="purchase-listing")
router.register("orders",             OrderViewSet,           basename="order")

urlpatterns = [path("", include(router.urls))]
