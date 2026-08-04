from rest_framework import generics, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import BuyerProfile, DealerProfile, FarmerProfile, User
from .serializers import (
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
    """Returns the authenticated user's own profile — used by clients to drive role-based routing."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["role", "district", "community"]


class FarmerProfileViewSet(viewsets.ModelViewSet):
    queryset = FarmerProfile.objects.select_related("user").all()
    serializer_class = FarmerProfileSerializer
    permission_classes = [IsAuthenticated]


class DealerProfileViewSet(viewsets.ModelViewSet):
    queryset = DealerProfile.objects.select_related("user").all()
    serializer_class = DealerProfileSerializer
    permission_classes = [IsAuthenticated]


class BuyerProfileViewSet(viewsets.ModelViewSet):
    queryset = BuyerProfile.objects.select_related("user").all()
    serializer_class = BuyerProfileSerializer
    permission_classes = [IsAuthenticated]
