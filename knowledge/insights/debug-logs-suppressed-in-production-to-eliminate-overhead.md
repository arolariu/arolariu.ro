---
description: "Production environment automatically strips debug-level logging via NODE_ENV check, preventing verbose telemetry from impacting performance"
type: convention
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Debug logs are suppressed in production to eliminate overhead

The logging helper checks `NODE_ENV` before emitting debug-level messages. In production, debug logs are silently dropped with no string formatting, no attribute construction, and no console output. This is a zero-cost optimization: the conditional check short-circuits before any serialization or I/O work is performed.

Developers can freely instrument with debug-level telemetry during development without worrying about production performance impact. Verbose logging of request payloads, intermediate computation results, or cache hit/miss details is encouraged during development because it costs nothing in production.

The convention is that debug logs exist for development troubleshooting only. Production observability relies on three signals: info-level and above logs for significant events, metrics for quantitative monitoring, and traces for request flow analysis. Debug logs would add noise to production log aggregation systems and increase storage costs without providing actionable information that the other signals do not already cover.

This approach differs from dynamic log-level configuration (where production log levels can be changed at runtime). The RFC favors compile-time elimination over runtime configuration because it guarantees zero overhead rather than minimal overhead, and it prevents accidental debug-level activation in production from overwhelming log ingestion pipelines.

---

Related Insights:
- [[less-than-1-percent-cpu-overhead-validates-comprehensive-instrumentation]] — enables: debug suppression is one reason overall overhead stays below 1%
- [[span-creation-overhead-of-10-50-microseconds-is-negligible]] — extends: another dimension of production performance optimization

Domains:
- [[frontend-patterns]]
