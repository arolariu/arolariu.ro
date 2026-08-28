# Website Reference Catalog

Owner: `.github/instructions/frontend.instructions.md`. This catalog holds
extensive `sites/arolariu.ro`-specific examples, anti-patterns, edge cases,
and RFC-grounded rationale. It does not define a workflow — the generic React
instruction routes to server/client component, Hook, Server Action, store,
i18n, auth, and compiler skills — and it does not restate TypeScript/React
language rules or root safety policy. React server/client execution boundaries
live in `react-server.md` and `react-client.md`; App Router framework mechanics
live in `nextjs.md`.

## Clerk boundary

`sites/arolariu.ro/src/proxy.ts` is the Clerk middleware entrypoint and owns
matcher-based route protection. The current matcher snapshot is owned by
`.github/skills/react-auth/examples/live-auth-surfaces.md`; verify it against
live `src/proxy.ts`. Other routes retain server-owned access decisions:
`src/app/auth/page.tsx` redirects an already authenticated user, while invoice
pages distinguish guest/public/shared/owner access and Server Actions enforce
their own applicable RPC policy.

Do not move those checks into Client Components or remove them merely because a
route is not middleware-matched. Changing the matcher, redirect behavior,
guest/public visibility, ownership policy, or Server Action authorization is a
security behavior change and requires explicit approval.

## Transport error mapping

`sites/arolariu.ro/src/lib/utils.server.ts` defines the
`ServerActionResult<T>` shape used by recoverable transport actions, plus the
helpers that produce it:

```ts
export function mapHttpStatusToErrorCode(status: number): ServerActionErrorCode {
  if (status === 401 || status === 403) return "AUTH_ERROR";
  if (status === 404) return "NOT_FOUND";
  if (status === 400 || status === 422) return "VALIDATION_ERROR";
  if (status >= 500) return "SERVER_ERROR";
  return "UNKNOWN_ERROR";
}

export async function createErrorResult<T>(error: unknown, defaultMessage?: string): ServerActionResult<T> {
  if (error instanceof Error && error.name === "TransportValidationError") {
    return {success: false, error: {code: "SERVER_ERROR", message: defaultMessage ?? error.message}} as const;
  }
  if (error instanceof Error) {
    const isTimeout = error.message.includes("timed out");
    return {success: false, error: {code: isTimeout ? "TIMEOUT_ERROR" : "NETWORK_ERROR", message: error.message}} as const;
  }
  // ...unknown branch
}
```

`parseBackendError(status, body)` in the same file gives specific
human-readable messages for `402` (payment required), `409` (conflict),
`413` (payload too large, with a `maxSize` extraction attempt), and `429`
(rate limiting) before falling back to a parsed `detail` field or a sanitized
raw body. `fetchWithTimeout` wraps every request with an `AbortController`
(default `DEFAULT_FETCH_TIMEOUT = 30_000` ms), injects trace-context headers,
and forces `cache: "no-store"` for authenticated requests — reuse it instead
of a bare `fetch` in a new server action.

Anti-pattern: catching an error in a transport action whose consumers narrow
`result.success` and returning a hand-rolled
`{success: false, message: string}` instead of its established
`ServerActionResult<T>` contract.

## Zustand / Context / URL / local hierarchy

Inspect the live store inventory in `sites/arolariu.ro/src/stores/` and compare
it with RFC 1005 §2.3 before changing state:

| Store | Entity | Notes |
| --- | --- | --- |
| `useInvoicesStore` | Invoice | Factory-backed `entities[]` persisted; `selectedEntities[]` + `hasHydrated` in-memory |
| `useMerchantsStore` | Merchant | Factory-backed `entities[]` persisted; `selectedEntities[]` + `hasHydrated` in-memory |
| `useScansStore` | Scan | `scans[]` persisted, `selectedScans[]` + `hasHydrated` in-memory |
| `usePreferencesStore` | Preferences | locale/theme/font/gradient preset fields, cookie-synced |

Every persisted store exposes a `hasHydrated` flag; a component reading
persisted state should gate its render on it (`if (!hasHydrated) return <Loading />;`)
rather than trusting an empty array as "no data yet" — an empty array is
ambiguous between "not hydrated" and "hydrated, genuinely empty".
`sites/arolariu.ro/src/stores/createEntityStore.ts` backs invoices and
merchants. Scans remains a specialized hand-rolled store because its cached
records and domain actions exceed the generic shape; preferences has a
separate non-entity contract. Inspect the target store rather than assuming a
single field naming convention.

