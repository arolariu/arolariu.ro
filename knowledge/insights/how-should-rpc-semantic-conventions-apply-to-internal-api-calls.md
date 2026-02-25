---
description: "RFC notes partial compliance for RPC conventions — internal API calls between Next.js frontend and .NET backend need convention alignment"
type: decision
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: speculative
created: 2026-02-25
---

# How should RPC semantic conventions apply to internal API calls?

The RFC's Section 12.2 compliance table acknowledges partial compliance with OpenTelemetry RPC (Remote Procedure Call) semantic conventions. HTTP and Database conventions are fully compliant, Messaging is not applicable, but RPC is marked with a warning — "Partial (internal APIs)." This gap raises a concrete question for the platform's cross-service telemetry.

The question is: should internal API calls from the Next.js frontend to the .NET backend be instrumented as HTTP calls (using `http.*` conventions) or as RPC calls (using `rpc.*` conventions)? HTTP conventions capture method, URL, and status code — the transport-level view. RPC conventions capture service name, method name, and system — the semantic-level view. For example, an invoice creation call could be `http.method: POST, http.url: /api/invoices` or `rpc.service: InvoiceService, rpc.method: CreateInvoice, rpc.system: dotnet`.

The answer likely depends on how the team conceptualizes the backend. If the .NET API is viewed as a REST API (resources, HTTP verbs, status codes), HTTP conventions are natural and sufficient. If it is viewed as a service interface that happens to use HTTP as transport (which aligns with The Standard's layer model), RPC conventions would be more expressive and would correlate better with backend traces that use the same service/method naming.

This decision affects both frontend span attributes and potential backend correlation. If the frontend uses `rpc.service: InvoiceService` and the backend uses the same convention, distributed traces become self-documenting across the service boundary.

---

Related Insights:
- [[semantic-attribute-interfaces-align-otel-spec-with-typescript]] — extends: would need new RPC attribute interfaces
- [[w3c-baggage-propagation-enables-cross-service-context-sharing]] — extends: RPC context propagation between services

Domains:
- [[frontend-patterns]]
- [[cross-cutting]]
