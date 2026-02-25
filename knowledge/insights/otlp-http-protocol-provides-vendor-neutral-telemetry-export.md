---
description: "OTLP over HTTP enables switching observability backends (Jaeger, Grafana, Datadog, etc.) without changing application code — only endpoint configuration changes"
type: decision
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# OTLP over HTTP provides vendor-neutral telemetry export

The RFC chooses OTLP (OpenTelemetry Protocol) over HTTP as the export format for all three telemetry signals: traces, metrics, and logs. This is fundamentally a vendor-neutrality decision. OTLP is the standard wire format supported by every major observability backend — Jaeger, Grafana Tempo, Datadog, Honeycomb, New Relic, Dynatrace, and others.

By exporting in OTLP, the application decouples completely from any specific backend. Switching from Jaeger to Grafana Tempo, or from a self-hosted stack to a managed service like Datadog, requires only changing an environment variable that specifies the OTLP endpoint URL. No application code changes, no library swaps, no redeployment of instrumented services.

The HTTP transport was chosen over gRPC for broader compatibility. While gRPC offers marginally better performance through binary framing and HTTP/2 multiplexing, HTTP works through every proxy, load balancer, and firewall without special configuration. In environments where gRPC proxying requires additional infrastructure (service meshes, gRPC-aware load balancers), HTTP eliminates an entire category of deployment issues.

This decision also future-proofs the telemetry pipeline. As the OTEL ecosystem matures and new backends emerge, OTLP compatibility is the baseline requirement — any backend that does not support OTLP is not a serious contender in the modern observability landscape.

---

Related Insights:
- [[seven-backends-support-otlp-validating-vendor-neutral-strategy]] — validates: proof that vendor neutrality is practical
- [[opentelemetry-collector-serves-as-proxy-between-app-and-backends]] — extends: the Collector adds routing flexibility on top of OTLP
- [[otlp-endpoint-configuration-uses-environment-variables]] — enables: the mechanism for changing backends

Domains:
- [[frontend-patterns]]
- [[infrastructure]]
