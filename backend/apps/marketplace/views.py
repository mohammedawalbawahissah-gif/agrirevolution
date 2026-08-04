from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Order, ProduceListing
from .serializers import OrderSerializer, ProduceListingSerializer


class ProduceListingViewSet(viewsets.ModelViewSet):
    queryset = ProduceListing.objects.select_related("farmer").all()
    serializer_class = ProduceListingSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["crop", "ai_grade", "status", "farmer", "listed_via"]


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related("listing", "buyer").all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "buyer", "listing"]
