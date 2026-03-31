/**
 * @fileoverview Unit tests for scan registration server action.
 * @module lib/actions/scans/registerScan.test
 */

import {describe, expect, it, vi, beforeEach} from "vitest";
import {registerScan} from "./registerScan";
import {ScanStatus, ScanType} from "@/types/scans";
import * as fetchUserModule from "../user/fetchUser";

// Mock modules
vi.mock("../user/fetchUser");
vi.mock("@/lib/azure/storageClient", () => ({
  rewriteAzuriteUrl: vi.fn((url: string) => url),
}));
vi.mock("@/instrumentation.server", () => ({
  withSpan: vi.fn((name, fn) => fn()),
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
}));

describe("registerScan", () => {
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
    const result = await registerScan({
      scanId: "test-scan-id",
      blobUrl: "https://storage.blob.core.windows.net/invoices/scans/user_123/test.jpg",
      fileName: "test.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1024,
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Authentication required");
  });

  it("should return error when blob URL does not belong to user", async () => {
    // Arrange
    vi.spyOn(fetchUserModule, "fetchBFFUserFromAuthService").mockResolvedValue({
      userIdentifier: "user_123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      avatarUrl: "",
      createdAt: new Date(),
    });

    // Act - blob URL belongs to different user
    const result = await registerScan({
      scanId: "test-scan-id",
      blobUrl: "https://storage.blob.core.windows.net/invoices/scans/user_456/test.jpg",
      fileName: "test.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1024,
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid blob URL");
  });

  it("should successfully register JPEG scan", async () => {
    // Arrange
    vi.spyOn(fetchUserModule, "fetchBFFUserFromAuthService").mockResolvedValue({
      userIdentifier: "user_123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      avatarUrl: "",
      createdAt: new Date(),
    });

    // Act
    const result = await registerScan({
      scanId: "test-scan-id",
      blobUrl: "https://storage.blob.core.windows.net/invoices/scans/user_123/test.jpg",
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 2048576,
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.scan).toBeDefined();
    expect(result.scan?.id).toBe("test-scan-id");
    expect(result.scan?.userIdentifier).toBe("user_123");
    expect(result.scan?.name).toBe("receipt.jpg");
    expect(result.scan?.mimeType).toBe("image/jpeg");
    expect(result.scan?.sizeInBytes).toBe(2048576);
    expect(result.scan?.scanType).toBe(ScanType.JPEG);
    expect(result.scan?.status).toBe(ScanStatus.READY);
  });

  it("should successfully register PNG scan", async () => {
    // Arrange
    vi.spyOn(fetchUserModule, "fetchBFFUserFromAuthService").mockResolvedValue({
      userIdentifier: "user_123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      avatarUrl: "",
      createdAt: new Date(),
    });

    // Act
    const result = await registerScan({
      scanId: "test-scan-id",
      blobUrl: "https://storage.blob.core.windows.net/invoices/scans/user_123/test.png",
      fileName: "receipt.png",
      mimeType: "image/png",
      sizeInBytes: 1024000,
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.scan?.scanType).toBe(ScanType.PNG);
  });

  it("should successfully register PDF scan", async () => {
    // Arrange
    vi.spyOn(fetchUserModule, "fetchBFFUserFromAuthService").mockResolvedValue({
      userIdentifier: "user_123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      avatarUrl: "",
      createdAt: new Date(),
    });

    // Act
    const result = await registerScan({
      scanId: "test-scan-id",
      blobUrl: "https://storage.blob.core.windows.net/invoices/scans/user_123/test.pdf",
      fileName: "document.pdf",
      mimeType: "application/pdf",
      sizeInBytes: 5048576,
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.scan?.scanType).toBe(ScanType.PDF);
  });

  it("should include metadata in registered scan", async () => {
    // Arrange
    vi.spyOn(fetchUserModule, "fetchBFFUserFromAuthService").mockResolvedValue({
      userIdentifier: "user_123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
      avatarUrl: "",
      createdAt: new Date(),
    });

    // Act
    const result = await registerScan({
      scanId: "test-scan-id",
      blobUrl: "https://storage.blob.core.windows.net/invoices/scans/user_123/test.jpg",
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1024,
    });

    // Assert
    expect(result.scan?.metadata).toBeDefined();
    expect(result.scan?.metadata.originalFileName).toBe("receipt.jpg");
    expect(result.scan?.metadata.registeredAt).toBeDefined();
  });

  it("should handle errors gracefully", async () => {
    // Arrange
    vi.spyOn(fetchUserModule, "fetchBFFUserFromAuthService").mockRejectedValue(new Error("Auth service unavailable"));

    // Act
    const result = await registerScan({
      scanId: "test-scan-id",
      blobUrl: "https://storage.blob.core.windows.net/invoices/scans/user_123/test.jpg",
      fileName: "test.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1024,
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to register scan");
  });
});
