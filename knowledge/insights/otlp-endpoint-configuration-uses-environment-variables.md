---
description: "OTEL_EXPORTER_OTLP_ENDPOINT and signal-specific overrides enable deployment-time backend routing without code changes or redeployment"
type: convention
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# OTLP endpoint configuration uses environment variables

The OTLP exporter reads its destination from environment variables following the OpenTelemetry specification: `OTEL_EXPORTER_OTLP_ENDPOINT` sets the base URL, while `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` allow per-signal overrides. This convention means the same application binary can export to a local Collector in development, a staging Collector in preview, and a production Collector in production — controlled entirely by environment configuration. No code changes, no feature flags, no conditional imports. The per-signal overrides enable sending traces and metrics to different backends when needed (e.g., traces to Jaeger, metrics to Prometheus).

---

Related Insights:
- [[otlp-http-protocol-provides-vendor-neutral-telemetry-export]] — foundation: the protocol these endpoints receive
- [[opentelemetry-collector-serves-as-proxy-between-app-and-backends]] — extends: the Collector is typically the target endpoint

Domains:
- [[frontend-patterns]]
- [[infrastructure]]
