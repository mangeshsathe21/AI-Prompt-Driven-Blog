"""
GreenTalk — Marketplace Models
================================
Models: Plant (catalog), ExchangeListing, PurchaseListing, Order

ORDER INTENT ONLY:
  Orders are NOT payment-processing records. They record buyer interest:
  buyer requests → seller marks reserved/completed/cancelled.
  No payment gateway is integrated — intentionally out of scope.

SECURITY:
- price and stock_quantity use DecimalField / PositiveIntegerField
  with min-value validators (mirrors DB CHECK constraints).
- ON DELETE RESTRICT at DB level prevents listing deletion while
  active orders exist — enforced in models via PROTECT.
- Images stored as JSONB list of URL strings (S3/local paths).
"""

from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator


class Plant(models.Model):
    """Reference/catalog table for plant species."""
    name            = models.CharField(max_length=200, db_index=True)
    scientific_name = models.CharField(max_length=200, blank=True)
    category        = models.CharField(max_length=100, blank=True)   # tree, shrub, herb…
    climate_zone    = models.CharField(max_length=100, blank=True)
    soil_type       = models.CharField(max_length=200, blank=True)
    water_needs     = models.CharField(max_length=100, blank=True)   # low/medium/high
    sunlight_needs  = models.CharField(max_length=100, blank=True)
    growth_rate     = models.CharField(max_length=50, blank=True)    # slow/moderate/fast
    native_status   = models.CharField(max_length=100, blank=True)   # native/non-native
    image_url       = models.URLField(blank=True)
    description     = models.TextField(blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "plants"
        ordering = ["name"]

    def __str__(self):
        return self.name


class ExchangeListing(models.Model):
    """
    Free or swap plant listing.
    plant may be NULL if described via plant_name free text.
    """
    TYPE_FREE = "free"
    TYPE_SWAP = "swap"
    TYPE_CHOICES = [(TYPE_FREE, "Free"), (TYPE_SWAP, "Swap")]

    STATUS_AVAILABLE  = "available"
    STATUS_RESERVED   = "reserved"
    STATUS_COMPLETED  = "completed"
    STATUS_CHOICES = [
        (STATUS_AVAILABLE, "Available"),
        (STATUS_RESERVED,  "Reserved"),
        (STATUS_COMPLETED, "Completed"),
    ]

    user         = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,   # RESTRICT: deactivate user, don't orphan listing
        related_name="exchange_listings",
    )
    plant        = models.ForeignKey(
        Plant,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="exchange_listings",
    )
    plant_name   = models.CharField(max_length=200, blank=True)  # free-text fallback
    quantity     = models.PositiveSmallIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
    )
    condition    = models.CharField(max_length=100, blank=True)  # seedling/sapling/mature
    listing_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=TYPE_FREE)
    swap_for_text = models.TextField(blank=True)   # what user wants in return
    location     = models.CharField(max_length=200, blank=True)
    status       = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_AVAILABLE,
        db_index=True,
    )
    images       = models.JSONField(default=list, blank=True)   # list of URL strings
    description  = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "exchange_listings"
        ordering = ["-created_at"]

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.plant_id and not self.plant_name.strip():
            raise ValidationError("Either plant or plant_name must be provided.")
        if self.listing_type == self.TYPE_SWAP and not self.swap_for_text.strip():
            raise ValidationError("swap_for_text is required for swap listings.")

    def __str__(self):
        name = self.plant.name if self.plant else self.plant_name
        return f"{name} ({self.listing_type}) by {self.user_id}"


class PurchaseListing(models.Model):
    """
    Marketplace listing for selling plants.
    price >= 0 enforced by validator (mirrors DB CHECK constraint).
    """
    STATUS_ACTIVE    = "active"
    STATUS_SOLD_OUT  = "sold_out"
    STATUS_REMOVED   = "removed"
    STATUS_CHOICES = [
        (STATUS_ACTIVE,   "Active"),
        (STATUS_SOLD_OUT, "Sold Out"),
        (STATUS_REMOVED,  "Removed"),
    ]

    seller         = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="purchase_listings",
    )
    plant          = models.ForeignKey(
        Plant,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    title          = models.CharField(max_length=300)
    description    = models.TextField(blank=True)
    price          = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    currency       = models.CharField(max_length=3, default="INR")
    stock_quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(0)],
    )
    images         = models.JSONField(default=list, blank=True)
    status         = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
        db_index=True,
    )
    created_at     = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "purchase_listings"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} (₹{self.price})"


class Order(models.Model):
    """
    Records buyer interest / intent for a PurchaseListing.
    NO PAYMENT PROCESSING — this is a coordination record only.
    Workflow: pending → confirmed → shipped → completed (or cancelled).
    """
    STATUS_PENDING   = "pending"
    STATUS_CONFIRMED = "confirmed"
    STATUS_SHIPPED   = "shipped"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = [
        (STATUS_PENDING,   "Pending"),
        (STATUS_CONFIRMED, "Confirmed"),
        (STATUS_SHIPPED,   "Shipped"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    buyer      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders",
    )
    listing    = models.ForeignKey(
        PurchaseListing,
        on_delete=models.PROTECT,   # preserve order history; use status=removed on listing
        related_name="orders",
    )
    quantity   = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
    )
    total_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    status     = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )
    notes      = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orders"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.pk} by {self.buyer_id} — {self.status}"
