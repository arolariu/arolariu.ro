---
description: "Activity display names use nameof(MethodName) instead of string literals, so IDE renames propagate to trace data and prevent stale span names"
type: convention
source: "docs/rfc/2002-opentelemetry-backend-observability.md"
status: current
created: 2026-02-25
---

# nameof convention for Activity names ensures refactoring safety

Every `StartActivity` call in the backend uses `nameof(MethodName)` as the display name parameter: `InvoicePackageTracing.StartActivity(nameof(CreateInvoice))`. String literals like `"create_invoice"` or `"CreateInvoice"` are explicitly prohibited by the RFC.

The `nameof` operator resolves at compile time to the method's actual name, which means IDE-assisted renames automatically update the trace data. If `CreateInvoice` is renamed to `CreateNewInvoice`, every activity referencing it via `nameof` updates in the same refactoring pass. With string literals, the method name changes but the span name stays stale -- creating a disconnect between code and traces that compounds over time.

This convention also provides IDE autocomplete support when writing the `StartActivity` call, reducing typos and enforcing consistent PascalCase naming across all spans. The trade-off is that activity names always match method names exactly, which means you cannot have a human-friendly display name that differs from the code identifier. In practice this is acceptable because trace visualization tools handle PascalCase well, and the consistency benefit outweighs cosmetic preferences.

This parallels the frontend's typed span naming approach described in [[template-literal-types-enforce-span-naming-conventions]], where TypeScript's type system prevents ad-hoc span names. Both sides solve the same problem -- preventing span name drift -- through their language's strongest compile-time mechanism.

---

Related Insights:
- [[template-literal-types-enforce-span-naming-conventions]] — extends: frontend equivalent using TypeScript template literal types
- [[activity-sources-align-with-ddd-bounded-contexts-for-domain-scoped-tracing]] — foundation: the ActivitySource that these named activities belong to
- [[ad-hoc-attribute-naming-creates-inconsistent-high-cardinality-telemetry]] — contradicts: the problem this convention prevents

Domains:
- [[backend-architecture]]
