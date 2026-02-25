---
description: "Industry-standard 7-1 file organization adapted for Next.js: abstracts/ emit no CSS, base/ handles resets, animations/ holds keyframes, components/ holds global styles, with pages/ and vendors/ folders omitted"
type: decision
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# 7-1 pattern organizes SCSS into abstracts, base, themes, animations, components, and utilities

The SCSS system adopts the 7-1 architectural pattern -- seven partial folders plus one entry file (`main.scss`) -- as the organizing principle for shared styles at `sites/arolariu.ro/src/styles/`. The abstracts folder is the most critical: it contains `_variables.scss`, `_colors.scss`, `_typography.scss`, `_mixins.scss`, `_functions.scss`, and `_config.scss`, and it produces zero CSS output. Every CSS Module file in the codebase imports abstracts via `@use 'abstracts' as *` to access the full token and mixin API.

The pattern is adapted for the Next.js context. The traditional pages/ folder is omitted because CSS Modules co-located with route components serve that role. The vendors/ folder is omitted because third-party CSS comes through npm dependencies. The utilities/ folder exists but is intentionally thin since Tailwind CSS already provides a comprehensive utility layer during the migration period.

Import order in `main.scss` matters for cascade correctness: abstracts first (no output), then base resets, themes, animations, components, and utilities last. This mirrors the specificity intent where base resets have the lowest specificity and utility overrides have the highest.

---

Related Insights:
- [[scss-modules-chosen-over-css-in-js-for-zero-runtime-scoped-styling]] -- foundation: the 7-1 pattern structures the SCSS system this decision chose
- [[every-css-module-file-starts-with-use-abstracts-as-star-import]] -- extends: how individual modules consume the abstracts layer

Domains:
- [[frontend-patterns]]
