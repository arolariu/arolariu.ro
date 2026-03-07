"""Single-config endpoint for indexed platform configuration values.

Unlike the build-time and run-time endpoints, `/api/v1/config` resolves exactly
one configuration key per request. The config registry in `config.catalog`
controls which keys are fetchable, how they are documented, and which callers
may request them.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from api.common import (
    API_VERSION_PREFIX,
    auth_error_response,
    build_config_value_response,
    build_internal_resolution_error,
    build_missing_config_value_error,
    resolve_caller_label,
    resolve_config_name_query,
)
from config.catalog import get_refresh_interval_for_targets, resolve_config_value
from config.loader import get_config
from models import ConfigValueResponse
from runtime.metrics import record_config_delivery
from security.authz import authorize_config_request
from telemetry.bootstrap import record_config_delivery_metric, set_current_span_attributes

router = APIRouter(prefix=API_VERSION_PREFIX)


@router.get("/config", response_model=ConfigValueResponse)
def get_config_value_endpoint(
    req: Request,
    name: Annotated[str, Query(alias="name")] = "",
) -> ConfigValueResponse | JSONResponse:
    """Return one indexed configuration value plus its ownership and usage metadata."""

    resolution, error = resolve_config_name_query(name, parameter_name="name")
    if error is not None:
        return error

    if resolution is None:
        return build_internal_resolution_error("the requested config name")

    authorization_result = authorize_config_request(req, resolution.definition.available_for_targets)
    if not authorization_result.is_authorized:
        return auth_error_response(
            message=authorization_result.message,
            status_code=authorization_result.status_code,
        )

    config_snapshot = get_config()
    config_resolution = resolve_config_value(resolution.definition, config_snapshot)
    if config_resolution.is_missing_required:
        return build_missing_config_value_error(resolution.name)

    resolved_target = authorization_result.target or resolution.definition.available_for_targets[0]
    record_config_delivery(
        "config",
        resolved_target,
        (resolution.name,),
        caller_label=resolve_caller_label(req, resolved_target),
    )
    record_config_delivery_metric(
        endpoint_name="config",
        target=resolved_target,
        value_count=1,
    )
    set_current_span_attributes(
        {
            "exp.endpoint.name": "config",
            "exp.target": resolved_target,
            "exp.config.name": resolution.name,
            "exp.config.count": 1,
        }
    )
    return build_config_value_response(
        resolution=resolution,
        value=config_resolution.value,
        refresh_interval_seconds=get_refresh_interval_for_targets(resolution.definition.available_for_targets),
    )
