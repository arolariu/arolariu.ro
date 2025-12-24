/**
 * @fileoverview Unit tests for the deleteInvoiceScan server action.
 * @module lib/actions/invoices/deleteInvoiceScan.test
 */

import {InvoiceBuilder} from "@/data/mocks";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import {deleteInvoiceScan} from "./deleteInvoiceScan";

// ============================================================================
// Mocks - Must be declared before imports that use them
// ============================================================================

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

// ============================================================================
// Tests
// ============================================================================

describe("deleteInvoiceScan", () => {
  const mockToken = "mock-token";
  const mockScanLocation = "https://storage.blob.core.windows.net/invoices/scan.jpg";

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful deletion", () => {
    it("should delete an invoice scan successfully", async () => {
      const mockInvoice = new InvoiceBuilder().build();

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      });

      await deleteInvoiceScan({invoiceId: mockInvoice.id, scanLocation: mockScanLocation});

      expect(fetchBFFUserFromAuthService).toHaveBeenCalled();
      const encodedLocation = encodeURIComponent(mockScanLocation);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        `https://mock-api/rest/v1/invoices/${mockInvoice.id}/scans?location=${encodedLocation}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${mockToken}`,
            "Content-Type": "application/json",
          },
        },
      );
    });

    it("should properly encode special characters in scan location", async () => {
      const mockInvoice = new InvoiceBuilder().build();
      const specialLocation = "https://storage.blob.core.windows.net/invoices/scan with spaces & symbols.jpg";

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      });

      await deleteInvoiceScan({invoiceId: mockInvoice.id, scanLocation: specialLocation});

      const encodedLocation = encodeURIComponent(specialLocation);
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining(`location=${encodedLocation}`), expect.any(Object));
    });
  });

  describe("input validation", () => {
    it("should throw an error for invalid invoiceId (not a GUID)", async () => {
      await expect(deleteInvoiceScan({invoiceId: "not-a-valid-guid", scanLocation: mockScanLocation})).rejects.toThrow();
    });

    it("should throw an error for empty invoiceId", async () => {
      await expect(deleteInvoiceScan({invoiceId: "", scanLocation: mockScanLocation})).rejects.toThrow();
    });

    it("should throw an error for empty scanLocation", async () => {
      const mockInvoice = new InvoiceBuilder().build();

      await expect(deleteInvoiceScan({invoiceId: mockInvoice.id, scanLocation: ""})).rejects.toThrow(
        "scanLocation must be a non-empty string",
      );
    });
  });

  describe("API error handling", () => {
    it("should throw an error if deletion fails with 404", async () => {
      const mockInvoice = new InvoiceBuilder().build();
      const errorMessage = "Invoice not found";

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: async () => errorMessage,
      });

      await expect(deleteInvoiceScan({invoiceId: mockInvoice.id, scanLocation: mockScanLocation})).rejects.toThrow(
        `BFF delete invoice scan request failed: 404 Not Found - ${errorMessage}`,
      );
    });

    it("should throw an error if deletion fails with 400 (e.g., last scan)", async () => {
      const mockInvoice = new InvoiceBuilder().build();
      const errorMessage = "Cannot delete the last scan from an invoice";

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: async () => errorMessage,
      });

      await expect(deleteInvoiceScan({invoiceId: mockInvoice.id, scanLocation: mockScanLocation})).rejects.toThrow(
        `BFF delete invoice scan request failed: 400 Bad Request - ${errorMessage}`,
      );
    });

    it("should throw an error if deletion fails with 403 (unauthorized)", async () => {
      const mockInvoice = new InvoiceBuilder().build();
      const errorMessage = "Forbidden";

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () => errorMessage,
      });

      await expect(deleteInvoiceScan({invoiceId: mockInvoice.id, scanLocation: mockScanLocation})).rejects.toThrow(
        `BFF delete invoice scan request failed: 403 Forbidden - ${errorMessage}`,
      );
    });

    it("should throw an error if deletion fails with 500 (server error)", async () => {
      const mockInvoice = new InvoiceBuilder().build();
      const errorMessage = "Internal Server Error";

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockResolvedValue({userJwt: mockToken});
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        text: async () => errorMessage,
      });

      await expect(deleteInvoiceScan({invoiceId: mockInvoice.id, scanLocation: mockScanLocation})).rejects.toThrow(
        `BFF delete invoice scan request failed: 500 Internal Server Error - ${errorMessage}`,
      );
    });
  });

  describe("authentication", () => {
    it("should throw an error if authentication fails", async () => {
      const mockInvoice = new InvoiceBuilder().build();

      (fetchBFFUserFromAuthService as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Authentication failed"));

      await expect(deleteInvoiceScan({invoiceId: mockInvoice.id, scanLocation: mockScanLocation})).rejects.toThrow("Authentication failed");

      // fetch should not be called if auth fails
      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });
});
