// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `status` subcommand.
 * @module scripts/commands/status/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation on the in-memory harness. The recording invoker is a
 * plain object implementing `CommandInvoker`, the legacy composition boundary; no module is mocked.
 */

import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import type {CommandInvoker, CommandPresentation} from "../../common/commander.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import {makeTestLayer} from "../../platform/testing.ts";
import type {StatusInput} from "../../status.ts";
import {makeStatusCommand} from "./cli.ts";

/** One recorded legacy invocation. */
interface RecordedCall {
  /** The decoded legacy input. */
  readonly input: Readonly<StatusInput>;
  /** The presentation the adapter requested. */
  readonly presentation: CommandPresentation | undefined;
}

/**
 * Runs `status` against `argv` with an invoker that records every invocation.
 *
 * @param argv - Arguments after the program name.
 * @returns The exit code and the recorded invocations.
 */
async function run(argv: readonly string[]): Promise<{code: CommandExitCode; calls: readonly RecordedCall[]}> {
  const calls: RecordedCall[] = [];
  const invoker: CommandInvoker<StatusInput, null> = {
    invoke: async (input, options) => {
      calls.push({input, presentation: options?.presentation});
      return {status: "completed", value: null, exitCode: 0};
    },
  };
  const harness = makeTestLayer();
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeStatusCommand(invoker)])).pipe(Effect.provide(harness.layer)));
  return {code: exitCodeFor(exit, undefined), calls};
}

describe("status command", () => {
  it("maps the global json flag", async () => {
    // Arrange
    const argv = ["status", "--json"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.calls).toEqual([{input: {json: true}, presentation: "json"}]);
  });

  it("defaults to human presentation", async () => {
    // Arrange
    const argv = ["status"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.calls).toEqual([{input: {json: false}, presentation: "human"}]);
  });
});
