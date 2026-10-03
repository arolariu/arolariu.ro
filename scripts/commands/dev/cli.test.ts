// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `dev` command group.
 * @module scripts/commands/dev/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation on the in-memory harness. The recording invokers are
 * plain objects implementing `CommandInvoker`, the legacy composition boundary; no module is mocked.
 */

import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import type {CommandInvoker} from "../../common/commander.ts";
import type {ContainerEngineInput, SelfhostInput} from "../../container-runtime/types.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import {makeTestLayer} from "../../platform/testing.ts";
import {makeDevCommand} from "./cli.ts";

/** Outcome of one `dev` invocation and the inputs each recording invoker received. */
interface DevRun {
  readonly code: CommandExitCode;
  readonly aspire: readonly Readonly<ContainerEngineInput>[];
  readonly selfhost: readonly Readonly<SelfhostInput>[];
}

/**
 * Builds an invoker that records every input it receives and completes with exit `0`.
 *
 * @param inputs - The list the inputs are appended to.
 * @returns The recording invoker.
 */
function recording<TInput>(inputs: Readonly<TInput>[]): CommandInvoker<TInput, null> {
  return {
    invoke: async (input) => {
      inputs.push(input);
      return {status: "completed", value: null, exitCode: 0};
    },
  };
}

/**
 * Runs `dev` against `argv` with recording invokers.
 *
 * @param argv - Arguments after the program name.
 * @returns The exit code and the recorded inputs.
 */
async function run(argv: readonly string[]): Promise<DevRun> {
  const aspire: Readonly<ContainerEngineInput>[] = [];
  const selfhost: Readonly<SelfhostInput>[] = [];
  const command = makeDevCommand({aspire: recording(aspire), selfhost: recording(selfhost)});
  const harness = makeTestLayer();
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([command])).pipe(Effect.provide(harness.layer)));
  return {code: exitCodeFor(exit, undefined), aspire, selfhost};
}

describe("dev command", () => {
  it("maps aspire engine", async () => {
    // Arrange
    const argv = ["dev", "aspire", "--engine", "rancher"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result).toEqual({code: 0, aspire: [{engine: "rancher"}], selfhost: []});
  });

  it("omits the aspire engine when absent", async () => {
    // Arrange
    const argv = ["dev", "aspire"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.aspire).toEqual([{}]);
    expect(result.aspire[0]).not.toHaveProperty("engine");
  });

  it("defaults selfhost to start", async () => {
    // Arrange
    const argv = ["dev", "selfhost"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.selfhost).toEqual([{action: "start"}]);
    expect(result.selfhost[0]).not.toHaveProperty("engine");
  });

  it("maps selfhost logs", async () => {
    // Arrange
    const argv = ["dev", "selfhost", "logs", "--engine", "podman"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result).toEqual({code: 0, aspire: [], selfhost: [{action: "logs", engine: "podman"}]});
  });

  it("rejects an unknown selfhost action", async () => {
    // Arrange
    const argv = ["dev", "selfhost", "restart"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result).toEqual({code: 2, aspire: [], selfhost: []});
  });
});
