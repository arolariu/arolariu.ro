/**
 * @fileoverview Unit tests for createScan server action.
 * @module app/domains/invoices/_actions/scans/createScan.test
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {uploadBlobObject} from "@/lib/azure/storageClient";
import {ScanStatus, ScanType} from "@/types/scans";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";
import {createScan} from "./createScan";

vi.mock("@/instrumentation.server");
vi.mock("@/lib/actions/storage/fetchConfig");
vi.mock("@/lib/actions/user/fetchUser");
vi.mock("@/lib/azure/storageClient");

const mockFetchBFFUserFromAuthService = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchConfigurationValue = vi.mocked(fetchConfigurationValue);
const mockUploadBlobObject = vi.mocked(uploadBlobObject);
const mockWithSpan = vi.mocked(withSpan);
const mockAddSpanEvent = vi.mocked(addSpanEvent);
const mockLogWithTrace = vi.mocked(logWithTrace);

const VALID_BASE64 = "dGVzdA==";

describe("createScan", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockWithSpan.mockImplementation((_name, fn) => (fn as () => Promise<unknown>)());
    mockAddSpanEvent.mockImplementation(() => undefined);
    mockLogWithTrace.mockImplementation(() => undefined);
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-123"}));
    mockFetchConfigurationValue.mockResolvedValue("https://storage.test");
    
    // Mock uploadBlobObject to return a BlobObject
    mockUploadBlobObject.mockResolvedValue({
      name: "scans/user-123/scan_123.jpg",
      url: "https://storage.test/invoices/scans/user-123/scan_123.jpg",
      metadata: {},
      contentType: "image/jpeg",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "test-etag",
    });
  });

  it("should successfully upload a scan with valid base64 data", async () => {
    const result = await createScan({
      base64Data: VALID_BASE64,
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe(201);
      expect(result.data.scan.userIdentifier).toBe("user-123");
      expect(result.data.scan.name).toBe("receipt.jpg");
      expect(result.data.scan.mimeType).toBe("image/jpeg");
      expect(result.data.scan.status).toBe(ScanStatus.READY);
      expect(result.data.scan.blobUrl).toContain("scans/user-123");
    }
    
    // Verify uploadBlobObject was called with correct parameters
    expect(mockUploadBlobObject).toHaveBeenCalledWith(
      expect.objectContaining({
        storageEndpoint: "https://storage.test",
        containerName: "invoices",
        contentType: "image/jpeg",
        content: expect.any(Uint8Array),
        metadata: expect.objectContaining({
          ownerId: "user-123",
          status: "ready",
        }),
      })
    );
  });

  it("should handle PNG uploads correctly", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-456"}));
    mockUploadBlobObject.mockResolvedValue({
      name: "scans/user-456/scan_456.png",
      url: "https://storage.test/invoices/scans/user-456/scan_456.png",
      metadata: {},
      contentType: "image/png",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "test-etag",
    });

    const result = await createScan({
      base64Data: `data:image/png;base64,${VALID_BASE64}`,
      fileName: "invoice.png",
      mimeType: "image/png",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scan.mimeType).toBe("image/png");
      expect(result.data.scan.name).toBe("invoice.png");
    }
  });

  it("should handle PDF uploads correctly", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-789"}));
    mockUploadBlobObject.mockResolvedValue({
      name: "scans/user-789/scan_789.pdf",
      url: "https://storage.test/invoices/scans/user-789/scan_789.pdf",
      metadata: {},
      contentType: "application/pdf",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "test-etag",
    });

    const result = await createScan({
      base64Data: VALID_BASE64,
      fileName: "document.pdf",
      mimeType: "application/pdf",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scan.mimeType).toBe("application/pdf");
    }
  });

  it("should handle authentication failures", async () => {
    mockFetchBFFUserFromAuthService.mockRejectedValue(new Error("Unauthorized"));

    const result = await createScan({
      base64Data: VALID_BASE64,
      fileName: "test.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Unauthorized");
    }
  });

  it("should handle Azure upload failures", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-fail"}));
    mockUploadBlobObject.mockRejectedValue(new Error("Upload failed"));

    const result = await createScan({
      base64Data: VALID_BASE64,
      fileName: "test.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Upload failed");
    }
  });

  it("should handle base64 conversion errors", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-error"}));

    const result = await createScan({
      base64Data: "invalid!!!",
      fileName: "test.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.success).toBe(false);
  });

  it("should handle non-Error thrown exceptions", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-weird"}));
    mockUploadBlobObject.mockImplementation(() => {
      throw "String error";
    });

    const result = await createScan({
      base64Data: VALID_BASE64,
      fileName: "test.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.success).toBe(false);
  });

  it("should write canonical scan metadata", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-meta"}));

    const result = await createScan({
      base64Data: VALID_BASE64,
      fileName: "my-original-receipt.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.success).toBe(true);
    
    // Verify metadata was passed correctly to uploadBlobObject
    const uploadCall = mockUploadBlobObject.mock.calls[0]?.[0];
    expect(uploadCall?.metadata).toMatchObject({
      ownerId: "user-meta",
      displayName: "my-original-receipt.jpg",
      documentKind: "receipt",
      documentRole: "primary",
      status: "ready",
      uploadedBy: "user-meta",
    });
    expect(uploadCall?.metadata?.["scanId"]).toBeDefined();
    expect(uploadCall?.metadata?.["uploadedAt"]).toBeDefined();
    expect(uploadCall?.metadata?.["originalFileName"]).toBeUndefined();
    expect(uploadCall?.metadata?.["userIdentifier"]).toBeUndefined();
  });

  it("should use bin extension for filenames without a usable extension", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-no-ext"}));

    await createScan({base64Data: VALID_BASE64, fileName: "receipt", mimeType: "image/jpeg"});
    await createScan({base64Data: VALID_BASE64, fileName: "receipt.", mimeType: "image/jpeg"});

    const calls = mockUploadBlobObject.mock.calls;
    expect(calls).toHaveLength(2);
    expect(calls[0]?.[0]?.blobName).toMatch(/\.bin$/);
    expect(calls[1]?.[0]?.blobName).toMatch(/\.bin$/);
  });

  it("should handle unsupported MIME types as OTHER", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-unsupported"}));
    mockUploadBlobObject.mockResolvedValue({
      name: "scans/user-unsupported/scan_unsup.txt",
      url: "https://storage.test/invoices/scans/user-unsupported/scan_unsup.txt",
      metadata: {},
      contentType: "text/plain",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "test-etag",
    });

    const result = await createScan({
      base64Data: VALID_BASE64,
      fileName: "textfile.txt",
      mimeType: "text/plain",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scan.mimeType).toBe("text/plain");
      expect(result.data.scan.scanType).toBe(ScanType.OTHER);
    }
  });

  it("should map image/bmp to ScanType.BMP", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-bmp"}));
    mockUploadBlobObject.mockResolvedValue({
      name: "scans/user-bmp/scan_bmp.bmp",
      url: "https://storage.test/invoices/scans/user-bmp/scan_bmp.bmp",
      metadata: {},
      contentType: "image/bmp",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "test-etag",
    });

    const result = await createScan({
      base64Data: VALID_BASE64,
      fileName: "image.bmp",
      mimeType: "image/bmp",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scan.scanType).toBe(ScanType.BMP);
    }
  });

  it("should map image/tiff to ScanType.TIFF", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-tiff"}));
    mockUploadBlobObject.mockResolvedValue({
      name: "scans/user-tiff/scan_tiff.tiff",
      url: "https://storage.test/invoices/scans/user-tiff/scan_tiff.tiff",
      metadata: {},
      contentType: "image/tiff",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "test-etag",
    });

    const result = await createScan({
      base64Data: VALID_BASE64,
      fileName: "image.tiff",
      mimeType: "image/tiff",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scan.scanType).toBe(ScanType.TIFF);
    }
  });

  it("should map image/heif to ScanType.HEIF", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-heif"}));
    mockUploadBlobObject.mockResolvedValue({
      name: "scans/user-heif/scan_heif.heif",
      url: "https://storage.test/invoices/scans/user-heif/scan_heif.heif",
      metadata: {},
      contentType: "image/heif",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "test-etag",
    });

    const result = await createScan({
      base64Data: VALID_BASE64,
      fileName: "image.heif",
      mimeType: "image/heif",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scan.scanType).toBe(ScanType.HEIF);
    }
  });

  it("should map image/heic to ScanType.HEIC", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-heic"}));
    mockUploadBlobObject.mockResolvedValue({
      name: "scans/user-heic/scan_heic.heic",
      url: "https://storage.test/invoices/scans/user-heic/scan_heic.heic",
      metadata: {},
      contentType: "image/heic",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "test-etag",
    });

    const result = await createScan({
      base64Data: VALID_BASE64,
      fileName: "image.heic",
      mimeType: "image/heic",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scan.scanType).toBe(ScanType.HEIC);
    }
  });

  it("should map image/jpg alias to ScanType.JPEG through normalization", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-jpg"}));
    mockUploadBlobObject.mockResolvedValue({
      name: "scans/user-jpg/scan_jpg.jpg",
      url: "https://storage.test/invoices/scans/user-jpg/scan_jpg.jpg",
      metadata: {},
      contentType: "image/jpg",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "test-etag",
    });

    const result = await createScan({
      base64Data: VALID_BASE64,
      fileName: "image.jpg",
      mimeType: "image/jpg",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scan.scanType).toBe(ScanType.JPEG);
    }
  });
});
