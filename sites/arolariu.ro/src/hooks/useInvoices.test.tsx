import type {Invoice} from "@/types/invoices";
import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {useInvoices} from "./useInvoices";

// Create mock functions using vi.hoisted
const {mockFetchInvoices, mockSetInvoices, mockUseInvoicesStore} = vi.hoisted(() => ({
  mockFetchInvoices: vi.fn(),
  mockSetInvoices: vi.fn(),
  mockUseInvoicesStore: vi.fn(),
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

vi.mock("@/lib/actions/invoices/fetchInvoices", () => ({
  default: mockFetchInvoices,
}));

vi.mock("@/stores", () => ({
  useInvoicesStore: mockUseInvoicesStore,
}));

describe("useInvoices", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.clearAllMocks();

    // Setup default mock implementation for useInvoicesStore
    mockUseInvoicesStore.mockImplementation(
      (selector: (state: {invoices: Invoice[]; setInvoices: (invoices: Invoice[]) => void}) => unknown) => {
        const state = {
          invoices: [],
          setInvoices: mockSetInvoices,
        };
        return selector(state);
      },
    );
  });

  afterEach(() => {
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore();
    }
  });

  it("should return empty invoices array initially", async () => {
    mockFetchInvoices.mockResolvedValue([]);

    const {result} = renderHook(() => useInvoices());

    expect(result.current.invoices).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isError).toBe(false);
  });

  it("should fetch and return invoices successfully", async () => {
    const mockInvoices: Partial<Invoice>[] = [
      {id: "invoice-1", name: "Invoice 1"},
      {id: "invoice-2", name: "Invoice 2"},
    ];

    mockFetchInvoices.mockResolvedValue(mockInvoices);

    const {result} = renderHook(() => useInvoices());

    await waitFor(() => {
      expect(mockFetchInvoices).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockSetInvoices).toHaveBeenCalledWith(mockInvoices);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should set loading state during fetch", async () => {
    // Use a controlled promise to test loading states
    let resolveFunc: (value: never[]) => void;
    const promise = new Promise<never[]>((resolve) => {
      resolveFunc = resolve;
    });

    mockFetchInvoices.mockReturnValue(promise);

    const {result, unmount} = renderHook(() => useInvoices());

    try {
      // Wait for loading to start
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(true);
        },
        {timeout: 2000},
      );

      // Resolve the promise
      resolveFunc!([]);

      // Wait for loading to finish
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        {timeout: 2000},
      );
    } finally {
      // Ensure cleanup
      unmount();
    }
  });

  it("should handle fetch error", async () => {
    const mockError = new Error("Fetch failed");
    mockFetchInvoices.mockRejectedValue(mockError);

    const {result} = renderHook(() => useInvoices());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(">>> Error fetching invoices in useInvoices hook:", mockError);
  });

  it("should handle network error gracefully", async () => {
    mockFetchInvoices.mockRejectedValue(new Error("Network error"));

    const {result} = renderHook(() => useInvoices());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should always fetch regardless of userInformation state", async () => {
    mockFetchInvoices.mockResolvedValue([]);

    renderHook(() => useInvoices());

    await waitFor(() => {
      expect(mockFetchInvoices).toHaveBeenCalled();
    });
  });
});
