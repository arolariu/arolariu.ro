---
name: Website Architecture
description: Next.js App Router, server/client boundary, i18n, metadata, state, and website observability rules.
applyTo: "sites/arolariu.ro/**/*.ts,sites/arolariu.ro/**/*.tsx,sites/arolariu.ro/**/*.js,sites/arolariu.ro/**/*.jsx,sites/arolariu.ro/**/*.css,sites/arolariu.ro/**/*.scss,sites/arolariu.ro/messages/*.json"
---

# Website Architecture

## Scope

Owns rules unique to `sites/arolariu.ro`. Generic TypeScript and React behavior
belongs to their dedicated instructions.

## Required Inputs

- `sites/arolariu.ro/AGENTS.md`
- The neighboring route/component and colocated tests
- Relevant RFC 1001-1008 documents for architecture-sensitive work
- All three locale files when user-facing copy changes

## Rules

- Keep `page.tsx` as a Server Component unless the route itself requires a
  client boundary.
- Put browser state and handlers in the smallest `island.tsx` or client
  component.
- Fetch server-owned data through private `server-only` helpers called by
  Server Components. Reserve `"use server"` actions for operations a client
  must invoke, and treat each as a public RPC authorization boundary.
- Use the existing transport validation/error mapping at API boundaries.
- Use Zustand only for genuinely global client state, Context for scoped state,
  and local state otherwise.
- Use `useShallow` for object-shaped Zustand selectors.
- Enforce authentication through Clerk middleware rather than component
  checks.
- Route all user-visible text through `next-intl`.
- Keep `en`, `ro`, and `fr` message keys structurally aligned.
- Build metadata through the shared metadata helpers and localized typed
  selectors. Preserve the neighboring route's `metadata` or `__metadata__`
  shape; do not migrate between them incidentally.
- Handle loading, error, and empty states.
- Use CSS Modules; do not add inline style objects.
- Import shared primitives from `@arolariu/components`.
- Preserve the frontend OpenTelemetry boundaries defined by RFC 1001.
- Colocate `*.test.ts`/`*.test.tsx` with the source and mock only external
  boundaries.

## Reference Catalog

Open `references/frontend.md` only when the task needs one of:

- deciding Server Component/island/server-action data ownership for a route;
- choosing among Zustand, Context, URL, or local state for website state;
- changing i18n message/metadata generation or frontend observability spans;
- mapping a new transport/server-action failure to a `ServerActionResult`.

The catalog does not redefine these rules or the verification/escalation
sections below; it only adds repository-specific examples and anti-patterns.

## Validation

Use the website local guide's routine verification. Escalate to full website
tests or global lint only for a final pass or explicit request.

## Escalation

Ask before a new dependency, Zustand store, authentication behavior,
`next.config.ts`, route-contract change, or incidental shared-library change.
