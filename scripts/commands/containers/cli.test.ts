// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `containers` command group.
 * @module scripts/commands/containers/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation on the in-memory harness: the repository
 * `package.json` is seeded, every preflight probe and engine command is scripted, and the recorded
 * process calls show what the decoded flags reached. No module is mocked.
 */

import {Effect} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import {ProcessExited} from "../../platform/Process.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import type {SinkRecord} from "../../platform/Output.ts";
import {makeTestLayer, type RecordedProcessCall} from "../../platform/testing.ts";
import {makeContainersCommand, reportChildExit} from "./cli.ts";

/** Outcome of one `containers` invocation. */
interface ContainersRun {
  readonly code: CommandExitCode;
  readonly calls: readonly RecordedProcessCall[];
  readonly output: readonly SinkRecord[];
}

/**
 * Runs `containers` against `argv`; every process succeeds with no output.
 *
 * @param argv - Arguments after the program name.
 * @param variables - Environment variables of the harness.
 * @returns The exit code, every recorded process call, and every sink record.
 */
async function run(argv: readonly string[], variables: Readonly<Record<string, string>> = {}): Promise<ContainersRun> {
  const harness = makeTestLayer({
    files: {"package.json": JSON.stringify({name: "@arolariu/monorepo"})},
    environment: {variables},
    processes: [{match: () => true, respond: {stdout: "", stderr: "", durationMs: 0}}],
  });
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeContainersCommand()])).pipe(Effect.provide(harness.layer)));
  return {code: exitCodeFor(exit, undefined), calls: harness.processCalls(), output: harness.output()};
}

/** The request of the last recorded call: the engine command a successful run ends with. */
function lastRequest(result: ContainersRun): unknown {
  return result.calls.at(-1)?.request;
}

describe("containers command", () => {
  it("requires a build target", async () => {
    // Arrange
    const argv = ["containers", "build"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.calls).toEqual([]);
  });

  it("maps build target", async () => {
    // Arrange
    const argv = ["containers", "build", "--target", "cv"];

    // Act
    const result = await run(argv, {AROLARIU_CONTAINER_ENGINE: "rancher"});

    // Assert
    expect(result.code).toBe(0);
    expect(lastRequest(result)).toEqual({
      command: "docker",
      args: ["build", "-f", "infra/containers/Dockerfile.cv", "-t", "arolariu-cv", "--build-arg", "VERSION=local", "."],
    });
  });

  it("omits the engine when absent, so the environment selects it", async () => {
    // Arrange
    const argv = ["containers", "run", "--target", "exp"];

    // Act
    const result = await run(argv, {AROLARIU_CONTAINER_ENGINE: "podman"});

    // Assert
    expect(result.code).toBe(0);
    expect(result.calls[0]?.request).toEqual({command: "podman", args: ["--version"]});
  });

  it("maps run target and engine", async () => {
    // Arrange
    const argv = ["containers", "run", "--target", "exp", "--engine", "podman"];

    // Act
    const result = await run(argv, {AROLARIU_CONTAINER_ENGINE: "rancher"});

    // Assert
    expect(result.code).toBe(0);
    expect(lastRequest(result)).toEqual({command: "podman", args: ["run", "--rm", "-p", "5002:80", "-e", "INFRA=local", "arolariu-exp"]});
  });

  it("rejects an unknown image target", async () => {
    // Arrange
    const argv = ["containers", "run", "--target", "mobile"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.calls).toEqual([]);
  });

  it("forwards compose passthrough arguments verbatim", async () => {
    // Arrange
    const argv = ["containers", "compose", "--file", "x.yml", "--engine", "rancher", "--", "up", "-d", "--build"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(lastRequest(result)).toEqual({command: "docker", args: ["compose", "-f", "x.yml", "up", "-d", "--build"]});
  });

  it("requires a compose file", async () => {
    // Arrange
    const argv = ["containers", "compose", "--", "up"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.calls).toEqual([]);
  });

  it("rejects compose without passthrough arguments", async () => {
    // Arrange
    const argv = ["containers", "compose", "--file", "x.yml", "--engine", "rancher"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.calls).toEqual([]);
    expect(result.output).toEqual([{stream: "stderr", text: "[arolariu::compose] ⛔ Use --file <compose-file> -- <compose arguments>\n"}]);
  });

  it("reports a missing engine selection through the root renderer", async () => {
    // Arrange
    const argv = ["containers", "compose", "--file", "x.yml", "--", "config"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(1);
    expect(result.calls).toEqual([]);
    expect(result.output).toHaveLength(1);
    expect(result.output[0]?.text).toMatch(/^\[arolariu::cli\] ⛔ /u);
  });
});

describe("reportChildExit", () => {
  it.each([
    ["docker compose -f x.yml up", "docker"],
    ['"C:\\Program Files\\Docker\\docker.exe" build .', "C:\\Program Files\\Docker\\docker.exe"],
    ["dotnet", "dotnet"],
  ])("names the executable of %s", async (command, executable) => {
    // Arrange
    const harness = makeTestLayer({context: "image"});
    const error = new ProcessExited({
      command,
      stdout: "out",
      stderr: "err",
      durationMs: 0,
      exitCode: 4,
      message: `${command} exited with code 4`,
    });

    // Act
    const failure = await Effect.runPromise(Effect.flip(reportChildExit(error)).pipe(Effect.provide(harness.layer)));

    // Assert
    expect(failure).toMatchObject({_tag: "ReportedFailure", exitCode: 1, message: `${executable} exited with code 4`});
    expect(harness.output()).toEqual([{stream: "stderr", text: `[arolariu::image] ⛔ ${executable} exited with code 4\n`}]);
  });
});
