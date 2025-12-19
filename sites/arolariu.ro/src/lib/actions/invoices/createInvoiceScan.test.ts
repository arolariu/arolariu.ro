import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createInvoiceScan} from "./createInvoiceScan";

// Mock dependencies
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((name, fn) => fn()),
}));

vi.mock("@/lib/utils.server", () => ({
  convertBase64ToBlob: vi.fn(),
}));

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn(),
}));

const mockUploadData = vi.fn();
const mockGetBlockBlobClient = vi.fn(() => ({
  uploadData: mockUploadData,
  url: "http://mock-blob-url",
}));
const mockGetContainerClient = vi.fn(() => ({
  getBlockBlobClient: mockGetBlockBlobClient,
}));

vi.mock("@azure/storage-blob", () => {
  return {
    BlobServiceClient: class {
      getContainerClient = mockGetContainerClient;
    },
  };
});

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
      blobUrl: "http://mock-blob-url",
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
      blobUrl: "http://mock-blob-url",
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
