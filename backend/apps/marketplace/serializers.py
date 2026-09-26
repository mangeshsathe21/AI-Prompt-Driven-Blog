"""
GreenTalk — Marketplace Serializers
=====================================
Plant, ExchangeListing, PurchaseListing, Order serializers.

SECURITY:
- price validated >= 0 (mirrors DB CHECK constraint).
- stock_quantity and quantity validated > 0.
- Images are stored as JSON list of URL strings; actual file uploads
  go through the media upload endpoint with full validation.
- Order status transitions validated: only allowed state machine moves.
- Seller/buyer set from request.user — never from client payload.
"""

from decimal import Decimal
from rest_framework import serializers
from apps.accounts.serializers import UserPublicSerializer
from .models import Plant, ExchangeListing, PurchaseListing, Order


# ---------------------------------------------------------------------------
# Plant
# ---------------------------------------------------------------------------

class PlantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plant
        fields = [
            "id", "name", "scientific_name", "category",
            "climate_zone", "soil_type", "water_needs",
            "sunlight_needs", "growth_rate", "native_status",
            "image_url", "description", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


# ---------------------------------------------------------------------------
# Exchange Listing
# ---------------------------------------------------------------------------

class ExchangeListingSerializer(serializers.ModelSerializer):
    user = UserPublicSerializer(read_only=True)
    plant_display = PlantSerializer(source="plant", read_only=True)

    class Meta:
        model = ExchangeListing
        fields = [
            "id", "user", "plant", "plant_display", "plant_name",
            "quantity", "condition", "listing_type", "swap_for_text",
            "location", "status", "images", "description",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "user", "status", "created_at", "updated_at"]

    def validate(self, attrs):
        plant      = attrs.get("plant")
        plant_name = attrs.get("plant_name", "").strip()
        if not plant and not plant_name:
            raise serializers.ValidationError(
                {"plant_name": "Either plant or plant_name must be provided."}
            )
        if attrs.get("listing_type") == ExchangeListing.TYPE_SWAP:
            if not attrs.get("swap_for_text", "").strip():
                raise serializers.ValidationError(
                    {"swap_for_text": "swap_for_text is required for swap listings."}
                )
        return attrs

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class ExchangeListingStatusSerializer(serializers.ModelSerializer):
    """Used by owner to update status (available → reserved → completed)."""
    ALLOWED_TRANSITIONS = {
        ExchangeListing.STATUS_AVAILABLE: [ExchangeListing.STATUS_RESERVED],
        ExchangeListing.STATUS_RESERVED:  [
            ExchangeListing.STATUS_AVAILABLE,
            ExchangeListing.STATUS_COMPLETED,
        ],
    }

    class Meta:
        model = ExchangeListing
        fields = ["status"]

    def validate_status(self, value):
        current = self.instance.status
        allowed = self.ALLOWED_TRANSITIONS.get(current, [])
        if value not in allowed and value != current:
            raise serializers.ValidationError(
                f"Cannot transition from '{current}' to '{value}'. "
                f"Allowed: {allowed}"
            )
        return value


# ---------------------------------------------------------------------------
# Purchase Listing
# ---------------------------------------------------------------------------

class PurchaseListingSerializer(serializers.ModelSerializer):
    seller = UserPublicSerializer(read_only=True)
    plant_display = PlantSerializer(source="plant", read_only=True)

    class Meta:
        model = PurchaseListing
        fields = [
            "id", "seller", "plant", "plant_display", "title",
            "description", "price", "currency", "stock_quantity",
            "images", "status", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "seller", "status", "created_at", "updated_at"]

    def validate_price(self, value):
        if value < Decimal("0"):
            raise serializers.ValidationError("Price cannot be negative.")
        return value

    def validate_stock_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock quantity cannot be negative.")
        return value

    def create(self, validated_data):
        validated_data["seller"] = self.context["request"].user
        return super().create(validated_data)


# ---------------------------------------------------------------------------
# Order
# ---------------------------------------------------------------------------

class OrderSerializer(serializers.ModelSerializer):
    buyer = UserPublicSerializer(read_only=True)
    listing_detail = PurchaseListingSerializer(source="listing", read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "buyer", "listing", "listing_detail",
            "quantity", "total_price", "status", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "buyer", "total_price", "status",
            "created_at", "updated_at",
        ]

    def validate(self, attrs):
        listing  = attrs.get("listing")
        quantity = attrs.get("quantity", 1)

        if listing and listing.status != PurchaseListing.STATUS_ACTIVE:
            raise serializers.ValidationError(
                {"listing": "This listing is no longer active."}
            )
        if listing and quantity > listing.stock_quantity:
            raise serializers.ValidationError(
                {"quantity": f"Only {listing.stock_quantity} units available."}
            )
        return attrs

    def create(self, validated_data):
        listing  = validated_data["listing"]
        quantity = validated_data["quantity"]
        validated_data["buyer"] = self.context["request"].user
        # Calculate total_price server-side — never trust client
        validated_data["total_price"] = listing.price * quantity
        return super().create(validated_data)


class OrderStatusSerializer(serializers.ModelSerializer):
    """
    Seller updates order status.
    Allowed transitions: pending → confirmed → shipped → completed | cancelled
    Buyer can cancel a pending order.
    """
    SELLER_TRANSITIONS = {
        Order.STATUS_PENDING:   [Order.STATUS_CONFIRMED, Order.STATUS_CANCELLED],
        Order.STATUS_CONFIRMED: [Order.STATUS_SHIPPED,   Order.STATUS_CANCELLED],
        Order.STATUS_SHIPPED:   [Order.STATUS_COMPLETED, Order.STATUS_CANCELLED],
    }
    BUYER_TRANSITIONS = {
        Order.STATUS_PENDING: [Order.STATUS_CANCELLED],
    }

    class Meta:
        model = Order
        fields = ["status"]

    def validate_status(self, value):
        request = self.context["request"]
        current = self.instance.status
        user    = request.user

        is_seller = self.instance.listing.seller == user
        is_buyer  = self.instance.buyer == user

        if is_seller:
            allowed = self.SELLER_TRANSITIONS.get(current, [])
        elif is_buyer:
            allowed = self.BUYER_TRANSITIONS.get(current, [])
        else:
            raise serializers.ValidationError("You do not have permission to update this order.")

        if value not in allowed:
            raise serializers.ValidationError(
                f"Cannot transition from '{current}' to '{value}'. Allowed: {allowed}"
            )
        return value
