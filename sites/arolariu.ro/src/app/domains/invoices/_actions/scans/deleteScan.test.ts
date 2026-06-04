/**
 * @fileoverview Unit tests for deleteScan server action.
 * @module app/domains/invoices/_actions/scans/deleteScan.test
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {deleteBlobObject, resolveBlobObjectByMetadata} from "@/lib/azure/storageClient";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";
import {deleteScan} from "./deleteScan";

vi.mock("@/instrumentation.server");
vi.mock("@/lib/actions/storage/fetchConfig");
vi.mock("@/lib/actions/user/fetchUser");
vi.mock("@/lib/azure/storageClient");

const mockFetchBFFUserFromAuthService = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchConfigurationValue = vi.mocked(fetchConfigurationValue);
const mockResolveBlobObjectByMetadata = vi.mocked(resolveBlobObjectByMetadata);
const mockDeleteBlobObject = vi.mocked(deleteBlobObject);
const mockWithSpan = vi.mocked(withSpan);
const mockAddSpanEvent = vi.mocked(addSpanEvent);
const mockLogWithTrace = vi.mocked(logWithTrace);

describe("deleteScan", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockWithSpan.mockImplementation((_name, fn) => (fn as () => Promise<unknown>)());
    mockAddSpanEvent.mockImplementation(() => undefined);
    mockLogWithTrace.mockImplementation(() => undefined);
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-123"}));
    mockFetchConfigurationValue.mockResolvedValue("https://storage.test");
  });

  it("should successfully delete a scan owned by the user", async () => {
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

    mockDeleteBlobObject.mockResolvedValue({succeeded: true});

    const result = await deleteScan({scanId: "scan-123"});

    expect(result.success).toBe(true);

    // Verify resolveBlobObjectByMetadata was called
    expect(mockResolveBlobObjectByMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        storageEndpoint: "https://storage.test",
        containerName: "invoices",
        prefix: "scans/user-123/",
        predicate: expect.any(Function),
      })
    );

    // Verify deleteBlobObject was called
    expect(mockDeleteBlobObject).toHaveBeenCalledWith({
      storageEndpoint: "https://storage.test",
      containerName: "invoices",
      blobName: "scans/user-123/scan_123.jpg",
    });
  });

  it("should reject deletion attempt for scan owned by another user", async () => {
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

    const result = await deleteScan({scanId: "scan-456"});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("not authorized");
    }

    // Verify deleteBlobObject was NOT called
    expect(mockDeleteBlobObject).not.toHaveBeenCalled();
  });

  it("should handle scan not found", async () => {
    mockResolveBlobObjectByMetadata.mockResolvedValue(null);

    const result = await deleteScan({scanId: "scan-not-found"});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("not found");
    }

    // Verify deleteBlobObject was NOT called
    expect(mockDeleteBlobObject).not.toHaveBeenCalled();
  });

  it("should handle Azure delete operation with error code", async () => {
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

    mockDeleteBlobObject.mockResolvedValue({succeeded: false, errorCode: "BlobNotFound"});

    const result = await deleteScan({scanId: "scan-123"});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Failed to delete");
    }
  });

  it("should handle authentication failures", async () => {
    mockFetchBFFUserFromAuthService.mockRejectedValue(new Error("Unauthorized"));

    const result = await deleteScan({scanId: "scan-123"});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Unauthorized");
    }
  });

  it("should handle non-Error thrown exceptions", async () => {
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-123"}));
    mockFetchConfigurationValue.mockImplementation(() => {
      throw "String error";
    });

    const result = await deleteScan({scanId: "scan-123"});

    expect(result.success).toBe(false);
  });

  it("should succeed even when blob does not exist (idempotent)", async () => {
    mockResolveBlobObjectByMetadata.mockResolvedValue({
      name: "scans/user-123/nonexistent.jpg",
      url: "https://storage.test/invoices/scans/user-123/nonexistent.jpg",
      metadata: {
        scanId: "scan-nonexistent",
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

    mockDeleteBlobObject.mockResolvedValue({succeeded: true});

    const result = await deleteScan({scanId: "scan-nonexistent"});

    expect(result.success).toBe(true);
  });

  it("should handle invalid metadata during resolution", async () => {
    // Mock resolveBlobObjectByMetadata to return a blob with invalid metadata
    // that will fail parsing
    mockResolveBlobObjectByMetadata.mockResolvedValue(null);  // Not found due to invalid metadata

    const result = await deleteScan({scanId: "scan-invalid"});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("not found");
    }
  });

  it("should handle Azure storage failures", async () => {
    mockResolveBlobObjectByMetadata.mockRejectedValue(new Error("Storage connection failed"));

    const result = await deleteScan({scanId: "scan-123"});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Storage connection failed");
    }
  });
});
