from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Transaction
from .serializers import TransactionSerializer
from .services import PaymentServiceError, handle_payment_callback, initiate_momo_charge


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["purpose", "channel", "status", "user"]

    def get_queryset(self):
        user = self.request.user
        qs = Transaction.objects.select_related("user")
        if user.role == "admin" or user.is_staff:
            return qs
        return qs.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="initiate")
    def initiate(self, request, pk=None):
        """Kick off a MoMo charge for this transaction via Hubtel."""
        transaction = self.get_object()
        if transaction.user != request.user and request.user.role != "admin":
            return Response({"detail": "Not permitted to initiate this payment."}, status=403)
        if transaction.status != Transaction.Status.PENDING:
            return Response({"detail": f"Transaction is already {transaction.status}."}, status=400)

        callback_url = request.build_absolute_uri("/api/payments/webhook/")
        try:
            result = initiate_momo_charge(transaction, callback_url)
        except PaymentServiceError as exc:
            return Response({"detail": str(exc)}, status=503)
        return Response(
            {"detail": "Payment initiated — check your phone to approve.", "provider_response": result}
        )


@api_view(["POST"])
@permission_classes([AllowAny])  # Hubtel calls this webhook directly, not via JWT
def payment_webhook(request):
    """Hubtel's payment status callback."""
    try:
        transaction = handle_payment_callback(request.data)
    except PaymentServiceError as exc:
        return Response({"detail": str(exc)}, status=400)
    return Response({"detail": f"Transaction {transaction.pk} updated to {transaction.status}."})
