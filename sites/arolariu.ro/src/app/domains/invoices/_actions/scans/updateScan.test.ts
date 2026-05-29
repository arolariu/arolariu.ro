/**
 * @fileoverview Unit tests for updateScan server action.
 * @module app/domains/invoices/_actions/scans/updateScan.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";

describe("updateScan", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should successfully update scan blob content", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const existingMetadata = {
      scanId: "scan_123",
      userIdentifier: "user-123",
      uploadedAt: "2024-01-01T00:00:00.000Z",
      status: "ready",
    };
    const mockUploadResponse = {_response: {status: 201}};

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/user/fetchUser", () => ({
      fetchBFFUserFromAuthService: vi.fn(() => Promise.resolve(mockUser)),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("https://storage.test")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn(() => ({
            url: "https://storage.test/invoices/scans/user-123/scan_123.jpg",
            getProperties: vi.fn(() =>
              Promise.resolve({metadata: existingMetadata}),
            ),
            uploadData: vi.fn(() => Promise.resolve(mockUploadResponse)),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("@/lib/utils.server", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/utils.server")>()),
      convertBase64ToBlob: vi.fn(() =>
        Promise.resolve(new Blob(["updated"], {type: "image/jpeg"})),
      ),
    }));

    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const {updateScan} = await import("./updateScan");

    // Act
    const result = await updateScan({
      base64Data: "new-data",
      blobName: "scans/user-123/scan_123.jpg",
      mimeType: "image/jpeg",
    });

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.blobUrl).toContain("scans/user-123/scan_123.jpg");
    }
  });

  it("should merge new metadata with existing metadata", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const existingMetadata = {
      scanId: "scan_123",
      userIdentifier: "user-123",
      uploadedAt: "2024-01-01T00:00:00.000Z",
      status: "ready",
      customField: "preserved",
    };
    let capturedMetadata: Record<string, string> = {};

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/user/fetchUser", () => ({
      fetchBFFUserFromAuthService: vi.fn(() => Promise.resolve(mockUser)),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("https://storage.test")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn(() => ({
            url: "https://storage.test/invoices/scans/user-123/scan_123.jpg",
            getProperties: vi.fn(() =>
              Promise.resolve({metadata: existingMetadata}),
            ),
            uploadData: vi.fn((data, options) => {
              capturedMetadata = options.metadata ?? {};
              return Promise.resolve({_response: {status: 201}});
            }),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("@/lib/utils.server", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/utils.server")>()),
      convertBase64ToBlob: vi.fn(() =>
        Promise.resolve(new Blob(["updated"], {type: "image/jpeg"})),
      ),
    }));

    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const {updateScan} = await import("./updateScan");

    // Act
    await updateScan({
      base64Data: "new-data",
      blobName: "scans/user-123/scan_123.jpg",
      mimeType: "image/jpeg",
      metadata: {rotated: "90"},
    });

    // Assert
    expect(capturedMetadata.scanId).toBe("scan_123");
    expect(capturedMetadata.customField).toBe("preserved");
    expect(capturedMetadata.rotated).toBe("90");
    expect(capturedMetadata.lastModifiedAt).toBeTruthy();
    expect(capturedMetadata.lastModifiedBy).toBe("user-123");
  });

  it("should update blobs that do not have existing metadata", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-empty-metadata"};
    let capturedMetadata: Record<string, string> = {};

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/user/fetchUser", () => ({
      fetchBFFUserFromAuthService: vi.fn(() => Promise.resolve(mockUser)),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("https://storage.test")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn(() => ({
            url: "https://storage.test/invoices/scans/user-empty-metadata/scan.jpg",
            getProperties: vi.fn(() => Promise.resolve({})),
            uploadData: vi.fn((data, options) => {
              capturedMetadata = options.metadata ?? {};
              return Promise.resolve({_response: {status: 201}});
            }),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("@/lib/utils.server", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/utils.server")>()),
      convertBase64ToBlob: vi.fn(() =>
        Promise.resolve(new Blob(["updated"], {type: "image/jpeg"})),
      ),
    }));

    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const {updateScan} = await import("./updateScan");

    // Act
    const result = await updateScan({
      base64Data: "new-data",
      blobName: "scans/user-empty-metadata/scan.jpg",
      mimeType: "image/jpeg",
      metadata: {rotated: "90"},
    });

    // Assert
    expect(result.success).toBe(true);
    expect(capturedMetadata.rotated).toBe("90");
    expect(capturedMetadata.lastModifiedBy).toBe("user-empty-metadata");
  });

  it("should handle authentication failures", async () => {
    // Arrange
    const authError = new Error("Unauthorized");

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/user/fetchUser", () => ({
      fetchBFFUserFromAuthService: vi.fn(() => Promise.reject(authError)),
    }));

    const {updateScan} = await import("./updateScan");

    // Act
    const result = await updateScan({
      base64Data: "data",
      blobName: "scans/user-123/test.jpg",
      mimeType: "image/jpeg",
    });

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Unauthorized");
    }
  });

  it("should handle Azure upload failures with non-201 status", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-fail"};
    const mockUploadResponse = {_response: {status: 500}};

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/user/fetchUser", () => ({
      fetchBFFUserFromAuthService: vi.fn(() => Promise.resolve(mockUser)),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("https://storage.test")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn(() => ({
            url: "https://storage.test/blob",
            getProperties: vi.fn(() => Promise.resolve({metadata: {}})),
            uploadData: vi.fn(() => Promise.resolve(mockUploadResponse)),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("@/lib/utils.server", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/utils.server")>()),
      convertBase64ToBlob: vi.fn(() =>
        Promise.resolve(new Blob(["data"], {type: "image/jpeg"})),
      ),
    }));

    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const {updateScan} = await import("./updateScan");

    // Act
    const result = await updateScan({
      base64Data: "data",
      blobName: "scans/user-fail/test.jpg",
      mimeType: "image/jpeg",
    });

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Failed to update scan");
    }
  });

  it("should handle base64 conversion errors", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-error"};
    const conversionError = new Error("Invalid base64 data");

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/user/fetchUser", () => ({
      fetchBFFUserFromAuthService: vi.fn(() => Promise.resolve(mockUser)),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("https://storage.test")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn(() => ({
            getProperties: vi.fn(() => Promise.resolve({metadata: {}})),
            uploadData: vi.fn(),
          })),
        })),
      })),
    }));

    vi.doMock("@/lib/utils.server", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/utils.server")>()),
      convertBase64ToBlob: vi.fn(() => Promise.reject(conversionError)),
    }));

    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const {updateScan} = await import("./updateScan");

    // Act
    const result = await updateScan({
      base64Data: "invalid!!!",
      blobName: "scans/user-error/test.jpg",
      mimeType: "image/jpeg",
    });

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Invalid base64 data");
    }
  });

  it("should revalidate view-scans path after update", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const revalidateSpy = vi.fn();

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/user/fetchUser", () => ({
      fetchBFFUserFromAuthService: vi.fn(() => Promise.resolve(mockUser)),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("https://storage.test")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn(() => ({
            url: "https://storage.test/blob",
            getProperties: vi.fn(() => Promise.resolve({metadata: {}})),
            uploadData: vi.fn(() => Promise.resolve({_response: {status: 201}})),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("@/lib/utils.server", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/utils.server")>()),
      convertBase64ToBlob: vi.fn(() =>
        Promise.resolve(new Blob(["data"], {type: "image/jpeg"})),
      ),
    }));

    vi.doMock("next/cache", () => ({
      revalidatePath: revalidateSpy,
    }));

    const {updateScan} = await import("./updateScan");

    // Act
    await updateScan({
      base64Data: "data",
      blobName: "scans/user-123/test.jpg",
      mimeType: "image/jpeg",
    });

    // Assert
    expect(revalidateSpy).toHaveBeenCalledWith("/domains/invoices/view-scans", "page");
  });

  it("should handle non-Error thrown exceptions", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-weird"};

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/user/fetchUser", () => ({
      fetchBFFUserFromAuthService: vi.fn(() => Promise.resolve(mockUser)),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => {
        throw "String error";
      }),
    }));

    const {updateScan} = await import("./updateScan");

    // Act
    const result = await updateScan({
      base64Data: "data",
      blobName: "scans/user-weird/test.jpg",
      mimeType: "image/jpeg",
    });

    // Assert
    expect(result.success).toBe(false);
  });

  it("should update MIME type in blob headers", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-mime"};
    let capturedHeaders: Record<string, string | undefined> = {};

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/user/fetchUser", () => ({
      fetchBFFUserFromAuthService: vi.fn(() => Promise.resolve(mockUser)),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("https://storage.test")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn(() => ({
            url: "https://storage.test/blob",
            getProperties: vi.fn(() => Promise.resolve({metadata: {}})),
            uploadData: vi.fn((data, options) => {
              capturedHeaders = options.blobHTTPHeaders ?? {};
              return Promise.resolve({_response: {status: 201}});
            }),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("@/lib/utils.server", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/utils.server")>()),
      convertBase64ToBlob: vi.fn(() =>
        Promise.resolve(new Blob(["data"], {type: "application/pdf"})),
      ),
    }));

    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const {updateScan} = await import("./updateScan");

    // Act
    await updateScan({
      base64Data: "pdf-data",
      blobName: "scans/user-mime/document.pdf",
      mimeType: "application/pdf",
    });

    // Assert
    expect(capturedHeaders.blobContentType).toBe("application/pdf");
  });
});
