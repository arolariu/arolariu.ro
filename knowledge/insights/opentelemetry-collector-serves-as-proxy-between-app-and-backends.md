---
description: "Production architecture places an OTEL Collector between the application and observability backends, enabling routing, filtering, and batching at the infrastructure layer"
type: decision
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# OpenTelemetry Collector serves as proxy between application and backends

In the production architecture, the application does not export telemetry directly to backend services (Jaeger, Prometheus, etc.). Instead, it sends all signals to an OpenTelemetry Collector running as a sidecar or standalone service. The Collector receives OTLP data, then routes, filters, batches, and re-exports to one or more backends.

This separation means the application's export configuration is simple (one OTLP endpoint), while the Collector handles complex routing decisions. It also provides a buffer — if a backend is temporarily unavailable, the Collector can queue and retry without affecting application performance.

The Collector layer also enables infrastructure-level concerns like sampling, attribute enrichment, and multi-backend fanout to be configured independently of the application code. Changing where telemetry goes or how it is processed requires no application redeployment — only Collector reconfiguration.

---

Related Insights:
- [[otlp-http-protocol-provides-vendor-neutral-telemetry-export]] — foundation: OTLP is the protocol the Collector receives
- [[otlp-endpoint-configuration-uses-environment-variables]] — enables: the app points to the Collector via env vars

Domains:
- [[frontend-patterns]]
- [[infrastructure]]
