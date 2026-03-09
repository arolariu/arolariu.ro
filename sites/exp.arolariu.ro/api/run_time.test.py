"""Tests for the /api/v1/run-time slice."""

from __future__ import annotations

import base64
import json
from unittest.mock import patch

from fastapi.testclient import TestClient


def _encode_principal(identifier: str) -> str:
    payload = {"claims": [{"typ": "oid", "val": identifier}]}
    return base64.b64encode(json.dumps(payload).encode()).decode()


_FULL_WEBSITE_CONFIG: dict[str, str] = {
    "Auth:Clerk:PublishableKey": "pk_test_placeholder",
    "Auth:Clerk:SecretKey": "sk_test_placeholder",
    "Auth:JWT:Audience": "https://localhost:3000",
    "Auth:JWT:Issuer": "https://localhost:5000",
    "Auth:JWT:Secret": "local-secret",
    "Communication:Email:ApiKey": "",
    "Endpoints:Service:Api": "https://localhost:5000",
    "Endpoints:Storage:Blob": "http://127.0.0.1:10000",
    "FeatureManagement:website.commander.enabled": "true",
    "FeatureManagement:website.web-vitals.enabled": "false",
    "Site:Environment": "Development",
    "Site:Name": "dev.arolariu.ro",
    "Site:Url": "http://localhost:3000",
    "Site:UseCdn": "false",
}

_EMPTY_CONFIG: dict[str, str] = {}


class TestRunTimeValidation:
    def test_returns_400_without_for_param(self, client: TestClient):
        with patch("api.run_time.get_config", return_value=_EMPTY_CONFIG):
            response = client.get("/api/v1/run-time", headers={"X-Exp-Target": "website"})

        assert response.status_code == 400

    def test_returns_400_for_unknown_target(self, client: TestClient):
        with patch("api.run_time.get_config", return_value=_EMPTY_CONFIG):
            response = client.get("/api/v1/run-time", params={"for": "unknown"})

        assert response.status_code == 400

    def test_returns_500_when_required_keys_missing(self, client: TestClient):
        with patch("api.run_time.get_config", return_value=_EMPTY_CONFIG):
            response = client.get(
                "/api/v1/run-time",
                params={"for": "website"},
                headers={"X-Exp-Target": "website"},
            )

        body = response.json()
        assert response.status_code == 500
        assert "missingRequiredKeys" in body
        assert len(body["missingRequiredKeys"]) > 0


class TestRunTimeAuthorization:
    def test_returns_500_when_infra_mode_missing(self, client: TestClient, monkeypatch):
        monkeypatch.delenv("INFRA", raising=False)
        with patch("api.run_time.get_config", return_value=_FULL_WEBSITE_CONFIG):
            response = client.get("/api/v1/run-time", params={"for": "website"})

        assert response.status_code == 500

    def test_returns_401_in_azure_mode_without_identity(self, client: TestClient, monkeypatch):
        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "website-1")
        with patch("api.run_time.get_config", return_value=_FULL_WEBSITE_CONFIG):
            response = client.get("/api/v1/run-time", params={"for": "website"})

        assert response.status_code == 401

    def test_allows_authorized_azure_caller(self, client: TestClient, monkeypatch):
        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "website-1")
        with patch("api.run_time.get_config", return_value=_FULL_WEBSITE_CONFIG):
            response = client.get(
                "/api/v1/run-time",
                params={"for": "website"},
                headers={
                    "X-MS-CLIENT-PRINCIPAL-ID": "website-1",
                    "X-MS-CLIENT-PRINCIPAL": _encode_principal("website-1"),
                },
            )

        assert response.status_code == 200

    def test_denies_api_caller_requesting_website_runtime(self, client: TestClient, monkeypatch):
        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_API_IDS", "api-1")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "website-1")
        with patch("api.run_time.get_config", return_value=_FULL_WEBSITE_CONFIG):
            response = client.get(
                "/api/v1/run-time",
                params={"for": "website"},
                headers={
                    "X-MS-CLIENT-PRINCIPAL-ID": "api-1",
                    "X-MS-CLIENT-PRINCIPAL": _encode_principal("api-1"),
                },
            )

        assert response.status_code == 403


class TestRunTimeContract:
    def test_response_has_required_fields(self, client: TestClient):
        with patch("api.run_time.get_config", return_value=_FULL_WEBSITE_CONFIG):
            response = client.get(
                "/api/v1/run-time",
                params={"for": "website"},
                headers={"X-Exp-Target": "website"},
            )

        body = response.json()
        assert response.status_code == 200
        assert body["target"] == "website"
        assert body["contractVersion"] == "1"
        assert isinstance(body["version"], str)
        assert isinstance(body["config"], dict)
        assert isinstance(body["features"], dict)
        assert isinstance(body["refreshIntervalSeconds"], int)
        assert "fetchedAt" in body

    def test_features_contain_website_flag_ids(self, client: TestClient):
        with patch("api.run_time.get_config", return_value=_FULL_WEBSITE_CONFIG):
            response = client.get(
                "/api/v1/run-time",
                params={"for": "website"},
                headers={"X-Exp-Target": "website"},
            )

        body = response.json()
        assert response.status_code == 200
        assert body["features"]["website.commander.enabled"] is True
        assert body["features"]["website.web-vitals.enabled"] is False

    def test_response_has_no_store_cache_headers(self, client: TestClient):
        with patch("api.run_time.get_config", return_value=_FULL_WEBSITE_CONFIG):
            response = client.get(
                "/api/v1/run-time",
                params={"for": "website"},
                headers={"X-Exp-Target": "website"},
            )

        assert response.status_code == 200
        assert response.headers.get("Cache-Control") == "no-store"
        assert response.headers.get("Pragma") == "no-cache"
