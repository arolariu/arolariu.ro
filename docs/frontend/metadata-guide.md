# Metadata and SEO Guide

Use the shared `createMetadata` helper for website page metadata. RFC 1004
owns the architecture; live `src/metadata.ts`, route functions, messages, and
tests own current behavior.

## Localized page metadata

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

Page copy comes from the live nested `metadata` message tree. Do not use
`__metadata__` or the retired string-namespace translation API.

## Dynamic routes

Current App Router route inputs are promise-backed:

```tsx
export async function generateMetadata(
  props: Readonly<PageProps<"/domains/invoices/view-invoice/[id]">>,
): Promise<Metadata> {
  const {id} = await props.params;
  // Validate and fetch through the route's established server boundary.
  return createMetadata({title: id});
}
```

Await route parameters once. Preserve the page's authentication, ownership,
not-found, and transport-validation behavior; private data must not leak into
metadata for an unauthorized request.

## What `createMetadata` owns

- shared base title/default/template behavior;
- description and application identity;
- icons, manifest, robots, format detection, and other site defaults;
- propagation of page title/description to Open Graph and Twitter;
- merging of page-specific Open Graph/Twitter fields;
- current locale and alternate-locale behavior.

Do not hand-build a separate route metadata object that copies these defaults.

## Locale behavior

When a locale is supplied:

- `openGraph.locale` receives the supplied locale (`en`, `ro`, or `fr`);
- `openGraph.alternateLocale` maps `en` to `en_US` and `ro` to `ro_RO`;
- unmapped locales, including current `fr`, fall back to `en_US` for
  `alternateLocale`.

Adding a French regional mapping requires a source and test change. Do not
describe `openGraph.locale` as regionalized when the helper stores the short
locale there.

## Static metadata

A static metadata export is appropriate only when an ordinary route genuinely
has no locale or request-time dependency and still calls `createMetadata`.
`app/global-not-found.tsx` is the current framework special-file exception
with a small hand-built static 404 metadata object:

```tsx
export const metadata: Metadata = {
  title: "arolariu.ro | 404",
  description: "Page not found.",
};
```

Most user-facing routes use localized `generateMetadata`.

## Open Graph and Twitter

Supply title and description once. Add route-specific images or other social
fields only as partial overrides:

```tsx
return createMetadata({
  locale,
  title,
  description,
  openGraph: {
    images: [{url: "/images/example.png"}],
  },
});
```

Use public, stable URLs and avoid private/customer invoice data.

## Error and not-found behavior

- Unauthorized/private resources must not reveal titles or descriptions.
- Missing resources follow the route's established not-found behavior.
- Transport/provider failures must not be rendered into metadata as raw
  exception text.
- Metadata generation stays server-side.

## Validation

Test:

- base metadata preservation;
- title/description propagation;
- Open Graph/Twitter merge behavior;
- locale and alternate-locale mapping;
- dynamic promised parameters;
- missing optional values;
- localized selector paths and locale parity.

After message changes, run the root i18n generator and the smallest website
tests/build selected by root guidance.

## References

- [RFC 1004](../rfc/1004-metadata-seo-system.md)
- [RFC 1003](../rfc/1003-internationalization-system.md)
- `sites/arolariu.ro/src/metadata.ts`
- `sites/arolariu.ro/src/metadata.test.ts`
- current `generateMetadata` functions under `sites/arolariu.ro/src/app/`
