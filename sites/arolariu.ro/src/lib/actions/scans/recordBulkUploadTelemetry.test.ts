/**
 * @fileoverview Tests for recordBulkUploadTelemetry server action.
 * @module lib/actions/scans/recordBulkUploadTelemetry.test
 */

import type {BulkUploadTelemetryPayload} from "@/types/scans";
import {describe, expect, it, vi} from "vitest";

const {mockAddSpanEvent, mockLogWithTrace, mockWithSpan} = vi.hoisted(() => ({
  mockAddSpanEvent: vi.fn(),
  mockLogWithTrace: vi.fn(),
  mockWithSpan: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),
}));

vi.mock("@/instrumentation.server", () => ({
  addSpanEvent: mockAddSpanEvent,
  logWithTrace: mockLogWithTrace,
  withSpan: mockWithSpan,
}));

import {recordBulkUploadTelemetry} from "./recordBulkUploadTelemetry";

describe("recordBulkUploadTelemetry", () => {
  it("should emit summary and failure reason events for bulk upload payload", async () => {
    const payload: BulkUploadTelemetryPayload = {
      batchSize: 4,
      totalBytes: 20_480,
      concurrency: 3,
      retryCount: 2,
      durationMs: 1_250,
      successCount: 3,
      failureCount: 1,
      failureReasons: {
        network: 1,
        timeout: 0,
        throttled: 0,
        server_error: 0,
        client_error: 0,
        auth: 0,
        compatibility: 0,
        unknown: 0,
      },
    };

    await recordBulkUploadTelemetry(payload);

    expect(mockWithSpan).toHaveBeenCalledWith("api.actions.scans.recordBulkUploadTelemetry", expect.any(Function));
    expect(mockAddSpanEvent).toHaveBeenCalledWith(
      "scans.upload.bulk.complete",
      expect.objectContaining({
        "bulk.batch_size": 4,
        "bulk.total_bytes": 20_480,
        "bulk.concurrency": 3,
      }),
    );
    expect(mockAddSpanEvent).toHaveBeenCalledWith(
      "scans.upload.bulk.failure_reason",
      expect.objectContaining({
        "bulk.failure_reason": "network",
        "bulk.failure_count": 1,
      }),
    );
    expect(mockLogWithTrace).toHaveBeenCalledWith(
      "info",
      "Recorded bulk scan upload telemetry",
      expect.objectContaining({
        "bulk.success_count": 3,
        "bulk.failure_count": 1,
      }),
      "server",
    );
  });
});
