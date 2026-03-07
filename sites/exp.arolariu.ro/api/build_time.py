"""Build-time configuration document slice.

This endpoint returns one complete build-time document for either the API or
the website target. Each target has its own dedicated response model so callers
can understand exactly which keys they should expect.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from api.common import (
    API_VERSION_PREFIX,
    auth_error_response,
    build_build_time_response,
    build_internal_resolution_error,
    build_missing_keys_error,
    resolve_caller_label,
    resolve_target_query,
)
from config.catalog import resolve_build_time_config
from config.loader import get_config
from models import ApiBuildTimeConfigDocumentResponse, WebsiteBuildTimeConfigDocumentResponse
from runtime.metrics import record_config_delivery
from security.authz import authorize_target_request
from telemetry.bootstrap import record_config_delivery_metric, set_current_span_attributes

router = APIRouter(prefix=API_VERSION_PREFIX)


@router.get(
    "/build-time",
    response_model=ApiBuildTimeConfigDocumentResponse | WebsiteBuildTimeConfigDocumentResponse,
)
def get_build_time(
    req: Request,
    for_target: Annotated[str, Query(alias="for")] = "",
) -> ApiBuildTimeConfigDocumentResponse | WebsiteBuildTimeConfigDocumentResponse | JSONResponse:
    """Return the build-time configuration document for the requested caller target."""

    resolution, error = resolve_target_query(for_target, parameter_name="for")
    if error is not None:
        return error

    if resolution is None:
        return build_internal_resolution_error("the requested target")

    authorization_result = authorize_target_request(req, resolution.target)
    if not authorization_result.is_authorized:
        return auth_error_response(
            message=authorization_result.message,
            status_code=authorization_result.status_code,
        )

    config_snapshot = get_config()
    config_resolution = resolve_build_time_config(resolution.index, config_snapshot)
    if config_resolution.missing_required_keys:
        return build_missing_keys_error("Build-time", list(config_resolution.missing_required_keys))

    record_config_delivery(
        "build-time",
        resolution.target,
        tuple(config_resolution.config),
        caller_label=resolve_caller_label(req, resolution.target),
    )
    record_config_delivery_metric(
        endpoint_name="build-time",
        target=resolution.target,
        value_count=len(config_resolution.config),
    )
    set_current_span_attributes(
        {
            "exp.endpoint.name": "build-time",
            "exp.target": resolution.target,
            "exp.config.count": len(config_resolution.config),
            "exp.contract.version": resolution.index.contract_version,
        }
    )
    return build_build_time_response(
        resolution=resolution,
        config=config_resolution.config,
    )
