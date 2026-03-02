"""
Configuration loader for exp.arolariu.ro.

Loads configuration from Azure App Configuration + Key Vault (azure mode)
or from a local config.json file (local/proxy mode).

The config dict is loaded at app startup and cached as a plain dict snapshot.
Container restarts reinitialize configuration on each new instance. Within a
single instance, configuration can auto-refresh based on
EXP_CONFIG_REFRESH_INTERVAL_SECONDS.
"""

import json
import logging
import os
import threading
import time
from pathlib import Path

logger = logging.getLogger(__name__)

# Global config snapshot. Access is synchronized because request handlers and
# refresh logic may run concurrently in the same process.
_config: dict[str, str] = {}
_loaded: bool = False
_last_loaded_at: float | None = None
_config_lock = threading.RLock()


def _parse_refresh_interval_seconds() -> int:
    """Parse automatic config refresh interval from environment."""
    raw_value = os.getenv("EXP_CONFIG_REFRESH_INTERVAL_SECONDS", "300").strip()
    try:
        parsed = int(raw_value)
    except ValueError:
        return 300
    return parsed if parsed >= 0 else 300


def _is_refresh_due(current_time: float | None = None) -> bool:
    """Determine whether automatic refresh should run."""
    if not _loaded or _last_loaded_at is None:
        return False

    refresh_interval_seconds = _parse_refresh_interval_seconds()
    if refresh_interval_seconds == 0:
        return False

    now = current_time if current_time is not None else time.monotonic()
    return (now - _last_loaded_at) >= refresh_interval_seconds


def _load_local_config() -> dict[str, str]:
    """Load configuration from config.json for local development."""
    local_path = os.getenv("EXP_LOCAL_CONFIG_PATH", "").strip()
    config_path = Path(local_path) if local_path else Path(__file__).parent / "config.json"
    if not config_path.exists():
        template_path = Path(__file__).parent / "config.template.json"
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
        with open(config_path, "r", encoding="utf-8") as f:
            payload = json.load(f)
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

    return {str(key): str(value) for key, value in payload.items()}


def _load_azure_config() -> dict[str, str]:
    """Load configuration from Azure App Configuration + Key Vault."""
    from azure.appconfiguration.provider import AzureAppConfigurationKeyVaultOptions, SettingSelector, load
    from azure.identity import DefaultAzureCredential

    client_id = os.getenv("AZURE_CLIENT_ID")
    credential = DefaultAzureCredential(
        managed_identity_client_id=client_id
    ) if client_id else DefaultAzureCredential()

    endpoint = os.getenv("AZURE_APPCONFIG_ENDPOINT")
    if not endpoint:
        raise RuntimeError("AZURE_APPCONFIG_ENDPOINT env var is required in azure mode")

    environment = (
        os.getenv("EXP_ENVIRONMENT")
        or os.getenv("AZURE_FUNCTIONS_ENVIRONMENT")
        or os.getenv("ENVIRONMENT")
        or "Development"
    )
    label = "PRODUCTION" if environment == "Production" else "DEVELOPMENT"

    logger.info("Loading config from Azure App Configuration (endpoint=%s, label=%s)", endpoint, label)

    config = load(
        endpoint=endpoint,
        credential=credential,
        selects=[SettingSelector(key_filter="*", label_filter=label)],
        key_vault_options=AzureAppConfigurationKeyVaultOptions(credential=credential),
    )

    # Convert the AzureAppConfigurationProvider mapping to a plain dict
    return dict(config)


def load_config() -> dict[str, str]:
    """Load configuration based on the INFRA environment variable."""
    global _config, _loaded, _last_loaded_at

    infra = os.getenv("INFRA", "local")
    logger.info("Loading configuration (INFRA=%s)", infra)

    with _config_lock:
        if infra == "azure":
            _config = _load_azure_config()
        else:
            _config = _load_local_config()

        _loaded = True
        _last_loaded_at = time.monotonic()
        logger.info("Loaded %d configuration keys", len(_config))
        return dict(_config)


def get_config() -> dict[str, str]:
    """Get the current configuration dict. Loads on first access."""
    with _config_lock:
        if not _loaded or _is_refresh_due():
            if _loaded:
                logger.info("Refreshing configuration due to refresh interval.")
            load_config()
        # Return a detached snapshot so callers cannot mutate shared state.
        return dict(_config)


def get_config_value(key: str) -> str | None:
    """Get a single configuration value by key."""
    return get_config().get(key)


def get_config_section(prefix: str) -> dict[str, str]:
    """Get all config values whose keys start with prefix followed by ':'."""
    config = get_config()
    section_prefix = f"{prefix}:"
    return {
        k: v for k, v in config.items()
        if k.startswith(section_prefix)
    }


def refresh_config() -> dict[str, str]:
    """Force-refresh configuration and return the latest snapshot."""
    return load_config()
