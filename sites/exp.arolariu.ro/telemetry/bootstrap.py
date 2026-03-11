"""OpenTelemetry bootstrap and instrumentation helpers for exp.arolariu.ro."""

from __future__ import annotations

import logging
import os
import threading
from collections.abc import Callable, Iterable, Iterator, Mapping
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any

from fastapi import FastAPI

from telemetry.settings import TelemetrySettings, get_telemetry_settings

logger = logging.getLogger(__name__)

_DEFAULT_LOG_FORMAT = (
    "%(asctime)s %(levelname)s %(name)s "
    "trace_id=%(otelTraceID)s span_id=%(otelSpanID)s %(message)s"
)


@dataclass(frozen=True, slots=True)
class TelemetryDependencies:
    """Container for lazily imported OpenTelemetry and Azure Monitor symbols."""

    trace_module: Any
    metrics_module: Any
    logs_module: Any
    observation_type: Any
    Resource: Any
    TracerProvider: Any
    TraceIdRatioBased: Any
    BatchSpanProcessor: Any
    ConsoleSpanExporter: Any
    MeterProvider: Any
    PeriodicExportingMetricReader: Any
    ConsoleMetricExporter: Any
    LoggerProvider: Any
    LoggingHandler: Any
    BatchLogRecordProcessor: Any
    ConsoleLogExporter: Any
    FastAPIInstrumentor: Any
    LoggingInstrumentor: Any
    AzureMonitorTraceExporter: Any
    AzureMonitorMetricExporter: Any
    AzureMonitorLogExporter: Any
    DefaultAzureCredential: Any


@dataclass(slots=True)
class TelemetryRuntime:
    """Represents the active telemetry runtime for the current process."""

    settings: TelemetrySettings
    dependencies: TelemetryDependencies | None
    tracer_provider: Any = None
    meter_provider: Any = None
    logger_provider: Any = None
    logging_handler: logging.Handler | None = None
    logging_instrumentor: Any = None
    instrumented_app: FastAPI | None = None
    initialized: bool = False


@dataclass(frozen=True, slots=True)
class TraceContextSnapshot:
    """Formatted trace/span identifiers for the current execution context."""

    trace_id: str
    span_id: str


ScalarAttributeValue = str | bool | int | float
AttributeMap = Mapping[str, ScalarAttributeValue | None]

_runtime_lock = threading.RLock()
_telemetry_runtime: TelemetryRuntime | None = None
_config_load_counter: Any = None
_config_load_duration_histogram: Any = None
_auth_decision_counter: Any = None
_config_delivery_counter: Any = None
_config_values_counter: Any = None


class SafeOtelFormatter(logging.Formatter):
    """Formatter that tolerates missing OpenTelemetry correlation fields."""

    def format(self, record: logging.LogRecord) -> str:
        if not hasattr(record, "otelTraceID"):
            record.otelTraceID = "0"  # type: ignore[attr-defined]
        if not hasattr(record, "otelSpanID"):
            record.otelSpanID = "0"  # type: ignore[attr-defined]
        if not hasattr(record, "otelServiceName"):
            record.otelServiceName = "exp.arolariu.ro"  # type: ignore[attr-defined]
        if not hasattr(record, "otelTraceSampled"):
            record.otelTraceSampled = False  # type: ignore[attr-defined]
        return super().format(record)


def _import_telemetry_dependencies() -> TelemetryDependencies:
    """Import OpenTelemetry and Azure Monitor symbols lazily."""

    from azure.identity import DefaultAzureCredential
    from azure.monitor.opentelemetry.exporter import (
        AzureMonitorLogExporter,
        AzureMonitorMetricExporter,
        AzureMonitorTraceExporter,
    )
    from opentelemetry import metrics, trace
    from opentelemetry._logs import set_logger_provider
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.logging import LoggingInstrumentor
    from opentelemetry.metrics import Observation
    from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
    from opentelemetry.sdk._logs.export import BatchLogRecordProcessor, ConsoleLogExporter
    from opentelemetry.sdk.metrics import MeterProvider
    from opentelemetry.sdk.metrics.export import ConsoleMetricExporter, PeriodicExportingMetricReader
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
    from opentelemetry.sdk.trace.sampling import TraceIdRatioBased

    return TelemetryDependencies(
        trace_module=trace,
        metrics_module=metrics,
        logs_module=set_logger_provider,
        observation_type=Observation,
        Resource=Resource,
        TracerProvider=TracerProvider,
        TraceIdRatioBased=TraceIdRatioBased,
        BatchSpanProcessor=BatchSpanProcessor,
        ConsoleSpanExporter=ConsoleSpanExporter,
        MeterProvider=MeterProvider,
        PeriodicExportingMetricReader=PeriodicExportingMetricReader,
        ConsoleMetricExporter=ConsoleMetricExporter,
        LoggerProvider=LoggerProvider,
        LoggingHandler=LoggingHandler,
        BatchLogRecordProcessor=BatchLogRecordProcessor,
        ConsoleLogExporter=ConsoleLogExporter,
        FastAPIInstrumentor=FastAPIInstrumentor,
        LoggingInstrumentor=LoggingInstrumentor,
        AzureMonitorTraceExporter=AzureMonitorTraceExporter,
        AzureMonitorMetricExporter=AzureMonitorMetricExporter,
        AzureMonitorLogExporter=AzureMonitorLogExporter,
        DefaultAzureCredential=DefaultAzureCredential,
    )


