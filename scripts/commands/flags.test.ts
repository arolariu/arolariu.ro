// @vitest-environment node
/**
 * @fileoverview Tests for the global CLI flags and the per-command output wrapper.
 * @module scripts/commands/flags.test
 *
 * @remarks
 * `withCommandOutput` and `EngineFlag` are exercised through a real `runCli` run of a small test
 * root, so the parsed flags reach them exactly as they do in production.
 */

import {Effect, Option} from "effect";
import {Command} from "effect/cli";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../cli.ts";
import {exitCodeFor, type CommandExitCode} from "../platform/exit.ts";
import type {SinkRecord} from "../platform/Output.ts";
import {makeTestLayer} from "../platform/testing.ts";
import {EngineFlag, engineInput, withCommandOutput} from "./flags.ts";

const engines: (readonly unknown[])[] = [];

const testRoot = makeRootCommand([
  Command.make("t", {}, () => Effect.logInfo("x").pipe(withCommandOutput("t"))),
  Command.make("d", {}, () => Effect.logDebug("dbg").pipe(withCommandOutput("d"))),
  Command.make("e", {engine: EngineFlag}, ({engine}) =>
    Effect.sync(() => {
      engines.push([Option.getOrUndefined(engine), engineInput(engine)]);
    }),
  ),
]);

/**
 * Runs the test root against `argv` with a fresh harness.
 *
 * @param argv - Arguments after the program name.
 * @returns The process exit code and every record the harness sink received.
 */
async function run(argv: readonly string[]): Promise<{readonly code: CommandExitCode; readonly output: readonly SinkRecord[]}> {
  const harness = makeTestLayer();
  const exit = await Effect.runPromiseExit(runCli(argv, testRoot).pipe(Effect.provide(harness.layer)));
  return {code: exitCodeFor(exit, undefined), output: harness.output()};
}

describe("withCommandOutput", () => {
  it("renders human output without --json", async () => {
    // Arrange
    const argv = ["t"];

    // Act
    const {code, output} = await run(argv);

    // Assert
    expect(code).toBe(0);
    expect(output).toEqual([{stream: "stdout", text: "[arolariu::t] ℹ️ x\n"}]);
  });

  it("suppresses human output with --json", async () => {
    // Arrange
    const argv = ["t", "--json"];

    // Act
    const {code, output} = await run(argv);

    // Assert
    expect(code).toBe(0);
    expect(output).toEqual([]);
  });

  it("emits debug output only with --verbose", async () => {
    // Arrange
    const quietArgv = ["d"];
    const verboseArgv = ["--verbose", "d"];

    // Act
    const quiet = await run(quietArgv);
    const verbose = await run(verboseArgv);

    // Assert
    expect(quiet).toEqual({code: 0, output: []});
    expect(verbose).toEqual({code: 0, output: [{stream: "stdout", text: "[arolariu::d] 🐛 dbg\n"}]});
  });
});

describe("EngineFlag", () => {
  it("parses an optional engine and rejects unknown engines", async () => {
    // Arrange
    engines.length = 0;

    // Act
    const omitted = await run(["e"]);
    const selected = await run(["e", "--engine", "podman"]);
    const rejected = await run(["e", "--engine", "docker"]);

    // Assert
    expect([omitted.code, selected.code, rejected.code]).toEqual([0, 0, 2]);
    expect(engines).toEqual([
      [undefined, {}],
      ["podman", {engine: "podman"}],
    ]);
  });
});

describe("engineInput", () => {
  it("omits the key for None", () => {
    // Arrange
    const engine = Option.none<"rancher" | "podman">();

    // Act
    const input = engineInput(engine);

    // Assert
    expect(Object.hasOwn(input, "engine")).toBe(false);
  });
});
