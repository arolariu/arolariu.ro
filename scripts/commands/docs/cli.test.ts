// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `docs` command group.
 * @module scripts/commands/docs/cli.test
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
import {makeDocsCommand} from "./cli.ts";

/**
 * Runs `docs` against `argv` with an invoker that records every input it receives.
 *
 * @param argv - Arguments after the program name.
 * @returns The exit code, the recorded inputs, and the captured stdout.
 */
async function run(
  argv: readonly string[],
): Promise<{code: CommandExitCode; inputs: readonly Readonly<Record<never, never>>[]; stdout: string}> {
  const inputs: Readonly<Record<never, never>>[] = [];
  const invoker: CommandInvoker<Record<never, never>, null> = {
    invoke: async (input) => {
      inputs.push(input);
      return {status: "completed", value: null, exitCode: 0};
    },
  };
  const harness = makeTestLayer();
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeDocsCommand(invoker)])).pipe(Effect.provide(harness.layer)));
  const stdout = harness
    .output()
    .filter((record) => record.stream === "stdout")
    .map((record) => record.text)
    .join("");
  return {code: exitCodeFor(exit, undefined), inputs, stdout};
}

describe("docs command", () => {
  it("invokes assemble", async () => {
    // Arrange
    const argv = ["docs", "assemble"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.inputs).toEqual([{}]);
  });

  it("prints help without invoking when run without a subcommand", async () => {
    // Arrange
    const argv = ["docs"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.inputs).toEqual([]);
    expect(result.stdout).toContain("assemble");
  });
});
