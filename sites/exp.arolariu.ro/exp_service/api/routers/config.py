"""Configuration lookup endpoints."""

import logging

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from authz import authorize_key_request, authorize_keys_request, authorize_prefix_request
from catalog import get_catalog
from config_loader import get_config, get_config_section, get_config_value
from exp_service.api.common import (
    API_VERSION_PREFIX,
    VALID_CONFIG_KEY_PATTERN,
    VALID_CONFIG_PREFIX_PATTERN,
    auth_error_response,
    error_response,
    utcnow_iso,
)
from models import ConfigBatchResponse, ConfigValueResponse

router = APIRouter(prefix=API_VERSION_PREFIX)


@router.get("/config", response_model=ConfigBatchResponse)
def get_config_batch(
    req: Request,
    keys: str | None = Query(default=None),
    prefix: str | None = Query(default=None),
) -> ConfigBatchResponse | JSONResponse:
    """Get multiple configuration values by keys or prefix."""
    if keys is not None:
        # Key mode returns requested keys in input order for deterministic
        # downstream mapping.
        key_list = [k.strip() for k in keys.split(",") if k.strip()]
        if not key_list:
            return error_response("Query parameter 'keys' must include at least one key.", status_code=400)

        invalid_keys = sorted([key for key in key_list if not VALID_CONFIG_KEY_PATTERN.fullmatch(key)])
        if invalid_keys:
            return error_response(
                "One or more keys have an invalid format.",
                status_code=400,
                details={"invalidKeys": invalid_keys},
            )

        authorization_result, denied_keys = authorize_keys_request(req, key_list)
        if not authorization_result.is_authorized:
            details = {"deniedKeys": denied_keys} if denied_keys else None
            return auth_error_response(
                message=authorization_result.message,
                status_code=authorization_result.status_code,
                details=details,
            )

        config = get_config()
        target_catalog = get_catalog(authorization_result.target or "")
        required_keys = set(target_catalog.requiredKeys if target_catalog else [])
        missing_required_keys = sorted([key for key in key_list if key in required_keys and config.get(key) is None])
        if missing_required_keys:
            return error_response(
                "Required keys are missing from configuration store.",
                status_code=500,
                details={"missingRequiredKeys": missing_required_keys},
            )

        # Non-required missing keys intentionally resolve to empty string so
        # callers can distinguish "not configured" from transport errors.
        values = [ConfigValueResponse(key=k, value=config.get(k, ""), fetchedAt=utcnow_iso()) for k in key_list]
        logging.info("Fetched %d config keys", len(values))
        return ConfigBatchResponse(values=values, fetchedAt=utcnow_iso())

    if prefix is not None:
        # Prefix mode is constrained by catalog prefix allow-lists.
        normalized_prefix = prefix.strip()
        if not VALID_CONFIG_PREFIX_PATTERN.fullmatch(normalized_prefix):
            return error_response("Invalid prefix format.", status_code=400)

        authorization_result = authorize_prefix_request(req, normalized_prefix)
        if not authorization_result.is_authorized:
            return auth_error_response(
                message=authorization_result.message,
                status_code=authorization_result.status_code,
            )

        section = get_config_section(normalized_prefix)
        values = [ConfigValueResponse(key=k, value=v, fetchedAt=utcnow_iso()) for k, v in section.items()]
        logging.info("Fetched %d config keys with prefix %s", len(values), normalized_prefix)
        return ConfigBatchResponse(values=values, fetchedAt=utcnow_iso())

    return error_response("Provide 'keys' or 'prefix' query parameter", status_code=400)


@router.get("/config/{key:path}", response_model=ConfigValueResponse)
def get_config_value_endpoint(req: Request, key: str) -> ConfigValueResponse | JSONResponse:
    """Get a single configuration value by key."""
    normalized_key = key.strip()
    if not VALID_CONFIG_KEY_PATTERN.fullmatch(normalized_key):
        return error_response("Invalid key format.", status_code=400)

    logging.info("Fetching config key: %s", normalized_key)

    authorization_result = authorize_key_request(req, normalized_key)
    if not authorization_result.is_authorized:
        return auth_error_response(
            message=authorization_result.message,
            status_code=authorization_result.status_code,
        )

    value = get_config_value(normalized_key)
    if value is None:
        target_catalog = get_catalog(authorization_result.target or "")
        if target_catalog and normalized_key in target_catalog.requiredKeys:
            return error_response(
                f"Required key '{normalized_key}' is missing from configuration store.",
                status_code=500,
            )
        return error_response(f"Key '{normalized_key}' not found", status_code=404)

    return ConfigValueResponse(key=normalized_key, value=value, fetchedAt=utcnow_iso())

