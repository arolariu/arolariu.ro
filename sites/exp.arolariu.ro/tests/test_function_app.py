"""Tests for exp FastAPI endpoints."""

import base64
import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


def _encode_client_principal(identifier: str) -> str:
    payload = {"claims": [{"typ": "oid", "val": identifier}]}
    return base64.b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")


@pytest.fixture(autouse=True)
def mock_config(monkeypatch):
    """Mock config dependencies for endpoint tests."""
    test_config = {
        "Endpoints:StorageAccount": "http://localhost:10000",
        "Endpoints:SQL": "http://localhost:8082",
        "Common:Auth:Issuer": "https://localhost:5000",
    }

    monkeypatch.setenv("INFRA", "local")
    monkeypatch.delenv("EXP_CALLER_API_IDS", raising=False)
    monkeypatch.delenv("EXP_CALLER_WEBSITE_IDS", raising=False)

    with (
        patch("function_app.load_config"),
        patch("exp_service.api.routers.health.get_config", return_value=test_config),
        patch("exp_service.api.routers.config.get_config", return_value=test_config),
        patch("exp_service.api.routers.config.get_config_value", side_effect=test_config.get),
        patch(
            "exp_service.api.routers.config.get_config_section",
            side_effect=lambda prefix: {
                key: value for key, value in test_config.items() if key.startswith(f"{prefix}:")
            },
        ),
    ):
        yield


@pytest.fixture
def client() -> TestClient:
    from function_app import app

    return TestClient(app)


class TestGetHealth:
    def test_returns_healthy(self, client: TestClient):
        response = client.get("/api/health")
        body = response.json()
        assert response.status_code == 200
        assert body["status"] == "Healthy"

    def test_returns_ready(self, client: TestClient):
        response = client.get("/api/ready")
        body = response.json()
        assert response.status_code == 200
        assert body["status"] == "Ready"
        assert response.headers.get("X-Request-Id")
        assert response.headers.get("X-Content-Type-Options") == "nosniff"


class TestGetCatalog:
    def test_v1_catalog_route_removed(self, client: TestClient):
        response = client.get("/api/catalog", params={"for": "website"})
        assert response.status_code == 404

    def test_returns_catalog_for_website(self, client: TestClient):
        response = client.get(
            "/api/v2/catalog",
            params={"for": "website"},
            headers={"X-Exp-Target": "website"},
        )
        body = response.json()

        assert response.status_code == 200
        assert body["target"] == "website"
        assert "requiredKeys" in body
        assert isinstance(body["requiredKeys"], list)

    def test_returns_400_for_unknown_target(self, client: TestClient):
        response = client.get("/api/v2/catalog", params={"for": "unknown"})
        assert response.status_code == 400

    def test_returns_401_for_azure_caller_without_identity(self, client: TestClient, monkeypatch):
        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_API_IDS", "api-caller-1")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "website-caller-1")

        response = client.get("/api/v2/catalog", params={"for": "api"})
        assert response.status_code == 401


class TestGetConfigValue:
    def test_returns_401_when_local_target_header_missing(self, client: TestClient):
        response = client.get("/api/v2/config/Endpoints:StorageAccount")
        assert response.status_code == 401

    def test_returns_value_for_existing_key(self, client: TestClient):
        response = client.get(
            "/api/v2/config/Endpoints:StorageAccount",
            headers={"X-Exp-Target": "api"},
        )
        body = response.json()
        assert response.status_code == 200
        assert body["key"] == "Endpoints:StorageAccount"
        assert body["value"] == "http://localhost:10000"
        assert response.headers.get("Cache-Control") == "no-store"
        assert response.headers.get("Pragma") == "no-cache"

    def test_returns_500_for_missing_required_key(self, client: TestClient):
        response = client.get(
            "/api/v2/config/Common:Auth:Audience",
            headers={"X-Exp-Target": "api"},
        )
        assert response.status_code == 500

    def test_returns_403_for_disallowed_key_in_azure_mode(self, client: TestClient, monkeypatch):
        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_API_IDS", "api-caller-1")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "website-caller-1")

        response = client.get(
            "/api/v2/config/Common:Auth:Secret",
            headers={
                "X-MS-CLIENT-PRINCIPAL-ID": "website-caller-1",
                "X-MS-CLIENT-PRINCIPAL": _encode_client_principal("website-caller-1"),
            },
        )

        assert response.status_code == 403


class TestGetConfigBatch:
    def test_v1_config_route_removed(self, client: TestClient):
        response = client.get("/api/config")
        assert response.status_code == 404

    def test_returns_batch_values(self, client: TestClient):
        response = client.get(
            "/api/v2/config",
            params={"keys": "Endpoints:StorageAccount,Common:Auth:Issuer"},
            headers={"X-Exp-Target": "api"},
        )
        body = response.json()
        assert response.status_code == 200
        assert len(body["values"]) == 2

    def test_returns_section_by_prefix(self, client: TestClient):
        response = client.get(
            "/api/v2/config",
            params={"prefix": "Endpoints"},
            headers={"X-Exp-Target": "api"},
        )
        body = response.json()
        assert response.status_code == 200
        assert len(body["values"]) == 2

    def test_returns_400_without_params(self, client: TestClient):
        response = client.get("/api/v2/config")
        assert response.status_code == 400

    def test_returns_400_for_invalid_prefix_format(self, client: TestClient):
        response = client.get(
            "/api/v2/config",
            params={"prefix": "Endpoints:*"},
            headers={"X-Exp-Target": "api"},
        )

        assert response.status_code == 400

    def test_returns_403_for_disallowed_batch_keys_in_azure_mode(self, client: TestClient, monkeypatch):
        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_API_IDS", "api-caller-1")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "website-caller-1")

        response = client.get(
            "/api/v2/config",
            params={"keys": "Common:Auth:Secret"},
            headers={
                "X-MS-CLIENT-PRINCIPAL-ID": "website-caller-1",
                "X-MS-CLIENT-PRINCIPAL": _encode_client_principal("website-caller-1"),
            },
        )

        body = response.json()
        assert response.status_code == 403
        assert body["deniedKeys"] == ["Common:Auth:Secret"]
