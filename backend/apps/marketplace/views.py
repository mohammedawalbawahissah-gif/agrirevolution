import logging

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import IsBuyerRole, IsFarmerRole, IsOwnerOrAdmin
from apps.notifications.models import Notification
from apps.notifications.services import notify

from .models import Order, ProduceListing
from .serializers import AdminProduceListingSerializer, OrderSerializer, ProduceListingSerializer
from .services import GradingServiceError, grade_produce_listing

logger = logging.getLogger(__name__)


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
        listing = serializer.save(farmer=self.request.user)
        if listing.photo_url:
            try:
                grade_produce_listing(listing)
                notify(
                    listing.farmer,
                    Notification.Channel.SMS,
                    Notification.Category.LISTING_UPDATE,
                    f"Your {listing.crop} listing was graded {listing.ai_grade}. "
                    f"Fair price: GHS {listing.fair_price_band_low_ghs}-{listing.fair_price_band_high_ghs}.",
                )
            except GradingServiceError as exc:
                # Listing still gets created — grading can be retried via the
                # /grade/ action below, or an admin can grade manually.
                logger.warning("Auto-grade on create failed for listing=%s: %s", listing.id, exc)

    @action(detail=True, methods=["post"], url_path="grade")
    def grade(self, request, pk=None):
        """Re-run (or run for the first time) AI grading against this listing's photo."""
        listing = self.get_object()
        user = request.user
        if not (user == listing.farmer or user.role == "admin" or user.is_staff):
            return Response({"detail": "Not permitted to grade this listing."}, status=403)
        try:
            grade_produce_listing(listing)
        except GradingServiceError as exc:
            return Response({"detail": str(exc)}, status=503)
        return Response(ProduceListingSerializer(listing).data)


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
        order = serializer.save(buyer=self.request.user)
        notify(
            order.listing.farmer,
            Notification.Channel.SMS,
            Notification.Category.LISTING_UPDATE,
            f"New order: {order.buyer.get_full_name() or order.buyer.username} wants to buy your "
            f"{order.listing.crop} for GHS {order.agreed_price_ghs}.",
        )

    def perform_update(self, serializer):
        old_status = self.get_object().status
        order = serializer.save()
        if order.status != old_status:
            notify(
                order.buyer,
                Notification.Channel.SMS,
                Notification.Category.LISTING_UPDATE,
                f"Your order for {order.listing.crop} is now {order.get_status_display()}.",
            )
