"use server";

/**
 * @fileoverview Server action for recording bulk scan upload telemetry.
 * @module lib/actions/scans/recordBulkUploadTelemetry
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import type {BulkUploadTelemetryPayload, UploadFailureReasonCategory} from "@/types/scans";

/**
 * Records aggregated observability data for the bulk upload lifecycle.
 */
export async function recordBulkUploadTelemetry(payload: Readonly<BulkUploadTelemetryPayload>): Promise<void> {
  await withSpan("api.actions.scans.recordBulkUploadTelemetry", async () => {
    addSpanEvent("scans.upload.bulk.complete", {
      "bulk.batch_size": payload.batchSize,
      "bulk.total_bytes": payload.totalBytes,
      "bulk.concurrency": payload.concurrency,
      "bulk.retry_count": payload.retryCount,
      "bulk.duration_ms": payload.durationMs,
      "bulk.success_count": payload.successCount,
      "bulk.failure_count": payload.failureCount,
    });

    const failureReasonEntries = Object.entries(payload.failureReasons) as [UploadFailureReasonCategory, number][];

    for (const [reason, count] of failureReasonEntries) {
      if (count <= 0) {
        continue;
      }

      addSpanEvent("scans.upload.bulk.failure_reason", {
        "bulk.failure_reason": reason,
        "bulk.failure_count": count,
      });
    }

    logWithTrace(
      "info",
      "Recorded bulk scan upload telemetry",
      {
        ...payload.failureReasons,
        "bulk.batch_size": payload.batchSize,
        "bulk.total_bytes": payload.totalBytes,
        "bulk.concurrency": payload.concurrency,
        "bulk.retry_count": payload.retryCount,
        "bulk.duration_ms": payload.durationMs,
        "bulk.success_count": payload.successCount,
        "bulk.failure_count": payload.failureCount,
      },
      "server",
    );
  });
}
