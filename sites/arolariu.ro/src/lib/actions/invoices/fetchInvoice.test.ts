import {InvoiceBuilder} from "@/data/mocks";
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
  const mockToken = "mock-token";

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch a single invoice successfully", async () => {
    const mockInvoice = new InvoiceBuilder().withId("test-invoice-id").build();

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockInvoice,
    });

    const result = await fetchInvoice({invoiceId: mockInvoice.id});

    expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(`http://mock-api/rest/v1/invoices/${mockInvoice.id}`, {
      headers: {
        Authorization: `Bearer ${mockToken}`,
        "Content-Type": "application/json",
      },
    });
    expect(result).toEqual(mockInvoice);
  });

  it("should throw an error if fetch fails", async () => {
    const mockInvoice = new InvoiceBuilder().withId("test-invoice-id").build();
    const errorMessage = "Not Found";

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => errorMessage,
    });

    await expect(fetchInvoice({invoiceId: mockInvoice.id})).rejects.toThrow(
      `BFF fetch invoice request failed: 404 Not Found - ${errorMessage}`,
    );
  });

  it("should throw an error if fetchBFFUserFromAuthService fails", async () => {
    const mockInvoice = new InvoiceBuilder().withId("test-invoice-id").build();
    const error = new Error("Auth failed");

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockRejectedValue(error);

    await expect(fetchInvoice({invoiceId: mockInvoice.id})).rejects.toThrow("Auth failed");
  });
});
