/**
 * @fileoverview Unit tests for invoice scan metadata blob utilities.
 * @module app/domains/invoices/_utils/metadataUtilities/tests
 */

import {ScanDocumentKind, ScanDocumentRole, ScanMetadataStatus, type ScanMetadata} from "@/types/scans";
import {describe, expect, it} from "vitest";
import {readBlobMetadata, writeBlobMetadata} from "./metadataUtilities";

const baseMetadata: ScanMetadata = {
  scanId: "scan-123",
  ownerId: "user-123",
  displayName: "Receipt.jpg",
  collectionName: "June Receipts",
  documentKind: ScanDocumentKind.RECEIPT,
  documentRole: ScanDocumentRole.PRIMARY,
  status: ScanMetadataStatus.READY,
  uploadedAt: new Date("2024-06-01T10:00:00.000Z"),
  uploadedBy: "user-123",
};

const validBlobMetadata: Readonly<Record<string, string>> = {
  scanId: "scan-123",
  ownerId: "user-123",
  documentKind: "receipt",
  documentRole: "primary",
  status: "ready",
  uploadedAt: "2024-06-01T10:00:00.000Z",
  uploadedBy: "user-123",
};

function createBlobMetadata(
  overrides: Readonly<Record<string, string | undefined>> = {},
): Readonly<Record<string, string | undefined>> {
  return {
    ...validBlobMetadata,
    ...overrides,
  };
}

