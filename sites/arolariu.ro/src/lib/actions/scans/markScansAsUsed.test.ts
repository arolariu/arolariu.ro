/**
 * @fileoverview Unit tests for markScansAsUsed server action.
 * @module lib/actions/scans/markScansAsUsed.test
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

// Mock instrumentation
vi.mock("@/instrumentation.server", () => ({
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
  withSpan: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),
  getTraceparentHeader: vi.fn(() => ""),
  injectTraceContextHeaders: vi.fn(() => ({})),
}));

// Hoist all mock functions
const {mockFetchConfigurationValue, mockGetProperties, mockSetMetadata, mockGetBlockBlobClient, mockGetContainerClient} = vi.hoisted(
  () => ({
    mockFetchConfigurationValue: vi.fn(),
    mockGetProperties: vi.fn(),
    mockSetMetadata: vi.fn(),
    mockGetBlockBlobClient: vi.fn(),
    mockGetContainerClient: vi.fn(),
  }),
);

// Mock storage config
vi.mock("@/lib/actions/storage/fetchConfig", () => ({
  default: mockFetchConfigurationValue,
}));

// Mock storageClient
vi.mock("@/lib/azure/storageClient", () => ({
  createBlobClient: vi.fn(async () => ({
    getContainerClient: (...args: unknown[]) => mockGetContainerClient(...args),
  })),
}));

// Import after mocks
import {markScansAsUsed} from "./markScansAsUsed";

describe("markScansAsUsed", () => {
  const mockStorageEndpoint = "http://mock-storage:10000/devstoreaccount1";
  const mockEtag = '"0x8DCABCD12345678"';

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful setup
    mockFetchConfigurationValue.mockResolvedValue(mockStorageEndpoint);

    mockGetProperties.mockResolvedValue({
      etag: mockEtag,
      metadata: {
        userIdentifier: "test-user-guid",
        scanId: "scan-001",
      },
    });

    mockSetMetadata.mockResolvedValue({
      _response: {status: 200},
    });

    mockGetBlockBlobClient.mockReturnValue({
      getProperties: mockGetProperties,
      setMetadata: mockSetMetadata,
    });

    mockGetContainerClient.mockReturnValue({
      getBlockBlobClient: mockGetBlockBlobClient,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("successful marking", () => {
    it("should mark single scan as used successfully", async () => {
      // Arrange
      const blobNames = ["scans/user-123/scan-001.jpg"];

      // Act
      await markScansAsUsed({blobNames});

      // Assert
      expect(mockFetchConfigurationValue).toHaveBeenCalledWith("Endpoints:Storage:Blob");
      expect(mockGetContainerClient).toHaveBeenCalledWith("invoices");
      expect(mockGetBlockBlobClient).toHaveBeenCalledWith("scans/user-123/scan-001.jpg");
      expect(mockGetProperties).toHaveBeenCalled();
      expect(mockSetMetadata).toHaveBeenCalledWith(
        {
          userIdentifier: "test-user-guid",
          scanId: "scan-001",
          usedByInvoice: "true",
          status: "archived",
        },
        {
          conditions: {ifMatch: mockEtag},
        },
      );
    });

    it("should mark multiple scans as used successfully", async () => {
      // Arrange
      const blobNames = ["scans/user-123/scan-001.jpg", "scans/user-123/scan-002.jpg", "scans/user-123/scan-003.pdf"];

      // Act
      await markScansAsUsed({blobNames});

      // Assert
      expect(mockGetBlockBlobClient).toHaveBeenCalledTimes(3);
      expect(mockGetProperties).toHaveBeenCalledTimes(3);
      expect(mockSetMetadata).toHaveBeenCalledTimes(3);
    });

    it("should preserve existing metadata when marking as used", async () => {
      // Arrange
      mockGetProperties.mockResolvedValue({
        etag: mockEtag,
        metadata: {
          userIdentifier: "test-user-guid",
          scanId: "scan-001",
          customField: "custom-value",
          uploadedAt: "2024-01-01T00:00:00.000Z",
        },
      });

      const blobNames = ["scans/user-123/scan-001.jpg"];

      // Act
      await markScansAsUsed({blobNames});

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(
        {
          userIdentifier: "test-user-guid",
          scanId: "scan-001",
          customField: "custom-value",
          uploadedAt: "2024-01-01T00:00:00.000Z",
          usedByInvoice: "true",
          status: "archived",
        },
        {
          conditions: {ifMatch: mockEtag},
        },
      );
    });

    it("should handle blobs with no existing metadata", async () => {
      // Arrange
      mockGetProperties.mockResolvedValue({
        etag: mockEtag,
        metadata: undefined,
      });

      const blobNames = ["scans/user-123/scan-001.jpg"];

      // Act
      await markScansAsUsed({blobNames});

      // Assert
      expect(mockSetMetadata).toHaveBeenCalledWith(
        {
          usedByInvoice: "true",
          status: "archived",
        },
        {
          conditions: {ifMatch: mockEtag},
        },
      );
    });

    it("should handle empty blobNames array", async () => {
      // Arrange
      const blobNames: string[] = [];

      // Act
      await markScansAsUsed({blobNames});

      // Assert
      expect(mockGetBlockBlobClient).not.toHaveBeenCalled();
      expect(mockSetMetadata).not.toHaveBeenCalled();
    });
  });

  describe("partial failure scenarios", () => {
    it("should continue marking other scans when one fails", async () => {
      // Arrange
      const blobNames = ["scans/user-123/scan-001.jpg", "scans/user-123/scan-002.jpg", "scans/user-123/scan-003.jpg"];

      // Mock second scan to fail
      let callCount = 0;
      mockSetMetadata.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error("Blob not found"));
        }
        return Promise.resolve({_response: {status: 200}});
      });

      // Act
      await markScansAsUsed({blobNames});

      // Assert - all three should be attempted
      expect(mockGetBlockBlobClient).toHaveBeenCalledTimes(3);
      expect(mockSetMetadata).toHaveBeenCalledTimes(3);
    });

    it("should handle getProperties failure for individual blob", async () => {
      // Arrange
      const blobNames = ["scans/user-123/scan-001.jpg", "scans/user-123/scan-002.jpg"];

      // Mock first blob getProperties to fail
      let callCount = 0;
      mockGetProperties.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("Properties fetch failed"));
        }
        return Promise.resolve({
          etag: mockEtag,
          metadata: {},
        });
      });

      // Act
      await markScansAsUsed({blobNames});

      // Assert - second blob should still be processed
      expect(mockGetBlockBlobClient).toHaveBeenCalledTimes(2);
      expect(mockSetMetadata).toHaveBeenCalledTimes(1); // Only successful one
    });

    it("should handle etag mismatch (conditional write failure)", async () => {
      // Arrange
      const blobNames = ["scans/user-123/scan-001.jpg"];

      // Mock etag mismatch error
      mockSetMetadata.mockRejectedValue(new Error("The condition specified using HTTP conditional header(s) is not met"));

      // Act
      await markScansAsUsed({blobNames});

      // Assert - should not throw, best-effort operation
      expect(mockSetMetadata).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should handle storage connection failure gracefully", async () => {
      // Arrange
      mockFetchConfigurationValue.mockRejectedValue(new Error("Config service unavailable"));
      const blobNames = ["scans/user-123/scan-001.jpg"];

      // Act & Assert - should not throw
      await expect(markScansAsUsed({blobNames})).resolves.toBeUndefined();
    });

    it("should handle createBlobClient failure gracefully", async () => {
      // Arrange
      vi.doMock("@/lib/azure/storageClient", () => ({
        createBlobClient: vi.fn().mockRejectedValue(new Error("Storage client creation failed")),
      }));

      const blobNames = ["scans/user-123/scan-001.jpg"];

      // Act & Assert - should not throw, best-effort operation
      await expect(markScansAsUsed({blobNames})).resolves.toBeUndefined();
    });

    it("should handle network timeout gracefully", async () => {
      // Arrange
      mockSetMetadata.mockRejectedValue(new Error("Network timeout"));
      const blobNames = ["scans/user-123/scan-001.jpg"];

      // Act & Assert - should not throw
      await expect(markScansAsUsed({blobNames})).resolves.toBeUndefined();
    });

    it("should handle blob not found error gracefully", async () => {
      // Arrange
      mockGetProperties.mockRejectedValue(new Error("BlobNotFound"));
      const blobNames = ["scans/user-123/nonexistent-scan.jpg"];

      // Act & Assert - should not throw
      await expect(markScansAsUsed({blobNames})).resolves.toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should handle blob names with special characters", async () => {
      // Arrange
      const blobNames = ["scans/user-123/scan with spaces & special!chars.jpg"];

      // Act
      await markScansAsUsed({blobNames});

      // Assert
      expect(mockGetBlockBlobClient).toHaveBeenCalledWith("scans/user-123/scan with spaces & special!chars.jpg");
    });

    it("should handle very long blob paths", async () => {
      // Arrange
      const longPath = "scans/user-123/" + "a".repeat(200) + ".jpg";
      const blobNames = [longPath];

      // Act
      await markScansAsUsed({blobNames});

      // Assert
      expect(mockGetBlockBlobClient).toHaveBeenCalledWith(longPath);
    });

    it("should process all blobs even with many failures", async () => {
      // Arrange
      const blobNames = Array.from({length: 10}, (_, i) => `scans/user-123/scan-${i}.jpg`);

      // Mock all to fail
      mockSetMetadata.mockRejectedValue(new Error("All failed"));

      // Act
      await markScansAsUsed({blobNames});

      // Assert - all should be attempted
      expect(mockGetBlockBlobClient).toHaveBeenCalledTimes(10);
    });
  });
});
