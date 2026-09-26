from django.contrib import admin
from .models import Plant, ExchangeListing, PurchaseListing, Order


@admin.register(Plant)
class PlantAdmin(admin.ModelAdmin):
    list_display  = ["name", "scientific_name", "category", "climate_zone", "native_status"]
    search_fields = ["name", "scientific_name"]
    list_filter   = ["category", "climate_zone", "native_status", "water_needs"]


@admin.register(ExchangeListing)
class ExchangeListingAdmin(admin.ModelAdmin):
    list_display  = ["user", "plant_name", "listing_type", "status", "location", "created_at"]
    list_filter   = ["status", "listing_type"]
    search_fields = ["plant_name", "location", "user__email"]
    actions       = ["mark_completed"]

    @admin.action(description="Mark selected listings as completed")
    def mark_completed(self, request, queryset):
        queryset.update(status="completed")


@admin.register(PurchaseListing)
class PurchaseListingAdmin(admin.ModelAdmin):
    list_display  = ["title", "seller", "price", "stock_quantity", "status", "created_at"]
    list_filter   = ["status"]
    search_fields = ["title", "seller__email"]
    actions       = ["mark_removed"]

    @admin.action(description="Remove selected listings")
    def mark_removed(self, request, queryset):
        queryset.update(status="removed")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display  = ["id", "buyer", "listing", "quantity", "total_price", "status", "created_at"]
    list_filter   = ["status"]
    search_fields = ["buyer__email", "listing__title"]
    readonly_fields = ["total_price", "created_at"]
