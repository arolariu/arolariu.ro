/**
 * @fileoverview Shared helpers for standalone scan uploads.
 * @module lib/actions/scans/uploadHelpers
 */

import {ScanType} from "@/types/scans";

type CreateScanBlobNameInput = Readonly<{
  userIdentifier: string;
  scanId: string;
  fileName: string;
  timestampMs?: number;
}>;

/**
 * Maps MIME type to ScanType enum.
 */
export function mimeTypeToScanType(mimeType: string): ScanType {
  switch (mimeType.toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return ScanType.JPEG;
    case "image/png":
      return ScanType.PNG;
    case "application/pdf":
      return ScanType.PDF;
    default:
      return ScanType.OTHER;
  }
}

/**
 * Generates a UUIDv7-like identifier using timestamp + random bytes.
 */
export function generateScanId(): string {
  const timestamp = Date.now().toString(16).padStart(12, "0");
  const random = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

  return `${timestamp.slice(0, 8)}-${timestamp.slice(8, 12)}-7${random.slice(0, 3)}-${random.slice(3, 7)}-${random.slice(7, 19)}`;
}

/**
 * Creates canonical blob path for a scan upload.
 */
export function createScanBlobName({userIdentifier, scanId, fileName, timestampMs = Date.now()}: CreateScanBlobNameInput): string {
  const extension = fileName.split(".").pop() ?? "bin";
  return `scans/${userIdentifier}/${scanId}_${timestampMs}.${extension}`;
}

