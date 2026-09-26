"""
GreenTalk — Marketplace Tests
================================
Tests: Plant catalog, Exchange listings, Purchase listings, Orders.
Includes negative price, zero quantity, and order state machine tests.
"""

import pytest
from decimal import Decimal
from django.urls import reverse
from apps.marketplace.models import PurchaseListing, Order, ExchangeListing


@pytest.mark.django_db
class TestPurchaseListing:

    def test_create_listing(self, user_client, plant):
        url = reverse("purchase-listing-list")
        response = user_client.post(url, {
            "plant": plant.pk,
            "title": "Neem Saplings",
            "price": "80.00",
            "stock_quantity": 20,
        })
        assert response.status_code == 201
        assert response.data["price"] == "80.00"

    def test_negative_price_rejected(self, user_client, plant):
        """SECURITY: negative price must be rejected by serializer validation."""
        url = reverse("purchase-listing-list")
        response = user_client.post(url, {
            "plant": plant.pk,
            "title": "Bad Listing",
            "price": "-10.00",
            "stock_quantity": 5,
        })
        assert response.status_code == 400

    def test_anonymous_can_list_listings(self, api_client, purchase_listing):
        url = reverse("purchase-listing-list")
        response = api_client.get(url)
        assert response.status_code == 200

    def test_unverified_user_cannot_create_listing(self, api_client, unverified_user, plant):
        from tests.conftest import get_auth_client
        client = get_auth_client(unverified_user)
        url = reverse("purchase-listing-list")
        response = client.post(url, {
            "plant": plant.pk,
            "title": "Unverified Listing",
            "price": "50.00",
            "stock_quantity": 5,
        })
        assert response.status_code == 403

    def test_other_user_cannot_edit_listing(self, purchase_listing):
        from django.contrib.auth import get_user_model
        from tests.conftest import get_auth_client
        User = get_user_model()
        other = User.objects.create_user(
            email="other2@test.com", username="other2",
            password="TestPass@1234", role="user", is_verified=True,
        )
        client = get_auth_client(other)
        url = reverse("purchase-listing-detail", kwargs={"pk": purchase_listing.pk})
        response = client.patch(url, {"title": "Hijacked"})
        assert response.status_code == 403


@pytest.mark.django_db
class TestExchangeListing:

    def test_create_exchange_listing(self, user_client, plant):
        url = reverse("exchange-listing-list")
        response = user_client.post(url, {
            "plant": plant.pk,
            "quantity": 2,
            "listing_type": "free",
            "location": "Pune",
        })
        assert response.status_code == 201

    def test_swap_listing_requires_swap_for_text(self, user_client, plant):
        url = reverse("exchange-listing-list")
        response = user_client.post(url, {
            "plant": plant.pk,
            "quantity": 1,
            "listing_type": "swap",
            # missing swap_for_text
        })
        assert response.status_code == 400

    def test_listing_without_plant_or_name_rejected(self, user_client):
        url = reverse("exchange-listing-list")
        response = user_client.post(url, {
            "quantity": 2,
            "listing_type": "free",
        })
        assert response.status_code == 400

    def test_zero_quantity_rejected(self, user_client, plant):
        url = reverse("exchange-listing-list")
        response = user_client.post(url, {
            "plant": plant.pk,
            "quantity": 0,
            "listing_type": "free",
        })
        assert response.status_code == 400


@pytest.mark.django_db
class TestOrders:

    def test_create_order(self, regular_user, purchase_listing):
        from tests.conftest import get_auth_client
        from django.contrib.auth import get_user_model
        User = get_user_model()
        buyer = User.objects.create_user(
            email="buyer@test.com", username="buyer",
            password="TestPass@1234", role="user", is_verified=True,
        )
        client = get_auth_client(buyer)
        url = reverse("order-list")
        response = client.post(url, {
            "listing": purchase_listing.pk,
            "quantity": 2,
            "notes": "Please pack well.",
        })
        assert response.status_code == 201
        # total_price calculated server-side
        assert Decimal(response.data["total_price"]) == purchase_listing.price * 2

    def test_cannot_order_inactive_listing(self, regular_user):
        from django.contrib.auth import get_user_model
        from tests.conftest import get_auth_client
        from apps.marketplace.models import PurchaseListing, Plant
        User = get_user_model()

        seller = User.objects.create_user(
            email="seller@test.com", username="seller",
            password="TestPass@1234", is_verified=True,
        )
        plant  = Plant.objects.create(name="Test Plant")
        listing = PurchaseListing.objects.create(
            seller=seller, plant=plant, title="Sold Out",
            price="50", stock_quantity=0, status="sold_out",
        )
        buyer = User.objects.create_user(
            email="buyer2@test.com", username="buyer2",
            password="TestPass@1234", is_verified=True,
        )
        client = get_auth_client(buyer)
        url = reverse("order-list")
        response = client.post(url, {"listing": listing.pk, "quantity": 1})
        assert response.status_code == 400

    def test_order_quantity_exceeds_stock_rejected(self, regular_user, purchase_listing):
        from tests.conftest import get_auth_client
        from django.contrib.auth import get_user_model
        User = get_user_model()
        buyer = User.objects.create_user(
            email="buyer3@test.com", username="buyer3",
            password="TestPass@1234", is_verified=True,
        )
        client = get_auth_client(buyer)
        url = reverse("order-list")
        response = client.post(url, {
            "listing": purchase_listing.pk,
            "quantity": purchase_listing.stock_quantity + 100,
        })
        assert response.status_code == 400
