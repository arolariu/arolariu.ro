/**
 * @fileoverview Unit tests for fetchScans server action.
 * @module app/domains/invoices/_actions/scans/fetchScans.test
 */

import {ScanStatus, ScanType} from "@/types/scans";
import {beforeEach, describe, expect, it, vi} from "vitest";

describe("fetchScans", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should successfully fetch scans for authenticated user", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const mockBlobs = [
      {
        name: "scans/user-123/scan1_1609459200000.jpg",
        metadata: {
          scanId: "scan1",
          ownerId: "user-123",
          displayName: "receipt1.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready",
          uploadedAt: "2024-01-01T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 1024,
          createdOn: new Date("2024-01-01T00:00:00.000Z"),
        },
      },
      {
        name: "scans/user-123/scan2_1609545600000.jpg",
        metadata: {
          scanId: "scan2",
          ownerId: "user-123",
          displayName: "receipt2.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready",
          uploadedAt: "2024-01-02T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 2048,
          createdOn: new Date("2024-01-02T00:00:00.000Z"),
        },
      },
    ];

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
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
          listBlobsFlat: vi.fn(function* () {
            yield* mockBlobs;
          }),
          getBlockBlobClient: vi.fn((name) => ({
            url: `https://storage.test/invoices/${name}`,
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    const {fetchScans} = await import("./fetchScans");

    // Act
    const result = await fetchScans();

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]?.id).toBe("scan2"); // Newest first
      expect(result.data[1]?.id).toBe("scan1");
    }
  });

  it("should exclude attached scans by default", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const mockBlobs = [
      {
        name: "scans/user-123/scan1.jpg",
        metadata: {
          scanId: "scan1",
          ownerId: "user-123",
          displayName: "receipt1.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready",
          uploadedAt: "2024-01-01T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 1024,
          createdOn: new Date("2024-01-01T00:00:00.000Z"),
        },
      },
      {
        name: "scans/user-123/scan2.jpg",
        metadata: {
          scanId: "scan2",
          ownerId: "user-123",
          displayName: "receipt2.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "attached",
          uploadedAt: "2024-01-02T00:00:00.000Z",
          uploadedBy: "user-123",
          attachedAt: "2024-01-02T01:00:00.000Z",
          attachedBy: "user-123",
          attachedTo: "invoice-123",
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 2048,
          createdOn: new Date("2024-01-02T00:00:00.000Z"),
        },
      },
    ];

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
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
          listBlobsFlat: vi.fn(function* () {
            yield* mockBlobs;
          }),
          getBlockBlobClient: vi.fn((name) => ({
            url: `https://storage.test/invoices/${name}`,
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    const {fetchScans} = await import("./fetchScans");

    // Act
    const result = await fetchScans();

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe("scan1");
    }
  });

  it("should exclude archived scans by default", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const mockBlobs = [
      {
        name: "scans/user-123/scan1.jpg",
        metadata: {
          scanId: "scan1",
          ownerId: "user-123",
          displayName: "receipt1.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready",
          uploadedAt: "2024-01-01T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 1024,
          createdOn: new Date("2024-01-01T00:00:00.000Z"),
        },
      },
      {
        name: "scans/user-123/scan2.jpg",
        metadata: {
          scanId: "scan2",
          ownerId: "user-123",
          displayName: "receipt2.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "archived",
          uploadedAt: "2024-01-02T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 2048,
          createdOn: new Date("2024-01-02T00:00:00.000Z"),
        },
      },
    ];

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
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
          listBlobsFlat: vi.fn(function* () {
            yield* mockBlobs;
          }),
          getBlockBlobClient: vi.fn((name) => ({
            url: `https://storage.test/invoices/${name}`,
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    const {fetchScans} = await import("./fetchScans");

    // Act
    const result = await fetchScans({includeArchived: false});

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe("scan1");
    }
  });

  it("should include archived scans when includeArchived is true", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const mockBlobs = [
      {
        name: "scans/user-123/scan1.jpg",
        metadata: {
          scanId: "scan1",
          ownerId: "user-123",
          displayName: "receipt1.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready",
          uploadedAt: "2024-01-01T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 1024,
          createdOn: new Date("2024-01-01T00:00:00.000Z"),
        },
      },
      {
        name: "scans/user-123/scan2.jpg",
        metadata: {
          scanId: "scan2",
          ownerId: "user-123",
          displayName: "receipt2.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "archived",
          uploadedAt: "2024-01-02T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 2048,
          createdOn: new Date("2024-01-02T00:00:00.000Z"),
        },
      },
    ];

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
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
          listBlobsFlat: vi.fn(function* () {
            yield* mockBlobs;
          }),
          getBlockBlobClient: vi.fn((name) => ({
            url: `https://storage.test/invoices/${name}`,
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    const {fetchScans} = await import("./fetchScans");

    // Act
    const result = await fetchScans({includeArchived: true});

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it("should skip scans with invalid metadata", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const mockBlobs = [
      {
        name: "scans/user-123/scan1.jpg",
        metadata: {
          scanId: "scan1",
          ownerId: "user-123",
          displayName: "receipt1.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready",
          uploadedAt: "2024-01-01T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 1024,
          createdOn: new Date("2024-01-01T00:00:00.000Z"),
        },
      },
      {
        name: "scans/user-123/scan2.jpg",
        metadata: {
          scanId: "scan2",
          // Missing required fields - should be skipped
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 2048,
          createdOn: new Date("2024-01-02T00:00:00.000Z"),
        },
      },
    ];

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
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
          listBlobsFlat: vi.fn(function* () {
            yield* mockBlobs;
          }),
          getBlockBlobClient: vi.fn((name) => ({
            url: `https://storage.test/invoices/${name}`,
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    const {fetchScans} = await import("./fetchScans");

    // Act
    const result = await fetchScans();

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe("scan1");
      expect(result.data[0]?.name).toBe("receipt1.jpg");
    }
  });

  it("should handle authentication failures", async () => {
    // Arrange
    const authError = new Error("Unauthorized");

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/user/fetchUser", () => ({
      fetchBFFUserFromAuthService: vi.fn(() => Promise.reject(authError)),
    }));

    const {fetchScans} = await import("./fetchScans");

    // Act
    const result = await fetchScans();

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Unauthorized");
    }
  });

  it("should handle Azure listing errors", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const azureError = new Error("Storage unavailable");

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
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
          listBlobsFlat: vi.fn(() => {
            throw azureError;
          }),
        })),
      })),
    }));

    const {fetchScans} = await import("./fetchScans");

    // Act
    const result = await fetchScans();

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Storage unavailable");
    }
  });

  it("should handle non-Error thrown exceptions", async () => {
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
      default: vi.fn(() => {
        throw "String error";
      }),
    }));

    const {fetchScans} = await import("./fetchScans");

    // Act
    const result = await fetchScans();

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("An unexpected error occurred");
    }
  });

  it("should skip scans without scanId metadata", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const mockBlobs = [
      {
        name: "scans/user-123/scan1.jpg",
        metadata: {
          scanId: "scan1",
          ownerId: "user-123",
          displayName: "receipt1.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready",
          uploadedAt: "2024-01-01T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 1024,
          createdOn: new Date("2024-01-01T00:00:00.000Z"),
        },
      },
      {
        name: "scans/user-123/corrupted.jpg",
        metadata: {
          // Missing scanId and other required fields
          uploadedAt: "2024-01-02T00:00:00.000Z",
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 2048,
          createdOn: new Date("2024-01-02T00:00:00.000Z"),
        },
      },
    ];

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
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
          listBlobsFlat: vi.fn(function* () {
            yield* mockBlobs;
          }),
          getBlockBlobClient: vi.fn((name) => ({
            url: `https://storage.test/invoices/${name}`,
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    const {fetchScans} = await import("./fetchScans");

    // Act
    const result = await fetchScans();

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe("scan1");
    }
  });

  it("should default optional blob properties when metadata and properties are missing", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const mockBlobs = [
      {
        name: "scans/user-123/scan-missing-fields.jpg",
        metadata: {
          scanId: "scan-missing-fields",
          ownerId: "user-123",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready",
          uploadedAt: "2024-01-01T00:00:00.000Z",
          uploadedBy: "user-123",
          // Missing displayName - should fall back to blob name
        },
        properties: {
          // Missing contentType and contentLength - should use defaults
        },
      },
    ];

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
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
          listBlobsFlat: vi.fn(function* () {
            yield* mockBlobs;
          }),
          getBlockBlobClient: vi.fn((name) => ({
            url: `https://storage.test/invoices/${name}`,
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    const {fetchScans} = await import("./fetchScans");

    // Act
    const result = await fetchScans();

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0]).toMatchObject({
        id: "scan-missing-fields",
        userIdentifier: "user-123",
        name: "scan-missing-fields.jpg",
        mimeType: "application/octet-stream",
        sizeInBytes: 0,
      });
    }
  });

  it("should skip blobs without metadata and normalize invalid statuses", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const mockBlobs = [
      {
        name: "scans/user-123/no-metadata.jpg",
        properties: {
          contentType: "image/jpeg",
          contentLength: 1024,
          createdOn: new Date("2024-01-01T00:00:00.000Z"),
        },
      },
      {
        name: "scans/user-123/invalid-status.jpg",
        metadata: {
          scanId: "invalid-status",
          ownerId: "user-123",
          displayName: "invalid.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready", // Valid status
          uploadedAt: "2024-01-02T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 2048,
          createdOn: new Date("2024-01-02T00:00:00.000Z"),
        },
      },
    ];

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
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
          listBlobsFlat: vi.fn(function* () {
            yield* mockBlobs;
          }),
          getBlockBlobClient: vi.fn((name) => ({
            url: `https://storage.test/invoices/${name}`,
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    const {fetchScans} = await import("./fetchScans");

    // Act
    const result = await fetchScans();

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe("invalid-status");
      expect(result.data[0]?.status).toBe(ScanStatus.READY);
    }
  });

  it("should correctly classify scan types based on MIME type", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const mockBlobs = [
      {
        name: "scans/user-123/scan1.jpg",
        metadata: {
          scanId: "scan1",
          ownerId: "user-123",
          displayName: "scan1.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready",
          uploadedAt: "2024-01-01T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 1024,
          createdOn: new Date("2024-01-01T00:00:00.000Z"),
        },
      },
      {
        name: "scans/user-123/scan2.png",
        metadata: {
          scanId: "scan2",
          ownerId: "user-123",
          displayName: "scan2.png",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready",
          uploadedAt: "2024-01-02T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        properties: {
          contentType: "image/png",
          contentLength: 2048,
          createdOn: new Date("2024-01-02T00:00:00.000Z"),
        },
      },
      {
        name: "scans/user-123/scan3.pdf",
        metadata: {
          scanId: "scan3",
          ownerId: "user-123",
          displayName: "scan3.pdf",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready",
          uploadedAt: "2024-01-03T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        properties: {
          contentType: "application/pdf",
          contentLength: 4096,
          createdOn: new Date("2024-01-03T00:00:00.000Z"),
        },
      },
      {
        name: "scans/user-123/scan4.txt",
        metadata: {
          scanId: "scan4",
          ownerId: "user-123",
          displayName: "scan4.txt",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready",
          uploadedAt: "2024-01-04T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        properties: {
          contentType: "text/plain",
          contentLength: 512,
          createdOn: new Date("2024-01-04T00:00:00.000Z"),
        },
      },
    ];

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
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
          listBlobsFlat: vi.fn(function* () {
            yield* mockBlobs;
          }),
          getBlockBlobClient: vi.fn((name) => ({
            url: `https://storage.test/invoices/${name}`,
          })),
        })),
      })),
      rewriteAzuriteUrl: vi.fn((url) => url),
    }));

    const {fetchScans} = await import("./fetchScans");

    // Act
    const result = await fetchScans();

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      const jpeg = result.data.find((s) => s.id === "scan1");
      const png = result.data.find((s) => s.id === "scan2");
      const pdf = result.data.find((s) => s.id === "scan3");
      const other = result.data.find((s) => s.id === "scan4");

      expect(jpeg?.scanType).toBe(ScanType.JPEG);
      expect(png?.scanType).toBe(ScanType.PNG);
      expect(pdf?.scanType).toBe(ScanType.PDF);
      expect(other?.scanType).toBe(ScanType.OTHER);
    }
  });
});
