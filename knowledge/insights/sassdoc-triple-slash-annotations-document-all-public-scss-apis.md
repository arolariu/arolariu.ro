---
description: "Every public function, mixin, and variable map uses /// annotations with @group, @param, @return, @throws, and @example tags, organized into 17 named groups by file and concern"
type: convention
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# SassDoc triple-slash annotations document all public SCSS APIs

All public SCSS APIs -- functions, mixins, and variable maps in the abstracts folder -- are documented using SassDoc's triple-slash (`///`) comment syntax. This mirrors the JSDoc documentation standard used in the TypeScript codebase and enables automated documentation generation. Functions require `@param`, `@return`, `@throws`, and `@example` tags. Mixins require `@param`, `@content` (when accepting blocks), `@throws`, and `@example`. Variable maps require `@type`, `@prop` for key entries, and a description.

The documentation is organized into 17 named `@group` categories that partition the API surface by file and concern: `config`, `tokens-spacing`, `tokens-breakpoints`, `tokens-z-index`, `tokens-radius`, `tokens-shadows`, `tokens-motion`, `tokens-colors`, `tokens-typography`, `functions`, `mixins-responsive`, `mixins-layout`, `mixins-visual`, `mixins-utility`, `mixins-a11y`, and `mixins-decorative`. These groups enable SassDoc to generate structured reference documentation with clear navigation.

This convention ensures that the SCSS design system is self-documenting at the source level. Since [[eslint-plugin-jsdoc-enforces-documentation-completeness-at-lint-time]] for TypeScript, the SassDoc annotations provide equivalent documentation coverage for the SCSS API surface. The `@throws` tag is especially valuable because it documents the compile-time error messages that fire when invalid token keys are passed to helper functions.

---

Related Insights:
- [[scss-helper-functions-with-error-messages-enforce-valid-token-access]] -- extends: the @throws annotations document the same compile-time validation those functions perform
- [[eslint-plugin-jsdoc-enforces-documentation-completeness-at-lint-time]] -- analogous: SassDoc is the SCSS equivalent of JSDoc enforcement in the TypeScript codebase

Domains:
- [[frontend-patterns]]
