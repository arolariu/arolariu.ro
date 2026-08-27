# Locale and Metadata Edge Cases

Open only for a locale dictionary, typed-selector, or route metadata decision.

## Locale parity and typed selectors

- The live dictionaries are `sites/arolariu.ro/messages/en.json`,
  `sites/arolariu.ro/messages/ro.json`, and
  `sites/arolariu.ro/messages/fr.json`; their object shape must remain
  identical.
- Current route code uses typed selector callbacks from
  `next-intl-selector` / `next-intl-selector/server`, while locale resolution
  and messages come from `next-intl`.
- `sites/arolariu.ro/messages/en.d.json.ts` is derived. Do not hand-edit it;
  use the repository-owned i18n generation mechanism after source
  dictionaries change.
- Translate visible labels, accessible names, status announcements,
  validation copy, and metadata. Do not concatenate grammar-sensitive
  fragments.
- Live pages currently select metadata from `metadata` objects, while older
  repository guidance also names `__metadata__`. Preserve an existing route's
  sibling shape. For a new namespace, stop if choosing a shape would create
  or require a message migration.

## Metadata fallback

- `sites/arolariu.ro/src/metadata.ts` owns base metadata and
  `createMetadata`; route generators supply localized overrides and current
  locale.
- A route without an override inherits base metadata. A route with localized
  metadata should not silently catch a missing selector and emit misleading
  defaults.
- Verify title and description propagation to Open Graph/Twitter using
  `sites/arolariu.ro/src/metadata.test.ts`. Derive canonical or
  dynamic-resource metadata from a current sibling rather than guessing.
