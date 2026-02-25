---
description: "A ReadonlyMap maps 'en' to 'en_US' and 'ro' to 'ro_RO' inside createMetadata; unmapped locales (like 'fr') fall back to alternateLocale 'en_US'"
type: pattern
source: "docs/rfc/1004-metadata-seo-system.md"
status: current
created: 2026-02-25
---

# OpenGraph locale mapping converts simple codes to regional format via ReadonlyMap

The OpenGraph protocol requires locale values in `language_TERRITORY` format (e.g., `en_US`, `ro_RO`), but the application's i18n system uses simple two-letter codes (`en`, `ro`, `fr`). The `createMetadata` helper bridges this gap with an internal `LOCALE_ALTERNATES` ReadonlyMap that explicitly maps `en` to `en_US` and `ro` to `ro_RO`.

When a route passes `locale: "ro"` to `createMetadata`, the function sets `openGraph.locale` to `"ro_RO"` and `openGraph.alternateLocale` to the mapped value. For unmapped locales -- notably French (`fr`) -- the fallback is `"en_US"` via the `Map.get()` nullish coalescing.

This is a potential gap worth noting: the French locale is supported by the i18n system (RFC 1003 documents `fr.json` as a locale file) but has no explicit OpenGraph mapping. French pages will receive `alternateLocale: "en_US"` rather than the expected `"fr_FR"`. This does not break functionality but produces suboptimal social sharing metadata for French-language content. The fix would be adding `["fr", "fr_FR"]` to the LOCALE_ALTERNATES map.

The ReadonlyMap is defined inside the function rather than at module scope, which means it's reconstructed on each call. Since `generateMetadata` results are cached by Next.js per route, this is not a performance concern.

---

Related Insights:
- [[createmetadata-helper-composes-route-metadata-by-merging-base-defaults-with-overrides]] -- foundation: the function that contains this locale mapping logic
- [[metadata-translations-use-double-underscore-metadata-namespace-convention]] -- enables: the i18n integration that provides the simple locale codes

Domains:
- [[frontend-patterns]]
