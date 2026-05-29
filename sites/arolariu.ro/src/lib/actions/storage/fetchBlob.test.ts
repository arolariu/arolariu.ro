/**
 * @fileoverview Unit tests for the Azure Blob fetch server action.
 * @module sites/arolariu.ro/src/lib/actions/storage/fetchBlob/tests
 */

import {createBlobClient} from "@/lib/azure/storageClient";
import {fetchConfigValue} from "@/lib/config/configProxy";
import {beforeEach, describe, expect, it, vi} from "vitest";
import fetchBlob from "./fetchBlob";

const mockCreateBlobClient = vi.mocked(createBlobClient);
const mockFetchConfigValue = vi.mocked(fetchConfigValue);

describe("fetchBlob", () => {
  const mockDownload = vi.fn();
  const mockGetBlockBlobClient = vi.fn();
  const mockGetContainerClient = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockFetchConfigValue.mockResolvedValue("https://test.blob.core.windows.net");

    mockCreateBlobClient.mockResolvedValue({getContainerClient: mockGetContainerClient});

    mockDownload.mockResolvedValue({
      _response: {status: 200},
      metadata: {key: "value"},
    });

    mockGetBlockBlobClient.mockReturnValue({
      download: mockDownload,
      url: "https://test.blob.core.windows.net/container/blob.png",
    });

    mockGetContainerClient.mockReturnValue({
      getBlockBlobClient: mockGetBlockBlobClient,
    });
  });

  it("should fetch a blob successfully", async () => {
    const result = await fetchBlob({containerName: "test-container", blobName: "test-blob.png"});

    expect(mockFetchConfigValue).toHaveBeenCalledWith("Endpoints:Storage:Blob");
    expect(createBlobClient).toHaveBeenCalledWith("https://test.blob.core.windows.net");
    expect(mockGetContainerClient).toHaveBeenCalledWith("test-container");
    expect(mockGetBlockBlobClient).toHaveBeenCalledWith("test-blob.png");
    expect(mockDownload).toHaveBeenCalled();

    expect(result).toEqual({
      status: 200,
      blobIdentifier: "test-blob",
      blobName: "test-blob.png",
      blobUrl: "https://test.blob.core.windows.net/container/blob.png",
      blobMetadata: {key: "value"},
    });
  });

  it("should handle errors and return 500 status", async () => {
    mockFetchConfigValue.mockRejectedValue(new Error("Config error"));

    const result = await fetchBlob({containerName: "test-container", blobName: "test-blob.png"});

    expect(result).toEqual({
      status: 500,
      blobIdentifier: "",
      blobName: "",
      blobUrl: "",
      blobMetadata: {},
    });
  });
});
