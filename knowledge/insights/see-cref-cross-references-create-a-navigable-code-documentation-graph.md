---
description: "Liberal use of <see cref> and <seealso cref> within XML docs creates a hyperlinked graph that IDEs and DocFX render as clickable navigation between related types, methods, and RFCs"
type: pattern
source: "docs/rfc/2004-comprehensive-xml-documentation-standard.md"
status: current
created: 2026-02-25
---

# See cref cross-references create a navigable code documentation graph

The documentation standard mandates liberal use of `<see cref="">` for inline references and `<seealso cref="">` for footer-style related-type links. These are not decorative -- they create a navigable graph within the codebase where every type, method, and property can link to related symbols. In Visual Studio, `<see cref="">` renders as clickable links in Quick Info tooltips. In DocFX-generated documentation, they become hyperlinks between API pages. Even in raw source, they provide explicit pointers for code navigation.

The cross-reference pattern operates at multiple scales. At the micro level, a method's `<param>` might reference the type it validates: `<see cref="Invoice"/>`. At the mid level, a Foundation service links to its broker interface: `<seealso cref="IInvoiceNoSqlBroker"/>`. At the macro level, remarks reference related RFCs and architectural patterns by name. This mirrors how the knowledge vault uses `[[wiki links]]` to create a navigable graph -- the XML documentation graph is the in-code equivalent.

The practical benefit is that developers exploring unfamiliar code can follow cross-reference chains through IntelliSense without switching to a file browser. A developer reading the `Merge` method on `Invoice` can click through to `InvoiceCategory`, `InvoiceScan.Default()`, and the Foundation service that calls it, building understanding through navigation rather than search.

---

Related Insights:
- [[xml-documentation-feeds-intellisense-docfx-and-swagger-simultaneously]] -- enables: cross-references resolve differently in each consumer but all three benefit from the navigation graph
- [[jsdoc-cross-references-link-code-to-rfcs-and-framework-docs]] -- frontend parallel: JSDoc @see and @link tags serve the same navigability purpose in TypeScript

Domains:
- [[backend-architecture]]
