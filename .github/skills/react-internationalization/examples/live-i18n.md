# Live Internationalization Examples

These pointers are dynamic; inspect current source before changing a schema.

## Locale loading and declaration generation

- `sites/arolariu.ro/src/i18n/request.ts`
- `sites/arolariu.ro/next.config.ts`
- `sites/arolariu.ro/messages/en.d.json.ts`
- `scripts/generate.i18n.ts`

The request config currently recognizes `en`, `ro`, and `fr`, defaults a
missing cookie to `en`, and throws for an unsupported value. The next-intl
plugin points declaration generation at `messages/en.json`.
`en.d.json.ts` is generated output.

The repository generator validates Romanian and French against English and can
insert missing keys as empty strings. A generator run that writes placeholders
is not completion evidence.

## Typed website selectors and metadata

- `sites/arolariu.ro/src/app/auth/page.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/page.tsx`
- `sites/arolariu.ro/src/app/_components/Hero.tsx`
- `sites/arolariu.ro/src/metadata.ts`

Server pages use `getTranslations` from `next-intl-selector/server`; client
components use `useTranslations` from `next-intl-selector`. Metadata goes
through `createMetadata`, and current message files use nested `metadata`
keys.

## Email localization

- `sites/arolariu.ro/emails/_lib/i18n.tsx`
- `sites/arolariu.ro/emails/_lib/defineEmailTemplate.ts`
- `sites/arolariu.ro/emails/_lib/i18n.test.ts`
- `sites/arolariu.ro/emails/_registry.test.ts`

Email templates render outside the interactive provider tree. They load the
same locale dictionaries through an email-local `createTranslator` wrapper
and use `selectorFromPath` as a full-path identity helper. Do not import the
React-bound `next-intl-selector` runtime into this graph.
