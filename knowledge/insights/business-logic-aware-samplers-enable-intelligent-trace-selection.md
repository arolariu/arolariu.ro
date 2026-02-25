---
description: "Domain-specific sampling strategies (always sample invoice processing, down-sample health checks) optimize cost while preserving business-critical visibility"
type: decision
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: speculative
created: 2026-02-25
---

# Business-logic-aware samplers enable intelligent trace selection

Beyond generic tail-based sampling, business-logic-aware samplers make domain-informed decisions about which traces to keep. Health check endpoints (/health, /ready) generate high-volume, low-value traces that can be sampled at 1%. Invoice processing workflows are high-value and should always be sampled at 100%. Payment flows should be 100% plus extended retention. Authentication failures should be 100% for security audit trails. These rules encode business priorities into the observability pipeline. Implementation could be a custom sampler function that inspects span attributes to make routing decisions.

---

Related Insights:
- [[tail-based-sampling-enables-cost-effective-high-traffic-observability]] — foundation: the sampling infrastructure this builds on
- [[what-sampling-strategy-balances-cost-and-observability-at-scale]] — extends: a specific answer to the open question

Domains:
- [[frontend-patterns]]
