// @vitest-environment node
/**
 * @fileoverview Controlled UTF-8 and redaction tests for the shared command runner.
 * @module scripts/common/process.controlled.test
 */

import {describe, expect, it} from "vitest";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./logger.ts";
import {defaultCommandRunner} from "./process.ts";

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