def _build_resource(dependencies: TelemetryDependencies, settings: TelemetrySettings) -> Any:
    """Build the telemetry resource for the exp service."""

    return dependencies.Resource.create(
        {
            "service.name": settings.service_name,
            "service.namespace": settings.service_namespace,
            "service.version": settings.service_version,
            "service.instance.id": settings.service_instance_id,
            "deployment.environment": settings.deployment_environment,
            "exp.infra.mode": settings.infra_mode,
            "cloud.role": "exp",
            "cloud.provider": "azure",
        }
    )


def _resolve_log_level(settings: TelemetrySettings) -> int:
    """Resolve the Python logging level from telemetry settings."""

    resolved_level = getattr(logging, settings.log_level_name, logging.INFO)
    return resolved_level if isinstance(resolved_level, int) else logging.INFO


def _configure_console_log_format(settings: TelemetrySettings) -> None:
    """Apply a correlation-aware log formatter to existing console handlers."""

    formatter = SafeOtelFormatter(_DEFAULT_LOG_FORMAT)
    root_logger = logging.getLogger()
    root_logger.setLevel(_resolve_log_level(settings))

    if not root_logger.handlers:
        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(formatter)
        root_logger.addHandler(stream_handler)

    for logger_name in ("", "uvicorn", "uvicorn.error", "uvicorn.access"):
        active_logger = logging.getLogger(logger_name) if logger_name else root_logger
        for handler in active_logger.handlers:
            handler.setFormatter(formatter)


def _build_azure_credential(dependencies: TelemetryDependencies) -> Any:
    """Build the managed-identity-aware credential for Azure Monitor exporters."""

    managed_identity_client_id = (os.getenv("AZURE_CLIENT_ID") or "").strip()
    if managed_identity_client_id:
        return dependencies.DefaultAzureCredential(managed_identity_client_id=managed_identity_client_id)

    return dependencies.DefaultAzureCredential()


def _build_azure_exporter_kwargs(
    dependencies: TelemetryDependencies,
    settings: TelemetrySettings,
) -> dict[str, Any]:
    """Build common Azure Monitor exporter kwargs."""

    kwargs: dict[str, Any] = {
        "connection_string": settings.application_insights_connection_string,
        "disable_offline_storage": True,
    }

    if settings.infra_mode == "azure":
        kwargs["credential"] = _build_azure_credential(dependencies)

    return kwargs


def _configure_tracing(
    dependencies: TelemetryDependencies,
    settings: TelemetrySettings,
    resource: Any,
) -> Any:
    """Create and register the tracer provider for the current process."""

    sampler = dependencies.TraceIdRatioBased(settings.trace_sample_ratio)
    tracer_provider = dependencies.TracerProvider(resource=resource, sampler=sampler)

    if settings.console_trace_export_enabled:
        tracer_provider.add_span_processor(
            dependencies.BatchSpanProcessor(dependencies.ConsoleSpanExporter())
        )

    if settings.azure_export_enabled:
        tracer_provider.add_span_processor(
            dependencies.BatchSpanProcessor(
                dependencies.AzureMonitorTraceExporter(
                    **_build_azure_exporter_kwargs(dependencies, settings),
                )
            )
        )

    dependencies.trace_module.set_tracer_provider(tracer_provider)
    return tracer_provider


