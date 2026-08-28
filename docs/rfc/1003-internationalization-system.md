# RFC 1003: Internationalization System

- **Status**: Implemented
- **Date**: 2025-12-25
- **Authors**: Alexandru-Razvan Olariu
- **Related Components**: `sites/arolariu.ro/messages`,
  `sites/arolariu.ro/src/i18n`, website routes/components, generated message
  declarations

---

## Abstract

The website uses `next-intl` for request locale/message delivery and
`next-intl-selector` for typed selector-based access. English, Romanian, and
French message files share one structural schema. Server and Client Components
select values through callbacks against generated message types.

All user-visible copy should be message-owned. A small number of current
components still contain hard-coded visible/accessibility strings (including
scan and sharing surfaces); those are implementation debt, not examples to
copy.

Live message files, i18n request configuration, generated declarations, and
consumers are authoritative. This RFC records the intended ownership and
invariants.

## Goals

- One structurally identical message schema across supported locales.
- Compile-time selector safety for server and client consumers.
- Server-owned locale selection and message loading.
- ICU messages for interpolation, plurals, select branches, dates, and times.
- Localized metadata, accessibility text, email copy, and errors.
- Generated declarations derived from the source locale rather than edited by
  hand.

## Supported locale flow

`src/i18n/request.ts`:

1. reads the `locale` cookie;
2. defaults to English when the cookie is absent;
3. rejects a locale outside `en`, `ro`, and `fr`;
4. dynamically imports the complete selected locale dictionary;
5. configures the request time zone.

`app/layout.tsx` obtains the selected dictionary and passes it through the
root client providers. One complete locale dictionary currently crosses that
provider boundary. Do not claim per-key tree shaking or copy static bundle
sizes without a current measured build.

## Message ownership

```text
sites/arolariu.ro/messages/
├── en.json          # source schema
├── ro.json          # Romanian values with identical keys
├── fr.json          # French values with identical keys
└── en.d.json.ts     # generated selector declarations
```

- Add every new key to all three JSON files.
- Keep object/leaf shape identical across locales.
- Preserve valid ICU syntax and variable names.
- Run the repository-owned i18n generator after source-message changes.
- Never edit `en.d.json.ts` manually.

The generator and live selector types, not this RFC, own the exact emitted
declaration shape.

## Typed selector usage

### Server Components and metadata

```tsx
import {getTranslations} from "next-intl-selector/server";

const t = await getTranslations();
const title = t((messages) => messages.pages.invoices.landing.metadata.title);
```

Use the server import for Server Components, layouts, Route Handlers, private
server helpers, and `generateMetadata`.

### Client Components

```tsx
"use client";

import {useTranslations} from "next-intl-selector";

export function Heading(): React.JSX.Element {
  const t = useTranslations();
  return <h1>{t((messages) => messages.pages.home.title)}</h1>;
}
```

Do not switch new work back to string namespace calls such as
`useTranslations("Footer")`. Selector callbacks preserve generated key
checking through nested message structures.

## Metadata schema

Page-level SEO copy uses the live nested `metadata` objects:

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

`__metadata__` is not an alternate supported convention. Current locale files
contain `metadata`; preserve the neighboring route's schema and update all
locales plus generated declarations together.

Metadata lifecycle and `createMetadata` behavior are owned by RFC 1004 and
live source.

## ICU messages

Use ICU syntax when one message needs runtime values or language-specific
branches:

```json
{
  "selectionCount": "{count, plural, =0 {No items} one {# item} other {# items}}"
}
```

- Keep placeholder names identical across locales.
- Pass typed values at the selector call site.
- Use plural/select/date/time formatting rather than string concatenation.
- Keep markup out of messages unless the current rich-text consumer explicitly
  owns it.

Server formatting uses server APIs such as `getFormatter`; Client Components
use the matching client hooks. Do not await a client Hook or import it into a
Server Component.

## Accessibility and errors

Translate user-visible:

- headings, labels, descriptions, buttons, empty/loading/error states;
- `aria-label`, visually hidden text, live-region status, and validation
  messages;
- metadata and social descriptions;
- transactional email content;
- recoverable Server Action messages shown to users.

Stable machine identifiers, event names, metric labels, route paths, and
provider error codes are not locale strings.

## Server Actions

A `"use server"` export remains implemented on the server but is
browser-callable RPC. It must:

- validate browser-controlled input;
- derive identity server-side through the established auth boundary;
- authorize the requested operation independently;
- return the established typed result contract;
- translate only user-visible messages.

Do not accept a caller-supplied JWT merely because the action executes on the
server.

## Validation

For message changes:

- verify key-shape parity across `en`, `ro`, and `fr`;
- regenerate selector declarations;
- type-check server and client selectors;
- test ICU branches and user-visible behavior at the owning component/action;
- inspect metadata/email consumers when their key paths change.

For route or component work, use the matching React/i18n skill and the smallest
current project validation rather than duplicating commands here.

## Trade-offs

The full locale dictionary simplifies one consistent root provider and
server/client selector API, but it increases the client handoff size. A future
message-splitting design would require measured bundle evidence and a new
loading contract; it is not implied by the current selector API.

## References

- `sites/arolariu.ro/src/i18n/request.ts`
- `sites/arolariu.ro/src/app/layout.tsx`
- `sites/arolariu.ro/src/app/providers.tsx`
- `sites/arolariu.ro/messages/en.json`
- `sites/arolariu.ro/messages/ro.json`
- `sites/arolariu.ro/messages/fr.json`
- `sites/arolariu.ro/messages/en.d.json.ts`
- [RFC 1004](./1004-metadata-seo-system.md)
- [next-intl](https://next-intl.dev/)
