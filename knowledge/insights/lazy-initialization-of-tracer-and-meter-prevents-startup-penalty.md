---
description: "Tracers and meters are initialized on first use rather than at import time, preventing cold-start latency impact in serverless or on-demand environments"
type: pattern
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Lazy initialization of tracer and meter prevents startup penalty

The telemetry module exports tracer and meter instances that are lazily initialized — they are created on first access, not when the module is imported. This design choice prevents startup performance penalties in environments where cold-start time matters (serverless functions, Next.js server startup).

If tracers were eagerly initialized at import time, every module that imports the telemetry helper would add initialization overhead to the startup path, even if telemetry hasn't been configured yet. Lazy initialization also means that the `register()` function can complete its configuration before any tracer instances are created.

This pattern ensures correct ordering: the SDK is fully configured in `register()` before any tracer or meter is obtained, even though the import of the telemetry module may happen before `register()` runs. Without lazy initialization, the tracer would be obtained from an unconfigured SDK and produce no-op spans.

The trade-off is a small delay on the first operation that triggers initialization, but this is a one-time cost amortized over the lifetime of the process.

---

Related Insights:
- [[nextjs-instrumentation-hooks-initialize-telemetry-before-bootstrap]] — foundation: register() must run before lazy init triggers
- [[memory-footprint-of-10-20mb-establishes-telemetry-cost-baseline]] — extends: lazy init defers some of this memory allocation

Domains:
- [[frontend-patterns]]
