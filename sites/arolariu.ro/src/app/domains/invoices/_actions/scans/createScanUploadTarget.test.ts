/**
 * @fileoverview Unit tests for createScanUploadTarget server action.
 * @module app/domains/invoices/_actions/scans/createScanUploadTarget.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";

describe("createScanUploadTarget", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should generate upload target with metadata for production (HTTPS)", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/user/fetchUser", () => ({
      fetchBFFUserFromAuthService: vi.fn(() => Promise.resolve(mockUser)),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("https://storage.prod.test")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobUploadTarget: vi.fn(() =>
        Promise.resolve({
          sasUrl: "https://storage.prod.test/invoices/scans/user-123/test.jpg?sv=2024-05-04&sp=cw",
          blobName: "scans/user-123/test.jpg",
          blobUrl: "https://storage.prod.test/invoices/scans/user-123/test.jpg",
          expiresAt: new Date(),
          requiredHeaders: {
            "x-ms-blob-type": "BlockBlob",
            "Content-Type": "image/jpeg",
            "x-ms-meta-scanId": "scan-123",
            "x-ms-meta-ownerId": "user-123",
          },
        }),
      ),
    }));

    const {createScanUploadTarget} = await import("./createScanUploadTarget");

    // Act
    const result = await createScanUploadTarget({
      fileName: "test.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1024,
    });

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sasUrl).toContain("?");
      expect(result.data.blobName).toContain("scans/user-123");
      expect(result.data.scanId).toBeTruthy();
      expect(result.data.requiredHeaders).toHaveProperty("x-ms-blob-type");
      expect(result.data.metadata).toHaveProperty("scanId");
      expect(result.data.metadata).toHaveProperty("ownerId", "user-123");
    }
  });

  it("should return upload target for development (HTTP/Azurite)", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-dev"};

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/user/fetchUser", () => ({
      fetchBFFUserFromAuthService: vi.fn(() => Promise.resolve(mockUser)),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("http://localhost:10000/devstoreaccount1")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobUploadTarget: vi.fn(() =>
        Promise.resolve({
          sasUrl: "http://localhost:10000/devstoreaccount1/invoices/scans/user-dev/test.jpg",
          blobName: "scans/user-dev/test.jpg",
          blobUrl: "http://localhost:10000/devstoreaccount1/invoices/scans/user-dev/test.jpg",
          expiresAt: new Date(),
          requiredHeaders: {
            "x-ms-blob-type": "BlockBlob",
            "Content-Type": "image/jpeg",
            "x-ms-meta-scanId": "scan-dev",
            "x-ms-meta-ownerId": "user-dev",
          },
        }),
      ),
    }));

    const {createScanUploadTarget} = await import("./createScanUploadTarget");

    // Act
    const result = await createScanUploadTarget({
      fileName: "test.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1024,
    });

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sasUrl).not.toContain("?"); // No SAS token for HTTP
      expect(result.data.blobName).toContain("scans/user-dev");
      expect(result.data.metadata).toHaveProperty("ownerId", "user-dev");
    }
  });
});