def _configure_metrics(
    dependencies: TelemetryDependencies,
    settings: TelemetrySettings,
    resource: Any,
) -> Any:
    """Create and register the meter provider for the current process."""

    metric_readers: list[Any] = []

    if settings.console_metric_export_enabled:
        metric_readers.append(
            dependencies.PeriodicExportingMetricReader(
                dependencies.ConsoleMetricExporter(),
                export_interval_millis=settings.metric_export_interval_millis,
            )
        )

    if settings.azure_export_enabled:
        metric_readers.append(
            dependencies.PeriodicExportingMetricReader(
                dependencies.AzureMonitorMetricExporter(
                    **_build_azure_exporter_kwargs(dependencies, settings),
                ),
                export_interval_millis=settings.metric_export_interval_millis,
            )
        )

    meter_provider = dependencies.MeterProvider(
        resource=resource,
        metric_readers=metric_readers,
    )
    dependencies.metrics_module.set_meter_provider(meter_provider)
    return meter_provider


def _configure_logging(
    dependencies: TelemetryDependencies,
    settings: TelemetrySettings,
    resource: Any,
) -> tuple[Any, logging.Handler | None, Any]:
    """Create and register logging instrumentation and exporters."""

    _configure_console_log_format(settings)

    logging_instrumentor = dependencies.LoggingInstrumentor()
    logging_instrumentor.instrument(
        set_logging_format=False,
        log_level=_resolve_log_level(settings),
    )

    if not (settings.console_log_export_enabled or settings.azure_export_enabled):
        return None, None, logging_instrumentor

    logger_provider = dependencies.LoggerProvider(resource=resource)

    if settings.console_log_export_enabled:
        logger_provider.add_log_record_processor(
            dependencies.BatchLogRecordProcessor(
                dependencies.ConsoleLogExporter(),
            )
        )

    if settings.azure_export_enabled:
        logger_provider.add_log_record_processor(
            dependencies.BatchLogRecordProcessor(
                dependencies.AzureMonitorLogExporter(
                    **_build_azure_exporter_kwargs(dependencies, settings),
                )
            )
        )

    dependencies.logs_module(logger_provider)

    logging_handler = dependencies.LoggingHandler(
        level=logging.NOTSET,
        logger_provider=logger_provider,
    )
    logging.getLogger().addHandler(logging_handler)
    return logger_provider, logging_handler, logging_instrumentor


def _get_metric_attributes(
    attributes: Mapping[str, ScalarAttributeValue | None],
) -> dict[str, ScalarAttributeValue]:
    """Drop ``None`` values from metric-attribute dictionaries."""

    return {
        key: value
        for key, value in attributes.items()
        if value is not None
    }


def _create_observation_callback(
    dependencies: TelemetryDependencies,
    value_getter: Callable[[], int | float],
    *,
    settings: TelemetrySettings,
) -> callable[[Any], Iterable[Any]]:
    """Build a low-cardinality observable-gauge callback."""

    def observe(_options: Any) -> list[Any]:
        return [
                dependencies.observation_type(
                    value_getter(),
                    _get_metric_attributes({"exp.infra.mode": settings.infra_mode}),
                )
            ]

    return observe


