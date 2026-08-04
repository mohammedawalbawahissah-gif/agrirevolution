from django.db import models


class USSDSession(models.Model):
    """Tracks a single Africa's Talking USSD session's menu state."""

    session_id = models.CharField(max_length=100, unique=True)
    phone_number = models.CharField(max_length=20)
    current_menu = models.CharField(max_length=50, default="root")
    context_data = models.JSONField(default=dict, blank=True, help_text="Scratch state while navigating menus")
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"USSD {self.session_id} - {self.phone_number}"


class VoiceCallLog(models.Model):
    """Logs Africa's Talking voice interactions (IVR) for the low-literacy flow."""

    session_id = models.CharField(max_length=100, unique=True)
    phone_number = models.CharField(max_length=20)
    direction = models.CharField(max_length=10, choices=[("inbound", "Inbound"), ("outbound", "Outbound")])
    transcript = models.TextField(blank=True)
    intent_detected = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Voice {self.session_id} - {self.phone_number}"
