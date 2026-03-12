---
version: "1.0.0"
lastUpdated: "2026-03-12"
name: 'Python Standards'
description: 'Python development guidelines for exp.arolariu.ro FastAPI service'
applyTo: 'sites/exp.arolariu.ro/**/*.py'
---

# Python Development Guidelines (exp.arolariu.ro)

## Instruction Contract

### Scope
Applies to Python code in `sites/exp.arolariu.ro/`.

### Mandatory Rules
- Follow Ruff linting rules (E, F, I, W, UP, B, SIM, RUF) with 120-char line length.
- Use type hints on all public functions and module-level variables.
- Write tests as `*.test.py` files using pytest with importlib import mode.

### Prohibited Actions
- Do not use `# type: ignore` without inline justification.
- Do not introduce synchronous blocking calls in async FastAPI handlers.
- Do not bypass Ruff rules with broad `noqa` directives.

### Required Verification Commands
```bash
cd sites/exp.arolariu.ro && python -m ruff check .
cd sites/exp.arolariu.ro && python -m pytest -q
```

### Failure Handling
- If verification fails, stop and report failing command output with impacted files.

---

## Quick Reference

| Aspect | Value |
|--------|-------|
| **Python** | 3.12 |
| **Framework** | FastAPI + uvicorn |
| **Linting** | Ruff (E, F, I, W, UP, B, SIM, RUF) |
| **Line Length** | 120 characters |
| **Testing** | pytest with `*.test.py` pattern |
| **Import Mode** | importlib |

---

## Code Style

### Type Hints (Required)

```python
# ✅ Use PEP 695 type aliases
type ConfigValue = str | int | float | bool | None

# ✅ Use ClassVar for mutable class attributes
from typing import ClassVar

class CatalogEntry:
    _registry: ClassVar[dict[str, "CatalogEntry"]] = {}

# ✅ Explicit return types on all public functions
async def get_config(name: str) -> ConfigValue:
    ...
```

### FastAPI Patterns

```python
# ✅ Use dependency injection
from fastapi import Depends

async def get_config_value(
    name: str,
    loader: ConfigLoader = Depends(get_loader),
) -> ConfigResponse:
    ...

# ✅ Proper error responses
from fastapi import HTTPException

if not value:
    raise HTTPException(status_code=404, detail=f"Config key '{name}' not found")
```

### Testing Patterns

```python
# File: feature.test.py (not test_feature.py)
import pytest

@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)

def test_health_endpoint_returns_200(client):
    response = client.get("/api/health")
    assert response.status_code == 200

async def test_config_returns_value(client):
    response = client.get("/api/v1/config?name=API_URL")
    assert response.status_code == 200
    data = response.json()
    assert "value" in data
```

---

## Feature Flags

- Catalog uses bare names (e.g., `"InvoiceAnalysis"`)
- Storage uses `FeatureManagement:` prefix (e.g., `"FeatureManagement:InvoiceAnalysis"`)
- Automatic prefix resolution in the config loader

---

## Project Structure

```
sites/exp.arolariu.ro/
├── main.py              # FastAPI application entry point
├── api/                  # API route modules
│   ├── health.py         # /api/health, /api/ready probes
│   ├── build_time.py     # /api/v1/build-time endpoints
│   ├── config.py         # /api/v1/config endpoints
│   └── common.py         # Shared API utilities
├── config/               # Configuration management
│   ├── catalog.py        # Config key catalog and validation
│   └── loader.py         # Config loading with caching
├── pyproject.toml        # Project config, Ruff rules, pytest setup
├── conftest.py           # Pytest configuration
├── requirements.txt      # Dependencies
└── Dockerfile            # Container build
```
