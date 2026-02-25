---
description: "No automatic PII capture in logs or traces; connection strings are referenced by Key Vault URL only; activity sources are isolated by domain to limit data scope"
type: constraint
source: "docs/rfc/2002-opentelemetry-backend-observability.md"
status: current
created: 2026-02-25
---

# Telemetry data excludes PII through redaction and secret masking

The backend enforces three layers of protection against sensitive data appearing in telemetry. First, no automatic PII capture -- the OpenTelemetry instrumentation is configured to exclude user-identifiable fields from span attributes and log parameters by default. Second, secret masking -- connection strings and credentials are never logged directly; they are referenced only by their Key Vault URL, so even if a log entry captures the resolution path, the actual secret value does not appear. Third, scope isolation -- since [[activity-sources-align-with-ddd-bounded-contexts-for-domain-scoped-tracing]], each bounded context's traces are isolated, limiting the blast radius of any data leakage to a single domain.

For GDPR compliance, user identifiers are only included in telemetry when explicit consent tracking is in place. The Application Insights data retention policy defaults to 90 days, and the storage region is configurable (defaulting to Azure Brazil South for LGPD compliance).

This constraint directly parallels the frontend's approach in [[logging-sensitive-data-in-trace-attributes-is-a-security-violation]], which treats PII in trace attributes as a security violation. The backend extends this principle beyond trace attributes to cover structured logs and metrics as well. Any span tag like `activity?.SetTag("invoice.merchant_id", ...)` must be evaluated against this constraint -- merchant IDs may be acceptable, but customer email addresses or payment card numbers are not.

---

Related Insights:
- [[logging-sensitive-data-in-trace-attributes-is-a-security-violation]] — extends: frontend establishes the principle; backend applies it across all three signals
- [[activity-sources-align-with-ddd-bounded-contexts-for-domain-scoped-tracing]] — enables: domain isolation limits data leakage scope
- [[managed-identity-replaces-connection-strings-for-telemetry-authentication]] — extends: authentication itself avoids secret material

Domains:
- [[backend-architecture]]
- [[cross-cutting]]
