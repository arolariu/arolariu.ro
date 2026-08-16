"""Health and connectivity telemetry suppression policy for the exp service.

Sole owner of the suppressed path list. Consumed by the request middleware in ``main``
to keep probe traffic out of exported logs, and by ``TelemetrySettings`` to build the
trace/HTTP-metric exclusion patterns handed to ``FastAPIInstrumentor``.
"""

import os
import re

SUPPRESSED_HEALTH_PATHS: tuple[str, ...] = ("/health", "/api/health", "/api/ready")

SUPPRESSION_ENV_VAR: str = "OTEL_SUPPRESS_HEALTH_TELEMETRY"


def _normalize(path: str) -> str:
    """Strip the query string and any trailing slash from a request path."""

    without_query = path.split("?", 1)[0]
    return without_query.rstrip("/") if len(without_query) > 1 else without_query


def parse_suppression_flag(raw_value: str | None) -> bool:
    """Return whether suppression is enabled for the supplied raw environment value.

    Unset and unparseable values resolve to the safe default of enabled suppression;
    only the literal string ``false`` disables it.
    """

    if raw_value is None or not raw_value.strip():
        return True

    return raw_value.strip().lower() != "false"


def is_suppressed_path(path: str | None) -> bool:
    """Return whether ``path`` is one of the suppressed health endpoints.

    Matching is exact on the normalized path and case-insensitive. Prefix matching is
    deliberately avoided so that paths such as ``/healthcheck-admin`` are not swallowed.
    """

    if not path:
        return False

    return _normalize(path).lower() in SUPPRESSED_HEALTH_PATHS


def should_suppress_telemetry(path: str | None) -> bool:
    """Return whether telemetry must be suppressed for ``path``.

    Fails safe toward suppression: an unset or malformed override leaves suppression
    enabled, so cost control holds even when the environment is misconfigured. Only the
    literal string ``false`` re-enables health telemetry.
    """

    return parse_suppression_flag(os.environ.get(SUPPRESSION_ENV_VAR)) and is_suppressed_path(path)


def build_excluded_urls() -> str:
    """Return the comma-separated exclusion patterns for ``FastAPIInstrumentor``.

    OpenTelemetry's ``ExcludeList`` joins the supplied entries with ``|`` and applies
    ``re.search``, so a bare path such as ``/api/health`` is an **unanchored** regex that
    would also swallow ``/api/healthy`` and ``/api/health/extra``. That contradicts the
    exact-match policy implemented by :func:`is_suppressed_path`.

    Each path is therefore emitted as an anchored, case-insensitive expression tolerating an
    optional trailing slash and an optional query string, so trace and HTTP-metric exclusion
    matches :func:`is_suppressed_path` exactly.
    """

    return ",".join(f"(?i:^{re.escape(path)}/?(\\?.*)?$)" for path in SUPPRESSED_HEALTH_PATHS)
