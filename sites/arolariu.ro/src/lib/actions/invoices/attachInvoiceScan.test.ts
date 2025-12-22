import {InvoiceBuilder} from "@/data/mocks";
import {InvoiceScanType} from "@/types/invoices";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import {attachInvoiceScan} from "./attachInvoiceScan";

// Mock dependencies
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((name, fn) => fn()),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
}));

vi.mock("@/lib/utils.server", () => ({
  API_URL: "http://mock-api",
}));

vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: vi.fn(),
}));

describe("attachInvoiceScan", () => {
  const mockToken = "mock-token";

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should attach an invoice scan successfully", async () => {
    const mockInvoice = new InvoiceBuilder().build();
    const payload = {
      scanType: InvoiceScanType.JPEG,
      location: "https://storage.example.com/scan.jpg",
      metadata: {},
    };

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    });

    await attachInvoiceScan({invoiceId: mockInvoice.id, payload});

    expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(`http://mock-api/rest/v1/invoices/${mockInvoice.id}/scans`, {
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
      scanType: InvoiceScanType.JPEG,
      location: "https://storage.example.com/scan.jpg",
      metadata: {},
    };
    const errorMessage = "Bad Request";

    (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
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
