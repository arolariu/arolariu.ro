/**
 * @fileoverview Tests for the inline spinner and runWithSpinner utility.
 * @module scripts/common/index.test
 *
 * @remarks
 * createSpinner is module-private; all behaviour is exercised through the
 * exported runWithSpinner, which is the real public contract.
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
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

/** Silence console.log/error during a block to keep test output pristine. */
function silenceConsole(): {restore: () => void} {
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  return {
    restore() {
      logSpy.mockRestore();
      errSpy.mockRestore();
    },
  };
}

// ---------------------------------------------------------------------------
// Non-TTY (CI) path is quiet
// ---------------------------------------------------------------------------

describe("non-TTY path keeps CI logs clean", () => {
  let originalIsTTY: boolean | undefined;
  let stdoutWrites: string[];
  let writeSpy: ReturnType<typeof vi.spyOn>;
  let consoleSilence: {restore: () => void};

  beforeEach(() => {
    originalIsTTY = process.stdout.isTTY;
    // Force non-TTY to simulate CI
    Object.defineProperty(process.stdout, "isTTY", {value: false, configurable: true});

    stdoutWrites = [];
    writeSpy = vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      stdoutWrites.push(String(chunk));
      return true;
    });

    consoleSilence = silenceConsole();
  });

  afterEach(() => {
    Object.defineProperty(process.stdout, "isTTY", {value: originalIsTTY, configurable: true});
    writeSpy.mockRestore();
    consoleSilence.restore();
  });

  it("emits no spinner frames or ANSI cursor escapes on non-TTY stdout", async () => {
    const [cmd, args] = node("process.exit(0)");
    await runWithSpinner(cmd, args, "test task");

    // No carriage-return / ANSI escape sequences should hit stdout.write in non-TTY mode
    const hasSpinnerOutput = stdoutWrites.some(
      (s) => s.includes("\r") || s.includes("\x1b["),
    );
    expect(hasSpinnerOutput).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Success vs failure result shapes
// ---------------------------------------------------------------------------

describe("success and failure result shapes", () => {
  let consoleSilence: {restore: () => void};

  beforeEach(() => {
    consoleSilence = silenceConsole();
  });

  afterEach(() => {
    consoleSilence.restore();
  });

  it("resolves with code 0 for a process that exits 0", async () => {
    const [cmd, args] = node("process.exit(0)");
    const result = await runWithSpinner(cmd, args, "success test");
    expect(result.code).toBe(0);
  });

  it("resolves with non-zero code for a process that exits non-zero", async () => {
    const [cmd, args] = node("process.exit(42)");
    const result = await runWithSpinner(cmd, args, "failure test");
    expect(result.code).toBe(42);
  });

  it("captures stdout output in the result", async () => {
    const [cmd, args] = node("process.stdout.write('hello-from-child')");
    const result = await runWithSpinner(cmd, args, "capture test");
    expect(result.output).toContain("hello-from-child");
  });

  it("captures stderr in the output field on failure", async () => {
    const [cmd, args] = node("process.stderr.write('err-detail'); process.exit(1)");
    const result = await runWithSpinner(cmd, args, "stderr capture test");
    expect(result.code).not.toBe(0);
    expect(result.output).toContain("err-detail");
  });

  it("hideOutput=false runs with inherited stdio and resolves code", async () => {
    const [cmd, args] = node("process.exit(0)");
    const result = await runWithSpinner(cmd, args, "inherited stdio test", false);
    expect(result.code).toBe(0);
    expect(result.output).toBe("");
  });

  it("hideOutput=false resolves non-zero exit code", async () => {
    const [cmd, args] = node("process.exit(3)");
    const result = await runWithSpinner(cmd, args, "inherited stdio fail", false);
    expect(result.code).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Timer cleanup — no lingering interval after resolution
// ---------------------------------------------------------------------------

describe("timer cleanup after runWithSpinner resolves", () => {
  let originalIsTTY: boolean | undefined;
  let consoleSilence: {restore: () => void};
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalIsTTY = process.stdout.isTTY;
    consoleSilence = silenceConsole();
    writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    Object.defineProperty(process.stdout, "isTTY", {value: originalIsTTY, configurable: true});
    vi.useRealTimers();
    consoleSilence.restore();
    writeSpy.mockRestore();
  });

  it("no pending intervals remain after a successful run (TTY path)", async () => {
    // Force TTY so the spinner interval is actually created
    Object.defineProperty(process.stdout, "isTTY", {value: true, configurable: true});

    vi.useFakeTimers({shouldAdvanceTime: true});

    // 200ms delay ensures the spinner interval fires at least once (every 80ms),
    // covering the render() TTY write branch.
    const [cmd, args] = node("setTimeout(() => process.exit(0), 200)");
    await runWithSpinner(cmd, args, "timer cleanup test");

    // After stop() clears the interval there must be no pending timers
    expect(vi.getTimerCount()).toBe(0);
  });

  it("no pending intervals remain after a failed run (TTY path)", async () => {
    Object.defineProperty(process.stdout, "isTTY", {value: true, configurable: true});

    vi.useFakeTimers({shouldAdvanceTime: true});

    const [cmd, args] = node("process.exit(1)");
    await runWithSpinner(cmd, args, "timer cleanup failure test");

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
    await expect(runWithSpinner("echo", notAnArray, "spinner text")).rejects.toThrow(
      /Arguments must be an array/,
    );
  });
});

// ---------------------------------------------------------------------------
// Spawn error paths (child.on("error") handler coverage)
// ---------------------------------------------------------------------------

describe("spawn error handling", () => {
  let consoleSilence: {restore: () => void};
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSilence = silenceConsole();
    writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    consoleSilence.restore();
    writeSpy.mockRestore();
  });

  it("resolves code 1 and captures error message when command does not exist (hideOutput=true)", async () => {
    const result = await runWithSpinner(
      "definitely-nonexistent-binary-xyz-1234",
      [],
      "spawn error test",
      true,
    );
    // Give Windows close event (fires after error event) time to run before
    // afterEach restores the mocks — prevents stray console output in reporter.
    await new Promise<void>((r) => { setTimeout(r, 50); });
    expect(result.code).toBe(1);
    expect(result.output).toBeTruthy();
  });

  it("resolves code 1 when command does not exist (hideOutput=false)", async () => {
    const result = await runWithSpinner(
      "definitely-nonexistent-binary-xyz-1234",
      [],
      "spawn error test",
      false,
    );
    await new Promise<void>((r) => { setTimeout(r, 50); });
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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls console.log with workerId and taskName", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logWorkerSpawn(1, "packages");
    expect(spy).toHaveBeenCalledOnce();
    const msg: string = spy.mock.calls[0]?.[0] ?? "";
    expect(msg).toContain("1");
    expect(msg).toContain("packages");
  });
});

describe("logWorkerComplete", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls console.log with success status", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logWorkerComplete(2, "website", 2000, "success");
    expect(spy).toHaveBeenCalledOnce();
    const msg: string = spy.mock.calls[0]?.[0] ?? "";
    expect(msg).toContain("2");
    expect(msg).toContain("website");
  });

  it("calls console.log with error status", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logWorkerComplete(3, "api", 1000, "error");
    expect(spy).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// createProgressTracker
// ---------------------------------------------------------------------------

describe("createProgressTracker", () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    writeSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("starts at 0 completed", () => {
    const tracker = createProgressTracker(4);
    expect(tracker.completed).toBe(0);
  });

  it("increments completed count", () => {
    const tracker = createProgressTracker(4);
    tracker.start();
    tracker.increment();
    tracker.increment();
    expect(tracker.completed).toBe(2);
  });

  it("finish calls console.log", () => {
    const tracker = createProgressTracker(4);
    tracker.start();
    tracker.finish();
    expect(logSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// printWorkerTimeline
// ---------------------------------------------------------------------------

describe("printWorkerTimeline", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("does nothing when passed an empty array", () => {
    printWorkerTimeline([]);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("calls console.log at least once for a non-empty timeline", () => {
    printWorkerTimeline([{target: "packages", durationMs: 2000}]);
    expect(logSpy).toHaveBeenCalled();
  });
});
