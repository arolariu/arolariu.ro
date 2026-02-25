---
description: "W3C Trace Context headers must flow from Next.js Server Actions through fetch calls to .NET API, creating a single distributed trace per user transaction"
type: constraint
source: "owner knowledge"
status: current
created: 2026-02-25
---

# Trace context must propagate across the BFF boundary for end-to-end transaction visibility

When a user browses the application, their actions create a chain: browser → Next.js Server Component/Action (BFF) → .NET API → database. For observability to show the *complete transaction*, the W3C Trace Context (`traceparent` header) must propagate across each boundary. Without propagation, the BFF creates one trace and the API creates a separate trace — two disconnected views of the same user action.

Since [[nextjs-serves-as-backend-for-frontend-bridging-react-ui-and-dotnet-api]], every API call passes through the Next.js layer. This makes the BFF boundary the critical propagation point. The fetch calls from Server Actions to the .NET API must forward the `traceparent` and `tracestate` headers so that the backend's Activity-based tracing joins the same distributed trace. Since [[frontend-and-backend-telemetry-converge-at-azure-application-insights]], both halves land in the same Application Insights workspace — but they only correlate if the trace ID matches.

The practical implication: every `fetch()` call in Server Actions that hits the .NET API must include trace context headers. The OpenTelemetry auto-instrumentation for `fetch` handles this automatically when the SDK is initialized, but custom HTTP clients or non-standard API calls could break the chain. On the receiving end, since [[backend-auto-instrumentation-covers-aspnetcore-httpclient-and-efcore]], ASP.NET Core auto-extracts the `traceparent` header from incoming requests, continuing the distributed trace into domain-scoped activities. Because [[activity-sources-align-with-ddd-bounded-contexts-for-domain-scoped-tracing]], the propagated trace fans out into per-bounded-context child spans — an invoice creation trace from the BFF becomes visible as distinct Invoice, Auth, and Core spans in Application Insights.

---

Related Insights:
- [[nextjs-serves-as-backend-for-frontend-bridging-react-ui-and-dotnet-api]] — foundation: the BFF architecture creating this propagation requirement
- [[frontend-and-backend-telemetry-converge-at-azure-application-insights]] — enables: shared sink where correlated traces land
- [[server-actions-wrap-api-calls-in-opentelemetry-spans-for-tracing]] — extends: Server Actions are where propagation happens
- [[w3c-baggage-propagation-enables-cross-service-context-sharing]] — extends: Baggage adds application context on top of trace context
- [[auto-instrumentation-covers-http-fetch-filesystem-dns-without-manual-spans]] — enables: auto-instrumentation patches fetch to propagate headers
- [[backend-auto-instrumentation-covers-aspnetcore-httpclient-and-efcore]] — enables: ASP.NET Core auto-extracts traceparent from incoming BFF requests
- [[activity-sources-align-with-ddd-bounded-contexts-for-domain-scoped-tracing]] — extends: propagated trace fans into domain-scoped activities on the backend
- [[how-should-rpc-semantic-conventions-apply-to-internal-api-calls]] — tension: convention choice affects how spans at the propagation boundary are semantically described

Domains:
- [[frontend-patterns]]
- [[backend-architecture]]
- [[cross-cutting]]
