/**
 * @fileoverview Unit tests for the Azure Blob upload server action.
 * @module sites/arolariu.ro/src/lib/actions/storage/uploadBlob/tests
 */

import {createBlobClient} from "@/lib/azure/storageClient";
import {fetchConfigValue} from "@/lib/config/configProxy";
import {beforeEach, describe, expect, it, vi} from "vitest";
import uploadBlob from "./uploadBlob";

const mockCreateBlobClient = vi.mocked(createBlobClient);
const mockFetchConfigValue = vi.mocked(fetchConfigValue);
const base64Png = "data:image/png;base64,dGVzdA==";

describe("uploadBlob", () => {
  const mockGetContainerClient = vi.fn();
  const mockGetBlockBlobClient = vi.fn();
  const mockUploadData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockFetchConfigValue.mockResolvedValue("https://test.blob.core.windows.net");

    mockCreateBlobClient.mockResolvedValue({getContainerClient: mockGetContainerClient});

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
      base64Data: base64Png,
      metadata: {meta: "data"},
      blobName: "custom-name.png",
    });

    expect(mockFetchConfigValue).toHaveBeenCalledWith("Endpoints:Storage:Blob");
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
    await uploadBlob({containerName: "test-container", base64Data: base64Png});

    expect(mockGetBlockBlobClient).toHaveBeenCalledWith("test-uuid.png");
  });

  it("should log error if upload status is not 201", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockUploadData.mockResolvedValue({
      _response: {status: 400},
    });

    const result = await uploadBlob({containerName: "test-container", base64Data: base64Png});

    expect(consoleSpy).toHaveBeenCalledWith("Error uploading blob to Azure Storage", expect.any(Object));
    expect(result.status).toBe(400);
  });

  it("should handle exceptions and return 500 status", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchConfigValue.mockRejectedValue(new Error("Config error"));

    const result = await uploadBlob({containerName: "test-container", base64Data: base64Png});

    expect(consoleSpy).toHaveBeenCalledWith("Error uploading the blob to Azure Storage:", expect.any(Error));
    expect(result).toEqual({
      status: 500,
      blobIdentifier: "",
      blobName: "",
      blobUrl: "",
    });
  });
});
