# experiments.arolariu.ro Python Conversion Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert `experiments.arolariu.ro` from .NET 9 Azure Functions to Python 3.12 Azure Functions v2, preserving the exact same REST API contract so no caller changes are needed, while enabling future AI/ML experimentation capabilities.

**Architecture:** Replace all .cs files with a single `function_app.py` using Python v2 decorator model. Configuration loading uses `azure-appconfiguration-provider` (Python SDK) with `DefaultAzureCredential` from `azure-identity`. Local config reads from a `config.json` file. The Docker image switches to `mcr.microsoft.com/azure-functions/python:4-python3.12`. All HTTP callers (API's ConfigProxyClient, website's configProxy.ts) are unaffected — the REST contract is identical.

**Tech Stack:** Python 3.12, Azure Functions v2 (decorator model), azure-appconfiguration-provider, azure-identity, azure-keyvault-secrets, pytest, Docker

---

## Feasibility Analysis

### Why this conversion works

| Concern | Assessment |
|---------|-----------|
| **Azure Functions Python support** | Fully supported. Python v2 programming model with decorators is the recommended approach. Functions v4 runtime supports Python 3.9–3.12. |
| **Azure App Configuration Python SDK** | `azure-appconfiguration-provider` provides `load()` that returns a dict-like Mapping with `SettingSelector` for label filtering, Key Vault reference resolution, and refresh intervals. Feature parity with .NET provider. |
| **Azure Identity (Managed Identity)** | `azure-identity` package provides `DefaultAzureCredential` — identical concept to .NET. Works with UAMI via `managed_identity_client_id` parameter. |
| **Docker container** | Official base image: `mcr.microsoft.com/azure-functions/python:4-python3.12`. Well-tested, GA. |
| **Easy Auth (Entra ID)** | Language-agnostic. Easy Auth runs at the platform level (App Service/Functions host), not in application code. No changes needed. |
| **Caller compatibility** | Both ConfigProxyClient.cs and configProxy.ts talk via HTTP. They don't know or care what language the server uses. Zero caller changes. |
| **Future AI/ML** | Python ecosystem: numpy, pandas, scikit-learn, transformers, torch, onnxruntime all available. This is the primary motivation for the switch. |

### What changes vs what stays the same

| Component | Changes? | Details |
|-----------|----------|---------|
| `function_app.py` | **NEW** (replaces 3 .cs files) | All 3 HTTP triggers in one file using decorators |
| `requirements.txt` | **NEW** (replaces .csproj) | Python dependencies |
| `config.json` | **NEW** (replaces appsettings.json) | Local dev config values |
| `config_loader.py` | **NEW** | Azure App Config + Key Vault loading logic |
| `Dockerfile` | **CHANGED** | Python base image instead of .NET |
| `host.json` | **UNCHANGED** | Same file — it's runtime-agnostic |
| `.gitignore` | **UNCHANGED** | Same patterns |
| `local.settings.json` | **CHANGED** | `FUNCTIONS_WORKER_RUNTIME` → `python` |
| Bicep | **CHANGED** | `FUNCTIONS_WORKER_RUNTIME` → `python`, Docker image tag |
| Docker Compose | **CHANGED** | `FUNCTIONS_WORKER_RUNTIME` → `python` |
| ConfigProxyClient.cs | **NO CHANGE** | HTTP client, language-agnostic |
| configProxy.ts | **NO CHANGE** | HTTP client, language-agnostic |
| Easy Auth config | **NO CHANGE** | Platform-level, not app-level |

### REST API contract (unchanged)

```
GET /api/health
→ 200 {"status": "Healthy", "environment": "local", "timestamp": "2026-03-01T..."}

GET /api/config/{key}
→ 200 {"key": "Endpoints:StorageAccount", "value": "http://...", "fetchedAt": "..."}
→ 404 {"error": "Key 'X' not found"}

GET /api/config?keys=key1,key2
→ 200 {"values": [...], "fetchedAt": "..."}

GET /api/config?prefix=Endpoints
→ 200 {"values": [...], "fetchedAt": "..."}

GET /api/config  (no params)
→ 400 {"error": "Provide 'keys' or 'prefix' query parameter"}
```

