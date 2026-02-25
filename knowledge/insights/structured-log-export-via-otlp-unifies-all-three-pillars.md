---
description: "Exporting logs via OTLP alongside traces and metrics would complete the observability triangle, enabling correlated queries across all three signal types"
type: decision
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: speculative
created: 2026-02-25
---

# Structured log export via OTLP unifies all three pillars

Currently, traces and metrics are exported via OTLP to observability backends, but logs go to console only. Adding an OTLP log exporter would complete the three observability pillars: traces (distributed request flow), metrics (aggregate system behavior), and logs (detailed event records). Correlated logs — logs that include the active trace ID and span ID — enable jumping from a trace timeline to the corresponding log entries for that exact request. The OpenTelemetry LogBridge API can capture existing console.log output and forward it as structured OTLP log records.

---

Related Insights:
- [[console-based-logging-lacks-structured-export]] — resolves: the tension this addresses
- [[otlp-http-protocol-provides-vendor-neutral-telemetry-export]] — extends: same protocol for a third signal type

Domains:
- [[frontend-patterns]]
