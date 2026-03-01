"""
exp.arolariu.ro — Configuration Proxy Service

Azure Functions v2 (Python) HTTP triggers for centralized configuration.
Serves config values from Azure App Configuration + Key Vault (azure mode)
or local config.json (local mode).

REST API contract (identical to the previous .NET implementation):
  GET /api/health            → health check
  GET /api/config/{key}      → single config value
  GET /api/config?keys=...   → batch config values
  GET /api/config?prefix=... → config section by prefix
"""

import json
import logging
import os
from datetime import datetime, timezone

import azure.functions as func

from config_loader import get_config, get_config_value, get_config_section, load_config

# Load configuration at module import time (warm start optimization)
load_config()

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)


def _json_response(body: dict, status_code: int = 200) -> func.HttpResponse:
    """Helper to create a JSON HttpResponse with camelCase-compatible output."""
    return func.HttpResponse(
        body=json.dumps(body, default=str),
        status_code=status_code,
        mimetype="application/json",
    )


def _utcnow_iso() -> str:
    """Return current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


@app.function_name(name="GetHealth")
@app.route(route="health", methods=["GET"])
def get_health(req: func.HttpRequest) -> func.HttpResponse:
    """Health check endpoint. Excluded from Easy Auth via excludedPaths."""
    infra = os.getenv("INFRA", "local")
    return _json_response({
        "status": "Healthy",
        "environment": infra,
        "timestamp": _utcnow_iso(),
    })


@app.function_name(name="GetConfigValue")
@app.route(route="config/{*key}", methods=["GET"])
def get_config_value_endpoint(req: func.HttpRequest) -> func.HttpResponse:
    """Get a single configuration value by key."""
    key = req.route_params.get("key", "")
    logging.info("Fetching config key: %s", key)

    value = get_config_value(key)
    if value is None:
        return _json_response({"error": f"Key '{key}' not found"}, status_code=404)

    return _json_response({
        "key": key,
        "value": value,
        "fetchedAt": _utcnow_iso(),
    })


@app.function_name(name="GetConfigBatch")
@app.route(route="config", methods=["GET"])
def get_config_batch(req: func.HttpRequest) -> func.HttpResponse:
    """Get multiple configuration values by keys or prefix."""
    keys_param = req.params.get("keys")
    prefix_param = req.params.get("prefix")

    if keys_param is not None:
        key_list = [k.strip() for k in keys_param.split(",") if k.strip()]
        config = get_config()
        # Empty string for missing keys is intentional — callers treat missing as unconfigured.
        values = [
            {"key": k, "value": config.get(k, ""), "fetchedAt": _utcnow_iso()}
            for k in key_list
        ]
        logging.info("Fetched %d config keys", len(values))
        return _json_response({"values": values, "fetchedAt": _utcnow_iso()})

    if prefix_param is not None:
        section = get_config_section(prefix_param)
        values = [
            {"key": k, "value": v, "fetchedAt": _utcnow_iso()}
            for k, v in section.items()
        ]
        logging.info("Fetched %d config keys with prefix %s", len(values), prefix_param)
        return _json_response({"values": values, "fetchedAt": _utcnow_iso()})

    return _json_response(
        {"error": "Provide 'keys' or 'prefix' query parameter"},
        status_code=400,
    )