`DialogContext.tsx` (`sites/arolariu.ro/src/app/domains/invoices/_contexts/`)
is the established Context pattern for state shared by a route subtree but
not needed globally. It dispatches through a discriminated
`DialogType`/`DialogPayloads` registry. The current split-context, stable
actions, rerender, and latest-payload behavior is owned by
`react-client.md`; read the live registry for its current dialog/domain
inventory.

Escalation boundary: promoting route-scoped Context state to a new Zustand
store, or extending an existing store's persisted shape, requires proving
the state is read across unrelated, unmounted route branches — see the
Frontend Expert agent's state-placement matrix before creating one.

## i18n, metadata, loading/error, and observability

Client components read messages through the typed selector API rather than
the string-namespace API:

```tsx
"use client";
import {useTranslations} from "next-intl-selector";

export default function HeroSection(): React.JSX.Element {
  const t = useTranslations();
  return <h1>{t((m) => m.pages.home.title)}</h1>;
}
```

Server Components/`generateMetadata` use the equivalent server import
(`next-intl-selector/server`) alongside `getLocale` from `next-intl/server`:

```tsx
const t = await getTranslations();
const locale = await getLocale();
return createMetadata({
  locale,
  title: t((m) => m.pages.invoices.landing.metadata.title),
  description: t((m) => m.pages.invoices.landing.metadata.description),
});
```

`sites/arolariu.ro/messages/en.d.json.ts` is auto-generated from `en.json`
and is what makes `m.pages.invoices.landing.metadata.title` a compile-time
key, not a runtime string lookup. After adding a key, add the identical key
path to `ro.json` and `fr.json`, then run the canonical i18n generation command
from root `AGENTS.md`. Live route metadata currently uses nested `metadata` objects. Older
repository guidance also names `__metadata__`; treat that as unresolved
message-schema drift, not two interchangeable aliases. Preserve a target
route's established sibling shape and stop before a cross-namespace
migration.

`sites/arolariu.ro/src/metadata.ts`'s `createMetadata()` merges page-specific
overrides into the base `Metadata` object and derives the OpenGraph
`alternateLocale` from the passed `locale` (`en` → `en_US`, `ro` → `ro_RO`;
unmapped locales default to `en_US` — `fr` is not yet in `LOCALE_ALTERNATES`,
so a French page falls back to the English OpenGraph locale unless that map
is updated alongside a new locale).

Observability (RFC 1001) helpers live in
`sites/arolariu.ro/src/instrumentation.server.ts`: `withSpan`,
`addSpanEvent`, `setSpanAttributes`, `recordSpanError`, `logWithTrace`,
`createCounter`/`createHistogram`/`createUpDownCounter`. Server actions wrap
their body in `withSpan("api.actions.<domain>.<action>", ...)` throughout the
invoice-domain transport actions (see `fetchInvoices.ts`);
cross-cutting server actions are not uniformly wrapped. For a newly
instrumented boundary, follow RFC 1001 rather than assuming existing coverage
or adding a parallel logging mechanism.

App Router special-file placement, promised route inputs, streaming, and Route
Handler behavior are owned by `nextjs.md`.

## CSS Modules and shared component rules

Route and component styles use colocated CSS/SCSS Modules
(`island.module.scss`, `Hero.module.scss`) imported as `styles` and applied
through bracket access (`styles["page"]`) because
`noPropertyAccessFromIndexSignature` is enabled — `styles.page` does not
compile. Shared, domain-agnostic primitives are imported from
`@arolariu/components` (for example `Separator` in `Hero.tsx`); do not
recreate a primitive that already exists there, and do not add inline style
objects.

## Website-specific test examples

- `sites/arolariu.ro/src/lib/utils.server.test.ts` — transport error mapping
  coverage
- `sites/arolariu.ro/tests/helpers/builders/` — shared test data builders;
  reuse them instead of inlining fixture objects in a new test

## Hydration, message, metadata, and transport edge cases

- **Hydration race**: reading `useInvoicesStore((state) => state.entities)`
  before `hasHydrated` is `true` can render a false "no invoices" empty state
  for a user who has persisted data; always branch on `hasHydrated` first.
- **Missing locale alternate**: adding a locale to `next-intl` without adding
  it to `metadata.ts`'s `LOCALE_ALTERNATES` map silently falls back to
  `en_US` for OpenGraph — update both together.
- **`TransportValidationError` surfaced as `SERVER_ERROR`**: a caught
  `TransportValidationError` (thrown by `types/invoices/transport.ts`
  parsers) is intentionally mapped to the generic `"SERVER_ERROR"` code
  rather than `"VALIDATION_ERROR"`, because it represents a backend/client
  contract drift, not a user input mistake — do not remap it to
  `"VALIDATION_ERROR"` when adding a new parser's call site.
