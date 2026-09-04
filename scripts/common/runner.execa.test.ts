// @vitest-environment node
/**
 * @fileoverview Real-process tests for the Execa-backed process runner.
 * @module scripts/common/runner.execa.test
 */

import {resolve} from "node:path";
import {access, mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {describe, expect, it} from "vitest";

import {ComposedTerminalPresenter} from "../core/presentation/composed-terminal-presenter.ts";
import {RecordingTerminalPresenterSink} from "../testing/fixtures/terminal.fixture.ts";
import {ExecaProcessRunner} from "./runner.execa.ts";

const scriptsDirectory = resolve(process.cwd(), "scripts");

const defaultProcessRunner = new ExecaProcessRunner({
  baseEnvironment: process.env,
  platform: process.platform,
  monotonicNow: () => performance.now(),
});

/**
 * Explicit wall-clock budget for cases that spawn a real child process.
 *
 * @remarks
 * These cases exercise genuine Windows process creation, including the `cmd.exe`
 * fallback for an unresolved bare command name, which is dominated by OS
 * process-creation latency rather than by the code under test.
 */
const REAL_SPAWN_TIMEOUT_MS = 45_000;

describe("defaultProcessRunner", {timeout: REAL_SPAWN_TIMEOUT_MS}, () => {
  it("captures successful stdout with duration metadata", async () => {
    const outcome = await defaultProcessRunner.run({
      command: process.execPath,
      args: ["-e", "process.stdout.write('ready')"],
    });

    expect(outcome).toMatchObject({
      kind: "succeeded",
      exitCode: 0,
      stdout: "ready",
      stderr: "",
    });
    expect(outcome.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("preserves distinct stdout and stderr streams", async () => {
    const outcome = await defaultProcessRunner.run({
      command: process.execPath,
      args: ["-e", "process.stdout.write('out'); process.stderr.write('err')"],
    });

    expect(outcome).toMatchObject({
      kind: "succeeded",
      exitCode: 0,
      stdout: "out",
      stderr: "err",
    });
  });

  it("preserves trailing newlines in captured output", async () => {
    const outcome = await defaultProcessRunner.run({
      command: process.execPath,
      args: ["-e", "process.stdout.write('out\\n'); process.stderr.write('err\\n')"],
    });

    expect(outcome).toMatchObject({
      kind: "succeeded",
      exitCode: 0,
      stdout: "out\n",
      stderr: "err\n",
    });
  });

  it("preserves stdout and stderr from a nonzero process", async () => {
    const outcome = await defaultProcessRunner.run({
      command: process.execPath,
      args: ["-e", "process.stdout.write('json'); process.stderr.write('detail'); process.exit(7)"],
    });

    expect(outcome).toMatchObject({
      kind: "exited",
      exitCode: 7,
      stdout: "json",
      stderr: "detail",
    });
  });

  it("returns spawn failures without rejecting", async () => {
    const missingWorkingDirectory = resolve(tmpdir(), `process-runner-missing-cwd-${Date.now()}`);

    const outcome = await defaultProcessRunner.run(
      {command: process.execPath, args: ["-e", "1"]},
      {cwd: missingWorkingDirectory},
    );

    expect(outcome).toMatchObject({
      kind: "spawn-failed",
      stdout: "",
      stderr: "",
    });
    if (outcome.kind !== "spawn-failed") {
      return;
    }

    expect(outcome.message).toContain("ENOENT");
  });

  it("classifies an unresolved command name using Execa's own metadata instead of a custom PATH scanner", async () => {
    const command = "definitely-not-a-real-tool-xyzzy-12345";

    const outcome = await defaultProcessRunner.run({command, args: []});

    expect(outcome).toMatchObject({
      kind: "spawn-failed",
      stdout: "",
    });
    if (outcome.kind !== "spawn-failed") {
      return;
    }

    expect(outcome.message).toContain(command);
  });

  it("treats a resolved command that exits nonzero as an ordinary failure, including a Windows npm/cmd shim", async () => {
    const outcome = await defaultProcessRunner.run({
      command: "npm",
      args: ["run", "definitely-not-a-real-script-xyzzy-12345"],
    });

    expect(outcome.kind).toBe("exited");
    if (outcome.kind !== "exited") {
      return;
    }

    expect(outcome.exitCode).not.toBe(0);
  });

  it("times out and terminates a long-running command", async () => {
    const outcome = await defaultProcessRunner.run(
      {
        command: process.execPath,
        args: ["-e", "setInterval(() => undefined, 10_000)"],
      },
      {timeoutMs: 100},
    );

    expect(outcome).toMatchObject({kind: "timed-out", signal: "SIGTERM"});
    expect(outcome.durationMs).toBeLessThan(5_000);
  });

  it("supports cancellation without classifying it as a timeout", async () => {
    const controller = new AbortController();
    const cancellation = setTimeout(() => controller.abort(), 100);

    try {
      const outcome = await defaultProcessRunner.run(
        {
          command: process.execPath,
          args: ["-e", "setInterval(() => undefined, 10_000)"],
        },
        {signal: controller.signal},
      );

      expect(outcome).toMatchObject({kind: "cancelled", signal: "SIGTERM"});
      expect(outcome.durationMs).toBeLessThan(5_000);
    } finally {
      clearTimeout(cancellation);
    }
  });

  it("does not start a process for an already-aborted signal", async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), "process-runner-abort-"));
    const marker = resolve(temporaryRoot, "started.txt");
    const controller = new AbortController();
    controller.abort();

    try {
      const outcome = await defaultProcessRunner.run(
        {
          command: process.execPath,
          args: ["-e", `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "started")`],
        },
        {signal: controller.signal},
      );

      expect(outcome).toMatchObject({
        kind: "cancelled",
        stdout: "",
        stderr: "",
      });
      await expect(access(marker)).rejects.toMatchObject({code: "ENOENT"});
    } finally {
      await rm(temporaryRoot, {recursive: true, force: true});
    }
  });

  it.runIf(process.platform !== "win32")("classifies a child terminated only by its own signal", async () => {
    const outcome = await defaultProcessRunner.run({
      command: process.execPath,
      args: ["-e", "process.kill(process.pid, 'SIGTERM')"],
    });

    expect(outcome).toMatchObject({
      kind: "signalled",
      signal: "SIGTERM",
      stdout: "",
      stderr: "",
    });
  });

  it("merges environment overrides with the parent environment", async () => {
    const previous = process.env["COMMAND_RUNNER_PARENT_TEST"];
    process.env["COMMAND_RUNNER_PARENT_TEST"] = "parent";

    try {
      const outcome = await defaultProcessRunner.run(
        {
          command: process.execPath,
          args: ["-e", "process.stdout.write(`${process.env.COMMAND_RUNNER_PARENT_TEST}:${process.env.COMMAND_RUNNER_CHILD_TEST}`)"],
        },
        {env: {COMMAND_RUNNER_CHILD_TEST: "child"}},
      );

      expect(outcome).toMatchObject({
        kind: "succeeded",
        exitCode: 0,
        stdout: "parent:child",
      });
    } finally {
      if (previous === undefined) {
        delete process.env["COMMAND_RUNNER_PARENT_TEST"];
      } else {
        process.env["COMMAND_RUNNER_PARENT_TEST"] = previous;
      }
    }
  });

  it("removes an inherited parent environment variable when the override marks it undefined", async () => {
    const key = "COMMAND_RUNNER_REMOVED_TEST";
    const hadPreviousValue = Object.hasOwn(process.env, key);
    const previousValue = process.env[key];
    process.env[key] = "parent-sentinel";

    try {
      const outcome = await defaultProcessRunner.run(
        {
          command: process.execPath,
          args: ["-e", `process.stdout.write(Object.hasOwn(process.env, ${JSON.stringify(key)}) ? "present" : "absent")`],
        },
        {env: {[key]: undefined}},
      );

      expect(outcome).toMatchObject({
        kind: "succeeded",
        exitCode: 0,
        stdout: "absent",
      });
    } finally {
      if (hadPreviousValue) {
        process.env[key] = previousValue;
      } else {
        delete process.env[key];
      }
    }
  });

  it("uses the requested working directory", async () => {
    const outcome = await defaultProcessRunner.run(
      {
        command: process.execPath,
        args: ["-e", "process.stdout.write(process.cwd())"],
      },
      {cwd: scriptsDirectory},
    );

    expect(outcome).toMatchObject({
      kind: "succeeded",
      exitCode: 0,
    });
    expect(resolve(outcome.stdout)).toBe(resolve(scriptsDirectory));
  });

  it("delivers stdin without adding it to the formatted command log", async () => {
    const sink = new RecordingTerminalPresenterSink();
    const logger = new ComposedTerminalPresenter("runner-execa", {
      color: false,
      sink,
    });

    const outcome = await defaultProcessRunner.run(
      {
        command: process.execPath,
        args: ["-e", "process.stdin.pipe(process.stdout)"],
      },
      {
        input: '{"secret":"value"}',
        logger,
        logCommands: true,
      },
    );

    expect(outcome).toMatchObject({
      kind: "succeeded",
      exitCode: 0,
      stdout: '{"secret":"value"}',
    });
    expect(sink.records).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({text: expect.stringContaining("secret")}),
      ]),
    );
  });

  it("accepts Uint8Array stdin input", async () => {
    const outcome = await defaultProcessRunner.run(
      {
        command: process.execPath,
        args: ["-e", "process.stdin.pipe(process.stdout)"],
      },
      {input: new TextEncoder().encode("binary-input")},
    );

    expect(outcome).toMatchObject({
      kind: "succeeded",
      exitCode: 0,
      stdout: "binary-input",
    });
  });

  it("rejects stdin input with inherited stdio", async () => {
    expect(() =>
      defaultProcessRunner.run({command: process.execPath, args: ["-e", ""]}, {input: "payload", output: "inherit"}),
    ).toThrow("Cannot supply input when output is inherited");
  });

  it("tees child chunks through the supplied logger while retaining capture", async () => {
    const sink = new RecordingTerminalPresenterSink();
    const logger = new ComposedTerminalPresenter("runner-execa", {
      color: false,
      sink,
    });

    const outcome = await defaultProcessRunner.run(
      {
        command: process.execPath,
        args: ["-e", "process.stdout.write('out'); process.stderr.write('err')"],
      },
      {logger, output: "tee"},
    );

    expect(outcome).toMatchObject({
      kind: "succeeded",
      exitCode: 0,
      stdout: "out",
      stderr: "err",
    });
    expect(sink.records).toEqual(
      expect.arrayContaining([
        {stream: "stdout", text: "out", write: true},
        {stream: "stderr", text: "err", write: true},
      ]),
    );
  });

  it("returns empty captured streams for inherited output", async () => {
    const outcome = await defaultProcessRunner.run({command: process.execPath, args: ["-e", ""]}, {output: "inherit"});

    expect(outcome).toMatchObject({
      kind: "succeeded",
      exitCode: 0,
      stdout: "",
      stderr: "",
    });
  });
});
