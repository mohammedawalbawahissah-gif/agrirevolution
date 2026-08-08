"""
General-purpose conversational assistant, available to every role.

Deliberately stateless and read-only from the platform's point of view: the
backend never hands the model a database connection, tool, or query result,
so there is nothing for it to leak even if asked. The one hard restriction
called out explicitly in the system prompt is a belt-and-braces instruction
on top of that: never disclose, guess at, or discuss any other user's
personal information, and never disclose or discuss transaction/payment
details, even the requesting user's own — that data is sensitive enough
(MoMo numbers, amounts, provider references) that it belongs in the
Transactions screen behind its normal permission checks, not in freeform
chat.

Everything else — farming advice, how the marketplace/equipment/weather
features work, general agronomy, produce grading, pricing intuition — is
fair game.
"""

import logging

from anthropic import Anthropic
from django.conf import settings

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-5"
MAX_HISTORY_MESSAGES = 20  # keep requests small; the widget only needs recent context


class AssistantServiceError(Exception):
    """Raised when the assistant can't produce a reply — callers should degrade gracefully."""


ROLE_CONTEXT = {
    "farmer": (
        "This user is a FARMER. They list produce for sale, book equipment (ploughing, "
        "planting, harvesting, spraying, transport) from dealers, get AI-graded pricing "
        "for their harvest, and can ask for weather-based planting/harvest guidance. "
        "Many farmers have limited formal education and may also use USSD/voice, not just "
        "the app — keep language plain and concrete."
    ),
    "dealer": (
        "This user is an EQUIPMENT DEALER. They list equipment for hire and manage "
        "incoming booking requests from farmers (confirm, track progress, complete)."
    ),
    "buyer": (
        "This user BUYS produce on the platform. They browse listings farmers have posted, "
        "place orders (choosing pickup or delivery, and a payment channel the farmer "
        "accepts), and track order status through to delivery."
    ),
    "admin": (
        "This user is a PLATFORM ADMIN. They oversee users, equipment, listings, bookings, "
        "and orders platform-wide, and can act on behalf of farmers/dealers who can't use "
        "the app themselves. They may ask about how features work or how to help another "
        "user, but you still must not reveal specific personal or transaction details about "
        "any individual account — point them to the relevant admin screen instead."
    ),
}

PLATFORM_OVERVIEW = (
    "You are the in-app AI Assistant for an agri-fintech platform serving smallholder "
    "farmers, equipment dealers, and produce buyers in Northern Ghana. Core features: "
    "a produce marketplace with AI photo-grading and fair price bands, equipment booking "
    "(pickup or delivery, MTN MoMo / Vodafone Cash / AirtelTigo Money / card payment), "
    "AI-driven weather and planting/harvest guidance, and USSD/voice access for users "
    "without smartphones."
)

HARD_RESTRICTIONS = (
    "Hard restrictions, no exceptions: never state, guess, or speculate about any other "
    "user's personal information (name, phone number, location, account details). Never "
    "discuss transaction or payment details — amounts, channels, provider references, "
    "balances — not even the current user's own; if asked, tell them to check the "
    "Transactions/Payments screen instead. If you don't have real platform data in front "
    "of you (you never do), don't invent it — say so plainly rather than fabricating "
    "numbers, statuses, or records."
)


def build_system_prompt(user) -> str:
    first_name = (user.first_name or user.username).strip()
    role_line = ROLE_CONTEXT.get(user.role, "")
    return (
        f"{PLATFORM_OVERVIEW}\n\n"
        f"You're talking with {first_name}. {role_line}\n\n"
        f"{HARD_RESTRICTIONS}\n\n"
        "Be warm, concise, and practical. Default to short answers (a few sentences or a "
        "short list) unless the person clearly wants more depth. This conversation may be "
        "read aloud by text-to-speech, so avoid heavy markdown, tables, or long code blocks."
    )


def get_reply(user, messages: list[dict]) -> str:
    """
    messages: list of {"role": "user"|"assistant", "content": str}, oldest first.
    Returns the assistant's reply text.
    """
    if not settings.ANTHROPIC_API_KEY:
        raise AssistantServiceError("ANTHROPIC_API_KEY is not configured.")

    trimmed = messages[-MAX_HISTORY_MESSAGES:]
    api_messages = [
        {"role": m["role"], "content": m["content"]}
        for m in trimmed
        if m.get("role") in ("user", "assistant") and m.get("content")
    ]
    if not api_messages:
        raise AssistantServiceError("No message content to respond to.")

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    try:
        response = client.messages.create(
            model=MODEL,
            max_tokens=600,
            system=build_system_prompt(user),
            messages=api_messages,
        )
        text_blocks = [block.text for block in response.content if block.type == "text"]
        reply = "\n".join(text_blocks).strip()
        if not reply:
            raise AssistantServiceError("Empty response from assistant.")
        return reply
    except AssistantServiceError:
        raise
    except Exception as exc:  # noqa: BLE001 - degrade gracefully upstream
        logger.error("Assistant chat failed for user=%s: %s", user.id, exc)
        raise AssistantServiceError(f"Assistant call failed: {exc}") from exc
