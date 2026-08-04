from rest_framework.routers import DefaultRouter

from .views import BuyerProfileViewSet, DealerProfileViewSet, FarmerProfileViewSet, UserViewSet

router = DefaultRouter()
router.register("users", UserViewSet)
router.register("farmer-profiles", FarmerProfileViewSet)
router.register("dealer-profiles", DealerProfileViewSet)
router.register("buyer-profiles", BuyerProfileViewSet)

urlpatterns = router.urls
