"""Process-local runtime metrics for the exp microservice.

The exp service remains stateless across deployments, but it still benefits from
ephemeral in-process diagnostics that help operators understand current process
health. This module tracks request counts and successful configuration responses
for the lifetime of the current worker only.
"""

from __future__ import annotations

import os
import socket
import threading
import time
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True, slots=True)
class ProcessRuntimeSnapshot:
    """Immutable runtime identity for the current process instance."""

    started_at: str
    uptime_seconds: float
    hostname: str
    process_id: int


@dataclass(frozen=True, slots=True)
class RequestMetricsSnapshot:
    """Immutable snapshot of observed HTTP requests for the current process."""

    total_requests: int
    requests_by_path: dict[str, int]


@dataclass(frozen=True, slots=True)
class ServedConfigMetricsSnapshot:
    """Immutable snapshot of successful configuration response counters."""

    responses_total: int
    values_total: int
    responses_by_endpoint: dict[str, int]
    responses_by_target: dict[str, int]
    responses_by_caller: dict[str, int]
    values_by_target: dict[str, int]
    values_by_caller: dict[str, int]
    values_by_name: dict[str, int]
    last_served_at: str | None


_metrics_lock = threading.RLock()
_started_at_utc = datetime.now(timezone.utc)
_started_at_monotonic = time.monotonic()
_total_requests = 0
_requests_by_path: Counter[str] = Counter()
_served_responses_total = 0
_served_values_total = 0
_responses_by_endpoint: Counter[str] = Counter()
_responses_by_target: Counter[str] = Counter()
_responses_by_caller: Counter[str] = Counter()
_values_by_target: Counter[str] = Counter()
_values_by_caller: Counter[str] = Counter()
_values_by_name: Counter[str] = Counter()
_last_served_at_utc: datetime | None = None


def _utc_iso(value: datetime | None) -> str | None:
    """Return a timezone-aware datetime as an ISO 8601 string."""

    return value.isoformat() if value is not None else None


def reset_metrics() -> None:
    """Reset all process-local metrics.

    This helper exists primarily for tests so each test can assert against a
    clean metrics snapshot without cross-test bleed.
    """

    global _started_at_utc
    global _started_at_monotonic
    global _total_requests
    global _served_responses_total
    global _served_values_total
    global _last_served_at_utc

    with _metrics_lock:
        _started_at_utc = datetime.now(timezone.utc)
        _started_at_monotonic = time.monotonic()
        _total_requests = 0
        _requests_by_path.clear()
        _served_responses_total = 0
        _served_values_total = 0
        _responses_by_endpoint.clear()
        _responses_by_target.clear()
        _responses_by_caller.clear()
        _values_by_target.clear()
        _values_by_caller.clear()
        _values_by_name.clear()
        _last_served_at_utc = None


def record_request(path: str) -> None:
    """Record one observed HTTP request path for the current process."""

    global _total_requests

    with _metrics_lock:
        _total_requests += 1
        _requests_by_path[path] += 1


def record_config_delivery(
    endpoint_name: str,
    target: str,
    config_names: Sequence[str],
    *,
    caller_label: str,
) -> None:
    """Record one successful configuration-serving response.

    Parameters
    ----------
    endpoint_name:
        Logical endpoint category such as ``build-time``, ``run-time``, or
        ``config``.
    target:
        Resolved consumer target that received the response.
    config_names:
        Configuration keys included in the response payload.
    caller_label:
        Stable label representing who received the response, for example a
        caller principal ID in Azure or ``local:<target>`` in local mode.
    """

    global _served_responses_total
    global _served_values_total
    global _last_served_at_utc

    normalized_endpoint = endpoint_name.strip().lower()
    normalized_target = target.strip().lower()
    normalized_caller = caller_label.strip().lower()
    value_names = tuple(config_names)

    with _metrics_lock:
        _served_responses_total += 1
        _served_values_total += len(value_names)
        _responses_by_endpoint[normalized_endpoint] += 1
        _responses_by_target[normalized_target] += 1
        _responses_by_caller[normalized_caller] += 1
        _values_by_target[normalized_target] += len(value_names)
        _values_by_caller[normalized_caller] += len(value_names)
        _values_by_name.update(value_names)
        _last_served_at_utc = datetime.now(timezone.utc)


def get_process_runtime_snapshot() -> ProcessRuntimeSnapshot:
    """Return the current process runtime identity and uptime."""

    with _metrics_lock:
        return ProcessRuntimeSnapshot(
            started_at=_utc_iso(_started_at_utc) or "",
            uptime_seconds=round(time.monotonic() - _started_at_monotonic, 3),
            hostname=socket.gethostname(),
            process_id=os.getpid(),
        )


def get_request_metrics_snapshot() -> RequestMetricsSnapshot:
    """Return a detached snapshot of observed HTTP requests."""

    with _metrics_lock:
        return RequestMetricsSnapshot(
            total_requests=_total_requests,
            requests_by_path=dict(_requests_by_path),
        )


def get_served_config_metrics_snapshot() -> ServedConfigMetricsSnapshot:
    """Return a detached snapshot of successful configuration-serving counters."""

    with _metrics_lock:
        return ServedConfigMetricsSnapshot(
            responses_total=_served_responses_total,
            values_total=_served_values_total,
            responses_by_endpoint=dict(_responses_by_endpoint),
            responses_by_target=dict(_responses_by_target),
            responses_by_caller=dict(_responses_by_caller),
            values_by_target=dict(_values_by_target),
            values_by_caller=dict(_values_by_caller),
            values_by_name=dict(_values_by_name),
            last_served_at=_utc_iso(_last_served_at_utc),
        )
