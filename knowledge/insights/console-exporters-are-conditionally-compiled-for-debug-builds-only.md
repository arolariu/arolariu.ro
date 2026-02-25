---
description: "OpenTelemetry console exporters are gated behind DEBUG conditional compilation, preventing console output overhead and noise in production deployments"
type: convention
source: "docs/rfc/2002-opentelemetry-backend-observability.md"
status: current
created: 2026-02-25
---

# Console exporters are conditionally compiled for debug builds only

The backend enables `OpenTelemetry.Exporter.Console` only when the DEBUG compilation symbol is defined. In release builds, the console exporter code is stripped entirely by the compiler -- it is not merely disabled at runtime but absent from the compiled assembly.

This is a stronger guarantee than runtime configuration flags (like checking `IHostEnvironment.IsDevelopment()`), which still ship the console exporter code to production and rely on a correct environment variable to suppress it. Conditional compilation eliminates the category of "accidentally enabled console export in production" bugs entirely.

During development, the console exporter provides immediate visual feedback in the terminal: every span, log entry, and metric reading appears in the console output without needing to configure an external observability backend. This makes the feedback loop for instrumenting new code nearly instant -- a developer adding a `StartActivity` call sees the span in their terminal on the next request.

The frontend's approach described in [[debug-logs-suppressed-in-production-to-eliminate-overhead]] achieves similar production silence through runtime log-level filtering. The backend's compile-time approach is more aggressive -- the code literally does not exist in production -- which reflects .NET's stronger compilation model compared to JavaScript's runtime-only filtering.

---

Related Insights:
- [[debug-logs-suppressed-in-production-to-eliminate-overhead]] — extends: frontend equivalent using runtime filtering rather than conditional compilation
- [[three-extension-methods-partition-telemetry-setup-by-signal-type]] — foundation: each extension method conditionally adds the console exporter

Domains:
- [[backend-architecture]]
