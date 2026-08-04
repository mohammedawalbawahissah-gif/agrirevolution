from rest_framework.routers import DefaultRouter

from .views import OrderViewSet, ProduceListingViewSet

router = DefaultRouter()
router.register("listings", ProduceListingViewSet)
router.register("orders", OrderViewSet)

urlpatterns = router.urls
