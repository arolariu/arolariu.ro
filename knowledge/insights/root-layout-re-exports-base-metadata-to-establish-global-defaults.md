---
description: "The root layout uses 'export { metadata } from @/metadata' as a one-line re-export, making base config the fallback for any route that does not define its own metadata"
type: pattern
source: "docs/rfc/1004-metadata-seo-system.md"
status: current
created: 2026-02-25
---

# Root layout re-exports base metadata to establish global defaults

The root layout file (`src/app/layout.tsx`) establishes site-wide metadata defaults through a single re-export: `export { metadata } from "@/metadata"`. This is not a `generateMetadata` function call -- it's a static named export that wires the base configuration object directly into Next.js's metadata resolution chain.

Next.js's App Router resolves metadata by merging from root layout down to the leaf page. The root layout's metadata becomes the deepest fallback layer: any page that does not export its own `metadata` or `generateMetadata` inherits the root's title template, robots configuration, icons, Open Graph defaults, Twitter card settings, PWA manifest reference, and all other base properties.

This pattern is important because it means a developer can create a new route with zero metadata configuration and the page will still have correct robots directives, proper icons, a sensible default title (via the `default` template string), and valid social sharing metadata. The cost of forgetting metadata on a new route is a generic title rather than missing meta tags entirely.

The re-export approach also keeps `layout.tsx` clean -- metadata configuration lives entirely in `src/metadata.ts`, and the layout file has no metadata logic of its own. This separation means metadata changes never require touching the root layout.

---

Related Insights:
- [[metadata-system-uses-layered-architecture-for-centralized-seo-management]] -- foundation: the root export is the top of the layered architecture
- [[static-metadata-export-preferred-for-routes-without-localized-content]] -- extends: the root layout is the primary example of static metadata export

Domains:
- [[frontend-patterns]]
