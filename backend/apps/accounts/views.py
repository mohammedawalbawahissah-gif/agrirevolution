from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import BuyerProfile, DealerProfile, FarmerProfile, User
from .serializers import (
    BuyerProfileSerializer,
    DealerProfileSerializer,
    FarmerProfileSerializer,
    UserSerializer,
)


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
