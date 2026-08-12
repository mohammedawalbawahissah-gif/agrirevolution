from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminRole, IsFarmerRole, IsInputDealerRole, IsOwnerOrAdmin
from apps.marketplace.media import MediaUploadError, upload_media
from apps.notifications.models import Notification
from apps.notifications.services import notify

from .models import InputOrder, InputProduct
from .serializers import (
    AdminInputOrderSerializer,
    AdminInputProductSerializer,
    InputOrderSerializer,
    InputOrderStatusSerializer,
    InputProductSerializer,
)


class InputProductViewSet(viewsets.ModelViewSet):
    """
    Anyone authenticated can browse products. Input dealers manage their own
    (create/update/delete); admins can manage any. Mirrors EquipmentViewSet.
    """

    queryset = InputProduct.objects.select_related("dealer").all()
    owner_field = "dealer"
    filterset_fields = ["category", "is_active", "dealer"]

    def get_queryset(self):
        qs = InputProduct.objects.select_related("dealer")
        active_only = self.request.query_params.get("active_only")
        if active_only == "true":
            qs = qs.filter(is_active=True)
        return qs

    def get_serializer_class(self):
        user = self.request.user
        if user.is_authenticated and (user.role == "admin" or user.is_staff):
            return AdminInputProductSerializer
        return InputProductSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), (IsInputDealerRole | IsAdminRole)()]
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOwnerOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == "admin" or user.is_staff:
            serializer.save()  # dealer is writable on AdminInputProductSerializer
        else:
            serializer.save(dealer=user)


class InputOrderViewSet(viewsets.ModelViewSet):
    """
    Farmers order inputs from a dealer's product listing. Scoped the same
    way as EquipmentBookingViewSet: farmers see their own orders, input
    dealers see orders against their own products, admins see everything.
    """

    queryset = InputOrder.objects.select_related("farmer", "product", "product__dealer")
    owner_field = "farmer"
    filterset_fields = ["status", "farmer", "product"]

    def get_queryset(self):
        user = self.request.user
        qs = InputOrder.objects.select_related("farmer", "product", "product__dealer")
        if user.role == "admin" or user.is_staff:
            return qs
        if user.role == "input_dealer":
            return qs.filter(product__dealer=user)
        return qs.filter(farmer=user)

    def get_serializer_class(self):
        user = self.request.user
        if user.is_authenticated and (user.role == "admin" or user.is_staff):
            return AdminInputOrderSerializer
        if user.is_authenticated and user.role == "input_dealer":
            return InputOrderStatusSerializer
        return InputOrderSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), IsFarmerRole()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        order = serializer.save(farmer=self.request.user)
        notify(
            order.product.dealer,
            Notification.Channel.SMS,
            Notification.Category.INPUT_ORDER_UPDATE,
            f"New order: {order.farmer.get_full_name() or order.farmer.username} wants "
            f"{order.quantity}x {order.product.name}.",
            action_url="/input-dealer/orders",
        )

    def perform_update(self, serializer):
        old_status = self.get_object().status
        order = serializer.save()
        if order.status != old_status:
            notify(
                order.farmer,
                Notification.Channel.SMS,
                Notification.Category.INPUT_ORDER_UPDATE,
                f"Your order for {order.product.name} is now {order.get_status_display()}.",
                action_url="/farmer/inputs",
            )


class InputMediaUploadView(APIView):
    """
    POST multipart/form-data {"file": <photo>} -> {"url": "...", "media_type": "image"}
    Input dealers and admins only.
    """

    permission_classes = [IsAuthenticated, (IsInputDealerRole | IsAdminRole)]
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "file is required."}, status=400)
        try:
            result = upload_media(file, folder="agrirevolution/inputs", allow_video=False)
        except MediaUploadError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(result)
