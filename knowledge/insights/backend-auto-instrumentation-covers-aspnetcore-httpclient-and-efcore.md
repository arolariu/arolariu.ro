---
description: "Three OTel instrumentation packages auto-trace inbound HTTP requests, outbound dependency calls, and EF Core database queries without any manual span creation"
type: pattern
source: "docs/rfc/2002-opentelemetry-backend-observability.md"
status: current
created: 2026-02-25
---

# Backend auto-instrumentation covers ASP.NET Core, HTTP Client, and EF Core

The backend configures three automatic instrumentation libraries that produce traces without any manual code: `OpenTelemetry.Instrumentation.AspNetCore` for inbound HTTP requests (capturing route, method, status code, duration), `OpenTelemetry.Instrumentation.Http` for outbound HTTP client calls (capturing dependency tracking with correlation headers), and `OpenTelemetry.Instrumentation.EntityFrameworkCore` for database queries (capturing SQL execution time and connection details).

This means approximately 90% of the telemetry data requires zero code changes. A new endpoint automatically gets request duration histograms, error rate tracking, and parent-child span relationships. A new database query via EF Core automatically gets execution time spans. Only business-specific operations -- like invoice processing workflows or AI analysis pipelines -- need manual `StartActivity` calls.

The separation mirrors the frontend's approach in [[observability-separates-auto-instrumentation-from-manual-business-spans]]: infrastructure concerns are handled automatically, and developers only instrument business logic. The difference is in the instrumentation targets -- the frontend auto-traces HTTP fetch, filesystem, and DNS operations, while the backend auto-traces ASP.NET Core requests, outbound HTTP, and database queries. Together, they provide end-to-end trace coverage across the full request lifecycle from browser to database.

The EF Core instrumentation package is still in beta (`1.0.0-beta.11`), which means its API surface may change. The ASP.NET Core and HTTP Client packages are stable releases and track the main OpenTelemetry .NET SDK version.

---

Related Insights:
- [[observability-separates-auto-instrumentation-from-manual-business-spans]] — extends: backend applies the same auto vs manual separation with different instrumentation targets
- [[trycatch-pattern-integrates-activity-tracing-into-every-service-method]] — enables: manual spans via TryCatch complement the auto-instrumented infrastructure spans
- [[auto-instrumentation-covers-http-fetch-filesystem-dns-without-manual-spans]] — extends: frontend equivalent covering different runtime instrumentation points
- [[trace-context-must-propagate-across-the-bff-boundary-for-end-to-end-transaction-visibility]] — enables: ASP.NET Core auto-instrumentation extracts traceparent from BFF requests, completing the distributed trace chain

Domains:
- [[backend-architecture]]
