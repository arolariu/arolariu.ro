# next-intl-selector migration design

## Context

The `sites/arolariu.ro` workspace currently uses `next-intl` string-key translators throughout the runtime app, email templates, Storybook support, and tests. The migration target is `next-intl-selector`, a thin selector-based wrapper around `next-intl` translator APIs that avoids large dot-path key unions while preserving typed message access through the existing `next-intl` `AppConfig` message schema.

The approved scope is the entire `sites/arolariu.ro` workspace, including `src/**`, `emails/**`, Storybook files, and test helpers/mocks. Provider, locale, message, and formatter APIs that are not translator-producing APIs remain imported from `next-intl` or `next-intl/server` as appropriate.

## Inventory

The initial read-only scan found the following migration surface, excluding `.next`, generated `messages/en.d.json.ts`, dependency folders, and build outputs:

| Area | Files | Translator calls | Literal calls | Template calls | Dynamic calls | Rich calls | Namespace use/get |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `src/app/domains/invoices` | 148 | 1,735 | 1,718 | 8 | 9 | 7 | 177 |
| `emails` | 20 | 366 | 358 | 6 | 2 | 27 | 0 |
| `src/app/about` | 25 | 320 | 285 | 35 | 0 | 0 | 26 |
| `src/app/my-profile` | 11 | 183 | 179 | 2 | 2 | 0 | 12 |
| `src/app/shared-routes` | 23 | 182 | 175 | 7 | 0 | 0 | 24 |
| `src/app/auth` | 7 | 56 | 56 | 0 | 0 | 0 | 9 |
| `src/components` | 5 | 53 | 53 | 0 | 0 | 0 | 6 |
| `src/presentation` | 3 | 5 | 3 | 0 | 2 | 2 | 2 |
| Other support files | 3 | 1 | 1 | 0 | 0 | 0 | 0 |

Workspace-level totals from the scan:

- 206 files import `next-intl`; 22 files import `next-intl/server`.
- 198 files call `useTranslations`; 19 files call `getTranslations`.
- 2,828 literal string-key translator calls are mechanically convertible.
- 58 template-key calls and 15 dynamic-key calls require review.
- 36 `t.rich` calls keep their replacement maps but need selector keys.
- No `t.has` call sites were found, so `hasRaw` is only needed if later dynamic existence checks appear.
- One local message-key type surface was found in `TriviaTips.tsx`.

## Target architecture

Add `next-intl-selector` `0.2.1` to the root monorepo package manifest, and reference it from `sites/arolariu.ro/package.json` as `"*"`, matching the workspace dependency convention.

Translator-producing imports move to selector packages:

```ts
import {useTranslations} from "next-intl-selector";
import {getTranslations} from "next-intl-selector/server";
import {createTranslator} from "next-intl-selector";
```

The selector package has no namespace argument on `useTranslations`, `getTranslations`, or `createTranslator`. Namespace prefixes must be inlined into selectors:

```ts
const t = useTranslations();
t((m) => m["IMS--Edit"].triviaTips.points);
```

Non-translator APIs stay on existing imports:

- `NextIntlClientProvider`
- `getMessages`
- `getLocale`
- `Locale`
- `AbstractIntlMessages`
- `useFormatter` and related formatter APIs

The existing module augmentation in `src/app/globals.ts` stays in place because `next-intl-selector` reads `Messages` from the existing `next-intl` `AppConfig`.

## Migration approach

Use a codemod-first migration followed by focused manual batches.

1. Add package references and update the lockfile once.
2. Build a project-specific `ts-morph` codemod with type-checker-backed translator detection.
3. Run transforms in the migration-guide order:
   - update selector translator imports;
   - remove namespace args from `useTranslations` and `getTranslations`;
   - inline namespaces into selector paths;
   - convert literal `t`, `t.rich`, `t.markup`, and `t.raw` calls;
   - convert statically bounded template keys to bracket selectors where safe;
   - leave genuinely runtime-dynamic paths for manual `selectorFromPath` fixups.
4. Skip generated declarations, `.bak` message files, dependency/build outputs, and files that only use provider/message/locale APIs.
5. Fix remaining type errors in batches by area, starting with shared translator infrastructure, then high-fan-out runtime areas, then emails, tests, and Storybook.
6. Remove temporary compatibility widening once all selector call sites compile.

Text-only heuristics are not acceptable for translator detection because they can corrupt unrelated functions or the translator factories themselves. The codemod must check call signatures structurally.

## Edge-case handling

### Dynamic paths

Genuinely dynamic message paths use `selectorFromPath`:

```ts
t(selectorFromPath(path));
```

Examples include `RichText.tsx`, which constructs `sectionKey + textKey`, and email variants that derive keys from day/frequency/missing-field values. Existing logged fallback behavior in `RichText.tsx` should be preserved unless a separate behavior change is explicitly approved.

### Static template keys

Template keys whose variable segment is a bounded union should become bracket selectors:

```ts
const key = suggestion.key;
t((m) => m.InvoiceHealthScore.suggestions[key]);
```

If TypeScript loses narrowing inside the selector closure, capture the narrowed value into a `const` before the selector.

### Rich text

`t.rich` keeps its replacement object. Only the first argument changes from a string key to a selector. Existing inline replacement functions in React and React Email templates remain local to their call sites.

### Emails

`emails/_lib/i18n.tsx` is the main email migration boundary. It currently exposes a namespace-scoped string-key `EmailTranslator`. The migration should replace that with a selector-compatible email translator facade. The final email type surface should not permanently accept arbitrary string keys, except where a path is genuinely runtime-dynamic and normalized with `selectorFromPath`.

### Tests and Storybook

Vitest global mocks must mock the selector translator surface, preferably using `mockSelectorTranslator` from `next-intl-selector/testing` where that fits the test shape. Storybook and render helpers keep provider usage on `NextIntlClientProvider`; only translator mocks/imports move.

## Regression guard

After migration, block new selector-eligible imports from legacy modules:

- `useTranslations` and `createTranslator` should not be imported from `next-intl`.
- `getTranslations` should not be imported from `next-intl/server`.

Provider, locale, messages, and formatter APIs must remain allowed. If the existing lint configuration supports this cleanly, add the import restriction. If not, document the restriction and rely on typecheck, build, unit tests, and code review until a later lint-enabled task.

## Verification constraints

The user-approved executable verification boundary is strict:

- Allowed: website typecheck if available, `npm run test:unit`, and `npm run build:website`.
- Not allowed: ESLint, Playwright, E2E tests, Storybook tests, full `npm run test`, or full-suite commands.

Use typecheck after codemod/fixup batches because this migration is primarily type-safety driven. Use `npm run test:unit` and `npm run build:website` as the final executable gates.

## Risks

- Large selector substitutions can create formatting churn and review noise.
- Dynamic/template keys are the highest risk for semantic regressions.
- Email templates currently rely on an intentionally loose namespace-scoped string translator and need a careful facade redesign.
- Import restrictions must not accidentally ban required provider/message/locale APIs from `next-intl`.
- The workspace has unrelated dirty files at the time of writing; migration commits must avoid including unrelated changes.

## Approved decisions

- Scope: entire `sites/arolariu.ro` workspace.
- Approach: typed codemod first, then manual fixups.
- End state: strict selector-translated code with no permanent string-key compatibility.
- Verification: only typecheck if available, `npm run test:unit`, and `npm run build:website`; no ESLint, Playwright, E2E, Storybook tests, or full test runs.
