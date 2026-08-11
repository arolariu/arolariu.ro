"""Tests for environment-driven telemetry settings."""

from __future__ import annotations

import pytest
from opentelemetry.util.http import parse_excluded_urls

from telemetry.health_policy import build_excluded_urls
from telemetry.settings import get_telemetry_settings


class TestTelemetrySettings:
    def test_resolves_local_defaults(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("INFRA", "local")
        monkeypatch.delenv("APPLICATIONINSIGHTS_CONNECTION_STRING", raising=False)
        monkeypatch.delenv("COMMIT_SHA", raising=False)
        monkeypatch.delenv("EXP_SERVICE_VERSION", raising=False)

        settings = get_telemetry_settings()

        assert settings.enabled is False  # tests default to disabled via conftest
        assert settings.infra_mode == "local"
        assert settings.console_trace_export_enabled is True
        assert settings.console_metric_export_enabled is True
        assert settings.console_log_export_enabled is False
        assert settings.azure_export_enabled is False
        assert settings.excluded_urls == build_excluded_urls()
        assert settings.service_version == "3.0.0"

    def test_resolves_azure_export_when_connection_string_is_present(
        self,
        monkeypatch: pytest.MonkeyPatch,
    ) -> None:
        monkeypatch.setenv("EXP_OTEL_ENABLED", "true")
        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv(
            "APPLICATIONINSIGHTS_CONNECTION_STRING",
            "InstrumentationKey=test;IngestionEndpoint=https://example.monitor.azure.com/",
        )
        monkeypatch.setenv("EXP_OTEL_CONSOLE_TRACE_EXPORT_ENABLED", "false")
        monkeypatch.setenv("EXP_OTEL_CONSOLE_METRIC_EXPORT_ENABLED", "false")
        monkeypatch.setenv("EXP_OTEL_CONSOLE_LOG_EXPORT_ENABLED", "true")
        monkeypatch.setenv("EXP_OTEL_METRIC_EXPORT_INTERVAL_SECONDS", "15")
        monkeypatch.setenv("EXP_OTEL_TRACE_SAMPLE_RATIO", "0.25")
        monkeypatch.setenv("EXP_OTEL_LOG_LEVEL", "debug")

        settings = get_telemetry_settings()

        assert settings.enabled is True
        assert settings.infra_mode == "azure"
        assert settings.azure_export_enabled is True
        assert settings.console_trace_export_enabled is False
        assert settings.console_metric_export_enabled is False
        assert settings.console_log_export_enabled is True
        assert settings.metric_export_interval_millis == 15_000
        assert settings.trace_sample_ratio == 0.25
        assert settings.log_level_name == "DEBUG"

    def test_excluded_urls_cover_health_paths_only(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Assert on matching behaviour rather than the literal pattern string.

        The value is a set of anchored regexes, not bare paths, because OpenTelemetry applies
        ``re.search`` to these entries. See ``build_excluded_urls``.
        """

        monkeypatch.delenv("EXP_OTEL_EXCLUDED_URLS", raising=False)

        settings = get_telemetry_settings()
        exclude_list = parse_excluded_urls(settings.excluded_urls)

        assert exclude_list.url_disabled("/api/health") is True
        assert exclude_list.url_disabled("/api/ready") is True
        assert exclude_list.url_disabled("/health") is True
        assert exclude_list.url_disabled("/admin") is False
        assert exclude_list.url_disabled("/api/healthy") is False
