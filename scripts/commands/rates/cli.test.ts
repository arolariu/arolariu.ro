// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `rates` command group.
 * @module scripts/commands/rates/cli.test
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
import type {ExchangeRateInput} from "./update.ts";
import {makeRatesCommand} from "./cli.ts";

/**
 * Runs `rates` against `argv` with an invoker that records every input it receives.
 *
 * @param argv - Arguments after the program name.
 * @returns The exit code, the recorded inputs, and the captured stderr.
 */
async function run(
  argv: readonly string[],
): Promise<{code: CommandExitCode; inputs: readonly Readonly<ExchangeRateInput>[]; stderr: string}> {
  const inputs: Readonly<ExchangeRateInput>[] = [];
  const invoker: CommandInvoker<ExchangeRateInput, null> = {
    invoke: async (input) => {
      inputs.push(input);
      return {status: "completed", value: null, exitCode: 0};
    },
  };
  const harness = makeTestLayer();
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeRatesCommand(invoker)])).pipe(Effect.provide(harness.layer)));
  const stderr = harness
    .output()
    .filter((record) => record.stream === "stderr")
    .map((record) => record.text)
    .join("");
  return {code: exitCodeFor(exit, undefined), inputs, stderr};
}

describe("rates command", () => {
  it("maps a single year", async () => {
    // Arrange
    const argv = ["rates", "update", "--year", "2024"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.inputs).toEqual([{fromYear: 2024, toYear: 2024}]);
  });

  it("maps an explicit range", async () => {
    // Arrange
    const argv = ["rates", "update", "--from", "2020", "--to", "2022"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.inputs).toEqual([{fromYear: 2020, toYear: 2022}]);
  });

  it("exits 2 with the legacy message for an invalid year", async () => {
    // Arrange
    const argv = ["rates", "update", "--year", "abc"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.inputs).toEqual([]);
    expect(result.stderr).toContain('--year must be an integer, got: "abc"');
  });
});
