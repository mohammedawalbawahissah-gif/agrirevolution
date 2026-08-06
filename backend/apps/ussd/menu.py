"""
USSD menu state machine.

Mirrors the app's core flows for low-literacy/no-smartphone access:
  1. Check weather guidance for my crop
  2. Request equipment
  3. List produce for sale
  4. Check my account

Africa's Talking passes the full accumulated `text` string (each screen's
input appended with '*'), so this function re-derives current menu state
from that string on every request rather than trusting client-side state —
this makes it robust to timeouts/retries, since there's no server-side
session state that could desync from what the user actually sees.

Known limitation: USSD access currently requires the farmer to already be
registered (phone number known to the system) — a full USSD-based signup
flow (collecting name/role/community via DTMF) is a larger scope addition
for a later pass. Unregistered numbers are guided to register via the app.
"""

from datetime import datetime
from decimal import Decimal, InvalidOperation

from apps.accounts.models import User
from apps.equipment.models import Equipment, EquipmentBooking
from apps.marketplace.models import ProduceListing
from apps.weather.services import WeatherServiceError, generate_planting_recommendation

MAIN_MENU = (
    "CON Welcome to AgriRevolution\n"
    "1. Weather guidance\n"
    "2. Request equipment\n"
    "3. Sell produce\n"
    "4. My account"
)

NOT_REGISTERED_MESSAGE = (
    "END This number isn't registered with AgriRevolution yet. "
    "Please sign up in the app first, then dial this code again."
)


def _normalize_phone(phone_number: str) -> list[str]:
    """
    Africa's Talking sends numbers like '+233241234567'. Farmers may have
    registered with a local format like '0241234567'. Build a small set of
    plausible variants to match against, rather than requiring one exact format.
    """
    digits = phone_number.lstrip("+")
    variants = {phone_number, digits}
    if digits.startswith("233"):
        variants.add("0" + digits[3:])
    elif digits.startswith("0"):
        variants.add("233" + digits[1:])
        variants.add("+233" + digits[1:])
    return list(variants)


def _find_user(phone_number: str) -> User | None:
    return User.objects.filter(phone_number__in=_normalize_phone(phone_number)).first()


def _truncate(text: str, limit: int = 300) -> str:
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


def _weather_menu(user: User, selections: list[str]) -> str:
    if len(selections) < 2:
        return "CON Which crop do you need guidance on?\n(e.g. Maize)"

    crop = selections[1].strip()
    if not crop:
        return "CON Please enter a crop name.\n(e.g. Maize)"

    try:
        rec = generate_planting_recommendation(user, crop)
    except WeatherServiceError:
        return "END Sorry, weather guidance isn't available right now. Please try again later."

    action_labels = {
        "plant": "PLANT",
        "harvest": "HARVEST",
        "request_equipment": "REQUEST EQUIPMENT",
        "hold": "HOLD / WAIT",
    }
    label = action_labels.get(rec.recommended_action, rec.recommended_action.upper())
    return _truncate(
        f"END {crop}: {label}\n"
        f"Window: {rec.recommended_window_start} to {rec.recommended_window_end}\n"
        f"{rec.ai_rationale}"
    )


def _equipment_menu(user: User, selections: list[str]) -> str:
    available = list(Equipment.objects.filter(is_available=True).order_by("id")[:9])

    if len(selections) < 2:
        if not available:
            return "END No equipment is available right now. Please check back later."
        lines = ["CON Choose equipment:"]
        for i, eq in enumerate(available, start=1):
            lines.append(f"{i}. {eq.name} (GHS {eq.rate_per_acre_ghs}/acre)")
        return "\n".join(lines)

    try:
        choice_index = int(selections[1]) - 1
        equipment = available[choice_index]
    except (ValueError, IndexError):
        return "END Invalid equipment selection. Please dial the code again."

    if len(selections) < 3:
        return f"CON {equipment.name}\nEnter acreage needed (e.g. 2.5):"

    try:
        acreage = Decimal(selections[2])
        if acreage <= 0:
            raise ValueError
    except (ValueError, InvalidOperation):
        return "END Invalid acreage entered. Please dial the code again."

    if len(selections) < 4:
        return "CON Enter the date you need it (DD-MM-YYYY):"

    try:
        requested_date = datetime.strptime(selections[3].strip(), "%d-%m-%Y").date()
    except ValueError:
        return "END Invalid date format. Use DD-MM-YYYY. Please dial the code again."

    booking = EquipmentBooking.objects.create(
        farmer=user,
        equipment=equipment,
        requested_date=requested_date,
        acreage=acreage,
        total_cost_ghs=equipment.rate_per_acre_ghs * acreage,
        requested_via="ussd",
    )
    return _truncate(
        f"END Request submitted for {equipment.name}, {acreage} acres on {requested_date}. "
        f"Estimated cost: GHS {booking.total_cost_ghs}. You'll be notified once the dealer confirms."
    )


def _marketplace_menu(user: User, selections: list[str]) -> str:
    if len(selections) < 2:
        return "CON What crop are you selling?\n(e.g. Maize)"

    crop = selections[1].strip()
    if not crop:
        return "CON Please enter a crop name."

    if len(selections) < 3:
        return f"CON {crop} — enter quantity in kg (e.g. 500):"

    try:
        quantity = float(selections[2])
        if quantity <= 0:
            raise ValueError
    except ValueError:
        return "END Invalid quantity entered. Please dial the code again."

    ProduceListing.objects.create(
        farmer=user,
        crop=crop,
        quantity_kg=quantity,
        listed_via="ussd",
    )
    return _truncate(
        f"END Listed {quantity}kg of {crop} for sale. Buyers can now see it. "
        f"For AI-graded fair pricing, add a photo via the app."
    )


def _account_menu(user: User) -> str:
    booking_count = EquipmentBooking.objects.filter(farmer=user).count()
    listing_count = ProduceListing.objects.filter(farmer=user).count()
    return _truncate(
        f"END Account: {user.first_name or user.username} ({user.role})\n"
        f"Community: {user.community or user.district}\n"
        f"Equipment requests: {booking_count}\n"
        f"Produce listings: {listing_count}"
    )


def handle_ussd_request(session_id: str, phone_number: str, text: str) -> str:
    """Return the next USSD screen (CON = continue menu, END = terminate)."""
    if text == "":
        return MAIN_MENU

    user = _find_user(phone_number)
    if user is None:
        return NOT_REGISTERED_MESSAGE

    selections = text.split("*")
    top_level = selections[0]

    if top_level == "1":
        return _weather_menu(user, selections)
    if top_level == "2":
        return _equipment_menu(user, selections)
    if top_level == "3":
        return _marketplace_menu(user, selections)
    if top_level == "4":
        return _account_menu(user)

    return "END Invalid option. Please dial the code again."
