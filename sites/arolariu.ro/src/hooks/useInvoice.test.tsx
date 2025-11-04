import {renderHook, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {useInvoice} from "./useInvoice";
import type {Invoice} from "@/types/invoices";

// Create mock function using vi.hoisted
const {mockFetchInvoice} = vi.hoisted(() => ({
  mockFetchInvoice: vi.fn(),
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

vi.mock("@/lib/actions/invoices/fetchInvoice", () => ({
  default: mockFetchInvoice,
}));

describe("useInvoice", () => {
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

  it("should initialize with null invoice and loading state", () => {
    mockFetchInvoice.mockResolvedValue({
      id: "invoice-123",
      name: "Test Invoice",
    });

    const {result} = renderHook(() => useInvoice({invoiceIdentifier: "invoice-123"}));

    expect(result.current.invoice).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it("should fetch invoice successfully", async () => {
    const mockInvoice: Partial<Invoice> = {
      id: "invoice-123",
      name: "Test Invoice",
      totalAmount: 100.5,
    };

    mockFetchInvoice.mockResolvedValue(mockInvoice);

    const {result} = renderHook(() => useInvoice({invoiceIdentifier: "invoice-123"}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.invoice).toEqual(mockInvoice);
    expect(result.current.isError).toBe(false);
    expect(mockFetchInvoice).toHaveBeenCalledWith("invoice-123", "test-jwt-token");
  });

  it("should handle fetch errors", async () => {
    mockFetchInvoice.mockRejectedValue(new Error("Failed to fetch"));

    const {result} = renderHook(() => useInvoice({invoiceIdentifier: "invoice-123"}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.invoice).toBeNull();
    expect(result.current.isError).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("should set loading state during fetch", async () => {
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockFetchInvoice.mockReturnValue(promise);

    const {result} = renderHook(() => useInvoice({invoiceIdentifier: "invoice-123"}));

    // Should be loading initially
    expect(result.current.isLoading).toBe(true);
    expect(result.current.invoice).toBeNull();

    // Resolve the promise
    resolvePromise!({id: "invoice-123", name: "Test"});

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should maintain invoice state on error", async () => {
    mockFetchInvoice.mockRejectedValue(new Error("Network error"));

    const {result} = renderHook(() => useInvoice({invoiceIdentifier: "invoice-123"}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.invoice).toBeNull();
    expect(result.current.isError).toBe(true);
  });
});
