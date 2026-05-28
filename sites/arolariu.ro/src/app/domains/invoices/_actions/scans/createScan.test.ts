/**
 * @fileoverview Unit tests for createScan server action.
 * @module app/domains/invoices/_actions/scans/createScan.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";
import {buildScan} from "@/../../tests/helpers/invoiceDomain";
import {ScanStatus, ScanType} from "@/types/scans";

describe("createScan", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should successfully upload a scan with valid base64 data", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const mockBlobUrl = "https://storage.test/invoices/scans/user-123/scan_123.jpg";
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
            url: mockBlobUrl,
            uploadData: vi.fn(() => Promise.resolve(mockUploadResponse)),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("@/lib/utils.server", () => ({
      convertBase64ToBlob: vi.fn(() =>
        Promise.resolve(new Blob(["test"], {type: "image/jpeg"})),
      ),
      createErrorResult: vi.fn((error) => ({
        success: false,
        userMessage: error.message,
      })),
    }));

    const {createScan} = await import("./createScan");

    // Act
    const result = await createScan({
      base64Data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
    });

    // Assert
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
    // Arrange
    const mockUser = {userIdentifier: "user-456"};
    const mockBlobUrl = "https://storage.test/invoices/scans/user-456/scan_456.png";
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
            url: mockBlobUrl,
            uploadData: vi.fn(() => Promise.resolve(mockUploadResponse)),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("@/lib/utils.server", () => ({
      convertBase64ToBlob: vi.fn(() =>
        Promise.resolve(new Blob(["test"], {type: "image/png"})),
      ),
      createErrorResult: vi.fn((error) => ({
        success: false,
        userMessage: error.message,
      })),
    }));

    const {createScan} = await import("./createScan");

    // Act
    const result = await createScan({
      base64Data: "data:image/png;base64,iVBORw0KG...",
      fileName: "invoice.png",
      mimeType: "image/png",
    });

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scan.mimeType).toBe("image/png");
      expect(result.data.scan.name).toBe("invoice.png");
    }
  });

  it("should handle PDF uploads correctly", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-789"};
    const mockBlobUrl = "https://storage.test/invoices/scans/user-789/scan_789.pdf";
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
            url: mockBlobUrl,
            uploadData: vi.fn(() => Promise.resolve(mockUploadResponse)),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("@/lib/utils.server", () => ({
      convertBase64ToBlob: vi.fn(() =>
        Promise.resolve(new Blob(["test"], {type: "application/pdf"})),
      ),
      createErrorResult: vi.fn((error) => ({
        success: false,
        userMessage: error.message,
      })),
    }));

    const {createScan} = await import("./createScan");

    // Act
    const result = await createScan({
      base64Data: "JVBERi0xLjcKCjE...",
      fileName: "document.pdf",
      mimeType: "application/pdf",
    });

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scan.mimeType).toBe("application/pdf");
    }
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

    vi.doMock("@/lib/utils.server", () => ({
      convertBase64ToBlob: vi.fn(),
      createErrorResult: vi.fn((error) => ({
        success: false,
        userMessage: error.message,
      })),
    }));

    const {createScan} = await import("./createScan");

    // Act
    const result = await createScan({
      base64Data: "test",
      fileName: "test.jpg",
      mimeType: "image/jpeg",
    });

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.userMessage).toBe("Unauthorized");
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
            uploadData: vi.fn(() => Promise.resolve(mockUploadResponse)),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("@/lib/utils.server", () => ({
      convertBase64ToBlob: vi.fn(() =>
        Promise.resolve(new Blob(["test"], {type: "image/jpeg"})),
      ),
      createErrorResult: vi.fn((error) => ({
        success: false,
        userMessage: error.message,
      })),
    }));

    const {createScan} = await import("./createScan");

    // Act
    const result = await createScan({
      base64Data: "test",
      fileName: "test.jpg",
      mimeType: "image/jpeg",
    });

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe(500);
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
            url: "https://storage.test/blob",
            uploadData: vi.fn(),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("@/lib/utils.server", () => ({
      convertBase64ToBlob: vi.fn(() => Promise.reject(conversionError)),
      createErrorResult: vi.fn((error) => ({
        success: false,
        userMessage: error.message,
      })),
    }));

    const {createScan} = await import("./createScan");

    // Act
    const result = await createScan({
      base64Data: "invalid!!!",
      fileName: "test.jpg",
      mimeType: "image/jpeg",
    });

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.userMessage).toBe("Invalid base64 data");
    }
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
      default: vi.fn(() => Promise.resolve("https://storage.test")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => {
          throw "String error"; // Non-Error throw
        }),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("@/lib/utils.server", () => ({
      convertBase64ToBlob: vi.fn(() =>
        Promise.resolve(new Blob(["test"], {type: "image/jpeg"})),
      ),
      createErrorResult: vi.fn((error) => ({
        success: false,
        userMessage: error.message,
      })),
    }));

    const {createScan} = await import("./createScan");

    // Act
    const result = await createScan({
      base64Data: "test",
      fileName: "test.jpg",
      mimeType: "image/jpeg",
    });

    // Assert
    expect(result.success).toBe(false);
  });

  it("should preserve original filename in metadata", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-meta"};
    const mockBlobUrl = "https://storage.test/invoices/scans/user-meta/scan_meta.jpg";
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
            url: mockBlobUrl,
            uploadData: vi.fn((data, options) => {
              capturedMetadata = options.metadata ?? {};
              return Promise.resolve({_response: {status: 201}});
            }),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("@/lib/utils.server", () => ({
      convertBase64ToBlob: vi.fn(() =>
        Promise.resolve(new Blob(["test"], {type: "image/jpeg"})),
      ),
      createErrorResult: vi.fn((error) => ({
        success: false,
        userMessage: error.message,
      })),
    }));

    const {createScan} = await import("./createScan");

    // Act
    await createScan({
      base64Data: "test",
      fileName: "my-original-receipt.jpg",
      mimeType: "image/jpeg",
    });

    // Assert
    expect(capturedMetadata.originalFileName).toBe("my-original-receipt.jpg");
    expect(capturedMetadata.status).toBe(ScanStatus.READY);
    expect(capturedMetadata.userIdentifier).toBe("user-meta");
  });

  it("should handle unsupported MIME types as OTHER", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-unsupported"};
    const mockBlobUrl = "https://storage.test/invoices/scans/user-unsupported/scan_unsup.txt";
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
            url: mockBlobUrl,
            uploadData: vi.fn(() => Promise.resolve(mockUploadResponse)),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("@/lib/utils.server", () => ({
      convertBase64ToBlob: vi.fn(() =>
        Promise.resolve(new Blob(["test"], {type: "text/plain"})),
      ),
      createErrorResult: vi.fn((error) => ({
        success: false,
        userMessage: error.message,
      })),
    }));

    const {createScan} = await import("./createScan");

    // Act
    const result = await createScan({
      base64Data: "test",
      fileName: "textfile.txt",
      mimeType: "text/plain",
    });

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scan.mimeType).toBe("text/plain");
      expect(result.data.scan.scanType).toBe(ScanType.OTHER);
    }
  });
});