def _configure_custom_metrics(runtime: TelemetryRuntime) -> None:
    """Create the custom meter instruments used across the exp runtime."""

    global _config_load_counter
    global _config_load_duration_histogram
    global _auth_decision_counter
    global _config_delivery_counter
    global _config_values_counter

    if runtime.meter_provider is None or runtime.dependencies is None:
        return

    meter = runtime.meter_provider.get_meter("exp.arolariu.ro.telemetry")
    _config_load_counter = meter.create_counter(
        "exp.config.loads",
        unit="load",
        description="Number of configuration load operations executed by the current process.",
    )
    _config_load_duration_histogram = meter.create_histogram(
        "exp.config.load.duration",
        unit="ms",
        description="Observed duration of configuration load operations.",
    )
    _auth_decision_counter = meter.create_counter(
        "exp.auth.decisions",
        unit="decision",
        description="Authorization decisions produced by exp auth guards.",
    )
    _config_delivery_counter = meter.create_counter(
        "exp.config.deliveries",
        unit="response",
        description="Successful build-time, run-time, and single-key config responses.",
    )
    _config_values_counter = meter.create_counter(
        "exp.config.values_served",
        unit="value",
        description="Number of config values returned by successful config responses.",
    )

    meter.create_observable_gauge(
        "exp.runtime.uptime",
        callbacks=[
            _create_observation_callback(
                runtime.dependencies,
                lambda: __import__("runtime.metrics", fromlist=["get_process_runtime_snapshot"])
                .get_process_runtime_snapshot()
                .uptime_seconds,
                settings=runtime.settings,
            )
        ],
        unit="s",
        description="Current process uptime in seconds.",
    )
    meter.create_observable_gauge(
        "exp.runtime.requests_served",
        callbacks=[
            _create_observation_callback(
                runtime.dependencies,
                lambda: __import__("runtime.metrics", fromlist=["get_request_metrics_snapshot"])
                .get_request_metrics_snapshot()
                .total_requests,
                settings=runtime.settings,
            )
        ],
        unit="request",
        description="Number of HTTP requests served by the current process.",
    )
    meter.create_observable_gauge(
        "exp.runtime.config_responses_served",
        callbacks=[
            _create_observation_callback(
                runtime.dependencies,
                lambda: __import__("runtime.metrics", fromlist=["get_served_config_metrics_snapshot"])
                .get_served_config_metrics_snapshot()
                .responses_total,
                settings=runtime.settings,
            )
        ],
        unit="response",
        description="Number of successful config-serving responses emitted by the current process.",
    )
    meter.create_observable_gauge(
        "exp.runtime.config_values_served",
        callbacks=[
            _create_observation_callback(
                runtime.dependencies,
                lambda: __import__("runtime.metrics", fromlist=["get_served_config_metrics_snapshot"])
                .get_served_config_metrics_snapshot()
                .values_total,
                settings=runtime.settings,
            )
        ],
        unit="value",
        description="Number of individual configuration values served by the current process.",
    )
    meter.create_observable_gauge(
        "exp.runtime.config_keys_loaded",
        callbacks=[
            _create_observation_callback(
                runtime.dependencies,
                lambda: __import__("config.loader", fromlist=["get_config_stats"]).get_config_stats().keys_loaded,
                settings=runtime.settings,
            )
        ],
        unit="key",
        description="Number of config keys currently present in the in-memory snapshot.",
    )
    meter.create_observable_gauge(
        "exp.runtime.config_load_count",
        callbacks=[
            _create_observation_callback(
                runtime.dependencies,
                lambda: __import__("config.loader", fromlist=["get_config_stats"]).get_config_stats().load_count,
                settings=runtime.settings,
            )
        ],
        unit="load",
        description="Number of config snapshot loads performed by the current process.",
    )


def _read_scope_header(scope: Mapping[str, Any], header_name: str) -> str:
    """Read one ASGI request header from a scope payload."""

    encoded_headers = scope.get("headers", [])
    if not isinstance(encoded_headers, list):
        return ""

    normalized_name = header_name.lower().encode("utf-8")
    for raw_key, raw_value in encoded_headers:
        if raw_key.lower() == normalized_name:
            return raw_value.decode("utf-8")

    return ""


def _server_request_hook(span: Any, scope: Mapping[str, Any]) -> None:
    """Enrich incoming FastAPI request spans with exp-specific attributes."""

    if span is None or not getattr(span, "is_recording", lambda: False)():
        return

    request_id = _read_scope_header(scope, "x-request-id")
    target_hint = _read_scope_header(scope, "x-exp-target")
    traceparent = _read_scope_header(scope, "traceparent")
    if request_id:
        span.set_attribute("exp.request.id", request_id)
        span.set_attribute("exp.request.id_source", "upstream")
    if target_hint:
        span.set_attribute("exp.request.target_hint", target_hint)
    span.set_attribute("exp.traceparent.present", bool(traceparent))


def _client_response_hook(span: Any, scope: Mapping[str, Any], message: Mapping[str, Any]) -> None:
    """Enrich FastAPI response spans with low-cardinality cache metadata."""

    if span is None or not getattr(span, "is_recording", lambda: False)():
        return

    if message.get("type") != "http.response.start":
        return

    headers = message.get("headers", [])
    if not isinstance(headers, list):
        return

    for raw_key, raw_value in headers:
        if raw_key.lower() == b"cache-control":
            span.set_attribute("exp.response.cache_control", raw_value.decode("utf-8"))
            break


