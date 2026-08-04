"""
AI prediction layer for planting/harvest/mechanization timing.

This module is the integration point for:
  1. Pulling raw forecast data from the external weather provider
     (configured via settings.WEATHER_PROVIDER_API_KEY).
  2. Calling the Anthropic API (settings.ANTHROPIC_API_KEY) to translate
     raw forecast + crop calendar data into a plain-language recommendation
     that can be delivered over app, SMS, USSD, or voice.

Kept as a plain service module (not a Celery task yet) so it can be called
synchronously from a management command or async from a task queue once
that's wired up.
"""

from .models import PlantingRecommendation, WeatherForecast


def fetch_latest_forecast(community: str) -> WeatherForecast | None:
    """Fetch/refresh the forecast for a community. Provider call goes here."""
    raise NotImplementedError("Wire up the weather provider client here.")


def generate_planting_recommendation(farmer, crop: str) -> PlantingRecommendation:
    """
    Build an AI-driven recommendation for a specific farmer/crop using the
    latest forecast for their community. Calls the Anthropic API for the
    plain-language rationale surfaced in-app and read aloud via voice/USSD.
    """
    raise NotImplementedError("Wire up the Anthropic API call here.")
