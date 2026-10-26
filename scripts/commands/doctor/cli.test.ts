// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `doctor` subcommand.
 * @module scripts/commands/doctor/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation of the Effect doctor on the in-memory harness: every
 * inspection fact is unavailable, every process succeeds with empty output, and HTTP is scripted
 * (an unscripted request dies). No module is mocked.
 */

import {join} from "node:path";

import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import type {InspectionOutcome} from "../../inspection/types.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import type {SinkRecord} from "../../platform/Output.ts";
import {makeTestLayer, repositoryFixtureRoot, scriptedOutcomes, type TestHarness} from "../../platform/testing.ts";
import {makeDoctorCommand} from "./cli.ts";

const STUBBED: InspectionOutcome<never> = {kind: "unavailable", reason: "Inspection is stubbed in tests.", durationMs: 0};

/**
 * Runs `doctor` against `argv` on a fresh harness.
 *
 * @param argv - Arguments after the program name.
 * @returns The exit code, the harness, and every sink record.
 */
async function run(argv: readonly string[]): Promise<{code: CommandExitCode; harness: TestHarness; output: readonly SinkRecord[]}> {
  const harness = makeTestLayer({
    files: {[join(repositoryFixtureRoot, "package.json")]: JSON.stringify({name: "@arolariu/monorepo"})},
    inspection: {
      workspace: STUBBED,
      aggregate: STUBBED,
      "npm.root": STUBBED,
      "npm.github-scripts": STUBBED,
      packages: STUBBED,
      dotnet: STUBBED,
      python: STUBBED,
      react: STUBBED,
      "svelte.cv": STUBBED,
      "svelte.status": STUBBED,
      infrastructure: STUBBED,
    },
    processes: [scriptedOutcomes(() => ({kind: "succeeded", exitCode: 0, stdout: "", stderr: "", durationMs: 0}))],
    http: [{match: () => true, respond: {status: 200, body: ""}}],
    environment: {platform: "linux", architecture: "x64"},
  });
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeDoctorCommand()])).pipe(Effect.provide(harness.layer)));
  return {code: exitCodeFor(exit, undefined), harness, output: harness.output()};
}

/** The verbose-only evidence line of the passing repository-root row. */
const ROOT_EVIDENCE_LINE = `      - ${repositoryFixtureRoot}\n`;

describe("doctor command", () => {
  it("maps --quick to a run without network probes and --verbose to full passing evidence", async () => {
    // Arrange
    const argv = ["doctor", "--quick", "--verbose"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(1);
    expect(result.harness.httpCalls()).toEqual([]);
    expect(result.output.map((record) => record.text)).toContain(ROOT_EVIDENCE_LINE);
    expect(result.output.map((record) => record.text)).toContain("Summary: 1 passed, 0 warnings, 40 failures, 18 skipped\n");
  });

  it("defaults quick and verbose to false", async () => {
    // Arrange
    const argv = ["doctor"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(1);
    expect(
      result.harness
        .httpCalls()
        .map((request) => `${request.method} ${request.url}`)
        .toSorted(),
    ).toEqual(["GET https://api.nuget.org/v3/index.json", "GET https://pypi.org/pypi/pip/json"]);
    expect(result.output.map((record) => record.text)).not.toContain(ROOT_EVIDENCE_LINE);
  });

  it("writes exactly one JSON document in --json mode and keeps the business exit code", async () => {
    // Arrange
    const argv = ["doctor", "--quick", "--json"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(1);
    expect(result.output).toHaveLength(1);
    const [record] = result.output;
    expect(record?.stream).toBe("stdout");
    const document = JSON.parse(record?.text ?? "") as {summary: unknown; checks: readonly unknown[]};
    expect(document.summary).toEqual({passed: 1, warnings: 0, failed: 40, skipped: 18});
    expect(document.checks).toHaveLength(59);
  });
});
