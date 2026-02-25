---
description: "The Standard's TryCatchAsync wrapper starts an Activity at method entry and disposes it on exit, giving every service method automatic span lifecycle management"
type: pattern
source: "docs/rfc/2002-opentelemetry-backend-observability.md"
status: current
created: 2026-02-25
---

# TryCatch pattern integrates Activity tracing into every service method

Every service method in The Standard wraps its body in `TryCatchAsync`, which provides both error handling and observability in a single construct. Inside the lambda, the first line creates a `using var activity = DomainPackageTracing.StartActivity(nameof(Method))`, and the `using` block ensures the activity is disposed (and its duration recorded) regardless of whether the method succeeds or throws.

This creates a natural span-per-service-method pattern without requiring developers to think about tracing separately from error handling. The TryCatch pattern already exists for exception wrapping in The Standard methodology; adding Activity creation inside it means tracing is a side effect of following the existing architectural pattern rather than an additional concern to remember.

The pattern produces a span hierarchy that mirrors the service call chain: an endpoint span wraps a processing span, which wraps orchestration spans, which wrap foundation spans. This is the backend equivalent of the frontend's `withSpan` pattern, but integrated into the architectural framework rather than applied as a utility function. Since [[error-handling-in-instrumented-code-follows-try-catch-with-error-attributes]], both frontend and backend follow the principle of coupling error handling with trace recording.

---

Related Insights:
- [[activity-sources-align-with-ddd-bounded-contexts-for-domain-scoped-tracing]] — foundation: each TryCatch uses the domain-appropriate ActivitySource
- [[nameof-convention-for-activity-names-ensures-refactoring-safety]] — enables: consistent naming inside TryCatch blocks
- [[error-handling-in-instrumented-code-follows-try-catch-with-error-attributes]] — extends: frontend equivalent of coupling error handling with trace recording
- [[observability-separates-auto-instrumentation-from-manual-business-spans]] — extends: TryCatch is the backend mechanism for the manual-span side

Domains:
- [[backend-architecture]]
