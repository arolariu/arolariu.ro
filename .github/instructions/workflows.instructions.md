---
name: GitHub Actions
description: Repository workflow permissions, OIDC, caching, triggers, concurrency, and reusable-action rules.
applyTo: ".github/workflows/*.yml,.github/workflows/*.yaml,.github/actions/**/*.yml,.github/actions/**/*.yaml"
---

# GitHub Actions

## Scope

Owns GitHub Actions workflow and composite-action conventions.

## Required Inputs

- Root `AGENTS.md`
- RFC 0001
- The complete workflow and called composite actions
- Existing sibling workflow for the same deployment/build family

## Rules

- Use the narrowest job and workflow permissions.
- Prefer OIDC and managed identity over stored cloud credentials.
- Pin action major versions consistently with the repository.
- Use hash-based cache keys without broad fallback keys.
- Keep path filters aligned with real project dependency boundaries.
- Add concurrency controls for deployments and other non-parallel-safe work.
- Reuse composite actions for repeated setup.
- Keep secrets out of logs, outputs, artifacts, and command lines.
- Do not hide a failing build/test/deploy step with `continue-on-error`.
- Preserve explicit environments and approval boundaries.

## Reference Catalog

Open `references/workflows.md` only when the task needs one of:

- a permissions, OIDC, or third-party-action decision on a specific workflow;
- a cache-key, path-filter, or concurrency-group decision beyond the rules
  above;
- an artifact/secret-handling or environment/deployment-safety question not
  resolved by the rules above;
- comparing a proposed workflow change against RFC 0001's established
  patterns.

The catalog does not redefine these rules, the Infrastructure Expert agent's
approval workflow, or the verification/escalation sections below; it only
adds repository-specific examples, anti-patterns, and live pointers. It does
not authorize any mutation.

## Validation

Inspect the full YAML graph and use the repository's existing workflow
validation only after the user approves a workflow edit.

## Escalation

Ask before any workflow mutation, permission expansion, secret use, production
deployment behavior, trigger change, or new third-party action.
