from rest_framework import serializers

from apps.payments.models import Transaction

from .models import InputOrder, InputProduct


class InputProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = InputProduct
        fields = [
            "id", "dealer", "name", "category", "unit", "price_ghs", "stock_quantity",
            "is_active", "description", "photo_url", "created_at",
        ]
        # dealer is set server-side from the authenticated user (see perform_create).
        read_only_fields = ["dealer", "created_at"]


class AdminInputProductSerializer(serializers.ModelSerializer):
    """Used only for admin requests — leaves `dealer` writable so an admin can
    list a product on behalf of an input dealer who can't do it themselves."""

    dealer_name = serializers.SerializerMethodField()

    def get_dealer_name(self, obj):
        return obj.dealer.get_full_name() or obj.dealer.username

    class Meta:
        model = InputProduct
        fields = [
            "id", "dealer", "dealer_name", "name", "category", "unit", "price_ghs",
            "stock_quantity", "is_active", "description", "photo_url", "created_at",
        ]
        read_only_fields = ["created_at"]


class InputOrderDisplayFieldsMixin(serializers.Serializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    farmer_name = serializers.SerializerMethodField()
    dealer_name = serializers.SerializerMethodField()

    def get_farmer_name(self, obj):
        return obj.farmer.get_full_name() or obj.farmer.username

    def get_dealer_name(self, obj):
        return obj.product.dealer.get_full_name() or obj.product.dealer.username


class InputOrderSerializer(InputOrderDisplayFieldsMixin, serializers.ModelSerializer):
    """Used for farmer requests — the farmer sets quantity/delivery/payment at creation time."""

    class Meta:
        model = InputOrder
        fields = [
            "id", "farmer", "product", "product_name", "farmer_name", "dealer_name",
            "quantity", "total_price_ghs", "status", "delivery_method", "delivery_location",
            "payment_channel", "created_at", "updated_at",
        ]
        # farmer is set server-side (see perform_create). total_price_ghs is
        # always computed from product.price_ghs * quantity, never trusted
        # from the client. status changes go through InputOrderStatusSerializer.
        read_only_fields = ["farmer", "total_price_ghs", "status", "created_at", "updated_at"]

    def validate_payment_channel(self, value):
        valid_channels = {choice for choice, _ in Transaction.Channel.choices}
        if value and value not in valid_channels:
            raise serializers.ValidationError(f"Must be one of {sorted(valid_channels)}.")
        return value

    def validate(self, attrs):
        # Once the dealer has acted on the order, the farmer changing
        # quantity/delivery/payment out from under them isn't safe.
        if self.instance and self.instance.status != InputOrder.Status.PENDING:
            raise serializers.ValidationError(
                f"This order can no longer be edited — it's already {self.instance.get_status_display()}."
            )

        product = attrs.get("product", getattr(self.instance, "product", None))
        quantity = attrs.get("quantity", getattr(self.instance, "quantity", None))
        if product and quantity:
            available = product.stock_quantity + (self.instance.quantity if self.instance else 0)
            if quantity > available:
                raise serializers.ValidationError(
                    {"quantity": f"Only {available} in stock."}
                )
        return attrs

    def create(self, validated_data):
        product = validated_data["product"]
        quantity = validated_data["quantity"]
        validated_data["total_price_ghs"] = product.price_ghs * quantity
        product.stock_quantity -= quantity
        product.save(update_fields=["stock_quantity"])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        product = validated_data.get("product", instance.product)
        new_quantity = validated_data.get("quantity", instance.quantity)
        if new_quantity != instance.quantity or product != instance.product:
            # Return the old reservation, then take the new one.
            instance.product.stock_quantity += instance.quantity
            instance.product.save(update_fields=["stock_quantity"])
            product.stock_quantity -= new_quantity
            product.save(update_fields=["stock_quantity"])
        validated_data["total_price_ghs"] = product.price_ghs * new_quantity
        return super().update(instance, validated_data)


class InputOrderStatusSerializer(InputOrderDisplayFieldsMixin, serializers.ModelSerializer):
    """Used for input-dealer/admin requests — status only. The farmer's
    quantity/delivery/payment choices stay read-only here, same pattern as
    equipment bookings and produce orders."""

    class Meta:
        model = InputOrder
        fields = [
            "id", "farmer", "product", "product_name", "farmer_name", "dealer_name",
            "quantity", "total_price_ghs", "status", "delivery_method", "delivery_location",
            "payment_channel", "created_at", "updated_at",
        ]
        read_only_fields = [
            "farmer", "product", "quantity", "total_price_ghs", "delivery_method",
            "delivery_location", "payment_channel", "created_at", "updated_at",
        ]

    def update(self, instance, validated_data):
        new_status = validated_data.get("status", instance.status)
        # Cancelling releases the reserved stock back to the dealer.
        if new_status == InputOrder.Status.CANCELLED and instance.status != InputOrder.Status.CANCELLED:
            instance.product.stock_quantity += instance.quantity
            instance.product.save(update_fields=["stock_quantity"])
        return super().update(instance, validated_data)


class AdminInputOrderSerializer(InputOrderDisplayFieldsMixin, serializers.ModelSerializer):
    """Used only for admin requests — full control, including `farmer` and
    `product` writable so an admin can create an order on behalf of a farmer
    who can't do it themselves, plus the ability to update status/delivery/payment."""

    class Meta:
        model = InputOrder
        fields = [
            "id", "farmer", "product", "product_name", "farmer_name", "dealer_name",
            "quantity", "total_price_ghs", "status", "delivery_method", "delivery_location",
            "payment_channel", "created_at", "updated_at",
        ]
        read_only_fields = ["total_price_ghs", "created_at", "updated_at"]

    def validate_payment_channel(self, value):
        valid_channels = {choice for choice, _ in Transaction.Channel.choices}
        if value and value not in valid_channels:
            raise serializers.ValidationError(f"Must be one of {sorted(valid_channels)}.")
        return value

    def create(self, validated_data):
        product = validated_data["product"]
        quantity = validated_data["quantity"]
        validated_data["total_price_ghs"] = product.price_ghs * quantity
        product.stock_quantity -= quantity
        product.save(update_fields=["stock_quantity"])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        new_status = validated_data.get("status", instance.status)
        if new_status == InputOrder.Status.CANCELLED and instance.status != InputOrder.Status.CANCELLED:
            instance.product.stock_quantity += instance.quantity
            instance.product.save(update_fields=["stock_quantity"])
        return super().update(instance, validated_data)
