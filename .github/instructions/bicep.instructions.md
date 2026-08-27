---
name: Azure Bicep
description: Azure Bicep security, composition, naming, validation, and cost constraints.
applyTo: "**/*.bicep"
---

# Azure Bicep

## Scope

Owns Azure infrastructure-as-code conventions.

## Required Inputs

- Root `AGENTS.md`
- The calling Bicep file and sibling module
- Existing user-defined types and naming helpers
- Approved cost, region, security, and deployment intent

## Rules

- Keep `main.bicep` orchestration-focused and resources in cohesive modules.
- Reuse existing types and naming patterns.
- Use managed identities and least-privilege RBAC.
- Put secrets in Key Vault; never hardcode them.
- Use secure parameter decorators for secret inputs.
- Pin supported API versions consistent with neighboring modules.
- Preserve diagnostic settings, tags, TLS, and network restrictions.
- Avoid subscription-wide Owner or Contributor assignments.
- Treat SKU, region, networking, role, and new-resource changes as
  cost/security decisions.

## Reference Catalog

Open `references/bicep.md` only when the task needs one of:

- confirming or extending the facade module composition, deployment order, or
  identity-array convention;
- a naming, tagging, or user-defined-type decision beyond the rules above;
- an identity/RBAC/secret/network decision on a specific resource type;
- an API-version, diagnostics, or cost/SKU question not resolved by the rules
  above;
- constructing or reading a `what-if`/validation command for an approved
  change.

The catalog does not redefine these rules, the Infrastructure Expert agent's
approval workflow, or the verification/escalation sections below; it only
adds repository-specific examples, anti-patterns, and live pointers. It does
not authorize any mutation.

## Validation

Use Bicep build and Azure `what-if` only after the user approves the
infrastructure change and target scope.

## Escalation

Ask before every new resource, SKU/cost change, network rule, role assignment,
production deployment, or infrastructure mutation not explicit in the task.
