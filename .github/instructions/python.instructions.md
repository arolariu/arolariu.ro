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

## Validation

Run Ruff and the smallest relevant pytest selection from the service directory.

## Escalation

Ask before dependencies, public endpoint behavior, auth/security, or storage
contract changes.
