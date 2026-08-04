from rest_framework import serializers

from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            "id", "user", "purpose", "channel", "amount_ghs", "status",
            "provider_reference", "equipment_booking", "produce_order", "created_at", "updated_at",
        ]
        read_only_fields = ["status", "provider_reference", "created_at", "updated_at"]
