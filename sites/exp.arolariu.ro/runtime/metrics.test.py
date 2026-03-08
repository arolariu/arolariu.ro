"""Tests for the process-local runtime metrics module."""

from __future__ import annotations

from runtime.metrics import (
    get_process_runtime_snapshot,
    get_request_metrics_snapshot,
    get_served_config_metrics_snapshot,
    record_config_delivery,
    record_request,
    reset_metrics,
)


class TestResetMetrics:
    def test_clears_request_counters(self) -> None:
        record_request("/api/health")
        record_request("/api/v1/config")
        reset_metrics()

        snapshot = get_request_metrics_snapshot()
        assert snapshot.total_requests == 0
        assert snapshot.requests_by_path == {}

    def test_clears_config_delivery_counters(self) -> None:
        record_config_delivery(
            "build-time", "api", ["Auth:JWT:Secret"], caller_label="local:api"
        )
        reset_metrics()

        snapshot = get_served_config_metrics_snapshot()
        assert snapshot.responses_total == 0
        assert snapshot.values_total == 0
        assert snapshot.responses_by_endpoint == {}
        assert snapshot.responses_by_target == {}
        assert snapshot.responses_by_caller == {}
        assert snapshot.values_by_target == {}
        assert snapshot.values_by_caller == {}
        assert snapshot.values_by_name == {}
        assert snapshot.last_served_at is None


class TestRecordRequest:
    def test_increments_total_count(self) -> None:
        record_request("/api/health")
        record_request("/api/health")

        snapshot = get_request_metrics_snapshot()
        assert snapshot.total_requests == 2

    def test_tracks_by_path(self) -> None:
        record_request("/api/health")
        record_request("/api/v1/config")
        record_request("/api/health")

        snapshot = get_request_metrics_snapshot()
        assert snapshot.requests_by_path["/api/health"] == 2
        assert snapshot.requests_by_path["/api/v1/config"] == 1


class TestRecordConfigDelivery:
    def test_increments_response_total(self) -> None:
        record_config_delivery(
            "build-time", "api", ["Auth:JWT:Secret", "Auth:JWT:Issuer"], caller_label="local:api"
        )

        snapshot = get_served_config_metrics_snapshot()
        assert snapshot.responses_total == 1
        assert snapshot.values_total == 2

    def test_tracks_by_endpoint(self) -> None:
        record_config_delivery("build-time", "api", ["key1"], caller_label="local:api")
        record_config_delivery("run-time", "website", ["key1", "key2"], caller_label="local:website")

        snapshot = get_served_config_metrics_snapshot()
        assert snapshot.responses_by_endpoint["build-time"] == 1
        assert snapshot.responses_by_endpoint["run-time"] == 1

    def test_tracks_by_target(self) -> None:
        record_config_delivery("build-time", "api", ["key1"], caller_label="local:api")
        record_config_delivery("run-time", "api", ["key1"], caller_label="local:api")
        record_config_delivery("run-time", "website", ["key1"], caller_label="local:website")

        snapshot = get_served_config_metrics_snapshot()
        assert snapshot.responses_by_target["api"] == 2
        assert snapshot.responses_by_target["website"] == 1

    def test_tracks_by_caller(self) -> None:
        record_config_delivery("config", "api", ["key1"], caller_label="principal-id-1")
        record_config_delivery("config", "api", ["key2"], caller_label="principal-id-1")
        record_config_delivery("config", "website", ["key1"], caller_label="local:website")

        snapshot = get_served_config_metrics_snapshot()
        assert snapshot.responses_by_caller["principal-id-1"] == 2
        assert snapshot.responses_by_caller["local:website"] == 1

    def test_tracks_values_by_name(self) -> None:
        record_config_delivery("config", "api", ["Auth:JWT:Secret"], caller_label="local:api")
        record_config_delivery("config", "api", ["Auth:JWT:Secret", "Auth:JWT:Issuer"], caller_label="local:api")

        snapshot = get_served_config_metrics_snapshot()
        assert snapshot.values_by_name["Auth:JWT:Secret"] == 2
        assert snapshot.values_by_name["Auth:JWT:Issuer"] == 1

    def test_sets_last_served_at(self) -> None:
        record_config_delivery("build-time", "api", ["key1"], caller_label="local:api")

        snapshot = get_served_config_metrics_snapshot()
        assert snapshot.last_served_at is not None

    def test_normalizes_labels_to_lowercase(self) -> None:
        record_config_delivery("Build-Time", "API", ["key1"], caller_label="LOCAL:API")

        snapshot = get_served_config_metrics_snapshot()
        assert "build-time" in snapshot.responses_by_endpoint
        assert "api" in snapshot.responses_by_target
        assert "local:api" in snapshot.responses_by_caller


class TestProcessRuntimeSnapshot:
    def test_returns_positive_uptime(self) -> None:
        snapshot = get_process_runtime_snapshot()
        assert snapshot.uptime_seconds >= 0

    def test_returns_valid_hostname(self) -> None:
        snapshot = get_process_runtime_snapshot()
        assert isinstance(snapshot.hostname, str)
        assert len(snapshot.hostname) > 0

    def test_returns_valid_process_id(self) -> None:
        snapshot = get_process_runtime_snapshot()
        assert snapshot.process_id > 0

    def test_returns_iso_format_started_at(self) -> None:
        snapshot = get_process_runtime_snapshot()
        assert "T" in snapshot.started_at
