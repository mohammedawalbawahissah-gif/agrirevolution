from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import EquipmentBookingViewSet, EquipmentMediaUploadView, EquipmentViewSet

router = DefaultRouter()
router.register("equipment", EquipmentViewSet)
router.register("bookings", EquipmentBookingViewSet)

urlpatterns = [
    path("upload-media/", EquipmentMediaUploadView.as_view(), name="equipment-upload-media"),
] + router.urls
