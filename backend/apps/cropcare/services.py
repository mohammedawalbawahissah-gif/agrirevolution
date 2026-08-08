"""
AI crop-disease diagnosis pipeline — same shape as
apps.marketplace.services.grade_produce_listing: a photo_url is passed to
Claude's vision API as a URL source (Anthropic's servers fetch it directly,
this backend never downloads the image), and the response is parsed as
structured JSON and persisted.
"""

import json
import logging

from anthropic import Anthropic
from django.conf import settings

from .models import DiseaseReport

logger = logging.getLogger(__name__)


class DiagnosisServiceError(Exception):
    """Raised when diagnosis can't be completed — callers should degrade gracefully."""


DIAGNOSIS_PROMPT = """You are a plant pathologist helping a smallholder farmer in Northern Ghana identify crop diseases and pests early, before they spread or destroy the harvest.

Crop: {crop}
Look at the attached photo of this crop (leaves, stems, or whole plant).

Assess visible signs of disease, pest damage, or nutrient deficiency. Consider diseases and pests common to this crop in West Africa (e.g. for maize: Maize Streak Virus, Fall Armyworm, Northern Corn Leaf Blight; for tomatoes: Early Blight, Bacterial Wilt, Tomato Leaf Miner; for cassava: Cassava Mosaic Disease, Cassava Bacterial Blight; for groundnuts: Rosette Disease, Leaf Spot — but do not limit yourself to only these, diagnose whatever the photo actually shows).

If the plant looks healthy, say so plainly — don't invent a problem.

Assign a severity:
- "healthy": no significant disease/pest damage visible
- "mild": early-stage or minor damage, likely still fully treatable with no yield loss
- "moderate": clear infection/infestation, needs prompt action to prevent spread or yield loss
- "severe": advanced damage, urgent action needed, possible major yield loss
- "unknown": photo is too unclear, too far away, or doesn't show enough of the plant to assess

Respond with ONLY a JSON object, no other text, in this exact shape:
{{"diagnosis": "short name of the disease/pest, or 'Healthy' if no issue", "severity": "healthy", "symptoms_observed": "2-3 sentences describing what you see in the photo that led to this diagnosis", "recommended_action": "2-4 sentences of practical, affordable treatment/prevention advice a smallholder farmer in Ghana could actually follow — locally available treatments where possible, plain language, no jargon"}}"""


def diagnose_crop_photo(report: DiseaseReport) -> DiseaseReport:
    """Run AI diagnosis against the report's photo and populate the diagnosis fields."""
    if not report.photo_url:
        raise DiagnosisServiceError("Report has no photo — cannot diagnose without one.")
    if not settings.ANTHROPIC_API_KEY:
        raise DiagnosisServiceError("ANTHROPIC_API_KEY is not configured.")

    prompt = DIAGNOSIS_PROMPT.format(crop=report.crop)

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    try:
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=600,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "url", "url": report.photo_url}},
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )
        raw_text = message.content[0].text.strip()
        raw_text = raw_text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        parsed = json.loads(raw_text)
    except Exception as exc:  # noqa: BLE001 - diagnosis failures should degrade gracefully upstream
        logger.error("Disease diagnosis failed for report=%s: %s", report.id, exc)
        raise DiagnosisServiceError(f"AI diagnosis failed: {exc}") from exc

    severity = parsed.get("severity")
    valid_severities = {c[0] for c in DiseaseReport.Severity.choices}
    if severity not in valid_severities:
        severity = DiseaseReport.Severity.UNKNOWN

    report.diagnosis = parsed.get("diagnosis", "").strip() or "Could not determine"
    report.severity = severity
    report.symptoms_observed = parsed.get("symptoms_observed", "").strip()
    report.recommended_action = parsed.get("recommended_action", "").strip()
    report.source = DiseaseReport.Source.AI
    report.needs_admin_attention = severity in (DiseaseReport.Severity.MODERATE, DiseaseReport.Severity.SEVERE)
    report.save(
        update_fields=[
            "diagnosis", "severity", "symptoms_observed", "recommended_action",
            "source", "needs_admin_attention",
        ]
    )
    return report
