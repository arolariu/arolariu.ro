/**
 * @fileoverview Tests for uploadScan server action.
 * @module lib/actions/scans/uploadScan.test
 */

import {ScanStatus, ScanType} from "@/types/scans";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

// Mock instrumentation
vi.mock("@/instrumentation.server", () => ({
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
  withSpan: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),
}));

// Hoist all mock functions
const {mockFetchBFFUser, mockConvertBase64ToBlob} = vi.hoisted(() => ({
  mockFetchBFFUser: vi.fn(),
  mockConvertBase64ToBlob: vi.fn(),
}));

// Mock fetchUser
vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: () => mockFetchBFFUser(),
}));

// Mock utils.server
vi.mock("@/lib/utils.server", () => ({
  convertBase64ToBlob: mockConvertBase64ToBlob,
}));

// Mock Azure Identity
vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: class MockDefaultAzureCredential {},
}));

// Mock Azure Blob Storage - use vi.hoisted to make mocks available during module load
const {mockUploadData, mockGetBlockBlobClient, mockGetContainerClient} = vi.hoisted(() => ({
  mockUploadData: vi.fn(),
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
import {uploadScan} from "./uploadScan";

describe("uploadScan", () => {
  const validInput = {
    base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
    fileName: "receipt.jpg",
    mimeType: "image/jpeg",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchBFFUser.mockResolvedValue({
      userIdentifier: "test-user-guid",
      userJwt: "mock-jwt-token",
    });

    // Mock blob with arrayBuffer method (jsdom doesn't fully support Blob)
    const mockArrayBuffer = new ArrayBuffer(12);
    const mockBlob = {
      arrayBuffer: vi.fn().mockResolvedValue(mockArrayBuffer),
      size: 12,
      type: "image/jpeg",
    };
    mockConvertBase64ToBlob.mockResolvedValue(mockBlob);

    mockUploadData.mockResolvedValue({
      _response: {
        status: 201,
      },
    });

    mockGetBlockBlobClient.mockReturnValue({
      uploadData: mockUploadData,
      url: "https://qtcy47sacc.blob.core.windows.net/invoices/scans/test-user-guid/scan-001.jpg",
    });

    mockGetContainerClient.mockReturnValue({
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

      await expect(uploadScan(validInput)).rejects.toThrow("User must be authenticated to upload scans");
    });

    it("should throw error when userIdentifier is empty", async () => {
      mockFetchBFFUser.mockResolvedValue({
        userIdentifier: "",
        userJwt: "token",
      });

      await expect(uploadScan(validInput)).rejects.toThrow("User must be authenticated to upload scans");
    });
  });

  describe("successful upload", () => {
    it("should upload scan successfully", async () => {
      const result = await uploadScan(validInput);

      expect(result.status).toBe(201);
      expect(result.scan).toBeDefined();
      expect(result.scan.id).toBeDefined();
      expect(result.scan.userIdentifier).toBe("test-user-guid");
      expect(result.scan.name).toBe("receipt.jpg");
      expect(result.scan.mimeType).toBe("image/jpeg");
      expect(result.scan.status).toBe(ScanStatus.READY);
    });

    it("should include metadata in upload request", async () => {
      await uploadScan(validInput);

      expect(mockUploadData).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        expect.objectContaining({
          blobHTTPHeaders: {
            blobContentType: "image/jpeg",
          },
          metadata: expect.objectContaining({
            userIdentifier: "test-user-guid",
            scanId: expect.any(String),
            uploadedAt: expect.any(String),
            originalFileName: "receipt.jpg",
            status: ScanStatus.READY,
          }),
        }),
      );
    });

    it("should generate unique scan ID", async () => {
      const result1 = await uploadScan(validInput);
      const result2 = await uploadScan(validInput);

      expect(result1.scan.id).not.toBe(result2.scan.id);
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
        const result = await uploadScan({
          ...validInput,
          mimeType,
          fileName: "test.file",
        });

        expect(result.scan.scanType).toBe(expectedType);
      });
    }
  });

  describe("file extension handling", () => {
    it("should extract extension from filename", async () => {
      await uploadScan({
        ...validInput,
        fileName: "receipt.jpg",
      });

      expect(mockGetBlockBlobClient).toHaveBeenCalledWith(expect.stringMatching(/\.jpg$/));
    });

    it("should use filename as extension when no dot in filename", async () => {
      // When fileName has no dot, split(".").pop() returns the whole filename
      // so the extension becomes the filename itself
      await uploadScan({
        ...validInput,
        fileName: "receipt",
      });

      expect(mockGetBlockBlobClient).toHaveBeenCalledWith(expect.stringMatching(/\.receipt$/));
    });

    it("should handle multi-dot filenames", async () => {
      await uploadScan({
        ...validInput,
        fileName: "receipt.2024.01.01.jpg",
      });

      expect(mockGetBlockBlobClient).toHaveBeenCalledWith(expect.stringMatching(/\.jpg$/));
    });
  });

  describe("error handling", () => {
    it("should throw error when Azure upload fails", async () => {
      mockUploadData.mockRejectedValue(new Error("Azure Storage error"));

      await expect(uploadScan(validInput)).rejects.toThrow("Azure Storage error");
    });

    it("should throw error when auth service fails", async () => {
      mockFetchBFFUser.mockRejectedValue(new Error("Auth service unavailable"));

      await expect(uploadScan(validInput)).rejects.toThrow("Auth service unavailable");
    });
  });

  describe("upload status handling", () => {
    it("should return non-201 status when upload partially fails", async () => {
      mockUploadData.mockResolvedValue({
        _response: {
          status: 500,
        },
      });

      const result = await uploadScan(validInput);

      expect(result.status).toBe(500);
    });
  });

  describe("blob naming", () => {
    it("should include user identifier in blob path", async () => {
      await uploadScan(validInput);

      expect(mockGetBlockBlobClient).toHaveBeenCalledWith(expect.stringMatching(/^scans\/test-user-guid\//));
    });

    it("should include scan ID in blob name", async () => {
      const result = await uploadScan(validInput);

      expect(mockGetBlockBlobClient).toHaveBeenCalledWith(expect.stringContaining(result.scan.id.slice(0, 8)));
    });
  });
});
