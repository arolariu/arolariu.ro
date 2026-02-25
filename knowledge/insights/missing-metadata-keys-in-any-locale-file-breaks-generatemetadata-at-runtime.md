---
description: "If any of the three locale files (en.json, ro.json, fr.json) lacks a __metadata__ namespace for a route, generateMetadata throws a runtime error for users in that locale"
type: gotcha
source: "docs/rfc/1004-metadata-seo-system.md"
status: current
created: 2026-02-25
---

# Missing metadata keys in any locale file breaks generateMetadata at runtime

When a route's `generateMetadata` calls `getTranslations("RouteName.__metadata__")` and the active locale's translation file lacks that namespace, next-intl throws a runtime error. This fails silently during development if you only test in English -- the bug surfaces only when a user switches to Romanian or French, or when a crawler requests the page with a non-English locale.

The root cause is that TypeScript type generation for translation keys is based on the primary locale file (typically `en.json`). If `en.json` has `Domains.__metadata__.title` but `fr.json` does not, the TypeScript compiler raises no error because types are generated from the primary file. The mismatch is only caught at runtime when a French-locale request hits the route.

The mitigation is procedural: when adding a new route with `generateMetadata`, the developer must add `__metadata__` entries to ALL three locale files (`en.json`, `ro.json`, `fr.json`) simultaneously. Running `npm run generate:i18n` regenerates TypeScript types but does not validate cross-locale completeness. A future improvement would be a CI check that compares `__metadata__` key sets across all locale files.

This gotcha is particularly dangerous because metadata errors do not produce visible user-facing errors in the page content -- the page renders fine, but the `<head>` metadata may be missing or fall back to defaults, degrading SEO for that locale without any obvious symptoms.

---

Related Insights:
- [[metadata-translations-use-double-underscore-metadata-namespace-convention]] -- foundation: the convention that must be followed in all locale files
- [[metadata-system-depends-on-next-intl-for-all-localized-seo-content]] -- foundation: the dependency relationship that creates this failure mode

Domains:
- [[frontend-patterns]]
