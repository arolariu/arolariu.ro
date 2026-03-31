/**
 * @fileoverview Unit tests for the Azure Blob upload server action.
 * @module sites/arolariu.ro/src/lib/actions/storage/uploadBlob/tests
 */

import {beforeEach, describe, expect, it, vi} from "vitest";

const {mockConvertBase64ToBlob, mockGetContainerClient, mockGetBlockBlobClient, mockUploadData, mockArrayBuffer, mockCreateBlobClient} =
  vi.hoisted(() => {
    const _mockGetContainerClient = vi.fn();
    return {
      mockConvertBase64ToBlob: vi.fn(),
      mockGetContainerClient: _mockGetContainerClient,
      mockGetBlockBlobClient: vi.fn(),
      mockUploadData: vi.fn(),
      mockArrayBuffer: vi.fn(),
      mockCreateBlobClient: vi.fn().mockResolvedValue({getContainerClient: _mockGetContainerClient}),
    };
  });

// Override global mock with configurable createBlobClient
vi.mock("@/lib/azure/storageClient", () => ({
  createBlobClient: mockCreateBlobClient,
  rewriteAzuriteUrl: vi.fn((url: string) => url),
}));
vi.mock("./fetchConfig");
vi.mock("@/lib/utils.server", () => ({
  convertBase64ToBlob: mockConvertBase64ToBlob,
}));

import fetchConfigurationValue from "./fetchConfig";
import uploadBlob from "./uploadBlob";

describe("uploadBlob", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (fetchConfigurationValue as any).mockResolvedValue("https://test.blob.core.windows.net");

    mockCreateBlobClient.mockResolvedValue({getContainerClient: mockGetContainerClient});

    mockArrayBuffer.mockResolvedValue(new ArrayBuffer(8));
    mockConvertBase64ToBlob.mockResolvedValue({
      type: "image/png",
      size: 1024,
      arrayBuffer: mockArrayBuffer,
    });

    mockUploadData.mockResolvedValue({
      _response: {status: 201},
    });

    mockGetBlockBlobClient.mockReturnValue({
      uploadData: mockUploadData,
      url: "https://test.blob.core.windows.net/container/blob.png",
    });

    mockGetContainerClient.mockReturnValue({
      getBlockBlobClient: mockGetBlockBlobClient,
    });

    // Mock crypto.randomUUID
    globalThis.crypto.randomUUID = vi.fn().mockReturnValue("test-uuid");
  });

  it("should upload a blob successfully with provided name", async () => {
    const result = await uploadBlob({
      containerName: "test-container",
      base64Data: "base64data",
      metadata: {meta: "data"},
      blobName: "custom-name.png",
    });

    expect(mockConvertBase64ToBlob).toHaveBeenCalledWith("base64data");
    expect(fetchConfigurationValue).toHaveBeenCalledWith("Endpoints:Storage:Blob");
    expect(mockGetContainerClient).toHaveBeenCalledWith("test-container");
    expect(mockGetBlockBlobClient).toHaveBeenCalledWith("custom-name.png");

    expect(mockUploadData).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      expect.objectContaining({
        blobHTTPHeaders: {blobContentType: "image/png"},
        metadata: expect.objectContaining({
          meta: "data",
          officialBlobName: "custom-name.png",
          type: "image/png",
        }),
      }),
    );

    expect(result).toEqual({
      status: 201,
      blobIdentifier: "test-uuid",
      blobName: "custom-name.png",
      blobUrl: "https://test.blob.core.windows.net/container/blob.png",
      blobMetadata: expect.any(Object),
    });
  });

  it("should generate a blob name if not provided", async () => {
    await uploadBlob({containerName: "test-container", base64Data: "base64data"});

    expect(mockGetBlockBlobClient).toHaveBeenCalledWith("test-uuid.png");
  });

  it("should log error if upload status is not 201", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockUploadData.mockResolvedValue({
      _response: {status: 400},
    });

    const result = await uploadBlob({containerName: "test-container", base64Data: "base64data"});

    expect(consoleSpy).toHaveBeenCalledWith("Error uploading blob to Azure Storage", expect.any(Object));
    expect(result.status).toBe(400);
  });

  it("should handle exceptions and return 500 status", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (fetchConfigurationValue as any).mockRejectedValue(new Error("Config error"));

    const result = await uploadBlob({containerName: "test-container", base64Data: "base64data"});

    expect(consoleSpy).toHaveBeenCalledWith("Error uploading the blob to Azure Storage:", expect.any(Error));
    expect(result).toEqual({
      status: 500,
      blobIdentifier: "",
      blobName: "",
      blobUrl: "",
    });
  });
});
