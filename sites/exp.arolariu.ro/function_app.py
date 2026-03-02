"""exp.arolariu.ro FastAPI service exposing configuration proxy endpoints."""

import logging
import time
import uuid
from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response

from config_loader import load_config
from exp_service.api.common import API_VERSION_PREFIX
from exp_service.api.routers.catalog import router as catalog_router
from exp_service.api.routers.config import router as config_router
from exp_service.api.routers.health import router as health_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Initialize application state at startup."""
    load_config()
    yield


app = FastAPI(
    title="exp.arolariu.ro",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)


@app.middleware("http")
async def attach_request_context(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    """Attach request metadata headers and log request execution details."""
    request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
    started_at = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logging.exception("Unhandled request error for %s %s", request.method, request.url.path)
        raise

    elapsed_ms = (time.perf_counter() - started_at) * 1000
    response.headers["X-Request-Id"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    if request.url.path.startswith(f"{API_VERSION_PREFIX}/config"):
        # Config endpoints should never be cached by intermediate proxies.
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"

    logging.info(
        "request_id=%s method=%s path=%s status=%s durationMs=%.2f",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


app.include_router(health_router)
app.include_router(catalog_router)
app.include_router(config_router)
