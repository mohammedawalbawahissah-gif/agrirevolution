from django.db import models

from apps.accounts.models import User
from apps.payments.models import Transaction


class Equipment(models.Model):
    class Category(models.TextChoices):
        PLOUGHING = "ploughing", "Ploughing"
        PLANTING = "planting", "Planting"
        HARVESTING = "harvesting", "Harvesting"
        SPRAYING = "spraying", "Spraying"
        TRANSPORT = "transport", "Transport"

    dealer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="equipment_listings")
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=20, choices=Category.choices)
    rate_per_acre_ghs = models.DecimalField(max_digits=8, decimal_places=2)
    is_available = models.BooleanField(default=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.dealer})"


class EquipmentBooking(models.Model):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        CONFIRMED = "confirmed", "Confirmed"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    class DeliveryMethod(models.TextChoices):
        PICKUP = "pickup", "Farmer Pickup"
        DELIVERY = "delivery", "Delivery to Farmer"

    farmer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="equipment_bookings")
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name="bookings")
    requested_date = models.DateField()
    acreage = models.DecimalField(max_digits=6, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)
    total_cost_ghs = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    requested_via = models.CharField(
        max_length=10,
        choices=[("app", "App"), ("ussd", "USSD"), ("voice", "Voice")],
        default="app",
    )
    delivery_method = models.CharField(
        max_length=10, choices=DeliveryMethod.choices, default=DeliveryMethod.PICKUP,
    )
    delivery_location = models.CharField(
        max_length=255, blank=True, help_text="Where the equipment should be picked up from or delivered to",
    )
    payment_channel = models.CharField(
        max_length=20, choices=Transaction.Channel.choices, blank=True,
        help_text="Farmer's chosen payment channel for this booking",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Booking #{self.pk} - {self.equipment.name} for {self.farmer}"
