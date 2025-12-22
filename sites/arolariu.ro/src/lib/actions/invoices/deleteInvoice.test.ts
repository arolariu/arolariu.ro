import {InvoiceBuilder} from "@/data/mocks";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import deleteInvoice from "./deleteInvoice";

// Mock dependencies
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((_name, fn) => fn()),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
}));

vi.mock("../../utils.server", () => ({
  API_URL: "https://mock-api",
}));

vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: vi.fn(),
}));

describe("deleteInvoice", () => {
  const mockToken = "mock-token";

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should delete an invoice successfully", async () => {
    const mockInvoice = new InvoiceBuilder().build();

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    });

    await deleteInvoice({invoiceId: mockInvoice.id});

    expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledWith(`https://mock-api/rest/v1/invoices/${mockInvoice.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${mockToken}`,
        "Content-Type": "application/json",
      },
    });
  });

  it("should throw an error if deletion fails", async () => {
    const mockInvoice = new InvoiceBuilder().build();
    const errorMessage = "Not Found";

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => errorMessage,
    });

    await expect(deleteInvoice({invoiceId: mockInvoice.id})).rejects.toThrow(
      `BFF delete invoice request failed: 404 Not Found - ${errorMessage}`,
    );
  });
});
