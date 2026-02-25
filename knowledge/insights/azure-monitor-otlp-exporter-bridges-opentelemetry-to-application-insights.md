---
description: "Azure.Monitor.OpenTelemetry.Exporter sends all three signals (logs, metrics, traces) to Application Insights via OTLP, avoiding vendor lock-in from the legacy SDK"
type: decision
source: "docs/rfc/2002-opentelemetry-backend-observability.md"
status: current
created: 2026-02-25
---

# Azure Monitor OTLP exporter bridges OpenTelemetry to Application Insights

The backend exports telemetry to Azure Application Insights through the `Azure.Monitor.OpenTelemetry.Exporter` package rather than the legacy Application Insights SDK. This exporter translates standard OpenTelemetry data into Azure Monitor's wire format, meaning the application code never uses Azure-specific telemetry APIs -- it only produces standard OTel traces, logs, and metrics.

This is the backend's answer to the same vendor-neutrality strategy the frontend implements with [[otlp-http-protocol-provides-vendor-neutral-telemetry-export]]. The critical difference is the transport layer: the frontend exports raw OTLP to a collector endpoint, while the backend uses Azure's OTLP-compatible exporter that handles the Azure Monitor protocol translation internally. Both approaches achieve the same outcome -- application code is decoupled from the observability backend.

The exporter is configured per signal type: `TracingExtensions`, `LoggingExtensions`, and `MeteringExtensions` each add the Azure Monitor exporter independently. This separation allows disabling or redirecting individual signals without affecting others -- for example, routing metrics to a different backend while keeping traces in Application Insights.

Connection string resolution flows through the `IOptionsManager` pattern, first checking `appsettings.json` for local development, then falling back to Azure Key Vault for production. This layered resolution avoids hardcoding the Application Insights endpoint in source code.

---

Related Insights:
- [[otlp-http-protocol-provides-vendor-neutral-telemetry-export]] — extends: frontend uses raw OTLP, backend uses Azure's OTLP bridge -- same philosophy, different transport
- [[managed-identity-replaces-connection-strings-for-telemetry-authentication]] — enables: the exporter authenticates via managed identity in production
- [[dual-telemetry-runs-otel-alongside-legacy-application-insights-until-q2-2026]] — gotcha: the legacy SDK still runs in parallel temporarily
- [[three-extension-methods-partition-telemetry-setup-by-signal-type]] — foundation: each extension method adds the Azure Monitor exporter for its signal

Domains:
- [[backend-architecture]]
- [[infrastructure]]
