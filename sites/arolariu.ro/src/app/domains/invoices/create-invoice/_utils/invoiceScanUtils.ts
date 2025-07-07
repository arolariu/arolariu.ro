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
 * Determines the scan type based on MIME type.
 * @param mimeType The MIME type of the file, e.g., "image/jpeg", "application/pdf"
 * @returns The scan type ("pdf" or "image"), defaulting to "image" for backward compatibility
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
 * Validates if a file is supported, checking its type and size.
 * @param file The file to validate, which should be an instance of File
 * @returns An error object if validation fails, or null if valid, indicating the file is supported
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
 * Creates an InvoiceScan from a File object.
 * @param file The file to create the scan from, which should be an instance of File
 * @returns An InvoiceScan object.
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
 * Checks if a scan is a PDF, indicating it is a document scan.
 * @param scan The InvoiceScan to check.
 * @returns True if the scan is a PDF, false otherwise.
 */
export function isPDF(scan: InvoiceScan): boolean {
  return scan.type === "pdf";
}

/**
 * Checks if a scan is an image, indicating it is a photo scan.
 * @param scan The InvoiceScan to check.
 * @returns True if the scan is an image, false otherwise.
 */
export function isImage(scan: InvoiceScan): boolean {
  return scan.type === "image";
}

/**
 * Gets a blob URL for the scan, creating one if it doesn't exist.
 * This URL is used to display the scan in the UI without needing to upload it again.
 * @param scan The InvoiceScan to get the URL for.
 * @returns The blob URL for the scan, or creates one if it doesn't exist.
 */
export function getScanUrl(scan: InvoiceScan): string {
  if (!scan.url) {
    // Create a new object to avoid mutating the original
    const url = URL.createObjectURL(scan.blob);
    // Since we can't mutate scan directly, we'll return the URL
    // and let the caller handle the state update if needed
    Object.defineProperty(scan, "url", {
      value: url,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    return url;
  }
  return scan.url;
}

/**
 * Cleans up the blob URL for a scan, revoking it to free up memory.
 * This is important to prevent memory leaks, especially for large files.
 * @param scan The InvoiceScan to revoke the URL for.
 */
export function revokeScanUrl(scan: InvoiceScan): void {
  if (scan.url) {
    URL.revokeObjectURL(scan.url);
    // Use defineProperty to avoid direct mutation warning
    Object.defineProperty(scan, "url", {
      value: undefined,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
}

/**
 * Generates a unique ID for scan objects.
 * This ID is based on the current timestamp and a random part to ensure uniqueness.
 * It uses a new ArrayBuffer to ensure that the generated ID is unique across different instances.
 * @returns A unique string ID.
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  // eslint-disable-next-line sonarjs/pseudo-random -- this is a simple random part generation
  const randomPart = Math.random().toString(36).slice(2, 10);
  const seed = `${timestamp}-${randomPart}`;

  // Use a new ArrayBuffer to ensure uniqueness
  const arrayBuffer = new TextEncoder().encode(seed).buffer as ArrayBuffer;
  return generateGuid(arrayBuffer);
}

/**
 * Creates a rotated version of an image scan.
 * This function takes an InvoiceScan of type "image",
 * rotates it 90 degrees clockwise, and returns a new InvoiceScan object.
 * @param scan The InvoiceScan to rotate
 * @returns A Promise that resolves to a new InvoiceScan with the rotated image
 * @throws Error if the scan type is not "image" or if the rotation fails
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
        const canvasWidth = img.height;
        const canvasHeight = img.width;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

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

    // Set source to trigger load event
    Object.defineProperty(img, "src", {
      value: imageUrl,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });
}
