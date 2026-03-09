"""Tests for the telemetry bootstrap module."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import ClassVar

import pytest
from fastapi import FastAPI

from telemetry.bootstrap import TelemetryDependencies, initialize_telemetry, shutdown_telemetry


def _build_fake_dependencies() -> TelemetryDependencies:
    """Build a self-contained fake dependency bundle for bootstrap tests."""

    class FakeSpan:
        def __init__(self, name: str = "current") -> None:
            self.name = name
            self.attributes: dict[str, object] = {}
            self.exceptions: list[Exception] = []

        def is_recording(self) -> bool:
            return True

        def set_attribute(self, key: str, value: object) -> None:
            self.attributes[key] = value

        def record_exception(self, exception: Exception) -> None:
            self.exceptions.append(exception)

    class FakeSpanContext:
        def __init__(self, span: FakeSpan) -> None:
            self.span = span

        def __enter__(self) -> FakeSpan:
            return self.span

        def __exit__(self, *_args: object) -> bool:
            return False

    class FakeTracer:
        def __init__(self) -> None:
            self.started_spans: list[FakeSpan] = []

        def start_as_current_span(self, name: str) -> FakeSpanContext:
            span = FakeSpan(name)
            self.started_spans.append(span)
            return FakeSpanContext(span)

    class FakeTraceModule:
        def __init__(self) -> None:
            self.provider = None
            self.tracer = FakeTracer()
            self.current_span = FakeSpan()

        def set_tracer_provider(self, provider: object) -> None:
            self.provider = provider

        def get_tracer(self, _name: str) -> FakeTracer:
            return self.tracer

        def get_current_span(self) -> FakeSpan:
            return self.current_span

    class FakeMetricsModule:
        def __init__(self) -> None:
            self.provider = None

        def set_meter_provider(self, provider: object) -> None:
            self.provider = provider

    class FakeLogsModule:
        def __init__(self) -> None:
            self.provider = None

        def __call__(self, provider: object) -> None:
            self.provider = provider

    class FakeResource:
        @staticmethod
        def create(attributes: dict[str, object]) -> dict[str, object]:
            return {"attributes": attributes}

    class FakeTraceIdRatioBased:
        def __init__(self, ratio: float) -> None:
            self.ratio = ratio

    class FakeBatchSpanProcessor:
        def __init__(self, exporter: object) -> None:
            self.exporter = exporter

    class FakeConsoleSpanExporter:
        pass

    class FakeAzureMonitorTraceExporter:
        def __init__(self, **kwargs: object) -> None:
            self.kwargs = kwargs

    class FakeCounter:
        def __init__(self, name: str) -> None:
            self.name = name
            self.calls: list[tuple[int, dict[str, object]]] = []

        def add(self, value: int, attributes: dict[str, object]) -> None:
            self.calls.append((value, attributes))

    class FakeHistogram:
        def __init__(self, name: str) -> None:
            self.name = name
            self.calls: list[tuple[float, dict[str, object]]] = []

        def record(self, value: float, attributes: dict[str, object]) -> None:
            self.calls.append((value, attributes))

    class FakeMeter:
        def __init__(self) -> None:
            self.counters: dict[str, FakeCounter] = {}
            self.histograms: dict[str, FakeHistogram] = {}
            self.observable_gauges: dict[str, list[object]] = {}

        def create_counter(self, name: str, **_kwargs: object) -> FakeCounter:
            counter = FakeCounter(name)
            self.counters[name] = counter
            return counter

        def create_histogram(self, name: str, **_kwargs: object) -> FakeHistogram:
            histogram = FakeHistogram(name)
            self.histograms[name] = histogram
            return histogram

        def create_observable_gauge(self, name: str, callbacks: list[object], **_kwargs: object) -> object:
            self.observable_gauges[name] = callbacks
            return object()

    class FakePeriodicExportingMetricReader:
        def __init__(self, exporter: object, export_interval_millis: int) -> None:
            self.exporter = exporter
            self.export_interval_millis = export_interval_millis

    class FakeConsoleMetricExporter:
        pass

    class FakeAzureMonitorMetricExporter:
        def __init__(self, **kwargs: object) -> None:
            self.kwargs = kwargs

    class FakeMeterProvider:
        def __init__(self, *, resource: object, metric_readers: list[object]) -> None:
            self.resource = resource
            self.metric_readers = metric_readers
            self.meter = FakeMeter()
            self.flushed = False
            self.stopped = False

        def get_meter(self, _name: str) -> FakeMeter:
            return self.meter

        def force_flush(self) -> None:
            self.flushed = True

        def shutdown(self) -> None:
            self.stopped = True

    class FakeBatchLogRecordProcessor:
        def __init__(self, exporter: object) -> None:
            self.exporter = exporter

    class FakeConsoleLogExporter:
        pass

    class FakeAzureMonitorLogExporter:
        def __init__(self, **kwargs: object) -> None:
            self.kwargs = kwargs

    class FakeLoggerProvider:
        def __init__(self, *, resource: object) -> None:
            self.resource = resource
            self.processors: list[object] = []
            self.flushed = False
            self.stopped = False

        def add_log_record_processor(self, processor: object) -> None:
            self.processors.append(processor)

        def force_flush(self) -> None:
            self.flushed = True

        def shutdown(self) -> None:
            self.stopped = True

    class FakeLoggingHandler(logging.Handler):
        def __init__(self, *, level: int, logger_provider: object) -> None:
            super().__init__(level)
            self.logger_provider = logger_provider

        def emit(self, _record: logging.LogRecord) -> None:
            return None

    class FakeLoggingInstrumentor:
        def __init__(self) -> None:
            self.instrument_kwargs: dict[str, object] | None = None
            self.uninstrumented = False

        def instrument(self, **kwargs: object) -> None:
            self.instrument_kwargs = kwargs

        def uninstrument(self) -> None:
            self.uninstrumented = True

    class FakeFastAPIInstrumentor:
        instrument_calls: ClassVar[list[dict[str, object]]] = []
        uninstrument_calls: ClassVar[list[FastAPI]] = []

        @staticmethod
        def instrument_app(app: FastAPI, **kwargs: object) -> None:
            FakeFastAPIInstrumentor.instrument_calls.append({"app": app, **kwargs})

        @staticmethod
        def uninstrument_app(app: FastAPI) -> None:
            FakeFastAPIInstrumentor.uninstrument_calls.append(app)

    @dataclass(frozen=True)
    class FakeObservation:
        value: int | float
        attributes: dict[str, object]

    class FakeTracerProvider:
        def __init__(self, *, resource: object, sampler: object) -> None:
            self.resource = resource
            self.sampler = sampler
            self.processors: list[FakeBatchSpanProcessor] = []
            self.flushed = False
            self.stopped = False

        def add_span_processor(self, processor: FakeBatchSpanProcessor) -> None:
            self.processors.append(processor)

        def force_flush(self) -> None:
            self.flushed = True

        def shutdown(self) -> None:
            self.stopped = True

    class FakeDefaultAzureCredential:
        def __init__(self, **kwargs: object) -> None:
            self.kwargs = kwargs

    return TelemetryDependencies(
        trace_module=FakeTraceModule(),
        metrics_module=FakeMetricsModule(),
        logs_module=FakeLogsModule(),
        observation_type=FakeObservation,
        Resource=FakeResource,
        TracerProvider=FakeTracerProvider,
        TraceIdRatioBased=FakeTraceIdRatioBased,
        BatchSpanProcessor=FakeBatchSpanProcessor,
        ConsoleSpanExporter=FakeConsoleSpanExporter,
        MeterProvider=FakeMeterProvider,
        PeriodicExportingMetricReader=FakePeriodicExportingMetricReader,
        ConsoleMetricExporter=FakeConsoleMetricExporter,
        LoggerProvider=FakeLoggerProvider,
        LoggingHandler=FakeLoggingHandler,
        BatchLogRecordProcessor=FakeBatchLogRecordProcessor,
        ConsoleLogExporter=FakeConsoleLogExporter,
        FastAPIInstrumentor=FakeFastAPIInstrumentor,
        LoggingInstrumentor=FakeLoggingInstrumentor,
        AzureMonitorTraceExporter=FakeAzureMonitorTraceExporter,
        AzureMonitorMetricExporter=FakeAzureMonitorMetricExporter,
        AzureMonitorLogExporter=FakeAzureMonitorLogExporter,
        DefaultAzureCredential=FakeDefaultAzureCredential,
    )


class TestTelemetryBootstrap:
    def test_initializes_local_console_exporters(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        dependencies = _build_fake_dependencies()
        monkeypatch.setenv("EXP_OTEL_ENABLED", "true")
        monkeypatch.setenv("INFRA", "local")
        monkeypatch.setattr("telemetry.bootstrap._import_telemetry_dependencies", lambda: dependencies)

        app = FastAPI()
        runtime = initialize_telemetry(app)
        try:
            assert runtime.initialized is True
            assert runtime.logger_provider is None
            assert dependencies.trace_module.provider is runtime.tracer_provider
            assert len(runtime.tracer_provider.processors) == 1
            assert isinstance(runtime.tracer_provider.processors[0].exporter, dependencies.ConsoleSpanExporter)
            assert len(runtime.meter_provider.metric_readers) == 1
            assert isinstance(runtime.meter_provider.metric_readers[0].exporter, dependencies.ConsoleMetricExporter)
            assert len(dependencies.FastAPIInstrumentor.instrument_calls) == 1
            expected_excluded = "/api/health,/api/ready,/admin"
            assert dependencies.FastAPIInstrumentor.instrument_calls[0]["excluded_urls"] == expected_excluded
        finally:
            shutdown_telemetry()

    def test_initializes_azure_monitor_exporters(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        dependencies = _build_fake_dependencies()
        monkeypatch.setenv("EXP_OTEL_ENABLED", "true")
        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("AZURE_CLIENT_ID", "telemetry-client-id")
        monkeypatch.setenv(
            "APPLICATIONINSIGHTS_CONNECTION_STRING",
            "InstrumentationKey=test;IngestionEndpoint=https://example.monitor.azure.com/",
        )
        monkeypatch.setattr("telemetry.bootstrap._import_telemetry_dependencies", lambda: dependencies)

        app = FastAPI()
        runtime = initialize_telemetry(app)
        try:
            assert runtime.initialized is True
            assert len(runtime.tracer_provider.processors) == 1
            span_exporter = runtime.tracer_provider.processors[0].exporter
            assert isinstance(span_exporter, dependencies.AzureMonitorTraceExporter)
            assert span_exporter.kwargs["disable_offline_storage"] is True
            assert span_exporter.kwargs["credential"].kwargs["managed_identity_client_id"] == "telemetry-client-id"

            assert len(runtime.meter_provider.metric_readers) == 1
            metric_exporter = runtime.meter_provider.metric_readers[0].exporter
            assert isinstance(metric_exporter, dependencies.AzureMonitorMetricExporter)
            assert metric_exporter.kwargs["disable_offline_storage"] is True

            assert runtime.logger_provider is not None
            assert len(runtime.logger_provider.processors) == 1
            log_exporter = runtime.logger_provider.processors[0].exporter
            assert isinstance(log_exporter, dependencies.AzureMonitorLogExporter)
            assert log_exporter.kwargs["disable_offline_storage"] is True
        finally:
            shutdown_telemetry()
