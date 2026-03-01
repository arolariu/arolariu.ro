"""Central catalog ownership for API and website configuration keys."""

from __future__ import annotations

import hashlib
import os

from models import CatalogResponse


def _parse_refresh_interval_seconds() -> int:
    """Parse catalog refresh interval from environment with a safe fallback."""
    raw_value = os.getenv("EXP_CATALOG_REFRESH_INTERVAL_SECONDS", "300").strip()
    try:
        parsed = int(raw_value)
    except ValueError:
        return 300

    return parsed if parsed > 0 else 300


def _catalog_version(
    required_keys: list[str],
    optional_keys: list[str],
    allowed_prefixes: list[str],
) -> str:
    """Compute a deterministic catalog version hash from catalog content."""
    version_payload = "|".join(
        [*sorted(required_keys), *sorted(optional_keys), *sorted(allowed_prefixes)]
    )
    return hashlib.sha256(version_payload.encode("utf-8")).hexdigest()[:12]


def _build_catalog(
    target: str,
    required_keys: list[str],
    optional_keys: list[str] | None = None,
    allowed_prefixes: list[str] | None = None,
) -> CatalogResponse:
    """Build a catalog response instance for a target caller."""
    optional_values = optional_keys or []
    allowed_prefix_values = allowed_prefixes or []
    refresh_seconds = _parse_refresh_interval_seconds()
    return CatalogResponse(
        target=target,
        version=_catalog_version(required_keys, optional_values, allowed_prefix_values),
        requiredKeys=required_keys,
        optionalKeys=optional_values,
        allowedPrefixes=allowed_prefix_values,
        refreshIntervalSeconds=refresh_seconds,
    )


_CATALOGS: dict[str, CatalogResponse] = {
    "api": _build_catalog(
        target="api",
        required_keys=[
            "Common:Auth:Secret",
            "Common:Auth:Issuer",
            "Common:Auth:Audience",
            "Common:Azure:TenantId",
            "Endpoints:OpenAI",
            "Endpoints:SqlServer",
            "Endpoints:NoSqlServer",
            "Endpoints:StorageAccount",
            "Endpoints:ApplicationInsights",
            "Endpoints:CognitiveServices",
            "Endpoints:CognitiveServices:Key",
        ],
        allowed_prefixes=[
            "Common",
            "Endpoints",
        ],
    ),
    "website": _build_catalog(
        target="website",
        required_keys=[
            "AzureOptions:StorageAccountEndpoint",
            "Common:Auth:Issuer",
            "Common:Auth:Audience",
        ],
    ),
}


def get_catalog(target: str) -> CatalogResponse | None:
    """Return the catalog for the provided target, if it exists."""
    return _CATALOGS.get(target.lower())


def is_key_allowed(target: str, key: str) -> bool:
    """Check whether a key is allowed for the target caller."""
    catalog = get_catalog(target)
    if catalog is None:
        return False

    allowed_keys = {*catalog.requiredKeys, *catalog.optionalKeys}
    return key in allowed_keys


def is_prefix_allowed(target: str, prefix: str) -> bool:
    """Check whether a prefix lookup is allowed for the target caller."""
    catalog = get_catalog(target)
    if catalog is None:
        return False

    return prefix in catalog.allowedPrefixes
