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

### Cross-Service Conventions (from RFC 1001)
- [[how-should-rpc-semantic-conventions-apply-to-internal-api-calls]] — convention alignment between frontend and backend telemetry

### Cross-Stack Observability (from RFC 2002)
- [[frontend-and-backend-telemetry-converge-at-azure-application-insights]] — both Next.js and .NET telemetry land in the same workspace for full-stack trace correlation

## Key Source Documents

- CLAUDE.md — Root project conventions
- .github/copilot-instructions.md — Root Copilot instructions
- .github/instructions/*.instructions.md — Context-aware instructions

## Tensions

(none yet)

## Open Questions

- What naming conventions are truly universal vs domain-specific?
- How do the testing strategies differ across domains?
