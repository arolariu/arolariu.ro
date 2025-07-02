/** @format */

import {generateGuid} from "@/lib/utils.generic";
import type {InvoiceScan, InvoiceScanError, InvoiceScanType} from "../_types/InvoiceScan";

// Supported MIME types
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"] as const;
const SUPPORTED_PDF_TYPES = ["application/pdf"] as const;
const SUPPORTED_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_PDF_TYPES] as const;

// File size limits (in bytes)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Determines the scan type based on MIME type
 */
export function determineScanType(mimeType: string): InvoiceScanType {
  if (SUPPORTED_PDF_TYPES.includes(mimeType as any)) {
    return "pdf";
  }
  if (SUPPORTED_IMAGE_TYPES.includes(mimeType as any)) {
    return "image";
  }
  // Default to image for backward compatibility
  return "image";
}

/**
 * Validates if a file is supported
 */
export function validateFile(file: File): InvoiceScanError | null {
  if (!SUPPORTED_TYPES.includes(file.type as any)) {
    return {
      id: generateId(),
      message: `Unsupported file type: ${file.type}. Please upload JPEG, PNG, or PDF files.`,
      code: "INVALID_TYPE",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      id: generateId(),
      message: `File size too large: ${(file.size / (1024 * 1024)).toFixed(1)}MB. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
      code: "FILE_TOO_LARGE",
    };
  }

  return null;
}

/**
 * Creates an InvoiceScan from a File object
 */
export function createInvoiceScan(file: File): InvoiceScan {
  const scanType = determineScanType(file.type);

  return {
    id: generateId(),
    blob: file,
    name: file.name,
    type: scanType,
    mimeType: file.type,
    size: file.size,
    createdAt: new Date(),
  };
}

/**
 * Creates an InvoiceScan from a Blob (for backward compatibility)
 */
export function createInvoiceScanFromBlob(blob: Blob, name?: string): InvoiceScan {
  const scanType = determineScanType(blob.type);

  return {
    id: generateId(),
    blob,
    name: name || `scan-${Date.now()}.${scanType === "pdf" ? "pdf" : "jpg"}`,
    type: scanType,
    mimeType: blob.type,
    size: blob.size,
    createdAt: new Date(),
  };
}

/**
 * Checks if a scan is a PDF
 */
export function isPDF(scan: InvoiceScan): boolean {
  return scan.type === "pdf";
}

/**
 * Checks if a scan is an image
 */
export function isImage(scan: InvoiceScan): boolean {
  return scan.type === "image";
}

/**
 * Gets a blob URL for the scan, creating one if it doesn't exist
 */
export function getScanUrl(scan: InvoiceScan): string {
  if (!scan.url) {
    scan.url = URL.createObjectURL(scan.blob);
  }
  return scan.url;
}

/**
 * Cleans up the blob URL for a scan
 */
export function revokeScanUrl(scan: InvoiceScan): void {
  if (scan.url) {
    URL.revokeObjectURL(scan.url);
    scan.url = undefined;
  }
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Generates a unique ID for scans
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  const seed = `${timestamp}-${randomPart}`;

  // Use a new ArrayBuffer to ensure uniqueness
  const arrayBuffer = new TextEncoder().encode(seed).buffer;
  return generateGuid(arrayBuffer);
}

/**
 * Creates a rotated version of an image scan
 */
export function rotateImageScan(scan: InvoiceScan): Promise<InvoiceScan> {
  return new Promise((resolve, reject) => {
    if (scan.type !== "image") {
      reject(new Error("Can only rotate image scans"));
      return;
    }

    const img = new Image();
    const imageUrl = getScanUrl(scan);

    img.addEventListener("load", () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("Could not get canvas context");
        }

        // Swap width and height for 90-degree rotation
        canvas.width = img.height;
        canvas.height = img.width;

        // Apply rotation transformation
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2); // 90 degrees clockwise
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // Convert canvas back to a blob
        canvas.toBlob(
          (rotatedBlob) => {
            if (rotatedBlob) {
              // Clean up the old URL
              revokeScanUrl(scan);

              // Create new scan with rotated blob
              const rotatedScan: InvoiceScan = {
                ...scan,
                id: generateId(), // New ID for the rotated version
                blob: rotatedBlob,
                size: rotatedBlob.size,
                createdAt: new Date(),
                url: undefined, // Will be created when needed
              };

              resolve(rotatedScan);
            } else {
              reject(new Error("Failed to create rotated blob"));
            }
          },
          scan.mimeType,
          1, // Maintain full quality
        );
      } catch (error) {
        reject(error);
      }
    });

    img.addEventListener("error", () => {
      reject(new Error("Failed to load image for rotation"));
    });

    img.src = imageUrl;
  });
}
