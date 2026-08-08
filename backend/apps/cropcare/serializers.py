from rest_framework import serializers

from .models import DiseaseReport


class DiseaseReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = DiseaseReport
        fields = [
            "id", "farmer", "crop", "photo_url", "diagnosis", "severity",
            "symptoms_observed", "recommended_action", "source",
            "needs_admin_attention", "created_at",
        ]
        # farmer is set server-side from the authenticated user (see perform_create).
        # Everything past crop/photo_url comes from the AI diagnosis pipeline,
        # not the farmer directly — a farmer submits a photo, not a self-diagnosis.
        read_only_fields = [
            "farmer", "diagnosis", "severity", "symptoms_observed",
            "recommended_action", "source", "needs_admin_attention", "created_at",
        ]


class AdminDiseaseReportSerializer(serializers.ModelSerializer):
    """
    Used only for admin requests — leaves `farmer` writable (an extension
    officer logging a farm visit on a farmer's behalf) and `admin_notes`
    writable (follow-up notes after review). Diagnosis fields stay
    server-controlled here too, same as the farmer-facing serializer —
    admins re-run diagnosis via the same /diagnose/ action, they don't
    hand-edit the AI's output.
    """

    farmer_name = serializers.SerializerMethodField()

    class Meta:
        model = DiseaseReport
        fields = [
            "id", "farmer", "farmer_name", "crop", "photo_url", "diagnosis", "severity",
            "symptoms_observed", "recommended_action", "source",
            "needs_admin_attention", "admin_notes", "created_at",
        ]
        read_only_fields = [
            "diagnosis", "severity", "symptoms_observed",
            "recommended_action", "source", "needs_admin_attention", "created_at",
        ]

    def get_farmer_name(self, obj):
        return obj.farmer.get_full_name() or obj.farmer.username
