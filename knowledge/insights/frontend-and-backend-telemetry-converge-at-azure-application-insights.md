---
description: "Both Next.js OTLP export and .NET Azure Monitor exporter deliver traces, logs, and metrics to the same Application Insights instance, enabling cross-stack correlation"
type: dependency
source: "docs/rfc/2002-opentelemetry-backend-observability.md"
status: current
created: 2026-02-25
---

# Frontend and backend telemetry converge at Azure Application Insights

The frontend (Next.js) and backend (.NET) observability systems use different export mechanisms but deliver telemetry to the same Azure Application Insights workspace. The frontend exports via raw OTLP protocol to a collector endpoint, while the backend uses the `Azure.Monitor.OpenTelemetry.Exporter` package that translates OpenTelemetry data into Azure Monitor's wire format directly. Both paths produce correlated data -- W3C Trace Context headers (`traceparent`, `tracestate`) propagated in HTTP requests link frontend-initiated spans to backend-created spans.

This convergence means that a single Kusto query in Azure Portal can trace a user action from browser click through Server Action, API endpoint, orchestration service, and database query. The Application Map visualization shows the full distributed topology. The operation_Id field correlates all telemetry across the stack boundary.

The architectural difference matters for configuration: the frontend's export is vendor-neutral OTLP that could target any compatible backend, while the .NET exporter is Azure-specific. If the observability backend changes, the frontend needs only an endpoint URL change, but the backend needs a different exporter package. Since [[azure-monitor-otlp-exporter-bridges-opentelemetry-to-application-insights]], the backend application code remains OTel-standard regardless -- only the exporter configuration changes.

The dual-stack convergence is currently complicated by [[dual-telemetry-runs-otel-alongside-legacy-application-insights-until-q2-2026]], which means some backend data arrives through the legacy SDK path with slightly different correlation semantics.

---

Related Insights:
- [[azure-monitor-otlp-exporter-bridges-opentelemetry-to-application-insights]] — foundation: the backend's export path to the shared destination
- [[otlp-http-protocol-provides-vendor-neutral-telemetry-export]] — foundation: the frontend's export path to the shared destination
- [[dual-telemetry-runs-otel-alongside-legacy-application-insights-until-q2-2026]] — gotcha: legacy SDK path complicates correlation temporarily
- [[browser-sdk-integration-completes-full-stack-observability]] — extends: browser-side telemetry adds the client layer to this convergence

Domains:
- [[backend-architecture]]
- [[infrastructure]]
- [[cross-cutting]]
