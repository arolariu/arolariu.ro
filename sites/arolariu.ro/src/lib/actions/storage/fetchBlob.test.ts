/**
 * @fileoverview Unit tests for the Azure Blob fetch server action.
 * @module sites/arolariu.ro/src/lib/actions/storage/fetchBlob/tests
 */

import {createBlobClient} from "@/lib/azure/storageClient";
import {fetchConfigValue} from "@/lib/config/configProxy";
import type {BlockBlobClient} from "@azure/storage-blob";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {buildBlockBlobClientMock, buildBlobServiceClientMock, buildContainerClientMock} from "../../../../tests/helpers";
import fetchBlob from "./fetchBlob";

const mockCreateBlobClient = vi.mocked(createBlobClient);
const mockFetchConfigValue = vi.mocked(fetchConfigValue);

describe("fetchBlob", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFetchConfigValue.mockResolvedValue("https://test.blob.core.windows.net");

    const blockBlobClient = buildBlockBlobClientMock({
      blobUrl: "https://test.blob.core.windows.net/container/blob.png",
      metadata: {key: "value"},
    });

    // Wrap download to add the method
    const downloadMock = vi.fn().mockResolvedValue({
      _response: {status: 200},
      metadata: {key: "value"},
    });
    (blockBlobClient as unknown as Record<string, unknown>)["download"] = downloadMock;

    const containerClient = buildContainerClientMock();
    containerClient.getBlockBlobClient = vi.fn(() => blockBlobClient as BlockBlobClient);

    const blobServiceClient = buildBlobServiceClientMock(containerClient);
    mockCreateBlobClient.mockResolvedValue(blobServiceClient);
  });

  it("should fetch a blob successfully", async () => {
    const result = await fetchBlob({containerName: "test-container", blobName: "test-blob.png"});

    expect(mockFetchConfigValue).toHaveBeenCalledWith("Endpoints:Storage:Blob");
    expect(createBlobClient).toHaveBeenCalledWith("https://test.blob.core.windows.net");

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
