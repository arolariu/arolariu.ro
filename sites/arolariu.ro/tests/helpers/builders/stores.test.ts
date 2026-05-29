import {describe, expect, it, vi} from "vitest";

import type {Invoice} from "../../../src/types/invoices";
import type {EntityStore} from "../../../src/stores/createEntityStore";

import {buildInvoice} from "./domain";
import {buildEntityStoreState, mockEntityStoreSelector} from "./stores";

describe("store builders", () => {
  it("builds full entity store state for selector tests", () => {
    const invoice = buildInvoice({id: "invoice-1"});
    const state = buildEntityStoreState({
      entities: [invoice],
    });

    expect(state.entities).toEqual([invoice]);
    expect(state.hasHydrated).toBe(true);
    expect(typeof state.setEntities).toBe("function");
    expect(typeof state.upsertEntity).toBe("function");
    expect(typeof state.getEntityById).toBe("function");
    expect(typeof state.toggleEntitySelection).toBe("function");
  });

  it("passes full state through a mocked Zustand selector", () => {
    const invoice = buildInvoice({id: "invoice-1"});
    const state = buildEntityStoreState<Invoice>({
      entities: [invoice],
    });
    const storeHook = vi.fn();

    mockEntityStoreSelector(storeHook, state);

    const selected = storeHook((selectorState: EntityStore<Invoice>) => selectorState.entities);

    expect(selected).toEqual([invoice]);
  });
});