def _instrument_fastapi_app(runtime: TelemetryRuntime, app: FastAPI) -> None:
    """Instrument the FastAPI application once for request tracing and metrics."""

    if runtime.dependencies is None:
        return

    if getattr(app.state, "exp_otel_instrumented", False):
        return

    runtime.dependencies.FastAPIInstrumentor.instrument_app(
        app,
        tracer_provider=runtime.tracer_provider,
        meter_provider=runtime.meter_provider,
        excluded_urls=runtime.settings.excluded_urls,
        server_request_hook=_server_request_hook,
        client_response_hook=_client_response_hook,
        exclude_spans=["receive", "send"],
    )
    app.state.exp_otel_instrumented = True
    runtime.instrumented_app = app


def initialize_telemetry(app: FastAPI) -> TelemetryRuntime:
    """Initialize OpenTelemetry providers and instrument the FastAPI app."""

    global _telemetry_runtime

    settings = get_telemetry_settings()
    if not settings.enabled:
        return TelemetryRuntime(settings=settings, dependencies=None, initialized=False)

    with _runtime_lock:
        if _telemetry_runtime is not None:
            _instrument_fastapi_app(_telemetry_runtime, app)
            return _telemetry_runtime

        try:
            dependencies = _import_telemetry_dependencies()
        except ImportError as exception:
            raise RuntimeError(
                "OpenTelemetry is enabled but the required Python packages are not installed. "
                "Run `python -m pip install -r requirements.txt`."
            ) from exception

        if settings.infra_mode == "azure" and not settings.azure_export_enabled:
            logger.warning(
                "Azure runtime detected, but APPLICATIONINSIGHTS_CONNECTION_STRING is missing. "
                "Telemetry will stay local to the current process."
            )

        resource = _build_resource(dependencies, settings)
        tracer_provider = _configure_tracing(dependencies, settings, resource)
        meter_provider = _configure_metrics(dependencies, settings, resource)
        logger_provider, logging_handler, logging_instrumentor = _configure_logging(
            dependencies,
            settings,
            resource,
        )

        runtime = TelemetryRuntime(
            settings=settings,
            dependencies=dependencies,
            tracer_provider=tracer_provider,
            meter_provider=meter_provider,
            logger_provider=logger_provider,
            logging_handler=logging_handler,
            logging_instrumentor=logging_instrumentor,
            initialized=True,
        )
        _configure_custom_metrics(runtime)
        _instrument_fastapi_app(runtime, app)

        logger.info(
            "OpenTelemetry initialized consoleTrace=%s consoleMetric=%s consoleLog=%s azureExport=%s",
            settings.console_trace_export_enabled,
            settings.console_metric_export_enabled,
            settings.console_log_export_enabled,
            settings.azure_export_enabled,
        )

        _telemetry_runtime = runtime
        return runtime


def _shutdown_provider(provider: Any) -> None:
    """Force-flush and shut down one telemetry provider when supported."""

    if provider is None:
        return

    force_flush = getattr(provider, "force_flush", None)
    if callable(force_flush):
        force_flush()

    shutdown = getattr(provider, "shutdown", None)
    if callable(shutdown):
        shutdown()


def shutdown_telemetry() -> None:
    """Flush and shut down the current telemetry runtime."""

    global _telemetry_runtime
    global _config_load_counter
    global _config_load_duration_histogram
    global _auth_decision_counter
    global _config_delivery_counter
    global _config_values_counter

    with _runtime_lock:
        runtime = _telemetry_runtime
        _telemetry_runtime = None
        _config_load_counter = None
        _config_load_duration_histogram = None
        _auth_decision_counter = None
        _config_delivery_counter = None
        _config_values_counter = None

    if runtime is None or not runtime.initialized:
        return

    if runtime.instrumented_app is not None and runtime.dependencies is not None:
        runtime.dependencies.FastAPIInstrumentor.uninstrument_app(runtime.instrumented_app)
        runtime.instrumented_app.state.exp_otel_instrumented = False

    if runtime.logging_instrumentor is not None:
        uninstrument = getattr(runtime.logging_instrumentor, "uninstrument", None)
        if callable(uninstrument):
            uninstrument()

    if runtime.logging_handler is not None:
        logging.getLogger().removeHandler(runtime.logging_handler)

    _shutdown_provider(runtime.logger_provider)
    _shutdown_provider(runtime.meter_provider)
    _shutdown_provider(runtime.tracer_provider)


def reset_telemetry_state() -> None:
    """Reset telemetry module state for tests without touching global OTel SDK state."""

    global _telemetry_runtime
    global _config_load_counter
    global _config_load_duration_histogram
    global _auth_decision_counter
    global _config_delivery_counter
    global _config_values_counter

    with _runtime_lock:
        _telemetry_runtime = None
        _config_load_counter = None
        _config_load_duration_histogram = None
        _auth_decision_counter = None
        _config_delivery_counter = None
        _config_values_counter = None


