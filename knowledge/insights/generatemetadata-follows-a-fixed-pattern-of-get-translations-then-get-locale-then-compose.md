---
description: "Every dynamic route uses the same three-step sequence: getTranslations('Route.__metadata__'), getLocale(), then createMetadata({locale, title, description})"
type: pattern
source: "docs/rfc/1004-metadata-seo-system.md"
status: current
created: 2026-02-25
---

# generateMetadata follows a fixed pattern of get-translations then get-locale then compose

Dynamic route metadata generation uses a rigid three-step pattern. First, `await getTranslations("RouteName.__metadata__")` loads the localized SEO strings. Second, `await getLocale()` retrieves the active locale. Third, `createMetadata({ locale, title: t("title"), description: t("description") })` composes the final metadata object. Every `generateMetadata` function across the codebase follows this identical structure.

The rigidity is intentional. A standardized pattern means metadata generation is greppable (`getTranslations.*__metadata__` finds every instance), reviewable (deviations from the pattern are immediately visible), and consistent (no route invents its own metadata construction logic). The pattern also ensures that locale always flows through to OpenGraph tags, preventing the bug where a Romanian user sees English-locale OpenGraph metadata.

The function is always `async` because both `getTranslations` and `getLocale` are async server-side calls. Next.js automatically caches `generateMetadata` results per unique route/params combination, so the async overhead is a one-time cost per route per request, not per render. This means the pattern has approximately 5-10ms overhead on first call, then zero on subsequent calls for the same parameters.

This pattern should be used for any route that serves localized content. Routes with genuinely static, language-independent metadata can use the simpler `export const metadata` pattern instead.

---

Related Insights:
- [[metadata-translations-use-double-underscore-metadata-namespace-convention]] -- foundation: the naming convention this pattern relies on
- [[createmetadata-helper-composes-route-metadata-by-merging-base-defaults-with-overrides]] -- foundation: the composition function called in step three
- [[static-metadata-export-preferred-for-routes-without-localized-content]] -- alternative: the simpler pattern for non-dynamic routes

Domains:
- [[frontend-patterns]]
