# Message Tree Hierarchy Redesign

## Context

The `sites/arolariu.ro/messages/` directory currently contains one authored JSON catalog per locale:

- `en.json` — English source of truth
- `ro.json` — Romanian catalog
- `fr.json` — French catalog

`en.d.json.ts` is generated from `en.json` via the `next-intl` `createMessagesDeclaration` setting in `sites/arolariu.ro/next.config.ts`. Runtime loading stays centralized in `src/i18n/request.ts`, and `src/app/globals.ts` wires the English message shape into `next-intl` `AppConfig`.

The current catalogs are structurally aligned across all three locales:

- 26 top-level keys per locale
- 3,326 leaves per locale
- Maximum tree depth of 6
- 1,787 leaves under `IMS--*` prefixes
- 1,539 leaves outside `IMS--*`

Large current top-level groups include `About` (570 leaves), `IMS--Dialogs` (450), `email` (382), `IMS--Cards` (319), `IMS--View` (224), `Profile` (208), `IMS--List` (146), and `IMS--Edit` (132). This shape is functional but hard to discover because it mixes route names, product-domain labels, implementation-era prefixes, UI-surface groups, and email template groups at the same level.

## Goals

1. Keep one authored JSON file per locale.
2. Replace mixed top-level namespaces with a strict UI-surface-first hierarchy.
3. Make message paths predictable from the kind of UI being edited.
4. Preserve exact locale parity across `en`, `ro`, and `fr`.
5. Preserve selector-based `next-intl-selector` call sites and generated message typing.
6. Add taxonomy validation so the old drift does not return.

## Non-goals

- Do not split catalogs into per-domain files.
- Do not change supported locales.
- Do not change runtime locale resolution, cookie behavior, or `NextIntlClientProvider` wiring.
- Do not introduce a new i18n library.
- Do not rewrite copy content for tone, language quality, or translation accuracy as part of the hierarchy migration.

## Target top-level buckets

The new tree uses strict UI-surface buckets. The first segment answers: “what UI surface owns this copy?”

| Bucket | Purpose |
| --- | --- |
| `app` | App shell and cross-route chrome: navigation, footer, commander, global errors, not-found, app-level accessibility copy. |
| `pages` | Page-level route copy and metadata: titles, subtitles, page descriptions, SEO metadata. |
| `sections` | Reusable page sections that are not generic components: hero, feature, stats, legal article, timeline, platform/about sections. |
| `components` | Shared reusable components and presentation primitives that are not tied to a page/domain. |
| `dialogs` | Modal/dialog/sheet copy grouped by domain and dialog name. |
| `cards` | Card and widget copy grouped by domain and card name. |
| `forms` | Fields, validation labels, placeholders, helper text, steppers, filters, and form-specific errors. |
| `tables` | Table/list headers, row actions, bulk actions, table empty states, and table-specific labels. |
| `toasts` | Transient success, error, loading, and promise-toast messages. |
| `emails` | React Email template copy grouped by category and template name. |
| `shared` | Domain-neutral enums, actions, statuses, accessibility labels, fallbacks, formatting words, and reusable phrases. |

No other top-level buckets are allowed after the migration.

## Naming rules

All path segments use lower camelCase. Symbolic prefixes such as `IMS--` are removed.

Stable path shapes:

```text
pages.<area>.<page>.metadata.title
pages.<area>.<page>.metadata.description
pages.<area>.<page>.title
pages.<area>.<page>.subtitle

sections.<area>.<sectionName>.title
sections.<area>.<sectionName>.description
sections.<area>.<sectionName>.items.<itemKey>.title

dialogs.<domain>.<dialogName>.title
dialogs.<domain>.<dialogName>.description
dialogs.<domain>.<dialogName>.actions.<actionName>
dialogs.<domain>.<dialogName>.states.<stateName>.title
dialogs.<domain>.<dialogName>.toasts.<eventName>.<status>

cards.<domain>.<cardName>.title
cards.<domain>.<cardName>.description
cards.<domain>.<cardName>.metrics.<metricName>.label
cards.<domain>.<cardName>.states.<stateName>.description

forms.<domain>.<formName>.fields.<fieldName>.label
forms.<domain>.<formName>.fields.<fieldName>.placeholder
forms.<domain>.<formName>.fields.<fieldName>.helper
forms.<domain>.<formName>.fields.<fieldName>.errors.<errorName>

tables.<domain>.<tableName>.columns.<columnName>
tables.<domain>.<tableName>.rows.actions.<actionName>
tables.<domain>.<tableName>.empty.title

toasts.<domain>.<featureName>.<eventName>.<status>

emails.<category>.<templateName>.subject
emails.<category>.<templateName>.preview
emails.<category>.<templateName>.heading
emails.<category>.<templateName>.body.<blockName>
emails.<category>.<templateName>.cta.<actionName>
emails.<category>.<templateName>.signOff.<lineName>

shared.actions.<actionName>
shared.status.<statusName>
shared.accessibility.<labelName>
shared.enums.<enumName>.<memberName>
shared.fallbacks.<fallbackName>
```

