"""
Configuration loader for exp.arolariu.ro.

Loads configuration from Azure App Configuration + Key Vault (azure mode)
or from a local config.json file (local/proxy mode).

The config dict is loaded once at module import time and cached as a plain dict.
Container restarts re-import the module, so config is refreshed on each new
instance. Within a single instance, config values remain static for the
lifetime of the process.
"""

import json
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# Global config store — loaded once, accessed by all functions
_config: dict[str, str] = {}
_loaded: bool = False


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
    from azure.appconfiguration.provider import load, SettingSelector
    from azure.appconfiguration.provider import AzureAppConfigurationKeyVaultOptions
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
    global _config, _loaded

    infra = os.getenv("INFRA", "local")
    logger.info("Loading configuration (INFRA=%s)", infra)

    if infra == "azure":
        _config = _load_azure_config()
    else:
        _config = _load_local_config()

    _loaded = True
    logger.info("Loaded %d configuration keys", len(_config))
    return _config


def get_config() -> dict[str, str]:
    """Get the current configuration dict. Loads on first access."""
    if not _loaded:
        load_config()
    return _config


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
