from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    AdminStatsView,
    BuyerProfileViewSet,
    DealerProfileViewSet,
    FarmerProfileViewSet,
    InputDealerProfileViewSet,
    MeView,
    RegisterView,
    UserViewSet,
)

router = DefaultRouter()
router.register("users", UserViewSet)
router.register("farmer-profiles", FarmerProfileViewSet)
router.register("dealer-profiles", DealerProfileViewSet)
router.register("input-dealer-profiles", InputDealerProfileViewSet)
router.register("buyer-profiles", BuyerProfileViewSet)

urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token-obtain-pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
    path("admin-stats/", AdminStatsView.as_view(), name="admin-stats"),
] + router.urls
