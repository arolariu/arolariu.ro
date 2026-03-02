"""Health and readiness endpoints."""

import logging
import os

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from config_loader import get_config
from exp_service.api.common import json_response, utcnow_iso
from models import HealthResponse, ReadyResponse

router = APIRouter()


@router.get("/api/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Health check endpoint."""
    infra = os.getenv("INFRA", "local")
    return HealthResponse(status="Healthy", environment=infra, timestamp=utcnow_iso())


@router.get("/api/ready", response_model=ReadyResponse)
def get_ready() -> ReadyResponse | JSONResponse:
    """Readiness check endpoint."""
    try:
        config = get_config()
        return ReadyResponse(
            status="Ready",
            environment=os.getenv("INFRA", "local"),
            keysLoaded=len(config),
            timestamp=utcnow_iso(),
        )
    except Exception:
        logging.exception("Readiness check failed")
        payload = ReadyResponse(
            status="NotReady",
            environment=os.getenv("INFRA", "local"),
            keysLoaded=0,
            timestamp=utcnow_iso(),
        )
        return json_response(payload.model_dump(), status_code=503)

