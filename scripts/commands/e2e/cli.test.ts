// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `test` command group.
 * @module scripts/commands/e2e/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation on the in-memory harness. The recording invoker is a
 * plain object implementing `CommandInvoker`, the legacy composition boundary; no module is mocked.
 */

import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import type {CommandInvoker} from "../../common/commander.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import {makeTestLayer} from "../../platform/testing.ts";
import type {E2EInput} from "../../test-e2e.ts";
import {makeE2eCommand} from "./cli.ts";

/**
 * Runs `test` against `argv` with an invoker that records every input it receives.
 *
 * @param argv - Arguments after the program name.
 * @returns The exit code and the recorded inputs.
 */
async function run(argv: readonly string[]): Promise<{code: CommandExitCode; inputs: readonly Readonly<E2EInput>[]}> {
  const inputs: Readonly<E2EInput>[] = [];
  const invoker: CommandInvoker<E2EInput, null> = {
    invoke: async (input) => {
      inputs.push(input);
      return {status: "completed", value: null, exitCode: 0};
    },
  };
  const harness = makeTestLayer();
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeE2eCommand(invoker)])).pipe(Effect.provide(harness.layer)));
  return {code: exitCodeFor(exit, undefined), inputs};
}

describe("test e2e command", () => {
  it("maps the target", async () => {
    // Arrange
    const argv = ["test", "e2e", "backend"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result).toEqual({code: 0, inputs: [{target: "backend"}]});
  });

  it("rejects an unknown target", async () => {
    // Arrange
    const argv = ["test", "e2e", "mobile"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result).toEqual({code: 2, inputs: []});
  });

  it("requires a target", async () => {
    // Arrange
    const argv = ["test", "e2e"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result).toEqual({code: 2, inputs: []});
  });
});
