---
description: "Five layers (Route → createMetadata → Base Config → I18n → Next.js API) separate concerns so route authors only provide overrides, never full metadata objects"
type: decision
source: "docs/rfc/1004-metadata-seo-system.md"
status: current
created: 2026-02-25
---

# Metadata system uses layered architecture for centralized SEO management

The metadata system is organized into five distinct layers, each with a single responsibility. At the bottom, Next.js's App Router metadata API handles rendering meta tags into HTML. Above it, the i18n integration layer (next-intl `__metadata__` namespaces) provides localized strings. The base metadata configuration in `src/metadata.ts` defines site-wide defaults -- title templates, robots directives, icon sets, Open Graph basics, and PWA settings. The `createMetadata` helper function acts as a composition API that merges base defaults with route-specific overrides. Finally, route-level `generateMetadata` functions or static `metadata` exports sit at the top, providing only what differs from the base.

This layered design means that adding a new route requires specifying only a title and description. Everything else -- robots configuration, Twitter card format, Apple Web App settings, icon references -- inherits from the base layer. The composition happens at build time or request time depending on whether the route uses static export or `generateMetadata`, so the layering has no additional runtime cost for static routes.

The architecture also ensures consistency: changing the site name, updating robots directives, or adding a new icon size happens in one place and propagates everywhere. Without this centralization, each of the 20+ routes would need its own complete metadata object, creating a maintenance burden and inevitable drift.

---

Related Insights:
- [[createmetadata-helper-composes-route-metadata-by-merging-base-defaults-with-overrides]] -- foundation: the composition mechanism that makes the layered architecture work
- [[root-layout-re-exports-base-metadata-to-establish-global-defaults]] -- enables: the mechanism that wires base config into the App Router

Domains:
- [[frontend-patterns]]
