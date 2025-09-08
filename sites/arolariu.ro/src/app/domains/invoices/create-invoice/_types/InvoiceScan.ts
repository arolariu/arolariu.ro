/** @format */

export type InvoiceScanType = "image" | "pdf";

export interface InvoiceScan {
  id: string; // Unique identifier for the scan
  file: File;
  blob: Blob; // The actual file data
  name: string; // Original filename
  type: InvoiceScanType; // Simplified type classification
  preview: string;
  uploadedAt: Date;
  rotation?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  isProcessing?: boolean;
  mimeType: string; // Original MIME type
  size: number; // File size in bytes
  createdAt: Date; // When it was added
  url?: string; // Cached blob URL for performance
}

export interface InvoiceScanError {
  id: string;
  message: string;
  code: "INVALID_TYPE" | "FILE_TOO_LARGE" | "PROCESSING_ERROR";
}
