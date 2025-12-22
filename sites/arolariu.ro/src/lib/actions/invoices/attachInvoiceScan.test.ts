import {InvoiceBuilder} from "@/data/mocks";
import {InvoiceScanType} from "@/types/invoices";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import {attachInvoiceScan} from "./attachInvoiceScan";

// Mock dependencies
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((_name, fn) => fn()),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
}));

vi.mock("@/lib/utils.server", () => ({
  API_URL: "https://mock-api",
}));

vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: vi.fn(),
}));

describe("attachInvoiceScan", () => {
  const mockToken = "mock-token";

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should attach an invoice scan successfully", async () => {
    const mockInvoice = new InvoiceBuilder().build();
    const payload = {
      type: InvoiceScanType.JPEG,
      location: "https://storage.example.com/scan.jpg",
      additionalMetadata: {},
    };

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    });

    await attachInvoiceScan({invoiceId: mockInvoice.id, payload});

    expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
    expect(globalThis.fetch).toHaveBeenCalledWith(`https://mock-api/rest/v1/invoices/${mockInvoice.id}/scans`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mockToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  });

  it("should throw an error if attachment fails", async () => {
    const mockInvoice = new InvoiceBuilder().build();
    const payload = {
      type: InvoiceScanType.JPEG,
      location: "https://storage.example.com/scan.jpg",
      additionalMetadata: {},
    };
    const errorMessage = "Bad Request";

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => errorMessage,
    });

    await expect(attachInvoiceScan({invoiceId: mockInvoice.id, payload})).rejects.toThrow(
      `BFF attach invoice scan request failed: 400 Bad Request - ${errorMessage}`,
    );
  });
});
