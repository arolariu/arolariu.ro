---
description: "Measured production CPU impact below 1% confirms that the 'instrument everything' philosophy adds negligible runtime cost to the application"
type: constraint
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Less than 1% CPU overhead validates comprehensive instrumentation

The RFC reports that comprehensive instrumentation — auto-instrumentation of all HTTP/fetch/fs/DNS operations plus manual spans on business logic — adds less than 1% CPU overhead in production. This measurement validates the core design thesis that observability can be comprehensive without being expensive.

The sub-1% overhead comes from several optimizations working together: batch span processing amortizes export cost across many spans instead of one network call per span, lazy initialization avoids any startup penalty before the first telemetry call, production debug log suppression means unused log levels have zero cost, and efficient attribute storage through typed helper functions creates minimal attribute sets without extra allocations.

Section 5.3 of the RFC breaks down the per-operation costs: span creation at 10-50 microseconds, metric recording at 1-5 microseconds, log correlation at 5-10 microseconds, and attribute setting at 1-2 microseconds per attribute. These micro-costs sum to less than 1% even under production load because most request time is spent in I/O (database queries, network calls), not in CPU-bound instrumentation work.

This measurement should be re-validated as the application grows and more manual spans are added, since each `withSpan` call adds a small fixed cost. If the application moves from dozens to hundreds of manual spans per request, the aggregate could become measurable.

---

Related Insights:
- [[span-creation-overhead-of-10-50-microseconds-is-negligible]] — foundation: the per-span cost that sums to less than 1%
- [[debug-logs-suppressed-in-production-to-eliminate-overhead]] — enables: one of the optimizations keeping overhead low
- [[memory-footprint-of-10-20mb-establishes-telemetry-cost-baseline]] — extends: CPU complements the memory cost picture

Domains:
- [[frontend-patterns]]
