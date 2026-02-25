---
description: "Each attribute costs 1-2us to record — individually negligible but spans with 10-20 semantic attributes accumulate 10-40us of attribute overhead alone"
type: constraint
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Per-attribute recording overhead compounds for spans with many attributes

Recording a single attribute on a span costs 1-2 microseconds. This is individually negligible, but the semantic convention interfaces encourage rich attributes: an HTTP server span might include method, URL, status code, user agent, content length, route pattern, scheme, and server name — 8+ attributes at 1-2 microseconds each equals 8-16 microseconds just for attributes. A database span adds system, statement, operation, connection string (redacted), and table name. When multiple spans overlap in a request (parent HTTP span + child database spans + child cache spans), the cumulative attribute recording time can reach 50-100 microseconds. Still negligible for most requests, but worth monitoring in high-throughput, low-latency paths.

---

Related Insights:
- [[span-creation-overhead-of-10-50-microseconds-is-negligible]] — extends: attribute overhead adds to base span cost
- [[low-cardinality-attributes-enforced-by-type-system-prevent-dashboard-explosion]] — extends: fewer attributes per span also means less recording overhead

Domains:
- [[frontend-patterns]]
