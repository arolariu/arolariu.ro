// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `setup` subcommand.
 * @module scripts/commands/setup/cli.test
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
import type {SetupInput} from "../../setup.types.ts";
import {makeSetupCommand} from "./cli.ts";

/**
 * Runs `setup` against `argv` with an invoker that records every input it receives.
 *
 * @param argv - Arguments after the program name.
 * @returns The exit code and the recorded inputs.
 */
async function run(argv: readonly string[]): Promise<{code: CommandExitCode; inputs: readonly Readonly<SetupInput>[]}> {
  const inputs: Readonly<SetupInput>[] = [];
  const invoker: CommandInvoker<SetupInput, null> = {
    invoke: async (input) => {
      inputs.push(input);
      return {status: "completed", value: null, exitCode: 0};
    },
  };
  const harness = makeTestLayer();
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeSetupCommand(invoker)])).pipe(Effect.provide(harness.layer)));
  return {code: exitCodeFor(exit, undefined), inputs};
}

describe("setup command", () => {
  it("maps setup flags", async () => {
    // Arrange
    const argv = ["setup", "--dry-run", "--yes", "--engine", "podman", "--verbose"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.inputs).toEqual([{verbose: true, dryRun: true, yes: true, engine: "podman"}]);
  });

  it("omits engine when absent", async () => {
    // Arrange
    const argv = ["setup"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.inputs).toEqual([{verbose: false, dryRun: false, yes: false}]);
    expect(result.inputs[0]).not.toHaveProperty("engine");
  });

  it("rejects an unknown engine", async () => {
    // Arrange
    const argv = ["setup", "--engine", "docker"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.inputs).toEqual([]);
  });
});
