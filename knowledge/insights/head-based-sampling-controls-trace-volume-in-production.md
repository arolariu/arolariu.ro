---
description: "Production traces are head-sampled at 1-10% of requests, deciding at span creation time whether to record, balancing observability coverage against export cost"
type: decision
source: "docs/rfc/2002-opentelemetry-backend-observability.md"
status: current
created: 2026-02-25
---

# Head-based sampling controls trace volume in production

The backend uses head-based sampling in production, making the record-or-drop decision at the moment each trace begins (when the root activity is created). The sampling rate is configured between 1% and 10% of requests, meaning the vast majority of traces are never recorded. This keeps telemetry export costs predictable and prevents Azure Application Insights ingestion from becoming a dominant infrastructure expense.

Head-based sampling is simpler than tail-based sampling because the decision happens upfront -- there is no need to buffer complete traces before deciding their fate. The trade-off is that interesting traces (errors, high-latency requests) might be dropped if they fall in the unsampled majority. The frontend observability system faces the same tension, as described in [[all-traces-exported-without-sampling-creates-cost-pressure-at-scale]] and [[what-sampling-strategy-balances-cost-and-observability-at-scale]]. The frontend open question about sampling strategy is partially answered here: the backend chose head-based sampling for its simplicity, accepting the coverage gap for error traces.

Activity creation overhead remains approximately 100 nanoseconds per span even when sampling is active, because the `ActivitySource` still evaluates whether a listener wants the activity. W3C Trace Context propagation headers add roughly 200 bytes per request regardless of sampling, ensuring distributed trace correlation works even when individual services sample differently.

---

Related Insights:
- [[all-traces-exported-without-sampling-creates-cost-pressure-at-scale]] — contradicts: backend addresses this frontend concern with explicit sampling
- [[what-sampling-strategy-balances-cost-and-observability-at-scale]] — extends: provides the backend's concrete answer to this open question
- [[tail-based-sampling-enables-cost-effective-high-traffic-observability]] — contradicts: backend chose head-based over tail-based for simplicity
- [[backend-auto-instrumentation-covers-aspnetcore-httpclient-and-efcore]] — foundation: sampling applies to these auto-instrumented spans

Domains:
- [[backend-architecture]]
