// @vitest-environment node
/**
 * @fileoverview Controlled UTF-8 and redaction tests for the shared command runner.
 * @module scripts/common/process.controlled.test
 */

import {beforeEach, describe, expect, it, vi} from "vitest";
import {execa} from "execa";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./logger.ts";
import {defaultCommandRunner} from "./process.ts";

vi.mock("execa", async (importOriginal) => {
  const actual = await importOriginal<typeof import("execa")>();
  return {...actual, execa: vi.fn()};
});

const splitUtf8Script = [
  "const stdoutBytes = Buffer.from('€');",
  "const stderrBytes = Buffer.from('漢');",
  "process.stdout.write(stdoutBytes.subarray(0, 1));",
  "process.stderr.write(stderrBytes.subarray(0, 2));",
  "setTimeout(() => {",
  "  process.stdout.write(stdoutBytes.subarray(1));",
  "  process.stderr.write(stderrBytes.subarray(2));",
  "}, 5);",
  "setTimeout(() => process.exit(0), 15);",
].join("");

const splitRedactionScript = [
  "process.stdout.write(Buffer.from('stdout\\nsplit-'));",
  "process.stderr.write(Buffer.from('stderr-split-'));",
  "setTimeout(() => {",
  "  process.stdout.write(Buffer.from('secret'));",
  "  process.stderr.write(Buffer.from('secret'));",
  "}, 5);",
  "setTimeout(() => process.exit(0), 15);",
].join("");

describe("controlled command lifecycle", () => {
  beforeEach(async () => {
    const actual = await vi.importActual<typeof import("execa")>("execa");
    vi.mocked(execa).mockImplementation(actual.execa);
  });

  it("decodes split UTF-8 chunks independently for stdout and stderr while retaining capture", async () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("process", {
      color: false,
      sink,
    });

    const result = await defaultCommandRunner.run(
      {command: process.execPath, args: ["-e", splitUtf8Script]},
      {logger, output: "tee"},
    );

    expect(result).toMatchObject({
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

  it("redacts registered values split across arbitrary stdout and stderr chunks", async () => {
    const stdoutSecret = "stdout\nsplit-secret";
    const stderrSecret = "stderr-split-secret";
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("process", {
      color: false,
      sink,
      redactions: [stdoutSecret, stderrSecret],
    });

    const result = await defaultCommandRunner.run(
      {command: process.execPath, args: ["-e", splitRedactionScript]},
      {logger, output: "tee"},
    );

    expect(result).toMatchObject({
      stdout: stdoutSecret,
      stderr: stderrSecret,
    });
    expect(sink.records.filter(({stream}) => stream === "stdout").map(({text}) => text).join("")).toBe("[REDACTED]");
    expect(sink.records.filter(({stream}) => stream === "stderr").map(({text}) => text).join("")).toBe("[REDACTED]");
  });
});

describe("stdin selection by output mode", () => {
  beforeEach(async () => {
    const actual = await vi.importActual<typeof import("execa")>("execa");
    vi.mocked(execa).mockImplementation(actual.execa);
  });

  it("inherits stdin from the parent process for inherited output", async () => {
    await defaultCommandRunner.run({command: process.execPath, args: ["-e", ""]}, {output: "inherit"});

    expect(vi.mocked(execa)).toHaveBeenCalledWith(
      process.execPath,
      ["-e", ""],
      expect.objectContaining({stdin: "inherit"}),
    );
  });

  it("keeps stdin ignored for captured output when no input is supplied", async () => {
    await defaultCommandRunner.run({
      command: process.execPath,
      args: ["-e", "process.stdout.write('ready')"],
    });

    expect(vi.mocked(execa)).toHaveBeenCalledWith(
      process.execPath,
      ["-e", "process.stdout.write('ready')"],
      expect.objectContaining({stdin: "ignore"}),
    );
  });

  it("pipes stdin for captured output when input is supplied", async () => {
    await defaultCommandRunner.run(
      {command: process.execPath, args: ["-e", "process.stdin.pipe(process.stdout)"]},
      {input: "payload"},
    );

    expect(vi.mocked(execa)).toHaveBeenCalledWith(
      process.execPath,
      ["-e", "process.stdin.pipe(process.stdout)"],
      expect.objectContaining({stdin: "pipe", input: "payload"}),
    );
  });
});
