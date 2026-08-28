# RFC 1007: Advanced Frontend Patterns

- **Status**: Implemented
- **Date**: 2026-01-15
- **Authors**: arolariu
- **Related Components**: entity stores, server transport/results, dialog
  context, React client/server boundaries

---

## Abstract

The website standardizes three cross-cutting patterns:

1. factory-backed persisted entity stores for invoices and merchants;
2. typed server result/error handling around server-owned transport;
3. discriminated dialog state with typed payloads and stable actions.

These patterns are implemented in production. Scans intentionally retain a
specialized store, and not every server-side function is a Server Action.

## 1. Entity-store factory

`src/stores/createEntityStore.ts` owns the reusable Zustand entity contract.
It provides:

- `entities`, `selectedEntities`, and `hasHydrated`;
- set/upsert/update/remove/lookup operations;
- selection toggle/clear behavior;
- IndexedDB persistence through the shared adapter;
- development-only devtools wrapping.

### Current adoption

| Store | Status |
| --- | --- |
| `useInvoicesStore` | Factory-backed |
| `useMerchantsStore` | Factory-backed |
| `useScansStore` | Deliberately specialized |
| `usePreferencesStore` | Separate preference/key-value contract |

Scans own status, naming, blob URL, metadata, archive, invoice-use, selection,
cache, and transient sync-state transitions that the generic factory does not
express. Extending the factory for that lifecycle is an architecture change
requiring characterization, not an automatic DRY refactor.

### Factory usage

```typescript
export const useInvoicesStore = createEntityStore<Invoice>({
  tableName: "invoices",
  storeName: "InvoicesStore",
  persistName: "invoices-store",
});
```

Consumers use exact selectors and `useShallow` for object results. UI must
distinguish pre-hydration from a settled empty collection.

RFC 1005 owns persistence, IndexedDB, and state-placement detail.

## 2. Server result pattern

`src/lib/utils.server.ts` owns a promise-based discriminated result:

```typescript
export type ServerActionResult<T> = Promise<
  | Readonly<{success: true; data: T; error?: never}>
  | Readonly<{
      success: false;
      data?: never;
      error: {
        code: ServerActionErrorCode;
        message: string;
        status?: number;
      };
    }>
>;
```

Consumers narrow on `success`; they do not inspect ad hoc response shapes.

### Error ownership

- HTTP status mapping uses the shared `ServerActionErrorCode` policy.
- `TransportValidationError` maps to `SERVER_ERROR` because a malformed
  successful API payload is server/client contract drift, not user validation.
- timeout, network, auth, not-found, validation, server, and unknown failures
  remain distinguishable.
- backend error parsing uses safe `ProblemDetails`/detail content and special
  handling for established status contracts.

### Transport ownership

`fetchWithTimeout`:

- resolves the configured API URL for relative paths;
- owns a timeout `AbortController`; the current implementation overrides
  `RequestInit.signal` rather than composing a caller signal, which is a live
  limitation to preserve or fix explicitly;
- injects trace context;
- forces `cache: "no-store"` for every request;
- throws the established timeout/network errors.

Runtime parsing remains separate: successful JSON is `unknown` until the
domain transport parser validates it.

## 3. Server Actions and private server helpers

A module-level `"use server"` export is implemented on the server but is
browser-callable RPC. Treat every exported action as an untrusted public
boundary:

1. validate browser-controlled inputs;
2. derive identity on the server through Clerk or the established auth owner;
3. enforce operation/resource authorization independently;
4. call the shared transport and parser;
5. return the established typed result.

Do not accept a caller-supplied JWT merely because the function executes on
the server.

Private server reads used only by Server Components or Route Handlers import
`"server-only"` and do not carry `"use server"`. Directory names such as
`lib/actions` do not decide RPC exposure.

## 4. Dialog context

`src/app/domains/invoices/_contexts/DialogContext.tsx` models dialog state with
a discriminated `DialogType`/payload registry.

The provider uses separate state and actions contexts:

- the actions value is stable for the provider lifetime;
- the state value changes on open/close;
- current exported `useDialog` and `useDialogs` hooks subscribe to both and
  therefore rerender on state changes;
- the split preserves a future action-only seam but does not currently avoid
  rerenders for public hook consumers.

`useDialog` binds one dialog type/mode and keeps `open` stable while a ref is
updated after each render so the callback dispatches the latest payload.
Removing the ref can dispatch stale data; adding the payload as a dependency
changes callback identity.

### Guard behavior

The provider preserves the established "do not replace an already open dialog"
guard inside its functional state update. Changing that behavior is a UX
decision, not a context refactor.

## 5. Client/server composition

Server Components own private reads, metadata, access decisions, and stable
initial output. Client Components own Hooks, events, browser APIs, client
Context, and Zustand.

Pass only the minimal React-serializable snapshot into a client island. Do not
move a route client-side merely to consume one interactive control, and do not
turn a private server helper into a Server Action for server-to-server reuse.

## 6. Testing

### Entity stores

- exercise public actions and selectors;
- cover hydration and selection cleanup;
- use the real store plus configured IndexedDB implementation when persistence
  is the contract.

### Server transport/actions

- control only HTTP, Clerk, or provider boundaries;
- execute shared transport/error/parser modules rather than replacing them;
- assert exact discriminated results, request shape, and forbidden calls;
- cover malformed successful responses.

### Dialog context

- render the real provider;
- prove open/close guard and typed payload behavior;
- rerender with a changed payload and verify stable `open` dispatches the
  latest value;
- assert the current state-driven rerender contract rather than claiming an
  action-only optimization.

## 7. Trade-offs

- Generic entity stores reduce duplicated CRUD/selection/persistence logic but
  should not absorb specialized lifecycle behavior.
- A shared result union simplifies consumers but requires every transport
  action to preserve the same discriminants.
- Stable callback/latest-ref patterns avoid avoidable effect churn but require
  focused rerender tests.
- Full server/client separation reduces shipped client code but requires
  explicit serializable handoffs.

## References

- `sites/arolariu.ro/src/stores/createEntityStore.ts`
- `sites/arolariu.ro/src/stores/invoicesStore.tsx`
- `sites/arolariu.ro/src/stores/merchantsStore.tsx`
- `sites/arolariu.ro/src/stores/scansStore.tsx`
- `sites/arolariu.ro/src/lib/utils.server.ts`
- `sites/arolariu.ro/src/types/invoices/transport.ts`
- `sites/arolariu.ro/src/app/domains/invoices/_contexts/DialogContext.tsx`
- [RFC 1005](./1005-state-management-zustand.md)
