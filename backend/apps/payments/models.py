from django.db import models

from apps.accounts.models import User


class Transaction(models.Model):
    class Purpose(models.TextChoices):
        EQUIPMENT_BOOKING = "equipment_booking", "Equipment Booking"
        PRODUCE_SALE = "produce_sale", "Produce Sale"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    class Channel(models.TextChoices):
        MTN_MOMO = "mtn_momo", "MTN MoMo"
        VODAFONE_CASH = "vodafone_cash", "Vodafone Cash"
        AIRTELTIGO = "airteltigo", "AirtelTigo Money"
        CARD = "card", "Card (Hubtel Checkout)"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="transactions")
    purpose = models.CharField(max_length=30, choices=Purpose.choices)
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.MTN_MOMO)
    amount_ghs = models.DecimalField(max_digits=9, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    provider_reference = models.CharField(max_length=120, blank=True)
    equipment_booking = models.ForeignKey(
        "equipment.EquipmentBooking", on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions"
    )
    produce_order = models.ForeignKey(
        "marketplace.Order", on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions"
    )
    raw_callback_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_purpose_display()} - GHS {self.amount_ghs} ({self.status})"
