from django.db import models

from apps.accounts.models import User


class DiseaseReport(models.Model):
    """
    A farmer's crop-health photo submission and its AI diagnosis. Separate
    from ProduceListing (which is about a harvest ready to sell) — this is
    about a standing/growing crop's health, submitted any time a farmer
    notices something wrong with their plants.
    """

    class Severity(models.TextChoices):
        HEALTHY = "healthy", "Healthy — No Disease Detected"
        MILD = "mild", "Mild"
        MODERATE = "moderate", "Moderate"
        SEVERE = "severe", "Severe"
        UNKNOWN = "unknown", "Could Not Determine"

    class Source(models.TextChoices):
        AI = "ai", "AI Diagnosis"
        MANUAL = "manual", "Manual (Admin/Extension Officer)"

    farmer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="disease_reports")
    crop = models.CharField(max_length=120)
    photo_url = models.URLField()
    diagnosis = models.CharField(max_length=200, blank=True, help_text="e.g. 'Maize Streak Virus', 'Healthy'")
    severity = models.CharField(max_length=10, choices=Severity.choices, default=Severity.UNKNOWN)
    symptoms_observed = models.TextField(blank=True)
    recommended_action = models.TextField(blank=True)
    source = models.CharField(max_length=10, choices=Source.choices, default=Source.AI)
    # Denormalized so admin can filter/sort severe cases without a computed
    # query on every list request — set once at creation/diagnosis time.
    needs_admin_attention = models.BooleanField(default=False)
    admin_notes = models.TextField(blank=True, help_text="Internal notes an admin/extension officer adds after review.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.crop} - {self.get_severity_display()} ({self.farmer})"
