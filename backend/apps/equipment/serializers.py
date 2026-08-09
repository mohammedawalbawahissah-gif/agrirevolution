from rest_framework import serializers

from apps.payments.models import Transaction

from .models import Equipment, EquipmentBooking


class BookingDisplayFieldsMixin(serializers.Serializer):
    """
    Read-only human-readable names, mixed into every booking serializer below
    so the frontend (detail modals especially) can show "Awal Issah" and
    "Massey Ferguson Plough" instead of bare farmer=7/equipment=3 IDs.
    Declared as a plain Serializer (not ModelSerializer) — DRF's serializer
    metaclass walks the whole MRO to collect declared fields, so mixing this
    in ahead of ModelSerializer in each class below is enough for these
    fields to show up without repeating them three times.
    """

    equipment_name = serializers.CharField(source="equipment.name", read_only=True)
    farmer_name = serializers.SerializerMethodField()
    dealer_name = serializers.SerializerMethodField()

    def get_farmer_name(self, obj):
        return obj.farmer.get_full_name() or obj.farmer.username

    def get_dealer_name(self, obj):
        return obj.equipment.dealer.get_full_name() or obj.equipment.dealer.username


class EquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipment
        fields = [
            "id", "dealer", "name", "category", "rate_per_acre_ghs",
            "is_available", "description", "photo_url", "created_at",
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
            "is_available", "description", "photo_url", "created_at",
        ]
        read_only_fields = ["created_at"]


class EquipmentBookingSerializer(BookingDisplayFieldsMixin, serializers.ModelSerializer):
    class Meta:
        model = EquipmentBooking
        fields = [
            "id", "farmer", "equipment", "requested_date", "acreage", "status",
            "total_cost_ghs", "requested_via", "delivery_method", "delivery_location",
            "payment_channel", "equipment_name", "farmer_name", "dealer_name", "created_at", "updated_at",
        ]
        # farmer is set server-side from the authenticated user (see perform_create).
        # status changes go through EquipmentBookingStatusSerializer (dealer/admin only).
        read_only_fields = ["farmer", "total_cost_ghs", "status", "created_at", "updated_at"]

    def validate_payment_channel(self, value):
        valid_channels = {choice for choice, _ in Transaction.Channel.choices}
        if value and value not in valid_channels:
            raise serializers.ValidationError(f"Must be one of {sorted(valid_channels)}.")
        return value

    def validate(self, attrs):
        # Once the dealer has acted on the booking (confirmed it or further),
        # the farmer editing the date/acreage/delivery/payment out from under
        # them would break what the dealer already agreed to — lock it then.
        if self.instance and self.instance.status != EquipmentBooking.Status.REQUESTED:
            raise serializers.ValidationError(
                "This booking can no longer be edited — it's already been "
                f"{self.instance.get_status_display()}."
            )
        return attrs

    def create(self, validated_data):
        equipment = validated_data["equipment"]
        acreage = validated_data["acreage"]
        validated_data["total_cost_ghs"] = equipment.rate_per_acre_ghs * acreage
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Acreage drives the cost — keep total_cost_ghs correct if it changes.
        acreage = validated_data.get("acreage", instance.acreage)
        equipment = validated_data.get("equipment", instance.equipment)
        validated_data["total_cost_ghs"] = equipment.rate_per_acre_ghs * acreage
        return super().update(instance, validated_data)


class EquipmentBookingStatusSerializer(BookingDisplayFieldsMixin, serializers.ModelSerializer):
    """Used for dealer/admin requests — the only fields that make sense for them to change.
    delivery_method/delivery_location/payment_channel are the farmer's choices and stay
    read-only here so a dealer can't overwrite them while updating status."""

    class Meta:
        model = EquipmentBooking
        fields = [
            "id", "farmer", "equipment", "requested_date", "acreage", "status",
            "total_cost_ghs", "requested_via", "delivery_method", "delivery_location",
            "payment_channel", "equipment_name", "farmer_name", "dealer_name", "created_at", "updated_at",
        ]
        read_only_fields = [
            "farmer", "equipment", "requested_date", "acreage", "total_cost_ghs",
            "delivery_method", "delivery_location", "payment_channel",
            "created_at", "updated_at",
        ]


class AdminEquipmentBookingSerializer(BookingDisplayFieldsMixin, serializers.ModelSerializer):
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
            "payment_channel", "equipment_name", "farmer_name", "dealer_name", "created_at", "updated_at",
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
