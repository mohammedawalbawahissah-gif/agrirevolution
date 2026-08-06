from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsBuyerRole, IsFarmerRole, IsOwnerOrAdmin

from .models import Order, ProduceListing
from .serializers import AdminProduceListingSerializer, OrderSerializer, ProduceListingSerializer


class ProduceListingViewSet(viewsets.ModelViewSet):
    """
    Farmers see and manage only their own listings. Buyers/admins/dealers can
    browse all listings (e.g. to shop the marketplace). Only the owning farmer
    or an admin can edit/delete a listing.
    """

    queryset = ProduceListing.objects.all()
    serializer_class = ProduceListingSerializer
    filterset_fields = ["crop", "ai_grade", "status", "farmer", "listed_via"]
    owner_field = "farmer"

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), IsFarmerRole()]
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOwnerOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = ProduceListing.objects.select_related("farmer")
        if user.role == "farmer":
            return qs.filter(farmer=user)
        # buyers, dealers, and admins can browse the full marketplace
        return qs

    def get_serializer_class(self):
        user = self.request.user
        if user.is_authenticated and (user.role == "admin" or user.is_staff):
            return AdminProduceListingSerializer
        return ProduceListingSerializer

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user)


class OrderViewSet(viewsets.ModelViewSet):
    """
    Buyers see and create their own orders. Farmers see orders placed against
    their own listings (and can update status, e.g. accept/deliver). Admins
    see everything.
    """

    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    filterset_fields = ["status", "buyer", "listing"]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Order.objects.select_related("listing", "buyer", "listing__farmer")
        if user.role == "admin" or user.is_staff:
            return qs
        if user.role == "farmer":
            return qs.filter(listing__farmer=user)
        # buyers only ever see their own orders
        return qs.filter(buyer=user)

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), IsBuyerRole()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)
