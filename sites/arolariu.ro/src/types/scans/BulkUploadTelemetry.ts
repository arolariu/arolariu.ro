/**
 * @fileoverview Types for bulk scan upload telemetry payloads.
 * @module types/scans/BulkUploadTelemetry
 */

/**
 * Failure reason buckets used for aggregated observability.
 */
export type UploadFailureReasonCategory =
  | "network"
  | "timeout"
  | "throttled"
  | "server_error"
  | "client_error"
  | "auth"
  | "compatibility"
  | "unknown";

/**
 * Aggregated counters for each failure reason category.
 */
export type UploadFailureReasonCounters = Record<UploadFailureReasonCategory, number>;

/**
 * Payload emitted by the bulk upload client flow.
 */
export interface BulkUploadTelemetryPayload {
  /**
   * Number of files included in the batch.
   */
  batchSize: number;
  /**
   * Total byte size of all files in the batch.
   */
  totalBytes: number;
  /**
   * Configured upload worker concurrency.
   */
  concurrency: number;
  /**
   * Number of retry attempts performed across all files.
   */
  retryCount: number;
  /**
   * End-to-end batch duration in milliseconds.
   */
  durationMs: number;
  /**
   * Number of uploads that completed successfully.
   */
  successCount: number;
  /**
   * Number of uploads that failed after retries/fallback.
   */
  failureCount: number;
  /**
   * Failure category breakdown for failed files.
   */
  failureReasons: UploadFailureReasonCounters;
}
