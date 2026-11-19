import {generateGuid} from "@/lib/utils.generic";
import {ScanMetadataKey} from "@/types/scans";
import {revalidatePath} from "next/cache";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {connectAtSdk, getContainerClientAtSdk, storageUrl, stubStorageConfig} from "../../../../../../tests/setup/blob-sdk";
import {auth, fetchAtHttp} from "../../../../../../tests/setup/server-http";
import {updateScan} from "./updateScan";

vi.mock("next/cache", () => ({revalidatePath: vi.fn<typeof revalidatePath>()}));

const owner = generateGuid("user-1");
const uploadedAt = "2026-04-19T13:00:00.000Z";
const modifiedAt = new Date("2026-04-20T13:00:00.000Z");
const metadata = {
  scanId: "selected",
  ownerId: owner,
  displayName: "receipt.jpg",
  collectionName: "Groceries",
  documentKind: "receipt",
  documentRole: "primary",
  status: "ready",
  uploadedAt,
  uploadedBy: owner,
};

function blob(fileName: string, blobMetadata: Record<string, string>) {
  return {
    name: `scans/${owner}/${fileName}`,
    metadata: blobMetadata,
    properties: {contentType: "image/jpeg", contentLength: 1024, etag: '"scan-etag"'},
  };
}

function arrangeStorage(blobs: readonly ReturnType<typeof blob>[] = [blob("target.jpg", metadata)]) {
  const setMetadata = vi.fn<(name: string, value: Record<string, string>, options: unknown) => Promise<void>>();
  const uploadData = vi.fn<(name: string, bytes: Uint8Array, options: unknown) => Promise<void>>();
  const listBlobsFlat = vi.fn(async function* () {
    yield* blobs;
  });
  getContainerClientAtSdk.mockReturnValue({
    listBlobsFlat,
    getBlockBlobClient: (name: string) => ({
      url: `${storageUrl}/invoices/${name}`,
      setMetadata: (value: Record<string, string>, options: unknown) => setMetadata(name, value, options),
      uploadData: (bytes: Uint8Array, options: unknown) => uploadData(name, bytes, options),
      getProperties: async () => ({contentLength: 1024, contentType: "image/jpeg", etag: '"updated-etag"'}),
    }),
  });
  return {setMetadata, uploadData, listBlobsFlat};
}

describe("updateScan", () => {
  beforeEach(stubStorageConfig);
  afterEach(() => {
    vi.useRealTimers();
  });

  it("patches the matching blob with its ETag and retains required metadata", async () => {
    vi.useFakeTimers({toFake: ["Date"]});
    vi.setSystemTime(modifiedAt);
    const {setMetadata, uploadData, listBlobsFlat} = arrangeStorage([
      blob("invalid.jpg", {}),
      blob("other.jpg", {...metadata, scanId: "different"}),
      blob("target.jpg", metadata),
    ]);

    const result = await updateScan({
      scanId: "selected",
      metadataAdd: {displayName: "renamed.jpg"},
      metadataRemove: [
        ScanMetadataKey.SCAN_ID,
        ScanMetadataKey.OWNER_ID,
        ScanMetadataKey.UPLOADED_AT,
        ScanMetadataKey.UPLOADED_BY,
        ScanMetadataKey.DOCUMENT_KIND,
        ScanMetadataKey.DOCUMENT_ROLE,
        ScanMetadataKey.STATUS,
        ScanMetadataKey.COLLECTION_NAME,
      ],
    });

    expect(result).toMatchObject({
      success: true,
      data: {scan: {id: "selected", name: "renamed.jpg", uploadedAt: new Date(uploadedAt), metadata: {lastModifiedAt: modifiedAt}}},
    });
    expect(new Set(connectAtSdk.mock.calls.flat())).toEqual(new Set([storageUrl]));
    expect(listBlobsFlat).toHaveBeenCalledExactlyOnceWith({prefix: `scans/${owner}/`, includeMetadata: true});
    expect(setMetadata).toHaveBeenCalledExactlyOnceWith(
      `scans/${owner}/target.jpg`,
      {
        scanId: "selected",
        ownerId: owner,
        documentKind: "receipt",
        documentRole: "primary",
        status: "ready",
        uploadedAt,
        uploadedBy: owner,
        displayName: "renamed.jpg",
        lastModifiedAt: modifiedAt.toISOString(),
        lastModifiedBy: owner,
      },
      {conditions: {ifMatch: '"scan-etag"'}},
    );
    expect(uploadData).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/domains/invoices/view-scans", "page");
  });

  it("uploads the decoded replacement rather than issuing a metadata-only write", async () => {
    const {displayName: _displayName, ...unnamed} = metadata;
    const {setMetadata, uploadData} = arrangeStorage([blob("target.jpg", unnamed)]);

    const result = await updateScan({scanId: "selected", scanObject: {base64Data: "dXBkYXRlZA==", mediaType: "image/jpeg"}});

    expect(result).toMatchObject({success: true, data: {scan: {id: "selected", name: "target.jpg", mimeType: "image/jpeg"}}});
    expect(uploadData).toHaveBeenCalledExactlyOnceWith(`scans/${owner}/target.jpg`, new TextEncoder().encode("updated"), {
      blobHTTPHeaders: {blobContentType: "image/jpeg"},
      metadata: expect.objectContaining({scanId: "selected", ownerId: owner}),
    });
    expect(setMetadata).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", 'Scan with ID "selected" not found.'],
    ["unowned", "You are not authorized to update this scan."],
  ] as const)("does not write or invalidate pages for a %s scan", async (scenario, message) => {
    const {setMetadata, uploadData} = arrangeStorage(
      scenario === "missing" ? [] : [blob("target.jpg", {...metadata, ownerId: "different-owner"})],
    );

    const result = await updateScan({scanId: "selected", metadataAdd: {displayName: "renamed.jpg"}});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message}});
    expect(setMetadata).not.toHaveBeenCalled();
    expect(uploadData).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects malformed replacement data without writing the blob", async () => {
    const {setMetadata, uploadData} = arrangeStorage();

    const result = await updateScan({scanId: "selected", scanObject: {base64Data: "invalid!!!", mediaType: "image/jpeg"}});

    expect(result).toMatchObject({success: false, error: {message: expect.stringMatching(/invalid character/iu)}});
    expect(setMetadata).not.toHaveBeenCalled();
    expect(uploadData).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("reports an SDK write failure without revalidating", async () => {
    const {setMetadata} = arrangeStorage();
    setMetadata.mockRejectedValue(new Error("Update failed"));

    const result = await updateScan({scanId: "selected", metadataAdd: {displayName: "renamed.jpg"}});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: "Update failed"}});
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    [new Error("Unauthorized"), "Unauthorized"],
    ["identity error", "An unexpected error occurred"],
  ] as const)("leaves storage untouched when identity resolution rejects with %s", async (reason, message) => {
    auth.mockRejectedValue(reason);

    const result = await updateScan({scanId: "selected"});

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message}});
    expect(fetchAtHttp).not.toHaveBeenCalled();
    expect(getContainerClientAtSdk).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
