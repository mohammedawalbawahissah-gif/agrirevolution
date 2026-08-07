from rest_framework import serializers

from apps.payments.models import Transaction

from .models import Equipment, EquipmentBooking


class EquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipment
        fields = [
            "id", "dealer", "name", "category", "rate_per_acre_ghs",
            "is_available", "description", "created_at",
        ]
        # dealer is set server-side from the authenticated user (see perform_create),
        # never trusted from client input.
        read_only_fields = ["dealer", "created_at"]


class AdminEquipmentSerializer(serializers.ModelSerializer):
    """
    Used only for admin requests — leaves `dealer` writable so an admin can
    list equipment on behalf of a dealer who can't do it themselves (no
    smartphone, unfamiliar with the app, etc).
    """

    class Meta:
        model = Equipment
        fields = [
            "id", "dealer", "name", "category", "rate_per_acre_ghs",
            "is_available", "description", "created_at",
        ]
        read_only_fields = ["created_at"]


class EquipmentBookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = EquipmentBooking
        fields = [
            "id", "farmer", "equipment", "requested_date", "acreage", "status",
            "total_cost_ghs", "requested_via", "delivery_method", "delivery_location",
            "payment_channel", "created_at", "updated_at",
        ]
        # farmer is set server-side from the authenticated user (see perform_create).
        # status changes go through EquipmentBookingStatusSerializer (dealer/admin only).
        read_only_fields = ["farmer", "total_cost_ghs", "status", "created_at", "updated_at"]

    def validate_payment_channel(self, value):
        valid_channels = {choice for choice, _ in Transaction.Channel.choices}
        if value and value not in valid_channels:
            raise serializers.ValidationError(f"Must be one of {sorted(valid_channels)}.")
        return value

    def create(self, validated_data):
        equipment = validated_data["equipment"]
        acreage = validated_data["acreage"]
        validated_data["total_cost_ghs"] = equipment.rate_per_acre_ghs * acreage
        return super().create(validated_data)


class EquipmentBookingStatusSerializer(serializers.ModelSerializer):
    """Used for dealer/admin requests — the only fields that make sense for them to change.
    delivery_method/delivery_location/payment_channel are the farmer's choices and stay
    read-only here so a dealer can't overwrite them while updating status."""

    class Meta:
        model = EquipmentBooking
        fields = [
            "id", "farmer", "equipment", "requested_date", "acreage", "status",
            "total_cost_ghs", "requested_via", "delivery_method", "delivery_location",
            "payment_channel", "created_at", "updated_at",
        ]
        read_only_fields = [
            "farmer", "equipment", "requested_date", "acreage", "total_cost_ghs",
            "delivery_method", "delivery_location", "payment_channel",
            "created_at", "updated_at",
        ]


class AdminEquipmentBookingSerializer(serializers.ModelSerializer):
    """
    Used only for admin requests — full control, including `farmer` and
    `equipment` writable so an admin can create a booking on behalf of a
    farmer who can't do it themselves. Unlike EquipmentBookingStatusSerializer
    (dealer-facing, status-only), this behaves like the farmer-facing create
    serializer plus the ability to also update status/delivery/payment.
    """

    class Meta:
        model = EquipmentBooking
        fields = [
            "id", "farmer", "equipment", "requested_date", "acreage", "status",
            "total_cost_ghs", "requested_via", "delivery_method", "delivery_location",
            "payment_channel", "created_at", "updated_at",
        ]
        read_only_fields = ["total_cost_ghs", "created_at", "updated_at"]

    def validate_payment_channel(self, value):
        valid_channels = {choice for choice, _ in Transaction.Channel.choices}
        if value and value not in valid_channels:
            raise serializers.ValidationError(f"Must be one of {sorted(valid_channels)}.")
        return value

    def create(self, validated_data):
        equipment = validated_data["equipment"]
        acreage = validated_data["acreage"]
        validated_data["total_cost_ghs"] = equipment.rate_per_acre_ghs * acreage
        return super().create(validated_data)
