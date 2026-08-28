# Next.js Reference Catalog

Owner: `.github/instructions/frontend.instructions.md`. This catalog holds
repository-specific Next.js App Router examples, edge cases, and framework
rationale for `sites/arolariu.ro`. It does not own generic React execution,
localized message schema, authorization policy, Server Action procedure,
state placement, or `next.config.ts` mutation approval.

## App Router artifact contracts

| Artifact | Framework responsibility | Keep elsewhere |
| --- | --- | --- |
| `layout.tsx` | Segment shell, inherited providers, metadata defaults, and child composition | Route-specific interaction and mutable browser state |
| `page.tsx` | Route entry, promised route inputs, server-owned reads, access decisions, and server output | Browser event/state logic |
| `template.tsx` | A remounting segment wrapper when that lifecycle is intentionally required | A substitute for ordinary layout composition |
| `loading.tsx` | Segment fallback while uncached/streamed work suspends | A generic empty state after data has settled |
| `error.tsx` | Recoverable segment error UI; Next.js requires this artifact to be a Client Component | General client-component ownership for the route |
| `not-found.tsx` | Segment-specific missing-resource UI reached through `notFound()` | Authorization or generic server failure |
| `route.ts` | HTTP Route Handler request/response, caching, and protocol behavior | React component rendering |

Framework-required client route artifacts such as `error.tsx` remain owned by
the `react-server-component` workflow because they are part of the route
contract. Use `react-client.md` only for their internal effect/event semantics.

## Promised route inputs and control flow

Use the generated `PageProps<"...">` or `LayoutProps<"...">` contract when the
route follows a known App Router path. Read `params` and `searchParams` in the
form required by the live Next.js types; do not copy a synchronous shape from
older framework examples.

Keep these outcomes distinct:

- `redirect()` is route control flow and does not return a render value;
- `notFound()` selects the nearest `not-found.tsx`;
- an authenticated or authorized request with no records usually renders the
  route's explicit empty state;
- an unexpected dependency/transport failure belongs to the nearest
  `error.tsx` or established server result mapping, not a fake empty state.

Place `loading.tsx`, `error.tsx`, and `not-found.tsx` at the segment that owns
the pending/failure/missing condition. A root boundary is not automatically
the right owner for a nested domain.

## Streaming and Suspense

Keep the route shell server-rendered and suspend the smallest subtree whose
data can resolve independently. A client island should not grow merely to
display a loading indicator. When a loading state depends on client mutation
or persisted hydration rather than server suspension, it belongs to the
client component/store contract instead of `loading.tsx`.

Use browser/E2E evidence when the behavior under review is actual navigation,
streaming order, middleware/proxy behavior, or focus restoration across route
transitions. A component unit test cannot prove those framework transitions.

## Route Handlers

Route Handlers own protocol concerns:

- parse `NextRequest` inputs and validate untrusted values;
- return explicit `Response`/`NextResponse` status, headers, and safe body;
- state cache/dynamic behavior from current source rather than assuming every
  `GET` is cached or every authenticated request is dynamic;
- keep secrets and server-only dependencies out of client imports;
- preserve tracing, health semantics, and upstream timeout classification.

`sites/arolariu.ro/src/app/api/health/route.ts` is a live health Route Handler,
not a generic business-response template. Read its upstream checks and status
semantics before changing or copying it.

## Metadata lifecycle

Next.js owns when static `metadata` or `generateMetadata` executes and how
route metadata composes through layouts. The website catalog owns
`createMetadata`, locale alternates, and current message-namespace drift;
`react-internationalization` owns message keys and typed selectors.

Keep metadata generation server-side. Derive promised route inputs and
server-owned data through the same access/validation boundary as the page, and
avoid duplicate network work when the framework or a shared server helper can
reuse it safely.

## Proxy and configuration boundaries

`sites/arolariu.ro/src/proxy.ts` is the Next.js middleware/proxy wiring owner.
This catalog may explain matcher and framework flow, but access policy changes
belong to `react-auth` and require the repository's security checkpoint.

`sites/arolariu.ro/next.config.ts` is a protected configuration boundary.
Compiler behavior belongs to `react-compiler`; dependency/version work belongs
to `infra-dependency-update`. Do not copy a current config snapshot into this
catalog or treat a build workaround as permission to change it.

## Live inspection pointers

- `sites/arolariu.ro/src/app/layout.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/page.tsx`
- `sites/arolariu.ro/src/app/domains/invoices/island.tsx`
- current dynamic invoice route pages under `src/app/domains/invoices/`
- `sites/arolariu.ro/src/app/error.tsx`
- `sites/arolariu.ro/src/app/about/error.tsx`
- current nested `not-found.tsx` files
- `sites/arolariu.ro/src/app/api/health/route.ts`
- `sites/arolariu.ro/src/proxy.ts`
- `sites/arolariu.ro/src/metadata.ts`
- `sites/arolariu.ro/next.config.ts`

Reopen every path before use. Current route placement, caching, metadata, and
proxy behavior are live-source facts, not stable templates.
