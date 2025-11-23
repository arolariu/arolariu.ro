import {BlobServiceClient} from "@azure/storage-blob";
import {beforeEach, describe, expect, it, vi} from "vitest";
import fetchBlob from "./fetchBlob";
import fetchConfigurationValue from "./fetchConfig";

vi.mock("@azure/identity");
vi.mock("@azure/storage-blob");
vi.mock("./fetchConfig");

describe("fetchBlob", () => {
  const mockDownload = vi.fn();
  const mockGetBlockBlobClient = vi.fn();
  const mockGetContainerClient = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (fetchConfigurationValue as any).mockResolvedValue("https://test.blob.core.windows.net");

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

    (BlobServiceClient as any).mockImplementation(function () {
      return {
        getContainerClient: mockGetContainerClient,
      };
    });
  });

  it("should fetch a blob successfully", async () => {
    const result = await fetchBlob("test-container", "test-blob.png");

    expect(fetchConfigurationValue).toHaveBeenCalledWith("AzureOptions:StorageAccountEndpoint");
    expect(BlobServiceClient).toHaveBeenCalledWith("https://test.blob.core.windows.net", expect.any(Object));
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

    const result = await fetchBlob("test-container", "test-blob.png");

    expect(result).toEqual({
      status: 500,
      blobIdentifier: "",
      blobName: "",
      blobUrl: "",
      blobMetadata: {},
    });
  });
});
