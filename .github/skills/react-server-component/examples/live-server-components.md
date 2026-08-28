# Live Server Component Examples

These are inspection targets, not copy sources. Re-open every path because page
data, messages, and access rules are dynamic.

## Directive-free component currently in a client graph

### Live source

- `sites/arolariu.ro/src/app/domains/invoices/_components/homepage/FeatureItem.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_components/homepage/FeaturesSection.tsx`

### Why representative

`FeatureItem` has no client directive or hooks, but `FeaturesSection` imports it
from a client module. It is therefore client-bundled today. Its `IconType`
function prop is local to that client graph; it is not serialized across an
RSC boundary.

### Inspect

Trace every consumer before declaring a component server-owned. A
directive-free module can remain server-compatible while being client-bundled
by an importing client entry. Do not pass function props like `IconType`
across an actual RSC serialization boundary.

## Server shell with a small island

### Live source

- `sites/arolariu.ro/src/app/page.tsx`
- `sites/arolariu.ro/src/app/island.tsx`
- `sites/arolariu.ro/src/app/page.spec.tsx`

### Why representative

The root page keeps the App Router entry server-owned and delegates animation
and client rendering to one island. Its route spec checks landmarks, navigation,
headings, accessibility, and responsive viewports.

### Inspect

Confirm why the island is client-only, where the single `main` landmark is
owned by the root layout, and whether the requested route needs the same split.
Do not copy its animation or page-wide client boundary into a static route.

## Localized content and metadata

### Live source

- `sites/arolariu.ro/src/app/(privacy-and-terms)/privacy-policy/page.tsx`
- `sites/arolariu.ro/src/app/(privacy-and-terms)/privacy-policy/island.tsx`
- `sites/arolariu.ro/src/app/about/page.tsx`
- `sites/arolariu.ro/src/app/about/page.spec.tsx`
- `sites/arolariu.ro/src/metadata.ts`
- `sites/arolariu.ro/messages/en.json`
- `sites/arolariu.ro/messages/ro.json`
- `sites/arolariu.ro/messages/fr.json`

### Why representative

These pages combine server translations, current typed selector callbacks,
`getLocale`, `createMetadata`, route CSS Modules, and an optional interactive
island.

### Inspect

Derive the exact typed `metadata` selector branch from the neighboring route
and verify all locales. `about/page.spec.tsx` is the current colocated route
test; the privacy-policy route has no colocated spec, so do not claim that
example proves route behavior beyond its live source.

## Server data with streaming client interaction

### Live source

- `sites/arolariu.ro/src/app/domains/invoices/view-invoices/page.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-invoices/island.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoices.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoices.test.tsx`

### Why representative

The page owns server user data and localized header content, uses a local
Suspense fallback, and delegates tabs, dialogs, cached entities, loading, and
interaction to the island.

### Inspect

Check which data is actually fetched on the server versus hydrated/fetched by
the hook, how the fallback matches the island, and whether all success/error/
empty states are complete. Do not repeat this dual data strategy without a
specific stale-while-revalidate requirement.

## Dynamic route, transport validation, access, and not-found

### Live source

- `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/page.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/island.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/not-found.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/not-found.test.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/fetchInvoice.ts`
- `sites/arolariu.ro/src/types/invoices/transport.ts`

### Why representative

This chain awaits typed route params, validates unknown API data, maps absence
to `notFound()`, preserves forbidden/public/owner rules, and passes normalized
domain data to a client island.

### Inspect

Trace every failure branch and the exact serialization contract. The access
rules are route-specific security behavior; inspect them for ownership only and
never copy or change them as a generic pattern.

## Auth redirect and middleware boundary

### Live source

- `sites/arolariu.ro/src/proxy.ts`
- `sites/arolariu.ro/src/app/auth/page.tsx`
- `sites/arolariu.ro/src/app/auth/island.tsx`
- `sites/arolariu.ro/src/app/auth/error.tsx`
- `sites/arolariu.ro/src/app/auth/page.spec.tsx`

### Why representative

Together they show the difference between the live Clerk matcher, a server-side
redirect for an already authenticated visitor, and an interactive auth screen.
The current route spec covers structure/accessibility but does not directly
assert the authenticated redirect branch; treat that as a coverage gap rather
than evidence the redirect is tested.

### Inspect

Verify whether the requested route is actually matched by middleware and which
guest behavior already exists. Choose another sibling and stop for approval if
the task changes route visibility or authentication.

## Segment loading and recovery

### Live source

- `sites/arolariu.ro/src/app/loading.tsx`
- `sites/arolariu.ro/src/app/error.tsx`
- `sites/arolariu.ro/src/app/error.test.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/view-invoices/loading.tsx`

### Why representative

The files demonstrate server-rendered skeletons without duplicate landmarks
and a client error boundary with a retry callback, safe digest display, and
localized accessible status.

### Inspect

Compare the fallback geometry to the final route, confirm recovery and focus/
announcement semantics, and use a route-local boundary only when its behavior
differs from the ancestor.
