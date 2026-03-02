"""Unit tests for authz helpers."""

import base64
import json

from authz import authorize_catalog_request, authorize_key_request, authorize_keys_request


class RequestStub:
    """Minimal request shape for authz helpers."""

    def __init__(self, headers: dict[str, str] | None = None):
        self.headers = headers or {}


def encode_client_principal(identifier: str) -> str:
    """Build a minimal Easy Auth principal payload with one OID claim."""
    payload = {"claims": [{"typ": "oid", "val": identifier}]}
    return base64.b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")


class TestAuthorizeKeyRequestLocal:
    def test_returns_500_when_infra_mode_is_missing(self, monkeypatch):
        monkeypatch.delenv("INFRA", raising=False)

        result = authorize_key_request(
            RequestStub(headers={"X-Exp-Target": "website"}),
            "Common:Auth:Issuer",
        )

        assert result.is_authorized is False
        assert result.status_code == 500

    def test_returns_401_when_local_target_header_missing(self, monkeypatch):
        monkeypatch.setenv("INFRA", "local")

        result = authorize_key_request(RequestStub(), "Common:Auth:Issuer")

        assert result.is_authorized is False
        assert result.status_code == 401

    def test_denies_key_not_allowed_for_website_target(self, monkeypatch):
        monkeypatch.setenv("INFRA", "local")

        result = authorize_key_request(
            RequestStub(headers={"X-Exp-Target": "website"}),
            "Common:Auth:Secret",
        )

        assert result.is_authorized is False
        assert result.status_code == 403
        assert result.target == "website"

    def test_allows_cataloged_key_for_website_target(self, monkeypatch):
        monkeypatch.setenv("INFRA", "local")

        result = authorize_key_request(
            RequestStub(headers={"X-Exp-Target": "website"}),
            "Common:Auth:Issuer",
        )

        assert result.is_authorized is True
        assert result.status_code == 200
        assert result.target == "website"


class TestAuthorizeCatalogRequestAzure:
    def test_allows_configured_caller_for_target(self, monkeypatch):
        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_API_IDS", "api-caller-1")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "website-caller-1")

        result = authorize_catalog_request(
            RequestStub(headers={
                "X-MS-CLIENT-PRINCIPAL-ID": "website-caller-1",
                "X-MS-CLIENT-PRINCIPAL": encode_client_principal("website-caller-1"),
            }),
            "website",
        )

        assert result.is_authorized is True
        assert result.status_code == 200
        assert result.target == "website"

    def test_denies_caller_not_configured_for_target(self, monkeypatch):
        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_API_IDS", "api-caller-1")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "website-caller-1")

        result = authorize_catalog_request(
            RequestStub(headers={
                "X-MS-CLIENT-PRINCIPAL-ID": "unknown-caller",
                "X-MS-CLIENT-PRINCIPAL": encode_client_principal("unknown-caller"),
            }),
            "website",
        )

        assert result.is_authorized is False
        assert result.status_code == 403


class TestAuthorizeKeyRequestAzure:
    def test_denies_when_client_principal_payload_is_invalid(self, monkeypatch):
        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_API_IDS", "shared-caller")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "shared-caller")

        result = authorize_key_request(
            RequestStub(headers={
                "X-MS-CLIENT-PRINCIPAL": "not-base64",
                "X-MS-CLIENT-PRINCIPAL-ID": "shared-caller",
            }),
            "Endpoints:StorageAccount",
        )

        assert result.is_authorized is False
        assert result.status_code == 401

    def test_honors_exp_target_header_when_caller_is_in_multiple_target_allow_lists(self, monkeypatch):
        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_API_IDS", "shared-caller")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "shared-caller")

        result = authorize_key_request(
            RequestStub(headers={
                "X-Exp-Target": "website",
                "X-MS-CLIENT-PRINCIPAL-ID": "shared-caller",
                "X-MS-CLIENT-PRINCIPAL": encode_client_principal("shared-caller"),
            }),
            "AzureOptions:StorageAccountEndpoint",
        )

        assert result.is_authorized is True
        assert result.status_code == 200
        assert result.target == "website"

    def test_allows_api_and_website_keys_when_caller_is_in_both_allow_lists(self, monkeypatch):
        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_API_IDS", "shared-caller")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "shared-caller")

        request = RequestStub(headers={
            "X-MS-CLIENT-PRINCIPAL-ID": "shared-caller",
            "X-MS-CLIENT-PRINCIPAL": encode_client_principal("shared-caller"),
        })

        api_key_result = authorize_key_request(request, "Endpoints:StorageAccount")
        website_key_result = authorize_key_request(request, "AzureOptions:StorageAccountEndpoint")
        batch_result, denied_keys = authorize_keys_request(
            request,
            ["Endpoints:StorageAccount", "AzureOptions:StorageAccountEndpoint"],
        )

        assert api_key_result.is_authorized is True
        assert website_key_result.is_authorized is True
        assert batch_result.is_authorized is True
        assert denied_keys == []
