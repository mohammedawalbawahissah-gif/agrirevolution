from rest_framework import serializers

from .models import PlantingRecommendation, WeatherForecast


class WeatherForecastSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeatherForecast
        fields = [
            "id", "community", "district", "forecast_date", "rainfall_mm",
            "temperature_high_c", "temperature_low_c", "humidity_percent", "fetched_at",
        ]


class PlantingRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlantingRecommendation
        fields = [
            "id", "farmer", "crop", "recommended_action", "recommended_window_start",
            "recommended_window_end", "ai_rationale", "confidence_score",
            "based_on_forecast", "created_at",
        ]
        read_only_fields = ["ai_rationale", "confidence_score", "created_at"]
