from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import ChatRequestSerializer
from .services import AssistantServiceError, send_chat_message


class AssistantChatView(APIView):
    """
    One turn of the AI Assistant widget's conversation. Stateless — the
    frontend resends the running history each call (see services.py).
    Available to every authenticated role; scoping to "no user info, no
    transaction data" happens inside the tools/system prompt, not here.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = send_chat_message(
                request.user,
                serializer.validated_data["message"],
                serializer.validated_data.get("history", []),
            )
        except AssistantServiceError as exc:
            return Response({"detail": str(exc)}, status=503)
        return Response(result)
