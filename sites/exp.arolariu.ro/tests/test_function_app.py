"""Tests for function_app HTTP triggers."""

import base64
import json
import pytest
from unittest.mock import patch
import azure.functions as func


@pytest.fixture(autouse=True)
def mock_config():
    """Mock the config loader for all tests."""
    test_config = {
        "Endpoints:StorageAccount": "http://localhost:10000",
        "Endpoints:SQL": "http://localhost:8082",
        "Common:Auth:Issuer": "https://localhost:5000",
    }
    with patch("function_app.load_config"), \
         patch("function_app.get_config", return_value=test_config), \
         patch("function_app.get_config_value", side_effect=test_config.get), \
         patch("function_app.get_config_section", side_effect=lambda prefix: {
             k: v for k, v in test_config.items() if k.startswith(f"{prefix}:")
         }):
        yield


def _encode_client_principal(identifier: str) -> str:
    payload = {"claims": [{"typ": "oid", "val": identifier}]}
    return base64.b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")


class TestGetHealth:
    def test_returns_healthy(self):
        from function_app import get_health
        req = func.HttpRequest(method="GET", body=b"", url="/api/health")
        resp = get_health(req)
        body = json.loads(resp.get_body())
        assert resp.status_code == 200
        assert body["status"] == "Healthy"


class TestGetCatalog:
    def test_returns_catalog_for_website(self):
        from function_app import get_catalog_endpoint

        req = func.HttpRequest(
            method="GET",
            body=b"",
            url="/api/catalog?for=website",
            params={"for": "website"},
        )

        resp = get_catalog_endpoint(req)
        body = json.loads(resp.get_body())

        assert resp.status_code == 200
        assert body["target"] == "website"
        assert "requiredKeys" in body
        assert isinstance(body["requiredKeys"], list)

    def test_returns_400_for_unknown_target(self):
        from function_app import get_catalog_endpoint

        req = func.HttpRequest(
            method="GET",
            body=b"",
            url="/api/catalog?for=unknown",
            params={"for": "unknown"},
        )

        resp = get_catalog_endpoint(req)
        assert resp.status_code == 400

    def test_returns_401_for_azure_caller_without_identity(self, monkeypatch):
        from function_app import get_catalog_endpoint

        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_API_IDS", "api-caller-1")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "website-caller-1")

        req = func.HttpRequest(
            method="GET",
            body=b"",
            url="/api/catalog?for=api",
            params={"for": "api"},
            headers={},
        )

        resp = get_catalog_endpoint(req)
        assert resp.status_code == 401


class TestGetConfigValue:
    def test_returns_401_when_local_target_header_missing(self):
        from function_app import get_config_value_endpoint
        req = func.HttpRequest(
            method="GET",
            body=b"",
            url="/api/config/Endpoints:StorageAccount",
            route_params={"key": "Endpoints:StorageAccount"},
            headers={},
        )
        resp = get_config_value_endpoint(req)
        assert resp.status_code == 401

    def test_returns_value_for_existing_key(self):
        from function_app import get_config_value_endpoint
        req = func.HttpRequest(
            method="GET", body=b"", url="/api/config/Endpoints:StorageAccount",
            route_params={"key": "Endpoints:StorageAccount"},
            headers={"X-Exp-Target": "api"},
        )
        resp = get_config_value_endpoint(req)
        body = json.loads(resp.get_body())
        assert resp.status_code == 200
        assert body["key"] == "Endpoints:StorageAccount"
        assert body["value"] == "http://localhost:10000"

    def test_returns_500_for_missing_required_key(self):
        from function_app import get_config_value_endpoint
        req = func.HttpRequest(
            method="GET", body=b"", url="/api/config/Common:Auth:Audience",
            route_params={"key": "Common:Auth:Audience"},
            headers={"X-Exp-Target": "api"},
        )
        resp = get_config_value_endpoint(req)
        assert resp.status_code == 500

    def test_returns_403_for_disallowed_key_in_azure_mode(self, monkeypatch):
        from function_app import get_config_value_endpoint

        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_API_IDS", "api-caller-1")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "website-caller-1")

        req = func.HttpRequest(
            method="GET",
            body=b"",
            url="/api/config/Common:Auth:Secret",
            route_params={"key": "Common:Auth:Secret"},
            headers={
                "X-MS-CLIENT-PRINCIPAL-ID": "website-caller-1",
                "X-MS-CLIENT-PRINCIPAL": _encode_client_principal("website-caller-1"),
            },
        )

        resp = get_config_value_endpoint(req)
        assert resp.status_code == 403


class TestGetConfigBatch:
    def test_returns_batch_values(self):
        from function_app import get_config_batch
        req = func.HttpRequest(
            method="GET", body=b"",
            url="/api/config?keys=Endpoints:StorageAccount,Common:Auth:Issuer",
            params={"keys": "Endpoints:StorageAccount,Common:Auth:Issuer"},
            headers={"X-Exp-Target": "api"},
        )
        resp = get_config_batch(req)
        body = json.loads(resp.get_body())
        assert resp.status_code == 200
        assert len(body["values"]) == 2

    def test_returns_section_by_prefix(self):
        from function_app import get_config_batch
        req = func.HttpRequest(
            method="GET", body=b"",
            url="/api/config?prefix=Endpoints",
            params={"prefix": "Endpoints"},
            headers={"X-Exp-Target": "api"},
        )
        resp = get_config_batch(req)
        body = json.loads(resp.get_body())
        assert resp.status_code == 200
        assert len(body["values"]) == 2

    def test_returns_400_without_params(self):
        from function_app import get_config_batch
        req = func.HttpRequest(
            method="GET", body=b"", url="/api/config",
            params={},
        )
        resp = get_config_batch(req)
        assert resp.status_code == 400

    def test_returns_400_for_invalid_prefix_format(self):
        from function_app import get_config_batch

        req = func.HttpRequest(
            method="GET",
            body=b"",
            url="/api/config?prefix=Endpoints:*",
            params={"prefix": "Endpoints:*"},
            headers={"X-Exp-Target": "api"},
        )

        resp = get_config_batch(req)
        assert resp.status_code == 400

    def test_returns_403_for_disallowed_batch_keys_in_azure_mode(self, monkeypatch):
        from function_app import get_config_batch

        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_API_IDS", "api-caller-1")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "website-caller-1")

        req = func.HttpRequest(
            method="GET",
            body=b"",
            url="/api/config?keys=Common:Auth:Secret",
            params={"keys": "Common:Auth:Secret"},
            headers={
                "X-MS-CLIENT-PRINCIPAL-ID": "website-caller-1",
                "X-MS-CLIENT-PRINCIPAL": _encode_client_principal("website-caller-1"),
            },
        )

        resp = get_config_batch(req)
        body = json.loads(resp.get_body())
        assert resp.status_code == 403
        assert body["deniedKeys"] == ["Common:Auth:Secret"]
