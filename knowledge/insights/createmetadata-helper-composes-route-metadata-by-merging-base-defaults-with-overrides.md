---
description: "Accepts a PartialMetadata object, spreads base config underneath, and auto-propagates title/description into OpenGraph and Twitter card fields"
type: pattern
source: "docs/rfc/1004-metadata-seo-system.md"
status: current
created: 2026-02-25
---

# createMetadata helper composes route metadata by merging base defaults with overrides

The `createMetadata` function in `src/metadata.ts` is the single composition point for all route-specific metadata. It accepts a `PartialMetadata` type (a `Readonly<Partial<...>>` of the Next.js `Metadata` type with locale support added) and returns a complete, immutable `Metadata` object. The merge strategy spreads the base metadata first, then applies the partial overrides on top.

The key behavior is automatic propagation: when a route provides `title` and `description`, those values are automatically spread into both `openGraph.title`/`openGraph.description` and `twitter.title`/`twitter.description`. This prevents the common bug where a page title and its social card title diverge because someone updated one but not the other.

The function also handles locale mapping: a simple locale code like `"ro"` gets expanded to the OpenGraph-compatible `"ro_RO"` format through an internal `LOCALE_ALTERNATES` ReadonlyMap. The OpenGraph and Twitter sub-objects are merged with their respective base configs, so route-level metadata only needs to specify what changes.

All inputs and outputs use `Readonly` wrappers, enforcing immutability at the type level. The `satisfies Metadata` assertion at the return ensures the composed object remains type-safe without widening to the generic `Metadata` type.

---

Related Insights:
- [[metadata-system-uses-layered-architecture-for-centralized-seo-management]] -- foundation: the architectural context this pattern operates within
- [[opengraph-locale-mapping-converts-simple-codes-to-regional-format-via-readonlymap]] -- extends: the specific locale transformation within createMetadata
- [[title-template-pattern-prevents-double-site-name-in-page-titles]] -- extends: how title formatting works upstream of createMetadata

Domains:
- [[frontend-patterns]]
