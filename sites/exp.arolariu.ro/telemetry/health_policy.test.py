"""Tests for the health telemetry suppression policy."""

import pytest

from telemetry.health_policy import (
    is_suppressed_path,
    parse_suppression_flag,
    should_suppress_telemetry,
)


class TestIsSuppressedPath:
    """Behaviour of the suppressed-path predicate."""

    @pytest.mark.parametrize(
        "path",
        ["/health", "/api/health", "/api/ready", "/HEALTH", "/Api/Health", "/health/", "/api/ready?x=1"],
    )
    def test_returns_true_for_health_paths(self, path: str) -> None:
        assert is_suppressed_path(path) is True

    @pytest.mark.parametrize(
        "path",
        ["/", "/admin", "/api/v1/config", "/api/healthy", "/healthcheck-admin", "", None],
    )
    def test_returns_false_for_other_paths(self, path: str | None) -> None:
        assert is_suppressed_path(path) is False


class TestParseSuppressionFlag:
    """Behaviour of the environment variable parser."""

    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            (None, True),
            ("", True),
            ("   ", True),
            ("true", True),
            ("TRUE", True),
            ("not-a-bool", True),
            ("false", False),
            ("False", False),
        ],
    )
    def test_parses_value(self, raw: str | None, expected: bool) -> None:
        assert parse_suppression_flag(raw) is expected


class TestShouldSuppressTelemetry:
    """Combined path and environment gate."""

    def test_suppresses_health_path_by_default(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("OTEL_SUPPRESS_HEALTH_TELEMETRY", raising=False)

        assert should_suppress_telemetry("/api/health") is True

    def test_never_suppresses_real_route(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("OTEL_SUPPRESS_HEALTH_TELEMETRY", raising=False)

        assert should_suppress_telemetry("/api/v1/config") is False

    def test_override_restores_health_telemetry(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("OTEL_SUPPRESS_HEALTH_TELEMETRY", "false")

        assert should_suppress_telemetry("/api/health") is False
