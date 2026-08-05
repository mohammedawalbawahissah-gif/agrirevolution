from django.contrib.auth.password_validation import validate_password
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


class AdminUserSerializer(serializers.ModelSerializer):
    """Used only by the admin-only UserViewSet — allows editing role and verification status."""

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "phone_number",
            "role", "preferred_access_mode", "community", "district",
            "preferred_language", "is_verified", "is_active", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


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


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = [
            "id", "username", "password", "first_name", "last_name", "phone_number",
            "role", "preferred_access_mode", "community", "district", "preferred_language",
        ]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user
