---
description: "Jaeger, Prometheus, Grafana Tempo/Loki, Elastic, Datadog, New Relic, and Honeycomb all accept OTLP — the vendor-neutral claim is practical, not theoretical"
type: decision
source: "docs/rfc/1001-opentelemetry-observability-system.md"
status: current
created: 2026-02-25
---

# Seven backends support OTLP, validating the vendor-neutral strategy

The RFC's vendor-neutral strategy is validated by a concrete compatibility matrix. Seven major observability backends accept OTLP natively: Jaeger (traces), Prometheus (metrics via OTLP receiver), Grafana Tempo (traces) and Loki (logs), Elastic APM (all signals), Datadog (all signals), New Relic (all signals), and Honeycomb (all signals). This means migrating between backends is genuinely a configuration change, not a code rewrite.

The breadth of support also provides negotiating leverage — the platform is not locked to any vendor's pricing or feature set. If Datadog raises prices, switching to a Grafana stack requires changing the OTLP endpoint environment variable and adjusting Collector routing. No application code touches needed.

The RFC's Section 7.1 compatibility table shows varying signal coverage per backend: some support only traces, others support all three signals. This unevenness means a multi-backend strategy (traces to one backend, metrics to another) is a practical architecture, not a theoretical one. The OpenTelemetry Collector's fan-out routing makes this trivial.

The only risk is if a backend adds proprietary extensions that become depended-upon, re-introducing soft lock-in. For example, Datadog's custom trace analytics or Honeycomb's BubbleUp feature could create dependencies that are hard to replicate elsewhere. Discipline around using only OTLP-standard features is the mitigation.

---

Related Insights:
- [[otlp-http-protocol-provides-vendor-neutral-telemetry-export]] — foundation: the protocol that enables vendor neutrality
- [[opentelemetry-collector-serves-as-proxy-between-app-and-backends]] — extends: the Collector can route to any of these backends

Domains:
- [[frontend-patterns]]
- [[infrastructure]]
