"""
Media upload for produce listings — replaces the old "paste a photo URL"
flow with an actual upload, so farmers with a smartphone camera can attach
a photo or short video directly.

Uses Cloudinary because Render's filesystem is ephemeral (nothing saved to
local disk survives a redeploy), so uploads need to land somewhere that
persists and is publicly reachable — the same requirement the AI grading
pipeline already has, since Anthropic fetches the image URL directly.
"""

import logging

import cloudinary
import cloudinary.uploader
from django.conf import settings

logger = logging.getLogger(__name__)

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25MB — generous for a phone photo/short clip
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime", "video/webm"}

_configured = False


class MediaUploadError(Exception):
    """Raised when an upload can't be completed — callers should surface this to the user."""


def _ensure_configured():
    global _configured
    if _configured:
        return
    if not (settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY and settings.CLOUDINARY_API_SECRET):
        raise MediaUploadError("Media upload isn't configured on the server yet.")
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    _configured = True


def upload_listing_media(file) -> dict:
    """
    file: a Django UploadedFile (request.FILES["file"]).
    Returns {"url": "...", "media_type": "image"|"video"}.
    """
    _ensure_configured()

    content_type = getattr(file, "content_type", "") or ""
    if content_type in ALLOWED_IMAGE_TYPES:
        media_type = "image"
    elif content_type in ALLOWED_VIDEO_TYPES:
        media_type = "video"
    else:
        raise MediaUploadError(
            f"Unsupported file type '{content_type}'. Upload a JPEG/PNG/WEBP photo or an MP4/MOV/WEBM video."
        )

    if file.size > MAX_UPLOAD_BYTES:
        raise MediaUploadError("File is too large — please keep it under 25MB.")

    try:
        result = cloudinary.uploader.upload(
            file,
            resource_type="video" if media_type == "video" else "image",
            folder="agrirevolution/listings",
        )
    except Exception as exc:  # noqa: BLE001 - surfaced to the caller as a clean error
        logger.error("Cloudinary upload failed: %s", exc)
        raise MediaUploadError(f"Upload failed: {exc}") from exc

    return {"url": result["secure_url"], "media_type": media_type}
