from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Equipment, EquipmentBooking
from .serializers import EquipmentBookingSerializer, EquipmentSerializer


class EquipmentViewSet(viewsets.ModelViewSet):
    queryset = Equipment.objects.select_related("dealer").all()
    serializer_class = EquipmentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["category", "is_available", "dealer"]


class EquipmentBookingViewSet(viewsets.ModelViewSet):
    queryset = EquipmentBooking.objects.select_related("farmer", "equipment").all()
    serializer_class = EquipmentBookingSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["status", "farmer", "equipment", "requested_via"]
