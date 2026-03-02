"""exp.arolariu.ro FastAPI service exposing configuration proxy endpoints."""

import logging
import os
import re
from datetime import datetime, timezone

from fastapi import FastAPI, Query, Request
from fastapi.responses import JSONResponse

from authz import (
    authorize_catalog_request,
    authorize_key_request,
    authorize_keys_request,
    authorize_prefix_request,
)
from catalog import get_catalog
from config_loader import get_config, get_config_value, get_config_section, load_config

# Load configuration at module import time (warm start optimization)
load_config()

app = FastAPI(
    title="exp.arolariu.ro",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)
VALID_CONFIG_KEY_PATTERN = re.compile(r"^[A-Za-z0-9:_-]{1,256}$")
VALID_CONFIG_PREFIX_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,128}$")


def _json_response(body: dict, status_code: int = 200) -> JSONResponse:
    """Create a JSON response."""
    return JSONResponse(
        content=body,
        status_code=status_code,
    )


def _utcnow_iso() -> str:
    """Return current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


def _auth_error_response(message: str, status_code: int, details: dict | None = None) -> JSONResponse:
    """Build a consistent auth-related JSON error response."""
    payload = {"error": message}
    if details:
        payload.update(details)
    return _json_response(payload, status_code=status_code)


@app.get("/api/health")
def get_health() -> JSONResponse:
    """Health check endpoint."""
    infra = os.getenv("INFRA", "local")
    return _json_response({
        "status": "Healthy",
        "environment": infra,
        "timestamp": _utcnow_iso(),
    })


@app.get("/api/catalog")
def get_catalog_endpoint(
    req: Request,
    for_target: str = Query("", alias="for"),
) -> JSONResponse:
    """Get the catalog for a caller target (`for=api|website`)."""
    requested_target = for_target.strip().lower()
    if not requested_target:
        return _json_response({"error": "Query parameter 'for' is required."}, status_code=400)

    catalog = get_catalog(requested_target)
    if catalog is None:
        return _json_response({"error": f"Unknown catalog target '{requested_target}'."}, status_code=400)

    authorization_result = authorize_catalog_request(req, requested_target)
    if not authorization_result.is_authorized:
        return _auth_error_response(
            message=authorization_result.message,
            status_code=authorization_result.status_code,
        )

    payload = catalog.to_dict()
    payload["fetchedAt"] = _utcnow_iso()
    return _json_response(payload)


@app.get("/api/config")
def get_config_batch(
    req: Request,
    keys: str | None = Query(default=None),
    prefix: str | None = Query(default=None),
) -> JSONResponse:
    """Get multiple configuration values by keys or prefix."""
    if keys is not None:
        key_list = [k.strip() for k in keys.split(",") if k.strip()]
        if not key_list:
            return _json_response({"error": "Query parameter 'keys' must include at least one key."}, status_code=400)

        invalid_keys = sorted([key for key in key_list if not VALID_CONFIG_KEY_PATTERN.fullmatch(key)])
        if invalid_keys:
            return _json_response(
                {
                    "error": "One or more keys have an invalid format.",
                    "invalidKeys": invalid_keys,
                },
                status_code=400,
            )

        authorization_result, denied_keys = authorize_keys_request(req, key_list)
        if not authorization_result.is_authorized:
            details = {"deniedKeys": denied_keys} if denied_keys else None
            return _auth_error_response(
                message=authorization_result.message,
                status_code=authorization_result.status_code,
                details=details,
            )

        config = get_config()
        target_catalog = get_catalog(authorization_result.target or "")
        required_keys = set(target_catalog.requiredKeys if target_catalog else [])
        missing_required_keys = sorted([key for key in key_list if key in required_keys and config.get(key) is None])
        if missing_required_keys:
            return _json_response(
                {
                    "error": "Required keys are missing from configuration store.",
                    "missingRequiredKeys": missing_required_keys,
                },
                status_code=500,
            )

        # Empty string for non-required missing keys is intentional — callers treat missing as unconfigured.
        values = [
            {"key": k, "value": config.get(k, ""), "fetchedAt": _utcnow_iso()}
            for k in key_list
        ]
        logging.info("Fetched %d config keys", len(values))
        return _json_response({"values": values, "fetchedAt": _utcnow_iso()})

    if prefix is not None:
        normalized_prefix = prefix.strip()
        if not VALID_CONFIG_PREFIX_PATTERN.fullmatch(normalized_prefix):
            return _json_response({"error": "Invalid prefix format."}, status_code=400)

        authorization_result = authorize_prefix_request(req, normalized_prefix)
        if not authorization_result.is_authorized:
            return _auth_error_response(
                message=authorization_result.message,
                status_code=authorization_result.status_code,
            )

        section = get_config_section(normalized_prefix)
        values = [
            {"key": k, "value": v, "fetchedAt": _utcnow_iso()}
            for k, v in section.items()
        ]
        logging.info("Fetched %d config keys with prefix %s", len(values), normalized_prefix)
        return _json_response({"values": values, "fetchedAt": _utcnow_iso()})

    return _json_response(
        {"error": "Provide 'keys' or 'prefix' query parameter"},
        status_code=400,
    )


@app.get("/api/config/{key:path}")
def get_config_value_endpoint(req: Request, key: str) -> JSONResponse:
    """Get a single configuration value by key."""
    normalized_key = key.strip()
    if not VALID_CONFIG_KEY_PATTERN.fullmatch(normalized_key):
        return _json_response({"error": "Invalid key format."}, status_code=400)

    logging.info("Fetching config key: %s", normalized_key)

    authorization_result = authorize_key_request(req, normalized_key)
    if not authorization_result.is_authorized:
        return _auth_error_response(
            message=authorization_result.message,
            status_code=authorization_result.status_code,
        )

    value = get_config_value(normalized_key)
    if value is None:
        target_catalog = get_catalog(authorization_result.target or "")
        if target_catalog and normalized_key in target_catalog.requiredKeys:
            return _json_response(
                {"error": f"Required key '{normalized_key}' is missing from configuration store."},
                status_code=500,
            )
        return _json_response({"error": f"Key '{normalized_key}' not found"}, status_code=404)

    return _json_response({
        "key": normalized_key,
        "value": value,
        "fetchedAt": _utcnow_iso(),
    })
