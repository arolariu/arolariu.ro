---
description: "AddOTelLogging, AddOTelMetering, and AddOTelTracing each configure one signal independently, allowing per-signal exporter routing and conditional enablement"
type: pattern
source: "docs/rfc/2002-opentelemetry-backend-observability.md"
status: current
created: 2026-02-25
---

# Three extension methods partition telemetry setup by signal type

The backend's observability configuration is split into three distinct extension methods on `WebApplicationBuilder`: `AddOTelLogging()`, `AddOTelMetering()`, and `AddOTelTracing()`. Each method fully configures one OpenTelemetry signal -- registering its SDK provider, adding automatic instrumentation libraries, wiring up the Azure Monitor exporter, and conditionally enabling the console exporter for debug builds.

This per-signal partitioning has two architectural advantages. First, each signal can be independently modified or disabled without touching the others. If metrics export needs to route to a different backend, only `MeteringExtensions.cs` changes. If tracing needs additional instrumentation (say, gRPC), only `TracingExtensions.cs` is affected. Second, the separation makes the startup pipeline readable -- `AddGeneralDomainConfiguration` calls the three methods sequentially, and each call's responsibility is self-evident from the name.

The three methods are called from `WebApplicationBuilderExtensions.AddGeneralDomainConfiguration()` in the Core project, which is the single startup entrypoint described in [[domain-configuration-registers-via-extension-methods-on-webapplicationbuilder]]. Each extension method lives in its own file under `Common/Telemetry/{Logging,Metering,Tracing}/`, reinforcing the separation at the file system level.

Since [[console-exporters-are-conditionally-compiled-for-debug-builds-only]], each of the three extension methods independently gates its console exporter behind the DEBUG symbol. And since [[azure-monitor-otlp-exporter-bridges-opentelemetry-to-application-insights]], each independently adds the Azure Monitor exporter for its signal type.

---

Related Insights:
- [[console-exporters-are-conditionally-compiled-for-debug-builds-only]] — enables: each extension method conditionally adds console export
- [[azure-monitor-otlp-exporter-bridges-opentelemetry-to-application-insights]] — enables: each extension method adds Azure Monitor export for its signal
- [[activity-sources-align-with-ddd-bounded-contexts-for-domain-scoped-tracing]] — foundation: tracing extension registers all four domain activity sources
- [[domain-configuration-registers-via-extension-methods-on-webapplicationbuilder]] — foundation: the startup pattern that calls these three methods

Domains:
- [[backend-architecture]]
