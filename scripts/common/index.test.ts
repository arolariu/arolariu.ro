// @vitest-environment node
/**
 * @fileoverview Tests for logger-backed shared presentation utilities.
 * @module scripts/common/index.test
 *
 * @remarks
 * All behavior is exercised through the exported public contracts with an in-memory logger sink
 * and fixed instants, so no case depends on ambient terminal state, the wall clock, or a spawned
 * child process.
 */

import {describe, expect, it} from "vitest";
import {ComposedTerminalPresenter} from "../core/presentation/composed-terminal-presenter.ts";
import {RecordingTerminalPresenterSink} from "../testing/fixtures/terminal.fixture.ts";
import type {TerminalPresenter} from "../core/presentation/terminal-presenter.ts";
import {
  formatBytes,
  formatDurationMs,
  formatTimestamp,
  logWorkerComplete,
  logWorkerSpawn,
  createProgressTracker,
  printWorkerTimeline,
} from "./index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestLogger(): Readonly<{sink: RecordingTerminalPresenterSink; logger: TerminalPresenter}> {
  const sink = new RecordingTerminalPresenterSink();
  const logger = new ComposedTerminalPresenter("test", {
    color: false,
    sink,
  });

  return {sink, logger};
}

/** Fixed local instant used by every worker-lifecycle case. */
const fixedInstant = new Date(2026, 8, 3, 14, 23, 45, 123);

// ---------------------------------------------------------------------------
// formatBytes
// ---------------------------------------------------------------------------

describe("formatBytes", () => {
  it("formats bytes below 1 KB as bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats values in the KB range", () => {
    expect(formatBytes(1024)).toBe("1.00 KB");
  });

  it("formats values in the MB range", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
  });

  it("formats values in the GB range", () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1.00 GB");
  });
});

// ---------------------------------------------------------------------------
// formatDurationMs
// ---------------------------------------------------------------------------

describe("formatDurationMs", () => {
  it("returns milliseconds when under 1 second", () => {
    expect(formatDurationMs(500)).toBe("500ms");
  });

  it("returns seconds with 2 decimal places when >= 1 second", () => {
    expect(formatDurationMs(1000)).toBe("1.00s");
    expect(formatDurationMs(1500)).toBe("1.50s");
  });
});

// ---------------------------------------------------------------------------
// formatTimestamp
// ---------------------------------------------------------------------------

describe("formatTimestamp", () => {
  it("renders the supplied instant in HH:MM:SS.mmm format", () => {
    expect(formatTimestamp(fixedInstant)).toBe("14:23:45.123");
  });

  it("zero-pads every field of an early instant", () => {
    expect(formatTimestamp(new Date(2026, 0, 1, 4, 5, 6, 7))).toBe("04:05:06.007");
  });
});

// ---------------------------------------------------------------------------
// logWorkerSpawn and logWorkerComplete
// ---------------------------------------------------------------------------

describe("logWorkerSpawn", () => {
  it("writes the supplied timestamp, workerId, and taskName through the logger", () => {
    const {sink, logger} = createTestLogger();

    logWorkerSpawn(1, "packages", logger, fixedInstant);

    expect(sink.records).toHaveLength(1);
    expect(sink.records[0]?.text).toBe('[14:23:45.123] 🚀 Worker #1 spawned for task "packages"');
  });
});

describe("logWorkerComplete", () => {
  it("writes a successful completion through the logger", () => {
    const {sink, logger} = createTestLogger();

    logWorkerComplete(2, "website", 2000, "success", logger, fixedInstant);

    expect(sink.records).toHaveLength(1);
    expect(sink.records[0]?.text).toBe('[14:23:45.123] ✅ Worker #2 finished "website" in 2.00s');
  });

  it("writes an error completion through the logger", () => {
    const {sink, logger} = createTestLogger();

    logWorkerComplete(3, "api", 1000, "error", logger, fixedInstant);

    expect(sink.records).toHaveLength(1);
    expect(sink.records[0]?.text).toBe('[14:23:45.123] ❌ Worker #3 finished "api" in 1.00s');
  });
});

// ---------------------------------------------------------------------------
// createProgressTracker
// ---------------------------------------------------------------------------

describe("createProgressTracker", () => {
  it("starts at 0 completed", () => {
    const {logger} = createTestLogger();
    const tracker = createProgressTracker(4, logger);
    expect(tracker.completed).toBe(0);
  });

  it("increments completed count", () => {
    const {logger} = createTestLogger();
    const tracker = createProgressTracker(4, logger);
    tracker.start();
    tracker.increment();
    tracker.increment();
    expect(tracker.completed).toBe(2);
  });

  it("does not emit carriage returns for non-TTY progress", () => {
    const {sink, logger} = createTestLogger();
    const tracker = createProgressTracker(4, logger);

    tracker.start();
    tracker.increment();
    tracker.finish();

    expect(sink.records.length).toBeGreaterThan(0);
    expect(sink.records.every((record) => !record.text.includes("\r"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// printWorkerTimeline
// ---------------------------------------------------------------------------

describe("printWorkerTimeline", () => {
  it("does nothing when passed an empty array", () => {
    const {sink, logger} = createTestLogger();

    printWorkerTimeline([], logger);

    expect(sink.records).toHaveLength(0);
  });

  it("writes a non-empty timeline through the logger", () => {
    const {sink, logger} = createTestLogger();

    printWorkerTimeline([{target: "packages", durationMs: 2000}], logger);

    expect(sink.records.some((record) => record.text.includes("Worker Timeline"))).toBe(true);
    expect(sink.records.some((record) => record.text.includes("packages"))).toBe(true);
  });
});
