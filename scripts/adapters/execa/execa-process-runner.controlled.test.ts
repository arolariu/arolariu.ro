// @vitest-environment node
/**
 * @fileoverview Controlled cancellation, UTF-8, redaction, and stdin-selection tests for the
 * Execa-backed process runner adapter.
 * @module scripts/adapters/execa/execa-process-runner.controlled.test
 *
 * @remarks
 * These cases spy on `execa` itself, so they observe the exact options the adapter passes to the
 * engine and the exact chunk boundaries the engine hands back. No other suite can produce this
 * evidence.
 */

import {execa} from "execa";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {buildRecordingPresenter} from "../../testing/fixtures/terminal.fixture.ts";
import {ExecaProcessRunner} from "./execa-process-runner.ts";

vi.mock("execa", {spy: true});

const mockedExeca = vi.mocked(execa);

const defaultProcessRunner = new ExecaProcessRunner({
  baseEnvironment: process.env,
  platform: process.platform,
  monotonicNow: () => performance.now(),
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

const cancelledTeeScript = [
  "const stdoutBytes = Buffer.from('€');",
  "process.stdout.write(stdoutBytes.subarray(0, 1));",
  "setTimeout(() => process.stdout.write(stdoutBytes.subarray(1)), 5);",
  "setInterval(() => undefined, 10_000);",
].join("");

describe("controlled process lifecycle", () => {
  beforeEach(() => {
    mockedExeca.mockClear();
  });

  it("decodes split UTF-8 chunks independently for stdout and stderr while retaining capture", async () => {
    const {presenter, sink} = buildRecordingPresenter({context: "execa"});

    const result = await defaultProcessRunner.run({command: process.execPath, args: ["-e", splitUtf8Script]}, {presenter, output: "tee"});

    expect(result).toMatchObject({kind: "succeeded", exitCode: 0, stdout: "€", stderr: "漢"});
    expect(sink.records).toEqual([
      {stream: "stdout", text: "€", write: true},
      {stream: "stderr", text: "漢", write: true},
    ]);
  });

  it("redacts registered values split across arbitrary stdout and stderr chunks", async () => {
    const stdoutSecret = "stdout\nsplit-secret";
    const stderrSecret = "stderr-split-secret";
    const {presenter, sink} = buildRecordingPresenter({context: "execa"});
    presenter.redact(stdoutSecret);
    presenter.redact(stderrSecret);

    const result = await defaultProcessRunner.run(
      {command: process.execPath, args: ["-e", splitRedactionScript]},
      {presenter, output: "tee"},
    );

    expect(result).toMatchObject({kind: "succeeded", exitCode: 0, stdout: stdoutSecret, stderr: stderrSecret});
    expect(
      sink.records
        .filter(({stream}) => stream === "stdout")
        .map(({text}) => text)
        .join(""),
    ).toBe("[REDACTED]");
    expect(
      sink.records
        .filter(({stream}) => stream === "stderr")
        .map(({text}) => text)
        .join(""),
    ).toBe("[REDACTED]");
  });

  it("cancels a running child mid-run without corrupting the tee'd partial line", async () => {
    const {presenter, sink} = buildRecordingPresenter({context: "execa"});
    const controller = new AbortController();
    const cancellation = setTimeout(() => controller.abort(), 600);

    try {
      const result = await defaultProcessRunner.run(
        {command: process.execPath, args: ["-e", cancelledTeeScript]},
        {presenter, output: "tee", signal: controller.signal},
      );

      expect(result.kind).toBe("cancelled");
      if (result.kind !== "cancelled") {
        return;
      }

      expect(result.signal).toBe("SIGTERM");
      expect(result.durationMs).toBeLessThan(5_000);
      expect(sink.records.map(({text}) => text).join("")).toBe("€");
      expect(result.stdout).toBe("€");
    } finally {
      clearTimeout(cancellation);
    }
  });
});

describe("stdin selection by output mode", () => {
  beforeEach(() => {
    mockedExeca.mockClear();
  });

  it("inherits stdin from the parent process for inherited output", async () => {
    await defaultProcessRunner.run({command: process.execPath, args: ["-e", ""]}, {output: "inherit"});

    expect(mockedExeca).toHaveBeenCalledWith(process.execPath, ["-e", ""], expect.objectContaining({stdin: "inherit"}));
  });

  it("keeps stdin ignored for captured output when no input is supplied", async () => {
    await defaultProcessRunner.run({command: process.execPath, args: ["-e", "process.stdout.write('ready')"]});

    expect(mockedExeca).toHaveBeenCalledWith(
      process.execPath,
      ["-e", "process.stdout.write('ready')"],
      expect.objectContaining({stdin: "ignore"}),
    );
  });

  it("pipes stdin for captured output when input is supplied", async () => {
    await defaultProcessRunner.run({command: process.execPath, args: ["-e", "process.stdin.pipe(process.stdout)"]}, {input: "payload"});

    expect(mockedExeca).toHaveBeenCalledWith(
      process.execPath,
      ["-e", "process.stdin.pipe(process.stdout)"],
      expect.objectContaining({stdin: "pipe", input: "payload"}),
    );
  });
});
