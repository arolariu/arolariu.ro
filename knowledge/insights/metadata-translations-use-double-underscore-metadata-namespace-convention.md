---
description: "Every route's SEO title and description live under a __metadata__ key in translation JSON files, visually and structurally separated from UI strings"
type: convention
source: "docs/rfc/1004-metadata-seo-system.md"
status: current
created: 2026-02-25
---

# Metadata translations use double-underscore metadata namespace convention

All route-level SEO content (titles and descriptions) is stored under a `__metadata__` key within the next-intl translation structure, not inline in component code. For example, the domains page metadata lives at `Domains.__metadata__.title` and `Domains.__metadata__.description` in each locale file (`en.json`, `ro.json`, `fr.json`). The double-underscore prefix is a visual signal that these keys serve SEO infrastructure rather than UI rendering.

This convention delivers several benefits. SEO content becomes manageable by non-developers editing JSON files. Translation completeness across locales is checkable by comparing `__metadata__` keys across files. TypeScript types are auto-generated from the translation files, so `getTranslations("Domains.__metadata__")` provides compile-time key validation -- calling `t("titl")` instead of `t("title")` produces a type error.

The convention also enforces separation between metadata and UI concerns. A route's visible heading text and its SEO title can differ without confusion because they live in different namespaces. This is particularly valuable for i18n because SEO-optimized titles for search engines may use different phrasing than user-facing headings.

Every `generateMetadata` function follows the same retrieval pattern: `await getTranslations("RouteName.__metadata__")`, making metadata access predictable and greppable across the codebase.

---

Related Insights:
- [[generatemetadata-follows-a-fixed-pattern-of-get-translations-then-get-locale-then-compose]] -- extends: the pattern that consumes these namespaced translations
- [[missing-metadata-keys-in-any-locale-file-breaks-generatemetadata-at-runtime]] -- gotcha: what happens when this convention is not followed consistently

Domains:
- [[frontend-patterns]]
