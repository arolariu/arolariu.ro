// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `doctor` subcommand.
 * @module scripts/commands/doctor/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation on the in-memory harness. The recording invoker is a
 * plain object implementing `CommandInvoker`, the legacy composition boundary; no module is mocked.
 */

import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import type {CommandInvoker} from "../../common/commander.ts";
import type {DoctorInput} from "../../doctor.types.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import {makeTestLayer} from "../../platform/testing.ts";
import {makeDoctorCommand} from "./cli.ts";

/**
 * Runs `doctor` against `argv` with an invoker that records every input it receives.
 *
 * @param argv - Arguments after the program name.
 * @returns The exit code and the recorded inputs.
 */
async function run(argv: readonly string[]): Promise<{code: CommandExitCode; inputs: readonly Readonly<DoctorInput>[]}> {
  const inputs: Readonly<DoctorInput>[] = [];
  const invoker: CommandInvoker<DoctorInput, null> = {
    invoke: async (input) => {
      inputs.push(input);
      return {status: "completed", value: null, exitCode: 0};
    },
  };
  const harness = makeTestLayer();
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeDoctorCommand(invoker)])).pipe(Effect.provide(harness.layer)));
  return {code: exitCodeFor(exit, undefined), inputs};
}

describe("doctor command", () => {
  it("maps quick and verbose", async () => {
    // Arrange
    const argv = ["doctor", "--quick", "--verbose"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.inputs).toEqual([{quick: true, verbose: true}]);
  });

  it("defaults quick and verbose to false", async () => {
    // Arrange
    const argv = ["doctor"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.inputs).toEqual([{quick: false, verbose: false}]);
  });
});
