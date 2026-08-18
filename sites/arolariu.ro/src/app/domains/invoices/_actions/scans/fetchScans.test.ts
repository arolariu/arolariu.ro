/**
 * @fileoverview Unit tests for fetchScans server action.
 * @module app/domains/invoices/_actions/scans/fetchScans.test
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {listBlobObjects} from "@/lib/azure/storageClient";
import {ScanStatus} from "@/types/scans";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";
import {fetchScans} from "./fetchScans";

vi.mock("@/instrumentation.server");
vi.mock("@/lib/actions/storage/fetchConfig");
vi.mock("@/lib/actions/user/fetchUser");
vi.mock("@/lib/azure/storageClient");

const mockFetchBFFUserFromAuthService = vi.mocked(fetchBFFUserFromAuthService);
const mockFetchConfigurationValue = vi.mocked(fetchConfigurationValue);
const mockListBlobObjects = vi.mocked(listBlobObjects);
const mockWithSpan = vi.mocked(withSpan);
const mockAddSpanEvent = vi.mocked(addSpanEvent);
const mockLogWithTrace = vi.mocked(logWithTrace);

describe("fetchScans", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockWithSpan.mockImplementation((_name, fn) => (fn as () => Promise<unknown>)());
    mockAddSpanEvent.mockImplementation(() => undefined);
    mockLogWithTrace.mockImplementation(() => undefined);
    mockFetchBFFUserFromAuthService.mockResolvedValue(TestDataBuilder.build("userInformation", {userIdentifier: "user-123"}));
    mockFetchConfigurationValue.mockResolvedValue("https://storage.test");
  });

  it("should successfully fetch scans for authenticated user", async () => {
    const mockBlobs = [
      {
        name: "scans/user-123/scan1_1609459200000.jpg",
        url: "https://storage.test/invoices/scans/user-123/scan1_1609459200000.jpg",
        metadata: {
          scanId: "scan1",
          ownerId: "user-123",
          displayName: "receipt1.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready",
          uploadedAt: "2024-01-01T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        contentType: "image/jpeg",
        contentLength: 1024,
        createdOn: new Date("2024-01-01T00:00:00.000Z"),
        etag: "etag1",
      },
      {
        name: "scans/user-123/scan2_1609545600000.jpg",
        url: "https://storage.test/invoices/scans/user-123/scan2_1609545600000.jpg",
        metadata: {
          scanId: "scan2",
          ownerId: "user-123",
          displayName: "receipt2.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready",
          uploadedAt: "2024-01-02T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        contentType: "image/jpeg",
        contentLength: 2048,
        createdOn: new Date("2024-01-02T00:00:00.000Z"),
        etag: "etag2",
      },
    ];

    mockListBlobObjects.mockResolvedValue(mockBlobs);

    const result = await fetchScans();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0]?.id).toBe("scan2"); // Newest first
      expect(result.data[1]?.id).toBe("scan1");
    }

    // Verify listBlobObjects was called with correct parameters
    expect(mockListBlobObjects).toHaveBeenCalledWith({
      storageEndpoint: "https://storage.test",
      containerName: "invoices",
      prefix: "scans/user-123/",
      includeMetadata: true,
    });
  });

  it("should exclude attached scans by default", async () => {
    const mockBlobs = [
      {
        name: "scans/user-123/scan1.jpg",
        url: "https://storage.test/invoices/scans/user-123/scan1.jpg",
        metadata: {
          scanId: "scan1",
          ownerId: "user-123",
          displayName: "receipt1.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready",
          uploadedAt: "2024-01-01T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        contentType: "image/jpeg",
        contentLength: 1024,
        createdOn: new Date("2024-01-01T00:00:00.000Z"),
        etag: "etag1",
      },
      {
        name: "scans/user-123/scan2.jpg",
        url: "https://storage.test/invoices/scans/user-123/scan2.jpg",
        metadata: {
          scanId: "scan2",
          ownerId: "user-123",
          displayName: "receipt2.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "attached",
          uploadedAt: "2024-01-02T00:00:00.000Z",
          uploadedBy: "user-123",
          attachedAt: "2024-01-02T01:00:00.000Z",
          attachedBy: "user-123",
          attachedTo: "invoice-123",
        },
        contentType: "image/jpeg",
        contentLength: 2048,
        createdOn: new Date("2024-01-02T00:00:00.000Z"),
        etag: "etag2",
      },
    ];

    mockListBlobObjects.mockResolvedValue(mockBlobs);

    const result = await fetchScans();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe("scan1");
    }
  });

  it("should exclude archived scans by default", async () => {
    const mockBlobs = [
      {
        name: "scans/user-123/scan1.jpg",
        url: "https://storage.test/invoices/scans/user-123/scan1.jpg",
        metadata: {
          scanId: "scan1",
          ownerId: "user-123",
          displayName: "receipt1.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready",
          uploadedAt: "2024-01-01T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        contentType: "image/jpeg",
        contentLength: 1024,
        createdOn: new Date("2024-01-01T00:00:00.000Z"),
        etag: "etag1",
      },
      {
        name: "scans/user-123/scan2.jpg",
        url: "https://storage.test/invoices/scans/user-123/scan2.jpg",
        metadata: {
          scanId: "scan2",
          ownerId: "user-123",
          displayName: "receipt2.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "archived",
          uploadedAt: "2024-01-02T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        contentType: "image/jpeg",
        contentLength: 2048,
        createdOn: new Date("2024-01-02T00:00:00.000Z"),
        etag: "etag2",
      },
    ];

    mockListBlobObjects.mockResolvedValue(mockBlobs);

    const result = await fetchScans({includeArchived: false});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.id).toBe("scan1");
    }
  });

  it("should include archived scans when includeArchived is true", async () => {
    const mockBlobs = [
      {
        name: "scans/user-123/scan1.jpg",
        url: "https://storage.test/invoices/scans/user-123/scan1.jpg",
        metadata: {
          scanId: "scan1",
          ownerId: "user-123",
          displayName: "receipt1.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready",
          uploadedAt: "2024-01-01T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        contentType: "image/jpeg",
        contentLength: 1024,
        createdOn: new Date("2024-01-01T00:00:00.000Z"),
        etag: "etag1",
      },
      {
        name: "scans/user-123/scan2.jpg",
        url: "https://storage.test/invoices/scans/user-123/scan2.jpg",
        metadata: {
          scanId: "scan2",
          ownerId: "user-123",
          displayName: "receipt2.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "archived",
          uploadedAt: "2024-01-02T00:00:00.000Z",
          uploadedBy: "user-123",
          archivedAt: "2024-01-03T00:00:00.000Z",
          archivedBy: "user-123",
        },
        contentType: "image/jpeg",
        contentLength: 2048,
        createdOn: new Date("2024-01-02T00:00:00.000Z"),
        etag: "etag2",
      },
    ];

    mockListBlobObjects.mockResolvedValue(mockBlobs);

    const result = await fetchScans({includeArchived: true});

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data.some((s) => s.status === ScanStatus.ARCHIVED)).toBe(true);
    }
  });

  it("should handle authentication failures", async () => {
    mockFetchBFFUserFromAuthService.mockRejectedValue(new Error("Unauthorized"));

    const result = await fetchScans();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Failed to fetch scans. Please try again.");
    }
  });

  it("should handle empty scan list", async () => {
    mockListBlobObjects.mockResolvedValue([]);

    const result = await fetchScans();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it("should skip scans with invalid metadata", async () => {
    const mockBlobs = [
      {
        name: "scans/user-123/scan1.jpg",
        url: "https://storage.test/invoices/scans/user-123/scan1.jpg",
        metadata: {
          scanId: "scan1",
          ownerId: "user-123",
          displayName: "receipt1.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "ready",
          uploadedAt: "2024-01-01T00:00:00.000Z",
          uploadedBy: "user-123",
        },
        contentType: "image/jpeg",
        contentLength: 1024,
        createdOn: new Date("2024-01-01T00:00:00.000Z"),
        etag: "etag1",
      },
      {
        name: "scans/user-123/scan2.jpg",
        url: "https://storage.test/invoices/scans/user-123/scan2.jpg",
        metadata: {}, // Invalid metadata - missing required fields
        contentType: "image/jpeg",
        contentLength: 2048,
        createdOn: new Date("2024-01-02T00:00:00.000Z"),
        etag: "etag2",
      },
    ];

    mockListBlobObjects.mockResolvedValue(mockBlobs);

    const result = await fetchScans();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1); // Only valid scan returned
      expect(result.data[0]?.id).toBe("scan1");
    }
  });

  it("does not emit blob names or parsing exceptions when invalid metadata is skipped", async () => {
    const sensitiveBlobName = "scans/user-123/private-receipt.jpg";
    mockListBlobObjects.mockResolvedValue([
      {
        name: sensitiveBlobName,
        url: "https://storage.test/invoices/scans/user-123/private-receipt.jpg?sig=secret",
        metadata: {},
        contentType: "image/jpeg",
        contentLength: 1024,
      },
    ]);

    await fetchScans();

    const telemetry = JSON.stringify(mockLogWithTrace.mock.calls);
    expect(telemetry).not.toContain(sensitiveBlobName);
    expect(telemetry).not.toContain("secret");
    expect(telemetry).toContain("scan.fetch.metadata-invalid");
    expect(telemetry).toContain("VALIDATION_ERROR");
  });

  it("should handle detached scans", async () => {
    const mockBlobs = [
      {
        name: "scans/user-123/scan1.jpg",
        url: "https://storage.test/invoices/scans/user-123/scan1.jpg",
        metadata: {
          scanId: "scan1",
          ownerId: "user-123",
          displayName: "receipt1.jpg",
          documentKind: "receipt",
          documentRole: "primary",
          status: "detached",
          uploadedAt: "2024-01-01T00:00:00.000Z",
          uploadedBy: "user-123",
          detachedAt: "2024-01-03T00:00:00.000Z",
          detachedBy: "user-123",
          detachedFrom: "invoice-456",
        },
        contentType: "image/jpeg",
        contentLength: 1024,
        createdOn: new Date("2024-01-01T00:00:00.000Z"),
        etag: "etag1",
      },
    ];

    mockListBlobObjects.mockResolvedValue(mockBlobs);

    const result = await fetchScans();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.status).toBe(ScanStatus.DETACHED);
    }
  });

  it("should handle Azure storage failures", async () => {
    mockListBlobObjects.mockRejectedValue(new Error("Storage connection failed"));

    const result = await fetchScans();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("Failed to fetch scans. Please try again.");
    }
  });
});
