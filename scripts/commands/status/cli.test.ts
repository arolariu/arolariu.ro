// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `status` subcommand.
 * @module scripts/commands/status/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation of the Effect status program on the in-memory harness
 * with a fake doctor program: the command has no input, so the global `--json` only selects the
 * presentation. No module is mocked.
 */

import {join} from "node:path";

import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import type {SinkRecord} from "../../platform/Output.ts";
import {makeTestLayer, repositoryFixtureRoot, scriptedOutcomes} from "../../platform/testing.ts";
import type {DoctorInput} from "../doctor/types.ts";
import {makeStatusCommand} from "./cli.ts";

/**
 * Runs `status` against `argv` with a fake doctor that records its inputs.
 *
 * @param argv - Arguments after the program name.
 * @returns The exit code, every sink record, every process request, and every doctor input.
 */
async function run(
  argv: readonly string[],
): Promise<{code: CommandExitCode; output: readonly SinkRecord[]; commands: readonly string[]; doctorInputs: readonly DoctorInput[]}> {
  const doctorInputs: DoctorInput[] = [];
  const harness = makeTestLayer({
    files: {[join(repositoryFixtureRoot, "package.json")]: JSON.stringify({name: "@arolariu/monorepo"})},
    inspection: {workspace: {kind: "unavailable", reason: "Inspection is stubbed in tests.", durationMs: 0}},
    processes: [scriptedOutcomes(() => ({kind: "spawn-failed", message: "not installed", stdout: "", stderr: "", durationMs: 0}))],
    environment: {executablePath: "/usr/bin/node"},
  });
  const command = makeStatusCommand((input) =>
    Effect.sync(() => {
      doctorInputs.push(input);
      return {score: 92, grade: "A", summary: {passed: 3, warnings: 1, failed: 0, skipped: 2}, checks: [], timestamp: ""};
    }),
  );
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([command])).pipe(Effect.provide(harness.layer)));
  return {
    code: exitCodeFor(exit, undefined),
    output: harness.output(),
    commands: harness.processCalls().map(({request}) => [request.command, ...request.args.filter((arg) => arg.length < 40)].join(" ")),
    doctorInputs,
  };
}

/** The unavailable document the stubbed harness produces. */
const UNAVAILABLE_DOCUMENT = {
  workspaces: null,
  nxEdges: null,
  git: null,
  security: null,
  disk: null,
  health: {score: 92, grade: "A", summary: {passed: 3, warnings: 1, failed: 0, skipped: 2}},
};

describe("status command", () => {
  it("maps the global json flag to exactly one JSON document and no human output", async () => {
    // Arrange
    const argv = ["status", "--json"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.output).toEqual([{stream: "stdout", text: `${JSON.stringify(UNAVAILABLE_DOCUMENT, null, 2)}\n`}]);
    expect(result.commands).not.toContain("/usr/bin/node --version");
    expect(result.doctorInputs).toEqual([{quick: true, verbose: false}]);
  });

  it("defaults to the human dashboard with the Node version probe", async () => {
    // Arrange
    const argv = ["status"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.output[0]).toEqual({stream: "stdout", text: "🏠 arolariu.ro monorepo status\n"});
    expect(result.output[1]).toEqual({stream: "stdout", text: "Branch: unavailable  │  Node: ?.x  │  Health: 92 (A)\n"});
    expect(result.output.some((record) => record.text.trimStart().startsWith("{"))).toBe(false);
    expect(result.commands).toContain("/usr/bin/node --version");
    expect(result.doctorInputs).toEqual([{quick: true, verbose: false}]);
  });
});
