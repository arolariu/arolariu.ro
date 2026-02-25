---
description: "Both the OpenTelemetry SDK and the legacy Application Insights SDK run simultaneously, doubling telemetry overhead until the legacy SDK is removed after OTel feature parity"
type: gotcha
source: "docs/rfc/2002-opentelemetry-backend-observability.md"
status: current
created: 2026-02-25
---

# Dual telemetry runs OTel alongside legacy Application Insights until Q2 2026

The backend currently runs two telemetry systems in parallel: the OpenTelemetry SDK (the intended long-term solution) and the legacy Application Insights SDK (retained for features not yet available via OTel). This dual-stack situation means some telemetry data is duplicated, export overhead is roughly doubled, and developers must understand which SDK produces which data in Azure Monitor dashboards.

The RFC explicitly plans to phase out the Application Insights SDK once OpenTelemetry achieves feature parity for custom events and custom metrics -- targeted for Q2 2026. Until then, both SDKs are active in production. The practical implication for developers is that adding new telemetry should always use the OpenTelemetry APIs (ActivitySource, LoggerMessage, Meter), never the legacy `TelemetryClient`. New code built against the legacy SDK will need rework when the deprecation happens.

This is a recognized trade-off, not an oversight. The RFC lists it explicitly as a con. Agents working on observability code should treat the legacy Application Insights references as deprecated-in-place and avoid extending them.

---

Related Insights:
- [[azure-monitor-otlp-exporter-bridges-opentelemetry-to-application-insights]] — foundation: the OTel exporter that will eventually replace the legacy SDK entirely
- [[three-extension-methods-partition-telemetry-setup-by-signal-type]] — extends: only the OTel extension methods represent the future architecture

Domains:
- [[backend-architecture]]
