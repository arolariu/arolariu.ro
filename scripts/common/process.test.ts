/**
 * @fileoverview Tests for the shared command runner.
 * @module scripts/common/process.test
 */

import {resolve} from "node:path";
import {access, mkdtemp, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {describe, expect, it} from "vitest";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./logger.ts";
import {defaultCommandRunner, formatCommand} from "./process.ts";

const scriptsDirectory = resolve(process.cwd(), "scripts");

describe("formatCommand", () => {
  it("quotes arguments containing whitespace", () => {
    expect(formatCommand({command: "tool", args: ["plain", "two words"]})).toBe('tool plain "two words"');
  });
});

describe("defaultCommandRunner", () => {
  it("captures successful stdout with duration metadata", async () => {
    const result = await defaultCommandRunner.run({
      command: process.execPath,
      args: ["-e", "process.stdout.write('ready')"],
    });

    expect(result).toMatchObject({
      code: 0,
      stdout: "ready",
      stderr: "",
      timedOut: false,
    });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("preserves distinct stdout and stderr streams", async () => {
    const result = await defaultCommandRunner.run({
      command: process.execPath,
      args: ["-e", "process.stdout.write('out'); process.stderr.write('err')"],
    });

    expect(result.stdout).toBe("out");
    expect(result.stderr).toBe("err");
  });

  it("preserves trailing newlines in captured output", async () => {
    const result = await defaultCommandRunner.run({
      command: process.execPath,
      args: ["-e", "process.stdout.write('out\\n'); process.stderr.write('err\\n')"],
    });

    expect(result.stdout).toBe("out\n");
    expect(result.stderr).toBe("err\n");
  });

  it("preserves stdout and stderr from a nonzero process", async () => {
    const result = await defaultCommandRunner.run({
      command: process.execPath,
      args: ["-e", "process.stdout.write('json'); process.stderr.write('detail'); process.exit(7)"],
    });

    expect(result).toMatchObject({
      code: 7,
      stdout: "json",
      stderr: "detail",
      timedOut: false,
    });
  });

  it("returns spawn errors without rejecting", async () => {
    const command = "definitely-not-a-real-tool-xyzzy-12345";

    const result = await defaultCommandRunner.run({command, args: []});

    expect(result).toMatchObject({
      code: 1,
      stdout: "",
      stderr: "",
      timedOut: false,
    });
    expect(result.spawnError).toContain(command);
  });

  it("times out and terminates a long-running command", async () => {
    const result = await defaultCommandRunner.run(
      {
        command: process.execPath,
        args: ["-e", "setInterval(() => undefined, 10_000)"],
      },
      {timeoutMs: 100},
    );

    expect(result.code).toBe(1);
    expect(result.timedOut).toBe(true);
    expect(result.signal).toBe("SIGTERM");
    expect(result.durationMs).toBeLessThan(5_000);
  });

  it("supports cancellation without classifying it as a timeout", async () => {
    const controller = new AbortController();
    const cancellation = setTimeout(() => controller.abort(), 100);

    try {
      const result = await defaultCommandRunner.run(
        {
          command: process.execPath,
          args: ["-e", "setInterval(() => undefined, 10_000)"],
        },
        {signal: controller.signal},
      );

      expect(result.code).toBe(1);
      expect(result.timedOut).toBe(false);
      expect(result.signal).toBe("SIGTERM");
      expect(result.durationMs).toBeLessThan(5_000);
    } finally {
      clearTimeout(cancellation);
    }
  });

  it("does not start a process for an already-aborted signal", async () => {
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), "command-runner-abort-"));
    const marker = resolve(temporaryRoot, "started.txt");
    const controller = new AbortController();
    controller.abort();

    try {
      const result = await defaultCommandRunner.run(
        {
          command: process.execPath,
          args: ["-e", `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "started")`],
        },
        {signal: controller.signal},
      );

      expect(result.code).toBe(1);
      await expect(access(marker)).rejects.toMatchObject({code: "ENOENT"});
    } finally {
      await rm(temporaryRoot, {recursive: true, force: true});
    }
  });

  it("merges environment overrides with the parent environment", async () => {
    const previous = process.env.COMMAND_RUNNER_PARENT_TEST;
    process.env.COMMAND_RUNNER_PARENT_TEST = "parent";

    try {
      const result = await defaultCommandRunner.run(
        {
          command: process.execPath,
          args: ["-e", "process.stdout.write(`${process.env.COMMAND_RUNNER_PARENT_TEST}:${process.env.COMMAND_RUNNER_CHILD_TEST}`)"],
        },
        {env: {COMMAND_RUNNER_CHILD_TEST: "child"}},
      );

      expect(result.stdout).toBe("parent:child");
    } finally {
      if (previous === undefined) {
        delete process.env.COMMAND_RUNNER_PARENT_TEST;
      } else {
        process.env.COMMAND_RUNNER_PARENT_TEST = previous;
      }
    }
  });

  it("uses the requested working directory", async () => {
    const result = await defaultCommandRunner.run(
      {
        command: process.execPath,
        args: ["-e", "process.stdout.write(process.cwd())"],
      },
      {cwd: scriptsDirectory},
    );

    expect(resolve(result.stdout)).toBe(resolve(scriptsDirectory));
  });

  it("delivers stdin without adding it to the formatted command", async () => {
    const command = {
      command: process.execPath,
      args: ["-e", "process.stdin.pipe(process.stdout)"],
    } as const;

    const result = await defaultCommandRunner.run(command, {
      input: '{"secret":"value"}',
    });

    expect(result.stdout).toBe('{"secret":"value"}');
    expect(formatCommand(command)).not.toContain("secret");
  });

  it("accepts Uint8Array stdin input", async () => {
    const result = await defaultCommandRunner.run(
      {
        command: process.execPath,
        args: ["-e", "process.stdin.pipe(process.stdout)"],
      },
      {input: new TextEncoder().encode("binary-input")},
    );

    expect(result.stdout).toBe("binary-input");
  });

  it("rejects stdin input with inherited stdio", async () => {
    await expect(
      defaultCommandRunner.run({command: process.execPath, args: ["-e", ""]}, {input: "payload", output: "inherit"}),
    ).rejects.toThrow("Cannot supply input when output is inherited");
  });

  it("tees child chunks through the supplied logger while retaining capture", async () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("process", {
      color: false,
      sink,
    });

    const result = await defaultCommandRunner.run(
      {
        command: process.execPath,
        args: ["-e", "process.stdout.write('out'); process.stderr.write('err')"],
      },
      {logger, output: "tee"},
    );

    expect(result.stdout).toBe("out");
    expect(result.stderr).toBe("err");
    expect(sink.records).toEqual(
      expect.arrayContaining([
        {stream: "stdout", text: "out", write: true},
        {stream: "stderr", text: "err", write: true},
      ]),
    );
  });

  it("returns empty captured streams for inherited output", async () => {
    const result = await defaultCommandRunner.run({command: process.execPath, args: ["-e", ""]}, {output: "inherit"});

    expect(result).toMatchObject({
      code: 0,
      stdout: "",
      stderr: "",
      timedOut: false,
    });
  });
});
