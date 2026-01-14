/**
 * @fileoverview Unit tests for single-invoice fetch action.
 * @module sites/arolariu.ro/src/lib/actions/invoices/fetchInvoice/tests
 */

import {InvoiceBuilder} from "@/data/mocks";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import fetchInvoice from "./fetchInvoice";

// Create mock function using vi.hoisted for fetchWithTimeout
const {mockFetchWithTimeout} = vi.hoisted(() => ({
  mockFetchWithTimeout: vi.fn(),
}));

// Mock dependencies
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((_name, fn) => fn()),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
}));

vi.mock("../../utils.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../utils.server")>();
  return {
    ...actual,
    API_URL: "https://mock-api",
    fetchWithTimeout: mockFetchWithTimeout,
  };
});

vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: vi.fn(),
}));

describe("fetchInvoice", () => {
  const mockToken = "mock-token";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch a single invoice successfully", async () => {
    const mockInvoice = new InvoiceBuilder().build();

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    mockFetchWithTimeout.mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    });

    const result = await fetchInvoice({invoiceId: mockInvoice.id});

    expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
    expect(mockFetchWithTimeout).toHaveBeenCalledWith(`https://mock-api/rest/v1/invoices/${mockInvoice.id}`, {
      headers: {
        Authorization: `Bearer ${mockToken}`,
        "Content-Type": "application/json",
      },
    });
    expect(result).toEqual({success: true, data: mockInvoice});
  });

  it("should return error result if fetch fails with HTTP error", async () => {
    const mockInvoice = new InvoiceBuilder().build();
    const errorMessage = "Not Found";

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    mockFetchWithTimeout.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => errorMessage,
    });

    const result = await fetchInvoice({invoiceId: mockInvoice.id});

    expect(result).toEqual({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Failed to fetch invoice: 404 Not Found",
        status: 404,
      },
    });
  });

  it("should return error result if fetchBFFUserFromAuthService fails", async () => {
    const mockInvoice = new InvoiceBuilder().build();
    const error = new Error("Auth failed");

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockRejectedValue(error);

    const result = await fetchInvoice({invoiceId: mockInvoice.id});

    expect(result).toEqual({
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: "Auth failed",
      },
    });
  });

  it("should return validation error for invalid invoice ID", async () => {
    const result = await fetchInvoice({invoiceId: "invalid-id"});

    expect(result).toEqual({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid invoice ID: invalid-id",
      },
    });
  });
});
