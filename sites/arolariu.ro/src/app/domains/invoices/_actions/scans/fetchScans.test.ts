/**
 * @fileoverview Unit tests for fetchScans server action.
 * @module app/domains/invoices/_actions/scans/fetchScans.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";
import {ScanStatus, ScanType} from "@/types/scans";

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
          uploadedAt: "2024-01-01T00:00:00.000Z",
          originalFileName: "receipt1.jpg",
          status: ScanStatus.READY,
          userIdentifier: "user-123",
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
          uploadedAt: "2024-01-02T00:00:00.000Z",
          originalFileName: "receipt2.jpg",
          status: ScanStatus.READY,
          userIdentifier: "user-123",
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 2048,
          createdOn: new Date("2024-01-02T00:00:00.000Z"),
        },
      },
    ];

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

    vi.doMock("@/lib/utils.server", () => ({
      createErrorResult: vi.fn((error, userMsg) => ({
        success: false,
        userMessage: userMsg ?? error.message,
      })),
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

  it("should exclude scans marked as usedByInvoice", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const mockBlobs = [
      {
        name: "scans/user-123/scan1.jpg",
        metadata: {
          scanId: "scan1",
          uploadedAt: "2024-01-01T00:00:00.000Z",
          originalFileName: "receipt1.jpg",
          status: ScanStatus.READY,
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
          usedByInvoice: "true",
          uploadedAt: "2024-01-02T00:00:00.000Z",
          originalFileName: "receipt2.jpg",
          status: ScanStatus.READY,
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 2048,
          createdOn: new Date("2024-01-02T00:00:00.000Z"),
        },
      },
    ];

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

    vi.doMock("@/lib/utils.server", () => ({
      createErrorResult: vi.fn((error, userMsg) => ({
        success: false,
        userMessage: userMsg ?? error.message,
      })),
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
          uploadedAt: "2024-01-01T00:00:00.000Z",
          originalFileName: "receipt1.jpg",
          status: ScanStatus.READY,
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
          uploadedAt: "2024-01-02T00:00:00.000Z",
          originalFileName: "receipt2.jpg",
          status: ScanStatus.ARCHIVED,
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 2048,
          createdOn: new Date("2024-01-02T00:00:00.000Z"),
        },
      },
    ];

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

    vi.doMock("@/lib/utils.server", () => ({
      createErrorResult: vi.fn((error, userMsg) => ({
        success: false,
        userMessage: userMsg ?? error.message,
      })),
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
          uploadedAt: "2024-01-01T00:00:00.000Z",
          originalFileName: "receipt1.jpg",
          status: ScanStatus.READY,
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
          uploadedAt: "2024-01-02T00:00:00.000Z",
          originalFileName: "receipt2.jpg",
          status: ScanStatus.ARCHIVED,
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 2048,
          createdOn: new Date("2024-01-02T00:00:00.000Z"),
        },
      },
    ];

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

    vi.doMock("@/lib/utils.server", () => ({
      createErrorResult: vi.fn((error, userMsg) => ({
        success: false,
        userMessage: userMsg ?? error.message,
      })),
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

  it("should handle lowercase metadata keys for backward compatibility", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const mockBlobs = [
      {
        name: "scans/user-123/scan1.jpg",
        metadata: {
          scanid: "scan1", // lowercase
          uploadedat: "2024-01-01T00:00:00.000Z",
          originalfilename: "receipt1.jpg",
          status: ScanStatus.READY,
          useridentifier: "user-123",
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 1024,
          createdOn: new Date("2024-01-01T00:00:00.000Z"),
        },
      },
    ];

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

    vi.doMock("@/lib/utils.server", () => ({
      createErrorResult: vi.fn((error, userMsg) => ({
        success: false,
        userMessage: userMsg ?? error.message,
      })),
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

    const {fetchScans} = await import("./fetchScans");

    // Act
    const result = await fetchScans();

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.userMessage).toContain("Failed to fetch scans");
    }
  });

  it("should handle Azure listing errors", async () => {
    // Arrange
    const mockUser = {userIdentifier: "user-123"};
    const azureError = new Error("Storage unavailable");

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
          listBlobsFlat: vi.fn(() => {
            throw azureError;
          }),
        })),
      })),
    }));

    vi.doMock("@/lib/utils.server", () => ({
      createErrorResult: vi.fn((error, userMsg) => ({
        success: false,
        userMessage: userMsg ?? error.message,
      })),
    }));

    const {fetchScans} = await import("./fetchScans");

    // Act
    const result = await fetchScans();

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.userMessage).toContain("Failed to fetch scans");
    }
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

    const {fetchScans} = await import("./fetchScans");

    // Act
    const result = await fetchScans();

    // Assert
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.userMessage).toBe("Failed to fetch scans. Please try again.");
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
          uploadedAt: "2024-01-01T00:00:00.000Z",
          originalFileName: "receipt1.jpg",
          status: ScanStatus.READY,
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
          // Missing scanId
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

    vi.doMock("@/lib/utils.server", () => ({
      createErrorResult: vi.fn((error, userMsg) => ({
        success: false,
        userMessage: userMsg ?? error.message,
      })),
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
        name: "",
        metadata: {
          scanId: "scan-missing-fields",
        },
        properties: {},
      },
    ];

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

    vi.doMock("@/lib/utils.server", () => ({
      createErrorResult: vi.fn((error, userMsg) => ({
        success: false,
        userMessage: userMsg ?? error.message,
      })),
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
        name: "Unknown",
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
          status: "not-a-real-status",
        },
        properties: {
          contentType: "image/jpeg",
          contentLength: 2048,
          createdOn: new Date("2024-01-02T00:00:00.000Z"),
        },
      },
    ];

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

    vi.doMock("@/lib/utils.server", () => ({
      createErrorResult: vi.fn((error, userMsg) => ({
        success: false,
        userMessage: userMsg ?? error.message,
      })),
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
          uploadedAt: "2024-01-01T00:00:00.000Z",
          status: ScanStatus.READY,
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
          uploadedAt: "2024-01-02T00:00:00.000Z",
          status: ScanStatus.READY,
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
          uploadedAt: "2024-01-03T00:00:00.000Z",
          status: ScanStatus.READY,
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
          uploadedAt: "2024-01-04T00:00:00.000Z",
          status: ScanStatus.READY,
        },
        properties: {
          contentType: "text/plain",
          contentLength: 512,
          createdOn: new Date("2024-01-04T00:00:00.000Z"),
        },
      },
    ];

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

    vi.doMock("@/lib/utils.server", () => ({
      createErrorResult: vi.fn((error, userMsg) => ({
        success: false,
        userMessage: userMsg ?? error.message,
      })),
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
