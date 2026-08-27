# Website Reference Catalog

Owner: `.github/instructions/frontend.instructions.md`. This catalog holds
extensive `sites/arolariu.ro`-specific examples, anti-patterns, edge cases,
and RFC-grounded rationale. It does not define a workflow — use `nextjs-page`
for the route procedure and `zustand-store` for an approved global-state
change — and it does not restate TypeScript/React language rules (see the
sibling catalogs) or root safety policy.

## RSC/island/server-action data ownership

`sites/arolariu.ro/src/app/domains/invoices/page.tsx` is the canonical
`page.tsx -> island.tsx` split: the Server Component fetches server-owned
data and passes only the smallest serializable contract into the client
island.

```tsx
// page.tsx — Server Component
export async function generateMetadata(): Promise<Metadata> { /* ... */ }

export default async function InvoicesHomepage(
  _props: Readonly<PageProps<"/domains/invoices">>,
): Promise<React.JSX.Element> {
  const {isAuthenticated} = await fetchAaaSUserFromAuthService();
  return <RenderInvoiceDomainScreen isAuthenticated={isAuthenticated} />;
}
```

```tsx
// island.tsx — "use client"; receives only `isAuthenticated`, not the auth service call
export default function RenderInvoiceDomainScreen({isAuthenticated}: Readonly<Props>): React.JSX.Element {
  /* composes section components */
}
```

Server actions live at `sites/arolariu.ro/src/lib/actions/**` (cross-cutting,
for example `user/fetchUser.ts`, `cookies/cookies.action.ts`) and
route/domain-scoped actions live under
`sites/arolariu.ro/src/app/domains/<domain>/_actions/**` (for example
`invoices/_actions/invoices/fetchInvoice.ts`). Both use the
`"use server"` directive and return `ServerActionResult<T>` — see the
transport-error section below.

## Clerk boundary

Authentication is enforced entirely by
`sites/arolariu.ro/src/proxy.ts` (the Clerk middleware entrypoint), not by a
component-level check:

```ts
const isProtectedRoute = createRouteMatcher(["/admin(.*)"]);

export default authMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});
```

Only `/admin(.*)` is currently protected by the matcher; every other route is
guest-accessible by default. Do not add a redirect-on-missing-session check
inside a page or component — extend `isProtectedRoute`'s matcher (a security
behavior change; stop and ask) instead of duplicating the check downstream.

## Transport error mapping

`sites/arolariu.ro/src/lib/utils.server.ts` defines the one
`ServerActionResult<T>` shape every server action should return, plus the
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

Anti-pattern: catching an error in a new server action and returning a
hand-rolled `{success: false, message: string}` shape instead of
`ServerActionResult<T>` breaks every client-side consumer that narrows on
`result.success`.

## Zustand / Context / URL / local hierarchy

Inspect the live store inventory in `sites/arolariu.ro/src/stores/` and compare
it with RFC 1005 §2.3 before changing state:

| Store | Entity | Notes |
| --- | --- | --- |
| `useInvoicesStore` | Invoice | `invoices[]` persisted, `selectedInvoices[]` + `hasHydrated` in-memory |
| `useMerchantsStore` | Merchant | `merchants[]` persisted, `hasHydrated` in-memory |
| `useScansStore` | Scan | `scans[]` persisted, `selectedScans[]` + `hasHydrated` in-memory |
| `usePreferencesStore` | Preferences | locale/theme/font/gradient preset fields, cookie-synced |

Every persisted store exposes a `hasHydrated` flag; a component reading
persisted state should gate its render on it (`if (!hasHydrated) return <Loading />;`)
rather than trusting an empty array as "no data yet" — an empty array is
ambiguous between "not hydrated" and "hydrated, genuinely empty".
`sites/arolariu.ro/src/stores/createEntityStore.ts` is a generic factory
available for an entity-store shape, but some existing stores remain
hand-rolled (RFC 1007 §2.6). Inspect the target store instead of relying on a
copied adoption count.

`DialogContext.tsx` (`sites/arolariu.ro/src/app/domains/invoices/_contexts/`)
is the established Context pattern for state shared by a route subtree but
not needed globally. It dispatches through a discriminated
`DialogType`/`DialogPayloads` registry, with state and actions split into two
contexts so action-only consumers do not re-render on every open/close. Read
the registry for its current dialog/domain inventory.

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
from root `AGENTS.md`. Route metadata uses the same typed selector API and the route's
`metadata` object; do not introduce flat `Namespace.__metadata__` lookups.

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
their body in `withSpan("api.actions.<domain>.<action>", ...)` (see
`fetchInvoices.ts`, `utils.server.ts`'s `createJwtToken`/`verifyJwtToken`);
preserve this boundary rather than adding a parallel logging mechanism.

Route boundaries follow the App Router convention:
`sites/arolariu.ro/src/app/error.tsx`, `.../about/error.tsx`,
`.../domains/invoices/edit-invoice/[id]/not-found.tsx`. Add `loading.tsx`,
`error.tsx`, and `not-found.tsx` at the segment that owns the corresponding
failure/pending state, not only at the root.

## CSS Modules and shared component rules

Route and component styles use colocated CSS/SCSS Modules
(`island.module.scss`, `Hero.module.scss`) imported as `styles` and applied
through bracket access (`styles["page"]`) because
`noPropertyAccessFromIndexSignature` is enabled — `styles.page` does not
compile. Shared, domain-agnostic primitives are imported from
`@arolariu/components` (for example `Separator` in `Hero.tsx`); do not
recreate a primitive that already exists there, and do not add inline style
objects.

## Route and test examples

- `sites/arolariu.ro/src/app/domains/invoices/page.tsx` +
  `island.tsx` — RSC/island split with typed `generateMetadata`
- `sites/arolariu.ro/src/app/_components/Hero.tsx` — client component using
  the typed `next-intl-selector` API
- `sites/arolariu.ro/src/lib/utils.server.test.ts` — transport error mapping
  coverage
- `sites/arolariu.ro/tests/helpers/builders/` — shared test data builders;
  reuse them instead of inlining fixture objects in a new test

## Hydration, message, metadata, and transport edge cases

- **Hydration race**: reading `useInvoicesStore().invoices` before
  `hasHydrated` is `true` can render a false "no invoices" empty state for a
  user who has persisted data; always branch on `hasHydrated` first.
- **Dev-only Strict Mode aborts**: see the React catalog's effect-cleanup
  section — the same `AbortError`-during-double-invoke pattern applies to any
  new data-fetching hook or island effect in this app.
- **Missing locale alternate**: adding a locale to `next-intl` without adding
  it to `metadata.ts`'s `LOCALE_ALTERNATES` map silently falls back to
  `en_US` for OpenGraph — update both together.
- **`TransportValidationError` surfaced as `SERVER_ERROR`**: a caught
  `TransportValidationError` (thrown by `types/invoices/transport.ts`
  parsers) is intentionally mapped to the generic `"SERVER_ERROR"` code
  rather than `"VALIDATION_ERROR"`, because it represents a backend/client
  contract drift, not a user input mistake — do not remap it to
  `"VALIDATION_ERROR"` when adding a new parser's call site.
