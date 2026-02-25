---
description: "Records and value objects require three specific remarks sections: Mutability (why mutable or immutable), Equality (value-based vs reference), and Thread-safety -- capturing DDD design trade-offs"
type: convention
source: "docs/rfc/2004-comprehensive-xml-documentation-standard.md"
status: current
created: 2026-02-25
---

# Value object documentation must specify mutability equality semantics and thread safety

The XML documentation standard requires value objects and records to include three specific labeled sections in their `<remarks>`: Mutability, Equality, and Thread-safety. These three properties capture the essential behavioral characteristics that distinguish how value objects should be used in the codebase.

The Mutability section is where DDD design trade-offs are documented. `PaymentInformation` is documented as "Mutable to allow progressive enrichment (post-OCR correction, currency normalization). Treated as an owned value object in persistence." This records the architectural decision and its rationale -- immutability was the DDD default but was rejected because the multi-stage AI enrichment pipeline requires in-place updates. Without this documentation, a future developer might assume the mutability is a bug and refactor toward immutability, breaking the enrichment workflow.

Thread-safety documentation is required because value objects in this codebase are often shared across async operations within aggregate boundaries. `PaymentInformation` documents "Not thread-safe; confine to aggregate mutation scope," which tells developers to avoid sharing references across concurrent tasks. This section is the backend parallel to how frontend components document their rendering context -- both communicate concurrency constraints that types alone cannot express.

---

Related Insights:
- [[invoice-is-the-primary-aggregate-root-owning-scans-payments-items-and-recipes]] -- example: PaymentInformation and InvoiceScan are value objects owned by the Invoice aggregate that follow this documentation pattern
- [[remarks-tags-structure-context-into-labeled-bold-sections-for-scannable-documentation]] -- foundation: the Mutability/Equality/Thread-safety sections follow the broader labeled-section convention
- [[xml-remarks-must-reference-ddd-patterns-and-the-standard-layer-roles]] -- extends: value object documentation references DDD tactical patterns alongside these behavioral properties

Domains:
- [[backend-architecture]]
