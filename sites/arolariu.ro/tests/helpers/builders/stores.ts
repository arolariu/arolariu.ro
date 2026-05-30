/**
 * @fileoverview Test builders for Zustand entity store selectors.
 * @module tests/helpers/builders/stores
 *
 * @remarks
 * Provides builders for constructing full `EntityStore<T>` state objects suitable
 * for Zustand selector tests. These builders ensure tests pass complete store state
 * to mocked store hooks, matching the actual runtime behavior.
 *
 * **Design Principles:**
 * - Produces full `EntityStore<T>` state with all actions and properties
 * - Accepts partial overrides for flexibility in test scenarios
 * - No-op action implementations by default (tests override as needed)
 * - Type-safe with strict TypeScript alignment to `createEntityStore.ts`
 *
 * **Builder Coverage:**
 * - `buildEntityStoreState<T>` - Full entity store state builder
 * - `mockEntityStoreSelector<T>` - Zustand selector mock helper
 *
 * **Usage Context:**
 * - Import in `.test.ts` files testing Zustand store selectors
 * - Use for hook tests that consume store state via selectors
 * - Complement domain builders (invoices, merchants, products)
 *
 * @example
 * ```typescript
 * import {TestDataBuilder} from '@/tests/helpers';
 * import {vi} from 'vitest';
 *
 * describe('useInvoices hook', () => {
 *   it('selects entities from store', () => {
 *     const invoice = buildInvoice({id: "invoice-1"});
 *     const storeState = buildEntityStoreState({entities: [invoice]});
 *     const mockStore = vi.fn();
 *     mockEntityStoreSelector(mockStore, storeState);
 *
 *     const entities = mockStore((state) => state.entities);
 *     expect(entities).toEqual([invoice]);
 *   });
 * });
 * ```
 */

import type {Mock} from "vitest";

import type {BaseEntity, EntityStore} from "../../../src/stores/createEntityStore";

/**
 * Builds a complete EntityStore<TEntity> state object for testing.
 *
 * @template TEntity - Entity type extending BaseEntity
 * @param overrides - Partial store state to override defaults
 * @returns A full EntityStore<TEntity> object suitable for selector tests
 *
 * @remarks
 * **Default Values:**
 * - entities: [] (empty array)
 * - selectedEntities: [] (empty array)
 * - hasHydrated: true (simulates hydrated state)
 * - All actions: no-op implementations (override in tests as needed)
 *
 * **Use Cases:**
 * - Mocking Zustand store hooks in component/hook tests
 * - Testing selector functions with controlled state
 * - Verifying hook behavior with various store states
 *
 * @example
 * ```typescript
 * const invoice = buildInvoice({id: "invoice-1"});
 * const state = buildEntityStoreState({
 *   entities: [invoice],
 *   selectedEntities: [invoice],
 *   hasHydrated: true,
 * });
 *
 * expect(state.entities).toEqual([invoice]);
 * expect(state.selectedEntities).toEqual([invoice]);
 * expect(state.hasHydrated).toBe(true);
 * expect(typeof state.setEntities).toBe("function");
 * expect(typeof state.upsertEntity).toBe("function");
 * ```
 *
 * @see {@link EntityStore} - Source interface from createEntityStore.ts
 * @see {@link mockEntityStoreSelector} - Helper for mocking Zustand selectors
 */
export function buildEntityStoreState<TEntity extends BaseEntity>(
  overrides: Partial<EntityStore<TEntity>> = {},
): EntityStore<TEntity> {
  return {
    // State
    entities: [],
    selectedEntities: [],
    hasHydrated: true,

    // Actions (no-op defaults; tests override as needed)
    clearEntities: () => undefined,
    clearSelectedEntities: () => undefined,
    getEntityById: () => undefined,
    removeEntity: () => undefined,
    setEntities: () => undefined,
    setSelectedEntities: () => undefined,
    setHasHydrated: () => undefined,
    toggleEntitySelection: () => undefined,
    updateEntity: () => undefined,
    upsertEntity: () => undefined,

    // Apply overrides
    ...overrides,
  };
}

/**
 * Configures a mocked Zustand store hook to respond to selector calls.
 *
 * @template TEntity - Entity type extending BaseEntity
 * @param storeHook - Vitest mock function representing the Zustand store hook
 * @param state - Full EntityStore<TEntity> state to return from selectors
 * @returns The configured mock (for chaining)
 *
 * @remarks
 * **Behavior:**
 * - Intercepts selector calls to the mocked store hook
 * - Applies the selector to the provided `state` object
 * - Returns the selected value, simulating real Zustand behavior
 *
 * **Use Cases:**
 * - Testing hooks that consume store state via selectors
 * - Verifying selector logic without a real Zustand store
 * - Isolating component/hook tests from global store state
 *
 * @example
 * ```typescript
 * import {vi} from 'vitest';
 * import {buildEntityStoreState, mockEntityStoreSelector} from './stores';
 * import {buildInvoice} from './domain';
 *
 * it('passes full state through mocked selector', () => {
 *   const invoice = buildInvoice({id: "invoice-1"});
 *   const state = buildEntityStoreState({entities: [invoice]});
 *   const storeHook = vi.fn();
 *
 *   mockEntityStoreSelector(storeHook, state);
 *
 *   const selected = storeHook((s) => s.entities);
 *   expect(selected).toEqual([invoice]);
 * });
 * ```
 *
 * @see {@link buildEntityStoreState} - Builds the state object to pass
 */
export function mockEntityStoreSelector<TEntity extends BaseEntity>(
  storeHook: Mock,
  state: EntityStore<TEntity>,
): Mock {
  return storeHook.mockImplementation(
    (selector: (storeState: EntityStore<TEntity>) => unknown) => selector(state),
  );
}
