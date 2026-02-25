---
description: "Azure login uses OIDC federation where supported; GitHub Secrets scope credentials per environment; secrets never appear in cache keys or workflow logs"
type: convention
source: "docs/rfc/0001-github-actions-workflows.md"
status: current
created: 2026-02-25
---

# Azure authentication uses OIDC and environment-scoped secrets

All workflows that deploy to Azure authenticate through `azure/login@v2` using OpenID Connect (OIDC) federation where supported, falling back to GitHub Secrets for service principal credentials. Secrets are scoped to specific GitHub environments, preventing a workflow that deploys the CV site from accessing credentials intended for the production API deployment.

The security model enforces three constraints on secret handling in CI/CD. First, no secret value ever becomes part of a cache key -- since cache keys are visible in workflow logs and stored in GitHub's cache infrastructure, embedding secrets there would expose them. Second, secrets are excluded from structured log output, relying on GitHub Actions' built-in secret masking plus deliberate avoidance of logging credential-adjacent variables. Third, environment-specific scoping means that each deployment target (website staging, website production, API, CV site) has its own set of Azure credentials, limiting blast radius if a single credential is compromised.

OIDC is preferred over long-lived service principal secrets because it uses short-lived tokens that are automatically rotated per workflow run. This eliminates the operational burden of secret rotation schedules and reduces the window of exposure if a token is intercepted.

---

Related Insights:
- [[composite-setup-workspace-action-centralizes-all-ci-environment-configuration]] -- foundation: Azure login happens before the composite action in the workflow step sequence
- [[hash-based-caching-without-fallback-keys-guarantees-dependency-correctness]] -- extends: the no-fallback caching strategy also serves security by preventing cache-based credential leakage

Domains:
- [[infrastructure]]
