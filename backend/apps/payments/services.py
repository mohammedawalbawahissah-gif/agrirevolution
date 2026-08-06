"""
MoMo / Hubtel payment integration.

Follows the pattern from FarmAsyst North: Hubtel's direct "Receive Money"
API for MoMo charges (MTN/Vodafone/AirtelTigo), keyed by HUBTEL_CLIENT_ID /
HUBTEL_CLIENT_SECRET / HUBTEL_MERCHANT_ACCOUNT (Basic Auth + merchant/POS
Sales ID, the standard shape of Hubtel's merchant APIs).

IMPORTANT — verify before going live: the exact endpoint URL and field names
below (HUBTEL_RECEIVE_MONEY_URL, the request body shape) reflect Hubtel's
documented direct-debit pattern, but this backend has no network access to
hubtel.com to confirm the *current* exact spec against their live docs. This
is isolated to _build_charge_payload() and initiate_momo_charge() specifically
so confirming/adjusting against Hubtel's dashboard docs is a small, contained
change rather than a rewrite. Test against Hubtel's sandbox before production use.
"""

import base64
import logging
import uuid

import requests
from django.conf import settings

from .models import Transaction

logger = logging.getLogger(__name__)

HUBTEL_RECEIVE_MONEY_URL = "https://rmp.hubtel.com/remittance/api/create"

# Hubtel's channel codes for each network — verify against current docs.
CHANNEL_CODES = {
    Transaction.Channel.MTN_MOMO: "mtn-gh",
    Transaction.Channel.VODAFONE_CASH: "vodafone-gh",
    Transaction.Channel.AIRTELTIGO: "tigo-gh",
}


class PaymentServiceError(Exception):
    """Raised when initiating or processing a payment fails in a way callers should handle."""


def _hubtel_auth_header() -> str:
    credentials = f"{settings.HUBTEL_CLIENT_ID}:{settings.HUBTEL_CLIENT_SECRET}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return f"Basic {encoded}"


def _build_charge_payload(transaction: Transaction, callback_url: str) -> dict:
    return {
        "CustomerName": transaction.user.get_full_name() or transaction.user.username,
        "CustomerMsisdn": transaction.user.phone_number,
        "Channel": CHANNEL_CODES.get(transaction.channel, "mtn-gh"),
        "Amount": float(transaction.amount_ghs),
        "PrimaryCallbackUrl": callback_url,
        "Description": f"AgriRevolution — {transaction.get_purpose_display()}",
        "ClientReference": str(uuid.uuid4()),
    }


def initiate_momo_charge(transaction: Transaction, callback_url: str) -> dict:
    """
    Kick off a MoMo charge for an equipment booking or produce order payment.
    Sends a payment prompt to the customer's phone; the actual success/failure
    arrives later via handle_payment_callback() when Hubtel calls back.
    """
    if not (settings.HUBTEL_CLIENT_ID and settings.HUBTEL_CLIENT_SECRET):
        raise PaymentServiceError("Hubtel credentials are not configured.")
    if not transaction.user.phone_number:
        raise PaymentServiceError("User has no phone number on file — cannot charge MoMo.")

    payload = _build_charge_payload(transaction, callback_url)

    try:
        response = requests.post(
            f"{HUBTEL_RECEIVE_MONEY_URL}/{settings.HUBTEL_MERCHANT_ACCOUNT}",
            json=payload,
            headers={"Authorization": _hubtel_auth_header(), "Content-Type": "application/json"},
            timeout=15,
        )
        response.raise_for_status()
        result = response.json()
    except (requests.RequestException, ValueError) as exc:
        logger.error("Hubtel charge initiation failed for transaction=%s: %s", transaction.id, exc)
        raise PaymentServiceError(f"Could not initiate payment: {exc}") from exc

    transaction.provider_reference = result.get("TransactionId", payload["ClientReference"])
    transaction.raw_callback_payload = {"initiation_response": result}
    transaction.save(update_fields=["provider_reference", "raw_callback_payload"])

    return result


def handle_payment_callback(payload: dict) -> Transaction:
    """
    Process Hubtel's webhook callback and update the matching transaction's
    status. Hubtel identifies the transaction by the reference we set during
    initiation (ClientReference / TransactionId, depending on their payload
    shape) — matched here against Transaction.provider_reference.
    """
    reference = payload.get("ClientReference") or payload.get("TransactionId")
    if not reference:
        raise PaymentServiceError("Callback payload missing a transaction reference.")

    try:
        transaction = Transaction.objects.get(provider_reference=reference)
    except Transaction.DoesNotExist as exc:
        raise PaymentServiceError(f"No transaction found for reference {reference}") from exc

    # Hubtel typically reports success via a status/code field — the exact
    # field name should be confirmed against their callback payload spec.
    provider_status = str(payload.get("Status", "")).lower()
    if provider_status in ("success", "paid", "0"):
        transaction.status = Transaction.Status.SUCCESS
    elif provider_status in ("failed", "cancelled", "declined"):
        transaction.status = Transaction.Status.FAILED
    # else: leave as pending, ambiguous/unrecognized status — log for review.

    transaction.raw_callback_payload = {**transaction.raw_callback_payload, "callback": payload}
    transaction.save(update_fields=["status", "raw_callback_payload", "updated_at"])
    return transaction
