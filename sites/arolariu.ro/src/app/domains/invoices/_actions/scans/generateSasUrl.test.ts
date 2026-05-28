/**
 * @fileoverview Unit tests for generateUploadSasUrl server action.
 * @module app/domains/invoices/_actions/scans/generateSasUrl.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";

describe("generateUploadSasUrl", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should generate SAS URL for production (HTTPS)", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const mockSasToken = "sv=2024-05-04&se=2024-12-31T23:59:59Z&sp=cw&sig=signature";
    const mockDelegationKey = {
      value: "key",
      signedOid: "oid",
      signedTid: "tid",
      signedStart: new Date(),
      signedExpiry: new Date(),
      signedService: "b",
      signedVersion: "2024-05-04",
    };

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((name, fn) => fn()),
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
      createBlobClient: vi.fn(() => ({
        accountName: "storageaccount",
        getUserDelegationKey: vi.fn(() => Promise.resolve(mockDelegationKey)),
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn(() => ({
            url: "https://storage.prod.test/invoices/scans/user-123/test.jpg",
          })),
        })),
      })),
    }));

    vi.doMock("@azure/storage-blob", () => ({
      BlobSASPermissions: {
        parse: vi.fn(() => ({permissions: "cw"})),
      },
      generateBlobSASQueryParameters: vi.fn(() => ({
        toString: () => mockSasToken,
      })),
    }));

    vi.doMock("@/lib/utils.server", () => ({
      createErrorResult: vi.fn((error, userMsg) => ({
        success: false,
        userMessage: userMsg ?? error.message,
      })),
    }));

    const {generateUploadSasUrl} = await import("./generateSasUrl");

    // Act
    const result = await generateUploadSasUrl({
      fileName: "test.jpg",
      mimeType: "image/jpeg",
    });

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sasUrl).toContain("?");
      expect(result.data.sasUrl).toContain(mockSasToken);
      expect(result.data.blobName).toContain("scans/user-123");
      expect(result.data.scanId).toBeTruthy();
    }
  });

  it("should return direct URL for development (HTTP/Azurite)", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-dev"};

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((name, fn) => fn()),
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
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn(() => ({
            url: "http://localhost:10000/devstoreaccount1/invoices/scans/user-dev/test.jpg",
          })),
        })),
      })),
    }));

    vi.doMock("@/lib/utils.server", () => ({
      createErrorResult: vi.fn((error, userMsg) => ({
        success: false,
        userMessage: userMsg ?? error.message,
      })),
    }));

    const {generateUploadSasUrl} = await import("./generateSasUrl");

    // Act
    const result = await generateUploadSasUrl({
      fileName: "test.jpg",
      mimeType: "image/jpeg",
    });

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sasUrl).not.toContain("?");
      expect(result.data.sasUrl).toBe(result.data.blobUrl);
    }
  });

  it("should generate unique scan IDs for concurrent requests", async () => {
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

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("http://localhost:10000")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn((name) => ({
            url: `http://localhost:10000/invoices/${name}`,
          })),
        })),
      })),
    }));

    vi.doMock("@/lib/utils.server", () => ({
      createErrorResult: vi.fn((error, userMsg) => ({
        success: false,
        userMessage: userMsg ?? error.message,
      })),
    }));

    const {generateUploadSasUrl} = await import("./generateSasUrl");

    // Act
    const result1 = await generateUploadSasUrl({fileName: "file1.jpg", mimeType: "image/jpeg"});
    const result2 = await generateUploadSasUrl({fileName: "file2.jpg", mimeType: "image/jpeg"});

    // Assert
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    if (result1.success && result2.success) {
      expect(result1.data.scanId).not.toBe(result2.data.scanId);
      expect(result1.data.blobName).not.toBe(result2.data.blobName);
    }
  });

  it("should preserve file extension in blob name", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-ext"};

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
          getBlockBlobClient: vi.fn((name) => ({
            url: `http://localhost:10000/invoices/${name}`,
          })),
        })),
      })),
    }));

    vi.doMock("@/lib/utils.server", () => ({
      createErrorResult: vi.fn((error, userMsg) => ({
        success: false,
        userMessage: userMsg ?? error.message,
      })),
    }));

    const {generateUploadSasUrl} = await import("./generateSasUrl");

    // Act
    const pdfResult = await generateUploadSasUrl({fileName: "document.pdf", mimeType: "application/pdf"});
    const pngResult = await generateUploadSasUrl({fileName: "image.png", mimeType: "image/png"});

    // Assert
    expect(pdfResult.success).toBe(true);
    expect(pngResult.success).toBe(true);
    if (pdfResult.success && pngResult.success) {
      expect(pdfResult.data.blobName).toContain(".pdf");
      expect(pngResult.data.blobName).toContain(".png");
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
      createErrorResult: vi.fn((error, userMsg) => ({
        success: false,
        userMessage: userMsg ?? error.message,
      })),
    }));

    const {generateUploadSasUrl} = await import("./generateSasUrl");

    // Act
    const result = await generateUploadSasUrl({fileName: "test.jpg", mimeType: "image/jpeg"});

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.userMessage).toBe("Unauthorized");
    }
  });

  it("should handle user delegation key failures in production", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-fail"};
    const delegationError = new Error("Failed to get delegation key");

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((name, fn) => fn()),
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
      createBlobClient: vi.fn(() => ({
        accountName: "storageaccount",
        getUserDelegationKey: vi.fn(() => Promise.reject(delegationError)),
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn(() => ({
            url: "https://storage.prod.test/invoices/scans/user-fail/test.jpg",
          })),
        })),
      })),
    }));

    vi.doMock("@/lib/utils.server", () => ({
      createErrorResult: vi.fn((error, userMsg) => ({
        success: false,
        userMessage: userMsg ?? error.message,
      })),
    }));

    const {generateUploadSasUrl} = await import("./generateSasUrl");

    // Act
    const result = await generateUploadSasUrl({fileName: "test.jpg", mimeType: "image/jpeg"});

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.userMessage).toContain("Failed to get delegation key");
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
      default: vi.fn(() => {
        throw "String error";
      }),
    }));

    vi.doMock("@/lib/utils.server", () => ({
      createErrorResult: vi.fn((error, userMsg) => ({
        success: false,
        userMessage: userMsg ?? error.message,
      })),
    }));

    const {generateUploadSasUrl} = await import("./generateSasUrl");

    // Act
    const result = await generateUploadSasUrl({fileName: "test.jpg", mimeType: "image/jpeg"});

    // Assert
    expect(result.success).toBe(false);
  });
});
