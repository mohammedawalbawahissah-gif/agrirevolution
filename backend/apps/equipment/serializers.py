from rest_framework import serializers

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


class EquipmentBookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = EquipmentBooking
        fields = [
            "id", "farmer", "equipment", "requested_date", "acreage", "status",
            "total_cost_ghs", "requested_via", "created_at", "updated_at",
        ]
        # farmer is set server-side from the authenticated user (see perform_create).
        # status changes go through EquipmentBookingStatusSerializer (dealer/admin only).
        read_only_fields = ["farmer", "total_cost_ghs", "status", "created_at", "updated_at"]

    def create(self, validated_data):
        equipment = validated_data["equipment"]
        acreage = validated_data["acreage"]
        validated_data["total_cost_ghs"] = equipment.rate_per_acre_ghs * acreage
        return super().create(validated_data)


class EquipmentBookingStatusSerializer(serializers.ModelSerializer):
    """Used for dealer/admin requests — the only fields that make sense for them to change."""

    class Meta:
        model = EquipmentBooking
        fields = [
            "id", "farmer", "equipment", "requested_date", "acreage", "status",
            "total_cost_ghs", "requested_via", "created_at", "updated_at",
        ]
        read_only_fields = ["farmer", "equipment", "requested_date", "acreage", "total_cost_ghs", "created_at", "updated_at"]
