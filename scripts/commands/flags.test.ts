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
import {Argument, Command} from "effect/cli";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../cli.ts";
import {exitCodeFor, type CommandExitCode} from "../platform/exit.ts";
import type {SinkRecord} from "../platform/Output.ts";
import {makeTestLayer} from "../platform/testing.ts";
import {EngineFlag, engineInput, JsonFlag, requestsJsonOutput, withCommandOutput} from "./flags.ts";

const engines: (readonly unknown[])[] = [];
const parsedJson: boolean[] = [];

const testRoot = makeRootCommand([
  Command.make("t", {}, () => Effect.logInfo("x").pipe(withCommandOutput("t"))),
  Command.make("d", {}, () => Effect.logDebug("dbg").pipe(withCommandOutput("d"))),
  Command.make("e", {engine: EngineFlag}, ({engine}) =>
    Effect.sync(() => {
      engines.push([Option.getOrUndefined(engine), engineInput(engine)]);
    }),
  ),
  Command.make("j", {rest: Argument.String("rest").pipe(Argument.variadic())}, () =>
    Effect.gen(function* () {
      parsedJson.push(yield* JsonFlag);
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

describe("requestsJsonOutput", () => {
  it.each([
    [[], false],
    [["--json"], true],
    [["--json=true"], true],
    [["--json=yes"], true],
    [["--json=1"], true],
    [["--json=false"], false],
    [["--json=off"], false],
    [["--json", "true"], true],
    [["--json", "false"], false],
    [["--json", "n"], false],
    [["--no-json"], false],
    [["--json", "--no-json"], true],
    [["--no-json", "--json"], false],
    [["--json=false", "--json"], false],
    [["value", "--json"], true],
    [["--json", "--", "x"], true],
    [["--", "--json"], false],
    [["value", "--", "--json=true"], false],
  ] as const)("matches the effect/cli parse of j %j", async (flags, expected) => {
    // Arrange
    const argv = ["j", ...flags];
    parsedJson.length = 0;

    // Act
    const detected = requestsJsonOutput(argv);
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(parsedJson).toEqual([expected]);
    expect(detected).toBe(expected);
  });

  it("treats an invalid inline value, which effect/cli rejects, as not requested", async () => {
    // Act
    const detected = requestsJsonOutput(["j", "--json=maybe"]);
    const result = await run(["j", "--json=maybe"]);

    // Assert
    expect(detected).toBe(false);
    expect(result.code).toBe(2);
  });
});

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
