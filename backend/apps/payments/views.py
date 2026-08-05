from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Transaction
from .serializers import TransactionSerializer


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
        """Kick off a MoMo/Hubtel charge for this transaction. Provider call in services.py."""
        transaction = self.get_object()
        return Response({"detail": f"Initiate payment flow for transaction {transaction.pk} here."})
