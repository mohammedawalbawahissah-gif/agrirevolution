from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model. Phone number is the primary identifier since it
    doubles as the USSD/voice channel identity and MoMo payment number.
    """

    class Role(models.TextChoices):
        FARMER = "farmer", "Farmer"
        DEALER = "dealer", "Equipment Dealer"
        BUYER = "buyer", "Buyer"
        ADMIN = "admin", "Admin"

    class AccessMode(models.TextChoices):
        APP = "app", "Smartphone App"
        USSD = "ussd", "USSD"
        VOICE = "voice", "Voice"

    phone_number = models.CharField(max_length=20, unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.FARMER)
    preferred_access_mode = models.CharField(
        max_length=10, choices=AccessMode.choices, default=AccessMode.APP
    )
    community = models.CharField(max_length=120, blank=True)
    district = models.CharField(max_length=120, default="Tamale Metro")
    preferred_language = models.CharField(max_length=40, default="English")
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"


class FarmerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="farmer_profile")
    farm_size_acres = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    primary_crops = models.CharField(max_length=255, blank=True, help_text="Comma-separated crop list")
    gps_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    gps_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    def __str__(self):
        return f"FarmerProfile: {self.user}"


class DealerProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="dealer_profile")
    business_name = models.CharField(max_length=255)
    service_radius_km = models.PositiveIntegerField(default=15)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.business_name


class BuyerProfile(models.Model):
    class BuyerType(models.TextChoices):
        WHOLESALER = "wholesaler", "Wholesaler"
        RETAILER = "retailer", "Retailer"
        RESTAURANT = "restaurant", "Restaurant"
        PROCESSOR = "processor", "Food Processor"
        EXPORTER = "exporter", "Exporter"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="buyer_profile")
    business_name = models.CharField(max_length=255)
    buyer_type = models.CharField(max_length=20, choices=BuyerType.choices)

    def __str__(self):
        return self.business_name
