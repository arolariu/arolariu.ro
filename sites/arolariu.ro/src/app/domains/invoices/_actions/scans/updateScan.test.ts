/**
 * @fileoverview Unit tests for updateScan server action.
 * @module app/domains/invoices/_actions/scans/updateScan.test
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createBlobClient, rewriteAzuriteUrl} from "@/lib/azure/storageClient";
import {revalidatePath} from "next/cache";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";
import {updateScan} from "./updateScan";

const mockFetchBFFUserFromAuthService = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchConfigurationValue = vi.mocked(fetchConfigurationValue);
const mockCreateBlobClient = vi.mocked(createBlobClient);
const mockRewriteAzuriteUrl = vi.mocked(rewriteAzuriteUrl);
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockWithSpan = vi.mocked(withSpan);
const mockAddSpanEvent = vi.mocked(addSpanEvent);
const mockLogWithTrace = vi.mocked(logWithTrace);

const VALID_BASE64 = "dXBkYXRlZA==";

type UploadOptions = Readonly<{
  metadata?: Record<string, string>;
  blobHTTPHeaders?: Readonly<Record<string, string | undefined>>;
}>;

type BlobClientOptions = Readonly<{
  blobUrl?: string;
  existingMetadata?: Record<string, string>;
  uploadStatus?: number;
  onUpload?: (options: UploadOptions) => void;
}>;

function setupBlobClient({
  blobUrl = "https://storage.test/invoices/scans/user-123/scan_123.jpg",
  existingMetadata = {},
  uploadStatus = 201,
  onUpload,
}: BlobClientOptions = {}): void {
  const blockBlobClient = TestDataBuilder.blockBlobClient({blobUrl, metadata: existingMetadata, uploadStatus});

  // Wrap uploadData to capture calls
  if (onUpload) {
    const originalUploadData = blockBlobClient.uploadData;
    blockBlobClient.uploadData = vi.fn(async (data: Parameters<typeof originalUploadData>[0], options: UploadOptions) => {
      onUpload(options);
      return originalUploadData(data, options);
    });
  }

  const containerClient = TestDataBuilder.containerClient({blobUrl, metadata: existingMetadata, uploadStatus});
  vi.mocked(containerClient.getBlockBlobClient).mockReturnValue(blockBlobClient);
  const blobServiceClient = TestDataBuilder.blobServiceClient(containerClient);
  mockCreateBlobClient.mockResolvedValue(blobServiceClient);
}

describe("updateScan", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockWithSpan.mockImplementation((_name, fn) => (fn as () => Promise<unknown>)());
    mockAddSpanEvent.mockImplementation(() => undefined);
    mockLogWithTrace.mockImplementation(() => undefined);
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-123"}));
    mockFetchConfigurationValue.mockResolvedValue("https://storage.test");
    mockRewriteAzuriteUrl.mockImplementation((url) => url);
    setupBlobClient();
  });

  it("should successfully update scan blob content", async () => {
    setupBlobClient({
      blobUrl: "https://storage.test/invoices/scans/user-123/scan_123.jpg",
      existingMetadata: {
        scanId: "scan_123",
        userIdentifier: "user-123",
        uploadedAt: "2024-01-01T00:00:00.000Z",
        status: "ready",
      },
    });

    const result = await updateScan({
      base64Data: VALID_BASE64,
      blobName: "scans/user-123/scan_123.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.blobUrl).toContain("scans/user-123/scan_123.jpg");
    }
  });

  it("should merge new metadata with existing metadata", async () => {
    const capturedMetadata: Array<Record<string, string>> = [];
    setupBlobClient({
      blobUrl: "https://storage.test/invoices/scans/user-123/scan_123.jpg",
      existingMetadata: {
        scanId: "scan_123",
        userIdentifier: "user-123",
        uploadedAt: "2024-01-01T00:00:00.000Z",
        status: "ready",
        customField: "preserved",
      },
      onUpload: (options) => capturedMetadata.push(options.metadata ?? {}),
    });

    await updateScan({
      base64Data: VALID_BASE64,
      blobName: "scans/user-123/scan_123.jpg",
      mimeType: "image/jpeg",
      metadata: {rotated: "90"},
    });

    expect(capturedMetadata).toHaveLength(1);
    expect(capturedMetadata[0]?.["scanId"]).toBe("scan_123");
    expect(capturedMetadata[0]?.["customField"]).toBe("preserved");
    expect(capturedMetadata[0]?.["rotated"]).toBe("90");
    expect(capturedMetadata[0]?.["lastModifiedAt"]).toBeTruthy();
    expect(capturedMetadata[0]?.["lastModifiedBy"]).toBe("user-123");
  });

  it("should update blobs that do not have existing metadata", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-empty-metadata"}));
    const capturedMetadata: Array<Record<string, string>> = [];
    setupBlobClient({
      blobUrl: "https://storage.test/invoices/scans/user-empty-metadata/scan.jpg",
      onUpload: (options) => capturedMetadata.push(options.metadata ?? {}),
    });

    const result = await updateScan({
      base64Data: VALID_BASE64,
      blobName: "scans/user-empty-metadata/scan.jpg",
      mimeType: "image/jpeg",
      metadata: {rotated: "90"},
    });

    expect(result.success).toBe(true);
    expect(capturedMetadata[0]?.["rotated"]).toBe("90");
    expect(capturedMetadata[0]?.["lastModifiedBy"]).toBe("user-empty-metadata");
  });

  it("should handle authentication failures", async () => {
    mockFetchBFFUserFromAuthService.mockRejectedValue(new Error("Unauthorized"));

    const result = await updateScan({
      base64Data: VALID_BASE64,
      blobName: "scans/user-123/test.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Unauthorized");
    }
  });

  it("should handle Azure upload failures with non-201 status", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-fail"}));
    setupBlobClient({
      blobUrl: "https://storage.test/blob",
      uploadStatus: 500,
    });

    const result = await updateScan({
      base64Data: VALID_BASE64,
      blobName: "scans/user-fail/test.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Failed to update scan");
    }
  });

  it("should handle base64 conversion errors", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-error"}));

    const result = await updateScan({
      base64Data: "invalid!!!",
      blobName: "scans/user-error/test.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.success).toBe(false);
  });

  it("should revalidate view-scans path after update", async () => {
    await updateScan({
      base64Data: VALID_BASE64,
      blobName: "scans/user-123/test.jpg",
      mimeType: "image/jpeg",
    });

    expect(mockRevalidatePath).toHaveBeenCalledWith("/domains/invoices/view-scans", "page");
  });

  it("should handle non-Error thrown exceptions", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-weird"}));
    mockFetchConfigurationValue.mockImplementation(() => {
      throw "String error";
    });

    const result = await updateScan({
      base64Data: VALID_BASE64,
      blobName: "scans/user-weird/test.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.success).toBe(false);
  });

  it("should update MIME type in blob headers", async () => {
    const capturedHeaders: Array<Readonly<Record<string, string | undefined>>> = [];
    setupBlobClient({
      blobUrl: "https://storage.test/blob",
      onUpload: (options) => capturedHeaders.push(options.blobHTTPHeaders ?? {}),
    });

    await updateScan({
      base64Data: VALID_BASE64,
      blobName: "scans/user-mime/document.pdf",
      mimeType: "application/pdf",
    });

    expect(capturedHeaders[0]?.["blobContentType"]).toBe("application/pdf");
  });
});
