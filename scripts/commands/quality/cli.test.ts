// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `format` and `lint` subcommands.
 * @module scripts/commands/quality/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation on the in-memory harness, whose scripted `Process`
 * replaces the child `node` process; no module is mocked.
 */

import {resolve} from "node:path";

import {Cause, Effect, Exit, Result} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli, type CliSubcommand} from "../../cli.ts";
import {exitCodeFor, ReportedFailure, type CommandExitCode} from "../../platform/exit.ts";
import type {SinkRecord} from "../../platform/Output.ts";
import {ProcessExited, ProcessSpawnFailed, type ProcessError} from "../../platform/Process.ts";
import {makeTestLayer, type RecordedProcessCall} from "../../platform/testing.ts";
import {makeQualityCommands} from "./cli.ts";

const scripts = {format: "/repo/scripts/format.ts", lint: "/repo/scripts/lint.ts"};
const executablePath = "/usr/bin/node";

/** Outcome of one quality invocation. */
interface QualityRun {
  readonly code: CommandExitCode;
  readonly failure: unknown;
  readonly calls: readonly RecordedProcessCall[];
  readonly output: readonly SinkRecord[];
}

/**
 * Runs the quality commands against `argv` with a scripted `node` process.
 *
 * @param argv - Arguments after the program name.
 * @param failure - The failure the scripted process responds with; omitted for a clean exit.
 * @param commands - The quality commands under test; defaults to commands over the fixture script paths.
 * @returns The exit code, the first typed failure, every process call, and every sink record.
 */
async function run(
  argv: readonly string[],
  failure?: ProcessError,
  commands: readonly [CliSubcommand, CliSubcommand] = makeQualityCommands(scripts),
): Promise<QualityRun> {
  const harness = makeTestLayer({
    environment: {executablePath},
    processes: [{match: (request) => request.command === executablePath, respond: failure ?? {stdout: "", stderr: "", durationMs: 1}}],
  });
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand(commands)).pipe(Effect.provide(harness.layer)));
  const error = Exit.isFailure(exit) ? Cause.findError(exit.cause) : undefined;
  return {
    code: exitCodeFor(exit, undefined),
    failure: error !== undefined && Result.isSuccess(error) ? error.success : undefined,
    calls: harness.processCalls(),
    output: harness.output(),
  };
}

describe("quality commands", () => {
  it("spawns format with target and patterns", async () => {
    // Arrange
    const argv = ["format", "website", "src/a.ts"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.calls).toEqual([
      {request: {command: executablePath, args: [scripts.format, "website", "src/a.ts"]}, options: {output: "inherit"}},
    ]);
    expect(result.calls[0]?.request.args.slice(-2)).toEqual(["website", "src/a.ts"]);
    expect(result.output).toEqual([]);
  });

  it("spawns lint with only the target when no pattern is given", async () => {
    // Arrange
    const argv = ["lint", "exp"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.calls).toEqual([{request: {command: executablePath, args: [scripts.lint, "exp"]}, options: {output: "inherit"}}]);
  });

  it("maps a lint failure to exit 1", async () => {
    // Arrange
    const argv = ["lint", "api"];
    const exited = new ProcessExited({
      command: `${executablePath} ${scripts.lint} api`,
      stdout: "",
      stderr: "",
      durationMs: 1,
      exitCode: 1,
      message: "lint exited",
    });

    // Act
    const result = await run(argv, exited);

    // Assert
    expect(result.code).toBe(1);
    expect(result.failure).toBeInstanceOf(ReportedFailure);
    expect(result.failure).toMatchObject({exitCode: 1, message: "lint failed with exit code 1"});
    expect(result.output).toEqual([]);
  });

  it("propagates a spawn failure as an unreported failure", async () => {
    // Arrange
    const argv = ["format", "all"];
    const spawnFailed = new ProcessSpawnFailed({
      command: `${executablePath} ${scripts.format} all`,
      stdout: "",
      stderr: "",
      durationMs: 0,
      reason: "ENOENT",
      message: "node failed to start",
    });

    // Act
    const result = await run(argv, spawnFailed);

    // Assert
    expect(result.code).toBe(1);
    expect(result.failure).toBe(spawnFailed);
    expect(result.output).toEqual([{stream: "stderr", text: "[arolariu::cli] ⛔ node failed to start\n"}]);
  });

  it("rejects an unknown target without spawning", async () => {
    // Arrange
    const argv = ["lint", "components"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.calls).toEqual([]);
  });

  it("defaults to the repository format and lint scripts", async () => {
    // Arrange
    const scriptsDirectory = resolve(import.meta.dirname, "..", "..");
    const commands = makeQualityCommands();

    // Act
    const format = await run(["format", "cv"], undefined, commands);
    const lint = await run(["lint", "cv"], undefined, commands);

    // Assert
    expect([format.code, lint.code]).toEqual([0, 0]);
    expect(format.calls[0]?.request.args).toEqual([resolve(scriptsDirectory, "format.ts"), "cv"]);
    expect(lint.calls[0]?.request.args).toEqual([resolve(scriptsDirectory, "lint.ts"), "cv"]);
  });
});
