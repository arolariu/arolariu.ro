"""Authorization helpers for target-scoped exp configuration access.

The exp service authorizes callers differently depending on the endpoint shape:

- `/build-time` and `/run-time` authorize one explicit target.
- `/config` authorizes whichever targets own the requested key.

Both flows share the same header parsing and Easy Auth decoding primitives so
the security behavior stays consistent between local and Azure deployments.
"""

from __future__ import annotations

import base64
import binascii
import hmac
import json
import os
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Final, Protocol, TypedDict

from telemetry.bootstrap import (
    record_auth_decision_metric,
    set_current_span_attributes,
    start_span,
)

LOCAL_INFRA_MODES: Final[frozenset[str]] = frozenset({"local", "proxy"})
AZURE_INFRA_MODE: Final[str] = "azure"


class RequestLike(Protocol):
    """Minimal request protocol needed by authorization helpers."""

    headers: Mapping[str, str]


class EasyAuthClaim(TypedDict, total=False):
    """Represents one claim emitted by Azure Easy Auth."""

    typ: str
    val: str


class EasyAuthPrincipal(TypedDict, total=False):
    """Represents the decoded Easy Auth principal payload."""

    claims: list[EasyAuthClaim]


@dataclass(frozen=True, slots=True)
class AuthorizationResult:
    """Encapsulates authorization outcome and response metadata."""

    is_authorized: bool
    status_code: int
    message: str
    target: str | None = None


def _authorization_outcome(result: AuthorizationResult) -> str:
    """Classify an authorization result into a low-cardinality telemetry outcome."""

    if result.is_authorized:
        return "authorized"
    if result.status_code >= 500:
        return "error"
    if result.status_code == 400:
        return "invalid"
    return "denied"


def _record_authorization_telemetry(
    *,
    flow: str,
    result: AuthorizationResult,
    requested_target: str | None,
    allowed_target_count: int,
) -> AuthorizationResult:
    """Attach trace attributes and metrics for a finalized auth decision."""

    outcome = _authorization_outcome(result)
    record_auth_decision_metric(
        flow=flow,
        outcome=outcome,
        resolved_target=result.target,
    )
    set_current_span_attributes(
        {
            "exp.auth.flow": flow,
            "exp.auth.outcome": outcome,
            "exp.auth.requested_target": requested_target,
            "exp.auth.resolved_target": result.target,
            "exp.auth.allowed_target_count": allowed_target_count,
            "exp.auth.status_code": result.status_code,
        }
    )
    return result


def _parse_identity_list(env_var_name: str) -> set[str]:
    """Parse a comma-delimited list of identity IDs from the environment."""

    raw_value = os.getenv(env_var_name, "")
    return {value.strip() for value in raw_value.split(",") if value.strip()}


def _identity_policy() -> dict[str, set[str]]:
    """Build the caller-to-target identity policy map.

    The infrastructure identity is granted access to both ``api`` and ``website``
    targets because CI/CD pipelines need to fetch build-time and run-time
    documents for all services during container construction.
    """

    infra_ids = _parse_identity_list("EXP_CALLER_INFRA_IDS")
    return {
        "api": _parse_identity_list("EXP_CALLER_API_IDS") | infra_ids,
        "website": _parse_identity_list("EXP_CALLER_WEBSITE_IDS") | infra_ids,
    }


def _get_header_value(headers: Mapping[str, str], header_name: str) -> str:
    """Read a header value in a case-insensitive manner."""

    exact_match = headers.get(header_name)
    if exact_match:
        return exact_match

    lower_name = header_name.lower()
    for key, value in headers.items():
        if key.lower() == lower_name:
            return value

    return ""


def _decode_client_principal(encoded_principal: str) -> EasyAuthPrincipal:
    """Decode the Easy Auth client principal payload."""

    try:
        decoded = base64.b64decode(encoded_principal).decode("utf-8")
        payload = json.loads(decoded)
    except (
        ValueError,
        UnicodeDecodeError,
        json.JSONDecodeError,
        binascii.Error,
    ):  # pragma: no cover - defensive branch
        return {}

    return payload if isinstance(payload, dict) else {}


def _extract_claim_values(principal_payload: EasyAuthPrincipal) -> set[str]:
    """Extract identity-relevant claim values from an Easy Auth principal payload."""

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


def _extract_caller_ids(req: RequestLike | None) -> set[str]:
    """Extract caller identity IDs from Easy Auth headers."""

    headers = req.headers if req is not None else {}

    encoded_principal = _get_header_value(headers, "X-MS-CLIENT-PRINCIPAL")
    if not encoded_principal:
        return set()

    principal_payload = _decode_client_principal(encoded_principal)
    caller_ids = _extract_claim_values(principal_payload)
    if not caller_ids:
        return set()

    principal_id = _get_header_value(headers, "X-MS-CLIENT-PRINCIPAL-ID").strip()
    if principal_id:
        caller_ids.add(principal_id)

    return caller_ids


def _resolve_header_target(headers: Mapping[str, str]) -> str:
    """Return the optional ``X-Exp-Target`` value in normalized form."""

    return _get_header_value(headers, "X-Exp-Target").strip().lower()


def _validate_header_target(
    header_target: str,
    allowed_targets: Sequence[str],
) -> AuthorizationResult | None:
    """Ensure the optional header target is allowed for the requested resource."""

    if header_target and header_target not in allowed_targets:
        allowed_target_list = ", ".join(allowed_targets)
        return AuthorizationResult(
            False,
            403,
            f"Header target '{header_target}' is not allowed. Expected one of: {allowed_target_list}.",
        )

    return None


