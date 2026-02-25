---
description: "LoggerMessage source generators produce zero-allocation, compile-time-validated logging methods that auto-correlate with Activity trace context"
type: decision
source: "docs/rfc/2002-opentelemetry-backend-observability.md"
status: current
created: 2026-02-25
---

# Source-generated logging eliminates allocation overhead in .NET

The backend uses the `[LoggerMessage]` attribute on partial methods in a static `Log` class to generate high-performance logging code at compile time. Each method declaration like `LogOptionValueFromConfiguration(this ILogger logger, string propertyName)` produces a source-generated implementation that avoids boxing, string interpolation, and closure allocations at runtime -- achieving less than 50 nanoseconds overhead per log call.

This approach replaces the traditional `logger.LogInformation($"Option {propName} loaded")` pattern, which allocates a string on every call regardless of whether the log level is enabled. The source-generated variant checks the log level first and only formats the message if it will actually be emitted, which is the difference between zero cost and per-call allocation in hot paths.

Beyond performance, the `[LoggerMessage]` approach provides compile-time validation of log message templates and parameter types. A mismatched parameter count or type fails the build rather than silently producing malformed log entries at runtime. The generated methods also automatically inherit the current Activity's trace context, so every log entry carries trace and span IDs without explicit plumbing -- bridging the logging and tracing pillars through the .NET runtime's ambient context propagation.

---

Related Insights:
- [[trycatch-pattern-integrates-activity-tracing-into-every-service-method]] — enables: Activity context propagated to source-generated logs automatically
- [[debug-logs-suppressed-in-production-to-eliminate-overhead]] — extends: backend applies the same principle but via source generators rather than runtime filtering

Domains:
- [[backend-architecture]]
