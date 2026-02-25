---
description: "Nine ESLint rules enforce JSDoc alignment, param/return presence, tag validity, and type correctness — with param/returns as errors and descriptions as warnings"
type: decision
source: "docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md"
status: current
created: 2026-02-25
---

# ESLint plugin-jsdoc enforces documentation completeness at lint time

Documentation standards only hold if they are machine-enforced. This codebase uses `eslint-plugin-jsdoc` with a deliberately tiered severity model: structural correctness rules (`check-alignment`, `check-param-names`, `check-tag-names`, `check-types`, `require-param`, `require-returns`) are set to `error`, meaning CI will fail if parameters or return values lack JSDoc tags. Descriptive quality rules (`require-description`, `require-param-description`, `require-returns-description`) are set to `warn`, nudging developers without blocking merges.

This tiered approach reflects a pragmatic trade-off. Structural completeness (every param documented, every return described) can be verified mechanically and prevents documentation from drifting out of sync with code signatures. Descriptive quality (is the description actually useful?) requires human judgment and is better enforced through code review than CI gates.

The enforcement integrates with the broader lint pipeline (`npm run lint`) that runs 20+ ESLint plugins. Documentation linting is not a separate step — it is part of the standard code quality check, making it impossible to bypass without deliberately disabling the rule.

---

Related Insights:
- [[typescript-types-express-shape-while-jsdoc-expresses-intent-and-constraints]] — foundation: the principle that motivates requiring JSDoc alongside TypeScript types
- [[jsdoc-summaries-are-capped-at-80-characters-for-intellisense-readability]] — extends: one of the conventions these lint rules help enforce

Domains:
- [[frontend-patterns]]
