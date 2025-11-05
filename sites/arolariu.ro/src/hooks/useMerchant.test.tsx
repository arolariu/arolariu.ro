import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {useMerchant} from "./useMerchant";
import type {Merchant} from "@/types/invoices";

// Create mock function using vi.hoisted
const {mockFetchMerchant} = vi.hoisted(() => ({
  mockFetchMerchant: vi.fn(),
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

describe("useMerchant", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.clearAllMocks();
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
    const mockMerchant: Partial<Merchant> = {
      id: "merchant-123",
      name: "Test Merchant",
    };

    mockFetchMerchant.mockResolvedValue(mockMerchant);

    const {result} = renderHook(() => useMerchant({merchantIdentifier: "merchant-123"}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.merchant).toEqual(mockMerchant);
    expect(result.current.isError).toBe(false);
    expect(mockFetchMerchant).toHaveBeenCalledWith("merchant-123", "test-jwt-token");
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
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetchMerchant.mockReturnValue(promise);

    const {result} = renderHook(() => useMerchant({merchantIdentifier: "merchant-123"}));

    // Should be loading initially
    expect(result.current.isLoading).toBe(true);
    expect(result.current.merchant).toBeNull();

    // Resolve the promise
    resolvePromise!({id: "merchant-123", name: "Test"});

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
