# Experimental Service Local Guide

This FastAPI service provides configuration-proxy and feature-flag behavior.

## Representative Local API

`main.py` and the router modules under `api/` own the complete live route set.
The entries below are common public probes/configuration examples, not an
exhaustive inventory.

| Route | Responsibility |
| --- | --- |
| `/api/health` | Liveness |
| `/api/ready` | Readiness |
| `/api/v1/config` | Configuration values |
| `/api/v1/config?name=KEY` | One configuration value |

## Local Rules

- Ruff selects E, F, I, W, UP, B, SIM, and RUF with line length 120.
- Public functions have type hints.
- Use the PEP 695 `type` keyword for aliases.
- Tests use `*.test.py`, not `test_*.py`.
- Feature flags use bare catalog names and the `FeatureManagement:` storage
  prefix.
- `requirements-dev.txt` includes `requirements.txt`; install one, not both.

## Local Verification

Run from `sites/exp.arolariu.ro`:

```powershell
python -m ruff check .
python -m pytest -q
```

## Development

```powershell
pip install -r requirements-dev.txt
uvicorn main:app --reload
```
