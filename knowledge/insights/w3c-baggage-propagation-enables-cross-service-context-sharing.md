---
description: "W3C Baggage standard propagates key-value pairs across service boundaries, enabling shared context like tenant ID or feature flags between frontend and backend"
type: decision
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: speculative
created: 2026-02-25
---

# W3C Baggage propagation enables cross-service context sharing

W3C Baggage is a standard for propagating arbitrary key-value context across service boundaries alongside trace context. While W3C Trace Context propagates trace IDs, Baggage propagates application-level context: tenant ID, feature flags, A/B test assignments, deployment version. This context then appears in spans across all services in the request chain. For the arolariu.ro platform, this would enable propagating user context from the Next.js frontend to the .NET backend API without manual header management, creating rich cross-service correlation.

---

Related Insights:
- [[otlp-http-protocol-provides-vendor-neutral-telemetry-export]] — foundation: W3C Baggage uses the same standards-based approach

Domains:
- [[frontend-patterns]]
- [[infrastructure]]
