---
description: "Application Insights endpoint is resolved through IOptionsManager, checking appsettings.json first for local dev then Azure Key Vault for production, avoiding hardcoded URLs"
type: pattern
source: "docs/rfc/2002-opentelemetry-backend-observability.md"
status: current
created: 2026-02-25
---

# IOptionsManager resolves telemetry endpoints from config then Key Vault

The Application Insights connection endpoint is not hardcoded or passed via environment variables. Instead, it flows through the `IOptionsManager` service, which implements a two-tier resolution strategy: first it checks `appsettings.json` (for local development), then it queries Azure Key Vault (for production deployments). The resolved value is accessed via `GetApplicationOptions().ApplicationInsightsEndpoint`.

This pattern avoids the common pitfall of committing connection strings to source control or relying on environment variables that might drift between deployment environments. In local development, the connection string lives in `appsettings.json` (which is gitignored for sensitive values). In production, Key Vault is the single source of truth, and the application's managed identity handles authentication to retrieve it, as described in [[managed-identity-replaces-connection-strings-for-telemetry-authentication]].

The `IOptionsManager` abstraction is part of the Common package's infrastructure layer, meaning telemetry configuration follows the same resolution pattern as every other secret or environment-specific setting in the application. This consistency means a developer familiar with how database connection strings are resolved already understands how the telemetry endpoint is resolved -- no special-case knowledge required.

If both config file and Key Vault lack the value, the source-generated logging method `LogOptionValueIsCompletelyMissing` fires at Critical level and the application throws, since [[source-generated-logging-eliminates-allocation-overhead-in-dotnet]] provides the zero-allocation logging path for this critical failure case.

---

Related Insights:
- [[managed-identity-replaces-connection-strings-for-telemetry-authentication]] — enables: Key Vault access uses the same managed identity as telemetry export
- [[source-generated-logging-eliminates-allocation-overhead-in-dotnet]] — example: the missing-option log message is a source-generated method
- [[azure-monitor-otlp-exporter-bridges-opentelemetry-to-application-insights]] — foundation: the resolved endpoint is consumed by the Azure Monitor exporter

Domains:
- [[backend-architecture]]
