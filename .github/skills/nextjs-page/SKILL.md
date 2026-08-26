---
name: nextjs-page
description: Create or internationalize an arolariu.ro App Router page using the RSC-first island pattern. Use for new routes or page-level work requiring metadata, next-intl messages, loading/error states, accessibility, and colocated Vitest coverage.
---

# Next.js Page

## When to Use

- Create or materially change an App Router page or layout.
- Add page-owned data loading, route parameters, URL state, metadata, or
  loading/error/not-found behavior.
- Internationalize user-visible route content.
- Split page interaction into a client island.

## When Not to Use

- Use `react-component` for an isolated component that does not change its
  route contract.
- Use `zustand-store` only after page, URL, local, and Context ownership have
  been ruled out.
- Do not use this skill for route handlers, backend endpoints, or an
  incidental shared-component-library change.

## Required Inputs

- Requested route and public behavior, including guest/authenticated behavior.
- Data owner and trust boundary: Server Component, server action, URL, or
  client-only source.
- Interaction, loading, error, empty, not-found, and recovery expectations.
- Root and website guides; matching TypeScript, React, and frontend
  instructions; relevant RFC 1001-1008 sections.
- A current sibling route of the same category, its tests, and the affected
  keys in every locale file.

## Decision Points

Before editing, decide:

1. Whether the page can remain entirely server-rendered or needs the smallest
   client island.
2. Whether data belongs in a Server Component, an existing server action, URL
   state, local state, Context, or an already-approved Zustand store.
3. Which segment boundaries are required: `loading.tsx`, local `Suspense`,
   `error.tsx`, `not-found.tsx`, or none.
4. Whether current authentication is owned by
   `sites/arolariu.ro/src/proxy.ts` or by established guest/public route
   behavior. Do not invent a component auth check.
5. Which live metadata/message selector convention the neighboring route uses.
   If it conflicts with the guide's `__metadata__` convention and resolving it
   changes message shape, stop and ask.
6. Which semantics and tests prove the behavior without testing component
   implementation details.

## Core Procedure

1. Inspect the target segment, its parent layout, a same-category sibling,
   colocated tests/stories, metadata helper, affected messages, and any action
   or transport parser.
2. Write a failing behavior test at the narrowest useful boundary. Use route
   E2E coverage only when Server Component streaming, middleware, or navigation
   behavior cannot be proven in Vitest.
3. Keep `page.tsx` and layouts as Server Components. Fetch server-owned data
   there or through an existing server action, and validate untrusted transport
   data before it reaches JSX.
4. Add `island.tsx` only around hooks, browser APIs, client state, or handlers.
   Pass the smallest serializable initial contract into it.
5. Reuse route-local siblings and `@arolariu/components`; create `_components/`
   only for route-owned pieces. Do not move code into the shared library
   incidentally.
6. Add the route boundaries selected above. Preserve semantic landmarks,
   focus/recovery behavior, empty results, responsive layout, theme behavior,
   and reduced-motion expectations.
7. Route all user-visible copy through the current typed translation API.
   Update `en`, `ro`, and `fr` with identical key shape and regenerate the
   derived message types through the repository-owned mechanism when required.
8. Generate localized metadata through `createMetadata`, `getLocale`, and the
   live typed message selector. Preserve base metadata fallbacks.
9. Implement only enough code to pass the behavior test, then inspect the
   server/client import graph for accidental client expansion.
10. Run the targeted test and the routine website verification appropriate to
    the changed artifacts.

## Resource Triggers

Load only the resource named by the current decision or failure:

| Named trigger | Resource |
| --- | --- |
| Before choosing Server Component, island, action, URL, or store ownership | [Server/client decision table](references/server-client-decision-table.md) |
| New route or a change spanning two or more route artifact categories | [Route artifact matrix](checklists/route-artifact-matrix.md) |
| Locale, guest/auth, transport, hydration, search-param, accessibility, responsive, or metadata edge case | [Page edge cases](references/page-edge-cases.md) |
| Need a current route of the same behavioral category | [Live routes](examples/live-routes.md) |
| A live sibling confirms a matching localized metadata, page/island, boundary, or test shape | [Stable route patterns](templates/stable-route-patterns.md) |
| Before selecting page behavior test categories | [Page test matrix](checklists/page-test-matrix.md) |
| Only after a concrete generation, message, hydration, import, metadata, test-environment, or build failure | [Page troubleshooting](references/troubleshooting.md) |

Do not open troubleshooting during a successful routine page task.

## Verification

- The page/layout remains server-owned except for the smallest justified client
  boundary, and no server-only module enters that boundary.
- Every referenced message key exists with the same structure in all locale
  files; generated message types are current when applicable.
- Metadata uses the shared helper and current locale.
- Loading, error, empty/not-found, guest/auth, keyboard/focus, responsive, and
  theme states required by the behavior are covered.
- Targeted Vitest/Testing Library tests pass; use the website guide's routine
  verification when route compilation or generated types are affected.

## Stop and Ask

- New dependency or Zustand store
- Authentication, authorization, security, or public-route behavior
- `sites/arolariu.ro/next.config.ts` or a route contract with external consumers
- Material route/API/UX ambiguity with multiple valid outcomes
- Message-schema migration needed to reconcile live source and guidance
- Incidental shared-component-library change

## Completion Contract

Report the route behavior, server/client and data ownership, exact message and
metadata artifacts changed, tests/verification run, and only material residual
risk or incomplete validation.
