# React Server Reference Catalog

Owner: `.github/instructions/react.instructions.md`. Load this catalog only
after consumers and the transitive import graph establish a server execution
question. It owns repository-specific React Server Component boundaries, not
Next.js special-file mechanics, Server Action procedure, access policy,
metadata schema, or implementation workflows.

## Server-only, server-compatible, and client-bundled

These categories are distinct:

| Category | Evidence | Constraint |
| --- | --- | --- |
| Exclusively server-only | Imports `server-only`, secrets, request-only APIs, private credentials, filesystem/provider code, or another server-only module | Must never enter a client graph |
| Server-compatible | Pure render/data-independent component with serializable props and no client/server-exclusive import | May render from a Server Component or be imported below a client boundary |
| Client-bundled without its own directive | Imported transitively from a `"use client"` module | Must satisfy client graph restrictions despite lacking a directive |

Absence of `"use client"` proves none of these by itself. Trace parents and
imports in both directions before moving code or adding a server-only
dependency.

## Server-owned data and RPC boundaries

Use a private helper that imports `"server-only"` when only Server Components,
Route Handlers, or other server code need the operation. Use a `"use server"`
export only when the browser must invoke it; every exported Server Action is a
public RPC surface with its own input validation and authorization contract.

The invoices landing page currently reads its auth snapshot through
`fetchAaaSUserFromAuthService`, an export from a `"use server"` module. This is
live debt, not a precedent: a Server Component does not need a browser-callable
RPC action for a private server read.

Server Action implementation, transport, security, and result mapping belong
to `react-server-action`. Authentication and ownership policy belong to
`react-auth`.

## RSC-to-client handoff

`sites/arolariu.ro/src/app/domains/invoices/page.tsx` and `island.tsx` are the
live route split: the page owns metadata and server data, then passes a small
serializable snapshot into the interactive island.

Cross only data React can serialize for the client boundary. Do not pass:

- request/response objects or provider clients;
- secrets or server-only configuration;
- class instances whose behavior/prototype matters;
- ordinary functions other than an intentionally supported Server Action
  reference;
- caught `Error` objects;
- mutable repository state containers.

Prefer identifiers, booleans, strings, numbers, arrays, and plain records that
represent exactly what the client subtree needs. Keep fetching, private
authorization context, and sensitive configuration above the boundary.

## Server rendering and client composition

Keep route/layout/server parents responsible for server-owned reads, access
decisions, metadata inputs, and stable initial output. Add one smallest client
child for events, Hooks, browser APIs, client Context, or mutable interaction.

Do not:

- move an entire route client-side to fix one interactive control;
- import a private `server-only` helper into an island;
- make a server helper an action solely to reuse it from server code;
- pass a broad domain aggregate when the client needs a small projection;
- place an `async` component in a client graph. The current React runtime
  supports async components only as Server Components; `async` still does not
  provide the import-poisoning guarantee of `import "server-only"`.

Next.js `page.tsx`, `layout.tsx`, error/loading/not-found, promised params, and
Route Handler mechanics belong to `nextjs.md`. The
`react-server-component` skill owns the implementation procedure.

## Live boundary examples

- `sites/arolariu.ro/src/app/layout.tsx` - server layout and provider/client
  handoff
- `sites/arolariu.ro/src/app/domains/invoices/page.tsx` - server route entry
- `sites/arolariu.ro/src/app/domains/invoices/island.tsx` - smallest
  interactive domain composition
- private helpers under `sites/arolariu.ro/src/lib/actions/` that import
  `"server-only"`
- browser-callable actions under invoice-domain `_actions/` and current
  cross-cutting action modules
- server-compatible primitives under `packages/components/`

Reopen all consumers before classifying a shared component. Package components
must remain domain-agnostic and may be consumed by client code even when they
have no directive.

This catalog supplies execution-boundary judgment only. Use the owning
`react.instructions.md` Artifact Routing table to select the implementation
workflow; do not maintain another routing map here.
