---
description: "en.d.json.ts is auto-generated from the English locale file, providing IntelliSense autocomplete and compile-time errors for missing or misspelled keys"
type: decision
source: "docs/rfc/1003-internationalization-system.md"
status: current
created: 2026-02-25
---

# Auto-generated types enforce translation key safety at compile time

The i18n system generates a TypeScript declaration file (`messages/en.d.json.ts`) from the English locale file via `npm run generate:translations`. This file declares the complete shape of all translation messages as a typed object, which next-intl uses to provide compile-time validation of translation key access. Calling `t("invalidKey")` or passing the wrong ICU parameters produces a TypeScript error in the editor, not a runtime warning in the console.

This follows the same type-safety-first philosophy as the telemetry system (RFC 1001), where template literal types catch span naming errors at compile time. The translation type system provides three specific guarantees: key existence (no typos), namespace scoping (autocomplete shows only keys within the scoped namespace), and parameter type checking (ICU `{name}` variables require the correct argument shape).

The type generation step must run after any change to `en.json`. Forgetting this step is a documented gotcha -- TypeScript will show stale keys until regeneration. The types derive exclusively from the English file because it serves as the structural source of truth; other locale files must mirror its shape but do not participate in type generation.

---

Related Insights:
- [[type-safe-telemetry-prevents-instrumentation-errors-at-compile-time]] -- extends: same shift-left philosophy applied to i18n instead of observability
- [[english-locale-file-is-the-single-source-of-truth-for-translation-structure]] -- foundation: type generation depends on en.json as the canonical structure
- [[metadata-namespace-convention-separates-seo-from-content-translations]] -- enables: __metadata__ keys are included in the generated types

Domains:
- [[frontend-patterns]]
