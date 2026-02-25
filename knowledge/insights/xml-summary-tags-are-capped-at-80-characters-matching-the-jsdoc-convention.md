---
description: "The <summary> tag must stay under 80 chars and start with a verb (methods) or descriptive phrase (types), keeping IntelliSense tooltips scannable across both frontend and backend"
type: convention
source: "docs/rfc/2004-comprehensive-xml-documentation-standard.md"
status: current
created: 2026-02-25
---

# XML summary tags are capped at 80 characters matching the JSDoc convention

The `<summary>` tag in every XML doc comment must not exceed 80 characters. This is a deliberate alignment with [[jsdoc-summaries-are-capped-at-80-characters-for-intellisense-readability]] on the frontend, creating a consistent documentation experience across the entire monorepo regardless of language. The constraint exists for the same reason: IntelliSense quick-info panels in Visual Studio and VS Code have limited horizontal space, and long summaries get truncated or wrap awkwardly.

Extended context belongs in `<remarks>`, not in `<summary>`. The separation mirrors the JSDoc split between the first summary line and `@remarks`. This disciplined layering means developers hovering over a symbol in the IDE get an at-a-glance description, while those who need architectural context can expand into the remarks section or read the generated DocFX documentation.

The 80-character limit also benefits Swagger/OpenAPI output, where summary text appears as operation descriptions in the API explorer. Concise descriptions produce cleaner API documentation pages.

---

Related Insights:
- [[jsdoc-summaries-are-capped-at-80-characters-for-intellisense-readability]] — frontend parallel: identical convention in TypeScript/JSDoc
- [[xml-summaries-use-verb-first-phrasing-for-methods-and-descriptive-phrasing-for-types]] — extends: the phrasing convention that works within this length constraint

Domains:
- [[backend-architecture]]
- [[cross-cutting]]
