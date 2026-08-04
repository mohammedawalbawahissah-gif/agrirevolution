from django.db import models

from apps.accounts.models import User


class WeatherForecast(models.Model):
    """Raw forecast pulled from the weather provider for a community/district."""

    community = models.CharField(max_length=120)
    district = models.CharField(max_length=120, default="Tamale Metro")
    forecast_date = models.DateField()
    rainfall_mm = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    temperature_high_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    temperature_low_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    humidity_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    raw_provider_payload = models.JSONField(default=dict, blank=True)
    fetched_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["community", "forecast_date"])]
        unique_together = ("community", "forecast_date")

    def __str__(self):
        return f"{self.community} forecast {self.forecast_date}"


class PlantingRecommendation(models.Model):
    """AI-generated recommendation on when to plant/harvest/request equipment."""

    class Action(models.TextChoices):
        PLANT = "plant", "Plant"
        HARVEST = "harvest", "Harvest"
        REQUEST_EQUIPMENT = "request_equipment", "Request Equipment"
        HOLD = "hold", "Hold / Wait"

    farmer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="planting_recommendations")
    crop = models.CharField(max_length=120)
    recommended_action = models.CharField(max_length=30, choices=Action.choices)
    recommended_window_start = models.DateField()
    recommended_window_end = models.DateField()
    ai_rationale = models.TextField(help_text="Plain-language explanation surfaced to the farmer, incl. voice/USSD")
    confidence_score = models.DecimalField(max_digits=4, decimal_places=3, null=True, blank=True)
    based_on_forecast = models.ForeignKey(
        WeatherForecast, on_delete=models.SET_NULL, null=True, blank=True, related_name="recommendations"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.crop} {self.recommended_action} for {self.farmer}"
