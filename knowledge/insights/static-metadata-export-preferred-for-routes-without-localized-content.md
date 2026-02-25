---
description: "Routes with language-independent metadata use 'export const metadata: Metadata' for zero runtime overhead -- metadata resolves entirely at build time"
type: decision
source: "docs/rfc/1004-metadata-seo-system.md"
status: current
created: 2026-02-25
---

# Static metadata export preferred for routes without localized content

The metadata system supports two patterns: static `export const metadata: Metadata = { ... }` and dynamic `export async function generateMetadata(): Promise<Metadata>`. The decision rule is straightforward -- if a route's metadata does not depend on the request locale, user data, or URL parameters, it should use the static export. Static metadata has zero runtime computation cost because Next.js resolves it entirely at build time, making it immediately available during SSR without any async operations.

The dynamic `generateMetadata` pattern is reserved for routes that genuinely need localized titles and descriptions (via next-intl) or parameter-dependent content (like a dynamic invoice detail page). Using `generateMetadata` where a static export would suffice adds unnecessary async overhead (5-10ms for translation lookup and composition) and increases code complexity without benefit.

In practice, most routes in the arolariu.ro codebase use `generateMetadata` because the platform supports three languages and nearly all pages have localized content. But utility pages, error pages, or pages with universal metadata should prefer the static pattern. The root layout uses a special variant: `export { metadata } from "@/metadata"` which re-exports the base configuration as a static value.

---

Related Insights:
- [[generatemetadata-follows-a-fixed-pattern-of-get-translations-then-get-locale-then-compose]] -- alternative: the dynamic pattern used when localization is needed
- [[root-layout-re-exports-base-metadata-to-establish-global-defaults]] -- example: the root layout's specific static export approach

Domains:
- [[frontend-patterns]]
