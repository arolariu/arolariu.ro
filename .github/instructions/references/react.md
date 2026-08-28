# React Reference Catalog

Owner: `.github/instructions/react.instructions.md`. This catalog holds
extensive React-specific examples, anti-patterns, edge cases, and rationale
for `**/*.tsx`/`**/*.jsx` across the monorepo (website and component library).
It does not define a workflow. The generic instruction routes to artifact
skills; client/server runtime edge cases live in `react-client.md` and
`react-server.md`, while Next.js/product architecture belongs to
`frontend.md` and `nextjs.md`.

## Artifact workflow decisions

| Signal | Primary skill | Boundary proof |
| --- | --- | --- |
| Direct hook, event handler, browser API, client Context, or interactive state | `react-client-component` | The file itself needs a client capability and carries or inherits the client graph |
| Page/layout, route metadata/boundary, async server rendering, or private server data | `react-server-component` | Trace consumers/imports; absence of `"use client"` alone is not proof |
| Reusable `use*` API with lifecycle/state logic and no owned markup | `react-client-hook` | Multiple consumers or a cohesive reusable lifecycle contract |
| File-level/function-level `"use server"` export | `react-server-action` | Treat every export as browser-callable public RPC |
| Zustand implementation/persistence/hydration/selectors | `react-client-store` | Global state is approved and narrower owners are insufficient |
| Dictionary/schema/selector/ICU/generated-message change | `react-internationalization` | Message artifacts change, even when invoked secondarily from a component task |
| Matcher/redirect/visibility/ownership/authorization behavior | `react-auth` | Security behavior change has explicit approval |
| Compiler lint/transform readiness or adoption | `react-compiler` | Distinguish installed package, registered lint rules, and active transform |

`sites/arolariu.ro` contains both large client and server-default graphs.
`react-client.md` and `react-server.md` are subordinate semantic catalogs, not
path instructions: they load only after directives, consumers, and transitive
imports establish the execution boundary. Do not create
`react.client.instructions.md` or `react.server.instructions.md`; path globs
cannot classify those graphs reliably.

The volatile React Compiler snapshot is owned by
`.github/skills/react-compiler/examples/live-baseline.md`. Inspect that resource
and live configuration through `react-compiler` before changing compiler state;
do not copy its current enabled/disabled details into another asset.

## Purity and render semantics

Render must be a pure function of props/state; side effects belong in an
event handler or an effect that synchronizes with an external system, never
inline in the render body.

```tsx
// ❌ Side effect during render
export function Counter({initial}: Readonly<{initial: number}>): React.JSX.Element {
  document.title = `Count: ${initial}`; // runs on every render, including aborted ones
  return <span>{initial}</span>;
}

// ✅ Effect owns the external synchronization
export function Counter({initial}: Readonly<{initial: number}>): React.JSX.Element {
  useEffect(() => {
    document.title = `Count: ${initial}`;
  }, [initial]);
  return <span>{initial}</span>;
}
```

## State and event decisions

- Derive values during render (`const total = items.reduce(...)`); do not
  copy a prop into `useState` and manually keep it in sync unless there is a
  demonstrated need to let the value diverge from its source after the
  initial render.
- Put state at the narrowest owner. Use `react-client.md` for repository
  Context/latest-ref edge cases, `react-client-store` for global persistence,
  and the frontend catalog for the live website store inventory.

## Component identity and memoization

- Never define a component function inside another component's render body —
  it creates a new component identity every render, which remounts the child
  and destroys its internal state and any DOM focus.
- Add `memo`/`useMemo`/`useCallback` for a measured re-render cost or a
  demonstrated structural need, such as a provider value consumed independently
  from changing state - not by default on every component or callback.
- Prefer a stable primitive/derived dependency over memoizing an inline
  object literal solely to keep a `useEffect` dependency array stable; first
  ask whether the object needs to exist at all.

## Semantic HTML, ARIA, and focus

- Prefer the native element and its built-in keyboard/focus behavior before
  adding ARIA. `packages/components/src/components/ui/button.tsx` renders a
  native `<button type="button">` by default and only switches to
  `role="button"` plus manual `aria-disabled`/keyboard handling
  (`createNonNativeInteractionProps`) when composed onto a non-button element
  via the `render`/`asChild` API — see the components catalog for the full
  composition pattern.
- Give icon-only controls an accessible name (`aria-label` or visually-hidden
  text), and reflect busy/disabled/error state with `aria-busy`,
  `aria-disabled`, and `role="alert"` respectively rather than relying on
  visual styling alone.

## Loading, error, and empty states

Every hook or component that fetches or derives a collection should expose a
distinguishable loading, error, and empty state rather than overloading a
single boolean. Client hydration and stale-request edge cases belong in
`react-client.md`; route-level loading/error/not-found behavior belongs in
`nextjs.md`.

## Anti-pattern corrections

| Anti-pattern | Problem | Correction |
| --- | --- | --- |
| `useEffect(async () => {...}, [])` | The effect callback itself must not return a Promise; React treats the return value as a cleanup function | Define and invoke an inner async function; use `react-client-hook` for lifecycle ownership |
| Missing dependency array entry for a value read inside an effect | Stale closure reads an outdated value on the next render | Include the value, or use an explicitly justified latest-value ref whose identity contract is proven |
| A new component defined inside a parent's render function | Remounts on every parent render; loses focus/state | Hoist the component to module scope or a sibling file |

Client cancellation, latest-ref, hydration, and transport anti-patterns are
owned by `react-client.md`; the ordered lifecycle procedure remains in
`react-client-hook`.

## Live component/test pointers

- `packages/components/src/components/ui/button.tsx` +
  `button.test.tsx` — native-first semantics, non-native interaction props

Use `react-client.md` for live client Hook/Context pointers and
`react-server.md` for live RSC boundary pointers.
