---
description: "Production telemetry export authenticates via Azure Managed Identity (AZURE_CLIENT_ID), while development falls back through DefaultAzureCredential's chain"
type: decision
source: "docs/rfc/2002-opentelemetry-backend-observability.md"
status: current
created: 2026-02-25
---

# Managed identity replaces connection strings for telemetry authentication

The backend authenticates its telemetry export to Azure Application Insights using `DefaultAzureCredential` rather than embedding a connection string or instrumentation key directly in configuration. In production, the `AZURE_CLIENT_ID` environment variable points to an Azure Managed Identity, which means no secrets exist in code, configuration files, or environment variables -- the identity is attached to the compute resource itself.

During development, `DefaultAzureCredential` falls back through a credential chain: Visual Studio credentials, Azure CLI login, then environment variables. This means developers authenticated to Azure through any standard tool can export telemetry without manual key management. The credential object is cached internally, so repeated authentication calls do not incur network overhead on every telemetry export batch.

This decision reinforces the broader security constraint in [[telemetry-data-excludes-pii-through-redaction-and-secret-masking]] -- not only is telemetry content sanitized, but the transport authentication itself avoids secret material. The connection string for the Application Insights endpoint is resolved through `IOptionsManager`, which checks `appsettings.json` first (for local development) and then Azure Key Vault (for production), as described in [[ioptions-manager-resolves-telemetry-endpoints-from-config-then-keyvault]].

---

Related Insights:
- [[azure-monitor-otlp-exporter-bridges-opentelemetry-to-application-insights]] — foundation: the exporter that uses this authentication mechanism
- [[telemetry-data-excludes-pii-through-redaction-and-secret-masking]] — extends: authentication security complements data content security
- [[ioptions-manager-resolves-telemetry-endpoints-from-config-then-keyvault]] — enables: endpoint URL resolution pairs with identity-based authentication

Domains:
- [[backend-architecture]]
- [[infrastructure]]
