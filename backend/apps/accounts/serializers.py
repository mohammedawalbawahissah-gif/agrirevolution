from rest_framework import serializers

from .models import BuyerProfile, DealerProfile, FarmerProfile, User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "phone_number",
            "role", "preferred_access_mode", "community", "district",
            "preferred_language", "is_verified", "created_at",
        ]
        read_only_fields = ["id", "is_verified", "created_at"]


class FarmerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = FarmerProfile
        fields = ["id", "user", "farm_size_acres", "primary_crops", "gps_latitude", "gps_longitude"]


class DealerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = DealerProfile
        fields = ["id", "user", "business_name", "service_radius_km", "is_active"]


class BuyerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = BuyerProfile
        fields = ["id", "user", "business_name", "buyer_type"]
