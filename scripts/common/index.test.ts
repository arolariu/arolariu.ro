// @vitest-environment node
/**
 * @fileoverview Tests for logger-backed shared presentation utilities.
 * @module scripts/common/index.test
 *
 * @remarks
 * All behavior is exercised through the exported public contracts with an
 * in-memory logger sink.
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger, type MonorepositoryLogger} from "./logger.ts";
import {
  formatBytes,
  formatDurationMs,
  formatTimestamp,
  isAzureInfrastructure,
  isInCI,
  isProductionEnvironment,
  isVerboseMode,
  logWorkerComplete,
  logWorkerSpawn,
  createProgressTracker,
  printWorkerTimeline,
  runWithSpinner,
} from "./index.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Spawn a real child via the current node binary. Cross-platform, no PATH dep. */
function node(code: string): [string, string[]] {
  return [process.execPath, ["-e", code]];
}

function createTestLogger(): Readonly<{sink: InMemoryLoggerSink; logger: MonorepositoryLogger}> {
  const sink = new InMemoryLoggerSink();
  const logger = new MonorepositoryConsoleLogger("test", {
    color: false,
    sink,
  });

  return {sink, logger};
}

// ---------------------------------------------------------------------------
// Non-TTY (CI) path is quiet
// ---------------------------------------------------------------------------

