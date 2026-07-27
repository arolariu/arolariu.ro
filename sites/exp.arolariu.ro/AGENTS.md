# Experimental Service Agent Guide (exp.arolariu.ro)

> Python 3.12 + FastAPI + uvicorn

## Purpose

Configuration proxy and feature flag service for the arolariu.ro platform.

## Commands

```bash
python -m ruff check .       # Lint (Ruff)
python -m pytest -q          # Run tests
uvicorn main:app --reload    # Dev server
```

Installing dependencies — pick **one**, not both. `requirements-dev.txt`
starts with `-r requirements.txt`, so it is a superset:

```bash
pip install -r requirements-dev.txt   # Development: runtime + pytest, pytest-cov, ruff, bandit, pydoc-markdown
pip install -r requirements.txt       # Runtime only (what the Docker image installs)
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
