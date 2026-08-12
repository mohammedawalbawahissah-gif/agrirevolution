from django.db import models

from apps.accounts.models import User


class Notification(models.Model):
    class Channel(models.TextChoices):
        SMS = "sms", "SMS"
        PUSH = "push", "Push"
        VOICE = "voice", "Voice"

    class Category(models.TextChoices):
        WEATHER_ALERT = "weather_alert", "Weather Alert"
        BOOKING_UPDATE = "booking_update", "Equipment Booking Update"
        LISTING_UPDATE = "listing_update", "Produce Listing Update"
        PAYMENT_UPDATE = "payment_update", "Payment Update"
        CROP_HEALTH_ALERT = "crop_health_alert", "Crop Health Alert"
        INPUT_ORDER_UPDATE = "input_order_update", "Farm Input Order Update"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    channel = models.CharField(max_length=10, choices=Channel.choices)
    category = models.CharField(max_length=30, choices=Category.choices)
    message = models.TextField()
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    action_url = models.CharField(
        max_length=255, blank=True,
        help_text="Relative in-app path to navigate to when this notification is clicked, e.g. '/farmer/orders'.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.category} -> {self.user} via {self.channel}"
