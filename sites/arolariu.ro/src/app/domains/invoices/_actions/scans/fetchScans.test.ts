import {generateGuid} from "@/lib/utils.generic";
import {ScanStatus} from "@/types/scans";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {getContainerClientAtSdk, storageUrl, stubStorageConfig} from "../../../../../../tests/setup/blob-sdk";
import {auth, fetchAtHttp} from "../../../../../../tests/setup/server-http";
import {fetchScans} from "./fetchScans";

const owner = generateGuid("user-1");

function blob(id: string, metadata?: Record<string, string>) {
  return {name: `scans/${owner}/${id}.jpg`, metadata, properties: {contentType: "image/jpeg", contentLength: 1024}};
}

function storedScan(id: string, status: ScanStatus, date: string, displayName?: string) {
  return blob(id, {
    scanId: id,
    ownerId: owner,
    uploadedBy: owner,
    uploadedAt: date,
    documentKind: "receipt",
    documentRole: "primary",
    status,
    ...(displayName ? {displayName} : {}),
  });
}

function arrangeStorage(blobs: readonly ReturnType<typeof blob>[] = []) {
  const listBlobsFlat = vi.fn(async function* () {
    yield* blobs;
  });
  const getBlockBlobClient = vi.fn((name: string) => ({url: `${storageUrl}/invoices/${name}`}));
  getContainerClientAtSdk.mockReturnValue({listBlobsFlat, getBlockBlobClient});
  return {listBlobsFlat, getBlockBlobClient};
}

describe("fetchScans", () => {
  beforeEach(stubStorageConfig);

  it.each([
    [undefined, ["detached", "first"]],
    [{includeArchived: true}, ["archived", "detached", "first"]],
  ] as const)("returns sorted, visible scans and skips unusable metadata (%o)", async (options, expectedOrder) => {
    const {listBlobsFlat} = arrangeStorage([
      storedScan("first", ScanStatus.READY, "2024-01-01T00:00:00Z", "First receipt"),
      blob("missing-metadata"),
      storedScan("attached", ScanStatus.ATTACHED, "2024-01-04T00:00:00Z"),
      blob("invalid-metadata", {scanId: "invalid-metadata"}),
      storedScan("archived", ScanStatus.ARCHIVED, "2024-01-03T00:00:00Z"),
      storedScan("detached", ScanStatus.DETACHED, "2024-01-02T00:00:00Z"),
    ]);

    const result = await fetchScans(options);

    expect(result).toMatchObject({success: true, data: expectedOrder.map((id) => ({id}))});
    expect(result.success && result.data.find(({id}) => id === "detached")).toMatchObject({
      name: "detached.jpg",
      status: ScanStatus.DETACHED,
      sizeInBytes: 1024,
      uploadedAt: new Date("2024-01-02T00:00:00Z"),
      blobUrl: `${storageUrl}/invoices/scans/${owner}/detached.jpg`,
    });
    expect(result.success && result.data.find(({id}) => id === "first")).toMatchObject({name: "First receipt"});
    expect(getContainerClientAtSdk).toHaveBeenCalledExactlyOnceWith("invoices");
    expect(listBlobsFlat).toHaveBeenCalledExactlyOnceWith({prefix: `scans/${owner}/`, includeMetadata: true});
  });

  it("returns an empty result when the SDK yields no scans", async () => {
    const {listBlobsFlat} = arrangeStorage();

    const result = await fetchScans();

    expect(result).toEqual({success: true, data: []});
    expect(listBlobsFlat).toHaveBeenCalledOnce();
  });

  it("does not fetch configuration or open a container if authentication fails", async () => {
    auth.mockRejectedValue(new Error("Unauthorized"));

    const result = await fetchScans();

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: "Unauthorized"}});
    expect(fetchAtHttp).not.toHaveBeenCalled();
    expect(getContainerClientAtSdk).not.toHaveBeenCalled();
  });

  it.each([
    [new Error("Storage connection failed"), "Storage connection failed"],
    ["SDK iterator failed", "An unexpected error occurred"],
  ] as const)("returns an error when the SDK fails with %s", async (reason, message) => {
    const {listBlobsFlat, getBlockBlobClient} = arrangeStorage();
    listBlobsFlat.mockImplementation(() => {
      throw reason;
    });

    const result = await fetchScans();

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message}});
    expect(getBlockBlobClient).not.toHaveBeenCalled();
  });
});
