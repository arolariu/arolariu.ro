---
description: "XML <param> tags must specify valid/invalid values, null behavior, default handling, and cross-parameter dependencies -- the backend counterpart to JSDoc @param domain constraints"
type: convention
source: "docs/rfc/2004-comprehensive-xml-documentation-standard.md"
status: current
created: 2026-02-25
---

# Param tags document domain constraints not just parameter types

The XML documentation standard requires `<param>` tags to go beyond restating the parameter name and type. Each parameter must document: its purpose in the operation's context, valid and invalid value ranges, null handling behavior (is it null-safe or does it throw?), default values if applicable, and dependencies on other parameters. The standard phrase pattern is "The [noun] to [verb]" followed by constraint details -- for example, "The persisted (authoritative) invoice snapshot. Must not be null. Serves as the base for merge operations."

This convention is the direct backend parallel to [[jsdoc-param-tags-document-domain-constraints-beyond-typescript-types]] on the frontend. Both enforce the same principle: static types tell you the shape of data, but documentation tells you the domain rules. A parameter typed as `Guid?` communicates nullability to the compiler; the documentation communicates that this is an "optional partition / tenant context for the invoice" and explains what happens when it IS null versus when it IS provided.

The cross-parameter dependency documentation is particularly important for methods like `Invoice.Merge(Invoice original, Invoice partialUpdates)`, where the relationship between parameters determines behavior: partial values replace original values only when non-sentinel. Without documenting this relationship in both `<param>` tags and the method's `<remarks>`, callers must read the implementation to understand merge precedence.

---

Related Insights:
- [[jsdoc-param-tags-document-domain-constraints-beyond-typescript-types]] -- frontend parallel: identical philosophy of documenting domain rules beyond type signatures
- [[xml-documentation-anti-patterns-prevent-signature-repetition-and-vague-summaries]] -- extends: the signature-repetition anti-pattern specifically targets bare `<param name="invoice">Invoice</param>` docs
- [[xml-summaries-use-verb-first-phrasing-for-methods-and-descriptive-phrasing-for-types]] -- enables: the "The [noun] to [verb]" parameter phrasing complements the method verb-first summary phrasing

Domains:
- [[backend-architecture]]
- [[cross-cutting]]
