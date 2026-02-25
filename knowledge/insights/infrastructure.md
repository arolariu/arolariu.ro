---
description: Domain map for Azure Cloud, Bicep IaC, CI/CD pipelines, and deployment conventions
type: moc
created: 2026-02-25
---

# infrastructure

Infrastructure and deployment for the arolariu.ro platform. Azure Cloud provider with Bicep IaC, GitHub Actions CI/CD.

## Core Insights

### Observability Infrastructure (from RFC 1001)
- [[otlp-http-protocol-provides-vendor-neutral-telemetry-export]] — OTLP enables backend flexibility without app code changes
- [[opentelemetry-collector-serves-as-proxy-between-app-and-backends]] — Collector handles routing, filtering, and batching
- [[otlp-endpoint-configuration-uses-environment-variables]] — env var configuration for deployment flexibility
- [[seven-backends-support-otlp-validating-vendor-neutral-strategy]] — seven backends accept OTLP natively
- [[w3c-baggage-propagation-enables-cross-service-context-sharing]] — cross-service context propagation (speculative)

## Key Source Areas

- infra/Azure/Bicep/ — Infrastructure as Code
- .github/workflows/ — CI/CD pipeline definitions
- Azure Cloud services configuration

## Tensions

(none yet)

## Open Questions

- What are the deployment dependencies between frontend and backend?
- How does the CI pipeline handle monorepo-aware builds?
