/**
 * @fileoverview Tests for the declarative Aspire AppHost startup command.
 * @module scripts/container-runtime/aspire.test
 */

import {describe, expect, it} from "vitest";
import type {ProcessExecutionResult} from "../core/process/process-execution-result.ts";
import {buildRecordingProcessRunner} from "../testing/builders/process-result.builder.ts";
import {buildCommandHost} from "../testing/builders/command-host.builder.ts";
import {CommandCancellation} from "../common/runtime.ts";
import {getContainerAdapter} from "./adapters.ts";
import {buildAspireCommand, createAspireCommand} from "./aspire.ts";

function succeeded(stdout = ""): ProcessExecutionResult {
  return {kind: "succeeded", exitCode: 0, stdout, stderr: "", durationMs: 0};
}

function exited(code: number): ProcessExecutionResult {
  return {kind: "exited", exitCode: code, stdout: "", stderr: "", durationMs: 0};
}

/** One `succeeded` outcome per Rancher preflight probe: tool, backend, compose, existing containers. */
const rancherPreflightOutcomes: readonly ProcessExecutionResult[] = [succeeded(), succeeded(), succeeded(), succeeded()];

describe("buildAspireCommand", () => {
  it("sets the Rancher Aspire runtime over the supplied base environment", () => {
    const command = buildAspireCommand(getContainerAdapter("rancher"), {EXISTING: "value"});

    expect(command.command).toBe("dotnet");
    expect(command.args).toEqual(["run", "--project", "tooling/AppHost"]);
    expect(command.env).toEqual({EXISTING: "value", DOTNET_ASPIRE_CONTAINER_RUNTIME: "docker"});
  });

  it("sets the Podman Aspire runtime", () => {
    const command = buildAspireCommand(getContainerAdapter("podman"), {});

    expect(command.env["DOTNET_ASPIRE_CONTAINER_RUNTIME"]).toBe("podman");
  });
});

describe("createAspireCommand", () => {
  it("resolves the requested engine, runs preflight, and starts AppHost with inherited output", async () => {
    const runner = buildRecordingProcessRunner([...rancherPreflightOutcomes, succeeded()]);
    const command = createAspireCommand({host: buildCommandHost({runtime: {runner}})});

    const execution = await command.invoke({engine: "rancher"});

    expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {engine: "rancher"}});
    expect(runner.calls.at(-1)).toMatchObject({
      request: {command: "dotnet", args: ["run", "--project", "tooling/AppHost"]},
      options: {output: "inherit"},
    });
    expect(runner.calls.at(-1)?.options.env?.["DOTNET_ASPIRE_CONTAINER_RUNTIME"]).toBe("docker");
  });

  it("runs Podman preflight before starting AppHost", async () => {
    const runner = buildRecordingProcessRunner([
      succeeded(), // podman --version (assertToolAvailable)
      succeeded(), // docker version (assertNoDockerDesktopBackend)
      succeeded(), // podman --version (assertPodmanBackend)
      succeeded("podman-compose version 1.5.0"), // podman compose version (assertPodmanBackend)
      succeeded("podman-compose version 1.5.0"), // podman compose version (compose provider check)
      succeeded(), // podman ps -a (warnOnExistingLocalContainers)
      succeeded(), // dotnet run
    ]);
    const command = createAspireCommand({host: buildCommandHost({runtime: {runner}})});

    const execution = await command.invoke({engine: "podman"});

    expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {engine: "podman"}});
    expect(runner.calls.map((call) => call.request.command)).toEqual([
      "podman",
      "docker",
      "podman",
      "podman",
      "podman",
      "podman",
      "dotnet",
    ]);
    expect(runner.calls.at(-1)?.options.env?.["DOTNET_ASPIRE_CONTAINER_RUNTIME"]).toBe("podman");
  });

  it("surfaces a nonzero AppHost exit as a failed execution", async () => {
    const runner = buildRecordingProcessRunner([...rancherPreflightOutcomes, exited(1)]);
    const command = createAspireCommand({host: buildCommandHost({runtime: {runner}})});

    const execution = await command.invoke({engine: "rancher"});

    expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "operational"}});
  });

  it("rejects Docker Desktop before starting AppHost", async () => {
    const runner = buildRecordingProcessRunner([succeeded("docker version 27.0"), succeeded("Docker Desktop 4.40.0")]);
    const command = createAspireCommand({host: buildCommandHost({runtime: {runner}})});

    const execution = await command.invoke({engine: "rancher"});

    expect(execution).toMatchObject({status: "failed", exitCode: 1});
    expect(execution.status === "failed" ? execution.failure.message : "").toContain("Docker Desktop appears to be active");
  });

  it("stops before starting AppHost when preflight itself is cancelled on an aborted invocation", async () => {
    const controller = new AbortController();
    controller.abort(new CommandCancellation("Terminated by test signal.", 130));
    const runner = buildRecordingProcessRunner([{kind: "cancelled", stdout: "", stderr: "", durationMs: 0}]);
    const command = createAspireCommand({host: buildCommandHost({runtime: {runner}})});

    const execution = await command.invoke({engine: "rancher"}, {signal: controller.signal});

    expect(execution).toMatchObject({
      status: "cancelled",
      exitCode: 130,
      failure: {kind: "cancelled", message: "Terminated by test signal."},
    });
    expect(runner.calls).toHaveLength(1);
  });

  it("rejects the deprecated docker engine value as a usage failure", async () => {
    const runner = buildRecordingProcessRunner();
    const command = createAspireCommand({host: buildCommandHost({runtime: {runner}})});

    const execution = await command.invoke({engine: "docker" as never});

    expect(execution).toMatchObject({status: "failed", exitCode: 1});
    expect(execution.status === "failed" ? execution.failure.message : "").toContain("Docker Desktop is deprecated");
    expect(runner.calls).toHaveLength(0);
  });

  describe("parser lifecycle", () => {
    it("decodes an explicit --engine argument and starts AppHost", async () => {
      const runner = buildRecordingProcessRunner([...rancherPreflightOutcomes, succeeded()]);
      const command = createAspireCommand({host: buildCommandHost({runtime: {runner}})});

      const execution = await command.run(["--engine", "rancher"]);

      expect(execution).toMatchObject({status: "completed", exitCode: 0});
      expect(runner.calls.at(-1)?.request).toEqual({command: "dotnet", args: ["run", "--project", "tooling/AppHost"]});
    });
  });
});
