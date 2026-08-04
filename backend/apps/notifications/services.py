"""
Dispatch layer for SMS (Africa's Talking), push (Expo), and voice notifications.
Mirrors the pattern used across NeoMatCare / FarmAsyst North.
"""

from .models import Notification


def send_notification(notification: Notification) -> None:
    """Route to the right provider based on notification.channel and mark as sent."""
    raise NotImplementedError("Wire up Africa's Talking SMS / Expo push / voice dispatch here.")
