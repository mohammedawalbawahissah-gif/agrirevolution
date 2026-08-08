import logging

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.permissions import IsAdminRole, IsFarmerRole, IsOwnerOrAdmin
from apps.marketplace.media import MediaUploadError, upload_media
from apps.notifications.models import Notification
from apps.notifications.services import notify

from .models import DiseaseReport
from .serializers import AdminDiseaseReportSerializer, DiseaseReportSerializer
from .services import DiagnosisServiceError, diagnose_crop_photo

logger = logging.getLogger(__name__)


class DiseaseReportViewSet(viewsets.ModelViewSet):
    """
    Farmers see and create only their own reports. Admins see every report
    across every farmer — this is the early-warning view: needs_admin_attention
    filters straight to moderate/severe cases so an outbreak pattern is
    visible before it spreads.
    """

    queryset = DiseaseReport.objects.all()
    serializer_class = DiseaseReportSerializer
    filterset_fields = ["crop", "severity", "farmer", "needs_admin_attention"]
    owner_field = "farmer"

    def get_permissions(self):
        if self.action == "create":
            return [IsAuthenticated(), (IsFarmerRole | IsAdminRole)()]
        if self.action in ("update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsOwnerOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = DiseaseReport.objects.select_related("farmer")
        if user.role == "admin" or user.is_staff:
            return qs
        return qs.filter(farmer=user)

    def get_serializer_class(self):
        user = self.request.user
        if user.is_authenticated and (user.role == "admin" or user.is_staff):
            return AdminDiseaseReportSerializer
        return DiseaseReportSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == "admin" or user.is_staff:
            # AdminDiseaseReportSerializer requires `farmer` in the payload —
            # the admin/extension officer picks who this report is for.
            report = serializer.save()
        else:
            report = serializer.save(farmer=user)

        try:
            diagnose_crop_photo(report)
            if report.needs_admin_attention:
                for admin in User.objects.filter(role="admin"):
                    notify(
                        admin,
                        Notification.Channel.PUSH,
                        Notification.Category.CROP_HEALTH_ALERT,
                        f"{report.get_severity_display()} case: {report.diagnosis} in "
                        f"{report.farmer.get_full_name() or report.farmer.username}'s {report.crop}.",
                        action_url="/admin/crop-health",
                    )
            notify(
                report.farmer,
                Notification.Channel.SMS,
                Notification.Category.CROP_HEALTH_ALERT,
                f"Your {report.crop} photo was assessed: {report.diagnosis} ({report.get_severity_display()}).",
                action_url="/farmer/ai-assistant",
            )
        except DiagnosisServiceError as exc:
            # Report still gets created — diagnosis can be retried via the
            # /diagnose/ action below.
            logger.warning("Auto-diagnosis on create failed for report=%s: %s", report.id, exc)

    @action(detail=True, methods=["post"], url_path="diagnose")
    def diagnose(self, request, pk=None):
        """Re-run (or run for the first time) AI diagnosis against this report's photo."""
        report = self.get_object()
        user = request.user
        if not (user == report.farmer or user.role == "admin" or user.is_staff):
            return Response({"detail": "Not permitted to diagnose this report."}, status=403)
        try:
            diagnose_crop_photo(report)
        except DiagnosisServiceError as exc:
            return Response({"detail": str(exc)}, status=502)
        serializer_class = self.get_serializer_class()
        return Response(serializer_class(report, context={"request": request}).data)


class DiseaseMediaUploadView(APIView):
    """POST multipart/form-data {"file": <photo>} -> {"url": "...", "media_type": "image"}"""

    permission_classes = [IsAuthenticated, (IsFarmerRole | IsAdminRole)]
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "file is required."}, status=400)
        try:
            result = upload_media(file, folder="agrirevolution/disease-reports", allow_video=False)
        except MediaUploadError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(result)
