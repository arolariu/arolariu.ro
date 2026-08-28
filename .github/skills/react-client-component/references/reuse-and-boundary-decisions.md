# Reuse and Boundary Decisions

Use before creating or moving a component.

## Reuse scope

| Signal | Owner | Live source to inspect | Escalation |
| --- | --- | --- | --- |
| Knows one route's domain types, actions, messages, or layout | Route-local `_components/`, `_cards/`, `_dialogs/`, or adjacent file | `sites/arolariu.ro/src/app/domains/invoices/_components/classification/ClassificationPicker.tsx` | None when behavior is established and in scope |
| Reused across unrelated website routes but still knows website navigation/auth/messages | `sites/arolariu.ro/src/components/` | `sites/arolariu.ro/src/components/Navigation.tsx`, `sites/arolariu.ro/src/components/Footer.tsx`, `sites/arolariu.ro/src/components/Header.tsx` | Ask before widening a public website contract with ambiguous consumers |
| Domain-agnostic primitive useful outside the website, with reusable semantics and styling API | `packages/components/` | `packages/components/src/components/ui/button.tsx`, `packages/components/src/components/ui/dialog.tsx`, `packages/components/src/index.ts` | Shared-library work must be explicit; ask before a public API change or incidental move |

Prefer duplication of a small route-specific composition over a premature
domain-aware library primitive. Search current exports before adding another
button, dialog, empty state, loader, tooltip, field, or layout primitive.

## Server or Client Component

| Requirement | Decision |
| --- | --- |
| Pure JSX from props, server translations/data, no hooks/browser/event handler | Keep server-compatible; use `react-server-component` if changing that artifact |
| `useState`, `useEffect`, React client context, Zustand hook, browser API, event handler | Add `"use client"` to the smallest owning file |
| Server parent with one interactive descendant | Keep parent server-owned; pass a minimal serializable contract to a client child |
| Shared primitive wraps Base UI hooks | Follow the live primitive's client boundary |

Live contrast:

- server page shell: `sites/arolariu.ro/src/app/about/page.tsx`;
- route client component:
  `sites/arolariu.ro/src/app/domains/invoices/_components/classification/ClassificationPicker.tsx`;
- server-compatible shared presentation:
  `packages/components/src/components/ui/empty.tsx`;
- Base UI client primitive:
  `packages/components/src/components/ui/dialog.tsx`.

Do not add a client directive because a parent happens to be client. A
server-compatible component may still be consumed beneath a client boundary.

## State placement

| State lifetime | Owner | Pointer |
| --- | --- | --- |
| Derived from props/current state | Compute during render, optionally memoize only for structural/measured cost | `sites/arolariu.ro/src/hooks/usePagination.tsx` |
| One control/component interaction | Local `useState`/`useReducer` | `sites/arolariu.ro/src/app/domains/invoices/_components/classification/ClassificationPicker.tsx` |
| One mounted feature subtree | Scoped Context | `sites/arolariu.ro/src/app/domains/invoices/create-invoice/_context/CreateInvoiceContext.tsx`; `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx` |
| Existing cross-route cache/preferences | Existing Zustand selector | `sites/arolariu.ro/src/stores/`; load the `react-client-store` skill |
| New global state | Stop for approval | Root/website risk boundary |

Context is not a shortcut around prop design. Keep state and actions typed,
stabilize provider values where it affects consumers, and throw a clear error
when a required hook is used outside its provider.

## Effect, event, or render derivation

| Behavior | Put it in |
| --- | --- |
| Calculate filtered/sorted/paginated/display state from inputs | Render derivation (`useMemo` only if useful) |
| Submit, toggle, select, navigate, or update because the user acted | Event handler |
| Subscribe to DOM/browser/store/external service; schedule timer; synchronize cookie/theme | Effect with complete dependencies and cleanup |
| Fetch because a route request renders | Server Component/action, not a client effect |
| Fetch because a client-only changing identifier owns stale-while-revalidate | `react-client-hook` with cancellation/stale-result protection |

Inspect `sites/arolariu.ro/src/hooks/usePagination.tsx` for derivation,
`sites/arolariu.ro/src/app/domains/invoices/_components/classification/ClassificationPicker.tsx`
for timer cleanup and stale-response invalidation, and
`sites/arolariu.ro/src/app/_components/PreferencesSubscriptions.tsx` for
external subscriptions. Never copy props into state just to keep them "in
sync."

## Native, shared primitive, or Base UI composition

1. Prefer the native semantic element when it fully owns behavior.
2. Reuse an exported `@arolariu/components` primitive when interaction/focus
   semantics already exist.
3. In explicitly requested library work, follow current Base UI `render`
   composition, `mergeProps`, CSS Module `cn()`, and `forwardRef` behavior from
   `packages/components/src/components/ui/button.tsx` or the matching sibling.
4. Retain `asChild` only where a live public API already supports it; new
   composition uses the current `render` pattern.
5. A public DOM ref is justified by consumer composition/focus needs, not as a
   blanket rule for route-local components.

Changing the rendered element, keyboard contract, ref target, or public prop
shape is a public behavior change and requires consumer inspection.
