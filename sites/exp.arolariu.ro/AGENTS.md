# Experimental Service Agent Guide (exp.arolariu.ro)

> Python 3.12 + FastAPI + uvicorn

## Purpose

Configuration proxy and feature flag service for the arolariu.ro platform.

## Commands

```bash
python -m ruff check .      # Lint (Ruff)
python -m pytest -q          # Run tests
pip install -r requirements.txt  # Install deps
uvicorn main:app --reload    # Dev server
```

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/health` | Health check |
| `/api/ready` | Readiness probe |
| `/api/v1/config` | Configuration values |
| `/api/v1/config?name=KEY` | Single config key lookup |

## Rules

- Ruff rules: E, F, I, W, UP, B, SIM, RUF
- 120-char line length
- Type hints on all public functions
- PEP 695 `type` keyword for type aliases
- Tests as `*.test.py` files (not `test_*.py`)
- Feature flags: bare names in catalog, `FeatureManagement:` prefix in storage
