---
description: "Creating a span costs 10-50us — negligible for request-level operations that take milliseconds, making comprehensive instrumentation practical"
type: constraint
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Span creation overhead of 10-50 microseconds is negligible

The measured overhead of creating an OpenTelemetry span is 10-50 microseconds. For a typical HTTP request handler taking 50-500ms, the span creation cost is 0.001-0.1% of total request time — effectively invisible.

This performance characteristic is what makes the "instrument everything" philosophy practical. If span creation cost 1ms, wrapping every database query and cache lookup in a span would add measurable latency. At 10-50 microseconds, the cost is noise.

However, this measurement is per-span — creating hundreds of spans in a tight loop (e.g., per-item in a 10,000 item batch) could accumulate to a noticeable cost. The guideline is to instrument operations, not iterations. A single span around a batch operation is appropriate; a span per item in a large batch is not.

The 10-50 microsecond range accounts for span creation, context propagation, and attribute recording for a typical set of attributes. Unusually large attribute sets will push toward the upper bound.

---

Related Insights:
- [[withspan-pattern-wraps-async-operations-for-automatic-span-lifecycle]] — enables: low overhead justifies wrapping operations in spans
- [[per-attribute-recording-overhead-compounds-for-spans-with-many-attributes]] — extends: attribute recording adds additional per-span cost
- [[less-than-1-percent-cpu-overhead-validates-comprehensive-instrumentation]] — validates: micro-benchmarks confirm the macro measurement

Domains:
- [[frontend-patterns]]
