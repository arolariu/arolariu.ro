# Stable Store Test Patterns

Use only after a current store with the same factory/storage shape confirms the
pattern. These tests intentionally do not mock repository modules.

## Provenance

- State/action contracts:
  `sites/arolariu.ro/src/stores/createEntityStore.test.ts`,
  `sites/arolariu.ro/src/stores/invoicesStore.test.tsx`,
  `sites/arolariu.ro/src/stores/scansStore.test.tsx`,
  `sites/arolariu.ro/src/stores/preferencesStore.test.ts`
- Real storage contract:
  `sites/arolariu.ro/src/stores/storage/indexedDBStorage.test.ts`
- Hydration/selectors:
  `sites/arolariu.ro/src/app/domains/invoices/_hooks/invoice/useInvoices.test.tsx`,
  `sites/arolariu.ro/vitest.setup.ts`
- Cross-tab cleanup:
  `sites/arolariu.ro/src/app/_components/PreferencesSubscriptions.test.tsx`

## Invariants

- Tests reset singleton memory and durable storage and remain order-independent.
- Repository store/factory/storage modules run for real; only a true external
  boundary may be substituted.
- Defaults, actions, related selection, reset, partialized persistence,
  hydration completion, stale/invalid durable data, and selector behavior are
  asserted when owned by the change.
- Async persistence/rehydration is awaited; timers/channels/subscriptions are
  cleaned up.

## Live-derived values

Derive the store import, initial/default state, reset action, persist API,
storage/table/key, domain builder, persisted projection, hydration flag,
selector fields, and safe cleanup order from the exact store and its closest
test. Do not invent a generic `reset` action when the live store uses
`clearEntities`, `clearScans`, or `resetToDefaults`.

## Defaults, actions, and reset

```ts
import {act} from "@testing-library/react";
import {beforeEach, describe, expect, it} from "vitest";
import {use<Domain>Store} from "./<domain>Store";

describe("use<Domain>Store", () => {
  beforeEach(async () => {
    await use<Domain>Store.persist.clearStorage();
    act(() => {
      use<Domain>Store.setState(<live-initial-state>, true);
    });
  });

  it("starts from the live defaults", () => {
    expect(use<Domain>Store.getState().<field>).toEqual(<live-default>);
  });

  it("preserves related invariants when the action runs", () => {
    const entity = <live-builder>.build();

    act(() => {
      use<Domain>Store.getState().<action>(entity);
    });

    expect(use<Domain>Store.getState().<field>).toEqual(<expected>);
    expect(use<Domain>Store.getState().<related-field>).toEqual(<expected-related>);
  });

  it("resets live state", () => {
    act(() => {
      use<Domain>Store.getState().<change-action>(<value>);
      use<Domain>Store.getState().<live-reset-action>();
    });

    expect(use<Domain>Store.getState().<field>).toEqual(<live-default>);
  });
});
```

If replacing state with the second `setState` argument would remove actions for
the live store, use its actions or a complete live initial state instead.

## Real persistence and hydration

```ts
import {beforeEach, expect, it} from "vitest";
import {use<Domain>Store} from "./<domain>Store";

function getLivePersistence() {
  const {name, storage, version = 0} =
    use<Domain>Store.persist.getOptions();

  if (!name || !storage) {
    throw new Error("The live persisted store must expose its configured storage");
  }

  return {name, storage, version};
}

beforeEach(async () => {
  // Finish import-time hydration, reset memory, await that write, and make the
  // awaited adapter removal the final cleanup operation.
  await use<Domain>Store.persist.rehydrate();
  use<Domain>Store.getState().<live-reset-action>();
  await <await-live-persist-completion>;

  const {name, storage} = getLivePersistence();
  await storage.removeItem(name);
});

it("persists and rehydrates only the durable projection", async () => {
  use<Domain>Store.getState().<persisted-action>(<written-durable-value>);
  use<Domain>Store.getState().<transient-action>(<transient-value>);

  // Await the live storage signal/API established by the sibling; do not use
  // an arbitrary sleep.
  await <await-live-persist-completion>;

  const {name, storage, version} = getLivePersistence();
  expect(await storage.getItem(name)).toEqual({
    state: <written-persisted-projection>,
    version,
  });

  await storage.setItem(name, {
    state: <rehydration-persisted-projection>,
    version,
  });

  // Do not call a bound action or setState between this seed and rehydration.
  await use<Domain>Store.persist.rehydrate();

  expect(use<Domain>Store.getState().<persisted-field>).toEqual(<rehydrated-durable-value>);
  expect(use<Domain>Store.getState().<transient-field>).toEqual(<transient-value>);
  expect(use<Domain>Store.getState().hasHydrated).toBe(true);
});

it("falls back safely when durable data is absent or invalid", async () => {
  await <seed-through-real-storage-adapter>(<absent-or-invalid-value>);
  await use<Domain>Store.persist.rehydrate();

  expect(use<Domain>Store.getState().<field>).toEqual(<safe-live-default>);
});
```

Use fake IndexedDB already installed by `sites/arolariu.ro/vitest.setup.ts`.
Seed through the exported live adapter or persist API; do not mock it.
This singleton pattern proves the write by reading the live adapter, then
proves hydration with a distinct seeded durable projection and no intervening
store mutation. Zustand persist wraps both bound `setState` and slice actions
with a durable write, so neither can simulate a memory-only reset before
`rehydrate()`. When the production module exposes its exact store factory,
prefer a fresh reader instance after the writer's persistence completes; do
not recreate production middleware or configuration in the test.

## Selector stability

```tsx
import {act, renderHook} from "@testing-library/react";
import {expect, it} from "vitest";
import {useShallow} from "zustand/react/shallow";
import {use<Domain>Store} from "./<domain>Store";

it("does not replace the selected snapshot for an unrelated update", () => {
  const {result} = renderHook(() =>
    use<Domain>Store(
      useShallow((state) => ({
        value: state.<selected-field>,
        action: state.<selected-action>,
      })),
    ),
  );
  const firstSnapshot = result.current;

  act(() => {
    use<Domain>Store.getState().<unrelated-action>(<value>);
  });

  expect(result.current).toBe(firstSnapshot);
});
```

For a scalar selector, assert render behavior through a small consumer only
when reference stability is part of the regression.

## Invalidated when

Do not use these templates if the store changes reset semantics, persist API,
storage adapter, hydration callback, test environment, selector equality,
factory contract, or user-partition design. Re-inspect the live store and
update this resource before reuse.
