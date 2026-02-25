---
description: "No sampling configured means telemetry export volume equals request volume — acceptable now but becomes a cost and performance issue at production scale"
type: gotcha
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# All traces exported without sampling creates cost pressure at scale

The current configuration exports 100% of traces without any sampling. Every request generates a full trace that is batched and exported to the backend. At current traffic levels this is acceptable and even desirable — full visibility with no blind spots. But at production scale (thousands of requests per second), unsampled export creates three pressures: (1) network bandwidth for export, (2) storage cost in the backend, and (3) query performance degradation as the backend indexes grow. The RFC acknowledges this as a known limitation and identifies tail-based sampling as the solution path. The migration will require careful validation to ensure sampling doesn't hide important edge cases.

---

Related Insights:
- [[tail-based-sampling-enables-cost-effective-high-traffic-observability]] — resolves: the planned solution
- [[network-telemetry-overhead-scales-linearly-with-traffic]] — extends: the linear scaling applies to 100% of traffic
- [[what-sampling-strategy-balances-cost-and-observability-at-scale]] — extends: the open question this motivates

Domains:
- [[frontend-patterns]]
