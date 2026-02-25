---
description: "Method-level remarks require four labeled sections minimum: Behavior (what happens), Validation (what is checked), Side Effects (state changes/telemetry), and Idempotency (safe to retry?)"
type: convention
source: "docs/rfc/2004-comprehensive-xml-documentation-standard.md"
status: current
created: 2026-02-25
---

# Method remarks must document behavior validation side effects and idempotency

The XML documentation standard requires method-level `<remarks>` to include labeled sections covering at least four concerns: Behavior (detailed explanation of what happens when called), Validation (what precondition checks are performed), Side Effects (any state changes, external calls, or telemetry emitted), and Idempotency (whether the method can be called multiple times safely). Additional sections for Performance and Future considerations are recommended where relevant.

This convention goes beyond describing what a method does -- it documents its operational contract. The Idempotency section is particularly valuable because it communicates retry safety without requiring callers to read implementation details. A method documented as "NOT idempotent -- duplicate invocations create duplicate invoices unless id uniqueness constraints are enforced at broker level" immediately tells the caller to implement deduplication logic upstream.

The Side Effects section serves the observability story. Since [[trycatch-pattern-integrates-activity-tracing-into-every-service-method]], every service method creates Activity spans, and the documentation standard requires noting this telemetry emission as a side effect. This means a developer can understand a method's full impact -- data mutations, external calls, AND observability artifacts -- from its documentation alone, without tracing through the TryCatch wrapper.

---

Related Insights:
- [[remarks-tags-structure-context-into-labeled-bold-sections-for-scannable-documentation]] -- foundation: method sections follow the same bold-labeled paragraph convention used across all remarks
- [[trycatch-pattern-integrates-activity-tracing-into-every-service-method]] -- extends: telemetry side effects documented in methods originate from this pattern
- [[server-actions-require-four-documented-sections-in-remarks]] -- frontend parallel: Server Action JSDoc requires similar structured sections covering security, error handling, and cache behavior

Domains:
- [[backend-architecture]]
