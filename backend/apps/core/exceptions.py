"""
GreenTalk — Custom Exception Handler
=====================================
Wraps DRF's default handler to produce consistent JSON error envelopes
across all API endpoints.

Standard error shape:
{
    "error": true,
    "code": "permission_denied",
    "message": "You do not have permission to perform this action.",
    "details": { ... }   # only present for validation errors
}
"""

import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Call DRF's default handler first, then reshape the response.
    Non-DRF exceptions (500s) fall through to Django's error handler.
    """
    response = exception_handler(exc, context)

    if response is None:
        # Unhandled exception — Django will return 500
        logger.exception("Unhandled exception in view %s", context.get("view"))
        return None

    error_code = _get_error_code(response)
    message = _get_message(response)

    reshaped = {
        "error": True,
        "code": error_code,
        "message": message,
    }

    # Include field-level validation details for 400 errors
    if response.status_code == status.HTTP_400_BAD_REQUEST:
        reshaped["details"] = response.data

    response.data = reshaped
    return response


def _get_error_code(response) -> str:
    data = response.data
    if isinstance(data, dict):
        # DRF sets 'detail' as an ErrorDetail with a code attribute
        detail = data.get("detail")
        if hasattr(detail, "code"):
            return detail.code
        if "code" in data:
            return str(data["code"])
    return f"http_{response.status_code}"


def _get_message(response) -> str:
    data = response.data
    if isinstance(data, dict):
        detail = data.get("detail")
        if detail:
            return str(detail)
        # Validation error — summarise first field error
        for key, val in data.items():
            if isinstance(val, list) and val:
                return f"{key}: {val[0]}"
    if isinstance(data, list) and data:
        return str(data[0])
    return "An error occurred."
