"""
Read-only tools the AI Assistant widget can call.

Deliberately excluded, by design and per instruction: anything touching the
User model (names, phone numbers, addresses of anyone other than the caller)
or the Transaction model (payment amounts, provider references, MoMo/card
details). Everything else — equipment, produce listings, bookings, orders,
weather — is fair game, scoped the same way the REST API already scopes it
for that role (a farmer's "my bookings" is their own; a dealer's equipment
list is their own; browsing the marketplace is open to everyone).
"""

from apps.equipment.models import Equipment, EquipmentBooking
from apps.marketplace.models import Order, ProduceListing
from apps.weather.services import WeatherServiceError, generate_planting_recommendation

TOOL_DEFINITIONS = [
    {
        "name": "get_weather_forecast",
        "description": (
            "Get the latest weather forecast for the user's community, and an AI-generated "
            "planting/harvest/equipment-timing recommendation for a given crop."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "crop": {"type": "string", "description": "Crop to get a planting/harvest recommendation for."},
            },
            "required": ["crop"],
        },
    },
    {
        "name": "list_equipment",
        "description": "Browse equipment available for booking (tractors, ploughs, sprayers, etc).",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["ploughing", "planting", "harvesting", "spraying", "transport"],
                    "description": "Filter by equipment category. Omit to see all categories.",
                },
            },
        },
    },
    {
        "name": "list_produce_listings",
        "description": "Browse produce currently listed for sale on the marketplace.",
        "input_schema": {
            "type": "object",
            "properties": {
                "crop": {"type": "string", "description": "Filter by crop name, e.g. 'Maize'. Omit to see all crops."},
            },
        },
    },
    {
        "name": "get_my_activity",
        "description": (
            "Get the current user's own equipment bookings, produce listings, and/or orders — "
            "whichever apply to their role. Never returns another user's activity."
        ),
        "input_schema": {"type": "object", "properties": {}},
    },
]


def _run_get_weather_forecast(user, crop: str) -> dict:
    try:
        recommendation = generate_planting_recommendation(user, crop)
    except WeatherServiceError as exc:
        return {"error": str(exc)}
    forecast = recommendation.based_on_forecast
    return {
        "forecast": {
            "community": forecast.community if forecast else user.community,
            "rainfall_mm": str(forecast.rainfall_mm) if forecast else None,
            "temperature_high_c": str(forecast.temperature_high_c) if forecast else None,
            "temperature_low_c": str(forecast.temperature_low_c) if forecast else None,
        }
        if forecast
        else None,
        "recommendation": {
            "action": recommendation.recommended_action,
            "window_start": str(recommendation.recommended_window_start),
            "window_end": str(recommendation.recommended_window_end),
            "rationale": recommendation.ai_rationale,
        },
    }


def _run_list_equipment(category: str | None = None) -> dict:
    qs = Equipment.objects.filter(is_available=True)
    if category:
        qs = qs.filter(category=category)
    return {
        "equipment": [
            {
                "id": e.id,
                "name": e.name,
                "category": e.category,
                "rate_per_acre_ghs": str(e.rate_per_acre_ghs),
            }
            for e in qs[:15]
        ]
    }


def _run_list_produce_listings(crop: str | None = None) -> dict:
    qs = ProduceListing.objects.filter(status=ProduceListing.Status.LISTED)
    if crop:
        qs = qs.filter(crop__icontains=crop)
    return {
        "listings": [
            {
                "id": listing.id,
                "crop": listing.crop,
                "quantity_kg": str(listing.quantity_kg),
                "grade": listing.ai_grade,
                "price_band_low_ghs": str(listing.fair_price_band_low_ghs) if listing.fair_price_band_low_ghs else None,
                "price_band_high_ghs": str(listing.fair_price_band_high_ghs) if listing.fair_price_band_high_ghs else None,
            }
            for listing in qs[:15]
        ]
    }


def _run_get_my_activity(user) -> dict:
    result = {}
    if user.role == "farmer":
        result["bookings"] = [
            {"id": b.id, "equipment": b.equipment.name, "status": b.status, "requested_date": str(b.requested_date)}
            for b in EquipmentBooking.objects.filter(farmer=user).select_related("equipment")[:15]
        ]
        result["listings"] = [
            {"id": listing.id, "crop": listing.crop, "status": listing.status, "grade": listing.ai_grade}
            for listing in ProduceListing.objects.filter(farmer=user)[:15]
        ]
    elif user.role == "dealer":
        result["equipment"] = [
            {"id": e.id, "name": e.name, "is_available": e.is_available}
            for e in Equipment.objects.filter(dealer=user)[:15]
        ]
        result["bookings_received"] = [
            {"id": b.id, "equipment": b.equipment.name, "status": b.status}
            for b in EquipmentBooking.objects.filter(equipment__dealer=user).select_related("equipment")[:15]
        ]
    elif user.role == "buyer":
        result["orders"] = [
            {"id": o.id, "crop": o.listing.crop, "status": o.status}
            for o in Order.objects.filter(buyer=user).select_related("listing")[:15]
        ]
    elif user.role == "admin" or user.is_staff:
        result["note"] = "Admins should use list_equipment/list_produce_listings for platform-wide views."
    return result


def run_tool(user, tool_name: str, tool_input: dict) -> dict:
    """Dispatch a single tool call. Every branch is read-only and scoped to `user`."""
    if tool_name == "get_weather_forecast":
        return _run_get_weather_forecast(user, tool_input.get("crop", ""))
    if tool_name == "list_equipment":
        return _run_list_equipment(tool_input.get("category"))
    if tool_name == "list_produce_listings":
        return _run_list_produce_listings(tool_input.get("crop"))
    if tool_name == "get_my_activity":
        return _run_get_my_activity(user)
    return {"error": f"Unknown tool '{tool_name}'."}
