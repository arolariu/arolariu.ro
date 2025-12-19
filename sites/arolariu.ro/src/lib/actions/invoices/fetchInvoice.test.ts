import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import fetchInvoice from "./fetchInvoice";

// Mock dependencies
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((name, fn) => fn()),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
}));

vi.mock("../../utils.server", () => ({
  API_URL: "http://mock-api",
}));

vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: vi.fn(),
}));

describe("fetchInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch a single invoice successfully", async () => {
    const mockInvoice = {id: "1", totalAmount: 100};
    const mockToken = "mock-token";
    const invoiceId = "1";

    (fetchBFFUserFromAuthService as any).mockResolvedValue({userJwt: mockToken});
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    });

    const result = await fetchInvoice({invoiceId});

    expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(`http://mock-api/rest/v1/invoices/${invoiceId}`, {
      headers: {
        Authorization: `Bearer ${mockToken}`,
        "Content-Type": "application/json",
      },
    });
    expect(result).toEqual(mockInvoice);
  });

  it("should throw an error if fetch fails", async () => {
    const mockToken = "mock-token";
    const invoiceId = "1";
    const errorMessage = "Not Found";

    (fetchBFFUserFromAuthService as any).mockResolvedValue({userJwt: mockToken});
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => errorMessage,
    });

    await expect(fetchInvoice({invoiceId})).rejects.toThrow(`BFF fetch invoice request failed: 404 Not Found - ${errorMessage}`);
  });

  it("should throw an error if fetchBFFUserFromAuthService fails", async () => {
    const error = new Error("Auth failed");
    const invoiceId = "1";
    (fetchBFFUserFromAuthService as any).mockRejectedValue(error);

    await expect(fetchInvoice({invoiceId})).rejects.toThrow("Auth failed");
  });
});
