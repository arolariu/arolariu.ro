"""Health and readiness endpoints."""

import logging

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from api.common import json_response, utcnow_iso
from config.loader import get_config, get_config_stats
from config.settings import get_runtime_infra_mode
from models import HealthResponse, ReadyResponse
from runtime.metrics import (
    get_process_runtime_snapshot,
    get_request_metrics_snapshot,
    get_served_config_metrics_snapshot,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _current_environment() -> str:
    """Return the configured infrastructure environment name."""

    return get_runtime_infra_mode()


def _build_health_payload(status: str) -> HealthResponse:
    """Build a health payload from process, request, and config-serving metrics."""

    runtime_snapshot = get_process_runtime_snapshot()
    request_snapshot = get_request_metrics_snapshot()
    config_snapshot = get_config_stats()
    served_config_snapshot = get_served_config_metrics_snapshot()

    return HealthResponse(
        status=status,
        environment=_current_environment(),
        timestamp=utcnow_iso(),
        startedAt=runtime_snapshot.started_at,
        uptimeSeconds=runtime_snapshot.uptime_seconds,
        hostname=runtime_snapshot.hostname,
        processId=runtime_snapshot.process_id,
        requestsServed=request_snapshot.total_requests,
        requestsByPath=request_snapshot.requests_by_path,
        configKeysLoaded=config_snapshot.keys_loaded,
        configLoadCount=config_snapshot.load_count,
        lastConfigLoadedAt=config_snapshot.last_loaded_at,
        configResponsesServed=served_config_snapshot.responses_total,
        configValuesServed=served_config_snapshot.values_total,
        configResponsesByEndpoint=served_config_snapshot.responses_by_endpoint,
        configResponsesByTarget=served_config_snapshot.responses_by_target,
        configResponsesByCaller=served_config_snapshot.responses_by_caller,
        configValuesByTarget=served_config_snapshot.values_by_target,
        configValuesByCaller=served_config_snapshot.values_by_caller,
        configValuesByName=served_config_snapshot.values_by_name,
        lastConfigServedAt=served_config_snapshot.last_served_at,
    )


@router.get("/api/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Return a liveness payload for container and platform probes."""

    return _build_health_payload("Healthy")


@router.get("/api/ready", response_model=ReadyResponse)
def get_ready() -> ReadyResponse | JSONResponse:
    """Return readiness information based on whether the config snapshot is readable."""

    try:
        config = get_config()
    except Exception:
        logger.exception("Readiness check failed")
        payload = ReadyResponse(**_build_health_payload("NotReady").model_dump(), keysLoaded=0)
        return json_response(payload.model_dump(), status_code=503)

    return ReadyResponse(**_build_health_payload("Ready").model_dump(), keysLoaded=len(config))
