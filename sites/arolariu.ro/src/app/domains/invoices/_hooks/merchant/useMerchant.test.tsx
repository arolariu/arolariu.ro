/**
 * @fileoverview Unit tests for useMerchant client hook.
 * @module app/domains/invoices/_hooks/merchant/useMerchant.test
 */

import type {Merchant} from "@/types/invoices";
import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {buildEntityStoreState, buildMerchant, mockEntityStoreSelector, mockResolvedActionFailure} from "../../../../../../tests/helpers";
import {useMerchant} from "./useMerchant";

vi.mock("@/stores", () => ({
  useMerchantsStore: vi.fn(),
}));

vi.mock("../../_actions/merchants", () => ({
  fetchMerchant: vi.fn(),
}));

const {useMerchantsStore} = await import("@/stores");
const {fetchMerchant} = await import("../../_actions/merchants");

const mockUseMerchantsStore = vi.mocked(useMerchantsStore);
const mockFetchMerchant = vi.mocked(fetchMerchant);

function createMockStoreState(
  overrides: Readonly<{
    entities?: ReadonlyArray<Merchant>;
    hasHydrated?: boolean;
  }> = {},
): Readonly<{upsertMerchant: ReturnType<typeof vi.fn>}> {
  const upsertMerchant = vi.fn();

  mockEntityStoreSelector(
    mockUseMerchantsStore,
    buildEntityStoreState<Merchant>({
      entities: overrides.entities ?? [],
      upsertEntity: upsertMerchant,
      hasHydrated: overrides.hasHydrated ?? false,
    }),
  );

  return {upsertMerchant};
}

describe("useMerchant", () => {
  const merchantId = "22222222-2222-4222-8222-222222222222";
  const merchant = buildMerchant({id: merchantId, name: "Test Merchant"});

  beforeEach(() => {
    vi.clearAllMocks();
    createMockStoreState();
    mockFetchMerchant.mockResolvedValue({success: true, data: merchant});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns cached merchant and loading state from the store", () => {
    createMockStoreState({entities: [merchant], hasHydrated: false});

    const {result} = renderHook(() => useMerchant({merchantIdentifier: merchantId}));

    expect(result.current).toEqual({
      merchant,
      isLoading: true,
      isError: false,
    });
  });

  it("returns null when the requested merchant is not cached after hydration", () => {
    createMockStoreState({
      entities: [buildMerchant({id: "33333333-3333-4333-8333-333333333333"})],
      hasHydrated: true,
    });

    const {result} = renderHook(() => useMerchant({merchantIdentifier: merchantId}));

    expect(result.current.merchant).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("fetches the merchant and upserts it on success", async () => {
    const {upsertMerchant} = createMockStoreState({hasHydrated: true});

    renderHook(() => useMerchant({merchantIdentifier: merchantId}));

    await waitFor(() => {
      expect(mockFetchMerchant).toHaveBeenCalledWith({merchantId});
    });
    await waitFor(() => {
      expect(upsertMerchant).toHaveBeenCalledWith(merchant);
    });
  });

  it("sets the error flag and logs when the server action returns failure", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    createMockStoreState({hasHydrated: true});
    mockResolvedActionFailure(mockFetchMerchant, {code: "NOT_FOUND", message: "Merchant not found"});

    const {result} = renderHook(() => useMerchant({merchantIdentifier: merchantId}));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(">>> Error fetching merchant:", "NOT_FOUND", "Merchant not found");
  });

  it("sets the error flag and logs when the server action throws", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const thrownError = new Error("Network failure");
    createMockStoreState({hasHydrated: true});
    mockFetchMerchant.mockRejectedValue(thrownError);

    const {result} = renderHook(() => useMerchant({merchantIdentifier: merchantId}));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(">>> Error fetching merchant in useMerchant hook:", thrownError);
  });

  it("does not upsert merchant data when fetch fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const {upsertMerchant} = createMockStoreState({hasHydrated: true});
    mockFetchMerchant.mockResolvedValue({
      success: false,
      error: {code: "SERVER_ERROR", message: "Server unavailable"},
    });

    renderHook(() => useMerchant({merchantIdentifier: merchantId}));

    await waitFor(() => {
      expect(mockFetchMerchant).toHaveBeenCalledOnce();
    });

    expect(upsertMerchant).not.toHaveBeenCalled();
  });

  it("refetches when the merchant identifier changes", async () => {
    const firstMerchant = buildMerchant({id: merchantId, name: "First Merchant"});
    const secondMerchant = buildMerchant({id: "33333333-3333-4333-8333-333333333333", name: "Second Merchant"});
    const {upsertMerchant} = createMockStoreState({hasHydrated: true});
    mockFetchMerchant
      .mockResolvedValueOnce({success: true, data: firstMerchant})
      .mockResolvedValueOnce({success: true, data: secondMerchant});

    const {rerender} = renderHook(({id}) => useMerchant({merchantIdentifier: id}), {
      initialProps: {id: firstMerchant.id},
    });

    await waitFor(() => {
      expect(mockFetchMerchant).toHaveBeenCalledWith({merchantId: firstMerchant.id});
    });

    rerender({id: secondMerchant.id});

    await waitFor(() => {
      expect(mockFetchMerchant).toHaveBeenCalledWith({merchantId: secondMerchant.id});
    });

    expect(upsertMerchant).toHaveBeenNthCalledWith(1, firstMerchant);
    expect(upsertMerchant).toHaveBeenNthCalledWith(2, secondMerchant);
  });
});
