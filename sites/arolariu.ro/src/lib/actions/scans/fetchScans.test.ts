/**
 * @fileoverview Tests for fetchScans server action.
 * @module lib/actions/scans/fetchScans.test
 */

import {ScanStatus, ScanType} from "@/types/scans";
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
const {mockListBlobsFlat, mockGetBlockBlobClient, mockGetContainerClient} = vi.hoisted(() => ({
  mockListBlobsFlat: vi.fn(),
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
import {fetchScans} from "./fetchScans";

describe("fetchScans", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchBFFUser.mockResolvedValue({
      userIdentifier: "test-user-guid",
      userJwt: "mock-jwt-token",
    });

    mockGetBlockBlobClient.mockReturnValue({
      url: "https://storage.blob.core.windows.net/invoices/scans/test-user-guid/scan-001.jpg",
    });

    mockGetContainerClient.mockReturnValue({
      listBlobsFlat: mockListBlobsFlat,
      getBlockBlobClient: mockGetBlockBlobClient,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("authentication", () => {
    it("should throw error when user is not authenticated", async () => {
      mockFetchBFFUser.mockResolvedValue({
        userIdentifier: null,
        userJwt: "token",
      });

      await expect(fetchScans()).rejects.toThrow("User must be authenticated to fetch scans");
    });

    it("should throw error when userIdentifier is empty", async () => {
      mockFetchBFFUser.mockResolvedValue({
        userIdentifier: "",
        userJwt: "token",
      });

      await expect(fetchScans()).rejects.toThrow("User must be authenticated to fetch scans");
    });
  });

  describe("successful fetch", () => {
    it("should return empty array when no scans exist", async () => {
      mockListBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          // No blobs
        },
      });

      const result = await fetchScans();

      expect(result).toEqual([]);
    });

    it("should return scans from blob storage", async () => {
      const mockBlobs = [
        {
          name: "scans/test-user-guid/scan-001.jpg",
          metadata: {
            scanId: "scan-001",
            userIdentifier: "test-user-guid",
            originalFileName: "receipt.jpg",
            status: ScanStatus.READY,
            uploadedAt: "2024-01-01T00:00:00.000Z",
          },
          properties: {
            contentType: "image/jpeg",
            contentLength: 1024,
            createdOn: new Date("2024-01-01"),
          },
        },
      ];

      mockListBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const blob of mockBlobs) {
            yield blob;
          }
        },
      });

      const result = await fetchScans();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "scan-001",
        userIdentifier: "test-user-guid",
        name: "receipt.jpg",
        mimeType: "image/jpeg",
        scanType: ScanType.JPEG,
        status: ScanStatus.READY,
      });
    });

    it("should skip blobs without scanId in metadata", async () => {
      const mockBlobs = [
        {
          name: "scans/test-user-guid/invalid.jpg",
          metadata: {
            // No scanId
          },
          properties: {
            contentType: "image/jpeg",
            contentLength: 1024,
          },
        },
      ];

      mockListBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const blob of mockBlobs) {
            yield blob;
          }
        },
      });

      const result = await fetchScans();

      expect(result).toHaveLength(0);
    });

    it("should exclude archived scans by default", async () => {
      const mockBlobs = [
        {
          name: "scans/test-user-guid/scan-001.jpg",
          metadata: {
            scanId: "scan-001",
            status: ScanStatus.ARCHIVED,
          },
          properties: {
            contentType: "image/jpeg",
            contentLength: 1024,
          },
        },
        {
          name: "scans/test-user-guid/scan-002.jpg",
          metadata: {
            scanId: "scan-002",
            status: ScanStatus.READY,
          },
          properties: {
            contentType: "image/jpeg",
            contentLength: 1024,
          },
        },
      ];

      mockListBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const blob of mockBlobs) {
            yield blob;
          }
        },
      });

      const result = await fetchScans();

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("scan-002");
    });

    it("should include archived scans when includeArchived is true", async () => {
      const mockBlobs = [
        {
          name: "scans/test-user-guid/scan-001.jpg",
          metadata: {
            scanId: "scan-001",
            status: ScanStatus.ARCHIVED,
          },
          properties: {
            contentType: "image/jpeg",
            contentLength: 1024,
          },
        },
        {
          name: "scans/test-user-guid/scan-002.jpg",
          metadata: {
            scanId: "scan-002",
            status: ScanStatus.READY,
          },
          properties: {
            contentType: "image/jpeg",
            contentLength: 1024,
          },
        },
      ];

      mockListBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const blob of mockBlobs) {
            yield blob;
          }
        },
      });

      const result = await fetchScans({includeArchived: true});

      expect(result).toHaveLength(2);
    });

    it("should sort scans by upload date descending", async () => {
      const mockBlobs = [
        {
          name: "scans/test-user-guid/scan-001.jpg",
          metadata: {
            scanId: "scan-001",
            uploadedAt: "2024-01-01T00:00:00.000Z",
          },
          properties: {
            contentType: "image/jpeg",
            contentLength: 1024,
          },
        },
        {
          name: "scans/test-user-guid/scan-002.jpg",
          metadata: {
            scanId: "scan-002",
            uploadedAt: "2024-01-15T00:00:00.000Z",
          },
          properties: {
            contentType: "image/jpeg",
            contentLength: 1024,
          },
        },
      ];

      mockListBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const blob of mockBlobs) {
            yield blob;
          }
        },
      });

      const result = await fetchScans();

      expect(result[0]?.id).toBe("scan-002"); // Newer first
      expect(result[1]?.id).toBe("scan-001");
    });
  });

  describe("MIME type mapping", () => {
    const testCases = [
      {mimeType: "image/jpeg", expectedType: ScanType.JPEG},
      {mimeType: "image/jpg", expectedType: ScanType.JPEG},
      {mimeType: "image/png", expectedType: ScanType.PNG},
      {mimeType: "application/pdf", expectedType: ScanType.PDF},
      {mimeType: "application/octet-stream", expectedType: ScanType.OTHER},
    ];

    for (const {mimeType, expectedType} of testCases) {
      it(`should map ${mimeType} to ${expectedType}`, async () => {
        const mockBlobs = [
          {
            name: "scans/test-user-guid/scan-001.file",
            metadata: {
              scanId: "scan-001",
            },
            properties: {
              contentType: mimeType,
              contentLength: 1024,
            },
          },
        ];

        mockListBlobsFlat.mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            for (const blob of mockBlobs) {
              yield blob;
            }
          },
        });

        const result = await fetchScans();

        expect(result[0]?.scanType).toBe(expectedType);
      });
    }
  });

  describe("error handling", () => {
    it("should throw error when blob storage fails", async () => {
      mockListBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          throw new Error("Azure Storage error");
        },
      });

      await expect(fetchScans()).rejects.toThrow("Azure Storage error");
    });

    it("should throw error when auth service fails", async () => {
      mockFetchBFFUser.mockRejectedValue(new Error("Auth service unavailable"));

      await expect(fetchScans()).rejects.toThrow("Auth service unavailable");
    });
  });

  describe("metadata handling", () => {
    it("should use blob createdOn when uploadedAt metadata is missing", async () => {
      const createdDate = new Date("2024-02-15");
      const mockBlobs = [
        {
          name: "scans/test-user-guid/scan-001.jpg",
          metadata: {
            scanId: "scan-001",
            // No uploadedAt
          },
          properties: {
            contentType: "image/jpeg",
            contentLength: 1024,
            createdOn: createdDate,
          },
        },
      ];

      mockListBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const blob of mockBlobs) {
            yield blob;
          }
        },
      });

      const result = await fetchScans();

      expect(result[0]?.uploadedAt).toEqual(createdDate);
    });

    it("should use filename from path when originalFileName metadata is missing", async () => {
      const mockBlobs = [
        {
          name: "scans/test-user-guid/some-file.jpg",
          metadata: {
            scanId: "scan-001",
            // No originalFileName
          },
          properties: {
            contentType: "image/jpeg",
            contentLength: 1024,
          },
        },
      ];

      mockListBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const blob of mockBlobs) {
            yield blob;
          }
        },
      });

      const result = await fetchScans();

      expect(result[0]?.name).toBe("some-file.jpg");
    });

    it("should handle missing metadata gracefully", async () => {
      const mockBlobs = [
        {
          name: "scans/test-user-guid/scan-001.jpg",
          metadata: {
            scanId: "scan-001",
          },
          // No metadata for other fields
          properties: {
            contentType: "image/jpeg",
            contentLength: 1024,
          },
        },
      ];

      mockListBlobsFlat.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const blob of mockBlobs) {
            yield blob;
          }
        },
      });

      const result = await fetchScans();

      expect(result).toHaveLength(1);
      expect(result[0]?.userIdentifier).toBe("test-user-guid");
    });
  });
});
