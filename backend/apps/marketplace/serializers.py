from rest_framework import serializers

from apps.payments.models import Transaction

from .models import Order, ProduceListing


class ProduceListingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProduceListing
        fields = [
            "id", "farmer", "crop", "quantity_kg", "photo_url", "ai_grade",
            "ai_grading_notes", "grading_source", "fair_price_band_low_ghs",
            "fair_price_band_high_ghs", "status", "listed_via", "delivery_method",
            "delivery_location", "accepted_payment_methods", "created_at",
        ]
        # farmer is set server-side from the authenticated user (see perform_create).
        # ai_grade/price band/grading_source only change through the grade or
        # manual-grade actions, never a plain PATCH — see views.py.
        read_only_fields = [
            "farmer", "ai_grade", "ai_grading_notes", "grading_source",
            "fair_price_band_low_ghs", "fair_price_band_high_ghs", "created_at",
        ]

    def validate_accepted_payment_methods(self, value):
        valid_channels = {choice for choice, _ in Transaction.Channel.choices}
        if not isinstance(value, list) or not all(v in valid_channels for v in value):
            raise serializers.ValidationError(
                f"Each payment method must be one of {sorted(valid_channels)}."
            )
        return value


class AdminProduceListingSerializer(serializers.ModelSerializer):
    """
    Used only for admin requests — allows manually overriding the AI grade,
    price band, and status, and leaves `farmer` writable so an admin can
    list produce on behalf of a farmer who can't do it themselves.
    """

    class Meta:
        model = ProduceListing
        fields = [
            "id", "farmer", "crop", "quantity_kg", "photo_url", "ai_grade",
            "ai_grading_notes", "grading_source", "fair_price_band_low_ghs",
            "fair_price_band_high_ghs", "status", "listed_via", "delivery_method",
            "delivery_location", "accepted_payment_methods", "created_at",
        ]
        read_only_fields = ["created_at"]

    def validate_accepted_payment_methods(self, value):
        valid_channels = {choice for choice, _ in Transaction.Channel.choices}
        if not isinstance(value, list) or not all(v in valid_channels for v in value):
            raise serializers.ValidationError(
                f"Each payment method must be one of {sorted(valid_channels)}."
            )
        return value


class OrderSerializer(serializers.ModelSerializer):
    """Used for buyer requests — the buyer sets delivery/payment choices at creation time."""

    class Meta:
        model = Order
        fields = [
            "id", "listing", "buyer", "agreed_price_ghs", "status",
            "delivery_method", "delivery_address", "payment_method",
            "created_at", "updated_at",
        ]
        # buyer is set server-side from the authenticated user (see perform_create).
        read_only_fields = ["buyer", "status", "created_at", "updated_at"]

    def validate(self, attrs):
        delivery_method = attrs.get("delivery_method", getattr(self.instance, "delivery_method", Order.DeliveryMethod.PICKUP))
        delivery_address = attrs.get("delivery_address", getattr(self.instance, "delivery_address", ""))
        if delivery_method == Order.DeliveryMethod.DELIVERY and not delivery_address:
            raise serializers.ValidationError(
                {"delivery_address": "Required when delivery_method is 'delivery'."}
            )
        payment_method = attrs.get("payment_method", getattr(self.instance, "payment_method", ""))
        if payment_method:
            valid_channels = {choice for choice, _ in Transaction.Channel.choices}
            if payment_method not in valid_channels:
                raise serializers.ValidationError(
                    {"payment_method": f"Must be one of {sorted(valid_channels)}."}
                )
        return attrs


class OrderStatusSerializer(serializers.ModelSerializer):
    """Used for farmer/admin requests — only status is meant to change; the buyer's delivery/payment choices stay put."""

    class Meta:
        model = Order
        fields = [
            "id", "listing", "buyer", "agreed_price_ghs", "status",
            "delivery_method", "delivery_address", "payment_method",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "buyer", "listing", "agreed_price_ghs", "delivery_method",
            "delivery_address", "payment_method", "created_at", "updated_at",
        ]
