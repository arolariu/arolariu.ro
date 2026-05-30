/**
 * @fileoverview Unit tests for markScansAsUsed server action.
 * @module app/domains/invoices/_actions/scans/markScansAsUsed.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";

describe("markScansAsUsed", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should successfully mark multiple scans as used", async () => {
    // Arrange
    const mockBlobs = [
      {
        name: "scans/user-123/scan1.jpg",
        metadata: {scanId: "scan1", status: "ready"},
        etag: "etag1",
      },
      {
        name: "scans/user-123/scan2.jpg",
        metadata: {scanId: "scan2", status: "ready"},
        etag: "etag2",
      },
    ];

    const setMetadataCalls: Array<{name: string; metadata: Record<string, string>}> = [];

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("https://storage.test")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn((blobName) => {
            const mockBlob = mockBlobs.find((b) => b.name === blobName);
            return {
              getProperties: vi.fn(() =>
                Promise.resolve({
                  metadata: mockBlob?.metadata,
                  etag: mockBlob?.etag,
                }),
              ),
              setMetadata: vi.fn((metadata, _options) => {
                setMetadataCalls.push({name: blobName, metadata});
                return Promise.resolve();
              }),
            };
          }),
        })),
      })),
    }));

    const {markScansAsUsed} = await import("./markScansAsUsed");

    // Act
    await markScansAsUsed({
      blobNames: ["scans/user-123/scan1.jpg", "scans/user-123/scan2.jpg"],
    });

    // Assert
    expect(setMetadataCalls).toHaveLength(2);
    setMetadataCalls.forEach((call) => {
      expect(call.metadata["usedByInvoice"]).toBe("true");
      expect(call.metadata["status"]).toBe("archived");
    });
  });

  it("should preserve existing metadata while adding used flags", async () => {
    // Arrange
    const existingMetadata = {
      scanId: "scan1",
      userIdentifier: "user-123",
      uploadedAt: "2024-01-01T00:00:00.000Z",
      originalFileName: "receipt.jpg",
      status: "ready",
    };

    let capturedMetadata: Record<string, string> = {};

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("https://storage.test")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn(() => ({
            getProperties: vi.fn(() =>
              Promise.resolve({
                metadata: existingMetadata,
                etag: "etag1",
              }),
            ),
            setMetadata: vi.fn((metadata, _options) => {
              capturedMetadata = metadata;
              return Promise.resolve();
            }),
          })),
        })),
      })),
    }));

    const {markScansAsUsed} = await import("./markScansAsUsed");

    // Act
    await markScansAsUsed({blobNames: ["scans/user-123/scan1.jpg"]});

    // Assert
    expect(capturedMetadata["scanId"]).toBe("scan1");
    expect(capturedMetadata["userIdentifier"]).toBe("user-123");
    expect(capturedMetadata["uploadedAt"]).toBe("2024-01-01T00:00:00.000Z");
    expect(capturedMetadata["originalFileName"]).toBe("receipt.jpg");
    expect(capturedMetadata["usedByInvoice"]).toBe("true");
    expect(capturedMetadata["status"]).toBe("archived");
  });

  it("should create metadata when the blob has no existing metadata", async () => {
    // Arrange
    let capturedMetadata: Record<string, string> = {};

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("https://storage.test")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn(() => ({
            getProperties: vi.fn(() => Promise.resolve({etag: "etag-without-metadata"})),
            setMetadata: vi.fn((metadata) => {
              capturedMetadata = metadata;
              return Promise.resolve();
            }),
          })),
        })),
      })),
    }));

    const {markScansAsUsed} = await import("./markScansAsUsed");

    // Act
    await markScansAsUsed({blobNames: ["scans/user-123/no-metadata.jpg"]});

    // Assert
    expect(capturedMetadata["usedByInvoice"]).toBe("true");
    expect(capturedMetadata["status"]).toBe("archived");
  });

  it("should handle individual blob failures gracefully (best-effort)", async () => {
    // Arrange
    const goodBlob = "scans/user-123/good.jpg";
    const failBlob = "scans/user-123/fail.jpg";

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("https://storage.test")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn((blobName) => {
            if (blobName === failBlob) {
              return {
                getProperties: vi.fn(() => Promise.reject(new Error("Blob not found"))),
              };
            }
            return {
              getProperties: vi.fn(() =>
                Promise.resolve({
                  metadata: {scanId: "good"},
                  etag: "etag-good",
                }),
              ),
              setMetadata: vi.fn(() => Promise.resolve()),
            };
          }),
        })),
      })),
    }));

    const {markScansAsUsed} = await import("./markScansAsUsed");

    // Act - should not throw despite one failure
    await expect(markScansAsUsed({blobNames: [goodBlob, failBlob]})).resolves.not.toThrow();
  });

  it("should handle empty blob names array", async () => {
    // Arrange
    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("https://storage.test")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn(),
        })),
      })),
    }));

    const {markScansAsUsed} = await import("./markScansAsUsed");

    // Act
    await expect(markScansAsUsed({blobNames: []})).resolves.not.toThrow();
  });

  it("should handle storage connection failures gracefully", async () => {
    // Arrange
    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.reject(new Error("Config unavailable"))),
    }));

    const {markScansAsUsed} = await import("./markScansAsUsed");

    // Act - should not throw (best-effort)
    await expect(markScansAsUsed({blobNames: ["scans/user-123/test.jpg"]})).resolves.not.toThrow();
  });

  it("should process blobs in parallel using Promise.allSettled", async () => {
    // Arrange
    const delayedBlobs = ["scans/user-123/blob1.jpg", "scans/user-123/blob2.jpg", "scans/user-123/blob3.jpg"];

    const processedBlobs: string[] = [];

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("https://storage.test")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn((blobName) => ({
            getProperties: vi.fn(async () => {
              processedBlobs.push(blobName);
              return {metadata: {}, etag: "etag"};
            }),
            setMetadata: vi.fn(() => Promise.resolve()),
          })),
        })),
      })),
    }));

    const {markScansAsUsed} = await import("./markScansAsUsed");

    // Act
    await markScansAsUsed({blobNames: delayedBlobs});

    // Assert
    expect(processedBlobs).toHaveLength(3);
    expect(processedBlobs).toEqual(expect.arrayContaining(delayedBlobs));
  });

  it("should handle non-Error thrown exceptions", async () => {
    // Arrange
    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => {
        throw "String error";
      }),
    }));

    const {markScansAsUsed} = await import("./markScansAsUsed");

    // Act - should not throw (best-effort)
    await expect(markScansAsUsed({blobNames: ["test.jpg"]})).resolves.not.toThrow();
  });

  it("should use conditional write with etag to prevent race conditions", async () => {
    // Arrange
    let capturedConditions: unknown = null;

    vi.doMock("@/instrumentation.server", () => ({
      withSpan: vi.fn((_name, fn) => fn()),
      addSpanEvent: vi.fn(),
      logWithTrace: vi.fn(),
    }));

    vi.doMock("@/lib/actions/storage/fetchConfig", () => ({
      default: vi.fn(() => Promise.resolve("https://storage.test")),
    }));

    vi.doMock("@/lib/azure/storageClient", () => ({
      createBlobClient: vi.fn(() => ({
        getContainerClient: vi.fn(() => ({
          getBlockBlobClient: vi.fn(() => ({
            getProperties: vi.fn(() =>
              Promise.resolve({
                metadata: {scanId: "scan1"},
                etag: "expected-etag",
              }),
            ),
            setMetadata: vi.fn((_metadata, options) => {
              capturedConditions = options?.conditions;
              return Promise.resolve();
            }),
          })),
        })),
      })),
    }));

    const {markScansAsUsed} = await import("./markScansAsUsed");

    // Act
    await markScansAsUsed({blobNames: ["scans/user-123/scan1.jpg"]});

    // Assert
    expect(capturedConditions).toMatchObject({ifMatch: "expected-etag"});
  });
});
