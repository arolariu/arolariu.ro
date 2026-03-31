/**
 * @fileoverview Unit tests for the Azure Blob fetch server action.
 * @module sites/arolariu.ro/src/lib/actions/storage/fetchBlob/tests
 */

import {beforeEach, describe, expect, it, vi} from "vitest";

const {mockDownload, mockGetBlockBlobClient, mockGetContainerClient, mockCreateBlobClient} = vi.hoisted(() => {
  const _mockGetContainerClient = vi.fn();
  return {
    mockDownload: vi.fn(),
    mockGetBlockBlobClient: vi.fn(),
    mockGetContainerClient: _mockGetContainerClient,
    mockCreateBlobClient: vi.fn().mockResolvedValue({getContainerClient: _mockGetContainerClient}),
  };
});

vi.mock("@/lib/azure/storageClient", () => ({
  createBlobClient: mockCreateBlobClient,
  rewriteAzuriteUrl: vi.fn((url: string) => url),
}));
vi.mock("./fetchConfig");

import {createBlobClient} from "@/lib/azure/storageClient";
import fetchBlob from "./fetchBlob";
import fetchConfigurationValue from "./fetchConfig";

describe("fetchBlob", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (fetchConfigurationValue as any).mockResolvedValue("https://test.blob.core.windows.net");

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

    expect(fetchConfigurationValue).toHaveBeenCalledWith("Endpoints:Storage:Blob");
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
    (fetchConfigurationValue as any).mockRejectedValue(new Error("Config error"));

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