Leaf names should be semantic (`title`, `description`, `label`, `helper`, `empty.title`, `actions.save`) rather than implementation-specific (`cardTitleBase`, `buttonText2`, `fooString`).

## High-level migration mapping

| Current group | Target bucket strategy |
| --- | --- |
| `IMS--Dialogs` | `dialogs.invoices.*` |
| `IMS--Cards` | `cards.invoices.*` |
| `IMS--Create` | Split into `pages.invoices.create`, `forms.invoices.createInvoice`, and `toasts.invoices.createInvoice`. |
| `IMS--Edit` | Split into `pages.invoices.edit`, `forms.invoices.editInvoice`, `cards.invoices.*`, and `sections.invoices.*`. |
| `IMS--List` | Split into `pages.invoices.viewInvoices`, `forms.invoices.filters`, `tables.invoices.list`, and `toasts.invoices.*`. |
| `IMS--View` | Split into `pages.invoices.viewInvoice`, `cards.invoices.*`, `sections.invoices.timeline`, and `dialogs.invoices.*`. |
| `IMS--ViewScans` | Split into `pages.invoices.viewScans`, `cards.invoices.scan`, `dialogs.invoices.*`, and `toasts.invoices.scans`. |
| `IMS--UploadScans` | Split into `pages.invoices.uploadScans`, `forms.invoices.uploadScans`, `sections.invoices.uploadScans`, and `toasts.invoices.scans`. |
| `IMS--Stats` | `cards.invoices.statistics.*` and `sections.invoices.statistics.*` depending on visual role. |
| `IMS--Common` | `shared.*`, `forms.invoices.*`, or `toasts.invoices.*` depending on usage. |
| `IMS--Hooks` | `toasts.invoices.*` for user-visible hook feedback; otherwise colocate under owning surface. |
| `About` | `pages.about.*`, `sections.about.*`, and `cards.about.*`. |
| `Home` | `pages.home.*` and `sections.home.*`. |
| `Domains` | `pages.domains.*` and `sections.domains.*`. |
| `Profile` | `pages.profile.*`, `forms.profile.*`, `cards.profile.*`, and `toasts.profile.*`. |
| `Legal`, `EULA`, `Acknowledgements` | `pages.legal.*`, `sections.legal.*`, and `tables.legal.*` where applicable. |
| `Auth` | `pages.auth.*`, `forms.auth.*`, and `sections.auth.*`. |
| `Navigation`, `Footer`, `Commander`, `Errors`, `Common` | `app.*`, `components.*`, or `shared.*` depending on ownership. |
| `email` | `emails.*`, normalized by category and template name. |

## Migration tooling

The implementation should create `scripts/migrations/message-tree/` with:

1. A deterministic old-path to new-path key map.
2. A message-tree rewrite script that applies the same key map to `en.json`, `ro.json`, and `fr.json`.
3. A selector call-site rewrite script that updates:
   - direct selector lambdas, e.g. `m["IMS--Cards"].healthScore.title`
   - dynamic `selectorFromPath("...")` calls
   - email template selectors
4. A report command that prints before/after:
   - leaf count
   - maximum depth
   - bucket counts
   - locale parity
   - remaining old prefixes
   - remaining disallowed top-level buckets

The key map is the source of truth for the migration. It must be reviewed before mass rewriting catalogs and call sites.

## Validation rules

Upgrade `scripts/generate.i18n.ts` or add a companion validator invoked by generation/typecheck to enforce:

- allowed top-level buckets only
- lower camelCase path segments
- no `IMS--` prefixes
- exact `en/ro/fr` key parity
- no extra keys in target locales
- no missing keys in target locales
- no object/leaf type mismatches between locales
- no empty English source leaves
- no empty target-locale leaves except explicitly accepted translator placeholders
- common actions/statuses/accessibility labels live under `shared` unless intentionally surface-specific

## Verification boundary

Use the approved verification boundary from the selector migration:

- website typecheck, including import guard
- `npm run test:unit`
- `npm run build:website`

Do not run ESLint, Playwright, E2E tests, Storybook tests, full `npm run test`, or other full-suite commands unless explicitly re-approved.

## Risks

- This is a broad rename across 3,326 leaves and hundreds of selector call sites.
- Dynamic `selectorFromPath(...)` paths need special handling because static selector-lambda rewriting will not catch all runtime-composed paths.
- A strict UI-bucket taxonomy improves discovery but can separate feature copy across multiple buckets. The mitigation is consistent second/third segments, e.g. `dialogs.invoices.share`, `cards.invoices.sharing`, `toasts.invoices.share`.
- Existing uncommitted working-tree changes must not be included in spec or implementation commits unless they are explicitly part of the hierarchy work.

## Approved decisions

- Keep one authored JSON file per locale.
- Use strict UI-surface top-level buckets.
- Use lower camelCase and remove `IMS--` prefixes.
- Keep current runtime i18n wiring intact.
- Codemod the migration through a reviewed key map.
