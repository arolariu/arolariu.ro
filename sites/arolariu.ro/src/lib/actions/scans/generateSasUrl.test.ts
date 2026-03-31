/**
 * @fileoverview Unit tests for SAS URL generation server action.
 * @module lib/actions/scans/generateSasUrl.test
 */

import {describe, expect, it, vi, beforeEach} from "vitest";
import {generateUploadSasUrl} from "./generateSasUrl";
import * as fetchUserModule from "../user/fetchUser";
import * as fetchConfigModule from "../storage/fetchConfig";
import * as storageClientModule from "@/lib/azure/storageClient";

// Mock modules
vi.mock("../user/fetchUser");
vi.mock("../storage/fetchConfig");
vi.mock("@/lib/azure/storageClient");
vi.mock("@azure/storage-blob", () => ({
  BlobSASPermissions: {
    parse: vi.fn(() => ({permissions: "cw"})),
  },
  generateBlobSASQueryParameters: vi.fn(() => ({
    toString: () => "sv=2021-08-06&st=2024-01-01T00:00:00Z&se=2024-01-01T00:30:00Z&sp=cw&sig=mockSasToken",
  })),
}));
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((name, fn) => fn()),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
}));

describe("generateUploadSasUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return error when user is not authenticated", async () => {
    // Arrange
    vi.spyOn(fetchUserModule, "fetchBFFUserFromAuthService").mockResolvedValue({
      userIdentifier: "",
      email: "",
      firstName: "",
      lastName: "",
      avatarUrl: "",
      createdAt: new Date(),
    });

    // Act
    const result = await generateUploadSasUrl({
      fileName: "test.jpg",
      mimeType: "image/jpeg",
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Authentication required");
  });

  it("should generate direct URL for Azurite (dev mode)", async () => {
    // Arrange
    vi.spyOn(fetchUserModule, "fetchBFFUserFromAuthService").mockResolvedValue({
      userIdentifier: "user_123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      avatarUrl: "",
      createdAt: new Date(),
    });

    vi.spyOn(fetchConfigModule, "default").mockResolvedValue("http://localhost:10000/devstoreaccount1");

    const mockBlobClient = {
      url: "http://localhost:10000/devstoreaccount1/invoices/scans/user_123/test_123.jpg",
    };

    const mockContainerClient = {
      getBlockBlobClient: vi.fn(() => mockBlobClient),
    };

    const mockStorageClient = {
      getContainerClient: vi.fn(() => mockContainerClient),
    };

    vi.spyOn(storageClientModule, "createBlobClient").mockResolvedValue(mockStorageClient as never);

    // Act
    const result = await generateUploadSasUrl({
      fileName: "test.jpg",
      mimeType: "image/jpeg",
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.sasUrl).toBe(mockBlobClient.url);
    expect(result.blobName).toContain("scans/user_123/");
    expect(result.scanId).toBeDefined();
  });

  it("should generate SAS URL for Azure (prod mode)", async () => {
    // Arrange
    vi.spyOn(fetchUserModule, "fetchBFFUserFromAuthService").mockResolvedValue({
      userIdentifier: "user_123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      avatarUrl: "",
      createdAt: new Date(),
    });

    vi.spyOn(fetchConfigModule, "default").mockResolvedValue("https://storageaccount.blob.core.windows.net");

    const mockBlobClient = {
      url: "https://storageaccount.blob.core.windows.net/invoices/scans/user_123/test_123.jpg",
    };

    const mockContainerClient = {
      getBlockBlobClient: vi.fn(() => mockBlobClient),
    };

    const mockStorageClient = {
      accountName: "storageaccount",
      getContainerClient: vi.fn(() => mockContainerClient),
      getUserDelegationKey: vi.fn(() =>
        Promise.resolve({
          signedOid: "test-oid",
          signedTid: "test-tid",
          signedStart: new Date(),
          signedExpiry: new Date(),
          signedService: "b",
          signedVersion: "2021-08-06",
          value: "test-key",
        }),
      ),
    };

    vi.spyOn(storageClientModule, "createBlobClient").mockResolvedValue(mockStorageClient as never);

    // Act
    const result = await generateUploadSasUrl({
      fileName: "test.jpg",
      mimeType: "image/jpeg",
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.sasUrl).toContain(mockBlobClient.url);
    expect(result.sasUrl).toContain("?"); // SAS token appended
    expect(result.blobName).toContain("scans/user_123/");
    expect(result.scanId).toBeDefined();
  });

  it("should handle errors gracefully", async () => {
    // Arrange
    vi.spyOn(fetchUserModule, "fetchBFFUserFromAuthService").mockRejectedValue(new Error("Auth service unavailable"));

    // Act
    const result = await generateUploadSasUrl({
      fileName: "test.jpg",
      mimeType: "image/jpeg",
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to prepare upload");
  });

  it("should generate unique scan IDs for concurrent requests", async () => {
    // Arrange
    vi.spyOn(fetchUserModule, "fetchBFFUserFromAuthService").mockResolvedValue({
      userIdentifier: "user_123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      avatarUrl: "",
      createdAt: new Date(),
    });

    vi.spyOn(fetchConfigModule, "default").mockResolvedValue("http://localhost:10000/devstoreaccount1");

    const mockBlobClient = {
      url: "http://localhost:10000/devstoreaccount1/invoices/scans/user_123/test.jpg",
    };

    const mockContainerClient = {
      getBlockBlobClient: vi.fn(() => mockBlobClient),
    };

    const mockStorageClient = {
      getContainerClient: vi.fn(() => mockContainerClient),
    };

    vi.spyOn(storageClientModule, "createBlobClient").mockResolvedValue(mockStorageClient as never);

    // Act
    const results = await Promise.all([
      generateUploadSasUrl({fileName: "test1.jpg", mimeType: "image/jpeg"}),
      generateUploadSasUrl({fileName: "test2.jpg", mimeType: "image/jpeg"}),
      generateUploadSasUrl({fileName: "test3.jpg", mimeType: "image/jpeg"}),
    ]);

    // Assert
    const scanIds = results.map((r) => r.scanId);
    const uniqueScanIds = new Set(scanIds);
    expect(uniqueScanIds.size).toBe(3); // All scan IDs should be unique
  });
});
