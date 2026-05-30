import {describe, expect, it, vi} from "vitest";

import {buildBlobServiceClientMock, buildContainerClientMock} from "./azure";

describe("azure builders", () => {
  it("creates a container client mock with block blob behavior", async () => {
    const containerClient = buildContainerClientMock({
      blobUrl: "https://storage.test/blob.jpg",
      metadata: {
        status: "uploaded",
      },
    });

    const blockBlobClient = containerClient.getBlockBlobClient("blob.jpg");

    expect(blockBlobClient.url).toBe("https://storage.test/blob.jpg");
    await expect(blockBlobClient.getProperties()).resolves.toEqual({
      metadata: {
        status: "uploaded",
      },
    });
    await expect(blockBlobClient.uploadData(new ArrayBuffer(0), {})).resolves.toEqual({
      _response: {status: 201},
    });
  });

  it("creates a blob service client mock that returns the container client", () => {
    const containerClient = buildContainerClientMock();
    const blobServiceClient = buildBlobServiceClientMock(containerClient);

    expect(blobServiceClient.getContainerClient("scans")).toBe(containerClient);
    expect(vi.isMockFunction(blobServiceClient.getContainerClient)).toBe(true);
  });
});
