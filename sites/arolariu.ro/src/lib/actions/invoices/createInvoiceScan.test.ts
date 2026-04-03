/**
 * @fileoverview Unit tests for invoice scan creation (blob upload) action.
 * @module sites/arolariu.ro/src/lib/actions/invoices/createInvoiceScan/tests
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createInvoiceScan} from "./createInvoiceScan";

// Hoist mock functions so they're available in vi.mock factories
const {mockUploadData, mockGetBlockBlobClient, mockGetContainerClient} = vi.hoisted(() => {
  const _mockUploadData = vi.fn();
  const _mockGetBlockBlobClient = vi.fn(() => ({
    uploadData: _mockUploadData,
    url: "https://mock-blob-url",
  }));
  const _mockGetContainerClient = vi.fn(() => ({
    getBlockBlobClient: _mockGetBlockBlobClient,
  }));
  return {
    mockUploadData: _mockUploadData,
    mockGetBlockBlobClient: _mockGetBlockBlobClient,
    mockGetContainerClient: _mockGetContainerClient,
  };
});

// Mock dependencies
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((_name: string, fn: () => unknown) => fn()),
  logWithTrace: vi.fn(),
  addSpanEvent: vi.fn(),
  getTraceparentHeader: vi.fn(() => ""),
  injectTraceContextHeaders: vi.fn(() => ({})),
}));

vi.mock("@/lib/utils.server", () => ({
  convertBase64ToBlob: vi.fn(),
}));

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn(),
}));

vi.mock("@azure/storage-blob", () => {
  return {
    BlobServiceClient: class {
      getContainerClient = mockGetContainerClient;
    },
  };
});

// Mock storage config — prevent real fetch to config service
vi.mock("@/lib/actions/storage/fetchConfig", () => ({
  default: vi.fn().mockResolvedValue("http://mock-storage:10000/devstoreaccount1"),
}));

// Mock storageClient — delegate to hoisted mock chain
vi.mock("@/lib/azure/storageClient", () => ({
  createBlobClient: vi.fn(async () => ({
    getContainerClient: (...args: Parameters<typeof mockGetContainerClient>) => mockGetContainerClient(...args),
  })),
}));

import {convertBase64ToBlob} from "@/lib/utils.server";

describe("createInvoiceScan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should create an invoice scan successfully", async () => {
    const base64Data = "base64data";
    const blobName = "test-blob";
    const metadata = {key: "value"};

    const mockBlob = {
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      size: 1024,
      type: "image/png",
    };
    (convertBase64ToBlob as any).mockResolvedValue(mockBlob);

    mockUploadData.mockResolvedValue({
      _response: {status: 201},
    });

    const result = await createInvoiceScan({base64Data, blobName, metadata});

    expect(convertBase64ToBlob).toHaveBeenCalledWith(base64Data);
    expect(mockGetContainerClient).toHaveBeenCalledWith("invoices");
    expect(mockGetBlockBlobClient).toHaveBeenCalledWith(blobName);
    expect(mockUploadData).toHaveBeenCalled();
    expect(result).toEqual({
      status: 201,
      blobUrl: "https://mock-blob-url",
    });
  });

  it("should log error if upload status is not 201", async () => {
    const base64Data = "base64data";
    const blobName = "test-blob";

    const mockBlob = {
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      size: 1024,
      type: "image/png",
    };
    (convertBase64ToBlob as any).mockResolvedValue(mockBlob);

    mockUploadData.mockResolvedValue({
      _response: {status: 500},
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createInvoiceScan({base64Data, blobName});

    expect(consoleSpy).toHaveBeenCalledWith("Error uploading blob to Azure Storage", expect.anything());
    expect(result).toEqual({
      status: 500,
      blobUrl: "https://mock-blob-url",
    });
  });

  it("should throw error if upload fails", async () => {
    const base64Data = "base64data";
    const blobName = "test-blob";
    const error = new Error("Upload failed");

    (convertBase64ToBlob as any).mockRejectedValue(error);

    await expect(createInvoiceScan({base64Data, blobName})).rejects.toThrow("Upload failed");
  });
});
