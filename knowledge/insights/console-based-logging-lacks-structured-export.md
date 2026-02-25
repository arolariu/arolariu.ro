---
description: "Traces and metrics have OTLP exporters but logs go to console only — the three observability pillars are not equally instrumented"
type: gotcha
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Console-based logging lacks structured export

The observability system has an asymmetry: traces and metrics are exported via OTLP to structured backends where they can be queried, correlated, and alerted on. Logs, however, go to console.log only. They are visible in container logs and can be aggregated by log collectors (Fluentd, Vector), but they lack the structured export that would enable correlation with traces and metrics in a unified backend. A log entry about an error cannot be automatically linked to the trace that produced it. The logWithTrace helper includes trace IDs in log output, which enables manual correlation, but falls short of the fully integrated experience that OTLP log export would provide.

---

Related Insights:
- [[structured-log-export-via-otlp-unifies-all-three-pillars]] — resolves: the planned solution
- [[debug-logs-suppressed-in-production-to-eliminate-overhead]] — extends: the logging system's production behavior

Domains:
- [[frontend-patterns]]
