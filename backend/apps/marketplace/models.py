from django.db import models

from apps.accounts.models import User


class ProduceListing(models.Model):
    class Grade(models.TextChoices):
        A = "A", "Grade A"
        B = "B", "Grade B"
        C = "C", "Grade C"
        UNGRADED = "ungraded", "Ungraded"

    class Status(models.TextChoices):
        LISTED = "listed", "Listed"
        RESERVED = "reserved", "Reserved"
        SOLD = "sold", "Sold"
        EXPIRED = "expired", "Expired"

    farmer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="produce_listings")
    crop = models.CharField(max_length=120)
    quantity_kg = models.DecimalField(max_digits=9, decimal_places=2)
    photo_url = models.URLField(blank=True)
    ai_grade = models.CharField(max_length=10, choices=Grade.choices, default=Grade.UNGRADED)
    ai_grading_notes = models.TextField(blank=True, help_text="Explanation the AI gave for the grade assigned")
    fair_price_band_low_ghs = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    fair_price_band_high_ghs = models.DecimalField(max_digits=9, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.LISTED)
    listed_via = models.CharField(
        max_length=10,
        choices=[("app", "App"), ("ussd", "USSD"), ("voice", "Voice")],
        default="app",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.quantity_kg}kg {self.crop} - {self.farmer}"


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        PAID = "paid", "Paid"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    listing = models.ForeignKey(ProduceListing, on_delete=models.CASCADE, related_name="orders")
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="orders")
    agreed_price_ghs = models.DecimalField(max_digits=9, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.pk} - {self.listing.crop}"
