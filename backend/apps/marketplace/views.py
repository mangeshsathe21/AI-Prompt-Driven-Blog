"""
GreenTalk — Marketplace Views
================================
ViewSets for Plant, ExchangeListing, PurchaseListing, Order.

Endpoints:
  /api/plants/                    — list/retrieve (public), create/update (admin+)
  /api/exchange-listings/         — list (public), create (auth+verified)
  /api/exchange-listings/<id>/    — detail, update own, delete own or admin
  /api/exchange-listings/<id>/update-status/ — owner updates listing status
  /api/purchase-listings/         — list (public), create (auth+verified)
  /api/purchase-listings/<id>/    — detail, update own, delete own or admin
  /api/orders/                    — list own orders, create
  /api/orders/<id>/               — retrieve own order
  /api/orders/<id>/update-status/ — seller/buyer updates order status
"""

import logging
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from apps.core.permissions import (
    IsBlogAdminOrSuperAdmin, IsOwnerOrBlogAdmin, IsVerifiedUser,
)
from apps.core.pagination import StandardResultsPagination
from apps.audit.utils import log_action
from apps.notifications.utils import notify_user

from .models import Plant, ExchangeListing, PurchaseListing, Order
from .serializers import (
    PlantSerializer,
    ExchangeListingSerializer, ExchangeListingStatusSerializer,
    PurchaseListingSerializer,
    OrderSerializer, OrderStatusSerializer,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Plant ViewSet (reference catalog)
# ---------------------------------------------------------------------------

class PlantViewSet(viewsets.ModelViewSet):
    """
    list/retrieve  — public
    create/update/delete — blog_admin+ (catalog management)
    Supports filtering via ?climate_zone=, ?water_needs=, ?category=
    """
    queryset = Plant.objects.all()
    serializer_class = PlantSerializer
    pagination_class = StandardResultsPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "scientific_name", "category", "climate_zone"]
    ordering_fields = ["name", "created_at"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated(), IsBlogAdminOrSuperAdmin()]

    def get_queryset(self):
        qs = Plant.objects.all()
        climate   = self.request.query_params.get("climate_zone")
        water     = self.request.query_params.get("water_needs")
        soil      = self.request.query_params.get("soil_type")
        category  = self.request.query_params.get("category")
        native    = self.request.query_params.get("native_status")

        if climate:
            qs = qs.filter(climate_zone__icontains=climate)
        if water:
            qs = qs.filter(water_needs__icontains=water)
        if soil:
            qs = qs.filter(soil_type__icontains=soil)
        if category:
            qs = qs.filter(category__icontains=category)
        if native:
            qs = qs.filter(native_status__icontains=native)
        return qs


# ---------------------------------------------------------------------------
# Exchange Listing ViewSet
# ---------------------------------------------------------------------------

class ExchangeListingViewSet(viewsets.ModelViewSet):
    """
    list/retrieve  — public
    create         — authenticated + verified
    update/delete  — owner or blog_admin+
    update-status  — owner only
    """
    pagination_class = StandardResultsPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["plant_name", "location", "description"]
    ordering_fields = ["created_at", "status"]

    def get_queryset(self):
        qs = ExchangeListing.objects.select_related("user", "plant").all()
        location     = self.request.query_params.get("location")
        plant_id     = self.request.query_params.get("plant")
        listing_type = self.request.query_params.get("listing_type")
        status_filter = self.request.query_params.get("status")

        if location:
            qs = qs.filter(location__icontains=location)
        if plant_id:
            qs = qs.filter(plant_id=plant_id)
        if listing_type:
            qs = qs.filter(listing_type=listing_type)
        if status_filter:
            qs = qs.filter(status=status_filter)
        else:
            # Default: show available listings only for public view
            user = self.request.user
            if not user or not user.is_authenticated:
                qs = qs.filter(status=ExchangeListing.STATUS_AVAILABLE)
        return qs

    def get_serializer_class(self):
        if self.action == "update_status":
            return ExchangeListingStatusSerializer
        return ExchangeListingSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action in ("update", "partial_update", "destroy", "update_status"):
            return [IsAuthenticated(), IsOwnerOrBlogAdmin()]
        return [IsAuthenticated(), IsVerifiedUser()]

    @action(detail=True, methods=["patch"], url_path="update-status")
    def update_status(self, request, pk=None):
        """PATCH /api/exchange-listings/<id>/update-status/ — owner only."""
        listing = self.get_object()
        if listing.user != request.user:
            return Response(
                {"error": "Only the listing owner can update status."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = ExchangeListingStatusSerializer(
            listing, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ExchangeListingSerializer(listing, context={"request": request}).data)


# ---------------------------------------------------------------------------
# Purchase Listing ViewSet
# ---------------------------------------------------------------------------

class PurchaseListingViewSet(viewsets.ModelViewSet):
    """
    list/retrieve  — public (active listings only by default)
    create         — authenticated + verified
    update/delete  — owner or blog_admin+
    """
    pagination_class = StandardResultsPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description"]
    ordering_fields = ["price", "created_at", "stock_quantity"]

    def get_queryset(self):
        qs = PurchaseListing.objects.select_related("seller", "plant").all()
        min_price  = self.request.query_params.get("min_price")
        max_price  = self.request.query_params.get("max_price")
        plant_id   = self.request.query_params.get("plant")
        lsStatus   = self.request.query_params.get("status")

        if min_price:
            qs = qs.filter(price__gte=min_price)
        if max_price:
            qs = qs.filter(price__lte=max_price)
        if plant_id:
            qs = qs.filter(plant_id=plant_id)
        if lsStatus:
            qs = qs.filter(status=lsStatus)
        else:
            user = self.request.user
            if not user or not user.is_authenticated:
                qs = qs.filter(status=PurchaseListing.STATUS_ACTIVE)
        return qs

    def get_serializer_class(self):
        return PurchaseListingSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOwnerOrBlogAdmin()]
        return [IsAuthenticated(), IsVerifiedUser()]


# ---------------------------------------------------------------------------
# Order ViewSet
# ---------------------------------------------------------------------------

class OrderViewSet(viewsets.ModelViewSet):
    """
    Buyer creates orders (interest records — no payment).
    Seller and buyer can view their own orders.
    Seller updates status (confirmed/shipped/completed/cancelled).
    Buyer can cancel a pending order.
    """
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        from django.db.models import Q
        return Order.objects.select_related("buyer", "listing", "listing__seller") \
                            .filter(Q(buyer=user) | Q(listing__seller=user))

    def get_serializer_class(self):
        if self.action == "update_status":
            return OrderStatusSerializer
        return OrderSerializer

    def get_permissions(self):
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        order = serializer.save()
        # Notify seller of new order
        notify_user(
            user=order.listing.seller,
            notif_type="order_update",
            message=f"New order for '{order.listing.title}' from {order.buyer.full_name}.",
            related_object_type="order",
            related_object_id=order.pk,
        )

    @action(detail=True, methods=["patch"], url_path="update-status")
    def update_status(self, request, pk=None):
        """PATCH /api/orders/<id>/update-status/ — seller or buyer."""
        order = self.get_object()
        serializer = OrderStatusSerializer(
            order, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        log_action(
            actor=request.user,
            action=f"order.{order.status}",
            target_table="orders",
            target_id=order.pk,
            request=request,
        )

        # Notify buyer of status change
        if order.buyer != request.user:
            notify_user(
                user=order.buyer,
                notif_type="order_update",
                message=f"Your order for '{order.listing.title}' is now {order.status}.",
                related_object_type="order",
                related_object_id=order.pk,
            )

        return Response(OrderSerializer(order, context={"request": request}).data)
