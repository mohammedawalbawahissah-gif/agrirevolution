"""
AI prediction layer for planting/harvest/mechanization timing.

Two external calls happen here:
  1. Weather data — pulled from Open-Meteo (free, no API key required), using
     a lat/lon lookup for the farmer's community. WEATHER_PROVIDER_API_KEY in
     settings is kept for future use if a paid/higher-accuracy provider (e.g.
     GMet) replaces this, but Open-Meteo doesn't need it.
  2. Anthropic API — turns the raw forecast + crop into a plain-language
     recommendation that can be read aloud over USSD/voice as well as shown
     in the app.
"""

import json
import logging
from datetime import date, timedelta

import requests
from anthropic import Anthropic
from django.conf import settings

from .models import PlantingRecommendation, WeatherForecast

logger = logging.getLogger(__name__)

# Known community -> (lat, lon) lookups. Falls back to Tamale Metro's
# district-level coordinates for any community not explicitly listed, since
# Open-Meteo needs a coordinate pair, not a place name.
COMMUNITY_COORDINATES = {
    "tamale": (9.4008, -0.8393),
    "tamale metro": (9.4008, -0.8393),
    "kalpohin": (9.4189, -0.8317),
    "vittin": (9.4483, -0.8250),
    "gumani": (9.3833, -0.8500),
}
DEFAULT_COORDINATES = (9.4008, -0.8393)  # Tamale Metro district centroid

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


class WeatherServiceError(Exception):
    """Raised when the weather provider or AI call fails in a way callers should handle."""


def _coordinates_for_community(community: str) -> tuple[float, float]:
    return COMMUNITY_COORDINATES.get((community or "").strip().lower(), DEFAULT_COORDINATES)


def fetch_latest_forecast(community: str, district: str = "Tamale Metro") -> WeatherForecast:
    """
    Fetch today's forecast for a community from Open-Meteo and upsert it as a
    WeatherForecast row. Raises WeatherServiceError on network/parse failure
    so callers can decide how to degrade (e.g. skip AI generation for now).
    """
    lat, lon = _coordinates_for_community(community)
    today = date.today()

    try:
        response = requests.get(
            OPEN_METEO_URL,
            params={
                "latitude": lat,
                "longitude": lon,
                "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean",
                "timezone": "Africa/Accra",
                "forecast_days": 1,
            },
            timeout=10,
        )
        response.raise_for_status()
        payload = response.json()
        daily = payload["daily"]
    except (requests.RequestException, KeyError, ValueError) as exc:
        logger.warning("Weather fetch failed for community=%s: %s", community, exc)
        raise WeatherServiceError(f"Could not fetch weather for {community}: {exc}") from exc

    forecast, _created = WeatherForecast.objects.update_or_create(
        community=community,
        forecast_date=today,
        defaults={
            "district": district,
            "temperature_high_c": daily["temperature_2m_max"][0],
            "temperature_low_c": daily["temperature_2m_min"][0],
            "rainfall_mm": daily["precipitation_sum"][0],
            "humidity_percent": daily.get("relative_humidity_2m_mean", [None])[0],
            "raw_provider_payload": payload,
        },
    )
    return forecast


def _get_or_fetch_forecast(farmer) -> WeatherForecast | None:
    """Reuse today's forecast if we already have it; otherwise fetch fresh."""
    community = farmer.community or farmer.district
    today = date.today()
    existing = WeatherForecast.objects.filter(community=community, forecast_date=today).first()
    if existing:
        return existing
    try:
        return fetch_latest_forecast(community, farmer.district)
    except WeatherServiceError:
        return None


RECOMMENDATION_PROMPT = """You are an agricultural extension officer advising a smallholder farmer in Tamale Metro, Northern Ghana.

Farmer's crop: {crop}
Today's date: {today}
{forecast_context}

Based on this, recommend ONE of these actions: "plant", "harvest", "request_equipment", or "hold".
Give a recommended date window (start and end date, ISO format YYYY-MM-DD, within the next 21 days).
Write a short rationale (2-3 sentences, plain language, suitable to be read aloud over a phone call to a farmer with no formal education) explaining WHY, referencing the weather conditions.
Give a confidence score between 0 and 1.

Respond with ONLY a JSON object, no other text, in this exact shape:
{{"recommended_action": "...", "window_start": "YYYY-MM-DD", "window_end": "YYYY-MM-DD", "rationale": "...", "confidence": 0.0}}"""


def generate_planting_recommendation(farmer, crop: str) -> PlantingRecommendation:
    """
    Build an AI-driven recommendation for a specific farmer/crop using the
    latest forecast for their community. Calls the Anthropic API for the
    plain-language rationale surfaced in-app and read aloud via voice/USSD.
    """
    if not settings.ANTHROPIC_API_KEY:
        raise WeatherServiceError("ANTHROPIC_API_KEY is not configured.")

    forecast = _get_or_fetch_forecast(farmer)
    if forecast:
        forecast_context = (
            f"Today's forecast for {forecast.community}: "
            f"high {forecast.temperature_high_c}\u00b0C, low {forecast.temperature_low_c}\u00b0C, "
            f"rainfall {forecast.rainfall_mm}mm, humidity {forecast.humidity_percent}%."
        )
    else:
        forecast_context = (
            "No live forecast data is available right now — base your recommendation on "
            "typical Northern Ghana seasonal patterns for this time of year."
        )

    prompt = RECOMMENDATION_PROMPT.format(
        crop=crop, today=date.today().isoformat(), forecast_context=forecast_context
    )

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    try:
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        raw_text = message.content[0].text.strip()
        # Model may wrap in markdown fences despite instructions; strip defensively.
        raw_text = raw_text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        parsed = json.loads(raw_text)
    except Exception as exc:  # noqa: BLE001 - any failure here should degrade gracefully upstream
        logger.error("Anthropic recommendation generation failed for farmer=%s crop=%s: %s", farmer.id, crop, exc)
        raise WeatherServiceError(f"AI recommendation generation failed: {exc}") from exc

    action = parsed.get("recommended_action")
    valid_actions = {c[0] for c in PlantingRecommendation.Action.choices}
    if action not in valid_actions:
        action = PlantingRecommendation.Action.HOLD

    try:
        window_start = date.fromisoformat(parsed["window_start"])
        window_end = date.fromisoformat(parsed["window_end"])
    except (KeyError, ValueError):
        window_start = date.today()
        window_end = date.today() + timedelta(days=7)

    return PlantingRecommendation.objects.create(
        farmer=farmer,
        crop=crop,
        recommended_action=action,
        recommended_window_start=window_start,
        recommended_window_end=window_end,
        ai_rationale=parsed.get("rationale", "").strip() or "No rationale provided.",
        confidence_score=parsed.get("confidence"),
        based_on_forecast=forecast,
    )
