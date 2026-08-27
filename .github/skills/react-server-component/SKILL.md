---
name: react-server-component
description: Create or modify an arolariu.ro App Router Server Component or a server-compatible shared React component, including pages, metadata, server data, serialization, client handoff, tests, and package exports when applicable.
---

# React Server Component

## When to Use

- Create or materially change an App Router `page.tsx`, `layout.tsx`, or
  server-rendered route component.
- Create or change a non-interactive React component that should execute only
  on the server.
- Create or change a server-compatible `packages/components` component that
  uses no client-only feature and must preserve package API/story/test/export
  contracts.
- Add route parameters, server-owned data, metadata, loading/error/not-found
  boundaries, or a server-to-client island contract.
- Own framework route artifacts such as `error.tsx` even when Next.js requires
  that artifact itself to carry `"use client"`.
- Move work out of an unnecessarily broad Client Component after proving the
  import graph permits a server boundary.

## When Not to Use

- Use `react-client-component` for extracted non-route UI with hooks, handlers,
  browser APIs, client Context, animation state, or other interaction.
  Framework route artifacts remain owned here even when they require a client
  directive.
- Use `react-client-hook` for a custom Hook.
- Use `react-server-action` for any `"use server"` export.
- Use `react-client-store` for approved global client state.
- Use `react-internationalization` when locale dictionaries, selector schema,
  or generated message declarations change.
- Use `react-auth` for an access-control behavior change.

## Required Inputs

- Owning route/component, current consumers, and observable behavior.
- Import-graph proof: exclusive server execution for server-only code, or
  server compatibility without client-only imports for a shared package
  component.
- Server data owner, private `server-only` helper, cache/freshness contract,
  and untrusted-data validation boundary.
- Serializable props passed to any client child.
- Route parameters, metadata, loading/error/empty/not-found, guest/auth, and
  recovery expectations when a route artifact changes.
- Root and website guides, matching TypeScript/React/frontend instructions,
  relevant RFC 1001-1008 sections, and a same-category live sibling.

## Decision Points

1. Is this a route contract or an isolated server component?
2. Does the artifact require exclusive server execution, or only
   server-compatible rendering that may also be imported by a client?
3. Can server-owned data be fetched through a private `server-only` helper
   rather than exposing a Server Action?
4. Which values may cross the RSC boundary as React-serializable props?
5. Does interaction require one smallest client child instead of converting
   the server parent?
6. Which route boundaries, metadata, access decisions, and tests are required?

## Core Procedure

1. Inspect the target, its parent and consumers, the nearest route layout, a
   same-category sibling, and colocated tests.
2. Trace imports in both directions. Absence of `"use client"` is not proof of
   server-only execution. A server-compatible shared component may be consumed
   below a client boundary, but it must not import server-only APIs.
3. Define the server-owned contract: input parameters, data source,
   cache/freshness, validation, access checks, and serializable output.
4. Use private `server-only` helpers for server-owned reads. Do not add
   `"use server"` merely so a Server Component can call a function.
5. Keep hooks, event handlers, browser APIs, mutable client state, and client
   Context below the smallest `react-client-component` boundary, except when
   the framework-defined route artifact itself must be client (for example
   `error.tsx` with `reset`); that route contract remains owned here.
6. For route work, preserve typed `PageProps`, localized metadata, and the
   exact loading/error/empty/not-found behavior owned by the segment.
7. Pass only minimal serializable data to client children; never pass request
   objects, class instances with behavior, secrets, functions other than
   approved Server Action references, or caught `Error` objects.
8. Add focused tests for the server output, route decision, metadata, or
   boundary contract. Use browser/E2E coverage only when streaming,
   middleware, or navigation behavior cannot be proven in Vitest.
9. For `packages/components`, follow its local guide and component instruction:
   preserve domain independence, CSS Module/API/ref behavior, story, tests,
   barrel exports, and package validation.
10. Run the smallest targeted test and owning-project build/type validation.

## Resource Triggers

| Trigger | Load |
| --- | --- |
| Before deciding route/server/client/data ownership | [Server/client decision table](references/server-client-decision-table.md) |
| New route or change spanning multiple server/route artifacts | [Server component artifact matrix](checklists/server-component-artifact-matrix.md) |
| Hydration or URL/search-parameter edge case | [Hydration and URL edge cases](references/hydration-and-url-edge-cases.md) |
| Loading/error/empty/not-found, route accessibility, responsive, theme, or motion edge case | [Route UI edge cases](references/route-ui-edge-cases.md) |
| Need a current route or isolated server component sibling | [Live server components](examples/live-server-components.md) |
| A live sibling confirms a matching route/server-component shape | [Stable server component patterns](templates/stable-server-component-patterns.md) |
| Before selecting server-component/page test categories | [Server component test matrix](checklists/server-component-test-matrix.md) |
| Concrete import-graph, serialization, metadata, hydration, route-boundary, or build failure | [Troubleshooting](references/troubleshooting.md) |

## Verification

- The import graph proves exclusive server ownership or safe
  server-compatibility, as intended.
- Server-owned reads remain private; no accidental browser-callable RPC was
  introduced.
- Client code is isolated to the smallest child and receives only serializable
  props.
- Route parameters, metadata, access, and boundary states remain correct.
- Targeted tests and the smallest relevant website validation pass.

## Stop and Ask

- Authentication, authorization, guest/public visibility, or ownership change.
- New dependency, `next.config.ts` change, or public route-contract change.
- A Server Action is required but its caller/access/result contract is unclear.
- A message-schema migration is required.
- A server-only module cannot be proven exclusive, or a shared component would
  import a server-only/client-only dependency unexpectedly.

## Completion Contract

Report the server/import boundary, route or component contract, private data
owner, client handoff, metadata/boundary behavior, tests run, and only material
residual risk.
