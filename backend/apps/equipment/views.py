from rest_framework import viewsets
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminRole, IsDealerRole, IsOwnerOrAdmin
from apps.marketplace.media import MediaUploadError, upload_media
from apps.notifications.models import Notification
from apps.notifications.services import notify

from .models import Equipment, EquipmentBooking
from .serializers import (
    AdminEquipmentBookingSerializer,
    AdminEquipmentSerializer,
    EquipmentBookingSerializer,
    EquipmentBookingStatusSerializer,
    EquipmentSerializer,
)


class EquipmentViewSet(viewsets.ModelViewSet):
    """
    Anyone authenticated can browse equipment. Dealers can list their own
    equipment; admins can also list equipment on behalf of a dealer who
    can't do it themselves (e.g. no smartphone), via AdminEquipmentSerializer
    which leaves `dealer` writable instead of always defaulting to the
    requesting user. Only the owning dealer (or an admin) can edit/delete it.
    """

    queryset = Equipment.objects.select_related("dealer").all()
    serializer_class = EquipmentSerializer
    filterset_fields = ["category", "is_available", "dealer"]
    owner_field = "dealer"

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), (IsDealerRole | IsAdminRole)()]
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOwnerOrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        user = self.request.user
        if user.is_authenticated and (user.role == "admin" or user.is_staff):
            return AdminEquipmentSerializer
        return EquipmentSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == "admin" or user.is_staff:
            # AdminEquipmentSerializer requires `dealer` in the payload — the
            # admin picks who this listing is on behalf of.
            serializer.save()
        else:
            serializer.save(dealer=user)


class EquipmentBookingViewSet(viewsets.ModelViewSet):
    """
    Farmers see and create their own bookings. Dealers see bookings made
    against their own equipment (and can update status). Admins see and can
    create everything — including a booking on behalf of a farmer who can't
    do it themselves, via AdminEquipmentBookingSerializer (farmer/equipment/
    delivery/payment all writable, unlike the dealer-facing status-only one).
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
        if user.is_authenticated and (user.role == "admin" or user.is_staff):
            return AdminEquipmentBookingSerializer
        if user.is_authenticated and user.role == "dealer":
            return EquipmentBookingStatusSerializer
        return EquipmentBookingSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == "admin" or user.is_staff:
            # AdminEquipmentBookingSerializer requires `farmer` in the
            # payload — the admin picks who this booking is on behalf of.
            booking = serializer.save()
        else:
            booking = serializer.save(farmer=user)
        notify(
            booking.equipment.dealer,
            Notification.Channel.SMS,
            Notification.Category.BOOKING_UPDATE,
            f"New booking request: {booking.farmer.get_full_name() or booking.farmer.username} "
            f"wants {booking.equipment.name} for {booking.acreage} acres on {booking.requested_date}.",
            action_url="/dealer/bookings",
        )

    def perform_update(self, serializer):
        old_status = self.get_object().status
        booking = serializer.save()
        if booking.status != old_status:
            notify(
                booking.farmer,
                Notification.Channel.SMS,
                Notification.Category.BOOKING_UPDATE,
                f"Your booking for {booking.equipment.name} is now {booking.get_status_display()}.",
                action_url="/farmer/equipment",
            )


class EquipmentMediaUploadView(APIView):
    """
    POST multipart/form-data {"file": <photo>} -> {"url": "...", "media_type": "image"}

    Dealers and admins upload here first, then use the returned url as
    photo_url when creating or editing equipment. Images only — unlike
    produce listings, there's no AI grading step here that would need a
    photo/video distinction, so video is simply rejected up front.
    """

    permission_classes = [IsAuthenticated, (IsDealerRole | IsAdminRole)]
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "file is required."}, status=400)
        try:
            result = upload_media(file, folder="agrirevolution/equipment", allow_video=False)
        except MediaUploadError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(result)
