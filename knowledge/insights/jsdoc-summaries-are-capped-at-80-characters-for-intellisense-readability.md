---
description: "Tooltip-friendly summaries ensure JSDoc first lines render cleanly in VS Code IntelliSense quick info panels"
type: convention
source: "docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md"
status: current
created: 2026-02-25
---

# JSDoc summaries are capped at 80 characters for IntelliSense readability

The first line of every JSDoc comment is treated as a summary that appears in VS Code IntelliSense tooltips. This codebase enforces a maximum of 80 characters for that line. The rationale is practical: IntelliSense quick info panels have limited horizontal space, and long summaries get truncated or force awkward wrapping that defeats the purpose of at-a-glance documentation.

The convention pairs with a verb-first phrasing rule for functions ("Fetches", "Formats", "Validates") and noun-first phrasing for types ("Represents", "Defines"). Together, the length cap and phrasing convention produce scannable, predictable summaries that work as both IDE tooltips and TypeDoc index entries.

Extended context belongs in `@remarks`, not in the summary line. This separation ensures that quick hover information stays concise while deep context remains accessible through expanding the documentation panel or reading the generated TypeDoc site.

---

Related Insights:
- [[function-summaries-start-with-verbs-and-type-summaries-start-with-nouns]] — extends: the companion phrasing convention for these summaries
- [[typedoc-generates-api-reference-from-jsdoc-into-the-docs-site]] — enables: summaries double as TypeDoc index entries

Domains:
- [[frontend-patterns]]
