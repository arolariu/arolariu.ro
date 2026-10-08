// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `dev` command group.
 * @module scripts/commands/dev/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation on the in-memory harness. `dev aspire` runs the Effect
 * program over scripted processes (the repository `package.json` is seeded for engine selection);
 * `dev selfhost` runs the Effect program on the `selfhostFixture` harness, whose recording
 * `LocalBlobStorage` layer stands in for the Azure Blob SDK. No module is mocked.
 */

import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import {SELFHOST_SQL_PASSWORD, selfhostFixture} from "../../container-runtime/selfhost.testing.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import {makeTestLayer, type RecordedProcessCall} from "../../platform/testing.ts";
import {makeDevCommand} from "./cli.ts";

/** Outcome of one `dev aspire` invocation and its process calls. */
interface DevRun {
  readonly code: CommandExitCode;
  readonly calls: readonly RecordedProcessCall[];
}

/**
 * Runs `dev aspire` against `argv`; every process succeeds with no output.
 *
 * @param argv - Arguments after the program name.
 * @param variables - Environment variables of the harness.
 * @returns The exit code and the recorded process calls.
 */
async function run(argv: readonly string[], variables: Readonly<Record<string, string>> = {}): Promise<DevRun> {
  const harness = makeTestLayer({
    files: {"package.json": JSON.stringify({name: "@arolariu/monorepo"})},
    environment: {variables},
    processes: [{match: () => true, respond: {stdout: "", stderr: "", durationMs: 0}}],
  });
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeDevCommand()])).pipe(Effect.provide(harness.layer)));
  return {code: exitCodeFor(exit, undefined), calls: harness.processCalls()};
}

/**
 * Runs `dev selfhost` against `argv` on a selfhost fixture.
 *
 * @param argv - Arguments after the program name.
 * @returns The exit code, the formatted engine calls, and the rendered lines.
 */
async function runSelfhostCli(argv: readonly string[]): Promise<{
  readonly code: CommandExitCode;
  readonly calls: readonly string[];
  readonly lines: readonly string[];
}> {
  const fixture = selfhostFixture({variables: {MSSQL_SA_PASSWORD: SELFHOST_SQL_PASSWORD, AROLARIU_CONTAINER_ENGINE: "podman"}});
  const exit = await fixture.runCli(argv);
  return {
    code: exitCodeFor(exit, undefined),
    calls: fixture.harness
      .processCalls()
      .filter((call) => call.request.command !== "unzip")
      .map((call) => [call.request.command, ...call.request.args].join(" ")),
    lines: fixture.harness.output().map((record) => record.text.trimEnd()),
  };
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
    expect(result.calls.at(-1)?.request).toEqual({command: "dotnet", args: ["run", "--project", "tooling/src/AppHost"]});
    expect(result.calls.at(-1)?.options.env?.["DOTNET_ASPIRE_CONTAINER_RUNTIME"]).toBe("docker");
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

  it("defaults selfhost to start, with the engine from the environment", async () => {
    // Arrange
    const argv = ["dev", "selfhost"];

    // Act
    const result = await runSelfhostCli(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.calls[0]).toBe("podman --version");
    expect(result.calls).toContain("podman compose -f Management/docker-compose.yml up -d");
    expect(result.lines.at(-1)).toBe("[arolariu::selfhost] ✅ Selfhost start completed for engine 'podman'.");
  });

  it("maps selfhost logs and the explicit engine", async () => {
    // Arrange
    const argv = ["dev", "selfhost", "logs", "--engine", "rancher"];

    // Act
    const result = await runSelfhostCli(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.calls.slice(-3)).toEqual([
      "docker logs --tail 100 exp-arolariu-ro",
      "docker logs --tail 100 api-arolariu-ro",
      "docker logs --tail 100 website-arolariu-ro",
    ]);
    expect(result.lines.at(-1)).toBe("[arolariu::selfhost] ✅ Selfhost logs completed for engine 'rancher'.");
  });

  it("rejects an unknown selfhost action", async () => {
    // Arrange
    const argv = ["dev", "selfhost", "restart"];

    // Act
    const result = await runSelfhostCli(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.calls).toEqual([]);
  });
});
