"""
Dispatch layer for SMS (Africa's Talking) and push (Expo) notifications.

SMS: Africa's Talking's standard bulk/single SMS API — API key in header,
username as a body param, matches the pattern already used for FarmAsyst
North's SMS triggers.

Push: Expo's push notification service. Requires the user's device to have
registered an Expo push token (User.expo_push_token) — the mobile app needs
to call PATCH /api/accounts/me/ with that token after requesting notification
permissions; this isn't wired up in the mobile UI yet, so push silently
no-ops for any user without a token rather than failing loudly.

Voice notifications are intentionally not implemented here — SMS and push
cover the two channels actually requested; voice would reuse the Africa's
Talking Voice API already stubbed in apps/ussd/views.py.
"""

import logging

import requests
from django.conf import settings
from django.utils import timezone

from .models import Notification

logger = logging.getLogger(__name__)

AT_SMS_URL = "https://api.africastalking.com/version1/messaging"
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


class NotificationServiceError(Exception):
    """Raised when dispatch fails — callers should generally log and continue, not crash."""


def _send_sms(notification: Notification) -> None:
    if not (settings.AT_USERNAME and settings.AT_API_KEY):
        raise NotificationServiceError("Africa's Talking credentials are not configured.")
    if not notification.user.phone_number:
        raise NotificationServiceError("User has no phone number on file.")

    try:
        response = requests.post(
            AT_SMS_URL,
            data={
                "username": settings.AT_USERNAME,
                "to": notification.user.phone_number,
                "message": notification.message,
                **({"from": settings.AT_SENDER_ID} if settings.AT_SENDER_ID else {}),
            },
            headers={
                "apiKey": settings.AT_API_KEY,
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json",
            },
            timeout=10,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise NotificationServiceError(f"SMS send failed: {exc}") from exc


def _send_push(notification: Notification) -> None:
    token = getattr(notification.user, "expo_push_token", "") or ""
    if not token:
        # Not treated as a hard failure by callers (notify() logs and moves on),
        # but it must NOT be marked as sent — the user simply has no device
        # registered yet, so raise rather than silently returning.
        raise NotificationServiceError(f"No expo_push_token on file for user={notification.user.id}.")

    try:
        response = requests.post(
            EXPO_PUSH_URL,
            json={
                "to": token,
                "title": "AgriRevolution",
                "body": notification.message,
                "data": {"category": notification.category},
            },
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            timeout=10,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise NotificationServiceError(f"Push send failed: {exc}") from exc


def send_notification(notification: Notification) -> None:
    """Route to the right provider based on notification.channel and mark as sent."""
    dispatchers = {
        Notification.Channel.SMS: _send_sms,
        Notification.Channel.PUSH: _send_push,
    }
    dispatcher = dispatchers.get(notification.channel)
    if dispatcher is None:
        raise NotificationServiceError(f"No dispatcher for channel '{notification.channel}'.")

    dispatcher(notification)
    notification.is_sent = True
    notification.sent_at = timezone.now()
    notification.save(update_fields=["is_sent", "sent_at"])


def notify(user, channel: str, category: str, message: str) -> Notification:
    """
    Convenience helper: create a Notification row and attempt to send it
    immediately. Send failures are logged and swallowed here — the
    Notification row still exists as a record of intent, with is_sent=False,
    so nothing about the triggering action (booking created, order placed,
    etc.) is blocked by a downstream SMS/push failure.
    """
    notification = Notification.objects.create(user=user, channel=channel, category=category, message=message)
    try:
        send_notification(notification)
    except NotificationServiceError as exc:
        logger.warning("Notification dispatch failed (id=%s): %s", notification.id, exc)
    return notification
