---
description: "20+ auto-instrumentations from NodeSDK handle HTTP, fetch, fs, and DNS tracing automatically; developers only add manual spans for business logic"
type: pattern
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Auto-instrumentation covers HTTP, fetch, filesystem, and DNS without manual spans

The OpenTelemetry NodeSDK includes auto-instrumentation libraries that monkey-patch core Node.js modules to create spans automatically. HTTP requests, fetch calls, filesystem operations, and DNS lookups all generate traces without any developer intervention. Over 20 instrumentation libraries ship with the SDK, covering the infrastructure layer comprehensively.

This establishes a baseline observability layer that captures infrastructure-level behavior out of the box. Every outgoing HTTP call gets a span with method, URL, status code, and duration. Every database query routed through standard drivers gets traced. This baseline is valuable on its own for diagnosing latency issues and understanding request flow.

Developers then use the `withSpan` API only for business-logic operations — invoice processing, authentication flows, payment handling — operations that the auto-instrumentation cannot understand semantically. The auto-instrumentor sees an HTTP POST; only a manual span knows it is "creating an invoice."

This separation keeps instrumentation effort proportional to business complexity rather than infrastructure complexity. A new developer can add meaningful observability to a feature by wrapping one or two key operations in `withSpan`, knowing that all the plumbing-level tracing is already handled.

---

Related Insights:
- [[observability-separates-auto-instrumentation-from-manual-business-spans]] — extends: the pattern view of this same principle
- [[withspan-pattern-wraps-async-operations-for-automatic-span-lifecycle]] — enables: the API developers use for manual spans

Domains:
- [[frontend-patterns]]
