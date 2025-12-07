import {InvoiceBuilder} from "@/data/mocks/invoice";
import type {Invoice} from "@/types/invoices";
import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {useInvoice} from "./useInvoice";

// Type alias for store selector to improve readability
type InvoicesStoreSelector = (state: {invoices: Invoice[]; upsertInvoice: (invoice: Invoice) => void; hasHydrated: boolean}) => unknown;

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
        hasHydrated: false,
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

    // Update mock to return the invoice after fetch and set hasHydrated to true
    let storeInvoices: Invoice[] = [];
    let hasHydrated = false;
    mockUseInvoicesStore.mockImplementation((selector: InvoicesStoreSelector) => {
      const state = {
        invoices: storeInvoices,
        upsertInvoice: (invoice: Invoice) => {
          storeInvoices = [invoice];
          hasHydrated = true;
          mockupsertInvoice(invoice);
        },
        hasHydrated,
      };
      return selector(state);
    });

    const {result, rerender} = renderHook(() => useInvoice({invoiceIdentifier: "invoice-123"}));

    // Wait for fetch to complete
    await waitFor(() => {
      expect(mockFetchInvoice).toHaveBeenCalledWith({invoiceId: "invoice-123"});
    });

    // Simulate hydration completing
    hasHydrated = true;

    // Rerender to pick up the updated store state
    rerender();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.invoice).toEqual(mockInvoice);
    expect(result.current.isError).toBe(false);
  });

  it("should handle fetch errors", async () => {
    mockFetchInvoice.mockRejectedValue(new Error("Failed to fetch"));

    // Set hasHydrated to true so isLoading becomes false
    mockUseInvoicesStore.mockImplementation((selector: InvoicesStoreSelector) => {
      const state = {
        invoices: [] as Invoice[],
        upsertInvoice: mockupsertInvoice,
        hasHydrated: true,
      };
      return selector(state);
    });

    const {result} = renderHook(() => useInvoice({invoiceIdentifier: "invoice-123"}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.invoice).toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("should set loading state during fetch", async () => {
    let resolvePromise: (value: Invoice) => void;
    const promise = new Promise<Invoice>((resolve) => {
      resolvePromise = resolve;
    });

    mockFetchInvoice.mockReturnValue(promise);

    // Start with hasHydrated false (loading state)
    let hasHydrated = false;
    mockUseInvoicesStore.mockImplementation((selector: InvoicesStoreSelector) => {
      const state = {
        invoices: [] as Invoice[],
        upsertInvoice: mockupsertInvoice,
        hasHydrated,
      };
      return selector(state);
    });

    const {result, rerender} = renderHook(() => useInvoice({invoiceIdentifier: "invoice-123"}));

    // Should be loading initially (hasHydrated is false)
    expect(result.current.isLoading).toBe(true);
    expect(result.current.invoice).toBeNull();

    // Resolve the promise
    const mockInvoice = new InvoiceBuilder().withId("invoice-123").withName("Test").build();
    resolvePromise!(mockInvoice);

    // Simulate hydration completing
    hasHydrated = true;
    rerender();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should maintain invoice state on error", async () => {
    mockFetchInvoice.mockRejectedValue(new Error("Network error"));

    // Set hasHydrated to true so isLoading becomes false
    mockUseInvoicesStore.mockImplementation((selector: InvoicesStoreSelector) => {
      const state = {
        invoices: [] as Invoice[],
        upsertInvoice: mockupsertInvoice,
        hasHydrated: true,
      };
      return selector(state);
    });

    const {result} = renderHook(() => useInvoice({invoiceIdentifier: "invoice-123"}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.invoice).toBeNull();
  });
});
