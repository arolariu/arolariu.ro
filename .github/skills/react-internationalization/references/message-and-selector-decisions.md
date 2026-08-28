# Message and Selector Decisions

Use before editing message artifacts.

## Artifact ownership

| Artifact | Owner / rule |
| --- | --- |
| English message schema | `sites/arolariu.ro/messages/en.json` |
| Romanian and French values | `ro.json` and `fr.json`, identical key shape |
| Generated message declaration | next-intl declaration generation configured from `en.json`; never hand-edit |
| Server component/metadata selector | `getTranslations` from `next-intl-selector/server` |
| Client component selector | `useTranslations` from `next-intl-selector` |
| Email translation | `emails/_lib/i18n.tsx` and `defineEmailTemplate`; use full message paths |

## Key design

- Name keys for durable meaning (`title`, `emptyState`, `retry`) rather than
  position (`leftText`, `thirdLabel`).
- Keep route-only copy under the route namespace and cross-route copy under
  the existing shared namespace.
- A rename/move updates every locale and consumer atomically.
- An object in one locale cannot be a string in another.
- Live dictionaries and selectors use nested `metadata` keys.

## ICU contract

For each locale, preserve:

- the same argument names;
- compatible plural/select branches;
- the same rich-text tag names;
- values of the type expected by the typed selector/translator.

Translate sentence structure around variables; do not concatenate localized
fragments. Test zero/one/other and select branches that affect meaning.

## Fallback and failure behavior

The live request configuration defaults a missing locale cookie to English and
throws for unsupported locale values. Email translation also defaults to
English. Missing message keys are not an approved content fallback.

Changing default locale, unsupported-locale handling, or missing-message
fallback is public behavior and requires explicit approval plus server/client/
email tests.

## Generation behavior

The repository i18n generator treats English as the source key set and can
write missing Romanian/French paths with empty-string leaves. Therefore:

1. update all locales before generation when possible;
2. run the canonical command from root guidance;
3. inspect all locale mutations;
4. replace every empty placeholder with a real translation;
5. rerun until no missing keys remain;
6. refresh/compile the generated declaration through the configured next-intl
   mechanism.

Do not copy command spellings from an RFC; root guidance owns current commands.