def _authorize_local_token(headers: Mapping[str, str]) -> AuthorizationResult | None:
    """Validate the optional local shared token configuration."""

    local_token = os.getenv("EXP_LOCAL_SHARED_TOKEN", "").strip()
    if not local_token:
        return None

    provided_token = _get_header_value(headers, "X-Exp-Local-Token").strip()
    if provided_token and hmac.compare_digest(provided_token, local_token):
        return None

    return AuthorizationResult(
        is_authorized=False,
        status_code=401,
        message="Missing or invalid local token.",
    )


def _authorize_local_for_targets(
    req: RequestLike | None,
    allowed_targets: Sequence[str],
    *,
    require_header_for_shared_keys: bool,
) -> AuthorizationResult:
    """Authorize a local or proxy-mode request for one or more allowed targets."""

    headers = req.headers if req is not None else {}
    token_failure = _authorize_local_token(headers)
    if token_failure is not None:
        return token_failure

    header_target = _resolve_header_target(headers)
    target_failure = _validate_header_target(header_target, allowed_targets)
    if target_failure is not None:
        return target_failure

    if header_target:
        return AuthorizationResult(True, 200, "", header_target)

    if len(allowed_targets) == 1:
        return AuthorizationResult(True, 200, "", allowed_targets[0])

    if require_header_for_shared_keys:
        return AuthorizationResult(
            False,
            400,
            "Header 'X-Exp-Target' is required when a config key is shared across multiple targets.",
        )

    return AuthorizationResult(True, 200, "", allowed_targets[0])


def _authorize_azure_for_targets(
    req: RequestLike | None,
    allowed_targets: Sequence[str],
) -> AuthorizationResult:
    """Authorize an Azure request against the configured target allow-lists."""

    headers = req.headers if req is not None else {}
    header_target = _resolve_header_target(headers)
    target_failure = _validate_header_target(header_target, allowed_targets)
    if target_failure is not None:
        return target_failure

    caller_ids = _extract_caller_ids(req)
    if not caller_ids:
        return AuthorizationResult(False, 401, "Unauthorized caller.")

    matched_targets = tuple(
        target
        for target in allowed_targets
        if not caller_ids.isdisjoint(_identity_policy().get(target, set()))
    )
    if not matched_targets:
        return AuthorizationResult(False, 403, "Caller is not allowed for the requested resource.")

    if header_target:
        if header_target not in matched_targets:
            return AuthorizationResult(False, 403, f"Caller is not allowed for target '{header_target}'.")
        return AuthorizationResult(True, 200, "", header_target)

    if len(matched_targets) == 1:
        return AuthorizationResult(True, 200, "", matched_targets[0])

    return AuthorizationResult(
        False,
        400,
        "Header 'X-Exp-Target' is required when the caller can access multiple targets.",
    )


def _authorize_for_targets(
    req: RequestLike | None,
    allowed_targets: Sequence[str],
    *,
    require_header_for_shared_keys: bool = False,
) -> AuthorizationResult:
    """Authorize a request against one or more allowed targets."""

    infra = (os.getenv("INFRA") or "").strip().lower()
    if infra in LOCAL_INFRA_MODES:
        return _authorize_local_for_targets(
            req,
            allowed_targets,
            require_header_for_shared_keys=require_header_for_shared_keys,
        )

    if infra != AZURE_INFRA_MODE:
        return AuthorizationResult(
            is_authorized=False,
            status_code=500,
            message="Service infrastructure mode is not configured correctly.",
        )

    return _authorize_azure_for_targets(req, allowed_targets)


def authorize_target_request(req: RequestLike | None, requested_target: str) -> AuthorizationResult:
    """Authorize access to a target-scoped build-time or run-time configuration document."""

    normalized_target = requested_target.strip().lower()
    with start_span(
        "exp.auth.target_request",
        instrumentation_scope=__name__,
        attributes={
            "exp.auth.flow": "target",
            "exp.auth.requested_target": normalized_target or None,
        },
    ):
        if not normalized_target:
            return _record_authorization_telemetry(
                flow="target",
                result=AuthorizationResult(False, 400, "Missing target."),
                requested_target=None,
                allowed_target_count=0,
            )

        if normalized_target not in {"api", "website"}:
            return _record_authorization_telemetry(
                flow="target",
                result=AuthorizationResult(False, 400, f"Unknown target '{normalized_target}'."),
                requested_target=normalized_target,
                allowed_target_count=0,
            )

        return _record_authorization_telemetry(
            flow="target",
            result=_authorize_for_targets(req, (normalized_target,)),
            requested_target=normalized_target,
            allowed_target_count=1,
        )


def authorize_config_request(
    req: RequestLike | None,
    allowed_targets: Sequence[str],
) -> AuthorizationResult:
    """Authorize access to a single config key owned by one or more caller targets."""

    normalized_targets = tuple(target.strip().lower() for target in allowed_targets if target.strip())
    with start_span(
        "exp.auth.config_request",
        instrumentation_scope=__name__,
        attributes={
            "exp.auth.flow": "config",
            "exp.auth.allowed_target_count": len(normalized_targets),
        },
    ):
        if not normalized_targets:
            return _record_authorization_telemetry(
                flow="config",
                result=AuthorizationResult(False, 500, "No targets are registered for the requested config key."),
                requested_target=None,
                allowed_target_count=0,
            )

        return _record_authorization_telemetry(
            flow="config",
            result=_authorize_for_targets(
                req,
                normalized_targets,
                require_header_for_shared_keys=True,
            ),
            requested_target=None,
            allowed_target_count=len(normalized_targets),
        )
