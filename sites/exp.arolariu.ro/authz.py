"""Authorization helpers for catalog and configuration access in exp.arolariu.ro."""

from __future__ import annotations

import base64
import hmac
import json
import os
from dataclasses import dataclass

from catalog import get_catalog, is_key_allowed, is_prefix_allowed


@dataclass(frozen=True, slots=True)
class AuthorizationResult:
    """Encapsulates authorization outcome and response metadata."""

    is_authorized: bool
    status_code: int
    message: str
    target: str | None = None


def _parse_identity_list(env_var_name: str) -> set[str]:
    """Parse a comma-delimited list of identity IDs from environment."""
    raw_value = os.getenv(env_var_name, "")
    return {value.strip() for value in raw_value.split(",") if value.strip()}


def _identity_policy() -> dict[str, set[str]]:
    """Build the caller-to-target identity policy map."""
    return {
        "api": _parse_identity_list("EXP_CALLER_API_IDS"),
        "website": _parse_identity_list("EXP_CALLER_WEBSITE_IDS"),
    }


def _get_header_value(headers: dict, header_name: str) -> str:
    """Read a header value in a case-insensitive manner."""
    if not headers:
        return ""

    exact_match = headers.get(header_name)
    if exact_match:
        return exact_match

    lower_name = header_name.lower()
    for key, value in headers.items():
        if key.lower() == lower_name:
            return value
    return ""


def _decode_client_principal(encoded_principal: str) -> dict:
    """Decode the Easy Auth client principal payload."""
    try:
        decoded = base64.b64decode(encoded_principal).decode("utf-8")
        payload = json.loads(decoded)
        if isinstance(payload, dict):
            return payload
    except Exception:  # pragma: no cover - defensive branch
        return {}
    return {}


def _extract_claim_values(principal_payload: dict) -> set[str]:
    """Extract identity-relevant claim values from Easy Auth principal payload."""
    values: set[str] = set()
    claims = principal_payload.get("claims", [])
    if not isinstance(claims, list):
        return values

    allowed_claim_types = {
        "oid",
        "appid",
        "http://schemas.microsoft.com/identity/claims/objectidentifier",
        "http://schemas.microsoft.com/identity/claims/applicationid",
    }

    for claim in claims:
        if not isinstance(claim, dict):
            continue
        claim_type = str(claim.get("typ", "")).lower()
        claim_value = str(claim.get("val", "")).strip()
        if claim_type in allowed_claim_types and claim_value:
            values.add(claim_value)
    return values


def _extract_caller_ids(req) -> set[str]:
    """Extract caller identity IDs from Easy Auth headers."""
    headers = req.headers if req is not None else {}
    caller_ids: set[str] = set()

    principal_id = _get_header_value(headers, "X-MS-CLIENT-PRINCIPAL-ID").strip()
    if principal_id:
        caller_ids.add(principal_id)

    encoded_principal = _get_header_value(headers, "X-MS-CLIENT-PRINCIPAL")
    if encoded_principal:
        principal_payload = _decode_client_principal(encoded_principal)
        caller_ids |= _extract_claim_values(principal_payload)

    return caller_ids


def _authorize_local(req, requested_target: str | None) -> AuthorizationResult:
    """Authorize a local-mode request (optional shared token validation)."""
    local_token = os.getenv("EXP_LOCAL_SHARED_TOKEN", "").strip()
    if local_token:
        provided_token = _get_header_value(req.headers, "X-Exp-Local-Token").strip()
        if not provided_token or not hmac.compare_digest(provided_token, local_token):
            return AuthorizationResult(
                is_authorized=False,
                status_code=401,
                message="Missing or invalid local token.",
            )

    header_target = _get_header_value(req.headers, "X-Exp-Target").strip().lower()
    target = (requested_target or header_target).lower()
    if not target:
        return AuthorizationResult(
            is_authorized=False,
            status_code=401,
            message="Missing local caller target. Provide X-Exp-Target header.",
        )

    if get_catalog(target) is None:
        return AuthorizationResult(False, 400, f"Unknown catalog target '{target}'.")

    return AuthorizationResult(True, 200, "", target)


def _resolve_target_for_caller(
    caller_ids: set[str],
    requested_target: str | None,
) -> AuthorizationResult:
    """Resolve target authorization for an Azure-mode caller."""
    identity_policy = _identity_policy()
    if not caller_ids:
        return AuthorizationResult(False, 401, "Unauthorized caller.")

    if requested_target is not None:
        target = requested_target.lower()
        allowed_callers = identity_policy.get(target, set())
        if not allowed_callers:
            return AuthorizationResult(False, 403, f"No callers configured for target '{target}'.")
        if caller_ids.isdisjoint(allowed_callers):
            return AuthorizationResult(False, 403, f"Caller is not allowed for target '{target}'.")
        return AuthorizationResult(True, 200, "", target)

    for target, allowed_callers in identity_policy.items():
        if allowed_callers and not caller_ids.isdisjoint(allowed_callers):
            return AuthorizationResult(True, 200, "", target)

    return AuthorizationResult(False, 401, "Unauthorized caller.")


def _authorize_request(req, requested_target: str | None = None) -> AuthorizationResult:
    """Authorize a request and resolve the caller target context."""
    infra = os.getenv("INFRA", "local").lower()
    if infra != "azure":
        return _authorize_local(req, requested_target)

    caller_ids = _extract_caller_ids(req)
    return _resolve_target_for_caller(caller_ids, requested_target)


def authorize_catalog_request(req, target: str) -> AuthorizationResult:
    """Authorize a catalog request for the specified target."""
    if get_catalog(target) is None:
        return AuthorizationResult(False, 400, f"Unknown catalog target '{target}'.")
    return _authorize_request(req, requested_target=target)


def authorize_key_request(req, key: str) -> AuthorizationResult:
    """Authorize a single-key lookup request."""
    result = _authorize_request(req)
    if not result.is_authorized or not result.target:
        return result

    if not is_key_allowed(result.target, key):
        return AuthorizationResult(False, 403, f"Key '{key}' is not allowed for target '{result.target}'.", result.target)

    return result


def authorize_keys_request(req, keys: list[str]) -> tuple[AuthorizationResult, list[str]]:
    """Authorize a multi-key lookup request."""
    result = _authorize_request(req)
    if not result.is_authorized or not result.target:
        return result, []

    denied_keys = sorted([key for key in keys if not is_key_allowed(result.target, key)])
    if denied_keys:
        return (
            AuthorizationResult(
                False,
                403,
                f"Some keys are not allowed for target '{result.target}'.",
                result.target,
            ),
            denied_keys,
        )

    return result, []


def authorize_prefix_request(req, prefix: str) -> AuthorizationResult:
    """Authorize a prefix lookup request."""
    result = _authorize_request(req)
    if not result.is_authorized or not result.target:
        return result

    if not is_prefix_allowed(result.target, prefix):
        return AuthorizationResult(
            False,
            403,
            f"Prefix '{prefix}' is not allowed for target '{result.target}'.",
            result.target,
        )

    return result
