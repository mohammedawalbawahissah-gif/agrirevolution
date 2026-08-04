from rest_framework import serializers

from .models import USSDSession, VoiceCallLog


class USSDSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = USSDSession
        fields = ["id", "session_id", "phone_number", "current_menu", "context_data", "started_at", "ended_at"]


class VoiceCallLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoiceCallLog
        fields = ["id", "session_id", "phone_number", "direction", "transcript", "intent_detected", "created_at"]
