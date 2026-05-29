/**
 * @fileoverview Unit tests for deleteScan server action.
 * @module app/domains/invoices/_actions/scans/deleteScan.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";

describe("deleteScan", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should successfully delete a scan owned by the user", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const mockBlobUrl = "https://storage.test/invoices/scans/user-123/scan_123.jpg";
    const mockDeleteResponse = {succeeded: true, errorCode: undefined};

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
            deleteIfExists: vi.fn(() => Promise.resolve(mockDeleteResponse)),
          })),
        })),
      })),
    }));

    const {deleteScan} = await import("./deleteScan");

    // Act
    const result = await deleteScan({blobUrl: mockBlobUrl});

    // Assert
    expect(result.success).toBe(true);
  });

  it("should reject deletion attempt for scan owned by another user", async () => {
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

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("https://storage.test")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn(() => ({
            deleteIfExists: vi.fn(),
          })),
        })),
      })),
    }));

    const {deleteScan} = await import("./deleteScan");

    // Act
    const result = await deleteScan({blobUrl: otherUserBlobUrl});

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("not authorized");
    }
  });

  it("should reject deletion for blob not in scans directory", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const wrongPrefixUrl = "https://storage.test/invoices/user-123/scan_123.jpg";

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
            deleteIfExists: vi.fn(),
          })),
        })),
      })),
    }));

    const {deleteScan} = await import("./deleteScan");

    // Act
    const result = await deleteScan({blobUrl: wrongPrefixUrl});

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("not authorized");
    }
  });

  it("should handle Azure delete operation with error code", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const mockBlobUrl = "https://storage.test/invoices/scans/user-123/scan_123.jpg";
    const mockDeleteResponse = {succeeded: false, errorCode: "BlobNotFound"};

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
            deleteIfExists: vi.fn(() => Promise.resolve(mockDeleteResponse)),
          })),
        })),
      })),
    }));

    const {deleteScan} = await import("./deleteScan");

    // Act
    const result = await deleteScan({blobUrl: mockBlobUrl});

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Failed to delete");
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

    const {deleteScan} = await import("./deleteScan");

    // Act
    const result = await deleteScan({
      blobUrl: "https://storage.test/invoices/scans/user-123/scan.jpg",
    });

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Unauthorized");
    }
  });

  it("should handle malformed blob URLs gracefully", async () => {
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

    const {deleteScan} = await import("./deleteScan");

    // Act
    const result = await deleteScan({blobUrl: "not-a-valid-url"});

    // Assert
    expect(result.success).toBe(false);
  });

  it("should reject blob URLs without a container path", async () => {
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
      default: vi.fn(() => Promise.resolve("https://storage.test")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn(() => ({
            deleteIfExists: vi.fn(),
          })),
        })),
      })),
    }));

    const {deleteScan} = await import("./deleteScan");

    // Act
    const result = await deleteScan({blobUrl: "https://storage.test"});

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Invalid scan URL.");
    }
  });

  it("should handle non-Error thrown exceptions", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const mockBlobUrl = "https://storage.test/invoices/scans/user-123/scan.jpg";

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
          throw "String error";
        }),
      })),
    }));

    const {deleteScan} = await import("./deleteScan");

    // Act
    const result = await deleteScan({blobUrl: mockBlobUrl});

    // Assert
    expect(result.success).toBe(false);
  });

  it("should succeed even when blob does not exist (idempotent)", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const mockBlobUrl = "https://storage.test/invoices/scans/user-123/nonexistent.jpg";
    const mockDeleteResponse = {succeeded: true, errorCode: undefined};

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
            deleteIfExists: vi.fn(() => Promise.resolve(mockDeleteResponse)),
          })),
        })),
      })),
    }));

    const {deleteScan} = await import("./deleteScan");

    // Act
    const result = await deleteScan({blobUrl: mockBlobUrl});

    // Assert
    expect(result.success).toBe(true);
  });
});
