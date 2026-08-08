from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import AssistantServiceError, get_reply


class AssistantChatView(APIView):
    """
    POST { "messages": [{"role": "user"|"assistant", "content": "..."}, ...] }
    -> { "reply": "..." }

    Stateless: the frontend keeps conversation history and resends it each
    turn (trimmed to the widget's visible window). No user or transaction
    data is ever attached to the request sent to the model — see
    services.py for the full rationale.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        messages = request.data.get("messages")
        if not isinstance(messages, list) or not messages:
            return Response({"detail": "messages is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            reply = get_reply(request.user, messages)
        except AssistantServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({"reply": reply})
