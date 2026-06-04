/**
 * @fileoverview Unit tests for createScan server action.
 * @module app/domains/invoices/_actions/scans/createScan.test
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createBlobClient, rewriteAzuriteUrl} from "@/lib/azure/storageClient";
import {ScanStatus, ScanType} from "@/types/scans";
import type {BlockBlobClient} from "@azure/storage-blob";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";
import {createScan} from "./createScan";

const mockFetchBFFUserFromAuthService = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchConfigurationValue = vi.mocked(fetchConfigurationValue);
const mockCreateBlobClient = vi.mocked(createBlobClient);
const mockRewriteAzuriteUrl = vi.mocked(rewriteAzuriteUrl);
const mockWithSpan = vi.mocked(withSpan);
const mockAddSpanEvent = vi.mocked(addSpanEvent);
const mockLogWithTrace = vi.mocked(logWithTrace);

const VALID_BASE64 = "dGVzdA==";

type UploadOptions = Readonly<{
  metadata?: Record<string, string>;
  blobHTTPHeaders?: Readonly<Record<string, string | undefined>>;
}>;

type BlobClientOptions = Readonly<{
  blobUrl?: string;
  uploadStatus?: number;
  onBlobName?: (blobName: string) => void;
  onUpload?: (options: UploadOptions) => void;
  throwOnContainer?: unknown;
}>;

function setupBlobClient({
  blobUrl = "https://storage.test/invoices/scans/user-123/scan_123.jpg",
  uploadStatus = 201,
  onBlobName,
  onUpload,
  throwOnContainer,
}: BlobClientOptions = {}): void {
  if (throwOnContainer !== undefined) {
    mockCreateBlobClient.mockRejectedValue(throwOnContainer);
    return;
  }

  const blockBlobClient = TestDataBuilder.blockBlobClient({blobUrl, uploadStatus});

  // Wrap uploadData to capture calls
  if (onUpload) {
    const originalUploadData = blockBlobClient.uploadData;
    blockBlobClient.uploadData = vi.fn(async (data: Parameters<typeof originalUploadData>[0], options: UploadOptions) => {
      onUpload(options);
      return originalUploadData(data, options);
    });
  }

  const containerClient = TestDataBuilder.containerClient({blobUrl, uploadStatus});

  // Wrap getBlockBlobClient to capture blob names
  containerClient.getBlockBlobClient = vi.fn((blobName: string) => {
    onBlobName?.(blobName);
    return blockBlobClient as BlockBlobClient;
  });

  const blobServiceClient = TestDataBuilder.blobServiceClient(containerClient);
  mockCreateBlobClient.mockResolvedValue(blobServiceClient);
}

describe("createScan", () => {
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

  it("should successfully upload a scan with valid base64 data", async () => {
    const mockBlobUrl = "https://storage.test/invoices/scans/user-123/scan_123.jpg";
    setupBlobClient({blobUrl: mockBlobUrl});

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
  });

  it("should handle PNG uploads correctly", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-456"}));
    setupBlobClient({blobUrl: "https://storage.test/invoices/scans/user-456/scan_456.png"});

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
    setupBlobClient({blobUrl: "https://storage.test/invoices/scans/user-789/scan_789.pdf"});

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

  it("should handle Azure upload failures with non-201 status", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-fail"}));
    setupBlobClient({blobUrl: "https://storage.test/blob", uploadStatus: 500});

    const result = await createScan({
      base64Data: VALID_BASE64,
      fileName: "test.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe(500);
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
    setupBlobClient({throwOnContainer: "String error"});

    const result = await createScan({
      base64Data: VALID_BASE64,
      fileName: "test.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.success).toBe(false);
  });

  it("should write canonical scan metadata", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-meta"}));
    const capturedMetadata: Array<Record<string, string>> = [];
    setupBlobClient({
      blobUrl: "https://storage.test/invoices/scans/user-meta/scan_meta.jpg",
      onUpload: (options) => capturedMetadata.push(options.metadata ?? {}),
    });

    const result = await createScan({
      base64Data: VALID_BASE64,
      fileName: "my-original-receipt.jpg",
      mimeType: "image/jpeg",
    });

    expect(result.success).toBe(true);
    expect(capturedMetadata).toHaveLength(1);
    expect(capturedMetadata[0]).toMatchObject({
      ownerId: "user-meta",
      displayName: "my-original-receipt.jpg",
      documentKind: "receipt",
      documentRole: "primary",
      status: "ready",
      uploadedBy: "user-meta",
    });
    expect(capturedMetadata[0]?.["scanId"]).toBeDefined();
    expect(capturedMetadata[0]?.["uploadedAt"]).toBeDefined();
    expect(capturedMetadata[0]?.["originalFileName"]).toBeUndefined();
    expect(capturedMetadata[0]?.["userIdentifier"]).toBeUndefined();
  });

  it("should use bin extension for filenames without a usable extension", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-no-ext"}));
    const capturedBlobNames: string[] = [];
    setupBlobClient({
      onBlobName: (blobName) => capturedBlobNames.push(blobName),
    });

    await createScan({base64Data: VALID_BASE64, fileName: "receipt", mimeType: "image/jpeg"});
    await createScan({base64Data: VALID_BASE64, fileName: "receipt.", mimeType: "image/jpeg"});

    expect(capturedBlobNames).toHaveLength(2);
    expect(capturedBlobNames.every((name) => name.endsWith(".bin"))).toBe(true);
  });

  it("should handle unsupported MIME types as OTHER", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-unsupported"}));
    setupBlobClient({blobUrl: "https://storage.test/invoices/scans/user-unsupported/scan_unsup.txt"});

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
});
