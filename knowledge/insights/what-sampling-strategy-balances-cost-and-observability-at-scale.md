---
description: "Multiple approaches possible (head-based, tail-based, business-logic-aware) with no decision made — the key open question for production scaling"
type: decision
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: speculative
created: 2026-02-25
---

# What sampling strategy balances cost and observability at scale?

As the platform scales beyond development and preview traffic levels, a sampling strategy becomes necessary. The RFC identifies the need in Section 10.1 ("No trace sampling configured — exports all traces") and lists candidate solutions in Section 10.2 ("Implement tail-based sampling" and "Implement business-logic-aware sampling strategies"), but makes no decision between them.

The options carry distinct trade-offs. Head-based sampling decides at request start whether to trace, using a probability (e.g., sample 10% of requests). It is simple to implement and has minimal overhead, but it is blind to outcomes — a sampled-out request that later errors is lost. Tail-based sampling decides after trace completion, keeping all errors and slow requests regardless of sample rate. It requires the OpenTelemetry Collector to buffer complete traces before deciding, adding memory pressure and latency at the Collector layer. Business-logic-aware sampling applies domain-specific rules: always sample invoice processing (high business value), down-sample health check endpoints (noise), increase sample rate during deployments (risk window). This is the most precise approach but the most complex to maintain, as sampling rules must evolve with business logic.

The decision depends on three factors: traffic volume (at current levels, 100% sampling is viable), backend storage costs (which grow linearly with retained trace volume), and which use cases the team prioritizes — debugging rare production errors favors tail-based, monitoring aggregate health favors head-based, and business analytics favors domain-aware sampling.

Until this decision is made, the system exports all traces, which is correct for current scale but will become a cost and performance issue as traffic grows.

---

Related Insights:
- [[all-traces-exported-without-sampling-creates-cost-pressure-at-scale]] — foundation: the tension motivating this question
- [[tail-based-sampling-enables-cost-effective-high-traffic-observability]] — extends: one candidate answer
- [[business-logic-aware-samplers-enable-intelligent-trace-selection]] — extends: another candidate answer

Domains:
- [[frontend-patterns]]