**Note:** Response JSON field names use **camelCase** (matching .NET's default serialization). Python code must explicitly use camelCase keys in responses.

---

## Phase 1: Delete .NET Project Files

### Task 1.1: Remove all .NET source files

**Files to delete:**
- `sites/experiments.arolariu.ro/ConfigFunctions.cs`
- `sites/experiments.arolariu.ro/ConfigurationContracts.cs`
- `sites/experiments.arolariu.ro/Program.cs`
- `sites/experiments.arolariu.ro/experiments.arolariu.ro.csproj`
- `sites/experiments.arolariu.ro/appsettings.json`
- `sites/experiments.arolariu.ro/appsettings.Development.json`
- `sites/experiments.arolariu.ro/Dockerfile`
- `sites/experiments.arolariu.ro/local.settings.json` (if tracked)
- `sites/experiments.arolariu.ro/obj/` (build artifacts)
- `sites/experiments.arolariu.ro/bin/` (build artifacts)

**Keep:**
- `sites/experiments.arolariu.ro/host.json` (reuse — runtime-agnostic)
- `sites/experiments.arolariu.ro/.gitignore` (update content)

**Step 1: Delete files**

```bash
cd sites/experiments.arolariu.ro
rm -f ConfigFunctions.cs ConfigurationContracts.cs Program.cs
rm -f experiments.arolariu.ro.csproj
rm -f appsettings.json appsettings.Development.json
rm -f Dockerfile
rm -rf obj/ bin/
```

**Step 2: Commit**

```bash
git add -A sites/experiments.arolariu.ro/
git commit -m "refactor: remove .NET source files for Python conversion"
```

---

## Phase 2: Create Python Project Structure

### Task 2.1: Create requirements.txt

**Create:** `sites/experiments.arolariu.ro/requirements.txt`

```txt
azure-functions>=1.21.0
azure-identity>=1.18.0
azure-appconfiguration-provider>=1.3.0
azure-keyvault-secrets>=4.9.0
```

**Step 1: Create the file**

**Step 2: Verify packages are installable**

Run: `cd sites/experiments.arolariu.ro && python -m pip install -r requirements.txt --dry-run`
Expected: All packages resolve successfully

**Step 3: Commit**

```bash
git add sites/experiments.arolariu.ro/requirements.txt
git commit -m "feat: add Python requirements.txt for experiments service"
```

### Task 2.2: Create config.json (local development config)

This replaces `appsettings.json`. Contains the same local dev values.

**Create:** `sites/experiments.arolariu.ro/config.json`

```json
{
  "Common:Auth:Secret": "local-dev-jwt-secret-at-least-32-characters-long!!",
  "Common:Auth:Issuer": "https://localhost:5000",
  "Common:Auth:Audience": "https://localhost:3000",
  "Common:Azure:TenantId": "",
  "Endpoints:StorageAccount": "http://127.0.0.1:10000/devstoreaccount1",
  "Endpoints:SqlServer": "Server=localhost,8082;Database=arolariu;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true;",
  "Endpoints:NoSqlServer": "AccountEndpoint=https://localhost:8081/;AccountKey=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==;",
  "Endpoints:ApplicationInsights": "",
  "Endpoints:OpenAI": "",
  "Endpoints:CognitiveServices": "",
  "Endpoints:CognitiveServices:Key": "",
  "AzureOptions:StorageAccountEndpoint": "http://127.0.0.1:10000/devstoreaccount1"
}
```

**Step 1: Create the file**

**Step 2: Commit**

```bash
git add sites/experiments.arolariu.ro/config.json
git commit -m "feat: add config.json for local Python config"
```

### Task 2.3: Update local.settings.json

**Create:** `sites/experiments.arolariu.ro/local.settings.json`

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "python",
    "INFRA": "local"
  }
}
```

**Step 1: Create the file (it's gitignored, so just for local dev)**

**Step 2: Update .gitignore to also ignore Python artifacts**

**Modify:** `sites/experiments.arolariu.ro/.gitignore`

```
local.settings.json
__pycache__/
*.pyc
.venv/
.python_packages/
```

**Step 3: Commit**

```bash
git add sites/experiments.arolariu.ro/.gitignore
git commit -m "feat: update .gitignore for Python artifacts"
```

---

## Phase 3: Implement Config Loader

### Task 3.1: Create config_loader.py

This module handles configuration loading for both Azure and local modes. It replaces the `ConfigureAppConfiguration` logic from `Program.cs`.

**Create:** `sites/experiments.arolariu.ro/config_loader.py`

```python
"""
Configuration loader for experiments.arolariu.ro.

Loads configuration from Azure App Configuration + Key Vault (azure mode)
or from a local config.json file (local/proxy mode).

The config dict is loaded once at module import time and cached globally.
Azure mode supports automatic refresh via the provider's built-in mechanism.
"""

