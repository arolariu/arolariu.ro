/**
 * @fileoverview Unit tests for useMerchants client hook.
 * @module app/domains/invoices/_hooks/merchant/useMerchants.test
 */

import type {Merchant} from "@/types/invoices";
import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";
import {useMerchants} from "./useMerchants";

vi.mock("@/stores", () => ({
  useMerchantsStore: vi.fn(),
}));

vi.mock("../../_actions/merchants", () => ({
  fetchMerchants: vi.fn(),
}));

const {useMerchantsStore} = await import("@/stores");
const {fetchMerchants} = await import("../../_actions/merchants");

const mockUseMerchantsStore = vi.mocked(useMerchantsStore);
const mockFetchMerchants = vi.mocked(fetchMerchants);

function createMockStoreState(
  overrides: Readonly<{
    entities?: ReadonlyArray<Merchant>;
    hasHydrated?: boolean;
  }> = {},
): Readonly<{setMerchants: ReturnType<typeof vi.fn>}> {
  const setMerchants = vi.fn();

  TestDataBuilder.mockEntityStoreSelector(
    mockUseMerchantsStore,
    TestDataBuilder.entityStore<Merchant>({
      entities: overrides.entities ?? [],
      setEntities: setMerchants,
      hasHydrated: overrides.hasHydrated ?? false,
    }),
  );

  return {setMerchants};
}

describe("useMerchants", () => {
  const merchant1 = TestDataBuilder.build("merchant", {id: "22222222-2222-4222-8222-222222222222", name: "Merchant 1"});
  const merchant2 = TestDataBuilder.build("merchant", {id: "33333333-3333-4333-8333-333333333333", name: "Merchant 2"});

  beforeEach(() => {
    vi.clearAllMocks();
    createMockStoreState();
    mockFetchMerchants.mockResolvedValue({success: true, data: [merchant1, merchant2]});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns cached merchants and loading state from the store", () => {
    createMockStoreState({entities: [merchant1], hasHydrated: false});

    const {result} = renderHook(() => useMerchants());

    expect(result.current).toEqual({
      merchants: [merchant1],
      isLoading: true,
      isError: false,
    });
  });

  it("returns isLoading false once the store has hydrated", () => {
    createMockStoreState({entities: [merchant1, merchant2], hasHydrated: true});

    const {result} = renderHook(() => useMerchants({}));

    expect(result.current.merchants).toEqual([merchant1, merchant2]);
    expect(result.current.isLoading).toBe(false);
  });

  it("fetches merchants and replaces store entities on success", async () => {
    const {setMerchants} = createMockStoreState({hasHydrated: true});
    const merchants = [merchant1, merchant2];
    mockFetchMerchants.mockResolvedValue({success: true, data: merchants});

    renderHook(() => useMerchants());

    await waitFor(() => {
      expect(mockFetchMerchants).toHaveBeenCalledWith();
    });
    await waitFor(() => {
      expect(setMerchants).toHaveBeenCalledWith([...merchants]);
    });
  });

  it("stores an empty merchant list when the server action succeeds with no data", async () => {
    const {setMerchants} = createMockStoreState({hasHydrated: true});
    mockFetchMerchants.mockResolvedValue({success: true, data: []});

    renderHook(() => useMerchants());

    await waitFor(() => {
      expect(setMerchants).toHaveBeenCalledWith([]);
    });
  });

  it("sets the error flag and logs when the server action returns failure", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    createMockStoreState({hasHydrated: true});
    TestDataBuilder.mockResolvedActionFailure(mockFetchMerchants, {code: "SERVER_ERROR", message: "Server unavailable"});

    const {result} = renderHook(() => useMerchants());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(">>> Error fetching merchants:", "SERVER_ERROR", "Server unavailable");
  });

  it("sets the error flag and logs when the server action throws", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const thrownError = new Error("Network failure");
    createMockStoreState({hasHydrated: true});
    mockFetchMerchants.mockRejectedValue(thrownError);

    const {result} = renderHook(() => useMerchants());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(">>> Error fetching merchants in useMerchants hook:", thrownError);
  });

  it("does not replace store entities when fetch fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const {setMerchants} = createMockStoreState({hasHydrated: true});
    mockFetchMerchants.mockResolvedValue({
      success: false,
      error: {code: "AUTH_ERROR", message: "Unauthorized"},
    });

    renderHook(() => useMerchants());

    await waitFor(() => {
      expect(mockFetchMerchants).toHaveBeenCalledOnce();
    });

    expect(setMerchants).not.toHaveBeenCalled();
  });
});
