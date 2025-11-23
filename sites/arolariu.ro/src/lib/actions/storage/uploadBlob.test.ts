import {convertBase64ToBlob} from "@/lib/utils.server";
import {BlobServiceClient} from "@azure/storage-blob";
import {beforeEach, describe, expect, it, vi} from "vitest";
import fetchConfigurationValue from "./fetchConfig";
import uploadBlob from "./uploadBlob";

vi.mock("@azure/identity");
vi.mock("@azure/storage-blob");
vi.mock("./fetchConfig");
vi.mock("@/lib/utils.server");

describe("uploadBlob", () => {
  const mockUploadData = vi.fn();
  const mockGetBlockBlobClient = vi.fn();
  const mockGetContainerClient = vi.fn();
  const mockArrayBuffer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (fetchConfigurationValue as any).mockResolvedValue("https://test.blob.core.windows.net");

    mockArrayBuffer.mockResolvedValue(new ArrayBuffer(8));
    (convertBase64ToBlob as any).mockResolvedValue({
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

    (BlobServiceClient as any).mockImplementation(function () {
      return {
        getContainerClient: mockGetContainerClient,
      };
    });

    // Mock crypto.randomUUID
    globalThis.crypto.randomUUID = vi.fn().mockReturnValue("test-uuid");
  });

  it("should upload a blob successfully with provided name", async () => {
    const result = await uploadBlob("test-container", "base64data", {meta: "data"}, "custom-name.png");

    expect(convertBase64ToBlob).toHaveBeenCalledWith("base64data");
    expect(fetchConfigurationValue).toHaveBeenCalledWith("AzureOptions:StorageAccountEndpoint");
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
    await uploadBlob("test-container", "base64data");

    expect(mockGetBlockBlobClient).toHaveBeenCalledWith("test-uuid.png");
  });

  it("should log error if upload status is not 201", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockUploadData.mockResolvedValue({
      _response: {status: 400},
    });

    const result = await uploadBlob("test-container", "base64data");

    expect(consoleSpy).toHaveBeenCalledWith("Error uploading blob to Azure Storage", expect.any(Object));
    expect(result.status).toBe(400);
  });

  it("should handle exceptions and return 500 status", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (fetchConfigurationValue as any).mockRejectedValue(new Error("Config error"));

    const result = await uploadBlob("test-container", "base64data");

    expect(consoleSpy).toHaveBeenCalledWith("Error uploading the blob to Azure Storage:", expect.any(Error));
    expect(result).toEqual({
      status: 500,
      blobIdentifier: "",
      blobName: "",
      blobUrl: "",
    });
  });
});
