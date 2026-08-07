from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "user", "channel", "category", "message",
            "is_sent", "sent_at", "is_read", "read_at", "created_at",
        ]
        read_only_fields = ["user", "is_sent", "sent_at", "is_read", "read_at", "created_at"]
