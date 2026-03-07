"""exp.arolariu.ro FastAPI service exposing configuration proxy endpoints."""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response

from api.build_time import router as build_time_router
from api.common import is_non_cacheable_path
from api.config import router as config_router
from api.health import router as health_router
from api.run_time import router as run_time_router
from config.loader import load_config
from runtime.metrics import record_request
from telemetry.bootstrap import (
    get_current_trace_context,
    initialize_telemetry,
    record_current_span_exception,
    set_current_span_attributes,
    shutdown_telemetry,
    start_span,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Prime the in-memory configuration snapshot during application startup."""

    initialize_telemetry(_app)
    try:
        with start_span(
            "exp.startup.prime_config",
            instrumentation_scope=__name__,
            attributes={"exp.lifecycle.phase": "startup"},
        ):
            load_config()
        yield
    finally:
        shutdown_telemetry()


app = FastAPI(
    title="exp.arolariu.ro",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)


def _attach_standard_headers(response: Response, request_id: str) -> None:
    """Attach headers that every HTTP response should include."""

    response.headers["X-Request-Id"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"


def _attach_cache_headers(request_path: str, response: Response) -> None:
    """Disable intermediary caching for runtime-derived configuration documents."""

    if is_non_cacheable_path(request_path):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"


@app.middleware("http")
async def attach_request_context(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Attach request metadata headers and log request execution details."""

    request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
    started_at = time.perf_counter()
    record_request(request.url.path)
    set_current_span_attributes(
        {
            "exp.request.id": request_id,
            "exp.request.path": request.url.path,
        }
    )
    try:
        response = await call_next(request)
    except Exception as exception:
        trace_context = get_current_trace_context()
        record_current_span_exception(exception)
        logger.exception(
            "Unhandled request error for %s %s traceContext=%s/%s",
            request.method,
            request.url.path,
            trace_context.trace_id if trace_context else "0",
            trace_context.span_id if trace_context else "0",
        )
        raise

    elapsed_ms = (time.perf_counter() - started_at) * 1000
    _attach_standard_headers(response, request_id)
    _attach_cache_headers(request.url.path, response)
    set_current_span_attributes(
        {
            "exp.request.id": request_id,
            "exp.request.duration_ms": round(elapsed_ms, 3),
            "exp.response.cache_disabled": is_non_cacheable_path(request.url.path),
        }
    )
    trace_context = get_current_trace_context()

    logger.info(
        "request_id=%s method=%s path=%s status=%s durationMs=%.2f traceContext=%s/%s",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        trace_context.trace_id if trace_context else "0",
        trace_context.span_id if trace_context else "0",
    )
    return response


app.include_router(health_router)
app.include_router(build_time_router)
app.include_router(config_router)
app.include_router(run_time_router)