describe("scan blob metadata utilities", () => {
  it("writes required metadata fields as strings", () => {
    const result = writeBlobMetadata(baseMetadata);

    expect(result).toEqual({
      scanId: "scan-123",
      ownerId: "user-123",
      displayName: "Receipt.jpg",
      collectionName: "June Receipts",
      documentKind: "receipt",
      documentRole: "primary",
      status: "ready",
      uploadedAt: "2024-06-01T10:00:00.000Z",
      uploadedBy: "user-123",
    });
  });

  it("omits optional metadata fields when they are not supplied", () => {
    const {displayName: _displayName, collectionName: _collectionName, ...metadataWithoutOptionalNames} = baseMetadata;

    expect(writeBlobMetadata(metadataWithoutOptionalNames)).not.toHaveProperty("displayName");
    expect(writeBlobMetadata(metadataWithoutOptionalNames)).not.toHaveProperty("collectionName");
  });

  it("parses required metadata fields and optional display name", () => {
    const result = readBlobMetadata({
      scanId: "scan-123",
      ownerId: "user-123",
      displayName: "Receipt.jpg",
      documentKind: "receipt",
      documentRole: "primary",
      status: "ready",
      uploadedAt: "2024-06-01T10:00:00.000Z",
      uploadedBy: "user-123",
    });

    expect(result).toMatchObject({
      scanId: "scan-123",
      ownerId: "user-123",
      displayName: "Receipt.jpg",
      documentKind: ScanDocumentKind.RECEIPT,
      documentRole: ScanDocumentRole.PRIMARY,
      status: ScanMetadataStatus.READY,
      uploadedBy: "user-123",
    });
    expect(result.uploadedAt.toISOString()).toBe("2024-06-01T10:00:00.000Z");
  });

  it("does not require displayName when parsing metadata", () => {
    const result = readBlobMetadata({
      scanId: "scan-123",
      ownerId: "user-123",
      documentKind: "receipt",
      documentRole: "primary",
      status: "ready",
      uploadedAt: "2024-06-01T10:00:00.000Z",
      uploadedBy: "user-123",
    });

    expect(result.displayName).toBeUndefined();
  });

  it("parses all optional lifecycle fields", () => {
    const result = readBlobMetadata({
      scanId: "scan-123",
      ownerId: "user-123",
      documentKind: "invoice",
      documentRole: "primary",
      status: "attached",
      uploadedAt: "2024-06-01T10:00:00.000Z",
      uploadedBy: "user-123",
      lastModifiedAt: "2024-06-02T10:00:00.000Z",
      lastModifiedBy: "editor-123",
      attachedAt: "2024-06-03T10:00:00.000Z",
      attachedBy: "attacher-123",
      attachedTo: "invoice-123",
      detachedAt: "2024-06-04T10:00:00.000Z",
      detachedBy: "detacher-123",
      detachedFrom: "invoice-456",
      archivedAt: "2024-06-05T10:00:00.000Z",
      archivedBy: "archiver-123",
    });

    expect(result.lastModifiedAt?.toISOString()).toBe("2024-06-02T10:00:00.000Z");
    expect(result.lastModifiedBy).toBe("editor-123");
    expect(result.attachedAt?.toISOString()).toBe("2024-06-03T10:00:00.000Z");
    expect(result.attachedBy).toBe("attacher-123");
    expect(result.attachedTo).toBe("invoice-123");
    expect(result.detachedAt?.toISOString()).toBe("2024-06-04T10:00:00.000Z");
    expect(result.detachedBy).toBe("detacher-123");
    expect(result.detachedFrom).toBe("invoice-456");
    expect(result.archivedAt?.toISOString()).toBe("2024-06-05T10:00:00.000Z");
    expect(result.archivedBy).toBe("archiver-123");
  });

  it.each([
    ["scanId", "Missing required blob metadata: scanId"],
    ["ownerId", "Missing required blob metadata: ownerId"],
    ["documentKind", "Missing required blob metadata: documentKind"],
    ["documentRole", "Missing required blob metadata: documentRole"],
    ["status", "Missing required blob metadata: status"],
    ["uploadedAt", "Missing required blob metadata: uploadedAt"],
    ["uploadedBy", "Missing required blob metadata: uploadedBy"],
  ] as const)("throws when required metadata field %s is missing", (metadataKey, expectedError) => {
    expect(() => readBlobMetadata(createBlobMetadata({[metadataKey]: undefined}))).toThrow(expectedError);
  });

  it.each([
    ["documentKind", "unsupported", "Invalid blob metadata documentKind: unsupported"],
    ["documentRole", "unsupported", "Invalid blob metadata documentRole: unsupported"],
    ["status", "unsupported", "Invalid blob metadata status: unsupported"],
  ] as const)("throws when %s is invalid", (metadataKey, invalidValue, expectedError) => {
    expect(() => readBlobMetadata(createBlobMetadata({[metadataKey]: invalidValue}))).toThrow(expectedError);
  });

  it.each([
    ["lastModifiedAt", "Invalid blob metadata date: lastModifiedAt"],
    ["attachedAt", "Invalid blob metadata date: attachedAt"],
    ["detachedAt", "Invalid blob metadata date: detachedAt"],
    ["archivedAt", "Invalid blob metadata date: archivedAt"],
  ] as const)("throws when optional date %s is invalid", (metadataKey, expectedError) => {
    expect(() => readBlobMetadata(createBlobMetadata({[metadataKey]: "not-a-date"}))).toThrow(expectedError);
  });

  it("throws when status is invalid", () => {
    expect(() =>
      readBlobMetadata({
        scanId: "scan-123",
        ownerId: "user-123",
        documentKind: "receipt",
        documentRole: "primary",
        status: "unsupported",
        uploadedAt: "2024-06-01T10:00:00.000Z",
        uploadedBy: "user-123",
      }),
    ).toThrow("Invalid blob metadata status: unsupported");
  });

  it("throws when a date is invalid", () => {
    expect(() =>
      readBlobMetadata({
        scanId: "scan-123",
        ownerId: "user-123",
        documentKind: "receipt",
        documentRole: "primary",
        status: "ready",
        uploadedAt: "not-a-date",
        uploadedBy: "user-123",
      }),
    ).toThrow("Invalid blob metadata date: uploadedAt");
  });

  it("writes only the lifecycle fields present on the supplied metadata", () => {
    const result = writeBlobMetadata({
      ...baseMetadata,
      status: ScanMetadataStatus.ATTACHED,
      lastModifiedAt: new Date("2024-06-02T10:00:00.000Z"),
      lastModifiedBy: "editor-123",
      attachedAt: new Date("2024-06-03T10:00:00.000Z"),
      attachedBy: "attacher-123",
      attachedTo: "invoice-123",
    });

    expect(result).toMatchObject({
      status: "attached",
      lastModifiedAt: "2024-06-02T10:00:00.000Z",
      lastModifiedBy: "editor-123",
      attachedAt: "2024-06-03T10:00:00.000Z",
      attachedBy: "attacher-123",
      attachedTo: "invoice-123",
    });
    expect(result).not.toHaveProperty("detachedAt");
    expect(result).not.toHaveProperty("archivedAt");
  });
});
