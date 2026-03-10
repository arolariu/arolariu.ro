"""Run-time configuration slice.

The run-time endpoint is the server-to-server bootstrap surface for both the
API and the website. Each target receives its own dedicated response model so
the contract remains explicit even when the two callers diverge in the future.
"""

from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from api.common import (
    API_VERSION_PREFIX,
    build_internal_resolution_error,
    build_missing_keys_error,
    build_run_time_response,
    error_response,
    resolve_caller_label,
    resolve_target_query,
)
from config.catalog import resolve_runtime_config
from config.loader import extract_features, get_config
from models import ApiRunTimeConfigDocumentResponse, WebsiteRunTimeConfigDocumentResponse
from runtime.metrics import record_config_delivery
from security.authz import authorize_target_request
from telemetry.bootstrap import record_config_delivery_metric, set_current_span_attributes

logger = logging.getLogger(__name__)
router = APIRouter(prefix=API_VERSION_PREFIX)


@router.get(
    "/run-time",
    response_model=ApiRunTimeConfigDocumentResponse | WebsiteRunTimeConfigDocumentResponse,
)
def get_run_time(
    req: Request,
    for_target: Annotated[str, Query(alias="for")] = "",
) -> ApiRunTimeConfigDocumentResponse | WebsiteRunTimeConfigDocumentResponse | JSONResponse:
    """Return the run-time configuration document and feature flags for the requested target."""

    resolution, error = resolve_target_query(for_target, parameter_name="for")
    if error is not None:
        return error

    if resolution is None:
        return build_internal_resolution_error("the requested target")

    authorization_result = authorize_target_request(req, resolution.target)
    if not authorization_result.is_authorized:
        return error_response(
            message=authorization_result.message,
            status_code=authorization_result.status_code,
        )

    config_snapshot = get_config()
    config_resolution = resolve_runtime_config(resolution.index, config_snapshot)
    if config_resolution.missing_required_keys:
        return build_missing_keys_error("Run-time", list(config_resolution.missing_required_keys))

    features = extract_features(config_snapshot, resolution.index.feature_ids)
    logger.info(
        "Bootstrap fetched for target=%s config_keys=%d features=%d",
        resolution.target,
        len(config_resolution.config),
        len(features),
    )

    record_config_delivery(
        "run-time",
        resolution.target,
        tuple(config_resolution.config),
        caller_label=resolve_caller_label(req, resolution.target),
    )
    record_config_delivery_metric(
        endpoint_name="run-time",
        target=resolution.target,
        value_count=len(config_resolution.config),
    )
    set_current_span_attributes(
        {
            "exp.endpoint.name": "run-time",
            "exp.target": resolution.target,
            "exp.config.count": len(config_resolution.config),
            "exp.feature.count": len(features),
            "exp.contract.version": resolution.index.contract_version,
        }
    )
    return build_run_time_response(
        resolution=resolution,
        config=config_resolution.config,
        features=features,
    )
