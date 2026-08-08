from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import DiseaseMediaUploadView, DiseaseReportViewSet

router = DefaultRouter()
router.register("reports", DiseaseReportViewSet, basename="disease-report")

urlpatterns = [
    path("upload-media/", DiseaseMediaUploadView.as_view(), name="cropcare-upload-media"),
] + router.urls
