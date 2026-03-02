"""Common API helpers and validation primitives."""

import re
from datetime import datetime, timezone

from fastapi.responses import JSONResponse

from models import ErrorResponse

API_VERSION_PREFIX = "/api/v2"
# Restrict characters to conservative key/prefix alphabets to reduce abuse
# surface and ensure predictable catalog matching semantics.
VALID_CONFIG_KEY_PATTERN = re.compile(r"^[A-Za-z0-9:_-]{1,256}$")
VALID_CONFIG_PREFIX_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,128}$")


def json_response(body: dict, status_code: int = 200) -> JSONResponse:
    """Create a JSON response."""
    return JSONResponse(content=body, status_code=status_code)


def utcnow_iso() -> str:
    """Return current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


def auth_error_response(message: str, status_code: int, details: dict | None = None) -> JSONResponse:
    """Build a consistent auth-related JSON error response."""
    payload = ErrorResponse(
        error=message,
        deniedKeys=details.get("deniedKeys") if details else None,
        invalidKeys=details.get("invalidKeys") if details else None,
        missingRequiredKeys=details.get("missingRequiredKeys") if details else None,
    )
    return json_response(payload.model_dump(exclude_none=True), status_code=status_code)


def error_response(message: str, status_code: int, details: dict | None = None) -> JSONResponse:
    """Build a consistent error response."""
    return auth_error_response(message=message, status_code=status_code, details=details)