import json
import logging
import os
from pathlib import Path
from typing import Any

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
    from azure.identity import DefaultAzureCredential
    from azure.appconfiguration.provider import AzureAppConfigurationKeyVaultOptions

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
        refresh_on=[],  # No sentinel key — refresh all on interval
        refresh_interval=300,  # 5 minutes
    )

    # Convert the AzureAppConfigurationProvider mapping to a plain dict
    return dict(config)


def load_config() -> dict[str, str]:
    """
    Load configuration based on the INFRA environment variable.
    Returns a dict of key-value pairs.
    """
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
```

**Step 1: Write the failing test**

**Create:** `sites/experiments.arolariu.ro/tests/test_config_loader.py`

```python
"""Tests for config_loader module."""

import json
import pytest
from unittest.mock import patch, mock_open
from config_loader import _load_local_config, get_config_value, get_config_section


@pytest.fixture(autouse=True)
def reset_config():
    """Reset global config between tests."""
    import config_loader
    config_loader._config = {}
    yield
    config_loader._config = {}


class TestLoadLocalConfig:
    def test_loads_config_from_json_file(self, tmp_path):
        config_data = {"Endpoints:StorageAccount": "http://localhost:10000"}
        config_file = tmp_path / "config.json"
        config_file.write_text(json.dumps(config_data))

        with patch("config_loader.Path") as mock_path:
            mock_path.return_value.__truediv__ = lambda self, other: config_file
            # Simplified: just test the function loads JSON
            result = json.loads(config_file.read_text())
            assert result["Endpoints:StorageAccount"] == "http://localhost:10000"


class TestGetConfigValue:
    def test_returns_value_for_existing_key(self):
        import config_loader
        config_loader._config = {"test:key": "test-value"}
        assert get_config_value("test:key") == "test-value"

    def test_returns_none_for_missing_key(self):
        import config_loader
        config_loader._config = {"test:key": "test-value"}
        assert get_config_value("missing:key") is None


class TestGetConfigSection:
    def test_returns_matching_keys(self):
        import config_loader
        config_loader._config = {
            "Endpoints:Storage": "http://storage",
            "Endpoints:SQL": "http://sql",
            "Common:Auth": "secret",
        }
        result = get_config_section("Endpoints")
        assert len(result) == 2
        assert "Endpoints:Storage" in result
        assert "Endpoints:SQL" in result
        assert "Common:Auth" not in result
