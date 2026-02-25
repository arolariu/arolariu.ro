/**
 * @fileoverview Tests for prepareScanUpload server action.
 * @module lib/actions/scans/prepareScanUpload.test
 */

import {ScanStatus, ScanType} from "@/types/scans";
import {beforeEach, describe, expect, it, vi} from "vitest";

vi.mock("@/instrumentation.server", () => ({
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
  withSpan: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),
}));

const {
  mockFetchBFFUser,
  mockGetContainerClient,
  mockGetBlockBlobClient,
  mockGetUserDelegationKey,
  mockGenerateBlobSas,
  mockParsePermissions,
} = vi.hoisted(() => ({
  mockFetchBFFUser: vi.fn(),
  mockGetContainerClient: vi.fn(),
  mockGetBlockBlobClient: vi.fn(),
  mockGetUserDelegationKey: vi.fn(),
  mockGenerateBlobSas: vi.fn(),
  mockParsePermissions: vi.fn(),
}));

vi.mock("../user/fetchUser", () => ({
  fetchBFFUserFromAuthService: () => mockFetchBFFUser(),
}));

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: class MockDefaultAzureCredential {},
}));

vi.mock("@azure/storage-blob", () => ({
  BlobServiceClient: class MockBlobServiceClient {
    getContainerClient(...args: unknown[]) {
      return mockGetContainerClient(...args);
    }

    getUserDelegationKey(...args: unknown[]) {
      return mockGetUserDelegationKey(...args);
    }
  },
  BlobSASPermissions: {
    parse: (...arguments_: unknown[]) => mockParsePermissions(...arguments_),
  },
  SASProtocol: {
    Https: "https",
  },
  generateBlobSASQueryParameters: (...args: unknown[]) => mockGenerateBlobSas(...args),
}));

import {prepareScanUpload} from "./prepareScanUpload";

describe("prepareScanUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFetchBFFUser.mockResolvedValue({
      userIdentifier: "test-user-guid",
      userJwt: "mock-token",
    });

    mockGetUserDelegationKey.mockResolvedValue({
      signedOid: "oid",
      signedTid: "tid",
      signedStart: new Date().toISOString(),
      signedExpiry: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      signedService: "b",
      signedVersion: "2023-11-03",
      value: "signed-key",
    });

    mockGenerateBlobSas.mockReturnValue({
      toString: () => "sig=test-sas-token",
    });
    mockParsePermissions.mockReturnValue("cw");

    mockGetBlockBlobClient.mockReturnValue({
      url: "https://qtcy47sacc.blob.core.windows.net/invoices/scans/test-user-guid/scan.jpg",
    });

    mockGetContainerClient.mockReturnValue({
      getBlockBlobClient: mockGetBlockBlobClient,
    });
  });

  it("should reject when user is not authenticated", async () => {
    mockFetchBFFUser.mockResolvedValue({
      userIdentifier: null,
      userJwt: "mock-token",
    });

    await expect(
      prepareScanUpload({
        fileName: "receipt.jpg",
        mimeType: "image/jpeg",
        sizeInBytes: 1_024,
      }),
    ).rejects.toThrow("User must be authenticated to prepare scan uploads");
  });

  it("should prepare direct upload URL and scan metadata", async () => {
    const result = await prepareScanUpload({
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1_024,
    });

    expect(result.status).toBe(200);
    expect(result.uploadUrl).toContain("sig=test-sas-token");
    expect(result.scan.userIdentifier).toBe("test-user-guid");
    expect(result.scan.name).toBe("receipt.jpg");
    expect(result.scan.scanType).toBe(ScanType.JPEG);
    expect(result.scan.status).toBe(ScanStatus.READY);
    expect(result.metadata).toEqual(
      expect.objectContaining({
        userIdentifier: "test-user-guid",
        originalFileName: "receipt.jpg",
        status: ScanStatus.READY,
      }),
    );
  });

  it("should create blob path under scans/userIdentifier prefix", async () => {
    await prepareScanUpload({
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1_024,
    });

    expect(mockGetBlockBlobClient).toHaveBeenCalledWith(expect.stringMatching(/^scans\/test-user-guid\//));
  });

  it("should request SAS token with secure protocol and create-write permissions", async () => {
    await prepareScanUpload({
      fileName: "receipt.jpg",
      mimeType: "image/jpeg",
      sizeInBytes: 1024,
    });

    expect(mockGenerateBlobSas).toHaveBeenCalledWith(
      expect.objectContaining({
        containerName: "invoices",
        protocol: "https",
        permissions: "cw",
      }),
      expect.any(Object),
      "qtcy47sacc",
    );
  });

  it("should map PDF uploads to PDF scan type and keep size", async () => {
    const result = await prepareScanUpload({
      fileName: "document.pdf",
      mimeType: "application/pdf",
      sizeInBytes: 4096,
    });

    expect(result.scan.scanType).toBe(ScanType.PDF);
    expect(result.scan.sizeInBytes).toBe(4096);
  });
});

