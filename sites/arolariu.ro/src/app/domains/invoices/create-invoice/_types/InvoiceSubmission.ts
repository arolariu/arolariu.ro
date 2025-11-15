/**
 * @fileoverview Shared type definitions for pending invoice submissions used by the invoice creator workflow.
 */

/** Represents the lifecycle status for a pending invoice submission. */
export type PendingInvoiceStatus = "idle" | "uploading" | "creating" | "attaching-scan" | "completed" | "failed";

/** Supported media types for pending invoice submissions. */
export type PendingInvoiceFileType = "image" | "pdf";

export type PendingInvoiceSubmissionError = {
  id: string;
  message: string;
  code: "INVALID_TYPE" | "FILE_TOO_LARGE" | "PROCESSING_ERROR";
};

/**
 * Common metadata persisted for both image and PDF submissions.
 */
export type PendingInvoiceSubmissionBase = {
  /** Identifier that matches the local scan identifier. */
  id: string;
  /** Human readable name (can be edited by the user). */
  name: string;
  /** Original file reference kept in memory for conversions. */
  file?: File;
  /** Latest blob representation used for previews. */
  blob?: Blob;
  /** MIME type declared by the file. */
  mimeType: string;
  /** Raw file size in bytes. */
  size: number;
  /** Simplified classification for UI toggles. */
  type: PendingInvoiceFileType;
  /** Blob URL for the preview surface. */
  preview?: string;
  /** Optional alternate URL used when replacing previews. */
  url?: string;
  /** Timestamps used for UI sorting and display. */
  uploadedAt: Date;
  createdAt: Date;
  /** UI level processing toggle. */
  isProcessing?: boolean;
  /** Current lifecycle status for the submission. */
  status: PendingInvoiceStatus;
  /** How many attempts have been made so far. */
  attempts: number;
  /** Optional backend invoice identifier once created. */
  invoiceId?: string;
  /** Optional error description for the latest failure. */
  error?: string;
  /** Timestamp for the last update in ISO8601 format. */
  lastUpdatedAt: string;
};

/** Image specific adjustments applied on the client. */
export type PendingInvoiceImageAdjustments = {
  rotation: number;
  brightness: number;
  contrast: number;
  saturation: number;
};

/** Pending submission built from an image file. */
export type PendingImageSubmission = PendingInvoiceSubmissionBase & {
  type: "image";
  adjustments: PendingInvoiceImageAdjustments;
};

/** Pending submission built from a PDF file. */
export type PendingPdfSubmission = PendingInvoiceSubmissionBase & {
  type: "pdf";
  adjustments?: undefined;
};

/** Runtime representation of a pending invoice submission. */
export type PendingInvoiceSubmission = PendingImageSubmission | PendingPdfSubmission;

/** Immutable set of defaults for image adjustments. */
export const DEFAULT_IMAGE_ADJUSTMENTS: PendingInvoiceImageAdjustments = Object.freeze({
  rotation: 0,
  brightness: 100,
  contrast: 100,
  saturation: 100,
}) satisfies PendingInvoiceImageAdjustments;

/** Type guard to quickly access image-only properties. */
export const isImageSubmission = (submission: PendingInvoiceSubmission): submission is PendingImageSubmission =>
  submission.type === "image";
