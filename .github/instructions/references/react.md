# React Reference Catalog

Owner: `.github/instructions/react.instructions.md`. This catalog holds
extensive React-specific examples, anti-patterns, edge cases, and rationale
for `**/*.tsx`/`**/*.jsx` across the monorepo (website and component library).
It does not define a workflow — use `react-component` for the component
procedure — and it does not own routing, page architecture, or Next.js-only
concerns (`frontend.md` owns those).

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

## Effect dependency, cleanup, and stale-closure edge cases

`sites/arolariu.ro/src/hooks/useUserInformation.tsx` is the canonical
abort-and-cleanup pattern in this repository:

```tsx
useEffect(() => {
  abortControllerRef.current?.abort("New request initiated.");
  abortControllerRef.current = new AbortController();
  const {signal} = abortControllerRef.current;

  const fetchUserInformation = async (signal: AbortSignal) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${SITE_URL}/api/user`, {signal});
      setUserInformation((await response.json()) as UserInformation);
    } catch (error: unknown) {
      const isAbort = signal.aborted || (error instanceof DOMException && error.name === "AbortError");
      if (isAbort && process.env.NODE_ENV === "development") {
        return; // StrictMode double-invokes effects in dev; the first abort is expected
      }
      console.error(">>> Error fetching user information:", error as Error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  fetchUserInformation(signal);
  return () => abortControllerRef.current?.abort("Request aborted by cleanup function.");
}, []);
```

Key edge cases this demonstrates:

- **React 19 Strict Mode double-invoke**: in development, effects run,
  clean up, and run again on mount. An `AbortError` from the first
  intentionally-aborted request is expected and must not surface as a user
  error; the production branch keeps the original (stricter) behavior.
  Do not silence `AbortError` unconditionally in both environments — it would
  hide a genuine cancellation bug in production.
- **Ref for cross-render mutable state**: `abortControllerRef` survives
  re-renders without becoming a dependency (a ref does not trigger a
  re-render or belong in a dependency array).
- **Cleanup aborts the in-flight request**, not just resets state, preventing
  a `setState` call after unmount.

`sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx`
(`useDialog`) shows the "keep a callback identity stable while a payload
still needs to refresh" pattern:

```tsx
const payloadRef = useRef(dialogPayload);
// Empty deps: this effect exists solely to refresh the ref after each render,
// not to synchronize with an external system on a dependency change.
useEffect(() => {
  payloadRef.current = dialogPayload;
});

const open = useCallback(() => {
  actions.openDialog(dialogType, dialogMode, payloadRef.current);
}, [actions, dialogMode, dialogType]); // dialogPayload is intentionally excluded
```

Anti-pattern correction: adding `dialogPayload` to `open`'s dependency array
would recreate `open` (and re-run every effect/handler that depends on it) on
every payload change; the ref indirection exists specifically to avoid that
while still reading the latest payload when `open()` is called.

## State and event decisions

- Derive values during render (`const total = items.reduce(...)`); do not
  copy a prop into `useState` and manually keep it in sync unless there is a
  demonstrated need to let the value diverge from its source after the
  initial render.
- Put state at the narrowest owner: a single input's value belongs in that
  component; state read by two dialogs in the same subtree belongs in a
  shared `Context` (see `DialogContext.tsx`); state read across unrelated
  route branches and persisted across reloads belongs in a Zustand store —
  see the frontend catalog's state hierarchy.
- `DialogContext.tsx` splits state and actions into two separate contexts
  (`DialogStateContext`, `DialogActionsContext`) so the actions value can stay
  referentially stable (`useMemo` with an empty dependency array) while the
  state value intentionally changes on every open/close. This is the
  established split-context pattern for a store that has many
  action-consumers and fewer state-consumers.

## Component identity and memoization

- Never define a component function inside another component's render body —
  it creates a new component identity every render, which remounts the child
  and destroys its internal state and any DOM focus.
- Add `memo`/`useMemo`/`useCallback` for a measured re-render cost or a
  demonstrated structural need (for example keeping `DialogActionsContext`'s
  value referentially stable so consumers that only need actions do not
  re-render on state changes) — not by default on every component or callback.
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
single boolean. `useUserInformation` exposes `isLoading`/`isError` alongside a
guest-default `userInformation` value so a consumer can render a skeleton, an
error message, or a signed-out view without inferring state from `null`
checks alone.

## Anti-pattern corrections

| Anti-pattern | Problem | Correction |
| --- | --- | --- |
| `useEffect(async () => {...}, [])` | The effect callback itself must not return a Promise; React treats the return value as a cleanup function | Define an inner `async` function and invoke it, as in `useUserInformation` |
| Missing dependency array entry for a value read inside an effect | Stale closure reads an outdated value on the next render | Include the value in the dependency array, or hold it in a ref when it must not retrigger the effect (see `useDialog`) |
| Silencing every `AbortError` unconditionally | Hides a genuine unexpected cancellation in production | Gate the dev-only silencing behind `process.env.NODE_ENV === "development"`, as in `useUserInformation` |
| A new component defined inside a parent's render function | Remounts on every parent render; loses focus/state | Hoist the component to module scope or a sibling file |
| Adding a payload/object to a `useCallback` dependency array to "be safe" | Recreates the callback (and everything depending on it) every time the object changes, even when the callback does not need the latest value synchronously | Read the latest value through a ref updated in a separate effect, as in `useDialog` |

## Live component/test pointers

- `sites/arolariu.ro/src/hooks/useUserInformation.tsx` +
  `useUserInformation.test.tsx` — abort/cleanup, Strict Mode dev-only guard
- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx` +
  `DialogContext.test.tsx` — split-context state/actions, ref-backed stable
  callback, discriminated payload union
- `packages/components/src/components/ui/button.tsx` +
  `button.test.tsx` — native-first semantics, non-native interaction props
- `sites/arolariu.ro/src/hooks/usePagination.tsx` +
  `usePagination.test.tsx` — reusable hook with colocated Testing
  Library coverage
