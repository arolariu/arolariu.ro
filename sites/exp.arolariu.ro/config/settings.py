"""Shared environment-driven settings helpers for the exp runtime."""

from __future__ import annotations

import os
from typing import Final

DEFAULT_INFRA_MODE: Final[str] = "local"
DEFAULT_REFRESH_INTERVAL_SECONDS: Final[int] = 300


def get_runtime_infra_mode(*, default: str = DEFAULT_INFRA_MODE) -> str:
    """Return the normalized infrastructure mode for the current process."""

    raw_value = os.getenv("INFRA", default)
    normalized = raw_value.strip().lower()
    return normalized or default


def get_refresh_interval_seconds(*, allow_zero: bool = False) -> int:
    """Return the configured snapshot refresh interval in seconds.

    Parameters
    ----------
    allow_zero:
        When ``True``, preserves a configured ``0`` so callers can disable
        automatic refresh. When ``False``, non-positive values fall back to the
        default interval.
    """

    raw_value = os.getenv(
        "EXP_CONFIG_REFRESH_INTERVAL_SECONDS",
        str(DEFAULT_REFRESH_INTERVAL_SECONDS),
    ).strip()
    try:
        parsed = int(raw_value)
    except ValueError:
        return DEFAULT_REFRESH_INTERVAL_SECONDS

    if parsed < 0:
        return DEFAULT_REFRESH_INTERVAL_SECONDS

    if parsed == 0:
        return 0 if allow_zero else DEFAULT_REFRESH_INTERVAL_SECONDS

    return parsed
