import type {Merchant} from "@/types/invoices";
import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {useMerchants} from "./useMerchants";

// Type alias for store selector to improve readability
type MerchantsStoreSelector = (state: {merchants: Merchant[]; setMerchants: (merchants: Merchant[]) => void}) => unknown;

// Create mock functions using vi.hoisted
const {mockFetchMerchants, mockSetMerchants, mockUseMerchantsStore} = vi.hoisted(() => ({
  mockFetchMerchants: vi.fn(),
  mockSetMerchants: vi.fn(),
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

vi.mock("@/lib/actions/invoices/fetchMerchants", () => ({
  default: mockFetchMerchants,
}));

vi.mock("@/stores", () => ({
  useMerchantsStore: mockUseMerchantsStore,
}));

describe("useMerchants", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.clearAllMocks();

    // Setup default mock implementation for useMerchantsStore
    mockUseMerchantsStore.mockImplementation((selector: MerchantsStoreSelector) => {
      const state = {
        merchants: [],
        setMerchants: mockSetMerchants,
      };
      return selector(state);
    });
  });

  afterEach(() => {
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore();
    }
  });

  it("should return empty merchants array initially", async () => {
    mockFetchMerchants.mockResolvedValue([]);

    const {result} = renderHook(() => useMerchants());

    expect(result.current.merchant).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(false);
  });

  it("should fetch and return merchants successfully", async () => {
    const mockMerchants: Partial<Merchant>[] = [
      {id: "merchant-1", name: "Merchant 1"},
      {id: "merchant-2", name: "Merchant 2"},
    ];

    mockFetchMerchants.mockResolvedValue(mockMerchants);

    const {result} = renderHook(() => useMerchants());

    await waitFor(() => {
      expect(mockFetchMerchants).toHaveBeenCalledWith("test-jwt-token");
    });

    await waitFor(() => {
      expect(mockSetMerchants).toHaveBeenCalledWith(mockMerchants);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should set loading state during fetch", async () => {
    mockFetchMerchants.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve([]), 100);
        }),
    );

    const {result} = renderHook(() => useMerchants());

    // Initially should be loading
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(true);
      },
      {timeout: 15000},
    );

    // Eventually should finish loading
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      {timeout: 15000},
    );
  }, 30000); // Increase test timeout to 30 seconds

  it("should handle fetch error", async () => {
    const mockError = new Error("Fetch failed");
    mockFetchMerchants.mockRejectedValue(mockError);

    const {result} = renderHook(() => useMerchants());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(">>> Error fetching merchants in useMerchants hook:", mockError);
  });

  it("should handle network error gracefully", async () => {
    mockFetchMerchants.mockRejectedValue(new Error("Network error"));

    const {result} = renderHook(() => useMerchants());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should always fetch regardless of userInformation state", async () => {
    mockFetchMerchants.mockResolvedValue([]);

    renderHook(() => useMerchants());

    await waitFor(() => {
      expect(mockFetchMerchants).toHaveBeenCalled();
    });
  });
});
