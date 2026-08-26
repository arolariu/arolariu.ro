# Server/Client and Data Ownership Decisions

Use this resource before selecting a page boundary. Live source has authority;
the table narrows the inspection needed rather than replacing it.

## Rendering boundary

| Signal | Default owner | Evidence to inspect | Avoid |
| --- | --- | --- | --- |
| Route shell, layout, metadata, server config, cookies, or initial request data | Server `page.tsx` / `layout.tsx` | `sites/arolariu.ro/src/app/layout.tsx`, `sites/arolariu.ro/src/app/about/page.tsx` | Adding `"use client"` to make one descendant interactive |
| Hooks, browser APIs, event handlers, client contexts, animation state | Smallest `island.tsx` or route-local client component | `sites/arolariu.ro/src/app/about/island.tsx`, `sites/arolariu.ro/src/app/domains/invoices/view-invoices/island.tsx` | Moving server fetching, secrets, or raw provider payloads into the island |
| Pure presentational child with serializable props | Keep server-compatible unless its consumer boundary requires otherwise | `packages/components/src/components/ui/empty.tsx` | A client directive with no client-only reason |
| Shared application providers | One explicit client boundary beneath the root layout | `sites/arolariu.ro/src/app/providers.tsx` | Recreating providers in each route |

The island threshold is a concrete client requirement, not page complexity.
Split below the page whenever only one subtree needs interaction.

## Data and mutation ownership

| Need | Choose | Live pointer / check |
| --- | --- | --- |
| Request-time data, cookies, locale, feature flags, or initial authenticated snapshot | Server Component or existing server action called by it | `sites/arolariu.ro/src/app/layout.tsx`; `sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/page.tsx` |
| Mutation or authenticated API call initiated by the client | Existing `"use server"` action returning the repository result union | `sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/fetchInvoice.ts`; `sites/arolariu.ro/src/lib/utils.server.ts` |
| Browser-only stream, worker, clipboard, observer, or device API | Client component/hook with cleanup and an explicit failure state | `sites/arolariu.ro/src/app/playground/workers/island.tsx`; `sites/arolariu.ro/src/hooks/useScrollToTop.tsx` |
| Bookmarkable/shareable filters, sort, view mode, or pagination contract | URL search params | `sites/arolariu.ro/src/app/domains/invoices/view-invoices/_hooks/useInvoiceFilters.tsx` |
| Ephemeral interaction owned by one component | Local state | `sites/arolariu.ro/src/app/domains/invoices/_components/classification/ClassificationPicker.tsx` |
| State shared by one mounted subtree | Context | `sites/arolariu.ro/src/app/domains/invoices/create-invoice/_context/CreateInvoiceContext.tsx` |
| Existing cross-route client cache/preferences | Existing Zustand store, after inspecting its hydration contract | `sites/arolariu.ro/src/stores/`; use the `zustand-store` skill |

Do not replace an existing server action with a client `fetch` merely to avoid
passing props. Client fetch is appropriate only when the browser must own the
lifecycle and the live code already exposes a safe browser transport boundary.

## Trust and serialization boundary

- Treat `response.json()` as `unknown`. Route it through the established parser
  before rendering or passing it to an island. The invoice boundary is
  `sites/arolariu.ro/src/types/invoices/transport.ts`.
- Pass only the smallest React-serializable contract across the RSC boundary.
  Never pass functions, class instances with behavior, request/response objects,
  secrets, or caught `Error` objects.
- Preserve intentional data normalization such as parsed dates; confirm that
  the same type crosses a current page/island boundary before copying it.
- Server action failures remain typed results. Map them to not-found, forbidden,
  retryable error, or inline state at the owning route boundary.

## Suspense and segment boundaries

| Condition | Boundary |
| --- | --- |
| The whole segment waits on asynchronous work and needs a navigation fallback | Segment `loading.tsx` |
| One slower subtree can stream independently | Local `<Suspense>` with a shape-matched fallback |
| A render/data failure should offer segment recovery | Client `error.tsx` receiving `error` and `reset` |
| A known absent dynamic resource | `notFound()` plus route `not-found.tsx` |
| Successful empty collection | Normal page/island empty state, not an error boundary |

Inspect `sites/arolariu.ro/src/app/loading.tsx`,
`sites/arolariu.ro/src/app/error.tsx`,
`sites/arolariu.ro/src/app/domains/invoices/view-invoices/page.tsx`, and
`sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/not-found.tsx`.
Do not add every boundary mechanically.

## Authentication ownership

`sites/arolariu.ro/src/proxy.ts` is the live middleware boundary and currently
defines its own protected-route matcher. Other established routes also model
guest/public behavior in server code, for example
`sites/arolariu.ro/src/app/domains/invoices/view-invoice/[id]/page.tsx`, while
`sites/arolariu.ro/src/app/auth/page.tsx` performs a server redirect for an
already authenticated user.

Therefore:

- inspect `sites/arolariu.ro/src/proxy.ts` before making any auth assumption;
- preserve existing guest/public behavior when the task does not change it;
- do not add ad hoc client-side authorization;
- stop and ask before changing the matcher, access rules, redirect behavior, or
  data visibility.

## Observability boundary

Route rendering does not automatically justify a custom span. Reuse current
instrumented action/transport boundaries such as
`sites/arolariu.ro/src/app/domains/invoices/_actions/invoices/fetchInvoice.ts`.
If new telemetry is requested, inspect RFC 1001 and live instrumentation
helpers, keep sensitive values out of attributes, and do not duplicate a span
already owned below.
