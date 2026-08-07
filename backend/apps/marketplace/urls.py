from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ListingMediaUploadView, OrderViewSet, ProduceListingViewSet

router = DefaultRouter()
router.register("listings", ProduceListingViewSet)
router.register("orders", OrderViewSet)

urlpatterns = [
    path("upload-media/", ListingMediaUploadView.as_view(), name="listing-media-upload"),
] + router.urls
