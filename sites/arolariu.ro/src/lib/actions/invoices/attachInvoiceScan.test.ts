import {describe, expect, it, vi} from "vitest";
import {attachInvoiceScan, InvoiceScanPayload} from "./attachInvoiceScan";

// Mock API_URL
vi.mock("@/lib/utils.server", () => ({
  API_URL: "https://api.example.com",
}));

// Mock global fetch
global.fetch = vi.fn();

describe("attachInvoiceScan", () => {
  const mockToken = "mock-token";
  const mockInvoiceId = "invoice-123";
  const mockPayload: InvoiceScanPayload = {
    type: 1,
    location: "https://blob.example.com/scan.jpg",
    metadata: {},
  };

  it("should attach an invoice scan successfully", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
    });

    await attachInvoiceScan(mockInvoiceId, mockPayload, mockToken);

    expect(global.fetch).toHaveBeenCalledWith(`https://api.example.com/rest/v1/invoices/${mockInvoiceId}/scans`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mockToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mockPayload),
    });
  });

  it("should throw an error when the request fails", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => "Invalid payload",
    });

    await expect(attachInvoiceScan(mockInvoiceId, mockPayload, mockToken)).rejects.toThrow(
      "BFF attach invoice scan request failed: 400 Bad Request - Invalid payload",
    );
  });
});
