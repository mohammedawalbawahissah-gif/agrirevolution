"""
MoMo / Hubtel payment integration.

Mirrors the pattern from FarmAsyst North: Hubtel Online Checkout for cards,
direct MTN MoMo API for mobile money charges. Credentials read from
settings.HUBTEL_CLIENT_ID / HUBTEL_CLIENT_SECRET / HUBTEL_MERCHANT_ACCOUNT.
"""

from .models import Transaction


def initiate_momo_charge(transaction: Transaction) -> dict:
    """Kick off a MoMo charge for an equipment booking or produce order payment."""
    raise NotImplementedError("Wire up the Hubtel/MTN MoMo API call here.")


def handle_payment_callback(payload: dict) -> Transaction:
    """Process the provider's webhook callback and update the transaction status."""
    raise NotImplementedError("Wire up callback verification + status update here.")
