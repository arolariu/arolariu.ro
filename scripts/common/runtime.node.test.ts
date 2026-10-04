// @vitest-environment node
/**
 * @fileoverview Tests for the Node.js-backed adapter kept for the frozen format/lint closure.
 * @module scripts/common/runtime.node.test
 */

import {describe, expect, it, vi} from "vitest";

import type {EnvironmentSnapshot} from "../platform/Environment.ts";
import {createNodeProcessRunner, nodeLoggerRuntimeHost, nodeProcessRunner, snapshotNodeEnvironment} from "./runtime.node.ts";

const REAL_SPAWN_TIMEOUT_MS = 45_000;
describe("createNodeProcessRunner / nodeProcessRunner", {timeout: REAL_SPAWN_TIMEOUT_MS}, () => {
  it("spawns a child observing exactly the supplied environment snapshot, not ambient process.env", async () => {
    const environment: EnvironmentSnapshot = {
      variables: {AROLARIU_RUNTIME_NODE_TEST: "from-snapshot"},
      cwd: process.cwd(),
      executablePath: process.execPath,
      platform: process.platform,
      architecture: process.arch,
      stdinIsTTY: false,
      stdoutIsTTY: false,
      isCI: false,
    };
    const runner = createNodeProcessRunner(environment);

    const outcome = await runner.run({
      command: process.execPath,
      args: ["-e", "process.stdout.write(String(process.env.AROLARIU_RUNTIME_NODE_TEST))"],
    });

    expect(outcome).toMatchObject({kind: "succeeded", exitCode: 0, stdout: "from-snapshot"});
  });

  it("nodeProcessRunner snapshots a fresh environment for each standalone run()", async () => {
    const previous = process.env["AROLARIU_RUNTIME_NODE_FACADE_TEST"];
    process.env["AROLARIU_RUNTIME_NODE_FACADE_TEST"] = "facade-value";

    try {
      const outcome = await nodeProcessRunner.run({
        command: process.execPath,
        args: ["-e", "process.stdout.write(String(process.env.AROLARIU_RUNTIME_NODE_FACADE_TEST))"],
      });

      expect(outcome).toMatchObject({kind: "succeeded", exitCode: 0, stdout: "facade-value"});
    } finally {
      if (previous === undefined) {
        delete process.env["AROLARIU_RUNTIME_NODE_FACADE_TEST"];
      } else {
        process.env["AROLARIU_RUNTIME_NODE_FACADE_TEST"] = previous;
      }
    }
  });
});

describe("snapshotNodeEnvironment", () => {
  it("captures the current process environment, platform, and architecture", () => {
    const snapshot = snapshotNodeEnvironment();

    expect(snapshot.platform).toBe(process.platform);
    expect(snapshot.architecture).toBe(process.arch);
    expect(snapshot.executablePath).toBe(process.execPath);
    expect(snapshot.cwd).toBe(process.cwd());
  });

  it("does not mutate the captured environment when process.env changes", () => {
    process.env["RUNTIME_SNAPSHOT_TEST"] = "before";
    const snapshot = snapshotNodeEnvironment();
    process.env["RUNTIME_SNAPSHOT_TEST"] = "after";

    expect(snapshot.variables["RUNTIME_SNAPSHOT_TEST"]).toBe("before");

    delete process.env["RUNTIME_SNAPSHOT_TEST"];
  });
});

describe("nodeLoggerRuntimeHost", () => {
  it("snapshots the terminal and color policy from the runtime environment", () => {
    const environment = snapshotNodeEnvironment();

    expect(nodeLoggerRuntimeHost.stdoutIsTTY).toBe(environment.stdoutIsTTY);
    expect(nodeLoggerRuntimeHost.noColor).toBe(Object.hasOwn(environment.variables, "NO_COLOR"));
  });

  it("keeps the snapshotted terminal and color inputs stable when ambient state changes later", () => {
    const snapshot = {stdoutIsTTY: nodeLoggerRuntimeHost.stdoutIsTTY, noColor: nodeLoggerRuntimeHost.noColor};
    const stdoutIsTTYDescriptor = Object.getOwnPropertyDescriptor(process.stdout, "isTTY");
    const hadNoColor = Object.hasOwn(process.env, "NO_COLOR");

    try {
      Object.defineProperty(process.stdout, "isTTY", {configurable: true, value: !snapshot.stdoutIsTTY});
      if (hadNoColor) {
        Reflect.deleteProperty(process.env, "NO_COLOR");
      } else {
        process.env["NO_COLOR"] = "1";
      }

      expect({stdoutIsTTY: nodeLoggerRuntimeHost.stdoutIsTTY, noColor: nodeLoggerRuntimeHost.noColor}).toEqual(snapshot);
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
      const interval = nodeLoggerRuntimeHost.scheduleInterval(() => {
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
    const countReferencedTimers = (): number =>
      process.getActiveResourcesInfo().filter((resource) => resource === "Timeout").length;
    const baseline = countReferencedTimers();
    const interval = nodeLoggerRuntimeHost.scheduleInterval(() => undefined, 80);

    try {
      expect(countReferencedTimers()).toBe(baseline + 1);
      interval.unref();
      expect(countReferencedTimers()).toBe(baseline);
    } finally {
      interval.cancel();
    }
  });
});
