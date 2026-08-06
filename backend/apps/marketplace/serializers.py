from rest_framework import serializers

from .models import Order, ProduceListing


class ProduceListingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProduceListing
        fields = [
            "id", "farmer", "crop", "quantity_kg", "photo_url", "ai_grade",
            "ai_grading_notes", "fair_price_band_low_ghs", "fair_price_band_high_ghs",
            "status", "listed_via", "created_at",
        ]
        # farmer is set server-side from the authenticated user (see perform_create).
        # ai_grade/price band come from the AI grading pipeline, not the farmer directly.
        read_only_fields = [
            "farmer", "ai_grade", "ai_grading_notes", "fair_price_band_low_ghs",
            "fair_price_band_high_ghs", "created_at",
        ]


class AdminProduceListingSerializer(serializers.ModelSerializer):
    """Used only for admin requests — allows manually overriding the AI grade, price band, and status."""

    class Meta:
        model = ProduceListing
        fields = [
            "id", "farmer", "crop", "quantity_kg", "photo_url", "ai_grade",
            "ai_grading_notes", "fair_price_band_low_ghs", "fair_price_band_high_ghs",
            "status", "listed_via", "created_at",
        ]
        read_only_fields = ["farmer", "created_at"]


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ["id", "listing", "buyer", "agreed_price_ghs", "status", "created_at", "updated_at"]
        # buyer is set server-side from the authenticated user (see perform_create).
        read_only_fields = ["buyer", "created_at", "updated_at"]
