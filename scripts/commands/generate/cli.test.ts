// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `generate` subcommand.
 * @module scripts/commands/generate/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation on the in-memory harness. The recording invoker is a
 * plain object implementing `CommandInvoker`, the legacy composition boundary; no module is mocked.
 */

import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import type {CommandInvoker} from "../../common/commander.ts";
import type {GenerateInput} from "../../generate.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import {makeTestLayer} from "../../platform/testing.ts";
import {makeGenerateCommand} from "./cli.ts";

/**
 * Runs `generate` against `argv` with an invoker that records every input it receives.
 *
 * @param argv - Arguments after the program name.
 * @returns The exit code and the recorded inputs.
 */
async function run(argv: readonly string[]): Promise<{code: CommandExitCode; inputs: readonly Readonly<GenerateInput>[]}> {
  const inputs: Readonly<GenerateInput>[] = [];
  const invoker: CommandInvoker<GenerateInput, null> = {
    invoke: async (input) => {
      inputs.push(input);
      return {status: "completed", value: null, exitCode: 0};
    },
  };
  const harness = makeTestLayer();
  const exit = await Effect.runPromiseExit(
    runCli(argv, makeRootCommand([makeGenerateCommand(invoker)])).pipe(Effect.provide(harness.layer)),
  );
  return {code: exitCodeFor(exit, undefined), inputs};
}

describe("generate command", () => {
  it("maps generate task names regardless of order", async () => {
    // Arrange
    const argv = ["generate", "artifacts", "gql"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.inputs).toEqual([{verbose: false, env: false, i18n: false, gql: true, artifacts: true}]);
  });

  it("maps every task and the global verbose flag", async () => {
    // Arrange
    const argv = ["generate", "i18n", "env", "--verbose"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.inputs).toEqual([{verbose: true, env: true, i18n: true, gql: false, artifacts: false}]);
  });

  it("keeps the no-selection input", async () => {
    // Arrange
    const argv = ["generate"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.inputs).toEqual([{verbose: false, env: false, i18n: false, gql: false, artifacts: false}]);
  });

  it("rejects unknown tasks", async () => {
    // Arrange
    const argv = ["generate", "nope"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.inputs).toEqual([]);
  });
});
