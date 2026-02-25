---
description: "Auto-instrumentation handles infrastructure concerns (HTTP, fetch, fs, DNS) while developers only add manual spans for business operations like invoice processing"
type: pattern
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Observability separates auto-instrumentation from manual business spans

The observability architecture creates a clean separation between infrastructure-level and business-level instrumentation. Auto-instrumentation libraries automatically trace HTTP requests, fetch calls, filesystem operations, and DNS lookups — these are infrastructure concerns that every web application shares. Manual instrumentation via `withSpan` is reserved for business logic that the auto-instrumentation cannot understand: invoice processing workflows, payment validation, AI analysis pipelines. This parallels the Island pattern's separation of server infrastructure (RSC pages) from interactive business logic (client islands). The practical effect is that a developer adding a new feature gets baseline observability for free and only needs to instrument the business-specific parts.

---

Related Insights:
- [[auto-instrumentation-covers-http-fetch-filesystem-dns-without-manual-spans]] — foundation: the auto-instrumentation capability this pattern builds on
- [[withspan-pattern-wraps-async-operations-for-automatic-span-lifecycle]] — enables: the API for the manual side of the separation

Domains:
- [[frontend-patterns]]
