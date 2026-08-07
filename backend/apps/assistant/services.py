"""
Chat orchestration for the AI Assistant widget.

Stateless by design: the frontend keeps the conversation history and resends
it each turn (same reasoning as any stateless chat integration — no server-
side session to expire or leak across users). This backend's only job per
turn is: build a system prompt personalized to the caller, run Claude's
tool-use loop against the read-only tools in tools.py, and return the final
reply.

The system prompt and the tool set (see tools.py) are the two enforcement
points for the one hard restriction on this assistant: it must never surface
another user's personal information, and it must never discuss transaction/
payment details. No tool here touches the User or Transaction models at all,
so that restriction holds even if the model ignores the system prompt.
"""

import logging

from anthropic import Anthropic
from django.conf import settings

from .tools import TOOL_DEFINITIONS, run_tool

logger = logging.getLogger(__name__)

MODEL = "claude-sonnet-4-5"
MAX_TOOL_ROUNDS = 4

ROLE_CONTEXT = {
    "farmer": "a smallholder farmer using AgriRevolution to get equipment, sell produce, and get weather guidance",
    "dealer": "an equipment dealer using AgriRevolution to list and rent out farm equipment",
    "buyer": "a produce buyer using AgriRevolution to source crops from farmers",
    "admin": "a platform administrator for AgriRevolution",
}


class AssistantServiceError(Exception):
    """Raised when the assistant can't complete a turn — callers should surface this to the user."""


def _system_prompt(user) -> str:
    role_context = ROLE_CONTEXT.get(user.role, "a user of AgriRevolution")
    return f"""You are the AI Assistant inside AgriRevolution, a platform connecting Ghanaian smallholder farmers, equipment dealers, and produce buyers around Tamale, Northern Ghana.

You're talking to {user.first_name or user.username}, {role_context}.

You can help with anything relevant to their work on the platform and general farming/agribusiness knowledge — weather-driven planting/harvest timing, equipment options, marketplace prices, how to use the app, general agronomy, market strategy, and so on. Use the tools available to you to look up real, current platform data rather than guessing whenever a question would benefit from it.

Two hard limits, no exceptions: never disclose another user's personal information (name, phone number, location, or any other identifying detail about anyone other than {user.first_name or user.username} themselves), and never discuss transaction or payment details (amounts paid, payment method, provider references) even for the current user's own history — direct them to their Transactions/Orders/Bookings page in the app for that instead.

Keep replies concise and practical — this is a chat widget, not a report. Plain language, no unnecessary jargon; many users have limited formal education."""


def _extract_text(message) -> str:
    return "".join(block.text for block in message.content if block.type == "text").strip()


def send_chat_message(user, message: str, history: list[dict]) -> dict:
    """
    Run one turn of the assistant conversation.

    `history` is a list of {"role": "user"|"assistant", "content": str} from
    prior turns in this conversation (frontend-managed, sent fresh each call).
    Returns {"reply": str}.
    """
    if not settings.ANTHROPIC_API_KEY:
        raise AssistantServiceError("The AI Assistant isn't configured on the server yet.")

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    messages = [{"role": h["role"], "content": h["content"]} for h in history]
    messages.append({"role": "user", "content": message})

    try:
        for _ in range(MAX_TOOL_ROUNDS):
            response = client.messages.create(
                model=MODEL,
                max_tokens=1024,
                system=_system_prompt(user),
                tools=TOOL_DEFINITIONS,
                messages=messages,
            )

            if response.stop_reason != "tool_use":
                return {"reply": _extract_text(response) or "I'm not sure how to respond to that — could you rephrase?"}

            # Model wants to call one or more tools before replying — run them
            # and feed the results back in, then let it continue.
            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue
                result = run_tool(user, block.name, block.input or {})
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": block.id, "content": str(result)}
                )
            messages.append({"role": "user", "content": tool_results})

        return {"reply": "I looked into that but couldn't put together a complete answer — could you try asking again, maybe more specifically?"}
    except AssistantServiceError:
        raise
    except Exception as exc:  # noqa: BLE001 - surfaced to the caller as a clean error
        logger.error("Assistant chat failed for user=%s: %s", user.id, exc)
        raise AssistantServiceError("The assistant couldn't respond right now. Please try again in a moment.") from exc
