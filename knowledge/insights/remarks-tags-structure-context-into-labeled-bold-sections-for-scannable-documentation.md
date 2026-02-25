---
description: "Remarks use bold-labeled paragraphs (Purpose, Architecture Context, Responsibilities, Exclusions, Thread-safety, Design Rationale, Future Considerations) creating a scannable hierarchy within each doc block"
type: convention
source: "docs/rfc/2004-comprehensive-xml-documentation-standard.md"
status: current
created: 2026-02-25
---

# Remarks tags structure context into labeled bold sections for scannable documentation

The XML documentation standard mandates that `<remarks>` blocks use `<para>` with `<b>` bold labels to create named sections within documentation comments. The standard section headings include: Purpose, Architecture Context, Key Characteristic, Usage Context, Design Rationale, Responsibilities, Exclusions, Thread-safety, Mutability, Validation, Side Effects, Idempotency, Performance, and Future Considerations. Not every section appears on every element -- the applicable sections depend on the code element type and layer.

This structured approach solves a specific problem: multi-paragraph remarks without visual hierarchy become walls of text that developers skip. The bold labels create a scannable outline, letting a developer jump directly to "Thread-safety" or "Design Rationale" without reading the entire block. It mirrors how developers scan web documentation by heading, applied at the XML comment level.

The convention also standardizes what information is expected. When a developer sees a `<remarks>` block without a "Thread-safety" section on a mutable class, the absence itself communicates a gap. The section labels function as an implicit checklist, complementing the explicit documentation checklist at the end of the RFC. Combined with [[xml-remarks-must-reference-ddd-patterns-and-the-standard-layer-roles]], the labels ensure architectural context appears in a predictable location within every doc block.

---

Related Insights:
- [[xml-remarks-must-reference-ddd-patterns-and-the-standard-layer-roles]] -- extends: the bold "Layer Role (The Standard)" section is the most architecturally significant labeled section
- [[server-actions-require-four-documented-sections-in-remarks]] -- frontend parallel: the same structured-section approach applied to JSDoc on Server Actions
- [[xml-summary-tags-are-capped-at-80-characters-matching-the-jsdoc-convention]] -- foundation: the summary brevity constraint means extended context MUST go into these labeled remarks sections

Domains:
- [[backend-architecture]]
