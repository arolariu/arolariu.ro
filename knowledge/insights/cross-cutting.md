---
description: Domain map for conventions that span all domains — naming, git workflow, testing, security
type: moc
created: 2026-02-25
---

# cross-cutting conventions

Conventions and constraints that apply across all domains in the monorepo. These are the universal rules every agent must know regardless of which area they're working in.

## Core Insights

### Security (from RFC 1001)
- [[logging-sensitive-data-in-trace-attributes-is-a-security-violation]] — PII must never appear in telemetry data
- [[attribute-redaction-processor-prevents-sensitive-data-leakage]] — defense-in-depth processor (speculative)

### Security (from RFC 2002)
- [[telemetry-data-excludes-pii-through-redaction-and-secret-masking]] — backend extends the PII prohibition to all three OTel signals (traces, logs, metrics)

### BFF Architecture (Owner Knowledge)
- [[nextjs-serves-as-backend-for-frontend-bridging-react-ui-and-dotnet-api]] — Next.js functions as a BFF layer between React UI and .NET API, handling auth, locale, and data shaping
- [[server-components-fetch-data-and-server-actions-mutate-keeping-a-slim-bff-barrier]] — RSC for reads, Server Actions for writes, keeping the BFF layer thin and domain-logic-free
- [[trace-context-must-propagate-across-the-bff-boundary-for-end-to-end-transaction-visibility]] — W3C trace headers must flow from BFF to API for full transaction tracing

### Cross-Service Conventions (from RFC 1001)
- [[how-should-rpc-semantic-conventions-apply-to-internal-api-calls]] — convention alignment between frontend and backend telemetry

### Cross-Stack Observability (from RFC 2002)
- [[frontend-and-backend-telemetry-converge-at-azure-application-insights]] — both Next.js and .NET telemetry land in the same workspace for full-stack trace correlation

## Key Source Documents

- CLAUDE.md — Root project conventions
- .github/copilot-instructions.md — Root Copilot instructions
- .github/instructions/*.instructions.md — Context-aware instructions

## Tensions

- The BFF's semantic error code mapping ([[http-status-codes-map-to-semantic-error-codes-for-ui-consumption]]) is undermined because [[all-service-exceptions-currently-map-to-500-status-missing-proper-http-differentiation]] — the backend returns 500 for all exception types, making frontend error differentiation unreliable until proper status mapping is implemented.

## Open Questions

- What naming conventions are truly universal vs domain-specific?
- How do the testing strategies differ across domains?
- Should the BFF layer implement retry/circuit-breaker logic for API calls, or should resilience live in the backend?

---

Agent Insights:
- 2026-02-25: BFF architecture insights form a tight cluster spanning frontend-patterns and backend-architecture. The error handling tension (500-for-everything) is the most actionable cross-cutting issue — it degrades both the BFF error handling and the frontend user experience simultaneously.
