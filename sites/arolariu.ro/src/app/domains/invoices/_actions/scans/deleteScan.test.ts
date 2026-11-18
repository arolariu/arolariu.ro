import {generateGuid} from "@/lib/utils.generic";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {getContainerClientAtSdk, storageUrl, stubStorageConfig} from "../../../../../../tests/setup/blob-sdk";
import {auth, fetchAtHttp} from "../../../../../../tests/setup/server-http";
import {deleteScan} from "./deleteScan";

const owner = generateGuid("user-1");

function blob(fileName: string, metadata: Record<string, string>) {
  return {name: `scans/${owner}/${fileName}`, metadata, properties: {contentType: "image/jpeg", contentLength: 1024}};
}

function scanBlob(scanId: string, ownerId = owner) {
  return blob(`${scanId}.jpg`, {
    scanId,
    ownerId,
    documentKind: "receipt",
    documentRole: "primary",
    status: "ready",
    uploadedAt: "2026-04-19T13:00:00Z",
    uploadedBy: ownerId,
  });
}

function arrangeStorage(blobs: readonly ReturnType<typeof blob>[]) {
  const deleteIfExists = vi.fn<(name: string) => Promise<{succeeded: boolean; errorCode?: string}>>();
  const listBlobsFlat = vi.fn(async function* () {
    yield* blobs;
  });
  getContainerClientAtSdk.mockReturnValue({
    listBlobsFlat,
    getBlockBlobClient: (name: string) => ({
      url: `${storageUrl}/invoices/${name}`,
      deleteIfExists: () => deleteIfExists(name),
    }),
  });
  return {deleteIfExists, listBlobsFlat};
}

describe("deleteScan", () => {
  beforeEach(stubStorageConfig);

  it.each([true, false])("deletes only the matching owned blob and tolerates an already absent blob (%s)", async (succeeded) => {
    const {deleteIfExists, listBlobsFlat} = arrangeStorage([blob("invalid.jpg", {}), scanBlob("other"), scanBlob("selected")]);
    deleteIfExists.mockResolvedValue({succeeded});

    const result = await deleteScan({scanId: "selected"});

    expect(result).toEqual({success: true, data: undefined});
    expect(listBlobsFlat).toHaveBeenCalledExactlyOnceWith({prefix: `scans/${owner}/`, includeMetadata: true});
    expect(deleteIfExists).toHaveBeenCalledExactlyOnceWith(`scans/${owner}/selected.jpg`);
  });

  it.each([
    ["missing", 'Scan with ID "selected" not found.'],
    ["unowned", "You are not authorized to delete this scan."],
  ] as const)("does not delete a %s scan", async (scenario, message) => {
    const {deleteIfExists} = arrangeStorage(
      scenario === "missing" ? [blob("invalid.jpg", {}), scanBlob("other")] : [scanBlob("selected", "different-owner")],
    );

    const result = await deleteScan({scanId: "selected"});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message}});
    expect(deleteIfExists).not.toHaveBeenCalled();
  });

  it("preserves the SDK failure code rather than returning idempotent success", async () => {
    const {deleteIfExists} = arrangeStorage([scanBlob("selected")]);
    deleteIfExists.mockResolvedValue({succeeded: false, errorCode: "BlobNotFound"});

    const result = await deleteScan({scanId: "selected"});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: "Failed to delete scan: Error code: BlobNotFound"}});
  });

  it("does not resolve storage if the identity provider rejects", async () => {
    auth.mockRejectedValue(new Error("Unauthorized"));

    const result = await deleteScan({scanId: "selected"});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: "Unauthorized"}});
    expect(fetchAtHttp).not.toHaveBeenCalled();
    expect(getContainerClientAtSdk).not.toHaveBeenCalled();
  });

  it.each([
    [new Error("Storage connection failed"), "Storage connection failed"],
    ["SDK iterator failed", "An unexpected error occurred"],
  ] as const)("reports a storage failure without deleting anything (%s)", async (reason, message) => {
    const {deleteIfExists, listBlobsFlat} = arrangeStorage([]);
    listBlobsFlat.mockImplementation(() => {
      throw reason;
    });

    const result = await deleteScan({scanId: "selected"});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message}});
    expect(deleteIfExists).not.toHaveBeenCalled();
  });
});
