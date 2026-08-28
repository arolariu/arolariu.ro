---
name: react-internationalization
description: Change arolariu.ro next-intl and next-intl-selector message assets safely. Use for locale dictionary schemas, typed selectors, metadata or email copy, ICU arguments, generated declarations, fallback behavior, and focused i18n validation.
---

# React Internationalization

## When to Use

- Add, remove, rename, move, or materially change message keys.
- Change typed selector use in a Server or Client Component.
- Change localized metadata, email copy, ICU variables, locale loading, or
  fallback behavior.
- Use as a secondary skill when component/page work changes message artifacts.

## Boundaries

- This skill owns message schemas, locale parity, selector contracts,
  generation, and localized behavior.
- It does not own component layout, styling, or interaction.
- Preserve the target namespace's live nested `metadata` shape.

## Required Inputs

- Every selector/namespace consumer, including metadata and email templates.
- The affected subtree in `en.json`, `ro.json`, and `fr.json`.
- ICU variable names/types and rich-text tags for each message.
- `src/i18n/request.ts`, the next-intl plugin configuration, generated
  declaration ownership, relevant tests, and RFC 1003/1004 intent.

## Procedure

1. Read all consumers and the complete affected subtree in all three locale
   files. Confirm whether it is page, shared UI, metadata, or email copy.
2. Design the smallest stable key path around meaning, not the current visual
   layout. Preserve the sibling namespace shape.
3. Update `en`, `ro`, and `fr` together with identical object/leaf shape and
   equivalent ICU variable/tag sets. Provide real localized values; do not
   leave generated empty placeholders.
4. Use `next-intl-selector/server` in server contexts and
   `next-intl-selector` in client contexts. Preserve selector inference rather
   than falling back to unchecked string paths.
5. For metadata, use the shared metadata helper through the route's existing
   typed `metadata` selector. For emails, follow the email-local translator and
   full-path helper rather than importing the React selector runtime.
6. Preserve current locale defaults and unsupported-locale behavior unless a
   separately approved public behavior change requires otherwise.
7. Run the repository-owned i18n generation. Inspect mutations: the generator
   may add missing locale keys as empty strings. Fill them and rerun to a clean
   zero-missing result.
8. Never hand-edit `messages/en.d.json.ts`; refresh it through the configured
   next-intl declaration mechanism and compile the affected selectors.
9. Run focused message/metadata/email/component tests and the smallest website
   verification needed for generated types.

## Resource Triggers

| Trigger | Resource |
| --- | --- |
| Before changing key shape, selectors, ICU arguments, metadata/email copy, generation, or fallback behavior | [Message and selector decisions](references/message-and-selector-decisions.md) |
| Need current locale, selector, declaration, metadata, or email evidence | [Live i18n examples](examples/live-i18n.md) |
| Before generation and test selection | [I18n verification matrix](checklists/i18n-verification-matrix.md) |

## Verification

- All three locale trees and ICU contracts align.
- Server, client, metadata, and email consumers use their established typed
  translation boundary.
- Generated declarations are source-derived and current.
- Missing/unsupported locale behavior is unchanged unless explicitly approved.

## Stop and Ask

- Locale fallback, supported locale set, public metadata, or email delivery
  behavior would change.
- `next.config.ts`, a dependency, or a component interaction/layout must
  change outside the approved task.

## Completion Contract

Report message paths and locale artifacts changed, server/client/email selector
ownership, ICU/fallback behavior, generation and exact tests run, and only
material residual risk or incomplete validation.
