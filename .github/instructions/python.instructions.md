---
name: Experimental Service Python
description: Python typing, FastAPI, Ruff, and pytest conventions for the experimental service.
applyTo: "sites/exp.arolariu.ro/**/*.py"
---

# Experimental Service Python

## Scope

Owns Python conventions for `sites/exp.arolariu.ro`.

## Required Inputs

- `sites/exp.arolariu.ro/AGENTS.md`
- The current endpoint/service and neighboring `*.test.py`
- Existing configuration and feature-flag helpers
- `sites/exp.arolariu.ro/pyproject.toml` plus the owning runtime/development
  requirements files when tooling or dependency behavior matters

## Rules

- Type public functions and data boundaries.
- Use PEP 695 aliases where a named alias is needed.
- Preserve async FastAPI behavior.
- Validate request and external data at the boundary.
- Keep route handlers thin and reusable behavior in focused modules.
- Keep feature catalog names bare and apply `FeatureManagement:` only at the
  storage boundary.
- Tests use the repository `*.test.py` naming convention.
- Satisfy the configured Ruff rule set without suppressing diagnostics.

## Reference Catalog

Open `references/python.md` only when the task needs one of:

- a typing decision beyond the rules above (a `Protocol`/`TypedDict` boundary
  shape, a frozen/slots value object, a PEP 695 alias for a new cross-module
  shape);
- a FastAPI router/middleware/DI-free composition decision, or a question
  about where shared validation/response-building behavior should live;
- a feature-flag storage-prefix or resolution-precedence question;
- a Ruff rule the task cannot obviously satisfy, or a pytest fixture/patch-
  target/reload question;
- a configuration loading, refresh, label-caching, or error-shape edge case
  not resolved by the rules above.

The catalog does not redefine these rules or the verification/escalation
sections below; it only adds repository-specific examples and anti-patterns.

## Validation

Validate language/tool assumptions against `pyproject.toml` and the owning
requirements file, then run Ruff and the smallest relevant pytest selection
from the service directory.

## Escalation

Ask before dependencies, public endpoint behavior, auth/security, or storage
contract changes.
