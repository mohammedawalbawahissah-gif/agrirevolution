from rest_framework import serializers

from .models import Equipment, EquipmentBooking


class EquipmentSerializer(serializers.ModelSerializer):
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
            "total_cost_ghs", "requested_via", "created_at", "updated_at",
        ]
        read_only_fields = ["total_cost_ghs", "status", "created_at", "updated_at"]

    def create(self, validated_data):
        equipment = validated_data["equipment"]
        acreage = validated_data["acreage"]
        validated_data["total_cost_ghs"] = equipment.rate_per_acre_ghs * acreage
        return super().create(validated_data)
