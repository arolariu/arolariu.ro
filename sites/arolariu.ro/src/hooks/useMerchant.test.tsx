import type {Merchant} from "@/types/invoices";
import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {useMerchant} from "./useMerchant";

// Type alias for store selector to improve readability
type MerchantsStoreSelector = (state: {merchants: Merchant[]; upsertMerchant: (merchant: Merchant) => void}) => unknown;

// Create mock function using vi.hoisted
const {mockFetchMerchant, mockupsertMerchant, mockUseMerchantsStore} = vi.hoisted(() => ({
  mockFetchMerchant: vi.fn(),
  mockupsertMerchant: vi.fn(),
  mockUseMerchantsStore: vi.fn(),
}));

// Mock the dependencies
vi.mock("./index", () => ({
  useUserInformation: vi.fn(() => ({
    userInformation: {
      user: {id: "user123"},
      userIdentifier: "user123",
      userJwt: "test-jwt-token",
    },
    isLoading: false,
    isError: false,
  })),
}));

vi.mock("@/lib/actions/invoices/fetchMerchant", () => ({
  default: mockFetchMerchant,
}));

vi.mock("@/stores", () => ({
  useMerchantsStore: mockUseMerchantsStore,
}));

describe("useMerchant", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.clearAllMocks();

    // Setup default mock implementation for useMerchantsStore - starts with empty cache
    mockUseMerchantsStore.mockImplementation((selector: MerchantsStoreSelector) => {
      const state = {
        merchants: [] as Merchant[],
        upsertMerchant: mockupsertMerchant,
      };
      return selector(state);
    });
  });

  afterEach(() => {
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore();
    }
  });

  it("should initialize with null merchant and loading state", () => {
    mockFetchMerchant.mockResolvedValue({
      id: "merchant-123",
      name: "Test Merchant",
    });

    const {result} = renderHook(() => useMerchant({merchantIdentifier: "merchant-123"}));

    expect(result.current.merchant).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it("should fetch merchant successfully", async () => {
    const mockMerchant: Merchant = {
      id: "merchant-123",
      name: "Test Merchant",
    } as Merchant;

    mockFetchMerchant.mockResolvedValue(mockMerchant);

    // Update mock to return the merchant after fetch
    let storeMerchants: Merchant[] = [];
    mockUseMerchantsStore.mockImplementation((selector: MerchantsStoreSelector) => {
      const state = {
        merchants: storeMerchants,
        upsertMerchant: (merchant: Merchant) => {
          storeMerchants = [merchant];
          mockupsertMerchant(merchant);
        },
      };
      return selector(state);
    });

    const {result, rerender} = renderHook(() => useMerchant({merchantIdentifier: "merchant-123"}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Rerender to pick up the updated store state
    rerender();

    expect(result.current.merchant).toEqual(mockMerchant);
    expect(result.current.isError).toBe(false);
    expect(mockFetchMerchant).toHaveBeenCalledWith({merchantId: "merchant-123"});
  });

  it("should handle fetch errors", async () => {
    mockFetchMerchant.mockRejectedValue(new Error("Failed to fetch"));

    const {result} = renderHook(() => useMerchant({merchantIdentifier: "merchant-123"}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.merchant).toBeNull();
    expect(result.current.isError).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("should set loading state during fetch", async () => {
    let resolvePromise: (value: Merchant) => void;
    const promise = new Promise<Merchant>((resolve) => {
      resolvePromise = resolve;
    });

    mockFetchMerchant.mockReturnValue(promise);

    const {result} = renderHook(() => useMerchant({merchantIdentifier: "merchant-123"}));

    // Should be loading initially
    expect(result.current.isLoading).toBe(true);
    expect(result.current.merchant).toBeNull();

    // Resolve the promise
    resolvePromise!({id: "merchant-123", name: "Test"} as Merchant);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should maintain merchant state on error", async () => {
    mockFetchMerchant.mockRejectedValue(new Error("Network error"));

    const {result} = renderHook(() => useMerchant({merchantIdentifier: "merchant-123"}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.merchant).toBeNull();
    expect(result.current.isError).toBe(true);
  });
});
