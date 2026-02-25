---
description: "Five named anti-patterns are banned: repeating the method signature in docs, vague summaries, missing exception tags, implementation details in summary, and stale documentation that drifts from code"
type: convention
source: "docs/rfc/2004-comprehensive-xml-documentation-standard.md"
status: current
created: 2026-02-25
---

# XML documentation anti-patterns prevent signature repetition and vague summaries

The RFC codifies five specific anti-patterns that documentation must avoid, turning common code-review feedback into named violations. (1) Signature repetition: writing `<param name="invoice">Invoice</param>` instead of documenting constraints and valid values. (2) Vague summaries: "Handles invoice operations" instead of "Foundation service responsible for CRUD operations on invoice aggregates with domain validation." (3) Missing exception documentation: throwing exceptions without `<exception cref="">` tags explaining when and why. (4) Implementation details in summary: exposing that Cosmos DB SDK is used instead of describing the abstract operation. (5) Stale documentation: docs describing old behavior after code changes.

Naming these anti-patterns matters because it creates a shared vocabulary for code review. A reviewer can write "Anti-pattern 1: signature repetition" instead of explaining the problem from scratch. The vague summary anti-pattern is the most insidious because it technically satisfies [[cs1591-warnings-as-errors-enforces-xml-documentation-completeness-at-build-time]] -- the compiler only checks for the presence of XML comments, not their quality. Quality enforcement remains a human concern during code review.

The implementation-detail anti-pattern reinforces an architectural boundary: summaries describe the abstract operation ("Persists a new invoice aggregate") while implementation details belong in `<remarks>` with a bold "Implementation" label. This separation means that if the storage backend changes from Cosmos DB to PostgreSQL, only the remarks need updating -- the summary remains correct because it described the contract, not the mechanism.

---

Related Insights:
- [[cs1591-warnings-as-errors-enforces-xml-documentation-completeness-at-build-time]] -- foundation: compiler enforcement catches presence but not quality -- anti-patterns fill the quality gap
- [[xml-summaries-use-verb-first-phrasing-for-methods-and-descriptive-phrasing-for-types]] -- extends: the phrasing convention is the positive counterpart to the vague summary anti-pattern
- [[remarks-tags-structure-context-into-labeled-bold-sections-for-scannable-documentation]] -- enables: the implementation-detail anti-pattern is resolved by moving details into labeled remarks sections

Domains:
- [[backend-architecture]]
