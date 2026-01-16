/**
 * @fileoverview Tests for createInvoiceFromScans server action.
 * @module app/domains/invoices/view-scans/_actions/createInvoiceFromScans.test
 */

import {InvoiceScanType} from "@/types/invoices";
import type {Scan} from "@/types/scans";
import {ScanStatus, ScanType} from "@/types/scans";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

// Mock instrumentation.server
vi.mock("@/instrumentation.server", () => ({
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
  withSpan: vi.fn((name: string, fn: () => Promise<unknown>) => fn()),
}));

// Mock fetchUser
const mockFetchBFFUser = vi.fn();
vi.mock("@/lib/actions/user/fetchUser", () => ({
  fetchBFFUserFromAuthService: () => mockFetchBFFUser(),
}));

// Mock utils.server
vi.mock("@/lib/utils.server", () => ({
  API_URL: "https://api.test.com",
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocks
import {createInvoiceFromScans} from "./createInvoiceFromScans";

/**
 * Creates a test scan with default values
 */
function createTestScan(id: string, overrides: Partial<Scan> = {}): Scan {
  return {
    id,
    userIdentifier: "test-user",
    name: `Scan ${id}`,
    blobUrl: `https://storage.blob.core.windows.net/scans/${id}.jpg`,
    mimeType: "image/jpeg",
    sizeInBytes: 1024,
    scanType: ScanType.JPEG,
    uploadedAt: new Date("2024-01-01"),
    status: ScanStatus.READY,
    metadata: {},
    ...overrides,
  };
}

/**
 * Creates a mock invoice response
 */
function createMockInvoice(id: string) {
  return {
    id,
    userIdentifier: "test-user",
    createdAt: new Date().toISOString(),
    paymentInformation: {
      transactionDate: new Date().toISOString(),
      currency: {code: "USD", name: "US Dollar", symbol: "$"},
      totalAmount: 100,
    },
  };
}

describe("createInvoiceFromScans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchBFFUser.mockResolvedValue({
      userIdentifier: "test-user-guid",
      userJwt: "mock-jwt-token",
      user: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("single mode", () => {
    it("should create one invoice per scan", async () => {
      const scans = [createTestScan("scan-1"), createTestScan("scan-2")];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createMockInvoice("invoice-1")),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createMockInvoice("invoice-2")),
        });

      const result = await createInvoiceFromScans({scans, mode: "single"});

      expect(result.invoices).toHaveLength(2);
      expect(result.convertedScanIds).toEqual(["scan-1", "scan-2"]);
      expect(result.errors).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should handle partial failures in single mode", async () => {
      const scans = [createTestScan("scan-1"), createTestScan("scan-2"), createTestScan("scan-3")];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createMockInvoice("invoice-1")),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Internal server error"),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createMockInvoice("invoice-3")),
        });

      const result = await createInvoiceFromScans({scans, mode: "single"});

      expect(result.invoices).toHaveLength(2);
      expect(result.convertedScanIds).toEqual(["scan-1", "scan-3"]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.scanId).toBe("scan-2");
    });

    it("should handle all failures in single mode", async () => {
      const scans = [createTestScan("scan-1"), createTestScan("scan-2")];

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Bad request"),
      });

      const result = await createInvoiceFromScans({scans, mode: "single"});

      expect(result.invoices).toHaveLength(0);
      expect(result.convertedScanIds).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
    });

    it("should handle empty scans array", async () => {
      const result = await createInvoiceFromScans({scans: [], mode: "single"});

      expect(result.invoices).toHaveLength(0);
      expect(result.convertedScanIds).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("batch mode", () => {
    it("should create one invoice with all scans attached", async () => {
      const scans = [createTestScan("scan-1"), createTestScan("scan-2"), createTestScan("scan-3")];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createMockInvoice("invoice-batch")),
        })
        .mockResolvedValueOnce({ok: true}) // attach scan-2
        .mockResolvedValueOnce({ok: true}); // attach scan-3

      const result = await createInvoiceFromScans({scans, mode: "batch"});

      expect(result.invoices).toHaveLength(1);
      expect(result.invoices[0]?.id).toBe("invoice-batch");
      expect(result.convertedScanIds).toEqual(["scan-1", "scan-2", "scan-3"]);
      expect(result.errors).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("should handle attachment failures in batch mode", async () => {
      const scans = [createTestScan("scan-1"), createTestScan("scan-2"), createTestScan("scan-3")];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createMockInvoice("invoice-batch")),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Attachment failed"),
        })
        .mockResolvedValueOnce({ok: true});

      const result = await createInvoiceFromScans({scans, mode: "batch"});

      expect(result.invoices).toHaveLength(1);
      expect(result.convertedScanIds).toEqual(["scan-1", "scan-3"]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.scanId).toBe("scan-2");
    });

    it("should handle non-Error thrown values during attachment in batch mode", async () => {
      const scans = [createTestScan("scan-1"), createTestScan("scan-2")];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createMockInvoice("invoice-batch")),
        })
        .mockRejectedValueOnce("String error during attachment");

      const result = await createInvoiceFromScans({scans, mode: "batch"});

      expect(result.invoices).toHaveLength(1);
      expect(result.convertedScanIds).toEqual(["scan-1"]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.error).toBe("Unknown error");
    });

    it("should handle non-Error thrown values during initial batch creation", async () => {
      const scans = [createTestScan("scan-1"), createTestScan("scan-2")];

      mockFetch.mockRejectedValueOnce("String error");

      const result = await createInvoiceFromScans({scans, mode: "batch"});

      expect(result.invoices).toHaveLength(0);
      expect(result.convertedScanIds).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.every((e) => e.error === "Unknown error")).toBe(true);
    });

    it("should fail all scans when initial invoice creation fails", async () => {
      const scans = [createTestScan("scan-1"), createTestScan("scan-2")];

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Invoice creation failed"),
      });

      const result = await createInvoiceFromScans({scans, mode: "batch"});

      expect(result.invoices).toHaveLength(0);
      expect(result.convertedScanIds).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.every((e) => e.error.includes("Failed to create invoice"))).toBe(true);
    });

    it("should throw error for empty scans array in batch mode", async () => {
      await expect(createInvoiceFromScans({scans: [], mode: "batch"})).rejects.toThrow("No scans provided for batch creation");
    });

    it("should work with single scan in batch mode", async () => {
      const scans = [createTestScan("scan-1")];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockInvoice("invoice-single-batch")),
      });

      const result = await createInvoiceFromScans({scans, mode: "batch"});

      expect(result.invoices).toHaveLength(1);
      expect(result.convertedScanIds).toEqual(["scan-1"]);
      expect(result.errors).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("scan type mapping", () => {
    it("should map JPEG scan type correctly", async () => {
      const scans = [createTestScan("scan-1", {scanType: ScanType.JPEG})];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockInvoice("invoice-1")),
      });

      await createInvoiceFromScans({scans, mode: "single"});

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall?.[1]?.body as string);
      expect(body.initialScan.scanType).toBe(InvoiceScanType.JPEG);
    });

    it("should map PNG scan type correctly", async () => {
      const scans = [createTestScan("scan-1", {scanType: ScanType.PNG})];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockInvoice("invoice-1")),
      });

      await createInvoiceFromScans({scans, mode: "single"});

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall?.[1]?.body as string);
      expect(body.initialScan.scanType).toBe(InvoiceScanType.PNG);
    });

    it("should map PDF scan type correctly", async () => {
      const scans = [createTestScan("scan-1", {scanType: ScanType.PDF})];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockInvoice("invoice-1")),
      });

      await createInvoiceFromScans({scans, mode: "single"});

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall?.[1]?.body as string);
      expect(body.initialScan.scanType).toBe(InvoiceScanType.PDF);
    });

    it("should map unknown scan type to OTHER", async () => {
      const scans = [createTestScan("scan-1", {scanType: "UNKNOWN" as ScanType})];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockInvoice("invoice-1")),
      });

      await createInvoiceFromScans({scans, mode: "single"});

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall?.[1]?.body as string);
      expect(body.initialScan.scanType).toBe(InvoiceScanType.OTHER);
    });
  });

  describe("authentication", () => {
    it("should throw error when user is not authenticated", async () => {
      mockFetchBFFUser.mockResolvedValue({
        userIdentifier: null,
        userJwt: "token",
        user: null,
      });

      const scans = [createTestScan("scan-1")];

      await expect(createInvoiceFromScans({scans, mode: "single"})).rejects.toThrow("User must be authenticated to create invoices");
    });

    it("should throw error when userIdentifier is empty string", async () => {
      mockFetchBFFUser.mockResolvedValue({
        userIdentifier: "",
        userJwt: "token",
        user: null,
      });

      const scans = [createTestScan("scan-1")];

      await expect(createInvoiceFromScans({scans, mode: "single"})).rejects.toThrow("User must be authenticated to create invoices");
    });

    it("should use JWT token for authorization header", async () => {
      const scans = [createTestScan("scan-1")];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockInvoice("invoice-1")),
      });

      await createInvoiceFromScans({scans, mode: "single"});

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall?.[1]?.headers?.Authorization).toBe("Bearer mock-jwt-token");
    });
  });

  describe("API payload", () => {
    it("should send correct payload for invoice creation", async () => {
      const scans = [createTestScan("scan-1", {blobUrl: "https://storage.test.com/scan-1.jpg"})];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockInvoice("invoice-1")),
      });

      await createInvoiceFromScans({scans, mode: "single"});

      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall?.[1]?.body as string);

      expect(body.userIdentifier).toBe("test-user-guid");
      expect(body.initialScan.location).toBe("https://storage.test.com/scan-1.jpg");
      expect(body.metadata.sourceScanId).toBe("scan-1");
      expect(body.metadata.isImportant).toBe("false");
      expect(body.metadata.requiresAnalysis).toBe("true");
    });

    it("should send correct payload for scan attachment", async () => {
      const scans = [createTestScan("scan-1"), createTestScan("scan-2", {blobUrl: "https://storage.test.com/scan-2.png", scanType: ScanType.PNG})];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(createMockInvoice("invoice-batch")),
        })
        .mockResolvedValueOnce({ok: true});

      await createInvoiceFromScans({scans, mode: "batch"});

      // Check attachment call
      const attachCall = mockFetch.mock.calls[1];
      expect(attachCall?.[0]).toBe("https://api.test.com/rest/v1/invoices/invoice-batch/scans");

      const body = JSON.parse(attachCall?.[1]?.body as string);
      expect(body.type).toBe(InvoiceScanType.PNG);
      expect(body.location).toBe("https://storage.test.com/scan-2.png");
      expect(body.additionalMetadata.sourceScanId).toBe("scan-2");
      expect(body.additionalMetadata.attachedAt).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("should handle fetch network errors", async () => {
      const scans = [createTestScan("scan-1")];

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await createInvoiceFromScans({scans, mode: "single"});

      expect(result.invoices).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.error).toContain("Network error");
    });

    it("should handle auth service errors", async () => {
      mockFetchBFFUser.mockRejectedValue(new Error("Auth service unavailable"));

      const scans = [createTestScan("scan-1")];

      await expect(createInvoiceFromScans({scans, mode: "single"})).rejects.toThrow("Auth service unavailable");
    });

    it("should handle non-Error thrown values", async () => {
      const scans = [createTestScan("scan-1")];

      mockFetch.mockRejectedValueOnce("String error");

      const result = await createInvoiceFromScans({scans, mode: "single"});

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.error).toBe("Unknown error");
    });
  });
});
