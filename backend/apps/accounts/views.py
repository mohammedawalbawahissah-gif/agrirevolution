from django.db.models import Count, Sum
from rest_framework import generics, mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.equipment.models import Equipment, EquipmentBooking
from apps.marketplace.models import Order, ProduceListing
from apps.payments.models import Transaction

from .models import BuyerProfile, DealerProfile, FarmerProfile, User
from .permissions import IsAdminRole, IsOwnerOrAdmin
from .serializers import (
    AdminUserSerializer,
    BuyerProfileSerializer,
    DealerProfileSerializer,
    FarmerProfileSerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    """Public sign-up endpoint. Anyone can create an account with a role (farmer/dealer/buyer)."""

    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class MeView(APIView):
    """Returns/updates the authenticated user's own profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class UserViewSet(viewsets.ModelViewSet):
    """Full user management — admin only. Regular users get their own data via /me/."""

    queryset = User.objects.all().order_by("-created_at")
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminRole]
    filterset_fields = ["role", "district", "community", "is_verified"]


class BaseProfileViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    Shared behavior for the three role-profile viewsets.

    There's intentionally no create action here: a profile is always
    provisioned lazily (get_or_create) the first time its owner hits /me/,
    the same way the notifications app treats a user's inbox as always-
    present rather than something to be POSTed into existence. That also
    sidesteps having a writable `user` field on these serializers, which
    would let one user attach a profile to another user's account.

    Listing/retrieving is scoped to the requester's own profile — admins
    are the only ones who can browse everyone's — and only the owning user
    or an admin can update/delete a profile (mirrors IsOwnerOrAdmin usage
    elsewhere, e.g. listings/bookings).
    """

    owner_field = "user"
    profile_model = None

    def get_permissions(self):
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOwnerOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.role == "admin" or user.is_staff:
            return qs
        return qs.filter(user=user)

    @action(detail=False, methods=["get", "patch"])
    def me(self, request):
        """Get or update the authenticated user's own role profile, creating it on first use."""
        profile, _ = self.profile_model.objects.get_or_create(user=request.user)
        if request.method == "GET":
            return Response(self.get_serializer(profile).data)
        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class FarmerProfileViewSet(BaseProfileViewSet):
    queryset = FarmerProfile.objects.select_related("user").all()
    serializer_class = FarmerProfileSerializer
    profile_model = FarmerProfile


class DealerProfileViewSet(BaseProfileViewSet):
    queryset = DealerProfile.objects.select_related("user").all()
    serializer_class = DealerProfileSerializer
    profile_model = DealerProfile


class BuyerProfileViewSet(BaseProfileViewSet):
    queryset = BuyerProfile.objects.select_related("user").all()
    serializer_class = BuyerProfileSerializer
    profile_model = BuyerProfile


class AdminStatsView(APIView):
    """
    Aggregated platform stats for the admin dashboard overview — counts by
    role/status plus small breakdowns, so the frontend doesn't have to fetch
    full paginated lists just to compute counts.
    """

    permission_classes = [IsAdminRole]

    def get(self, request):
        users_by_role = dict(
            User.objects.values_list("role").annotate(count=Count("id")).order_by()
        )
        bookings_by_status = dict(
            EquipmentBooking.objects.values_list("status").annotate(count=Count("id")).order_by()
        )
        listings_by_status = dict(
            ProduceListing.objects.values_list("status").annotate(count=Count("id")).order_by()
        )
        orders_by_status = dict(
            Order.objects.values_list("status").annotate(count=Count("id")).order_by()
        )
        listings_by_grade = dict(
            ProduceListing.objects.values_list("ai_grade").annotate(count=Count("id")).order_by()
        )
        transaction_totals = Transaction.objects.filter(status="success").aggregate(
            total_amount=Sum("amount_ghs")
        )

        return Response(
            {
                "users": {
                    "farmer": users_by_role.get("farmer", 0),
                    "dealer": users_by_role.get("dealer", 0),
                    "buyer": users_by_role.get("buyer", 0),
                    "admin": users_by_role.get("admin", 0),
                    "total": sum(users_by_role.values()),
                },
                "equipment": {
                    "total": Equipment.objects.count(),
                    "available": Equipment.objects.filter(is_available=True).count(),
                },
                "bookings": {
                    "total": EquipmentBooking.objects.count(),
                    "by_status": bookings_by_status,
                },
                "listings": {
                    "total": ProduceListing.objects.count(),
                    "by_status": listings_by_status,
                    "by_grade": listings_by_grade,
                },
                "orders": {
                    "total": Order.objects.count(),
                    "by_status": orders_by_status,
                },
                "transactions": {
                    "total": Transaction.objects.count(),
                    "total_amount_ghs": str(transaction_totals["total_amount"] or "0.00"),
                },
            }
        )
