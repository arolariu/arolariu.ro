/**
 * @fileoverview Unit tests for registerScan server action.
 * @module app/domains/invoices/_actions/scans/registerScan.test
 */

import {ScanStatus, ScanType} from "@/types/scans";
import {beforeEach, describe, expect, it, vi} from "vitest";

describe("registerScan", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should successfully register a scan with valid blob URL", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const validBlobUrl = "https://storage.test/invoices/scans/user-123/scan_123.jpg";

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
            setMetadata: vi.fn(() => Promise.resolve()),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const {registerScan} = await import("./registerScan");

    // Act
    const result = await registerScan({
      scanId: "scan_123",
      blobUrl: validBlobUrl,
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1024,
    });

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.scan?.id).toBe("scan_123");
      expect(result.scan?.userIdentifier).toBe("user-123");
      expect(result.scan?.name).toBe("receipt.jpg");
      expect(result.scan?.mimeType).toBe("image/jpeg");
      expect(result.scan?.sizeInBytes).toBe(1024);
      expect(result.scan?.status).toBe(ScanStatus.READY);
    }
  });

  it("should reject registration for blob URL not owned by user", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const otherUserBlobUrl = "https://storage.test/invoices/scans/user-456/scan_456.jpg";

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/user/fetchUser", () => ({
      fetchBFFUserFromAuthService: vi.fn(() => Promise.resolve(mockUser)),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    const {registerScan} = await import("./registerScan");

    // Act
    const result = await registerScan({
      scanId: "scan_456",
      blobUrl: otherUserBlobUrl,
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1024,
    });

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid blob URL");
    }
  });

  it("should reject registration for blob URL not in scans directory", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const wrongPathUrl = "https://storage.test/invoices/user-123/scan_123.jpg";

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/user/fetchUser", () => ({
      fetchBFFUserFromAuthService: vi.fn(() => Promise.resolve(mockUser)),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    const {registerScan} = await import("./registerScan");

    // Act
    const result = await registerScan({
      scanId: "scan_123",
      blobUrl: wrongPathUrl,
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1024,
    });

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid blob URL");
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

    const {registerScan} = await import("./registerScan");

    // Act
    const result = await registerScan({
      scanId: "scan_123",
      blobUrl: "https://storage.test/invoices/scans/user-123/scan_123.jpg",
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1024,
    });

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to register scan");
    }
  });

  it("should handle missing userIdentifier", async () => {
    // Arrange
    const mockUser = {userIdentifier: ""};

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/user/fetchUser", () => ({
      fetchBFFUserFromAuthService: vi.fn(() => Promise.resolve(mockUser)),
    }));

    const {registerScan} = await import("./registerScan");

    // Act
    const result = await registerScan({
      scanId: "scan_123",
      blobUrl: "https://storage.test/invoices/scans/user-123/scan_123.jpg",
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1024,
    });

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Authentication required");
    }
  });

  it("should handle metadata setting failures gracefully (non-fatal)", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const validBlobUrl = "https://storage.test/invoices/scans/user-123/scan_123.jpg";

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
            setMetadata: vi.fn(() => Promise.reject(new Error("Metadata write failed"))),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const {registerScan} = await import("./registerScan");

    // Act
    const result = await registerScan({
      scanId: "scan_123",
      blobUrl: validBlobUrl,
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1024,
    });

    // Assert - Should still succeed even if metadata write fails
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.scan?.id).toBe("scan_123");
    }
  });

  it("should revalidate scan listing paths after registration", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const validBlobUrl = "https://storage.test/invoices/scans/user-123/scan_123.jpg";
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
            setMetadata: vi.fn(() => Promise.resolve()),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("next/cache", () => ({
      revalidatePath: revalidateSpy,
    }));

    const {registerScan} = await import("./registerScan");

    // Act
    await registerScan({
      scanId: "scan_123",
      blobUrl: validBlobUrl,
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1024,
    });

    // Assert
    expect(revalidateSpy).toHaveBeenCalledWith("/domains/invoices/view-scans", "page");
    expect(revalidateSpy).toHaveBeenCalledWith("/domains/invoices/upload-scans", "page");
  });

  it("should normalize Azurite URLs before validation", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const azuriteBlobUrl = "http://localhost:10000/devstoreaccount1/invoices/scans/user-123/scan_123.jpg";

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/user/fetchUser", () => ({
      fetchBFFUserFromAuthService: vi.fn(() => Promise.resolve(mockUser)),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("http://localhost:10000")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn(() => ({
            setMetadata: vi.fn(() => Promise.resolve()),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url.replace("devstoreaccount1/", "")),
    }));

    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const {registerScan} = await import("./registerScan");

    // Act
    const result = await registerScan({
      scanId: "scan_123",
      blobUrl: azuriteBlobUrl,
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1024,
    });

    // Assert
    expect(result.success).toBe(true);
  });

  it("should handle non-Error thrown exceptions", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/user/fetchUser", () => ({
      fetchBFFUserFromAuthService: vi.fn(() => Promise.resolve(mockUser)),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      rewriteAzuriteUrl: vi.fn(() => {
        throw "String error";
      }),
    }));

    const {registerScan} = await import("./registerScan");

    // Act
    const result = await registerScan({
      scanId: "scan_123",
      blobUrl: "https://storage.test/invoices/scans/user-123/scan_123.jpg",
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1024,
    });

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Failed to register scan");
    }
  });

  it("should correctly set metadata with all required fields", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-meta"};
    const validBlobUrl = "https://storage.test/invoices/scans/user-meta/scan_meta.jpg";
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
            setMetadata: vi.fn((metadata) => {
              capturedMetadata = metadata;
              return Promise.resolve();
            }),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const {registerScan} = await import("./registerScan");

    // Act
    await registerScan({
      scanId: "scan_meta",
      blobUrl: validBlobUrl,
      fileName: "test-receipt.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 2048,
    });

    // Assert
    expect(capturedMetadata.userIdentifier).toBe("user-meta");
    expect(capturedMetadata.scanId).toBe("scan_meta");
    expect(capturedMetadata.originalFileName).toBe("test-receipt.jpg");
    expect(capturedMetadata.status).toBe(ScanStatus.READY);
    expect(capturedMetadata.uploadedAt).toBeTruthy();
  });

  it("should handle unsupported MIME types as OTHER scanType", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-unsupported"};
    const validBlobUrl = "https://storage.test/invoices/scans/user-unsupported/scan_txt.txt";

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
            setMetadata: vi.fn(() => Promise.resolve()),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const {registerScan} = await import("./registerScan");

    // Act
    const result = await registerScan({
      scanId: "scan_txt",
      blobUrl: validBlobUrl,
      fileName: "document.txt",
      mimeType: "text/plain",
      sizeInBytes: 256,
    });

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.scan?.scanType).toBe(ScanType.OTHER);
      expect(result.scan?.mimeType).toBe("text/plain");
    }
  });

  it("should classify supported MIME type variants", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-mime"};

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
            setMetadata: vi.fn(() => Promise.resolve()),
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const {registerScan} = await import("./registerScan");

    // Act
    const jpgResult = await registerScan({
      scanId: "scan_jpg",
      blobUrl: "https://storage.test/invoices/scans/user-mime/scan_jpg.jpg",
      fileName: "receipt.jpg",
      mimeType: "image/jpg",
      sizeInBytes: 1024,
    });
    const pngResult = await registerScan({
      scanId: "scan_png",
      blobUrl: "https://storage.test/invoices/scans/user-mime/scan_png.png",
      fileName: "receipt.png",
      mimeType: "image/png",
      sizeInBytes: 1024,
    });
    const pdfResult = await registerScan({
      scanId: "scan_pdf",
      blobUrl: "https://storage.test/invoices/scans/user-mime/scan_pdf.pdf",
      fileName: "receipt.pdf",
      mimeType: "application/pdf",
      sizeInBytes: 1024,
    });

    // Assert
    expect(jpgResult.success).toBe(true);
    expect(pngResult.success).toBe(true);
    expect(pdfResult.success).toBe(true);
    if (jpgResult.success && pngResult.success && pdfResult.success) {
      expect(jpgResult.scan.scanType).toBe(ScanType.JPEG);
      expect(pngResult.scan.scanType).toBe(ScanType.PNG);
      expect(pdfResult.scan.scanType).toBe(ScanType.PDF);
    }
  });

  it("should derive blob name from URLs without the invoices container segment", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-path"};
    let capturedBlobName = "";

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
          getBlockBlobClient: vi.fn((blobName) => {
            capturedBlobName = blobName;
            return {
              setMetadata: vi.fn(() => Promise.resolve()),
            };
          }),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const {registerScan} = await import("./registerScan");

    // Act
    const result = await registerScan({
      scanId: "scan_path",
      blobUrl: "https://storage.test/scans/user-path/scan_path.jpg",
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1024,
    });

    // Assert
    expect(result.success).toBe(true);
    expect(capturedBlobName).toBe("scans/user-path/scan_path.jpg");
  });
});
