/**
 * @fileoverview Unit tests for updateScan server action.
 * @module app/domains/invoices/_actions/scans/updateScan.test
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {resolveBlobObjectByMetadata, updateBlobObject} from "@/lib/azure/storageClient";
import {ScanMetadataKey} from "@/types/scans";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";
import {updateScan} from "./updateScan";

vi.mock("@/instrumentation.server");
vi.mock("@/lib/actions/storage/fetchConfig");
vi.mock("@/lib/actions/user/fetchUser");
vi.mock("@/lib/azure/storageClient");
vi.mock("next/cache");

const mockFetchBFFUserFromAuthService = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchConfigurationValue = vi.mocked(fetchConfigurationValue);
const mockResolveBlobObjectByMetadata = vi.mocked(resolveBlobObjectByMetadata);
const mockUpdateBlobObject = vi.mocked(updateBlobObject);
const mockWithSpan = vi.mocked(withSpan);
const mockAddSpanEvent = vi.mocked(addSpanEvent);
const mockLogWithTrace = vi.mocked(logWithTrace);

const VALID_BASE64 = "dXBkYXRlZA==";

describe("updateScan", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockWithSpan.mockImplementation((_name, fn) => (fn as () => Promise<unknown>)());
    mockAddSpanEvent.mockImplementation(() => undefined);
    mockLogWithTrace.mockImplementation(() => undefined);
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-123"}));
    mockFetchConfigurationValue.mockResolvedValue("https://storage.test");
  });

  it("should successfully update scan metadata only", async () => {
    mockResolveBlobObjectByMetadata.mockResolvedValue({
      name: "scans/user-123/scan_123.jpg",
      url: "https://storage.test/invoices/scans/user-123/scan_123.jpg",
      metadata: {
        scanId: "scan-123",
        ownerId: "user-123",
        displayName: "receipt.jpg",
        documentKind: "receipt",
        documentRole: "primary",
        status: "ready",
        uploadedAt: "2024-01-01T00:00:00.000Z",
        uploadedBy: "user-123",
      },
      contentType: "image/jpeg",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "test-etag",
    });

    mockUpdateBlobObject.mockResolvedValue({
      name: "scans/user-123/scan_123.jpg",
      url: "https://storage.test/invoices/scans/user-123/scan_123.jpg",
      metadata: {},
      contentType: "image/jpeg",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "new-etag",
    });

    const result = await updateScan({
      scanId: "scan-123",
      metadataAdd: {
        displayName: "updated-receipt.jpg",
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scan).toBeDefined();
      expect(result.data.scan.id).toBe("scan-123");
    }

    // Verify resolveBlobObjectByMetadata was called
    expect(mockResolveBlobObjectByMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        storageEndpoint: "https://storage.test",
        containerName: "invoices",
        prefix: "scans/user-123/",
        predicate: expect.any(Function),
      })
    );

    // Verify updateBlobObject was called with metadata only
    expect(mockUpdateBlobObject).toHaveBeenCalledWith(
      expect.objectContaining({
        storageEndpoint: "https://storage.test",
        containerName: "invoices",
        blobName: "scans/user-123/scan_123.jpg",
        metadata: expect.objectContaining({
          scanId: "scan-123",
          ownerId: "user-123",
          displayName: "updated-receipt.jpg",
          lastModifiedBy: "user-123",
        }),
      })
    );
  });

  it("should successfully update scan content and metadata", async () => {
    mockResolveBlobObjectByMetadata.mockResolvedValue({
      name: "scans/user-123/scan_123.jpg",
      url: "https://storage.test/invoices/scans/user-123/scan_123.jpg",
      metadata: {
        scanId: "scan-123",
        ownerId: "user-123",
        displayName: "receipt.jpg",
        documentKind: "receipt",
        documentRole: "primary",
        status: "ready",
        uploadedAt: "2024-01-01T00:00:00.000Z",
        uploadedBy: "user-123",
      },
      contentType: "image/jpeg",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "test-etag",
    });

    mockUpdateBlobObject.mockResolvedValue({
      name: "scans/user-123/scan_123.jpg",
      url: "https://storage.test/invoices/scans/user-123/scan_123.jpg",
      metadata: {},
      contentType: "image/jpeg",
      contentLength: 2048,
      createdOn: new Date(),
      etag: "new-etag",
    });

    const result = await updateScan({
      scanId: "scan-123",
      scanObject: {
        base64Data: VALID_BASE64,
        mediaType: "image/jpeg",
      },
    });

    expect(result.success).toBe(true);

    // Verify updateBlobObject was called with content
    expect(mockUpdateBlobObject).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.any(Uint8Array),
        contentType: "image/jpeg",
      })
    );
  });

  it("should remove specified metadata keys", async () => {
    mockResolveBlobObjectByMetadata.mockResolvedValue({
      name: "scans/user-123/scan_123.jpg",
      url: "https://storage.test/invoices/scans/user-123/scan_123.jpg",
      metadata: {
        scanId: "scan-123",
        ownerId: "user-123",
        displayName: "receipt.jpg",
        collectionName: "January 2024",
        documentKind: "receipt",
        documentRole: "primary",
        status: "ready",
        uploadedAt: "2024-01-01T00:00:00.000Z",
        uploadedBy: "user-123",
      },
      contentType: "image/jpeg",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "test-etag",
    });

    mockUpdateBlobObject.mockResolvedValue({
      name: "scans/user-123/scan_123.jpg",
      url: "https://storage.test/invoices/scans/user-123/scan_123.jpg",
      metadata: {},
      contentType: "image/jpeg",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "new-etag",
    });

    const result = await updateScan({
      scanId: "scan-123",
      metadataRemove: [ScanMetadataKey.COLLECTION_NAME],
    });

    expect(result.success).toBe(true);

    // Verify collectionName was removed from metadata
    const updateCall = mockUpdateBlobObject.mock.calls[0]?.[0];
    expect(updateCall?.metadata?.[ScanMetadataKey.COLLECTION_NAME]).toBeUndefined();
  });

  it("should handle scan not found", async () => {
    mockResolveBlobObjectByMetadata.mockResolvedValue(null);

    const result = await updateScan({
      scanId: "scan-not-found",
      metadataAdd: {
        displayName: "test.jpg",
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("not found");
    }
  });

  it("should handle ownership validation failure", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-123"}));
    mockResolveBlobObjectByMetadata.mockResolvedValue({
      name: "scans/user-456/scan_456.jpg",
      url: "https://storage.test/invoices/scans/user-456/scan_456.jpg",
      metadata: {
        scanId: "scan-456",
        ownerId: "user-456",  // Different owner
        displayName: "receipt.jpg",
        documentKind: "receipt",
        documentRole: "primary",
        status: "ready",
        uploadedAt: "2024-01-01T00:00:00.000Z",
        uploadedBy: "user-456",
      },
      contentType: "image/jpeg",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "test-etag",
    });

    const result = await updateScan({
      scanId: "scan-456",
      metadataAdd: {
        displayName: "test.jpg",
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("not authorized");
    }
  });

  it("should handle authentication failures", async () => {
    mockFetchBFFUserFromAuthService.mockRejectedValue(new Error("Unauthorized"));

    const result = await updateScan({
      scanId: "scan-123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Unauthorized");
    }
  });

  it("should handle Azure update failures", async () => {
    mockResolveBlobObjectByMetadata.mockResolvedValue({
      name: "scans/user-123/scan_123.jpg",
      url: "https://storage.test/invoices/scans/user-123/scan_123.jpg",
      metadata: {
        scanId: "scan-123",
        ownerId: "user-123",
        displayName: "receipt.jpg",
        documentKind: "receipt",
        documentRole: "primary",
        status: "ready",
        uploadedAt: "2024-01-01T00:00:00.000Z",
        uploadedBy: "user-123",
      },
      contentType: "image/jpeg",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "test-etag",
    });

    mockUpdateBlobObject.mockRejectedValue(new Error("Update failed"));

    const result = await updateScan({
      scanId: "scan-123",
      metadataAdd: {
        displayName: "test.jpg",
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Update failed");
    }
  });

  it("should handle base64 conversion errors", async () => {
    mockResolveBlobObjectByMetadata.mockResolvedValue({
      name: "scans/user-123/scan_123.jpg",
      url: "https://storage.test/invoices/scans/user-123/scan_123.jpg",
      metadata: {
        scanId: "scan-123",
        ownerId: "user-123",
        displayName: "receipt.jpg",
        documentKind: "receipt",
        documentRole: "primary",
        status: "ready",
        uploadedAt: "2024-01-01T00:00:00.000Z",
        uploadedBy: "user-123",
      },
      contentType: "image/jpeg",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "test-etag",
    });

    const result = await updateScan({
      scanId: "scan-123",
      scanObject: {
        base64Data: "invalid!!!",
        mediaType: "image/jpeg",
      },
    });

    expect(result.success).toBe(false);
  });

  it("should set lastModifiedAt and lastModifiedBy automatically", async () => {
    mockResolveBlobObjectByMetadata.mockResolvedValue({
      name: "scans/user-123/scan_123.jpg",
      url: "https://storage.test/invoices/scans/user-123/scan_123.jpg",
      metadata: {
        scanId: "scan-123",
        ownerId: "user-123",
        displayName: "receipt.jpg",
        documentKind: "receipt",
        documentRole: "primary",
        status: "ready",
        uploadedAt: "2024-01-01T00:00:00.000Z",
        uploadedBy: "user-123",
      },
      contentType: "image/jpeg",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "test-etag",
    });

    mockUpdateBlobObject.mockResolvedValue({
      name: "scans/user-123/scan_123.jpg",
      url: "https://storage.test/invoices/scans/user-123/scan_123.jpg",
      metadata: {},
      contentType: "image/jpeg",
      contentLength: 1024,
      createdOn: new Date(),
      etag: "new-etag",
    });

    await updateScan({
      scanId: "scan-123",
      metadataAdd: {
        displayName: "updated.jpg",
      },
    });

    const updateCall = mockUpdateBlobObject.mock.calls[0]?.[0];
    expect(updateCall?.metadata?.lastModifiedBy).toBe("user-123");
    expect(updateCall?.metadata?.lastModifiedAt).toBeDefined();
  });
});
