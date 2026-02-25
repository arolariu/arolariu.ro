---
description: Domain map for Azure Cloud, Bicep IaC, CI/CD pipelines, and deployment conventions
type: moc
created: 2026-02-25
---

# infrastructure

Infrastructure and deployment for the arolariu.ro platform. Azure Cloud provider with Bicep IaC, GitHub Actions CI/CD.

## Core Insights

### GitHub Actions CI/CD — RFC 0001

**Pipeline Architecture**
- [[ci-cd-uses-three-workflow-patterns-based-on-deployment-risk-level]] — Build-Release (website), Trigger (API/CV/docs), and Validation (hygiene/e2e) patterns matched to deployment risk
- [[composite-setup-workspace-action-centralizes-all-ci-environment-configuration]] — single composite action eliminates ~150 lines of duplicated setup across all workflows
- [[monorepo-workflows-use-path-filters-to-trigger-only-relevant-pipelines]] — path-scoped triggers prevent unnecessary builds when unrelated projects change
- [[workflow-concurrency-groups-cancel-in-progress-runs-on-same-ref]] — cancel-in-progress prevents resource waste and deployment races on rapid pushes
- [[workflow-dispatch-provides-manual-override-for-all-ci-cd-pipelines]] — universal escape hatch for re-runs, hotfixes, and infrastructure-only changes

**Caching Strategy**
- [[hash-based-caching-without-fallback-keys-guarantees-dependency-correctness]] — no restore-keys fallback; correctness over speed to prevent stale dependency bugs
- [[cache-keys-include-workflow-specific-prefixes-to-prevent-cross-workflow-pollution]] — workflow-scoped prefixes isolate dependency caches across different pipeline purposes

**Deployment & Environment Promotion**
- [[website-deployment-separates-build-from-release-with-manual-approval-gates]] — two-workflow pattern with workflow_run chain for the highest-risk deployment
- [[preview-branch-serves-as-website-staging-with-promotion-to-main]] — preview branch is the website staging environment; other projects deploy directly from main
- [[docker-images-tagged-with-commit-sha-for-artifact-traceability]] — immutable SHA tags enable precise rollback and source-to-deployment tracing

**Build Pipeline Features**
- [[graphql-artifact-generation-runs-during-workspace-setup-before-build-steps]] — code generation runs inside the composite action so build steps always have derived types available
- [[hygiene-checks-run-parallel-validation-jobs-with-aggregated-pr-summary]] — fan-out/fan-in pattern for parallel lint, format, test, stats with consolidated PR comment

**Security & Authentication**
- [[azure-authentication-uses-oidc-and-environment-scoped-secrets]] — OIDC federation for short-lived tokens; secrets scoped per environment, never in cache keys or logs

### Observability Infrastructure (from RFC 1001)
- [[otlp-http-protocol-provides-vendor-neutral-telemetry-export]] — OTLP enables backend flexibility without app code changes
- [[opentelemetry-collector-serves-as-proxy-between-app-and-backends]] — Collector handles routing, filtering, and batching
- [[otlp-endpoint-configuration-uses-environment-variables]] — env var configuration for deployment flexibility
- [[seven-backends-support-otlp-validating-vendor-neutral-strategy]] — seven backends accept OTLP natively
- [[w3c-baggage-propagation-enables-cross-service-context-sharing]] — cross-service context propagation (speculative)

### Backend Observability Infrastructure (from RFC 2002)
- [[azure-monitor-otlp-exporter-bridges-opentelemetry-to-application-insights]] — .NET exporter translates standard OTel data to Azure Monitor wire format
- [[managed-identity-replaces-connection-strings-for-telemetry-authentication]] — Managed Identity in production eliminates secrets in telemetry configuration
- [[frontend-and-backend-telemetry-converge-at-azure-application-insights]] — both stacks deliver to the same Application Insights workspace for cross-stack correlation

## Key Source Areas

- infra/Azure/Bicep/ — Infrastructure as Code
- .github/workflows/ — CI/CD pipeline definitions
- .github/actions/setup-workspace/ — Composite action for CI environment setup
- Azure Cloud services configuration

## Tensions

(none yet)

## Open Questions

- What are the deployment dependencies between frontend and backend?
- What container registry retention policy manages the accumulation of SHA-tagged Docker images?
- How should cache analytics be tracked to monitor hit rates across workflows?
