---
description: "Two TypeDoc configs (website + components) produce Markdown API docs in docs.arolariu.ro, making JSDoc the single source for both IDE tooltips and published references"
type: dependency
source: "docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md"
status: current
created: 2026-02-25
---

# TypeDoc generates API reference from JSDoc into the docs site

JSDoc comments in this codebase serve double duty: they power VS Code IntelliSense tooltips during development and feed TypeDoc to generate published API reference documentation. Two separate TypeDoc configurations exist — `typedoc.website.json` for the main site's types and utilities, and `typedoc.components.json` for the shared component library — each generating into the DocFX-based docs site at `sites/docs.arolariu.ro/`.

This dual-use design means JSDoc quality has downstream consequences beyond the IDE. Poorly written summaries or missing `@param` tags degrade not just the developer experience in VS Code but also the published documentation that external consumers (or future team members) rely on. The `typedoc-plugin-markdown` plugin outputs Markdown rather than HTML, integrating cleanly with the DocFX documentation pipeline.

The generation commands (`npm run docs:typedoc:website`, `npm run docs:typedoc:components`) are part of the build tooling, though not currently gated in CI. This creates a potential drift risk between source JSDoc and published docs if generation is forgotten after changes.

---

Related Insights:
- [[jsdoc-summaries-are-capped-at-80-characters-for-intellisense-readability]] — foundation: summary length matters because these become TypeDoc index entries
- [[eslint-plugin-jsdoc-enforces-documentation-completeness-at-lint-time]] — enables: lint enforcement ensures TypeDoc has complete input

Domains:
- [[frontend-patterns]]
