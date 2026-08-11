"""Tests for the health telemetry suppression policy."""

import pytest

from telemetry.health_policy import (
    build_excluded_urls,
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

class TestBuildExcludedUrls:
    """Exclusion patterns handed to FastAPIInstrumentor must match is_suppressed_path exactly."""

    @pytest.mark.parametrize(
        "path",
        ["/health", "/health/", "/HEALTH", "/api/health", "/api/health?x=1", "/api/health/?x=1", "/api/ready"],
    )
    def test_excludes_every_suppressed_path(self, path: str) -> None:
        from opentelemetry.util.http import parse_excluded_urls

        assert parse_excluded_urls(build_excluded_urls()).url_disabled(path) is True

    @pytest.mark.parametrize(
        "path",
        ["/api/healthy", "/api/health/extra", "/healthcheck-admin", "/api/v1/config", "/admin", "/"],
    )
    def test_does_not_exclude_near_misses(self, path: str) -> None:
        """Regression: bare paths are unanchored regexes and would swallow these."""

        from opentelemetry.util.http import parse_excluded_urls

        assert parse_excluded_urls(build_excluded_urls()).url_disabled(path) is False

    def test_agrees_with_is_suppressed_path(self) -> None:
        """The regex and the predicate are two encodings of one policy; they must not drift."""

        from opentelemetry.util.http import parse_excluded_urls

        exclude_list = parse_excluded_urls(build_excluded_urls())
        for path in [
            "/health",
            "/api/health",
            "/api/ready",
            "/api/healthy",
            "/api/health/extra",
            "/healthcheck-admin",
            "/admin",
            "/api/v1/config",
            "/",
        ]:
            assert exclude_list.url_disabled(path) is is_suppressed_path(path), path
