"""Unit tests for authz helpers."""

from authz import authorize_catalog_request, authorize_key_request


class RequestStub:
    """Minimal request shape for authz helpers."""

    def __init__(self, headers: dict[str, str] | None = None):
        self.headers = headers or {}


class TestAuthorizeKeyRequestLocal:
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
            RequestStub(headers={"X-MS-CLIENT-PRINCIPAL-ID": "website-caller-1"}),
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
            RequestStub(headers={"X-MS-CLIENT-PRINCIPAL-ID": "unknown-caller"}),
            "website",
        )

        assert result.is_authorized is False
        assert result.status_code == 403