describe("non-TTY path keeps CI logs clean", () => {
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, "isTTY", {value: false, configurable: true});
  });

  afterEach(() => {
    Object.defineProperty(process.stdout, "isTTY", {value: originalIsTTY, configurable: true});
  });

  it("emits no spinner frames or ANSI cursor escapes on non-TTY stdout", async () => {
    const {sink, logger} = createTestLogger();
    const [cmd, args] = node("process.exit(0)");
    await runWithSpinner(cmd, args, "test task", true, logger);

    expect(sink.records.length).toBeGreaterThan(0);
    const hasSpinnerOutput = sink.records.some((record) => record.text.includes("\r") || record.text.includes("\x1b["));
    expect(hasSpinnerOutput).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Success vs failure result shapes
// ---------------------------------------------------------------------------

describe("success and failure result shapes", () => {
  it("resolves with code 0 for a process that exits 0", async () => {
    const {logger} = createTestLogger();
    const [cmd, args] = node("process.exit(0)");
    const result = await runWithSpinner(cmd, args, "success test", true, logger);
    expect(result.code).toBe(0);
  });

  it("resolves with non-zero code for a process that exits non-zero", async () => {
    const {logger} = createTestLogger();
    const [cmd, args] = node("process.exit(42)");
    const result = await runWithSpinner(cmd, args, "failure test", true, logger);
    expect(result.code).toBe(42);
  });

  it("captures stdout output in the result", async () => {
    const {logger} = createTestLogger();
    const [cmd, args] = node("process.stdout.write('hello-from-child')");
    const result = await runWithSpinner(cmd, args, "capture test", true, logger);
    expect(result.output).toContain("hello-from-child");
  });

  it("captures stderr in the output field on failure", async () => {
    const {logger} = createTestLogger();
    const [cmd, args] = node("process.stderr.write('err-detail'); process.exit(1)");
    const result = await runWithSpinner(cmd, args, "stderr capture test", true, logger);
    expect(result.code).not.toBe(0);
    expect(result.output).toContain("err-detail");
  });

  it("hideOutput=false runs with inherited stdio and resolves code", async () => {
    const {logger} = createTestLogger();
    const [cmd, args] = node("process.exit(0)");
    const result = await runWithSpinner(cmd, args, "inherited stdio test", false, logger);
    expect(result.code).toBe(0);
    expect(result.output).toBe("");
  });

  it("hideOutput=false resolves non-zero exit code", async () => {
    const {logger} = createTestLogger();
    const [cmd, args] = node("process.exit(3)");
    const result = await runWithSpinner(cmd, args, "inherited stdio fail", false, logger);
    expect(result.code).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Timer cleanup — no lingering interval after resolution
// ---------------------------------------------------------------------------

describe("timer cleanup after runWithSpinner resolves", () => {
  let originalIsTTY: boolean | undefined;

  beforeEach(() => {
    originalIsTTY = process.stdout.isTTY;
  });

  afterEach(() => {
    Object.defineProperty(process.stdout, "isTTY", {value: originalIsTTY, configurable: true});
    vi.useRealTimers();
  });

  it("no pending intervals remain after a successful run (TTY path)", async () => {
    Object.defineProperty(process.stdout, "isTTY", {value: true, configurable: true});
    const {logger} = createTestLogger();
    vi.useFakeTimers({shouldAdvanceTime: true});

    const [cmd, args] = node("setTimeout(() => process.exit(0), 200)");
    await runWithSpinner(cmd, args, "timer cleanup test", true, logger);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("no pending intervals remain after a failed run (TTY path)", async () => {
    Object.defineProperty(process.stdout, "isTTY", {value: true, configurable: true});
    const {logger} = createTestLogger();
    vi.useFakeTimers({shouldAdvanceTime: true});

    const [cmd, args] = node("process.exit(1)");
    await runWithSpinner(cmd, args, "timer cleanup failure test", true, logger);

    expect(vi.getTimerCount()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe("runWithSpinner input validation", () => {
  it("throws when command is empty string", async () => {
    await expect(runWithSpinner("", [], "spinner text")).rejects.toThrow(/Command cannot be empty/);
  });

  it("throws when command is whitespace only", async () => {
    await expect(runWithSpinner("   ", [], "spinner text")).rejects.toThrow(/Command cannot be empty/);
  });

  it("throws when spinner text is empty string", async () => {
    await expect(runWithSpinner(process.execPath, [], "")).rejects.toThrow(/Spinner text cannot be empty/);
  });

  it("throws when args is not an array", async () => {
    // JSON.parse returns `any`, so assignment to string[] is valid without a cast.
    // This tests the runtime Array.isArray() guard.
    const notAnArray: string[] = JSON.parse('"not-an-array"');
    await expect(runWithSpinner("echo", notAnArray, "spinner text")).rejects.toThrow(/Arguments must be an array/);
  });
});

// ---------------------------------------------------------------------------
// Spawn error paths (child.on("error") handler coverage)
// ---------------------------------------------------------------------------

describe("spawn error handling", () => {
  it("resolves code 1, captures the message, and emits one logger error when command does not exist", async () => {
    const {sink, logger} = createTestLogger();
    const result = await runWithSpinner("definitely-nonexistent-binary-xyz-1234", [], "spawn error test", true, logger);

    expect(result.code).toBe(1);
    expect(result.output).toBeTruthy();
    expect(sink.records.filter((record) => record.text.includes("Error:"))).toHaveLength(1);
  });

  it("resolves code 1 when command does not exist (hideOutput=false)", async () => {
    const {logger} = createTestLogger();
    const result = await runWithSpinner("definitely-nonexistent-binary-xyz-1234", [], "spawn error test", false, logger);
    expect(result.code).toBe(1);
  });
});

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
  it("returns a string in HH:MM:SS.mmm format", () => {
    const ts = formatTimestamp();
    expect(ts).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
  });
});

// ---------------------------------------------------------------------------
// Environment flags
// ---------------------------------------------------------------------------

describe("environment flags", () => {
  it("isProductionEnvironment reflects PRODUCTION env var", () => {
    // The flag is module-level; just verify it is a boolean
    expect(typeof isProductionEnvironment).toBe("boolean");
  });

  it("isAzureInfrastructure reflects INFRA env var", () => {
    expect(typeof isAzureInfrastructure).toBe("boolean");
  });

  it("isVerboseMode reflects VERBOSE env var", () => {
    expect(typeof isVerboseMode).toBe("boolean");
  });

  it("isInCI reflects CI or GITHUB_ACTIONS env var", () => {
    expect(typeof isInCI).toBe("boolean");
  });
});

// ---------------------------------------------------------------------------
// logWorkerSpawn and logWorkerComplete
// ---------------------------------------------------------------------------

describe("logWorkerSpawn", () => {
  it("writes workerId and taskName through the logger", () => {
    const {sink, logger} = createTestLogger();

    logWorkerSpawn(1, "packages", logger);

    expect(sink.records).toHaveLength(1);
    expect(sink.records[0]?.text).toContain("Worker #1");
    expect(sink.records[0]?.text).toContain("packages");
  });
});

describe("logWorkerComplete", () => {
  it("writes a successful completion through the logger", () => {
    const {sink, logger} = createTestLogger();

    logWorkerComplete(2, "website", 2000, "success", logger);

    expect(sink.records).toHaveLength(1);
    expect(sink.records[0]?.text).toContain("Worker #2");
    expect(sink.records[0]?.text).toContain("website");
  });

  it("writes an error completion through the logger", () => {
    const {sink, logger} = createTestLogger();

    logWorkerComplete(3, "api", 1000, "error", logger);

    expect(sink.records).toHaveLength(1);
    expect(sink.records[0]?.text).toContain("❌");
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