def _set_span_attributes(span: Any, attributes: AttributeMap | None) -> None:
    """Apply custom attributes to a span when the span is recording."""

    if span is None or attributes is None:
        return

    if not getattr(span, "is_recording", lambda: False)():
        return

    for key, value in attributes.items():
        if value is None:
            continue
        span.set_attribute(key, value)


@contextmanager
def start_span(
    name: str,
    *,
    instrumentation_scope: str,
    attributes: AttributeMap | None = None,
) -> Iterator[Any | None]:
    """Start a manual span when telemetry is active, otherwise yield ``None``."""

    runtime = _telemetry_runtime
    if runtime is None or not runtime.initialized or runtime.dependencies is None:
        yield None
        return

    tracer = runtime.dependencies.trace_module.get_tracer(instrumentation_scope)
    with tracer.start_as_current_span(name) as span:
        _set_span_attributes(span, attributes)
        yield span


def set_current_span_attributes(attributes: AttributeMap) -> None:
    """Attach attributes to the current span when one is active."""

    runtime = _telemetry_runtime
    if runtime is None or not runtime.initialized or runtime.dependencies is None:
        return

    span = runtime.dependencies.trace_module.get_current_span()
    _set_span_attributes(span, attributes)


def record_current_span_exception(exception: Exception) -> None:
    """Record an exception on the current span when one is active."""

    runtime = _telemetry_runtime
    if runtime is None or not runtime.initialized or runtime.dependencies is None:
        return

    span = runtime.dependencies.trace_module.get_current_span()
    if span is None or not getattr(span, "is_recording", lambda: False)():
        return

    span.record_exception(exception)
    span.set_attribute("exp.exception.type", type(exception).__name__)


def get_current_trace_context() -> TraceContextSnapshot | None:
    """Return formatted trace/span IDs for the current execution context."""

    runtime = _telemetry_runtime
    if runtime is None or not runtime.initialized or runtime.dependencies is None:
        return None

    span = runtime.dependencies.trace_module.get_current_span()
    get_span_context = getattr(span, "get_span_context", None)
    if not callable(get_span_context):
        return None

    span_context = get_span_context()
    trace_identifier = getattr(span_context, "trace_id", 0)
    span_identifier = getattr(span_context, "span_id", 0)
    if not trace_identifier or not span_identifier:
        return None

    return TraceContextSnapshot(
        trace_id=f"{trace_identifier:032x}",
        span_id=f"{span_identifier:016x}",
    )


def record_config_load_metric(
    *,
    source: str,
    outcome: str,
    duration_ms: float,
) -> None:
    """Record metrics for one config-load operation."""

    runtime = _telemetry_runtime
    if runtime is None:
        return

    attributes = _get_metric_attributes(
        {
            "exp.infra.mode": runtime.settings.infra_mode,
            "exp.config.source": source,
            "exp.config.outcome": outcome,
        }
    )

    if _config_load_counter is not None:
        _config_load_counter.add(1, attributes)

    if _config_load_duration_histogram is not None:
        _config_load_duration_histogram.record(duration_ms, attributes)


def record_auth_decision_metric(
    *,
    flow: str,
    outcome: str,
    resolved_target: str | None,
) -> None:
    """Record one authorization decision for metrics backends."""

    runtime = _telemetry_runtime
    if runtime is None or _auth_decision_counter is None:
        return

    _auth_decision_counter.add(
        1,
        _get_metric_attributes(
            {
                "exp.infra.mode": runtime.settings.infra_mode,
                "exp.auth.flow": flow,
                "exp.auth.outcome": outcome,
                "exp.target": resolved_target,
            }
        ),
    )


def record_config_delivery_metric(
    *,
    endpoint_name: str,
    target: str,
    value_count: int,
) -> None:
    """Record metrics for one successful config-serving response."""

    runtime = _telemetry_runtime
    if runtime is None:
        return

    attributes = _get_metric_attributes(
        {
            "exp.infra.mode": runtime.settings.infra_mode,
            "exp.endpoint": endpoint_name,
            "exp.target": target,
        }
    )

    if _config_delivery_counter is not None:
        _config_delivery_counter.add(1, attributes)

    if _config_values_counter is not None:
        _config_values_counter.add(value_count, attributes)
