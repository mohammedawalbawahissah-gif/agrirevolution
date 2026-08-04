"""
USSD menu state machine.

Mirrors the app's core flows for low-literacy/no-smartphone access:
  1. Check weather guidance for my crop
  2. Request equipment
  3. List produce for sale
  4. Check my account / balance

Africa's Talking passes the full accumulated `text` string (each screen's
input appended with '*'), so this function re-derives current menu state
from that string on every request rather than trusting client-side state.
"""

MAIN_MENU = (
    "CON Welcome to AgriRevolution\n"
    "1. Weather guidance\n"
    "2. Request equipment\n"
    "3. Sell produce\n"
    "4. My account"
)


def handle_ussd_request(session_id: str, phone_number: str, text: str) -> str:
    """Return the next USSD screen (CON = continue menu, END = terminate)."""
    if text == "":
        return MAIN_MENU

    selections = text.split("*")
    top_level = selections[0]

    if top_level == "1":
        raise NotImplementedError("Wire up weather guidance USSD flow.")
    if top_level == "2":
        raise NotImplementedError("Wire up equipment request USSD flow.")
    if top_level == "3":
        raise NotImplementedError("Wire up produce listing USSD flow.")
    if top_level == "4":
        raise NotImplementedError("Wire up account info USSD flow.")

    return "END Invalid option. Please try again."
