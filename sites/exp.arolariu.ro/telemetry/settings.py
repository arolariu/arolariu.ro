"""Environment-driven OpenTelemetry settings for the exp microservice.

The exp service should remain stateless and easy to bootstrap in both local
Docker and Azure deployments. This module centralizes the small runtime surface
needed to decide whether telemetry is enabled, which exporters should run, and
which resource attributes identify the service.
"""

from __future__ import annotations

import os
import socket
import tomllib
from dataclasses import dataclass
from pathlib import Path

from config.settings import get_runtime_infra_mode

DEFAULT_TELEMETRY_ENABLED = True
DEFAULT_CONSOLE_LOG_EXPORT_ENABLED = False
DEFAULT_METRIC_EXPORT_INTERVAL_SECONDS = 60
DEFAULT_TRACE_SAMPLE_RATIO = 1.0
DEFAULT_LOG_LEVEL = "INFO"
DEFAULT_SERVICE_NAME = "exp.arolariu.ro"
DEFAULT_SERVICE_NAMESPACE = "arolariu.ro"
DEFAULT_EXCLUDED_URLS = "/api/health,/api/ready"


@dataclass(frozen=True, slots=True)
class TelemetrySettings:
    """Resolved OpenTelemetry settings for the current process."""

    enabled: bool
    infra_mode: str
    deployment_environment: str
    service_name: str
    service_namespace: str
    service_version: str
    service_instance_id: str
    trace_sample_ratio: float
    metric_export_interval_millis: int
    console_trace_export_enabled: bool
    console_metric_export_enabled: bool
    console_log_export_enabled: bool
    azure_export_enabled: bool
    application_insights_connection_string: str | None
    excluded_urls: str
    log_level_name: str


def _service_root() -> Path:
    """Return the exp service root."""

    return Path(__file__).resolve().parent.parent


def _parse_bool(raw_value: str | None, *, default: bool) -> bool:
    """Parse a string value as a boolean flag."""

    if raw_value is None:
        return default

    normalized = raw_value.strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return default


def _parse_positive_int(raw_value: str | None, *, default: int) -> int:
    """Parse an integer environment variable and fall back on invalid values."""

    if raw_value is None:
        return default

    try:
        parsed = int(raw_value.strip())
    except ValueError:
        return default

    return parsed if parsed > 0 else default


def _parse_bounded_float(raw_value: str | None, *, default: float) -> float:
    """Parse a float constrained to the inclusive range ``0.0`` to ``1.0``."""

    if raw_value is None:
        return default

    try:
        parsed = float(raw_value.strip())
    except ValueError:
        return default

    return parsed if 0.0 <= parsed <= 1.0 else default


def _resolve_deployment_environment() -> str:
    """Resolve the deployment-environment label used in telemetry resources."""

    return (
        os.getenv("EXP_ENVIRONMENT")
        or os.getenv("AZURE_FUNCTIONS_ENVIRONMENT")
        or os.getenv("ENVIRONMENT")
        or "Development"
    ).strip() or "Development"


def _resolve_service_version() -> str:
    """Resolve the service version from explicit runtime inputs or ``pyproject.toml``."""

    explicit_version = (os.getenv("COMMIT_SHA") or os.getenv("EXP_SERVICE_VERSION") or "").strip()
    if explicit_version:
        return explicit_version

    pyproject_path = _service_root() / "pyproject.toml"
    try:
        with pyproject_path.open("rb") as handle:
            payload = tomllib.load(handle)
    except OSError:
        return "0.0.0"

    project = payload.get("project", {})
    if not isinstance(project, dict):
        return "0.0.0"

    version = project.get("version", "0.0.0")
    return version if isinstance(version, str) and version.strip() else "0.0.0"


def get_telemetry_settings() -> TelemetrySettings:
    """Return the resolved OpenTelemetry settings for the current process."""

    infra_mode = get_runtime_infra_mode()
    enabled = _parse_bool(os.getenv("EXP_OTEL_ENABLED"), default=DEFAULT_TELEMETRY_ENABLED)
    connection_string = (os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING") or "").strip() or None
    console_export_default = infra_mode != "azure"

    metric_export_interval_seconds = _parse_positive_int(
        os.getenv("EXP_OTEL_METRIC_EXPORT_INTERVAL_SECONDS"),
        default=DEFAULT_METRIC_EXPORT_INTERVAL_SECONDS,
    )

    return TelemetrySettings(
        enabled=enabled,
        infra_mode=infra_mode,
        deployment_environment=_resolve_deployment_environment(),
        service_name=DEFAULT_SERVICE_NAME,
        service_namespace=DEFAULT_SERVICE_NAMESPACE,
        service_version=_resolve_service_version(),
        service_instance_id=f"{socket.gethostname()}:{os.getpid()}",
        trace_sample_ratio=_parse_bounded_float(
            os.getenv("EXP_OTEL_TRACE_SAMPLE_RATIO"),
            default=DEFAULT_TRACE_SAMPLE_RATIO,
        ),
        metric_export_interval_millis=metric_export_interval_seconds * 1000,
        console_trace_export_enabled=_parse_bool(
            os.getenv("EXP_OTEL_CONSOLE_TRACE_EXPORT_ENABLED"),
            default=console_export_default,
        ),
        console_metric_export_enabled=_parse_bool(
            os.getenv("EXP_OTEL_CONSOLE_METRIC_EXPORT_ENABLED"),
            default=console_export_default,
        ),
        console_log_export_enabled=_parse_bool(
            os.getenv("EXP_OTEL_CONSOLE_LOG_EXPORT_ENABLED"),
            default=DEFAULT_CONSOLE_LOG_EXPORT_ENABLED and console_export_default,
        ),
        azure_export_enabled=infra_mode == "azure" and connection_string is not None,
        application_insights_connection_string=connection_string,
        excluded_urls=(os.getenv("EXP_OTEL_EXCLUDED_URLS") or DEFAULT_EXCLUDED_URLS).strip() or DEFAULT_EXCLUDED_URLS,
        log_level_name=(os.getenv("EXP_OTEL_LOG_LEVEL") or DEFAULT_LOG_LEVEL).strip().upper() or DEFAULT_LOG_LEVEL,
    )
