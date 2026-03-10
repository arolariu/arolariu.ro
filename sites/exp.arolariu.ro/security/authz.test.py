"""Unit tests for exp authorization helpers."""

from __future__ import annotations

import base64
import json

from security.authz import authorize_config_request, authorize_target_request


class RequestStub:
    """Minimal request object used by the auth helper tests."""

    def __init__(self, headers: dict[str, str] | None = None) -> None:
        self.headers = headers or {}


def encode_client_principal(identifier: str) -> str:
    """Build a minimal Easy Auth principal payload containing one object ID claim."""

    payload = {"claims": [{"typ": "oid", "val": identifier}]}
    return base64.b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")


class TestAuthorizeTargetRequestLocal:
    def test_returns_500_when_infra_mode_is_missing(self, monkeypatch) -> None:
        """Requests should fail closed when INFRA is not configured."""

        monkeypatch.delenv("INFRA", raising=False)

        result = authorize_target_request(
            RequestStub(headers={"X-Exp-Target": "website"}),
            "website",
        )

        assert result.is_authorized is False
        assert result.status_code == 500

    def test_allows_target_without_header_in_local_mode(self, monkeypatch) -> None:
        """Target-scoped endpoints should not require `X-Exp-Target` locally."""

        monkeypatch.setenv("INFRA", "local")

        result = authorize_target_request(RequestStub(), "website")

        assert result.is_authorized is True
        assert result.status_code == 200
        assert result.target == "website"

    def test_denies_header_target_mismatch(self, monkeypatch) -> None:
        """A mismatched `X-Exp-Target` header should be rejected."""

        monkeypatch.setenv("INFRA", "local")

        result = authorize_target_request(
            RequestStub(headers={"X-Exp-Target": "api"}),
            "website",
        )

        assert result.is_authorized is False
        assert result.status_code == 403

    def test_validates_local_shared_token_when_configured(self, monkeypatch) -> None:
        """Local mode should enforce `X-Exp-Local-Token` when configured."""

        monkeypatch.setenv("INFRA", "local")
        monkeypatch.setenv("EXP_LOCAL_SHARED_TOKEN", "expected-token")

        result = authorize_target_request(
            RequestStub(headers={"X-Exp-Local-Token": "wrong-token"}),
            "website",
        )

        assert result.is_authorized is False
        assert result.status_code == 401


class TestAuthorizeConfigRequestAzure:
    def test_allows_configured_caller_for_target(self, monkeypatch) -> None:
        """An Azure caller registered for the requested target should be authorized."""

        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_API_IDS", "api-caller-1")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "website-caller-1")

        result = authorize_config_request(
            RequestStub(
                headers={
                    "X-MS-CLIENT-PRINCIPAL-ID": "website-caller-1",
                    "X-MS-CLIENT-PRINCIPAL": encode_client_principal("website-caller-1"),
                },
            ),
            ("website",),
        )

        assert result.is_authorized is True
        assert result.status_code == 200
        assert result.target == "website"

    def test_denies_caller_not_configured_for_target(self, monkeypatch) -> None:
        """Unknown Azure callers should be rejected."""

        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_API_IDS", "api-caller-1")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "website-caller-1")

        result = authorize_config_request(
            RequestStub(
                headers={
                    "X-MS-CLIENT-PRINCIPAL-ID": "unknown-caller",
                    "X-MS-CLIENT-PRINCIPAL": encode_client_principal("unknown-caller"),
                },
            ),
            ("website",),
        )

        assert result.is_authorized is False
        assert result.status_code == 403

    def test_requires_target_header_when_shared_key_matches_multiple_targets(self, monkeypatch) -> None:
        """Shared keys should be disambiguated when one Azure caller can access multiple targets."""

        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_API_IDS", "shared-caller")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "shared-caller")

        result = authorize_config_request(
            RequestStub(
                headers={
                    "X-MS-CLIENT-PRINCIPAL-ID": "shared-caller",
                    "X-MS-CLIENT-PRINCIPAL": encode_client_principal("shared-caller"),
                },
            ),
            ("api", "website"),
        )

        assert result.is_authorized is False
        assert result.status_code == 400


class TestAuthorizeTargetRequestAzure:
    def test_denies_when_client_principal_payload_is_invalid(self, monkeypatch) -> None:
        """Invalid Easy Auth payloads should be treated as unauthenticated."""

        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "shared-caller")

        result = authorize_target_request(
            RequestStub(
                headers={
                    "X-MS-CLIENT-PRINCIPAL": "not-base64",
                    "X-MS-CLIENT-PRINCIPAL-ID": "shared-caller",
                },
            ),
            "website",
        )

        assert result.is_authorized is False
        assert result.status_code == 401

    def test_honors_matching_exp_target_header(self, monkeypatch) -> None:
        """Matching target headers should still authorize a valid Azure caller."""

        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "shared-caller")

        result = authorize_target_request(
            RequestStub(
                headers={
                    "X-Exp-Target": "website",
                    "X-MS-CLIENT-PRINCIPAL-ID": "shared-caller",
                    "X-MS-CLIENT-PRINCIPAL": encode_client_principal("shared-caller"),
                },
            ),
            "website",
        )

        assert result.is_authorized is True
        assert result.status_code == 200
        assert result.target == "website"

    def test_denies_header_target_mismatch(self, monkeypatch) -> None:
        """Azure callers should not be able to override the endpoint target."""

        monkeypatch.setenv("INFRA", "azure")
        monkeypatch.setenv("EXP_CALLER_WEBSITE_IDS", "shared-caller")

        result = authorize_target_request(
            RequestStub(
                headers={
                    "X-Exp-Target": "api",
                    "X-MS-CLIENT-PRINCIPAL-ID": "shared-caller",
                    "X-MS-CLIENT-PRINCIPAL": encode_client_principal("shared-caller"),
                },
            ),
            "website",
        )

        assert result.is_authorized is False
        assert result.status_code == 403
