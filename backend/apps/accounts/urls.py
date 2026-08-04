from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import BuyerProfileViewSet, DealerProfileViewSet, FarmerProfileViewSet, MeView, RegisterView, UserViewSet

router = DefaultRouter()
router.register("users", UserViewSet)
router.register("farmer-profiles", FarmerProfileViewSet)
router.register("dealer-profiles", DealerProfileViewSet)
router.register("buyer-profiles", BuyerProfileViewSet)

urlpatterns = [
    path("token/", TokenObtainPairView.as_view(), name="token-obtain-pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
] + router.urls
