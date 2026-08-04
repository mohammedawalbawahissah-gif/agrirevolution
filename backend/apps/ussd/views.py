from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .menu import handle_ussd_request
from .models import USSDSession, VoiceCallLog


@api_view(["POST"])
@permission_classes([AllowAny])  # Africa's Talking calls this webhook directly, not via JWT
def ussd_webhook(request):
    """
    Africa's Talking USSD callback. Expects sessionId, phoneNumber, text
    per their spec: https://developers.africastalking.com/docs/ussd/overview
    """
    session_id = request.data.get("sessionId", "")
    phone_number = request.data.get("phoneNumber", "")
    text = request.data.get("text", "")
    response_text = handle_ussd_request(session_id, phone_number, text)
    return Response(response_text, content_type="text/plain")


@api_view(["POST"])
@permission_classes([AllowAny])
def voice_webhook(request):
    """Africa's Talking Voice (IVR) callback."""
    raise NotImplementedError("Wire up the Africa's Talking Voice XML response here.")
