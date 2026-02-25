---
description: "Enums must document their UNKNOWN=0 sentinel meaning, numeric spacing rationale (increments of 100 for future values), and analytics/reporting usage context in remarks"
type: convention
source: "docs/rfc/2004-comprehensive-xml-documentation-standard.md"
status: current
created: 2026-02-25
---

# Enum documentation requires sentinel values and numeric spacing conventions

The XML documentation standard requires enum types to document three specific aspects beyond just listing values. First, the sentinel value (typically `UNKNOWN = 0`) must explain what "unknown" means in context -- for `PaymentType`, it means "payment method not resolved from source," indicating an unfinished OCR extraction rather than a data error. Second, the numeric spacing convention (increments of 100) must be documented in remarks under an "Extensibility" section, explaining that gaps exist to allow inserting future values without renumbering. Third, an "Analytics" section must describe how the enum drives reporting -- `PaymentType` drives "spend channel distribution reporting and potential loyalty program inference."

This level of documentation is unusual for enums, which are often treated as self-documenting. The standard recognizes that enums in a domain model carry semantic weight that bare names do not convey. `CASH = 100` tells you the value; the documentation tells you that this represents "physical cash tender" and that the 100-increment spacing leaves room for future payment methods between UNKNOWN and CASH.

Each enum member also requires its own `<summary>` tag, even for seemingly obvious values. This satisfies [[cs1591-warnings-as-errors-enforces-xml-documentation-completeness-at-build-time]] at the member level and ensures Swagger/OpenAPI documentation includes descriptions for every possible API response value.

---

Related Insights:
- [[cs1591-warnings-as-errors-enforces-xml-documentation-completeness-at-build-time]] -- foundation: the per-member documentation requirement is enforced by the compiler for public enum members
- [[xml-documentation-feeds-intellisense-docfx-and-swagger-simultaneously]] -- enables: enum member descriptions appear in Swagger schema definitions for API consumers
- [[invoice-is-the-primary-aggregate-root-owning-scans-payments-items-and-recipes]] -- example: InvoiceCategory and PaymentType enums are owned by the Invoice aggregate

Domains:
- [[backend-architecture]]
