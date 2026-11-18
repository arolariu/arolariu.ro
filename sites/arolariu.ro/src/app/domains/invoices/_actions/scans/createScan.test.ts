import {generateGuid} from "@/lib/utils.generic";
import {ScanType} from "@/types/scans";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {getContainerClientAtSdk, storageUrl, stubStorageConfig} from "../../../../../../tests/setup/blob-sdk";
import {auth, fetchAtHttp} from "../../../../../../tests/setup/server-http";
import {createScan} from "./createScan";

const owner = generateGuid("user-1");
const uploadedAt = new Date("2026-04-19T13:00:00Z");
const input = {base64Data: "dGVzdA==", fileName: "receipt.jpg", mimeType: "image/jpeg"};

function arrangeUpload() {
  const uploadData = vi.fn<(bytes: Uint8Array, options: unknown) => Promise<void>>().mockResolvedValue(undefined);
  const getBlockBlobClient = vi.fn((name: string) => ({
    url: `${storageUrl}/invoices/${name}`,
    uploadData,
    getProperties: async () => ({contentLength: 4, etag: '"scan-etag"'}),
  }));
  getContainerClientAtSdk.mockReturnValue({getBlockBlobClient});
  return {getBlockBlobClient, uploadData};
}

describe("createScan", () => {
  beforeEach(stubStorageConfig);
  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes decoded bytes and canonical metadata to the same blob returned to the caller", async () => {
    vi.useFakeTimers({toFake: ["Date"]});
    vi.setSystemTime(uploadedAt);
    const {uploadData, getBlockBlobClient} = arrangeUpload();

    const result = await createScan(input);

    expect(result).toMatchObject({
      success: true,
      data: {status: 201, scan: {userIdentifier: owner, name: "receipt.jpg", sizeInBytes: 4, scanType: ScanType.JPEG, status: "ready"}},
    });
    if (!result.success) throw new Error("Expected an uploaded scan");
    const {scan} = result.data;
    expect(scan.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/u);
    const blobName = `scans/${owner}/${scan.id}_${uploadedAt.getTime()}.jpg`;
    expect(scan.blobUrl).toBe(`${storageUrl}/invoices/${blobName}`);
    expect(scan.uploadedAt).toEqual(uploadedAt);
    expect(getContainerClientAtSdk).toHaveBeenCalledExactlyOnceWith("invoices");
    expect(getBlockBlobClient).toHaveBeenCalledExactlyOnceWith(blobName);
    expect(uploadData).toHaveBeenCalledExactlyOnceWith(new TextEncoder().encode("test"), {
      blobHTTPHeaders: {blobContentType: "image/jpeg"},
      metadata: {
        scanId: scan.id,
        ownerId: owner,
        displayName: "receipt.jpg",
        documentKind: "receipt",
        documentRole: "primary",
        status: "ready",
        uploadedAt: uploadedAt.toISOString(),
        uploadedBy: owner,
      },
    });
  });

  it.each([
    ["invoice.png", "image/png", ScanType.PNG],
    ["document.pdf", "application/pdf", ScanType.PDF],
    ["original.txt", "text/plain", ScanType.OTHER],
    ["receipt.bmp", "image/bmp", ScanType.BMP],
    ["receipt.tiff", "image/tiff", ScanType.TIFF],
    ["receipt.heif", "image/heif", ScanType.HEIF],
    ["receipt.heic", "image/heic", ScanType.HEIC],
    ["receipt.jpg", "image/jpg", ScanType.JPEG],
  ] as const)("preserves the uploaded MIME type and classifies %s", async (fileName, mimeType, scanType) => {
    const {uploadData} = arrangeUpload();

    const result = await createScan({fileName, mimeType, base64Data: `data:${mimeType};base64,${input.base64Data}`});

    expect(result).toMatchObject({success: true, data: {scan: {name: fileName, mimeType, scanType, sizeInBytes: 4}}});
    expect(uploadData).toHaveBeenCalledExactlyOnceWith(
      new TextEncoder().encode("test"),
      expect.objectContaining({blobHTTPHeaders: {blobContentType: mimeType}}),
    );
  });

  it.each(["receipt", "receipt."])("uses a bin blob name without a usable extension in %s", async (fileName) => {
    const {getBlockBlobClient} = arrangeUpload();

    const result = await createScan({...input, fileName});

    expect(result).toMatchObject({success: true, data: {scan: {name: fileName}}});
    expect(getBlockBlobClient).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/\.bin$/u));
  });

  it("rejects malformed base64 without opening a container", async () => {
    const result = await createScan({...input, base64Data: "invalid!!!"});

    expect(result).toMatchObject({success: false, error: {message: expect.stringMatching(/invalid character/iu)}});
    expect(getContainerClientAtSdk).not.toHaveBeenCalled();
  });

  it("does not fetch configuration or upload when the identity provider rejects", async () => {
    auth.mockRejectedValue(new Error("Unauthorized"));

    const result = await createScan(input);

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message: "Unauthorized"}});
    expect(fetchAtHttp).not.toHaveBeenCalled();
    expect(getContainerClientAtSdk).not.toHaveBeenCalled();
  });

  it.each([
    [new Error("Upload failed"), "Upload failed"],
    ["detail unavailable", "An unexpected error occurred"],
  ] as const)("returns write failures without reporting a successful scan (%s)", async (reason, message) => {
    const {uploadData} = arrangeUpload();
    uploadData.mockRejectedValue(reason);

    const result = await createScan(input);

    expect(result).toEqual({success: false, error: {code: "NETWORK_ERROR", message}});
  });
});
