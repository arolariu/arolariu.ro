// @vitest-environment node
/**
 * @fileoverview Controlled lifecycle tests for the shared command runner.
 * @module scripts/common/process.controlled.test
 */

import {EventEmitter} from "node:events";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

const {spawn} = vi.hoisted(() => ({
  spawn: vi.fn(),
}));

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return {
    ...actual,
    spawn,
  };
});

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./logger.ts";
import {defaultCommandRunner} from "./process.ts";

class ControlledChildProcess extends EventEmitter {
  public readonly stdout = new EventEmitter();
  public readonly stderr = new EventEmitter();
  public readonly stdin = null;
  public readonly kill = vi.fn((_signal?: NodeJS.Signals): boolean => true);
}

let child: ControlledChildProcess;

beforeEach(() => {
  child = new ControlledChildProcess();
  spawn.mockReturnValue(child);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("controlled command lifecycle", () => {
  it("decodes split UTF-8 chunks independently for stdout and stderr while retaining capture", async () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("process", {
      color: false,
      sink,
    });
    const stdoutBytes = Buffer.from("€");
    const stderrBytes = Buffer.from("漢");

    const execution = defaultCommandRunner.run({command: "controlled", args: []}, {logger, output: "tee"});
    child.stdout.emit("data", stdoutBytes.subarray(0, 1));
    child.stderr.emit("data", stderrBytes.subarray(0, 2));
    child.stdout.emit("data", stdoutBytes.subarray(1));
    child.stderr.emit("data", stderrBytes.subarray(2));
    child.emit("close", 0, null);

    await expect(execution).resolves.toMatchObject({
      code: 0,
      stdout: "€",
      stderr: "漢",
      timedOut: false,
    });
    expect(sink.records).toEqual([
      {stream: "stdout", text: "€", write: true},
      {stream: "stderr", text: "漢", write: true},
    ]);
  });

  it("escalates a timed-out child from SIGTERM to SIGKILL after one second", async () => {
    vi.useFakeTimers();

    const execution = defaultCommandRunner.run({command: "controlled", args: []}, {timeoutMs: 50});
    await vi.advanceTimersByTimeAsync(50);
    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(child.kill).toHaveBeenLastCalledWith("SIGTERM");

    await vi.advanceTimersByTimeAsync(999);
    expect(child.kill).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(child.kill).toHaveBeenCalledTimes(2);
    expect(child.kill).toHaveBeenLastCalledWith("SIGKILL");

    child.emit("close", null, "SIGKILL");
    await expect(execution).resolves.toMatchObject({
      code: 1,
      timedOut: true,
      signal: "SIGKILL",
    });
  });

  it("escalates an aborted child without classifying it as timed out", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();

    const execution = defaultCommandRunner.run({command: "controlled", args: []}, {signal: controller.signal});
    controller.abort();
    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(child.kill).toHaveBeenLastCalledWith("SIGTERM");

    await vi.advanceTimersByTimeAsync(1_000);
    expect(child.kill).toHaveBeenCalledTimes(2);
    expect(child.kill).toHaveBeenLastCalledWith("SIGKILL");

    child.emit("close", null, "SIGKILL");
    await expect(execution).resolves.toMatchObject({
      code: 1,
      timedOut: false,
      signal: "SIGKILL",
    });
  });

  it("clears timeout and escalation timers and removes the abort listener when the child closes", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const removeEventListener = vi.spyOn(controller.signal, "removeEventListener");

    const execution = defaultCommandRunner.run(
      {command: "controlled", args: []},
      {
        timeoutMs: 50,
        signal: controller.signal,
      },
    );
    await vi.advanceTimersByTimeAsync(50);
    expect(child.kill).toHaveBeenLastCalledWith("SIGTERM");
    expect(vi.getTimerCount()).toBe(1);

    child.emit("close", null, "SIGTERM");
    await expect(execution).resolves.toMatchObject({
      code: 1,
      timedOut: true,
      signal: "SIGTERM",
    });

    controller.abort();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(child.kill).toHaveBeenCalledTimes(1);
    expect(removeEventListener).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });
});
