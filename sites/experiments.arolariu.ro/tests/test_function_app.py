"""Tests for function_app HTTP triggers."""

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


class TestGetHealth:
    def test_returns_healthy(self):
        from function_app import get_health
        req = func.HttpRequest(method="GET", body=b"", url="/api/health")
        resp = get_health(req)
        body = json.loads(resp.get_body())
        assert resp.status_code == 200
        assert body["status"] == "Healthy"


class TestGetConfigValue:
    def test_returns_value_for_existing_key(self):
        from function_app import get_config_value_endpoint
        req = func.HttpRequest(
            method="GET", body=b"", url="/api/config/Endpoints:StorageAccount",
            route_params={"key": "Endpoints:StorageAccount"},
        )
        resp = get_config_value_endpoint(req)
        body = json.loads(resp.get_body())
        assert resp.status_code == 200
        assert body["key"] == "Endpoints:StorageAccount"
        assert body["value"] == "http://localhost:10000"

    def test_returns_404_for_missing_key(self):
        from function_app import get_config_value_endpoint
        req = func.HttpRequest(
            method="GET", body=b"", url="/api/config/Missing:Key",
            route_params={"key": "Missing:Key"},
        )
        resp = get_config_value_endpoint(req)
        assert resp.status_code == 404


class TestGetConfigBatch:
    def test_returns_batch_values(self):
        from function_app import get_config_batch
        req = func.HttpRequest(
            method="GET", body=b"",
            url="/api/config?keys=Endpoints:StorageAccount,Common:Auth:Issuer",
            params={"keys": "Endpoints:StorageAccount,Common:Auth:Issuer"},
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
