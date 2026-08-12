from django.db import models

from apps.accounts.models import User
from apps.payments.models import Transaction


class InputProduct(models.Model):
    """A farm input (seed, fertilizer, agrochemical, tool) an input dealer
    stocks and sells — distinct from Equipment (rented machinery) and
    ProduceListing (a farmer's harvest for sale)."""

    class Category(models.TextChoices):
        SEEDS = "seeds", "Seeds"
        FERTILIZER = "fertilizer", "Fertilizer"
        AGROCHEMICAL = "agrochemical", "Agrochemical"
        TOOLS = "tools", "Tools & Supplies"
        OTHER = "other", "Other"

    dealer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="input_products")
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=20, choices=Category.choices)
    unit = models.CharField(max_length=50, help_text="e.g. '50kg bag', '1L bottle', 'packet'")
    price_ghs = models.DecimalField(max_digits=9, decimal_places=2)
    stock_quantity = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True)
    photo_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.dealer})"


class InputOrder(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        FULFILLED = "fulfilled", "Fulfilled"
        CANCELLED = "cancelled", "Cancelled"

    class DeliveryMethod(models.TextChoices):
        PICKUP = "pickup", "Farmer Pickup"
        DELIVERY = "delivery", "Delivery to Farmer"

    farmer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="input_orders")
    product = models.ForeignKey(InputProduct, on_delete=models.CASCADE, related_name="orders")
    quantity = models.PositiveIntegerField()
    total_price_ghs = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    delivery_method = models.CharField(
        max_length=10, choices=DeliveryMethod.choices, default=DeliveryMethod.PICKUP,
    )
    delivery_location = models.CharField(max_length=255, blank=True)
    payment_channel = models.CharField(
        max_length=20, choices=Transaction.Channel.choices, blank=True,
        help_text="Farmer's chosen payment channel for this order",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"InputOrder #{self.pk} - {self.product.name} x{self.quantity}"
