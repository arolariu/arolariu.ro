"""Tests for the /api/v1/build-time slice."""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

_FULL_WEBSITE_CONFIG: dict[str, str] = {
    "Storage:Blob:Endpoint": "http://127.0.0.1:10000",
    "Auth:JWT:Issuer": "https://localhost:5000",
    "Auth:JWT:Audience": "https://localhost:3000",
    "Auth:JWT:Secret": "local-secret",
    "Service:Api:Url": "https://localhost:5000",
}

_EMPTY_CONFIG: dict[str, str] = {}


class TestBuildTimeValidation:
    def test_returns_400_without_for_param(self, client: TestClient):
        with patch("api.build_time.get_config", return_value=_EMPTY_CONFIG):
            response = client.get("/api/v1/build-time", headers={"X-Exp-Target": "website"})

        assert response.status_code == 400

    def test_returns_400_for_unknown_target(self, client: TestClient):
        with patch("api.build_time.get_config", return_value=_EMPTY_CONFIG):
            response = client.get("/api/v1/build-time", params={"for": "unknown"})

        assert response.status_code == 400

    def test_returns_500_when_required_keys_missing(self, client: TestClient):
        with patch("api.build_time.get_config", return_value=_EMPTY_CONFIG):
            response = client.get(
                "/api/v1/build-time",
                params={"for": "website"},
                headers={"X-Exp-Target": "website"},
            )

        body = response.json()
        assert response.status_code == 500
        assert "missingRequiredKeys" in body


class TestBuildTimeAuthorization:
    def test_returns_401_in_azure_mode_without_identity(self, client: TestClient, monkeypatch):
        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_API_IDS", "api-1")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "website-1")

        with patch("api.build_time.get_config", return_value=_FULL_WEBSITE_CONFIG):
            response = client.get("/api/v1/build-time", params={"for": "api"})

        assert response.status_code == 401


class TestBuildTimeContract:
    def test_returns_build_time_config_for_website(self, client: TestClient):
        with patch("api.build_time.get_config", return_value=_FULL_WEBSITE_CONFIG):
            response = client.get(
                "/api/v1/build-time",
                params={"for": "website"},
                headers={"X-Exp-Target": "website"},
            )

        body = response.json()
        assert response.status_code == 200
        assert body["target"] == "website"
        assert body["contractVersion"] == "1"
        assert body["config"]["Service:Api:Url"] == "https://localhost:5000"
        assert "Auth:JWT:Secret" not in body["config"]
        assert response.headers.get("Cache-Control") == "no-store"
