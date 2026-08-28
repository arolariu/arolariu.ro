# RFC 1004: Metadata and SEO System

- **Status**: Implemented
- **Date**: 2025-12-25
- **Authors**: Alexandru-Razvan Olariu
- **Related Components**: `sites/arolariu.ro/src/metadata.ts`, App Router
  pages/layouts, localized message dictionaries

---

## Abstract

The website centralizes base metadata in `src/metadata.ts` and creates
route-specific metadata through `createMetadata`. App Router pages and layouts
derive localized title/description values with typed
`next-intl-selector/server` selectors, then merge only page-specific
overrides.

Live Next.js route types, the metadata helper, message schema, and tests are
authoritative.

## Goals

- One base metadata owner for shared defaults.
- Localized page metadata with compile-time message-key checking.
- Consistent title/description propagation to Open Graph and Twitter.
- App Router-compatible static and dynamic metadata.
- No duplicated hand-written metadata object that drifts from shared security,
  icons, robots, alternates, or social defaults.

## Base metadata

`src/metadata.ts` exports the repository's base `Metadata` object. It owns
shared title templates/defaults, description, application identity, robots,
icons/manifests, social defaults, format-detection behavior, and other
cross-route metadata.

Page modules should not copy that object. Add or change a global default at the
base owner only when the behavior is intentionally site-wide.

## Page metadata helper

`createMetadata(partialMetadata)`:

1. starts from the base metadata;
2. merges page-specific fields;
3. applies a supplied title and description to the root, Open Graph, and
   Twitter objects;
4. merges page-specific Open Graph/Twitter overrides;
5. handles the repository's current locale/alternate-locale behavior.

Use it from `generateMetadata`:

```tsx
import type {Metadata} from "next";
import {getLocale} from "next-intl/server";
import {getTranslations} from "next-intl-selector/server";
import {createMetadata} from "@/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const locale = await getLocale();

  return createMetadata({
    locale,
    title: t((messages) => messages.pages.invoices.landing.metadata.title),
    description: t((messages) => messages.pages.invoices.landing.metadata.description),
  });
}
```

Ordinary page/layout metadata should not bypass `createMetadata`.
`app/global-not-found.tsx` is the current framework special-file exception and
exports a small hand-built static 404 metadata object.

## Locale behavior

The helper currently sets:

- `openGraph.locale` to the supplied locale string (`"en"`, `"ro"`, or
  `"fr"`);
- `openGraph.alternateLocale` through the internal mapping:
  - `en` -> `en_US`
  - `ro` -> `ro_RO`
  - an unmapped locale, including current `fr`, -> `en_US`

Do not claim that `locale: "ro"` makes `openGraph.locale` equal `ro_RO`; the
regional value is the alternate locale. Adding a French regional mapping
requires changing and testing the live helper.

## Localized message schema

SEO copy uses nested `metadata` objects in every locale:

```json
{
  "pages": {
    "invoices": {
      "landing": {
        "metadata": {
          "title": "...",
          "description": "..."
        }
      }
    }
  }
}
```

`__metadata__` is not a second supported schema. Add the same `metadata` path
to `en`, `ro`, and `fr`, regenerate message declarations, and use typed
selector callbacks.

RFC 1003 owns the broader i18n contract.

## Dynamic routes

Current App Router route parameters are promise-backed through generated route
types. Await them before using a value:

```tsx
export async function generateMetadata(
  props: Readonly<PageProps<"/domains/invoices/view-invoice/[id]">>,
): Promise<Metadata> {
  const {id} = await props.params;
  // Validate/access/fetch through the route's established server boundary.
  return createMetadata({title: id});
}
```

Do not copy synchronous `{params: {id: string}}` examples from older Next.js
versions. Metadata reads must preserve the same authentication, ownership,
transport validation, and not-found behavior as the page.

## Static versus dynamic metadata

- Use `generateMetadata` when metadata depends on locale, promised route
  inputs, authenticated/server data, or another request-time value.
- A static export is acceptable when it genuinely has no request/locale
  dependency and normally still uses `createMetadata`; the global not-found
  artifact is the current framework exception.
- Keep metadata on the server; do not move it into a Client Component.
- Avoid duplicate data fetches by reusing the established server helper/cache
  contract when safe.

## Open Graph and Twitter

The page supplies title/description once. `createMetadata` propagates them to
Open Graph and Twitter while preserving base defaults and page overrides.

Page-specific images, canonical URLs, or social fields must:

- use current safe public URLs;
- retain localized title/description;
- avoid user/private invoice content;
- preserve the helper's merge shape.

## Route and boundary behavior

Metadata is part of the route contract:

- missing resources should follow the route's established `notFound()` or
  safe fallback behavior;
- authorization failures must not leak private resource titles;
- transport/provider errors must not become raw metadata content;
- route `loading.tsx`/`error.tsx` behavior remains separate from metadata
  generation.

Next.js special-file lifecycle belongs to the Next.js instruction catalog;
auth and i18n behavior remain with their owning workflows.

## Verification

Current metadata tests should cover:

- base metadata preservation;
- title/description propagation;
- Open Graph and Twitter override merging;
- locale and alternate-locale behavior, including the French fallback;
- missing optional values;
- dynamic route parameter handling;
- localized selector paths.

After message changes, regenerate i18n declarations and run the smallest
website test/build checks owned by root guidance.

## References

- `sites/arolariu.ro/src/metadata.ts`
- `sites/arolariu.ro/src/metadata.test.ts`
- current `generateMetadata` functions under `sites/arolariu.ro/src/app/`
- `sites/arolariu.ro/messages/en.json`
- [RFC 1003](./1003-internationalization-system.md)
- [Next.js metadata](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
