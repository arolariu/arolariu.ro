"""Shared helpers for request validation and response composition in the exp HTTP layer.

The module keeps endpoint implementations thin by centralizing:

- query validation for target and config-name inputs,
- standardized JSON error responses,
- typed response assembly for build-time, run-time, and single-config payloads,
- cache-header decisions for runtime-derived responses.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Final, TypedDict

from fastapi import Request
from fastapi.responses import JSONResponse

from config.catalog import ConfigValueDefinition, TargetConfigIndex, get_config_definition, get_target_index
from models import (
    ApiBuildTimeConfigDocumentResponse,
    ApiRunTimeConfigDocumentResponse,
    ConfigValueResponse,
    ErrorResponse,
    WebsiteBuildTimeConfigDocumentResponse,
    WebsiteRunTimeConfigDocumentResponse,
)

API_VERSION_PREFIX: Final[str] = "/api/v1"
NON_CACHEABLE_API_PATH_PREFIXES: Final[tuple[str, ...]] = (
    f"{API_VERSION_PREFIX}/build-time",
    f"{API_VERSION_PREFIX}/config",
    f"{API_VERSION_PREFIX}/run-time",
)

# Config keys and target names share the same conservative query alphabet:
# letters, digits, colon separators, underscores, and hyphens.
VALID_QUERY_NAME_PATTERN: Final[re.Pattern[str]] = re.compile(r"^[A-Za-z0-9:._-]{1,64}$")


class ErrorDetails(TypedDict, total=False):
    """Optional error metadata returned alongside the top-level error message."""

    deniedKeys: list[str]
    invalidKeys: list[str]
    missingRequiredKeys: list[str]


@dataclass(frozen=True, slots=True)
class TargetResolution:
    """Represents a validated target query plus its resolved configuration index."""

    target: str
    index: TargetConfigIndex


@dataclass(frozen=True, slots=True)
class ConfigNameResolution:
    """Represents a validated config-name query plus its registered metadata."""

    name: str
    definition: ConfigValueDefinition


def json_response(body: dict[str, object], status_code: int = 200) -> JSONResponse:
    """Create a JSON response with the provided payload and status code."""

    return JSONResponse(content=body, status_code=status_code)


def utcnow_iso() -> str:
    """Return the current UTC time as an ISO 8601 string."""

    return datetime.now(UTC).isoformat()


def error_response(
    message: str,
    status_code: int,
    details: ErrorDetails | None = None,
) -> JSONResponse:
    """Build a consistent JSON error response."""

    payload = ErrorResponse(
        error=message,
        deniedKeys=details.get("deniedKeys") if details else None,
        invalidKeys=details.get("invalidKeys") if details else None,
        missingRequiredKeys=details.get("missingRequiredKeys") if details else None,
    )
    return json_response(payload.model_dump(exclude_none=True), status_code=status_code)


def resolve_target_query(
    raw_value: str,
    *,
    parameter_name: str,
) -> tuple[TargetResolution | None, JSONResponse | None]:
    """Validate and resolve a target query parameter to a known target index."""

    requested_target = raw_value.strip().lower()
    if not requested_target:
        return None, error_response(f"Query parameter '{parameter_name}' is required.", status_code=400)

    if not VALID_QUERY_NAME_PATTERN.fullmatch(requested_target):
        return None, error_response("Invalid target format.", status_code=400)

    target_index = get_target_index(requested_target)
    if target_index is None:
        return None, error_response(f"Unknown target '{requested_target}'.", status_code=400)

    return TargetResolution(target=requested_target, index=target_index), None


def resolve_config_name_query(
    raw_value: str,
    *,
    parameter_name: str,
) -> tuple[ConfigNameResolution | None, JSONResponse | None]:
    """Validate and resolve a config-name query parameter to a known config definition."""

    config_name = raw_value.strip()
    if not config_name:
        return None, error_response(f"Query parameter '{parameter_name}' is required.", status_code=400)

    if not VALID_QUERY_NAME_PATTERN.fullmatch(config_name):
        return None, error_response("Invalid config name format.", status_code=400)

    definition = get_config_definition(config_name)
    if definition is None:
        return None, error_response(f"Unknown config '{config_name}'.", status_code=400)

    return ConfigNameResolution(name=config_name, definition=definition), None


def build_missing_keys_error(document_name: str, missing_required_keys: list[str]) -> JSONResponse:
    """Build a 500 response for a target document with missing required keys."""

    return error_response(
        f"{document_name} configuration keys are missing from the configuration store.",
        status_code=500,
        details={"missingRequiredKeys": missing_required_keys},
    )


def build_missing_config_value_error(config_name: str) -> JSONResponse:
    """Build a 500 response for a required config key that is absent from the store."""

    return error_response(
        f"Config '{config_name}' is missing from the configuration store.",
        status_code=500,
        details={"missingRequiredKeys": [config_name]},
    )


def build_internal_resolution_error(context: str) -> JSONResponse:
    """Build a 500 response for an unexpected empty query-resolution result."""

    return error_response(
        f"Failed to resolve {context}.",
        status_code=500,
    )


def build_build_time_response(
    *,
    resolution: TargetResolution,
    config: dict[str, str],
) -> ApiBuildTimeConfigDocumentResponse | WebsiteBuildTimeConfigDocumentResponse:
    """Build the typed build-time response payload for a resolved target."""

    common_payload = {
        "contractVersion": resolution.index.contract_version,
        "version": resolution.index.build_time_version,
        "config": config,
        "refreshIntervalSeconds": resolution.index.refresh_interval_seconds,
        "fetchedAt": utcnow_iso(),
    }
    if resolution.target == "api":
        return ApiBuildTimeConfigDocumentResponse(**common_payload)

    return WebsiteBuildTimeConfigDocumentResponse(**common_payload)


def build_run_time_response(
    *,
    resolution: TargetResolution,
    config: dict[str, str],
    features: dict[str, bool],
) -> ApiRunTimeConfigDocumentResponse | WebsiteRunTimeConfigDocumentResponse:
    """Build the typed run-time response payload for a resolved target."""

    common_payload = {
        "contractVersion": resolution.index.contract_version,
        "version": resolution.index.runtime_version,
        "config": config,
        "features": features,
        "refreshIntervalSeconds": resolution.index.refresh_interval_seconds,
        "fetchedAt": utcnow_iso(),
    }
    if resolution.target == "api":
        return ApiRunTimeConfigDocumentResponse(**common_payload)

    return WebsiteRunTimeConfigDocumentResponse(**common_payload)


def build_config_value_response(
    *,
    resolution: ConfigNameResolution,
    value: str,
    refresh_interval_seconds: int,
) -> ConfigValueResponse:
    """Build the typed single-config response payload for a resolved config name."""

    return ConfigValueResponse(
        name=resolution.name,
        value=value,
        availableForTargets=resolution.definition.available_for_targets,
        availableInDocuments=resolution.definition.available_in_documents,
        requiredInDocuments=resolution.definition.required_in_documents,
        description=resolution.definition.description,
        usage=resolution.definition.usage,
        refreshIntervalSeconds=refresh_interval_seconds,
        fetchedAt=utcnow_iso(),
    )


def is_non_cacheable_path(path: str) -> bool:
    """Return whether a request path serves runtime-derived configuration data."""

    return any(path.startswith(prefix) for prefix in NON_CACHEABLE_API_PATH_PREFIXES)


def resolve_caller_label(request: Request, resolved_target: str) -> str:
    """Return a stable caller label for process-local diagnostics.

    Azure callers expose a principal ID header via Easy Auth. Local or proxy
    callers do not have a principal identity, so the resolved consumer target is
    used instead.
    """

    principal_id = request.headers.get("X-MS-CLIENT-PRINCIPAL-ID", "").strip()
    if principal_id:
        return principal_id

    return f"local:{resolved_target.strip().lower()}"
