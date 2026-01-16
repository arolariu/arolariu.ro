/**
 * @fileoverview Tests for deleteScan server action.
 * @module lib/actions/scans/deleteScan.test
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

// Mock instrumentation
vi.mock("@/instrumentation.server", () => ({
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
  withSpan: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),
}));

// Mock fetchUser
const mockFetchBFFUser = vi.fn();
vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: () => mockFetchBFFUser(),
}));

// Mock Azure Identity
vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: class MockDefaultAzureCredential {},
}));

// Mock Azure Blob Storage - use vi.hoisted to make mocks available during module load
const {mockDeleteIfExists, mockGetBlockBlobClient, mockGetContainerClient} = vi.hoisted(() => ({
  mockDeleteIfExists: vi.fn(),
  mockGetBlockBlobClient: vi.fn(),
  mockGetContainerClient: vi.fn(),
}));

vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: class MockBlobServiceClient {
    getContainerClient(...args: unknown[]) {
      return mockGetContainerClient(...args);
    }
  },
}));

// Import after mocks
import {deleteScan} from "./deleteScan";

describe("deleteScan", () => {
  const validBlobUrl = "https://qtcy47sacc.blob.core.windows.net/invoices/scans/test-user-guid/scan-001.jpg";

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchBFFUser.mockResolvedValue({
      userIdentifier: "test-user-guid",
      userJwt: "mock-jwt-token",
    });

    mockDeleteIfExists.mockResolvedValue({
      succeeded: true,
      errorCode: undefined,
    });

    mockGetBlockBlobClient.mockReturnValue({
      deleteIfExists: mockDeleteIfExists,
    });

    mockGetContainerClient.mockReturnValue({
      getBlockBlobClient: mockGetBlockBlobClient,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("authentication", () => {
    it("should return error when user is not authenticated", async () => {
      mockFetchBFFUser.mockResolvedValue({
        userIdentifier: null,
        userJwt: "token",
      });

      const result = await deleteScan({blobUrl: validBlobUrl});

      expect(result.success).toBe(false);
      expect(result.error).toBe("User must be authenticated to delete scans");
    });

    it("should return error when userIdentifier is empty", async () => {
      mockFetchBFFUser.mockResolvedValue({
        userIdentifier: "",
        userJwt: "token",
      });

      const result = await deleteScan({blobUrl: validBlobUrl});

      expect(result.success).toBe(false);
      expect(result.error).toBe("User must be authenticated to delete scans");
    });
  });

  describe("authorization", () => {
    it("should return error when user does not own the scan", async () => {
      const otherUserBlobUrl = "https://qtcy47sacc.blob.core.windows.net/invoices/scans/other-user/scan-001.jpg";

      const result = await deleteScan({blobUrl: otherUserBlobUrl});

      expect(result.success).toBe(false);
      expect(result.error).toBe("You do not have permission to delete this scan");
    });
  });

  describe("successful deletion", () => {
    it("should delete scan successfully", async () => {
      const result = await deleteScan({blobUrl: validBlobUrl});

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockDeleteIfExists).toHaveBeenCalled();
    });

    it("should return success when blob does not exist", async () => {
      mockDeleteIfExists.mockResolvedValue({
        succeeded: false,
        errorCode: undefined,
      });

      const result = await deleteScan({blobUrl: validBlobUrl});

      expect(result.success).toBe(true);
    });
  });

  describe("deletion failures", () => {
    it("should return error when deletion fails with error code", async () => {
      mockDeleteIfExists.mockResolvedValue({
        succeeded: false,
        errorCode: "BlobNotFound",
      });

      const result = await deleteScan({blobUrl: validBlobUrl});

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to delete scan: BlobNotFound");
    });

    it("should return error when Azure throws exception", async () => {
      mockDeleteIfExists.mockRejectedValue(new Error("Azure Storage error"));

      const result = await deleteScan({blobUrl: validBlobUrl});

      expect(result.success).toBe(false);
      expect(result.error).toBe("Azure Storage error");
    });

    it("should handle non-Error thrown values", async () => {
      mockDeleteIfExists.mockRejectedValue("String error");

      const result = await deleteScan({blobUrl: validBlobUrl});

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error occurred");
    });
  });

  describe("URL parsing", () => {
    it("should correctly parse blob name from URL", async () => {
      await deleteScan({blobUrl: validBlobUrl});

      expect(mockGetBlockBlobClient).toHaveBeenCalledWith("scans/test-user-guid/scan-001.jpg");
    });

    it("should handle URLs with multiple path segments", async () => {
      const complexUrl = "https://qtcy47sacc.blob.core.windows.net/invoices/scans/test-user-guid/subfolder/scan-001.jpg";

      await deleteScan({blobUrl: complexUrl});

      expect(mockGetBlockBlobClient).toHaveBeenCalledWith("scans/test-user-guid/subfolder/scan-001.jpg");
    });
  });

  describe("error handling", () => {
    it("should return error when auth service fails", async () => {
      mockFetchBFFUser.mockRejectedValue(new Error("Auth service unavailable"));

      const result = await deleteScan({blobUrl: validBlobUrl});

      expect(result.success).toBe(false);
      expect(result.error).toBe("Auth service unavailable");
    });
  });
});
