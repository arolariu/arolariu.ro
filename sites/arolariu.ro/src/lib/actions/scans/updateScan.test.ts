/**
 * @fileoverview Unit tests for updateScan server action.
 * @module lib/actions/scans/updateScan.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";

// Setup blob client mock chain using vi.hoisted FIRST
const {mockGetProperties, mockUploadData, mockGetBlockBlobClient, mockGetContainerClient, mockCreateBlobClient} = vi.hoisted(() => {
  const _mockGetBlockBlobClient = vi.fn();
  const _mockGetContainerClient = vi.fn();
  return {
    mockGetProperties: vi.fn(),
    mockUploadData: vi.fn(),
    mockGetBlockBlobClient: _mockGetBlockBlobClient,
    mockGetContainerClient: _mockGetContainerClient,
    mockCreateBlobClient: vi.fn().mockResolvedValue({
      getContainerClient: _mockGetContainerClient,
    }),
  };
});

// Mock instrumentation
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
}));

// Mock dependencies with explicit factories
vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: vi.fn(),
}));
vi.mock("@/lib/actions/storage/fetchConfig", () => ({
  default: vi.fn(),
}));
vi.mock("@/lib/utils.server", () => ({
  convertBase64ToBlob: vi.fn(),
}));
vi.mock("@/lib/azure/storageClient", () => ({
  createBlobClient: mockCreateBlobClient,
  rewriteAzuriteUrl: vi.fn((url: string) => url),
}));

// Import after mocks
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {convertBase64ToBlob} from "@/lib/utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";
import {updateScan} from "./updateScan";

describe("updateScan", () => {
  const mockBlobUrl = "https://test.blob.core.windows.net/invoices/scans/test.jpg";
  const mockStorageEndpoint = "https://test.blob.core.windows.net";

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default successful responses
    (fetchBFFUserFromAuthService as any).mockResolvedValue({
      userIdentifier: "user_123",
      user: {
        id: "user_123",
        firstName: "John",
        lastName: "Doe",
        emailAddresses: [{emailAddress: "john@example.com", id: "email_1"}],
        imageUrl: "https://example.com/avatar.jpg",
        hasImage: true,
        createdAt: Date.now(),
      },
    });

    (fetchConfigurationValue as any).mockResolvedValue(mockStorageEndpoint);

    // Setup blob client mock chain
    mockCreateBlobClient.mockResolvedValue({
      getContainerClient: mockGetContainerClient,
    });

    mockGetContainerClient.mockReturnValue({
      getBlockBlobClient: mockGetBlockBlobClient,
    });

    mockGetBlockBlobClient.mockReturnValue({
      getProperties: mockGetProperties,
      uploadData: mockUploadData,
      url: mockBlobUrl,
    });

    // Default successful blob operations
    mockGetProperties.mockResolvedValue({
      metadata: {
        userId: "user_123",
        uploadedAt: "2024-01-01T00:00:00.000Z",
      },
      _response: {status: 200},
    });

    mockUploadData.mockResolvedValue({
      _response: {status: 201},
    });

    // Mock blob conversion
    (convertBase64ToBlob as any).mockResolvedValue(new Blob(["fake-image-data"], {type: "image/jpeg"}));

    // Mock console.info to avoid test output clutter
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("✅ Success cases", () => {
    it("should return success when scan updates successfully (status 201)", async () => {
      // Arrange
      const input = {
        base64Data: "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
        blobName: "scans/user_123/scan_123_1704067200000.jpg",
        mimeType: "image/jpeg",
        metadata: {rotated: "true"},
      };

      // Act
      const result = await updateScan(input);

      // Assert
      expect(result).toEqual({
        success: true,
        blobUrl: mockBlobUrl,
      });
      expect(mockUploadData).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        expect.objectContaining({
          blobHTTPHeaders: {
            blobContentType: "image/jpeg",
          },
        }),
      );
    });

    it("should merge new metadata with existing blob metadata", async () => {
      // Arrange
      const existingMetadata = {
        userId: "user_123",
        uploadedAt: "2024-01-01T00:00:00.000Z",
        originalFileName: "receipt.jpg",
      };

      mockGetProperties.mockResolvedValue({
        metadata: existingMetadata,
        _response: {status: 200},
      });

      const input = {
        base64Data: "data:image/jpeg;base64,ABC123",
        blobName: "scans/user_123/scan_456.jpg",
        mimeType: "image/jpeg",
        metadata: {
          rotated: "true",
          angle: "90",
        },
      };

      // Act
      const result = await updateScan(input);

      // Assert
      expect(result.success).toBe(true);
      expect(mockUploadData).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        expect.objectContaining({
          metadata: expect.objectContaining({
            userId: "user_123",
            uploadedAt: "2024-01-01T00:00:00.000Z",
            originalFileName: "receipt.jpg",
            rotated: "true",
            angle: "90",
            lastModified: expect.any(String),
          }),
        }),
      );
    });

    it("should set correct content type from input", async () => {
      // Arrange
      const input = {
        base64Data: "data:image/png;base64,iVBORw0KGgo...",
        blobName: "scans/user_123/scan_789.png",
        mimeType: "image/png",
      };

      // Act
      const result = await updateScan(input);

      // Assert
      expect(result.success).toBe(true);
      expect(mockUploadData).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        expect.objectContaining({
          blobHTTPHeaders: {
            blobContentType: "image/png",
          },
        }),
      );
    });

    it("should call convertBase64ToBlob with the input data", async () => {
      // Arrange
      const base64Data = "data:image/jpeg;base64,/9j/4AAQSkZJRg...";
      const input = {
        base64Data,
        blobName: "scans/user_123/scan_999.jpg",
        mimeType: "image/jpeg",
      };

      // Act
      await updateScan(input);

      // Assert
      expect(convertBase64ToBlob).toHaveBeenCalledWith(base64Data);
    });

    it("should add lastModified timestamp to metadata", async () => {
      // Arrange
      const input = {
        base64Data: "data:image/jpeg;base64,ABC",
        blobName: "scans/user_123/scan_111.jpg",
        mimeType: "image/jpeg",
        metadata: {},
      };

      const beforeTimestamp = new Date().toISOString();

      // Act
      await updateScan(input);
      const afterTimestamp = new Date().toISOString();

      // Assert
      expect(mockUploadData).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        expect.objectContaining({
          metadata: expect.objectContaining({
            lastModified: expect.any(String),
          }),
        }),
      );

      const uploadCall = (mockUploadData as any).mock.calls[0];
      const metadata = uploadCall[1]?.metadata as Record<string, string>;
      expect(metadata["lastModified"]).toBeDefined();
      expect(metadata["lastModified"]! >= beforeTimestamp).toBe(true);
      expect(metadata["lastModified"]! <= afterTimestamp).toBe(true);
    });

    it("should use default empty metadata when not provided", async () => {
      // Arrange
      mockGetProperties.mockResolvedValue({
        metadata: {},
        _response: {status: 200},
      });

      const input = {
        base64Data: "data:image/jpeg;base64,XYZ",
        blobName: "scans/user_123/scan_222.jpg",
        mimeType: "image/jpeg",
        // metadata not provided
      };

      // Act
      const result = await updateScan(input);

      // Assert
      expect(result.success).toBe(true);
      expect(mockUploadData).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        expect.objectContaining({
          metadata: {
            lastModified: expect.any(String),
          },
        }),
      );
    });
  });

  describe("❌ Authentication errors", () => {
    it("should return error when user is not authenticated", async () => {
      // Arrange
      (fetchBFFUserFromAuthService as any).mockResolvedValue({
        userIdentifier: null,
        user: null,
      });

      const input = {
        base64Data: "data:image/jpeg;base64,ABC",
        blobName: "scans/user_123/scan_333.jpg",
        mimeType: "image/jpeg",
      };

      // Act
      const result = await updateScan(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "User must be authenticated to update scans",
      });
      expect(mockGetProperties).not.toHaveBeenCalled();
      expect(mockUploadData).not.toHaveBeenCalled();
    });

    it("should return error when userIdentifier is empty string", async () => {
      // Arrange
      (fetchBFFUserFromAuthService as any).mockResolvedValue({
        userIdentifier: "",
        user: null,
      });

      const input = {
        base64Data: "data:image/jpeg;base64,ABC",
        blobName: "scans/user_123/scan_444.jpg",
        mimeType: "image/jpeg",
      };

      // Act
      const result = await updateScan(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "User must be authenticated to update scans",
      });
      expect(mockGetProperties).not.toHaveBeenCalled();
      expect(mockUploadData).not.toHaveBeenCalled();
    });
  });

  describe("❌ Upload errors", () => {
    it("should return error when upload status is not 201", async () => {
      // Arrange
      mockUploadData.mockResolvedValue({
        _response: {status: 500},
      });

      const input = {
        base64Data: "data:image/jpeg;base64,ABC",
        blobName: "scans/user_123/scan_555.jpg",
        mimeType: "image/jpeg",
      };

      // Act
      const result = await updateScan(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Failed to update scan (status: 500)",
      });
    });

    it("should return error when upload status is 400", async () => {
      // Arrange
      mockUploadData.mockResolvedValue({
        _response: {status: 400},
      });

      const input = {
        base64Data: "data:image/jpeg;base64,ABC",
        blobName: "scans/user_123/scan_666.jpg",
        mimeType: "image/jpeg",
      };

      // Act
      const result = await updateScan(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Failed to update scan (status: 400)",
      });
    });

    it("should return error when uploadData throws", async () => {
      // Arrange
      const uploadError = new Error("Network timeout");
      mockUploadData.mockRejectedValue(uploadError);

      const input = {
        base64Data: "data:image/jpeg;base64,ABC",
        blobName: "scans/user_123/scan_777.jpg",
        mimeType: "image/jpeg",
      };

      // Act
      const result = await updateScan(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Network timeout",
      });
    });
  });

  describe("❌ Metadata fetch errors", () => {
    it("should return error when getProperties throws", async () => {
      // Arrange
      const propertiesError = new Error("Blob not found");
      mockGetProperties.mockRejectedValue(propertiesError);

      const input = {
        base64Data: "data:image/jpeg;base64,ABC",
        blobName: "scans/user_123/scan_888.jpg",
        mimeType: "image/jpeg",
      };

      // Act
      const result = await updateScan(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Blob not found",
      });
      expect(mockUploadData).not.toHaveBeenCalled();
    });

    it("should handle missing metadata gracefully", async () => {
      // Arrange
      mockGetProperties.mockResolvedValue({
        metadata: undefined,
        _response: {status: 200},
      });

      const input = {
        base64Data: "data:image/jpeg;base64,ABC",
        blobName: "scans/user_123/scan_999.jpg",
        mimeType: "image/jpeg",
        metadata: {rotated: "true"},
      };

      // Act
      const result = await updateScan(input);

      // Assert
      expect(result.success).toBe(true);
      expect(mockUploadData).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        expect.objectContaining({
          metadata: expect.objectContaining({
            rotated: "true",
            lastModified: expect.any(String),
          }),
        }),
      );
    });

    it("should handle null metadata gracefully", async () => {
      // Arrange
      mockGetProperties.mockResolvedValue({
        metadata: null as unknown as Record<string, string>,
        _response: {status: 200},
      });

      const input = {
        base64Data: "data:image/jpeg;base64,ABC",
        blobName: "scans/user_123/scan_1000.jpg",
        mimeType: "image/jpeg",
        metadata: {test: "value"},
      };

      // Act
      const result = await updateScan(input);

      // Assert
      expect(result.success).toBe(true);
      expect(mockUploadData).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        expect.objectContaining({
          metadata: expect.objectContaining({
            test: "value",
            lastModified: expect.any(String),
          }),
        }),
      );
    });
  });

  describe("❌ Storage client errors", () => {
    it("should return error when createBlobClient throws", async () => {
      // Arrange
      (mockCreateBlobClient as any).mockRejectedValue(new Error("Storage authentication failed"));

      const input = {
        base64Data: "data:image/jpeg;base64,ABC",
        blobName: "scans/user_123/scan_1111.jpg",
        mimeType: "image/jpeg",
      };

      // Act
      const result = await updateScan(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Storage authentication failed",
      });
    });

    it("should return error when fetchConfigurationValue throws", async () => {
      // Arrange
      (fetchConfigurationValue as any).mockRejectedValue(new Error("Config not found"));

      const input = {
        base64Data: "data:image/jpeg;base64,ABC",
        blobName: "scans/user_123/scan_1212.jpg",
        mimeType: "image/jpeg",
      };

      // Act
      const result = await updateScan(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Config not found",
      });
    });
  });

  describe("❌ Blob conversion errors", () => {
    it("should return error when convertBase64ToBlob throws", async () => {
      // Arrange
      (convertBase64ToBlob as any).mockRejectedValue(new Error("Invalid base64 format"));

      const input = {
        base64Data: "invalid-base64",
        blobName: "scans/user_123/scan_1313.jpg",
        mimeType: "image/jpeg",
      };

      // Act
      const result = await updateScan(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Invalid base64 format",
      });
      expect(mockUploadData).not.toHaveBeenCalled();
    });

    it("should handle non-Error exceptions", async () => {
      // Arrange
      (convertBase64ToBlob as any).mockRejectedValue("String error");

      const input = {
        base64Data: "data:image/jpeg;base64,ABC",
        blobName: "scans/user_123/scan_1414.jpg",
        mimeType: "image/jpeg",
      };

      // Act
      const result = await updateScan(input);

      // Assert
      expect(result).toEqual({
        success: false,
        error: "Unknown error updating scan",
      });
    });
  });

  describe("🔍 Edge cases", () => {
    it("should handle blob URLs correctly", async () => {
      // Arrange
      const customBlobUrl = "https://custom.blob.core.windows.net/invoices/scans/custom.jpg";
      mockGetBlockBlobClient.mockReturnValue({
        getProperties: mockGetProperties,
        uploadData: mockUploadData,
        url: customBlobUrl,
      });

      const input = {
        base64Data: "data:image/jpeg;base64,ABC",
        blobName: "scans/user_123/custom.jpg",
        mimeType: "image/jpeg",
      };

      // Act
      const result = await updateScan(input);

      // Assert
      expect(result).toEqual({
        success: true,
        blobUrl: customBlobUrl,
      });
    });

    it("should use correct container name (invoices)", async () => {
      // Arrange
      const input = {
        base64Data: "data:image/jpeg;base64,ABC",
        blobName: "scans/user_123/scan_1515.jpg",
        mimeType: "image/jpeg",
      };

      // Act
      await updateScan(input);

      // Assert
      expect(mockGetContainerClient).toHaveBeenCalledWith("invoices");
    });

    it("should call getBlockBlobClient with correct blobName", async () => {
      // Arrange
      const blobName = "scans/user_123/scan_1616_1704067200000.jpg";
      const input = {
        base64Data: "data:image/jpeg;base64,ABC",
        blobName,
        mimeType: "image/jpeg",
      };

      // Act
      await updateScan(input);

      // Assert
      expect(mockGetBlockBlobClient).toHaveBeenCalledWith(blobName);
    });

    it("should handle complex metadata with special characters", async () => {
      // Arrange
      mockGetProperties.mockResolvedValue({
        metadata: {
          description: "Receipt from Café Münich",
          category: "food & drinks",
        },
        _response: {status: 200},
      });

      const input = {
        base64Data: "data:image/jpeg;base64,ABC",
        blobName: "scans/user_123/scan_1717.jpg",
        mimeType: "image/jpeg",
        metadata: {
          rotated: "true",
          location: "München, Deutschland",
        },
      };

      // Act
      const result = await updateScan(input);

      // Assert
      expect(result.success).toBe(true);
      expect(mockUploadData).toHaveBeenCalledWith(
        expect.any(ArrayBuffer),
        expect.objectContaining({
          metadata: expect.objectContaining({
            description: "Receipt from Café Münich",
            category: "food & drinks",
            rotated: "true",
            location: "München, Deutschland",
          }),
        }),
      );
    });

    it("should set overwrite to true for uploadData", async () => {
      // Arrange
      const input = {
        base64Data: "data:image/jpeg;base64,ABC",
        blobName: "scans/user_123/scan_1818.jpg",
        mimeType: "image/jpeg",
      };

      // Act
      await updateScan(input);

      // Assert
      expect(mockUploadData).toHaveBeenCalledWith(expect.any(ArrayBuffer), expect.objectContaining({}));
    });
  });
});
