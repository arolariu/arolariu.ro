/**
 * @fileoverview Unit tests for createInvoiceScan server action.
 * @module app/domains/invoices/_actions/invoices/scans/createInvoiceScan.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";
import type {ServerActionResult} from "@/lib/utils.server";

// Mock Azure SDK response
type MockUploadResponse = {
  _response: {
    status: number;
  };
};

const mockUploadData = vi.fn<() => Promise<MockUploadResponse>>();
const mockGetBlockBlobClient = vi.fn(() => ({
  uploadData: mockUploadData,
  url: "https://storage.test/invoices/scan.jpg",
}));
const mockGetContainerClient = vi.fn(() => ({
  getBlockBlobClient: mockGetBlockBlobClient,
}));

vi.mock("@/lib/azure/storageClient", () => ({
  createBlobClient: vi.fn(() => ({
    getContainerClient: mockGetContainerClient,
  })),
}));

vi.mock("@/lib/actions/storage/fetchConfig", () => ({
  default: vi.fn(() => Promise.resolve("https://storage.test")),
}));

vi.mock("@/lib/utils.server", () => ({
  createErrorResult: vi.fn(<T>(error: unknown, defaultMessage = "Something went wrong") =>
    Promise.resolve({
      success: false as const,
      error: {
        code: "NETWORK_ERROR" as const,
        message: error instanceof Error ? error.message : defaultMessage,
      },
    } as ServerActionResult<T>),
  ),
  convertBase64ToBlob: vi.fn((base64Data: string) => {
    const cleanedBase64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    const mockBlob = new Blob([cleanedBase64], {type: "image/jpeg"});
    Object.defineProperty(mockBlob, "size", {value: 1024, writable: false});
    return Promise.resolve(mockBlob);
  }),
  DEFAULT_FETCH_TIMEOUT: 30_000,
}));

const {createInvoiceScan} = await import("./createInvoiceScan");

describe("createInvoiceScan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadData.mockResolvedValue({
      _response: {
        status: 201,
      },
    });
  });

  it("uploads a base64 scan blob with invoice metadata", async () => {
    const base64Data = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBD";
    const blobName = "scan-123.jpg";
    const metadata = {uploadedBy: "user-1", invoiceId: "inv-1"};

    const result = await createInvoiceScan({base64Data, blobName, metadata});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe(201);
      expect(result.data.blobUrl).toBe("https://storage.test/invoices/scan.jpg");
    }

    expect(mockGetContainerClient).toHaveBeenCalledWith("invoices");
    expect(mockGetBlockBlobClient).toHaveBeenCalledWith("scan-123.jpg");
    expect(mockUploadData).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      expect.objectContaining({
        blobHTTPHeaders: {
          blobContentType: "image/jpeg",
        },
        metadata: expect.objectContaining({
          uploadedBy: "user-1",
          invoiceId: "inv-1",
          blobName: "scan-123.jpg",
          approximateSizeInMb: expect.any(String),
          type: "image/jpeg",
        }),
      }),
    );
  });

  it("returns an error result when Azure upload status is not 201", async () => {
    mockUploadData.mockResolvedValue({
      _response: {
        status: 500,
      },
    });

    const result = await createInvoiceScan({
      base64Data: "data:image/jpeg;base64,test",
      blobName: "scan.jpg",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("500");
      expect(result.error.message).toContain("Failed to upload invoice scan");
    }
  });

  it("returns an error result for non-server Azure upload failures", async () => {
    mockUploadData.mockResolvedValue({
      _response: {
        status: 409,
      },
    });

    const result = await createInvoiceScan({
      base64Data: "data:image/jpeg;base64,test",
      blobName: "scan.jpg",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("409");
      expect(result.error.message).toContain("Failed to upload invoice scan");
    }
  });

  it("returns an error result when blob conversion or storage throws", async () => {
    mockUploadData.mockRejectedValue(new Error("Azure storage unavailable"));

    const result = await createInvoiceScan({
      base64Data: "data:image/jpeg;base64,test",
      blobName: "scan.jpg",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Azure storage unavailable");
    }
  });

  it("handles Azure throwing a non-Error object", async () => {
    mockUploadData.mockRejectedValue("String error");

    const result = await createInvoiceScan({
      base64Data: "data:image/jpeg;base64,test",
      blobName: "scan.jpg",
    });

    expect(result.success).toBe(false);
  });
});
