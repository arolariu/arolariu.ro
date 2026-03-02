# exp.arolariu.ro

Configuration and experimentation store service for the arolariu.ro platform.

## Purpose

`exp.arolariu.ro` is the server-side source of truth for runtime configuration catalogs and values used by:

- `sites/api.arolariu.ro` (backend API)
- `sites/arolariu.ro` (main website, server context only)

The service exposes a narrow HTTP API for catalog and key retrieval while enforcing caller authorization and key-level access control.

## Runtime model

- Platform: Python FastAPI (ASGI) hosted in Azure App Service container
- Entrypoint: `function_app.py`
- Route prefix: `/api`
- Container image base: `python:3.12-slim` + `uvicorn`

## API contract

### `GET /api/health`

Health endpoint (used by local Docker health checks and platform probes).

### `GET /api/catalog?for=api|website`

Returns typed catalog metadata for the requested target:

- `target`
- `version`
- `requiredKeys`
- `optionalKeys`
- `allowedPrefixes`
- `refreshIntervalSeconds`
- `fetchedAt`

### `GET /api/config/{key}`

Returns one key:

```json
{
  "key": "Common:Auth:Issuer",
  "value": "https://example",
  "fetchedAt": "..."
}
```

### `GET /api/config?keys=k1,k2`

Returns a batch:

```json
{
  "values": [
    {"key": "k1", "value": "v1", "fetchedAt": "..."},
    {"key": "k2", "value": "v2", "fetchedAt": "..."}
  ],
  "fetchedAt": "..."
}
```

### `GET /api/config?prefix=Common`

Returns all keys matching `prefix:`.

## Security model

### Authorization modes

#### Azure mode (`INFRA=azure`)

- Caller identity is resolved from Easy Auth headers:
  - `X-MS-CLIENT-PRINCIPAL-ID`
  - `X-MS-CLIENT-PRINCIPAL` (decoded for `oid`/`appid` claims)
- Allowed callers are configured via:
  - `EXP_CALLER_API_IDS`
  - `EXP_CALLER_WEBSITE_IDS`
- Access is deny-by-default:
  - unknown caller -> `401`
  - disallowed key/prefix/target -> `403`

#### Local mode (`INFRA!=azure`)

- Caller target is required for config routes:
  - `X-Exp-Target: api|website`
- Optional local shared token:
  - set `EXP_LOCAL_SHARED_TOKEN`
  - send `X-Exp-Local-Token`

## Access policy enforcement

Catalog ownership and allow-lists are defined in `catalog.py`:

- key-level allow-list (`requiredKeys` + `optionalKeys`)
- prefix allow-list (`allowedPrefixes`)
- per-target catalog contract (`api`, `website`)

Additional hardening:

- key format validation (`^[A-Za-z0-9:_-]{1,256}$`)
- required-key missing checks return `500` for required catalog keys

## Configuration sources

### Local

- Source: `config.json` (or `EXP_LOCAL_CONFIG_PATH`)
- Fallback: `config.template.json` when `config.json` is missing

### Azure

- Source: Azure App Configuration (+ Key Vault references)
- Required setting: `AZURE_APPCONFIG_ENDPOINT`
- Identity: `DefaultAzureCredential` (optionally using `AZURE_CLIENT_ID`)
- Optional env selector: `EXP_ENVIRONMENT` (`Production` -> production label, otherwise development)

## Environment variables

| Name | Required | Description |
| --- | --- | --- |
| `INFRA` | Yes | `azure` or local-like mode (`local`/`proxy`) |
| `AZURE_APPCONFIG_ENDPOINT` | Azure only | App Configuration endpoint URL |
| `AZURE_CLIENT_ID` | Optional | User Assigned Managed Identity client ID |
| `EXP_CALLER_API_IDS` | Azure only | Comma-separated principal IDs allowed as `api` |
| `EXP_CALLER_WEBSITE_IDS` | Azure only | Comma-separated principal IDs allowed as `website` |
| `EXP_CATALOG_REFRESH_INTERVAL_SECONDS` | Optional | Catalog refresh hint (default `300`) |
| `EXP_LOCAL_SHARED_TOKEN` | Optional (local) | Shared token required in local mode when set |
| `EXP_LOCAL_CONFIG_PATH` | Optional (local) | Absolute path to alternative local config JSON |
| `EXP_ENVIRONMENT` | Optional (azure) | Label selector source (`Production` or `Development`) |

## Local development

### Run with Docker Compose

From repository root:

```powershell
docker network create arolariu-network
docker compose -f infra/Local/Storage/docker-compose.yml up -d exp
```

Smoke checks:

```powershell
Invoke-WebRequest -Uri "http://localhost:5002/api/health"
Invoke-WebRequest -Uri "http://localhost:5002/api/catalog?for=website"
Invoke-WebRequest -Uri "http://localhost:5002/api/config/Common:Auth:Issuer" -Headers @{ "X-Exp-Target" = "website" }
```

### Run tests

```powershell
python -m pytest sites/exp.arolariu.ro/tests -q
```

### Run service directly (without Docker)

```powershell
cd sites/exp.arolariu.ro
python -m uvicorn function_app:app --host 0.0.0.0 --port 5002
```

## Design notes

- This service is intentionally server-to-server only.
- Website integration must happen in server context (`server-only` paths), never client-side.
- API and website consume catalog-driven keys so key ownership remains centralized in this service.
