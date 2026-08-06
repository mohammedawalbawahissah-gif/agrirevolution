from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsDealerRole, IsOwnerOrAdmin

from .models import Equipment, EquipmentBooking
from .serializers import EquipmentBookingSerializer, EquipmentBookingStatusSerializer, EquipmentSerializer


class EquipmentViewSet(viewsets.ModelViewSet):
    """
    Anyone authenticated can browse equipment. Only dealers can list new
    equipment, and only the owning dealer (or an admin) can edit/delete it.
    """

    queryset = Equipment.objects.select_related("dealer").all()
    serializer_class = EquipmentSerializer
    filterset_fields = ["category", "is_available", "dealer"]
    owner_field = "dealer"

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), IsDealerRole()]
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOwnerOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(dealer=self.request.user)


class EquipmentBookingViewSet(viewsets.ModelViewSet):
    """
    Farmers see and create their own bookings. Dealers see bookings made
    against their own equipment (and can update status). Admins see everything.
    """

    queryset = EquipmentBooking.objects.all()
    serializer_class = EquipmentBookingSerializer
    filterset_fields = ["status", "farmer", "equipment", "requested_via"]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = EquipmentBooking.objects.select_related("farmer", "equipment", "equipment__dealer")
        if user.role == "admin" or user.is_staff:
            return qs
        if user.role == "dealer":
            return qs.filter(equipment__dealer=user)
        # farmers (and any other role) only ever see their own bookings
        return qs.filter(farmer=user)

    def get_serializer_class(self):
        user = self.request.user
        if user.is_authenticated and (user.role in ("dealer", "admin") or user.is_staff):
            return EquipmentBookingStatusSerializer
        return EquipmentBookingSerializer

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user)
