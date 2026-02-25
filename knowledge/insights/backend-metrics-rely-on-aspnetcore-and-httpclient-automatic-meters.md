---
description: "Four HTTP server metrics and two HTTP client metrics are collected automatically via OTel instrumentation, covering request duration, concurrency, and body sizes"
type: convention
source: "docs/rfc/2002-opentelemetry-backend-observability.md"
status: current
created: 2026-02-25
---

# Backend metrics rely on ASP.NET Core and HTTP Client automatic meters

The backend collects six standard metrics through OpenTelemetry's automatic instrumentation without any custom meter code. On the server side: `http.server.request.duration` (latency histogram), `http.server.active_requests` (concurrent request gauge), `http.server.request.body.size` (inbound payload distribution), and `http.server.response.body.size` (outbound payload distribution). On the client side: `http.client.request.duration` (outbound dependency latency) and `http.client.active_requests` (concurrent outbound request gauge).

These metric names follow the OpenTelemetry semantic conventions, meaning they are identical to what other OTel-instrumented .NET services produce. Dashboards and alerts built against these names are portable across services. The metrics are aggregated in-memory before export, with a 60-second batch interval that reduces network overhead while providing near-real-time visibility. This matches the approach in [[periodic-metric-export-at-60-seconds-balances-freshness-against-cost]].

No custom business metrics are defined yet -- the RFC lists business KPIs like "invoices processed per hour" and "average processing time" as future work. The current metric surface is purely infrastructure-level. When custom metrics are added, they should use dedicated `Meter` instances aligned with bounded contexts, paralleling how [[activity-sources-align-with-ddd-bounded-contexts-for-domain-scoped-tracing]] organizes tracing by domain.

---

Related Insights:
- [[periodic-metric-export-at-60-seconds-balances-freshness-against-cost]] — extends: backend applies the same 60-second export interval for metrics
- [[activity-sources-align-with-ddd-bounded-contexts-for-domain-scoped-tracing]] — extends: future custom metrics should follow the same domain-scoped pattern
- [[three-extension-methods-partition-telemetry-setup-by-signal-type]] — foundation: MeteringExtensions configures these automatic meters
- [[metric-naming-follows-component-dot-operation-convention]] — extends: backend metric names follow the OTel semantic convention equivalent

Domains:
- [[backend-architecture]]