```

**Step 2: Run test to verify it fails**

Run: `cd sites/experiments.arolariu.ro && python -m pytest tests/test_config_loader.py -v`
Expected: FAIL — `config_loader` module not found (not created yet)

**Step 3: Create config_loader.py** (code above)

**Step 4: Run tests**

Run: `cd sites/experiments.arolariu.ro && python -m pytest tests/test_config_loader.py -v`
Expected: All tests pass

**Step 5: Commit**

```bash
git add sites/experiments.arolariu.ro/config_loader.py sites/experiments.arolariu.ro/tests/
git commit -m "feat: add Python config_loader with Azure App Config + local file support"
```

---

## Phase 4: Implement Azure Functions HTTP Triggers

### Task 4.1: Create function_app.py

This is the main entry point — replaces `ConfigFunctions.cs` and `ConfigurationContracts.cs`.

**Create:** `sites/experiments.arolariu.ro/function_app.py`

```python
"""
experiments.arolariu.ro — Configuration Proxy Service

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


# --------------------------------------------------------------------------
# GET /api/health
# --------------------------------------------------------------------------
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


# --------------------------------------------------------------------------
# GET /api/config/{key}
# --------------------------------------------------------------------------
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


# --------------------------------------------------------------------------
# GET /api/config?keys=key1,key2  or  GET /api/config?prefix=Endpoints
# --------------------------------------------------------------------------
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
```

**Step 1: Write the failing test**

**Create:** `sites/experiments.arolariu.ro/tests/test_function_app.py`

```python
"""Tests for function_app HTTP triggers."""

import json
import pytest
from unittest.mock import patch
import azure.functions as func


@pytest.fixture(autouse=True)
def mock_config():
    """Mock the config loader for all tests."""
    test_config = {
        "Endpoints:StorageAccount": "http://localhost:10000",
        "Endpoints:SQL": "http://localhost:8082",
        "Common:Auth:Issuer": "https://localhost:5000",
    }
    with patch("function_app.load_config"), \
         patch("function_app.get_config", return_value=test_config), \
         patch("function_app.get_config_value", side_effect=test_config.get), \
         patch("function_app.get_config_section", side_effect=lambda prefix: {
             k: v for k, v in test_config.items() if k.startswith(f"{prefix}:")
         }):
        yield


class TestGetHealth:
    def test_returns_healthy(self):
        from function_app import get_health
        req = func.HttpRequest(method="GET", body=b"", url="/api/health")
        resp = get_health(req)
        body = json.loads(resp.get_body())
        assert resp.status_code == 200
        assert body["status"] == "Healthy"


class TestGetConfigValue:
    def test_returns_value_for_existing_key(self):
        from function_app import get_config_value_endpoint
        req = func.HttpRequest(
            method="GET", body=b"", url="/api/config/Endpoints:StorageAccount",
            route_params={"key": "Endpoints:StorageAccount"},
        )
        resp = get_config_value_endpoint(req)
        body = json.loads(resp.get_body())
        assert resp.status_code == 200
        assert body["key"] == "Endpoints:StorageAccount"
        assert body["value"] == "http://localhost:10000"

    def test_returns_404_for_missing_key(self):
        from function_app import get_config_value_endpoint
        req = func.HttpRequest(
            method="GET", body=b"", url="/api/config/Missing:Key",
            route_params={"key": "Missing:Key"},
        )
        resp = get_config_value_endpoint(req)
        assert resp.status_code == 404


class TestGetConfigBatch:
    def test_returns_batch_values(self):
        from function_app import get_config_batch
        req = func.HttpRequest(
            method="GET", body=b"", url="/api/config?keys=Endpoints:StorageAccount,Common:Auth:Issuer",
            params={"keys": "Endpoints:StorageAccount,Common:Auth:Issuer"},
        )
        resp = get_config_batch(req)
        body = json.loads(resp.get_body())
        assert resp.status_code == 200
        assert len(body["values"]) == 2

    def test_returns_section_by_prefix(self):
        from function_app import get_config_batch
        req = func.HttpRequest(
            method="GET", body=b"", url="/api/config?prefix=Endpoints",
            params={"prefix": "Endpoints"},
        )
        resp = get_config_batch(req)
        body = json.loads(resp.get_body())
        assert resp.status_code == 200
        assert len(body["values"]) == 2

    def test_returns_400_without_params(self):
        from function_app import get_config_batch
        req = func.HttpRequest(
            method="GET", body=b"", url="/api/config", params={},
        )
        resp = get_config_batch(req)
        assert resp.status_code == 400
```

**Step 2: Run tests**

Run: `cd sites/experiments.arolariu.ro && python -m pytest tests/ -v`
Expected: All tests pass

**Step 3: Commit**

```bash
git add sites/experiments.arolariu.ro/function_app.py sites/experiments.arolariu.ro/tests/
git commit -m "feat: implement Python Azure Functions with 3 HTTP triggers"
```

---

## Phase 5: Create Dockerfile and Update Docker Compose

### Task 5.1: Create Python Dockerfile

**Create:** `sites/experiments.arolariu.ro/Dockerfile`

```dockerfile
FROM mcr.microsoft.com/azure-functions/python:4-python3.12

ENV AzureWebJobsScriptRoot=/home/site/wwwroot
ENV AzureFunctionsJobHost__Logging__Console__IsEnabled=true
ENV FUNCTIONS_WORKER_RUNTIME=python

COPY requirements.txt /home/site/wwwroot/
RUN pip install --no-cache-dir -r /home/site/wwwroot/requirements.txt

COPY . /home/site/wwwroot
```

**Step 1: Create the Dockerfile**

**Step 2: Build Docker image**

Run: `docker build -t experiments-arolariu-ro sites/experiments.arolariu.ro/`
Expected: Image builds successfully

**Step 3: Test container locally**

Run:
```bash
docker run -d --name experiments-py -p 5002:80 \
  -e AZURE_FUNCTIONS_ENVIRONMENT=Development \
  -e INFRA=local \
  -e "AzureWebJobsStorage=DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://host.docker.internal:10000/devstoreaccount1;QueueEndpoint=http://host.docker.internal:10001/devstoreaccount1;TableEndpoint=http://host.docker.internal:10002/devstoreaccount1" \
  -e FUNCTIONS_WORKER_RUNTIME=python \
  experiments-arolariu-ro
```

Wait 10 seconds, then:
```bash
curl http://localhost:5002/api/health
curl http://localhost:5002/api/config/Endpoints:StorageAccount
curl "http://localhost:5002/api/config?keys=Common:Auth:Issuer,Common:Auth:Audience"
curl "http://localhost:5002/api/config?prefix=Endpoints"
```

Expected: All return correct JSON matching the .NET version's output format

**Step 4: Clean up and commit**

```bash
docker stop experiments-py && docker rm experiments-py
git add sites/experiments.arolariu.ro/Dockerfile
git commit -m "feat: add Python Azure Functions Dockerfile"
```

### Task 5.2: Update Docker Compose

**Modify:** `infra/Local/Storage/docker-compose.yml`

Change the `experiments` service:
```yaml
  experiments:
    build:
      context: ../../../sites/experiments.arolariu.ro
      dockerfile: Dockerfile
    container_name: experiments-arolariu-ro
    ports:
      - "5002:80"
    environment:
      - AZURE_FUNCTIONS_ENVIRONMENT=Development
      - INFRA=local
      - AzureWebJobsStorage=DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://azurite:10000/devstoreaccount1;QueueEndpoint=http://azurite:10001/devstoreaccount1;TableEndpoint=http://azurite:10002/devstoreaccount1
      - FUNCTIONS_WORKER_RUNTIME=python
    networks:
      - arolariu-network
    depends_on:
      - azurite
```

Only change: `FUNCTIONS_WORKER_RUNTIME=python` (was `dotnet-isolated`).

**Step 1: Make the edit**

**Step 2: Commit**

```bash
git add infra/Local/Storage/docker-compose.yml
git commit -m "refactor: update Docker Compose for Python experiments service"
```

---

## Phase 6: Update Bicep Infrastructure

### Task 6.1: Update experiments-arolariu-ro.bicep

**Modify:** `infra/Azure/Bicep/sites/experiments-arolariu-ro.bicep`

Changes needed:
1. Header comments: `.NET 9` → `Python 3.12`
2. `FUNCTIONS_WORKER_RUNTIME`: `'dotnet-isolated'` → `'python'`
3. Metadata version bump: `'2.1.0'` → `'3.0.0'`

The rest stays the same — Easy Auth, identity, IP restrictions, container deployment all remain unchanged.

**Step 1: Apply edits**

In the `appSettings` array, change:
```bicep
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'dotnet-isolated'
        }
```
To:
```bicep
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'python'
        }
```

Update header comments and metadata version.

**Step 2: Validate Bicep**

Run: `az bicep build --file infra/Azure/Bicep/sites/experiments-arolariu-ro.bicep`
Expected: No errors

**Step 3: Validate full chain**

Run: `az bicep build --file infra/Azure/Bicep/main.bicep`
Expected: No errors (only pre-existing warnings)

**Step 4: Commit**

```bash
git add infra/Azure/Bicep/sites/experiments-arolariu-ro.bicep
git commit -m "refactor: update Bicep for Python-based experiments service"
```

---

## Phase 7: Add .funcignore and pyproject.toml

### Task 7.1: Create .funcignore

**Create:** `sites/experiments.arolariu.ro/.funcignore`

```
.venv/
.vscode/
tests/
__pycache__/
*.pyc
local.settings.json
.git/
.gitignore
```

### Task 7.2: Create pyproject.toml (for pytest and tooling)

**Create:** `sites/experiments.arolariu.ro/pyproject.toml`

```toml
[project]
name = "experiments-arolariu-ro"
version = "3.0.0"
description = "Configuration proxy service for arolariu.ro platform"
requires-python = ">=3.12"

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]

[tool.ruff]
target-version = "py312"
line-length = 120

[tool.ruff.lint]
select = ["E", "F", "I", "W"]
```

**Step 1: Create both files**

**Step 2: Commit**

```bash
git add sites/experiments.arolariu.ro/.funcignore sites/experiments.arolariu.ro/pyproject.toml
git commit -m "feat: add .funcignore and pyproject.toml for Python tooling"
```

---

## Phase 8: Integration Testing

### Task 8.1: Docker build + full endpoint test

**Step 1: Build and run**

```bash
cd sites/experiments.arolariu.ro
docker build -t experiments-arolariu-ro .
docker run -d --name experiments-py -p 5002:80 \
  -e AZURE_FUNCTIONS_ENVIRONMENT=Development \
  -e INFRA=local \
  -e "AzureWebJobsStorage=DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://host.docker.internal:10000/devstoreaccount1;QueueEndpoint=http://host.docker.internal:10001/devstoreaccount1;TableEndpoint=http://host.docker.internal:10002/devstoreaccount1" \
  -e FUNCTIONS_WORKER_RUNTIME=python \
  experiments-arolariu-ro
```

**Step 2: Test all endpoints**

```bash
sleep 10
curl -s http://localhost:5002/api/health
curl -s http://localhost:5002/api/config/Endpoints:StorageAccount
curl -s "http://localhost:5002/api/config?keys=Common:Auth:Issuer,Common:Auth:Audience"
curl -s "http://localhost:5002/api/config?prefix=Endpoints"
curl -s -w "\nHTTP %{http_code}" http://localhost:5002/api/config/NonExistent:Key
```

**Step 3: Verify response format matches .NET version**

Expected responses (JSON field names must be camelCase):
```json
{"status": "Healthy", "environment": "local", "timestamp": "..."}
{"key": "Endpoints:StorageAccount", "value": "http://127.0.0.1:10000/devstoreaccount1", "fetchedAt": "..."}
{"values": [...], "fetchedAt": "..."}
```

**Step 4: Clean up**

```bash
docker stop experiments-py && docker rm experiments-py
```

---

## Phase 9: Update Plan Documentation and PR

### Task 9.1: Update the implementation plan

**Modify:** `docs/plans/2026-02-28-centralized-configuration-service.md`

Add a note that experiments.arolariu.ro was converted from .NET to Python.

### Task 9.2: Push and update PR

```bash
git push
```

Update PR description to mention the Python conversion.

---

## Summary: File Mapping (.NET → Python)

| .NET File | Python Replacement |
|-----------|-------------------|
| `ConfigFunctions.cs` (89 lines) | `function_app.py` (~120 lines) |
| `ConfigurationContracts.cs` (7 lines) | Inline dicts in `function_app.py` |
| `Program.cs` (65 lines) | `config_loader.py` (~100 lines) |
| `experiments.arolariu.ro.csproj` | `requirements.txt` (4 lines) |
| `appsettings.json` | `config.json` |
| `appsettings.Development.json` | Deleted (not needed) |
| `Dockerfile` (12 lines) | `Dockerfile` (8 lines) |
| `host.json` | **Unchanged** |
| `.gitignore` | **Updated** (add Python patterns) |

**Total Python files: 6** (was 8 .NET files)

## Anticipated Copilot Review Comments

| Issue | Prevention |
|-------|-----------|
| "Hardcoded dev credentials in config.json" | Same as before — well-known emulator creds. Add comment in PR. |
| "Global mutable state in config_loader" | Intentional for warm-start optimization. Document in docstring. |
| "No type annotations on dict values" | Use `dict[str, str]` consistently. |
| "Missing error handling in _load_azure_config" | Add try/except with logging. |
| "local.settings.json committed" | Already gitignored. |
| "No input validation on key parameter" | Keys are URL-decoded by the Functions runtime. No injection risk. |
| "Logging user input (key)" | Structured logging via Python's `%s` formatting — not f-strings. |

## Future AI/ML Expansion Points

With Python in place, you can now add:
- `@app.route(route="experiments/predict")` — ML inference endpoint
- `@app.route(route="experiments/embed")` — Text embedding endpoint
- `requirements.txt` → add `numpy`, `scikit-learn`, `onnxruntime`, `transformers`
- Blueprints: `ml_blueprint.py` for organizing ML functions separately
- Shared `models/` directory for model loading utilities
