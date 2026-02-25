---
description: "The sitemap lives as a static XML file at src/app/sitemap.xml with manually maintained URLs, priorities, and lastmod dates rather than being generated from route structure"
type: decision
source: "docs/rfc/1004-metadata-seo-system.md"
status: current
created: 2026-02-25
---

# Sitemap is static XML requiring manual updates for new routes

The current sitemap implementation is a hand-maintained XML file at `src/app/sitemap.xml`, not a dynamically generated one using Next.js's `MetadataRoute.Sitemap` API. Each URL entry includes explicit `loc`, `lastmod`, `changefreq`, and `priority` values. The priority hierarchy follows a deliberate scheme: homepage at 1.0, domain pages at 0.6, and static informational pages at 0.4.

This decision trades automation for simplicity. The static file works because the route set is relatively small and stable -- the arolariu.ro platform has a known set of public routes that change infrequently. However, it creates a maintenance risk: adding a new public route requires remembering to update `sitemap.xml` manually. The `lastmod` timestamps are also manual, meaning they may drift from actual content update dates.

The RFC explicitly identifies dynamic sitemap generation as a future enhancement, proposing a `sitemap.ts` file that would use Next.js's API to generate entries from the route structure with accurate timestamps. This would eliminate the manual maintenance burden and ensure new routes are automatically discoverable by search engines. The `robots.txt` file references the sitemap at `https://arolariu.ro/sitemap.xml`, so the URL must remain stable if the implementation changes.

---

Related Insights:
- [[metadata-system-uses-layered-architecture-for-centralized-seo-management]] -- foundation: the broader metadata architecture this sits within
- [[static-metadata-export-preferred-for-routes-without-localized-content]] -- parallel: both represent the "static when possible" philosophy

Domains:
- [[frontend-patterns]]
