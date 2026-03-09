"""Configuration loading and feature extraction for exp.arolariu.ro."""

from __future__ import annotations

import json
import logging
import os
import threading
import time
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, TypeAlias

from config.settings import get_refresh_interval_seconds, get_runtime_infra_mode
from telemetry.bootstrap import (
    record_config_load_metric,
    record_current_span_exception,
    set_current_span_attributes,
    start_span,
)

logger = logging.getLogger(__name__)

ConfigSnapshot: TypeAlias = dict[str, str]
FeatureSnapshot: TypeAlias = dict[str, bool]


@dataclass(frozen=True, slots=True)
class ConfigLoaderStats:
    """Represents the current in-memory snapshot state for observability surfaces."""

    keys_loaded: int
    load_count: int
    last_loaded_at: str | None

# Global config snapshot. Access is synchronized because request handlers and
# refresh logic may run concurrently in the same process.
_config: ConfigSnapshot = {}
_loaded = False
_last_loaded_at: float | None = None
_last_loaded_at_utc: datetime | None = None
_load_count = 0
_config_lock = threading.RLock()


def _service_root() -> Path:
    """Return the exp service root regardless of the current module location."""

    return Path(__file__).resolve().parent.parent


def _is_refresh_due(current_time: float | None = None) -> bool:
    """Determine whether automatic refresh should run for the current snapshot."""

    if not _loaded or _last_loaded_at is None:
        return False

    refresh_interval_seconds = get_refresh_interval_seconds(allow_zero=True)
    if refresh_interval_seconds == 0:
        return False

    now = current_time if current_time is not None else time.monotonic()
    return (now - _last_loaded_at) >= refresh_interval_seconds


def _resolve_local_config_paths() -> tuple[Path, Path]:
    """Resolve the primary and fallback config paths for local-mode loading."""

    local_path = os.getenv("EXP_LOCAL_CONFIG_PATH", "").strip()
    primary_path = Path(local_path) if local_path else _service_root() / "config.json"
    fallback_path = _service_root() / "config.template.json"
    return primary_path, fallback_path


def _normalize_config_snapshot(payload: Mapping[object, object]) -> ConfigSnapshot:
    """Normalize a provider payload into a plain ``dict[str, str]`` snapshot."""

    return {str(key): str(value) for key, value in payload.items()}


def _resolve_environment_label() -> str:
    """Resolve the Azure App Configuration label for the current environment."""

    environment = (
        os.getenv("EXP_ENVIRONMENT")
        or os.getenv("AZURE_FUNCTIONS_ENVIRONMENT")
        or os.getenv("ENVIRONMENT")
        or "Development"
    )
    return "PRODUCTION" if environment == "Production" else "DEVELOPMENT"


def _load_local_config() -> ConfigSnapshot:
    """Load configuration from the service-local JSON files for local development."""

    config_path, template_path = _resolve_local_config_paths()
    if not config_path.exists():
        if template_path.exists():
            logger.warning(
                "Local config not found at %s; loading template from %s",
                config_path,
                template_path,
            )
            config_path = template_path
        else:
            logger.warning("Local config not found at %s, using empty config", config_path)
            return {}

    try:
        with config_path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except (OSError, json.JSONDecodeError) as exception:
        logger.error("Failed to load local config from %s: %s", config_path, exception)
        return {}

    if not isinstance(payload, dict):
        logger.error(
            "Local config root must be a JSON object at %s, but found %s",
            config_path,
            type(payload).__name__,
        )
        return {}

    return _normalize_config_snapshot(payload)


def _load_azure_config() -> ConfigSnapshot:
    """Load configuration from Azure App Configuration plus Key Vault references."""

    from azure.appconfiguration.provider import AzureAppConfigurationKeyVaultOptions, SettingSelector, load
    from azure.identity import DefaultAzureCredential

    client_id = os.getenv("AZURE_CLIENT_ID")
    credential = (
        DefaultAzureCredential(managed_identity_client_id=client_id)
        if client_id
        else DefaultAzureCredential()
    )

    endpoint = os.getenv("AZURE_APPCONFIG_ENDPOINT")
    if not endpoint:
        raise RuntimeError("AZURE_APPCONFIG_ENDPOINT env var is required in azure mode")

    label = _resolve_environment_label()
    logger.info("Loading config from Azure App Configuration (endpoint=%s, label=%s)", endpoint, label)

    config = load(
        endpoint=endpoint,
        credential=credential,
        selects=[SettingSelector(key_filter="*", label_filter=label)],
        key_vault_options=AzureAppConfigurationKeyVaultOptions(credential=credential),
    )

    return _normalize_config_snapshot(dict(config))


def _load_config_for_infrastructure(infra: str) -> ConfigSnapshot:
    """Load configuration for the resolved infrastructure mode."""

    return _load_azure_config() if infra == "azure" else _load_local_config()


