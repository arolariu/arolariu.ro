// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `containers` command group.
 * @module scripts/commands/containers/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation on the in-memory harness. The recording invokers are
 * plain objects implementing `CommandInvoker`, the legacy composition boundary; no module is mocked.
 */

import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import type {CommandInvoker} from "../../common/commander.ts";
import type {ComposeInput, ImageInput} from "../../container-runtime/types.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import type {SinkRecord} from "../../platform/Output.ts";
import {makeTestLayer} from "../../platform/testing.ts";
import {makeContainersCommand} from "./cli.ts";

/** Outcome of one `containers` invocation and the inputs each recording invoker received. */
interface ContainersRun {
  readonly code: CommandExitCode;
  readonly image: readonly Readonly<ImageInput>[];
  readonly compose: readonly Readonly<ComposeInput>[];
  readonly output: readonly SinkRecord[];
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
 * Runs `containers` against `argv` with recording invokers.
 *
 * @param argv - Arguments after the program name.
 * @returns The exit code, the recorded inputs, and every sink record.
 */
async function run(argv: readonly string[]): Promise<ContainersRun> {
  const image: Readonly<ImageInput>[] = [];
  const compose: Readonly<ComposeInput>[] = [];
  const command = makeContainersCommand({image: recording(image), compose: recording(compose)});
  const harness = makeTestLayer();
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([command])).pipe(Effect.provide(harness.layer)));
  return {code: exitCodeFor(exit, undefined), image, compose, output: harness.output()};
}

describe("containers command", () => {
  it("requires a build target", async () => {
    // Arrange
    const argv = ["containers", "build"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.image).toEqual([]);
  });

  it("maps build target", async () => {
    // Arrange
    const argv = ["containers", "build", "--target", "cv"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.image).toEqual([{action: "build", target: "cv"}]);
    expect(result.image[0]).not.toHaveProperty("engine");
  });

  it("maps run target and engine", async () => {
    // Arrange
    const argv = ["containers", "run", "--target", "exp", "--engine", "podman"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.image).toEqual([{action: "run", target: "exp", engine: "podman"}]);
    expect(result.compose).toEqual([]);
  });

  it("rejects an unknown image target", async () => {
    // Arrange
    const argv = ["containers", "run", "--target", "mobile"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.image).toEqual([]);
  });

  it("forwards compose passthrough arguments verbatim", async () => {
    // Arrange
    const argv = ["containers", "compose", "--file", "x.yml", "--", "up", "-d", "--build"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.compose).toEqual([{file: "x.yml", passthrough: ["up", "-d", "--build"]}]);
  });

  it("requires a compose file", async () => {
    // Arrange
    const argv = ["containers", "compose", "--", "up"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.compose).toEqual([]);
  });

  it("rejects compose without passthrough arguments", async () => {
    // Arrange
    const argv = ["containers", "compose", "--file", "x.yml", "--engine", "rancher"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.compose).toEqual([]);
    expect(result.output).toEqual([{stream: "stderr", text: "[arolariu::compose] ⛔ Use --file <compose-file> -- <compose arguments>\n"}]);
  });
});
