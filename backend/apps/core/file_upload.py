"""
GreenTalk — File Upload Security Utilities
===========================================
All uploaded images go through these validators before being saved.

SECURITY measures applied:
1. Extension whitelist  — reject non-image extensions
2. MIME type check      — read file magic bytes, not just extension
3. Size limit           — configurable via settings.MAX_UPLOAD_SIZE
4. Randomised filename  — prevent path traversal / enumeration
5. Storage path         — files stored outside web-executable paths
6. ClamAV hook          — placeholder for virus scanning integration

Files are stored under MEDIA_ROOT/{subdir}/{uuid}.{ext}
"""

import os
import uuid
import logging
import io

# imghdr was removed in Python 3.13. We use Pillow for image type detection
# instead — Pillow is already a project dependency (image processing).
from PIL import Image as PilImage

from django.conf import settings
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Allowed types (extension + MIME mapping)
# ---------------------------------------------------------------------------
ALLOWED_EXTENSIONS = getattr(
    settings, "ALLOWED_IMAGE_EXTENSIONS",
    [".jpg", ".jpeg", ".png", ".webp", ".gif"]
)

ALLOWED_MIME_TYPES = getattr(
    settings, "ALLOWED_IMAGE_MIME_TYPES",
    ["image/jpeg", "image/png", "image/webp", "image/gif"]
)

# Map Pillow format strings to MIME types
PILLOW_FORMAT_TO_MIME = {
    "JPEG": "image/jpeg",
    "PNG":  "image/png",
    "GIF":  "image/gif",
    "WEBP": "image/webp",
}


def validate_image_file(file) -> None:
    """
    Validate an uploaded file object (Django InMemoryUploadedFile / TemporaryUploadedFile).

    Raises ValidationError on failure.
    Call from serializer.validate_<field>() or model.clean().

    SECURITY:
    - Extension check: prevents trivially renamed executables
    - MIME/magic-byte check: prevents content-type spoofing
    - Size check: prevents DoS via large uploads
    """
    # 1. Size check
    max_size = getattr(settings, "MAX_UPLOAD_SIZE", 5 * 1024 * 1024)
    if file.size > max_size:
        raise ValidationError(
            f"File size {file.size} bytes exceeds maximum allowed "
            f"{max_size // (1024 * 1024)} MB."
        )

    # 2. Extension check
    _, ext = os.path.splitext(file.name.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f"File extension '{ext}' is not allowed. "
            f"Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # 3. Magic byte / MIME check using Pillow (replaces removed imghdr module).
    # Pillow reads the file header to determine the actual image format,
    # preventing content-type spoofing (e.g., a renamed .exe as .jpg).
    file.seek(0)
    header = file.read(512)
    file.seek(0)  # rewind after reading

    detected_mime = None
    try:
        img = PilImage.open(io.BytesIO(header))
        detected_mime = PILLOW_FORMAT_TO_MIME.get(img.format)
    except Exception:
        detected_mime = None

    if detected_mime not in ALLOWED_MIME_TYPES:
        raise ValidationError(
            f"File content type '{detected_mime}' is not allowed. "
            f"Only images (JPEG, PNG, WebP, GIF) are accepted."
        )

    # 4. ClamAV virus scan hook (placeholder)
    # In production, integrate ClamAV via pyclamd (open source):
    #   import pyclamd
    #   cd = pyclamd.ClamdUnixSocket()
    #   file.seek(0)
    #   result = cd.instream(file)
    #   if result and result.get('stream')[0] == 'FOUND':
    #       raise ValidationError("File failed virus scan.")
    #   file.seek(0)
    logger.debug("ClamAV scan: placeholder — integrate pyclamd for production virus scanning.")


def generate_upload_path(subdir: str, filename: str) -> str:
    """
    Generate a randomised, safe file path for uploaded media.

    SECURITY:
    - UUIDv4 filename prevents enumeration and path traversal
    - Extension preserved (needed for correct MIME serving)
    - subdir organises files by type (avatars/, posts/, listings/)

    Returns a relative path under MEDIA_ROOT, e.g.:
        posts/3f7a1b2c-4d5e-6f78-90ab-cdef12345678.jpg
    """
    _, ext = os.path.splitext(filename.lower())
    # Only allow whitelisted extensions through
    if ext not in ALLOWED_EXTENSIONS:
        ext = ".jpg"  # fallback (should have been caught by validate_image_file)
    safe_name = f"{uuid.uuid4()}{ext}"
    return os.path.join(subdir, safe_name)


def avatar_upload_path(instance, filename: str) -> str:
    return generate_upload_path("avatars", filename)


def post_image_upload_path(instance, filename: str) -> str:
    return generate_upload_path("posts", filename)


def listing_image_upload_path(instance, filename: str) -> str:
    return generate_upload_path("listings", filename)
