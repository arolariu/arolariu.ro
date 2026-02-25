---
description: "Mandatory @use '../../styles/abstracts' as * header gives each .module.scss file access to all tokens, mixins, and functions; relative path depth varies by file location in the app tree"
type: convention
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# Every CSS Module file starts with @use abstracts as star import

Every `.module.scss` file in the codebase must begin with a standard header: a comment block identifying the component, followed by `@use '../../styles/abstracts' as *`. The `as *` clause unpacks all forwarded members into the local namespace, making functions like `space()`, `font-size()`, `color()`, and mixins like `respond-to()`, `flex-center`, and `shadow()` available without a namespace prefix.

The relative path to abstracts changes based on where the module file sits in the directory tree. A file in `src/app/_components/` uses `../../styles/abstracts`, while a deeply nested file in `src/app/about/_components/` needs `../../../../styles/abstracts`. This is a known ergonomic cost of the SCSS `@use` module system, which does not support path aliases the way TypeScript's `@/` paths do. Getting the relative path wrong produces a Dart Sass compilation error at build time, not a subtle runtime failure, so the failure mode is safe if annoying.

The abstracts barrel (`_index.scss`) uses `@forward` to re-export all partials, so a single import provides the complete design token and utility API without needing to know which sub-file defines which symbol.

---

Related Insights:
- [[seven-one-pattern-organizes-scss-into-abstracts-base-themes-animations-components-utilities]] -- foundation: abstracts/ is the first folder in the 7-1 pattern
- [[scss-helper-functions-with-error-messages-enforce-valid-token-access]] -- extends: the functions accessed through this import include compile-time validation

Domains:
- [[frontend-patterns]]
