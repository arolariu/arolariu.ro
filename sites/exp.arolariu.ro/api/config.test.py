"""Tests for the `/api/v1/config` single-key configuration slice."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

_CONFIG_SNAPSHOT: dict[str, str] = {
    "Auth:JWT:Secret": "local-secret",
    "Auth:JWT:Issuer": "https://localhost:5000",
    "Auth:JWT:Audience": "https://localhost:3000",
    "Endpoint:Service:Api": "https://localhost:5000",
}


@pytest.fixture(autouse=True)
def local_token(base_env: None, monkeypatch: pytest.MonkeyPatch) -> None:
    """Enable the shared local token expected by config authorization tests."""

    monkeypatch.setenv("EXP_LOCAL_SHARED_TOKEN", "local-dev-token")


class TestConfigValidation:
    def test_requires_name_query_parameter(self, client: TestClient) -> None:
        """The endpoint should reject requests without a config name."""

        response = client.get("/api/v1/config", headers={"X-Exp-Local-Token": "local-dev-token"})

        assert response.status_code == 400
        assert response.json()["error"] == "Query parameter 'name' is required."

    def test_rejects_unknown_config_name(self, client: TestClient) -> None:
        """Unknown config keys should fail before snapshot lookup occurs."""

        response = client.get(
            "/api/v1/config",
            params={"name": "Missing:Config"},
            headers={"X-Exp-Local-Token": "local-dev-token"},
        )

        assert response.status_code == 400
        assert response.json()["error"] == "Unknown config 'Missing:Config'."


class TestConfigAuthorization:
    def test_requires_local_token_when_configured(self, client: TestClient) -> None:
        """Local mode should enforce the shared token when it is configured."""

        with patch("api.config.get_config", return_value=_CONFIG_SNAPSHOT):
            response = client.get("/api/v1/config", params={"name": "Endpoint:Service:Api"})

        assert response.status_code == 401
        assert response.json()["error"] == "Missing or invalid local token."

    def test_requires_target_header_for_shared_keys(self, client: TestClient) -> None:
        """Shared keys should require an explicit target header in local mode."""

        with patch("api.config.get_config", return_value=_CONFIG_SNAPSHOT):
            response = client.get(
                "/api/v1/config",
                params={"name": "Auth:JWT:Secret"},
                headers={"X-Exp-Local-Token": "local-dev-token"},
            )

        assert response.status_code == 400
        assert (
            response.json()["error"]
            == "Header 'X-Exp-Target' is required when a config key is shared across multiple targets."
        )

    def test_rejects_target_header_not_owned_by_key(self, client: TestClient) -> None:
        """A caller should not be able to force an unrelated target onto a unique key."""

        with patch("api.config.get_config", return_value=_CONFIG_SNAPSHOT):
            response = client.get(
                "/api/v1/config",
                params={"name": "Endpoint:Service:Api"},
                headers={
                    "X-Exp-Local-Token": "local-dev-token",
                    "X-Exp-Target": "api",
                },
            )

        assert response.status_code == 403
        assert (
            response.json()["error"]
            == "Header target 'api' is not allowed. Expected one of: website."
        )


class TestConfigContract:
    def test_returns_single_value_for_unique_key(self, client: TestClient) -> None:
        """Unique config keys should resolve without an explicit target header."""

        with patch("api.config.get_config", return_value=_CONFIG_SNAPSHOT):
            response = client.get(
                "/api/v1/config",
                params={"name": "Endpoint:Service:Api"},
                headers={"X-Exp-Local-Token": "local-dev-token"},
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["name"] == "Endpoint:Service:Api"
        assert payload["value"] == "https://localhost:5000"
        assert payload["availableForTargets"] == ["website"]
        assert payload["availableInDocuments"] == ["website.build-time", "website.run-time"]
        assert payload["requiredInDocuments"] == ["website.build-time", "website.run-time"]

    def test_returns_single_value_for_shared_key_with_explicit_target(self, client: TestClient) -> None:
        """Shared config keys should resolve once the caller states which target it is acting as."""

        with patch("api.config.get_config", return_value=_CONFIG_SNAPSHOT):
            response = client.get(
                "/api/v1/config",
                params={"name": "Auth:JWT:Secret"},
                headers={
                    "X-Exp-Local-Token": "local-dev-token",
                    "X-Exp-Target": "website",
                },
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["name"] == "Auth:JWT:Secret"
        assert payload["value"] == "local-secret"
        assert payload["availableForTargets"] == ["api", "website"]

    def test_returns_500_when_required_key_is_missing(self, client: TestClient) -> None:
        """Required config keys should fail loudly if the backing snapshot is incomplete."""

        with patch("api.config.get_config", return_value={"Auth:JWT:Issuer": "https://localhost:5000"}):
            response = client.get(
                "/api/v1/config",
                params={"name": "Auth:JWT:Secret"},
                headers={
                    "X-Exp-Local-Token": "local-dev-token",
                    "X-Exp-Target": "api",
                },
            )

        assert response.status_code == 500
        assert response.json()["missingRequiredKeys"] == ["Auth:JWT:Secret"]
