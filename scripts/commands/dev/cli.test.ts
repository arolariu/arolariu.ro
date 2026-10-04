// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `dev` command group.
 * @module scripts/commands/dev/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation on the in-memory harness. `dev aspire` runs the Effect
 * program over scripted processes (the repository `package.json` is seeded for engine selection);
 * `dev selfhost` still runs a legacy invoker, so its cases pass a recording invoker, a plain object
 * implementing `CommandInvoker`, the legacy composition boundary. No module is mocked.
 */

import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import type {CommandInvoker} from "../../common/commander.ts";
import type {SelfhostInput} from "../../container-runtime/types.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import {makeTestLayer, type RecordedProcessCall} from "../../platform/testing.ts";
import {makeDevCommand} from "./cli.ts";

/** Outcome of one `dev` invocation, its process calls, and the inputs the selfhost invoker received. */
interface DevRun {
  readonly code: CommandExitCode;
  readonly calls: readonly RecordedProcessCall[];
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
 * Runs `dev` against `argv`; every process succeeds with no output.
 *
 * @param argv - Arguments after the program name.
 * @param variables - Environment variables of the harness.
 * @returns The exit code, the recorded process calls, and the recorded selfhost inputs.
 */
async function run(argv: readonly string[], variables: Readonly<Record<string, string>> = {}): Promise<DevRun> {
  const selfhost: Readonly<SelfhostInput>[] = [];
  const command = makeDevCommand({selfhost: recording(selfhost)});
  const harness = makeTestLayer({
    files: {"package.json": JSON.stringify({name: "@arolariu/monorepo"})},
    environment: {variables},
    processes: [{match: () => true, respond: {stdout: "", stderr: "", durationMs: 0}}],
  });
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([command])).pipe(Effect.provide(harness.layer)));
  return {code: exitCodeFor(exit, undefined), calls: harness.processCalls(), selfhost};
}

describe("dev command", () => {
  it("maps aspire engine", async () => {
    // Arrange
    const argv = ["dev", "aspire", "--engine", "rancher"];

    // Act
    const result = await run(argv, {AROLARIU_CONTAINER_ENGINE: "podman"});

    // Assert
    expect(result.code).toBe(0);
    expect(result.calls[0]?.request).toEqual({command: "docker", args: ["--version"]});
    expect(result.calls.at(-1)?.request).toEqual({command: "dotnet", args: ["run", "--project", "tooling/AppHost"]});
    expect(result.calls.at(-1)?.options.env?.["DOTNET_ASPIRE_CONTAINER_RUNTIME"]).toBe("docker");
    expect(result.selfhost).toEqual([]);
  });

  it("omits the aspire engine when absent, so the environment selects it", async () => {
    // Arrange
    const argv = ["dev", "aspire"];

    // Act
    const result = await run(argv, {AROLARIU_CONTAINER_ENGINE: "podman"});

    // Assert
    expect(result.code).toBe(0);
    expect(result.calls[0]?.request).toEqual({command: "podman", args: ["--version"]});
    expect(result.calls.at(-1)?.options.env?.["DOTNET_ASPIRE_CONTAINER_RUNTIME"]).toBe("podman");
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
    expect(result.calls).toEqual([]);
  });

  it("maps selfhost logs", async () => {
    // Arrange
    const argv = ["dev", "selfhost", "logs", "--engine", "podman"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result).toEqual({code: 0, calls: [], selfhost: [{action: "logs", engine: "podman"}]});
  });

  it("rejects an unknown selfhost action", async () => {
    // Arrange
    const argv = ["dev", "selfhost", "restart"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result).toEqual({code: 2, calls: [], selfhost: []});
  });
});
