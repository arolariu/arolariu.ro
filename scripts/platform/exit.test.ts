// @vitest-environment node
/**
 * @fileoverview Tests for the process exit-code mapping of Effect command exits.
 * @module scripts/platform/exit.test
 *
 * @remarks
 * Each case feeds {@link exitCodeFor} one exit shape (success, reported failure, CLI parse error,
 * terminal quit, typed failure, defect, or interruption with and without a termination signal)
 * and pins the resulting process exit code. CLI exits come from a real `Command.runWith` run.
 * {@link reportUsageFailure} is pinned in human and JSON mode on the in-memory harness.
 */

import {NodeServices} from "@effect/platform-node";
import {Cause, Effect, Exit, Terminal} from "effect";
import {Command} from "effect/cli";
import {describe, expect, it} from "vitest";

import {exitCodeFor, ReportedFailure, reportUsageFailure} from "./exit.ts";
import {makeTestLayer} from "./testing.ts";

/**
 * Runs a bare CLI command against the given argv and returns its exit.
 *
 * @param argv - Arguments passed to the command after the program name.
 * @returns The exit of the CLI run.
 */
async function runCli(argv: readonly string[]): Promise<Exit.Exit<void, unknown>> {
  const program = Command.runWith(Command.make("t"), {version: "0"})(argv);
  return Effect.runPromiseExit(program.pipe(Effect.provide(NodeServices.layer)));
}

describe("exitCodeFor", () => {
  it("maps success to 0", () => {
    // Arrange
    const exit = Exit.succeed(1);

    // Act
    const code = exitCodeFor(exit, undefined);

    // Assert
    expect(code).toBe(0);
  });

  it("maps a reported business failure to 1", () => {
    // Arrange
    const exit = Exit.fail(new ReportedFailure({exitCode: 1, message: "x"}));

    // Act
    const code = exitCodeFor(exit, undefined);

    // Assert
    expect(code).toBe(1);
  });

  it("maps a reported usage failure to 2", () => {
    // Arrange
    const exit = Exit.fail(new ReportedFailure({exitCode: 2, message: "x"}));

    // Act
    const code = exitCodeFor(exit, undefined);

    // Assert
    expect(code).toBe(2);
  });

  it("maps a CliError to 2", async () => {
    // Arrange
    const exit = await runCli(["--bogus"]);

    // Act
    const code = exitCodeFor(exit, undefined);

    // Assert
    expect(code).toBe(2);
  });

  it("maps --help to 0", async () => {
    // Arrange
    const exit = await runCli(["--help"]);

    // Act
    const code = exitCodeFor(exit, undefined);

    // Assert
    expect(code).toBe(0);
  });

  it("maps a QuitError to 130", () => {
    // Arrange
    const exit = Exit.fail(new Terminal.QuitError({}));

    // Act
    const code = exitCodeFor(exit, undefined);

    // Assert
    expect(code).toBe(130);
  });

  it("maps unknown failures to 1", () => {
    // Arrange
    const exit = Exit.fail(new Error("x"));

    // Act
    const code = exitCodeFor(exit, undefined);

    // Assert
    expect(code).toBe(1);
  });

  it("maps defects to 1", () => {
    // Arrange
    const exit = Exit.die("x");

    // Act
    const code = exitCodeFor(exit, undefined);

    // Assert
    expect(code).toBe(1);
  });

  it("maps interruption without a signal to 130", () => {
    // Arrange
    const exit = Exit.interrupt();

    // Act
    const code = exitCodeFor(exit, undefined);

    // Assert
    expect(code).toBe(130);
  });

  it("maps interruption after SIGINT to 130", () => {
    // Arrange
    const exit = Exit.interrupt();

    // Act
    const code = exitCodeFor(exit, "SIGINT");

    // Assert
    expect(code).toBe(130);
  });

  it("maps interruption after SIGTERM to 143", () => {
    // Arrange
    const exit = Exit.interrupt();

    // Act
    const code = exitCodeFor(exit, "SIGTERM");

    // Assert
    expect(code).toBe(143);
  });

  it("prefers the signal when finalizers also failed", () => {
    // Arrange
    const exit = Exit.failCause(Cause.combine(Cause.interrupt(), Cause.fail(new Error("cleanup"))));

    // Act
    const code = exitCodeFor(exit, "SIGTERM");

    // Assert
    expect(code).toBe(143);
  });
});

describe("reportUsageFailure", () => {
  it("writes the usage failure document and the message on stderr in --json mode", async () => {
    // Arrange
    const harness = makeTestLayer({mode: "json", context: "rates"});

    // Act
    const exit = await Effect.runPromiseExit(reportUsageFailure("--year must be >= 2018").pipe(Effect.provide(harness.layer)));

    // Assert
    expect(exitCodeFor(exit, undefined)).toBe(2);
    expect(harness.output()).toEqual([
      {
        stream: "stdout",
        text: `${JSON.stringify({status: "failed", kind: "usage", message: "--year must be >= 2018", evidence: []}, null, 2)}\n`,
      },
      {stream: "stderr", text: "--year must be >= 2018\n"},
    ]);
  });

  it("writes one fatal line and no document in human mode", async () => {
    // Arrange
    const harness = makeTestLayer({context: "rates"});

    // Act
    const exit = await Effect.runPromiseExit(reportUsageFailure("--year must be >= 2018").pipe(Effect.provide(harness.layer)));

    // Assert
    expect(Exit.isFailure(exit) && Cause.squash(exit.cause)).toEqual(new ReportedFailure({exitCode: 2, message: "--year must be >= 2018"}));
    expect(harness.output()).toEqual([{stream: "stderr", text: "[arolariu::rates] ⛔ --year must be >= 2018\n"}]);
  });
});