"""Health and connectivity telemetry suppression policy for the exp service.

Sole owner of the suppressed path list. Consumed by the request middleware in ``main``
to keep probe traffic out of exported logs. Traces are excluded separately via
``TelemetrySettings.excluded_urls``.
"""

import os

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

    Fails open toward emitting: a malformed override leaves suppression at its default.
    """

    return parse_suppression_flag(os.environ.get(SUPPRESSION_ENV_VAR)) and is_suppressed_path(path)
