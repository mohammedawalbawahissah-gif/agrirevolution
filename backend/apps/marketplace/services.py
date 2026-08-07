"""
AI photo-grading pipeline for produce listings.

Given a listing's photo_url, calls the Anthropic API (vision) to assess
produce quality/grade and proposes a fair price band, which protects
farmers from middlemen who understate quality to justify low prices.

The image itself is never downloaded by this backend — it's passed to the
Anthropic API as a URL source, and Anthropic's servers fetch it directly.
This keeps the backend simple and means photo hosting (Cloudinary, S3,
whatever) just needs to produce a publicly-reachable URL.
"""

import json
import logging

from anthropic import Anthropic
from django.conf import settings

from .models import ProduceListing

logger = logging.getLogger(__name__)


class GradingServiceError(Exception):
    """Raised when grading can't be completed — callers should degrade gracefully."""


GRADING_PROMPT = """You are an agricultural produce quality inspector in Ghana, helping a smallholder farmer get a fair price for their harvest.

Crop: {crop}
Quantity: {quantity_kg} kg
Look at the attached photo of this produce.

Assess the visible quality (ripeness, blemishes, uniformity, spoilage, pest damage) and assign a grade:
- "A": excellent quality, minimal defects, ready for premium buyers (restaurants, exporters)
- "B": good quality, minor cosmetic defects, suitable for standard retail/wholesale
- "C": lower quality, visible defects or inconsistency, still sellable but at a discount

Then estimate a FAIR price band in Ghanaian Cedis (GHS) for the FULL {quantity_kg} kg quantity at current typical Northern Ghana farm-gate/wholesale prices for {crop} at this grade — a low and high estimate. Be realistic: this protects the farmer from being lowballed by middlemen, so ground it in plausible market prices, not inflated numbers.

Respond with ONLY a JSON object, no other text, in this exact shape:
{{"grade": "A", "notes": "2-3 sentence plain-language explanation of the grade, understandable to a farmer with no formal education", "price_band_low_ghs": 0.0, "price_band_high_ghs": 0.0}}"""


def grade_produce_listing(listing: ProduceListing) -> ProduceListing:
    """Run AI grading against the listing's photo and populate grade + price band."""
    if not listing.photo_url:
        raise GradingServiceError("Listing has no photo — cannot grade without one.")
    if not settings.ANTHROPIC_API_KEY:
        raise GradingServiceError("ANTHROPIC_API_KEY is not configured.")

    prompt = GRADING_PROMPT.format(crop=listing.crop, quantity_kg=listing.quantity_kg)

    client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    try:
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=500,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "source": {"type": "url", "url": listing.photo_url}},
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )
        raw_text = message.content[0].text.strip()
        raw_text = raw_text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        parsed = json.loads(raw_text)
    except Exception as exc:  # noqa: BLE001 - grading failures should degrade gracefully upstream
        logger.error("Produce grading failed for listing=%s: %s", listing.id, exc)
        raise GradingServiceError(f"AI grading failed: {exc}") from exc

    grade = parsed.get("grade")
    valid_grades = {c[0] for c in ProduceListing.Grade.choices if c[0] != ProduceListing.Grade.UNGRADED}
    if grade not in valid_grades:
        grade = ProduceListing.Grade.UNGRADED

    listing.ai_grade = grade
    listing.ai_grading_notes = parsed.get("notes", "").strip() or "No notes provided."
    listing.fair_price_band_low_ghs = parsed.get("price_band_low_ghs")
    listing.fair_price_band_high_ghs = parsed.get("price_band_high_ghs")
    listing.grading_source = ProduceListing.GradingSource.AI
    listing.save(
        update_fields=[
            "ai_grade", "ai_grading_notes", "fair_price_band_low_ghs",
            "fair_price_band_high_ghs", "grading_source",
        ]
    )
    return listing


def apply_manual_grade(listing: ProduceListing, *, grade: str, notes: str, price_low, price_high) -> ProduceListing:
    """Let the farmer (or an admin, on their behalf) grade the listing themselves —
    for when there's no photo, AI grading failed, or they simply know their produce
    better than a photo can show."""
    valid_grades = {c[0] for c in ProduceListing.Grade.choices if c[0] != ProduceListing.Grade.UNGRADED}
    if grade not in valid_grades:
        raise GradingServiceError(f"grade must be one of {sorted(valid_grades)}.")

    listing.ai_grade = grade
    listing.ai_grading_notes = notes.strip() or "Graded by the farmer."
    listing.fair_price_band_low_ghs = price_low
    listing.fair_price_band_high_ghs = price_high
    listing.grading_source = ProduceListing.GradingSource.MANUAL
    listing.save(
        update_fields=[
            "ai_grade", "ai_grading_notes", "fair_price_band_low_ghs",
            "fair_price_band_high_ghs", "grading_source",
        ]
    )
    return listing
