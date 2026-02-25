---
description: "Changes to src/metadata.ts may not appear in the browser during dev mode until the .next directory is deleted, because Next.js caches metadata resolution results"
type: gotcha
source: "docs/rfc/1004-metadata-seo-system.md"
status: current
created: 2026-02-25
---

# Next.js aggressively caches metadata requiring cache clear during development

When modifying the base metadata configuration in `src/metadata.ts` or changing `generateMetadata` functions, the changes may not reflect in the browser during development. Next.js caches metadata resolution results as part of its development server optimization, and the cache is not always invalidated when metadata source files change.

The workaround is to delete the `.next` directory and restart the dev server (`rm -rf .next && npm run dev`). This forces a complete rebuild including fresh metadata resolution. The issue does not affect production builds, which always start from a clean state.

This caching behavior is particularly confusing when debugging social media previews or checking title templates, because the browser tab title and `<head>` meta tags show stale data even after saving file changes. Developers unfamiliar with this behavior may conclude their code changes are incorrect when the actual problem is cached metadata.

The issue is specific to the development server's HMR (Hot Module Replacement) mechanism, which optimizes for component re-rendering speed but does not always re-evaluate metadata exports. Production builds via `npm run build` are unaffected since they recompute all metadata from scratch.

---

Related Insights:
- [[metadata-system-uses-layered-architecture-for-centralized-seo-management]] -- foundation: the base configuration file where this caching is most problematic
- [[static-metadata-export-preferred-for-routes-without-localized-content]] -- extends: static exports may be more prone to caching since they are resolved once

Domains:
- [[frontend-patterns]]
