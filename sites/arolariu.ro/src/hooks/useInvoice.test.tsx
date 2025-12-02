import {InvoiceBuilder} from "@/data/mocks/invoice";
import type {Invoice} from "@/types/invoices";
import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {useInvoice} from "./useInvoice";

// Type alias for store selector to improve readability
type InvoicesStoreSelector = (state: {invoices: Invoice[]; upsertInvoice: (invoice: Invoice) => void}) => unknown;

// Create mock function using vi.hoisted
const {mockFetchInvoice, mockupsertInvoice, mockUseInvoicesStore} = vi.hoisted(() => ({
  mockFetchInvoice: vi.fn(),
  mockupsertInvoice: vi.fn(),
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

vi.mock("@/lib/actions/invoices/fetchInvoice", () => ({
  default: mockFetchInvoice,
}));

vi.mock("@/stores", () => ({
  useInvoicesStore: mockUseInvoicesStore,
}));

describe("useInvoice", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.clearAllMocks();

    // Setup default mock implementation for useInvoicesStore - starts with empty cache
    mockUseInvoicesStore.mockImplementation((selector: InvoicesStoreSelector) => {
      const state = {
        invoices: [] as Invoice[],
        upsertInvoice: mockupsertInvoice,
      };
      return selector(state);
    });
  });

  afterEach(() => {
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore();
    }
  });

  it("should initialize with null invoice and loading state", () => {
    const mockInvoice = new InvoiceBuilder().withId("invoice-123").withName("Test Invoice").build();

    mockFetchInvoice.mockResolvedValue(mockInvoice);

    const {result} = renderHook(() => useInvoice({invoiceIdentifier: "invoice-123"}));

    expect(result.current.invoice).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it("should fetch invoice successfully", async () => {
    const mockInvoice = new InvoiceBuilder().withId("invoice-123").withName("Test Invoice").build();

    mockFetchInvoice.mockResolvedValue(mockInvoice);

    // Update mock to return the invoice after fetch
    let storeInvoices: Invoice[] = [];
    mockUseInvoicesStore.mockImplementation((selector: InvoicesStoreSelector) => {
      const state = {
        invoices: storeInvoices,
        upsertInvoice: (invoice: Invoice) => {
          storeInvoices = [invoice];
          mockupsertInvoice(invoice);
        },
      };
      return selector(state);
    });

    const {result, rerender} = renderHook(() => useInvoice({invoiceIdentifier: "invoice-123"}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Rerender to pick up the updated store state
    rerender();

    expect(result.current.invoice).toEqual(mockInvoice);
    expect(result.current.isError).toBe(false);
    expect(mockFetchInvoice).toHaveBeenCalledWith({invoiceId: "invoice-123"});
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
    let resolvePromise: (value: Invoice) => void;
    const promise = new Promise<Invoice>((resolve) => {
      resolvePromise = resolve;
    });

    mockFetchInvoice.mockReturnValue(promise);

    const {result} = renderHook(() => useInvoice({invoiceIdentifier: "invoice-123"}));

    // Should be loading initially
    expect(result.current.isLoading).toBe(true);
    expect(result.current.invoice).toBeNull();

    // Resolve the promise
    const mockInvoice = new InvoiceBuilder().withId("invoice-123").withName("Test").build();
    resolvePromise!(mockInvoice);

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
