"""
Configuration loader for experiments.arolariu.ro.

Loads configuration from Azure App Configuration + Key Vault (azure mode)
or from a local config.json file (local/proxy mode).

The config dict is loaded once at module import time and cached as a plain dict.
Azure Functions cold starts re-import the module, so config is refreshed on each
new instance. Within a single instance, config values remain static for the
lifetime of the process.
"""

import json
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

# Global config store — loaded once, accessed by all functions
_config: dict[str, str] = {}


def _load_local_config() -> dict[str, str]:
    """Load configuration from config.json for local development."""
    config_path = Path(__file__).parent / "config.json"
    if not config_path.exists():
        logger.warning("config.json not found at %s, using empty config", config_path)
        return {}

    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


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

    environment = os.getenv("AZURE_FUNCTIONS_ENVIRONMENT", "Development")
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
    global _config

    infra = os.getenv("INFRA", "local")
    logger.info("Loading configuration (INFRA=%s)", infra)

    if infra == "azure":
        _config = _load_azure_config()
    else:
        _config = _load_local_config()

    logger.info("Loaded %d configuration keys", len(_config))
    return _config


def get_config() -> dict[str, str]:
    """Get the current configuration dict. Loads on first access."""
    if not _config:
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
