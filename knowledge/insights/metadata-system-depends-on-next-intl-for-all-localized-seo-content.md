---
description: "generateMetadata functions import getTranslations and getLocale from next-intl/server, making next-intl a hard runtime dependency for any route with localized metadata"
type: dependency
source: "docs/rfc/1004-metadata-seo-system.md"
status: current
created: 2026-02-25
---

# Metadata system depends on next-intl for all localized SEO content

The metadata generation system is tightly coupled to next-intl. Every `generateMetadata` function imports `getTranslations` and `getLocale` from `next-intl/server` to retrieve localized SEO strings. The `createMetadata` helper accepts a `locale` parameter that maps to OpenGraph locale tags. Translation files (`en.json`, `ro.json`, `fr.json`) are the single source of truth for all SEO titles and descriptions.

This dependency means that changes to next-intl's API, translation file structure, or locale resolution logic directly affect metadata generation across the entire site. If next-intl's `getTranslations` function signature changes in a major version upgrade, every `generateMetadata` function needs updating. The dependency is bidirectional in practice: the `__metadata__` namespace convention (RFC 1004) shapes how translation files are organized (RFC 1003's domain).

The coupling is deliberate and beneficial -- it ensures that a Romanian user browsing the site sees Romanian metadata in search results and social shares, not English defaults. But it also means the metadata system cannot function correctly without a properly configured next-intl setup, including all locale files having complete `__metadata__` keys for every route.

This is the primary cross-RFC dependency in the frontend: RFC 1004 (metadata) depends on RFC 1003 (i18n) at both the architectural and runtime levels.

---

Related Insights:
- [[metadata-translations-use-double-underscore-metadata-namespace-convention]] -- extends: the specific convention that shapes the i18n integration
- [[generatemetadata-follows-a-fixed-pattern-of-get-translations-then-get-locale-then-compose]] -- extends: the pattern that exercises this dependency at runtime
- [[missing-metadata-keys-in-any-locale-file-breaks-generatemetadata-at-runtime]] -- consequence: what happens when the dependency contract is violated

Domains:
- [[frontend-patterns]]
