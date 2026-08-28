# Internationalization Guide

The website uses `next-intl` for request/provider behavior and
`next-intl-selector` for typed message access. RFC 1003 owns the architecture;
live messages, generated declarations, and consumers own current behavior.

## Message files

```text
sites/arolariu.ro/messages/
├── en.json
├── ro.json
├── fr.json
└── en.d.json.ts
```

- `en.json` is the source schema.
- `ro.json` and `fr.json` must contain the same key structure.
- `en.d.json.ts` is generated and must not be edited by hand.
- User-visible text belongs in messages, including accessibility labels,
  errors, empty/loading states, metadata, and email copy.

## Server usage

```tsx
import {getTranslations} from "next-intl-selector/server";

export default async function Page(): Promise<React.JSX.Element> {
  const t = await getTranslations();
  return <h1>{t((messages) => messages.pages.home.title)}</h1>;
}
```

Use the server import in Server Components, layouts, Route Handlers, private
server helpers, and metadata generation.

## Client usage

```tsx
"use client";

import {useTranslations} from "next-intl-selector";

export function ButtonLabel(): React.JSX.Element {
  const t = useTranslations();
  return <span>{t((messages) => messages.shared.invoices.invoiceHeader.buttons.save)}</span>;
}
```

Do not use the retired string-namespace shape such as
`useTranslations("Footer")` for new code.

## Metadata messages

Current locale files use nested `metadata` objects:

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

Use the same path in all locales, select it with
`next-intl-selector/server`, and pass values to `createMetadata`.
`__metadata__` is not a supported alternate schema.

## ICU messages

Use ICU for variables and language-dependent branches:

```json
{
  "selected": "{count, plural, =0 {No items selected} one {# item selected} other {# items selected}}"
}
```

Keep variable names identical in each locale. Prefer plural/select/date/time
formatting to concatenating translated fragments.

## Dates, numbers, and relative time

Server Components use server formatting APIs such as `getFormatter`; Client
Components use the matching client Hooks. Do not call or await a client Hook
from server code.

The request configuration in `src/i18n/request.ts` owns locale validation,
dictionary loading, and the configured time zone.

## Adding or changing messages

1. Find the nearest existing domain/shared namespace.
2. Add the same key and ICU variables to `en`, `ro`, and `fr`.
3. Use a typed selector callback at the consumer.
4. Run the root i18n generation command.
5. Test every changed ICU branch and user-visible state.
6. Inspect metadata/email/accessibility consumers when their schema changes.

Do not copy a message into a second namespace solely to shorten a selector.
Move/rename keys only as an explicit schema migration with all consumers and
locales updated together.

## Client bundle behavior

The root layout currently loads one complete selected locale dictionary and
passes it to the client provider. Do not claim that unused keys are
tree-shaken or quote static locale sizes without a current measured build.

Reducing that handoff would require a new loading/provider contract and bundle
evidence.

## Server Actions

`"use server"` exports are browser-callable RPC even though their
implementation runs on the server. Validate browser input, derive identity
server-side, authorize independently, and translate only the user-visible
result. Never accept a caller-provided JWT as proof of identity.

## Testing checklist

- selector path compiles against generated declarations;
- all locale files have identical key/leaf structure;
- ICU variables and branches match across locales;
- visible copy and accessible names render correctly;
- metadata selectors feed `createMetadata`;
- no machine identifier, metric label, route, or provider code is translated;
- generated declaration changes are reviewed but not hand-edited.

## References

- [RFC 1003](../rfc/1003-internationalization-system.md)
- [RFC 1004](../rfc/1004-metadata-seo-system.md)
- `sites/arolariu.ro/src/i18n/request.ts`
- `sites/arolariu.ro/src/app/layout.tsx`
- `sites/arolariu.ro/src/app/providers.tsx`
- `sites/arolariu.ro/messages/`
