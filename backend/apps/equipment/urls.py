from rest_framework.routers import DefaultRouter

from .views import EquipmentBookingViewSet, EquipmentViewSet

router = DefaultRouter()
router.register("equipment", EquipmentViewSet)
router.register("bookings", EquipmentBookingViewSet)

urlpatterns = router.urls
