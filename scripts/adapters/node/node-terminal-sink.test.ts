// @vitest-environment node
/**
 * @fileoverview Focused tests for the Node terminal sink and its terminal policy host.
 * @module scripts.adapters.node.node-terminal-sink.test
 */

import {styleText} from "node:util";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {PresentationSemanticLevel} from "../../core/presentation/terminal-presenter.ts";
import {NodeTerminalPresenterSink, nodeTerminalPresenterRuntimeHost} from "./node-terminal-sink.ts";

function spyOnConsole(): Readonly<Record<"debug" | "info" | "warn" | "error" | "log", ReturnType<typeof vi.spyOn>>> {
  return {
    debug: vi.spyOn(console, "debug").mockImplementation(() => undefined),
    info: vi.spyOn(console, "info").mockImplementation(() => undefined),
    warn: vi.spyOn(console, "warn").mockImplementation(() => undefined),
    error: vi.spyOn(console, "error").mockImplementation(() => undefined),
    log: vi.spyOn(console, "log").mockImplementation(() => undefined),
  };
}

describe("NodeTerminalPresenterSink", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each<readonly [PresentationSemanticLevel, "debug" | "info" | "warn" | "error"]>([
    ["debug", "debug"],
    ["info", "info"],
    ["success", "info"],
    ["warn", "warn"],
    ["error", "error"],
  ])("routes the %s level to the %s console method", (level, method) => {
    const spies = spyOnConsole();

    new NodeTerminalPresenterSink().line("stdout", [{text: "message"}], level);

    expect(spies[method]).toHaveBeenCalledExactlyOnceWith("message");
    expect(spies.log).not.toHaveBeenCalled();
  });

  it("routes an unlevelled line to the console method of its stream and a raw write to its stream", () => {
    const spies = spyOnConsole();
    const stdoutWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderrWrite = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const sink = new NodeTerminalPresenterSink();

    sink.line("stdout", [{text: "stdout line"}]);
    sink.line("stderr", [{text: "stderr line"}]);
    sink.write("stdout", [{text: "stdout chunk"}]);
    sink.write("stderr", [{text: "stderr chunk"}]);

    expect(spies.log).toHaveBeenCalledExactlyOnceWith("stdout line");
    expect(spies.error).toHaveBeenCalledExactlyOnceWith("stderr line");
    expect(stdoutWrite).toHaveBeenCalledExactlyOnceWith("stdout chunk");
    expect(stderrWrite).toHaveBeenCalledExactlyOnceWith("stderr chunk");
  });

  it("styles a whole prefixed semantic line and leaves unstyled segments untouched", () => {
    const spies = spyOnConsole();
    const sink = new NodeTerminalPresenterSink();

    sink.line("stderr", [{text: "[arolariu::ctx] ⛔ failed", styles: ["red"]}], "error");
    sink.line("stdout", [{text: "Status: ", styles: ["dim"]}, {text: "ready"}]);

    expect(spies.error).toHaveBeenCalledExactlyOnceWith(styleText("red", "[arolariu::ctx] ⛔ failed", {validateStream: false}));
    expect(spies.log).toHaveBeenCalledExactlyOnceWith(`${styleText("dim", "Status: ", {validateStream: false})}ready`);
  });
});

describe("nodeTerminalPresenterRuntimeHost", () => {
  it("snapshots the terminal and colour policy and keeps it stable when ambient state changes later", () => {
    const snapshot = {stdoutIsTTY: nodeTerminalPresenterRuntimeHost.stdoutIsTTY, noColor: nodeTerminalPresenterRuntimeHost.noColor};
    expect(snapshot).toEqual({stdoutIsTTY: process.stdout.isTTY === true, noColor: Object.hasOwn(process.env, "NO_COLOR")});

    const stdoutIsTTYDescriptor = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
    const hadNoColor = Object.hasOwn(process.env, "NO_COLOR");
    try {
      Object.defineProperty(process.stdout, "isTTY", {configurable: true, value: !snapshot.stdoutIsTTY});
      if (hadNoColor) {
        Reflect.deleteProperty(process.env, "NO_COLOR");
      } else {
        process.env["NO_COLOR"] = "1";
      }

      expect({
        stdoutIsTTY: nodeTerminalPresenterRuntimeHost.stdoutIsTTY,
        noColor: nodeTerminalPresenterRuntimeHost.noColor,
      }).toEqual(snapshot);
    } finally {
      if (stdoutIsTTYDescriptor === undefined) {
        Reflect.deleteProperty(process.stdout, "isTTY");
      } else {
        Object.defineProperty(process.stdout, "isTTY", stdoutIsTTYDescriptor);
      }
      if (hadNoColor) {
        process.env["NO_COLOR"] = "1";
      } else {
        Reflect.deleteProperty(process.env, "NO_COLOR");
      }
    }
  });

  it("schedules and cancels a native interval behind the scheduled-interval handle", () => {
    vi.useFakeTimers();
    try {
      let ticks = 0;
      const interval = nodeTerminalPresenterRuntimeHost.scheduleInterval(() => {
        ticks += 1;
      }, 80);
      interval.unref();
      vi.advanceTimersByTime(160);
      interval.cancel();
      vi.advanceTimersByTime(160);

      expect(ticks).toBe(2);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("releases the event-loop hold of every scheduled interval it unreferences", () => {
    const countReferencedTimers = (): number => process.getActiveResourcesInfo().filter((resource) => resource === "Timeout").length;
    const baseline = countReferencedTimers();
    const interval = nodeTerminalPresenterRuntimeHost.scheduleInterval(() => undefined, 80);

    try {
      expect(countReferencedTimers()).toBe(baseline + 1);
      interval.unref();
      expect(countReferencedTimers()).toBe(baseline);
    } finally {
      interval.cancel();
    }
  });
});
