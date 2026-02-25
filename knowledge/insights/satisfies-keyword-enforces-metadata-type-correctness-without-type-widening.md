---
description: "Metadata objects use 'satisfies Metadata', 'satisfies OpenGraph', etc. to get compile-time validation while preserving narrow literal types for downstream consumption"
type: decision
source: "docs/rfc/1004-metadata-seo-system.md"
status: current
created: 2026-02-25
---

# Satisfies keyword enforces metadata type correctness without type widening

Throughout the metadata system, configuration objects use TypeScript's `satisfies` keyword rather than type annotations. The base metadata uses `satisfies Metadata`, robots config uses `satisfies Robots`, OpenGraph uses `satisfies OpenGraph`, icons use `satisfies Icon[]`, and so on. Combined with `as const` assertions on configuration constants, this creates a type checking strategy that validates structure without losing specificity.

The distinction matters: `const config: Metadata = { ... }` widens the type to `Metadata`, losing the specific string literal types of individual fields. `const config = { ... } satisfies Metadata` validates that the object conforms to `Metadata` while preserving the exact literal types. This means downstream code that reads, say, `config.openGraph.type` knows it's specifically `"website"` rather than the union `"website" | "article" | "book" | ...`.

For the metadata system, this enables two things. First, invalid metadata structures produce compile errors immediately -- misspelling a robots directive or using an invalid OpenGraph type fails at build time rather than silently producing broken meta tags. Second, the `createMetadata` function can reason about the specific values in the base config when computing merged results, because the types are narrow enough to be useful.

The `Readonly` wrappers on `PartialMetadata` and the return type of `createMetadata` complement this by preventing accidental mutation of shared metadata objects.

---

Related Insights:
- [[createmetadata-helper-composes-route-metadata-by-merging-base-defaults-with-overrides]] -- extends: the function that benefits from narrow types when merging
- [[type-safe-telemetry-prevents-instrumentation-errors-at-compile-time]] -- parallel: same philosophy of using TypeScript to catch infrastructure errors early

Domains:
- [[frontend-patterns]]
