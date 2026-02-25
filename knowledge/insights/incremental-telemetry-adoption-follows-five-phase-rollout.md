---
description: "Migration from zero to full observability follows: install deps, init SDK, instrument critical paths, expand to components, add custom metrics and business spans"
type: pattern
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Incremental telemetry adoption follows five-phase rollout

The RFC defines a five-phase adoption strategy that prevents the common failure mode of trying to instrument everything at once.

Phase 1 installs dependencies without changing any application code. Phase 2 initializes the SDK in `register()` and verifies auto-instrumentation produces traces. Phase 3 adds `withSpan` to the most critical code paths (authentication, core API endpoints). Phase 4 expands instrumentation to secondary components and routes. Phase 5 adds custom metrics counters and business-logic-specific spans (invoice processing duration, payment success rates).

Each phase is independently testable and deployable. Teams can stop at any phase and still have value. Phase 2 alone — auto-instrumentation with no manual code changes — provides HTTP request tracing, fetch call visibility, and basic error tracking.

This phased approach also manages risk. If telemetry causes a performance regression, the blast radius is limited to whatever was added in the current phase. Rolling back is straightforward because each phase's changes are isolated and incremental.

---

Related Insights:
- [[auto-instrumentation-covers-http-fetch-filesystem-dns-without-manual-spans]] — enables: phase 2 gets value from auto-instrumentation alone
- [[withspan-pattern-wraps-async-operations-for-automatic-span-lifecycle]] — enables: phases 3-5 use withSpan for manual instrumentation

Domains:
- [[frontend-patterns]]
