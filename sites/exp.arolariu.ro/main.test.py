"""Tests for the exp FastAPI composition root."""

from __future__ import annotations

from collections.abc import Iterator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from config.loader import ConfigLoaderStats


@pytest.fixture(autouse=True)
def mock_config(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Mock config dependencies for probe and routing tests."""

    test_config = {
        "Auth:Clerk:PublishableKey": "pk_test_placeholder",
        "Auth:Clerk:SecretKey": "sk_test_placeholder",
        "Auth:JWT:Audience": "https://localhost:3000",
        "Auth:JWT:Issuer": "https://localhost:5000",
        "Endpoints:Service:Api": "https://localhost:5000",
        "Endpoints:Storage:Blob": "http://127.0.0.1:10000",
        "Site:Environment": "Development",
        "Site:Name": "dev.arolariu.ro",
        "Site:Url": "http://localhost:3000",
        "Site:UseCdn": "false",
    }

    with (
        patch("api.health.get_config", return_value=test_config),
        patch(
            "api.health.get_config_stats",
            return_value=ConfigLoaderStats(
                keys_loaded=len(test_config),
                load_count=1,
                last_loaded_at="2026-03-07T00:00:00+00:00",
            ),
        ),
    ):
        yield


class TestOperationalProbes:
    def test_returns_healthy(self, client: TestClient):
        response = client.get("/api/health")
        body = response.json()

        assert response.status_code == 200
        assert body["status"] == "Healthy"
        assert body["requestsServed"] == 1
        assert body["requestsByPath"]["/api/health"] == 1
        assert body["configKeysLoaded"] == 10
        assert body["configLoadCount"] == 1
        assert body["hostname"]
        assert body["processId"] > 0
        assert body["configResponsesServed"] == 0
        assert body["configResponsesByCaller"] == {}
        assert body["configValuesByCaller"] == {}

    def test_returns_ready(self, client: TestClient):
        response = client.get("/api/ready")
        body = response.json()

        assert response.status_code == 200
        assert body["status"] == "Ready"
        assert response.headers.get("X-Request-Id")
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert body["keysLoaded"] == 10

    def test_health_tracks_served_config_metrics(self, client: TestClient):
        website_config = {
            "Auth:Clerk:PublishableKey": "pk_test_placeholder",
            "Auth:Clerk:SecretKey": "sk_test_placeholder",
            "Auth:JWT:Audience": "https://localhost:3000",
            "Auth:JWT:Issuer": "https://localhost:5000",
            "Endpoints:Service:Api": "https://localhost:5000",
            "Endpoints:Storage:Blob": "http://127.0.0.1:10000",
            "Site:Environment": "Development",
            "Site:Name": "dev.arolariu.ro",
            "Site:Url": "http://localhost:3000",
            "Site:UseCdn": "false",
        }

        with (
            patch("api.build_time.get_config", return_value=website_config),
            patch("api.config.get_config", return_value=website_config),
        ):
            build_time_response = client.get(
                "/api/v1/build-time",
                params={"for": "website"},
                headers={"X-Exp-Target": "website"},
            )
            config_response = client.get(
                "/api/v1/config",
                params={"name": "Endpoints:Service:Api"},
                headers={"X-Exp-Target": "website"},
            )

        health_response = client.get("/api/health")
        body = health_response.json()

        assert build_time_response.status_code == 200
        assert config_response.status_code == 200
        assert health_response.status_code == 200
        assert body["configResponsesServed"] == 2
        assert body["configValuesServed"] == 11
        assert body["configResponsesByEndpoint"] == {"build-time": 1, "config": 1}
        assert body["configResponsesByTarget"] == {"website": 2}
        assert body["configResponsesByCaller"] == {"local:website": 2}
        assert body["configValuesByTarget"] == {"website": 11}
        assert body["configValuesByCaller"] == {"local:website": 11}
        assert body["configValuesByName"]["Endpoints:Service:Api"] == 2
        assert body["requestsServed"] == 3


class TestLegacyRoutesRemoved:
    @pytest.mark.parametrize("path", ["/api/v2/build-time", "/api/v2/run-time", "/api/v2/config"])
    def test_returns_404_for_removed_routes(self, client: TestClient, path: str):
        response = client.get(path)
        assert response.status_code == 404


class TestRequestCorrelation:
    def test_preserves_upstream_request_id(self, client: TestClient):
        upstream_request_id = "trace-request-correlation-id"

        response = client.get(
            "/api/ready",
            headers={"X-Request-Id": upstream_request_id},
        )

        assert response.status_code == 200
        assert response.headers.get("X-Request-Id") == upstream_request_id
