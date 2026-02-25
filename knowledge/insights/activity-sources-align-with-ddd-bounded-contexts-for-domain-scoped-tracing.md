---
description: "Each bounded context (Common, Core, Auth, Invoices) owns a dedicated ActivitySource named 'arolariu.Backend.{Domain}', enabling per-domain trace filtering and dashboards"
type: decision
source: "docs/rfc/2002-opentelemetry-backend-observability.md"
status: current
created: 2026-02-25
---

# Activity sources align with DDD bounded contexts for domain-scoped tracing

The backend defines one `System.Diagnostics.ActivitySource` per DDD bounded context rather than using a single global source or per-class sources. Four static instances live in `ActivityGenerators`: `CommonPackageTracing`, `CorePackageTracing`, `AuthPackageTracing`, and `InvoicePackageTracing`. Each carries a hierarchical name like `arolariu.Backend.Domain.Invoices` that maps directly to the project's bounded context boundaries.

This alignment has three practical effects. First, trace filtering in Azure Application Insights can scope to a single domain by matching the source name prefix -- an operator investigating invoice latency only sees invoice spans. Second, sampling policies can differ per domain: authentication traces might be sampled aggressively while invoice processing keeps full fidelity. Third, the naming convention makes it immediately obvious which bounded context produced a trace, preventing the "wall of undifferentiated spans" problem that a single global ActivitySource creates.

The decision trades slightly more ceremony (choosing the right ActivitySource in each service) for significantly better trace organization. Since [[nameof-convention-for-activity-names-ensures-refactoring-safety]], the activity names themselves stay consistent within each source.

---

Related Insights:
- [[nameof-convention-for-activity-names-ensures-refactoring-safety]] — extends: naming convention within each domain-scoped source
- [[trycatch-pattern-integrates-activity-tracing-into-every-service-method]] — enables: the TryCatch pattern uses these sources to create spans
- [[three-extension-methods-partition-telemetry-setup-by-signal-type]] — foundation: extension methods register all four activity sources

Domains:
- [[backend-architecture]]
