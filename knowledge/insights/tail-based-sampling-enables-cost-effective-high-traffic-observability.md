---
description: "Sampling traces after completion based on error status or latency retains interesting traces while dramatically reducing export volume"
type: decision
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: speculative
created: 2026-02-25
---

# Tail-based sampling enables cost-effective high-traffic observability

Currently all traces are exported without sampling. Tail-based sampling is the planned solution for high-traffic scenarios. Unlike head-based sampling (decide at request start), tail-based sampling waits until a trace completes to decide whether to export it. Traces with errors, high latency, or specific business conditions (e.g., high-value invoices) are always kept. Normal, fast traces are sampled at a configurable rate. This approach ensures 100% of interesting traces are captured while reducing the volume of routine traces. The Collector is the ideal place for tail-based sampling since it sees complete traces.

---

Related Insights:
- [[all-traces-exported-without-sampling-creates-cost-pressure-at-scale]] — resolves: the tension this addresses
- [[opentelemetry-collector-serves-as-proxy-between-app-and-backends]] — enables: the Collector is where tail sampling runs
- [[what-sampling-strategy-balances-cost-and-observability-at-scale]] — extends: one possible answer

Domains:
- [[frontend-patterns]]
