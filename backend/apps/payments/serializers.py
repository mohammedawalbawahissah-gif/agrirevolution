from rest_framework import serializers

from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            "id", "user", "purpose", "channel", "amount_ghs", "status",
            "provider_reference", "equipment_booking", "produce_order", "created_at", "updated_at",
        ]
        # user is set server-side from the authenticated user (see perform_create).
        read_only_fields = ["user", "status", "provider_reference", "created_at", "updated_at"]
