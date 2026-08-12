from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import InputMediaUploadView, InputOrderViewSet, InputProductViewSet

router = DefaultRouter()
router.register("products", InputProductViewSet)
router.register("orders", InputOrderViewSet)

urlpatterns = [
    path("upload-media/", InputMediaUploadView.as_view(), name="input-media-upload"),
] + router.urls