def load_config() -> ConfigSnapshot:
    """Load configuration based on the current ``INFRA`` environment variable."""

    global _config, _loaded, _last_loaded_at
    global _last_loaded_at_utc, _load_count

    infra = get_runtime_infra_mode()
    source = "azure" if infra == "azure" else "local"
    logger.info("Loading configuration (INFRA=%s)", infra)
    started_at = time.perf_counter()

    with start_span(
        "exp.config.load",
        instrumentation_scope=__name__,
        attributes={
            "exp.config.source": source,
            "exp.infra.mode": infra,
        },
    ):
        try:
            loaded_config = _load_config_for_infrastructure(infra)
        except Exception as exception:
            duration_ms = (time.perf_counter() - started_at) * 1000
            record_config_load_metric(
                source=source,
                outcome="failure",
                duration_ms=duration_ms,
            )
            record_current_span_exception(exception)
            set_current_span_attributes(
                {
                    "exp.config.outcome": "failure",
                    "exp.config.load.duration_ms": round(duration_ms, 3),
                }
            )
            raise

        duration_ms = (time.perf_counter() - started_at) * 1000
        record_config_load_metric(
            source=source,
            outcome="success",
            duration_ms=duration_ms,
        )
        set_current_span_attributes(
            {
                "exp.config.outcome": "success",
                "exp.config.keys_loaded": len(loaded_config),
                "exp.config.load.duration_ms": round(duration_ms, 3),
            }
        )

        with _config_lock:
            _config = loaded_config
            _loaded = True
            _last_loaded_at = time.monotonic()
            _last_loaded_at_utc = datetime.now(timezone.utc)
            _load_count += 1
            logger.info("Loaded %d configuration keys", len(_config))
            return dict(_config)


def get_config() -> ConfigSnapshot:
    """Return the current configuration snapshot, loading or refreshing when needed."""

    with _config_lock:
        if not _loaded or _is_refresh_due():
            if _loaded:
                logger.info("Refreshing configuration due to refresh interval.")
                set_current_span_attributes({"exp.config.refresh_due": True})
            load_config()

        # Return a detached snapshot so callers cannot mutate shared state.
        return dict(_config)


def get_config_value(key: str) -> str | None:
    """Get a single configuration value by key."""

    return get_config().get(key)


def get_config_section(prefix: str) -> ConfigSnapshot:
    """Get all config values whose keys start with the provided section prefix."""

    config_snapshot = get_config()
    section_prefix = f"{prefix}:"
    return {
        key: value
        for key, value in config_snapshot.items()
        if key.startswith(section_prefix)
    }


def refresh_config() -> ConfigSnapshot:
    """Force-refresh configuration and return the latest snapshot."""

    return load_config()


def get_config_stats() -> ConfigLoaderStats:
    """Return a detached snapshot of in-memory configuration loader state."""

    with _config_lock:
        return ConfigLoaderStats(
            keys_loaded=len(_config),
            load_count=_load_count,
            last_loaded_at=_last_loaded_at_utc.isoformat() if _last_loaded_at_utc is not None else None,
        )


def update_config_value(key: str, value: str) -> bool:
    """Update a single key in the in-memory config snapshot.

    Returns ``True`` if the key already existed, ``False`` if it was newly
    created.  The change is ephemeral — it is lost on process restart.
    """

    with _config_lock:
        existed = key in _config
        _config[key] = value
        return existed


def _parse_bool(value: str) -> bool | None:
    """Parse a string as a boolean flag value."""

    lower = value.strip().lower()
    if lower in {"true", "1", "yes", "on"}:
        return True
    if lower in {"false", "0", "no", "off"}:
        return False
    return None


def _extract_feature_from_json_payload(raw_value: str) -> bool | None:
    """Extract the ``enabled`` field from an Azure App Configuration feature payload."""

    try:
        payload: Any = json.loads(raw_value)
    except (ValueError, TypeError):
        return None

    if not isinstance(payload, dict):
        return None

    enabled = payload.get("enabled")
    if isinstance(enabled, bool):
        return enabled
    if isinstance(enabled, str):
        return _parse_bool(enabled)
    return None


def _resolve_feature_state(config: Mapping[str, str], feature_id: str) -> bool:
    """Resolve one feature flag using the supported precedence rules."""

    feature_management_key = f"FeatureManagement:{feature_id}"
    feature_management_value = config.get(feature_management_key)
    if feature_management_value is not None:
        parsed = _parse_bool(feature_management_value)
        if parsed is None:
            logger.warning(
                "Feature flag %s has an invalid FeatureManagement value %r; defaulting to False.",
                feature_id,
                feature_management_value,
            )
            return False

        return parsed

    app_config_key = f".appconfig.featureflag/{feature_id}"
    app_config_value = config.get(app_config_key)
    if app_config_value is not None:
        parsed = _extract_feature_from_json_payload(app_config_value)
        if parsed is None:
            logger.warning(
                "Feature flag %s has an invalid App Configuration payload; defaulting to False.",
                feature_id,
            )
            return False

        return parsed

    return False


def extract_features(config: Mapping[str, str], feature_ids: Sequence[str]) -> FeatureSnapshot:
    """Extract feature flag states for the given IDs from a config snapshot.

    The platform supports two conventions:

    1. ``FeatureManagement:<id>`` with string boolean values.
    2. ``.appconfig.featureflag/<id>`` with Azure App Configuration JSON payloads.

    When a feature is not configured, the result defaults to ``False`` so callers
    always receive a full feature map for the registered IDs.
    """

    return {
        feature_id: _resolve_feature_state(config, feature_id)
        for feature_id in feature_ids
    }
