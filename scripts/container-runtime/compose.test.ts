/**
 * @fileoverview Tests for the declarative Compose command.
 * @module scripts/container-runtime/compose.test
 */

import {describe, expect, it} from "vitest";
import type {ProcessExecutionResult} from "../core/process/process-execution-result.ts";
import {buildRecordingProcessRunner} from "../testing/builders/process-result.builder.ts";
import {buildCommandHost} from "../testing/builders/command-host.builder.ts";
import {CommandCancellation} from "../common/runtime.ts";
import {getContainerAdapter} from "./adapters.ts";
import {buildComposeCommand, createComposeCommand} from "./compose.ts";

function succeeded(stdout = ""): ProcessExecutionResult {
  return {kind: "succeeded", exitCode: 0, stdout, stderr: "", durationMs: 0};
}

function exited(code: number): ProcessExecutionResult {
  return {kind: "exited", exitCode: code, stdout: "", stderr: "", durationMs: 0};
}

describe("buildComposeCommand", () => {
  it("routes compose files through Podman", () => {
    const command = buildComposeCommand(getContainerAdapter("podman"), {
      file: "infra/Local/Storage/docker-compose.yml",
      args: ["up", "-d"],
    });

    expect(command).toEqual({
      command: "podman",
      args: ["compose", "-f", "infra/Local/Storage/docker-compose.yml", "up", "-d"],
    });
  });
});

describe("createComposeCommand", () => {
  it("preserves pass-through argument order and bytes with tee output", async () => {
    const runner = buildRecordingProcessRunner();
    const command = createComposeCommand({host: buildCommandHost({runtime: {runner}})});

    const execution = await command.invoke({
      engine: "podman",
      file: "infra\\Local\\Storage\\docker-compose.yml",
      passthrough: ["up", "-d"],
    });

    expect(execution).toMatchObject({status: "completed", exitCode: 0});
    expect(runner.calls.at(-1)).toMatchObject({
      request: {
        command: "podman",
        args: ["compose", "-f", "infra\\Local\\Storage\\docker-compose.yml", "up", "-d"],
      },
      options: {output: "tee", logCommands: true},
    });
  });

  it("runs preflight before invoking Compose", async () => {
    const runner = buildRecordingProcessRunner([
      succeeded(), // docker --version
      succeeded(), // docker version
      succeeded(), // docker compose version
      succeeded(), // docker ps -a
      succeeded(), // actual compose invocation
    ]);
    const command = createComposeCommand({host: buildCommandHost({runtime: {runner}})});

    const execution = await command.invoke({
      engine: "rancher",
      file: "infra/Local/Storage/docker-compose.yml",
      passthrough: ["up", "-d", "--remove-orphans"],
    });

    expect(execution).toMatchObject({
      status: "completed",
      exitCode: 0,
      value: {engine: "rancher", file: "infra/Local/Storage/docker-compose.yml", passthrough: ["up", "-d", "--remove-orphans"]},
    });
    expect(runner.calls.map((call) => call.request.command)).toEqual(["docker", "docker", "docker", "docker", "docker"]);
    expect(runner.calls.at(-1)?.request.args).toEqual([
      "compose",
      "-f",
      "infra/Local/Storage/docker-compose.yml",
      "up",
      "-d",
      "--remove-orphans",
    ]);
  });

  it("surfaces a nonzero Compose exit as a failed execution", async () => {
    const runner = buildRecordingProcessRunner([succeeded(), succeeded(), succeeded(), succeeded(), exited(1)]);
    const command = createComposeCommand({host: buildCommandHost({runtime: {runner}})});

    const execution = await command.invoke({engine: "rancher", file: "docker-compose.yml", passthrough: ["up", "-d"]});

    expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "operational"}});
  });

  it("preserves the invocation's cancellation reason when Compose itself is cancelled on an aborted invocation", async () => {
    const controller = new AbortController();
    controller.abort(new CommandCancellation("Terminated by test signal.", 143));
    const runner = buildRecordingProcessRunner([
      succeeded(), // docker --version
      succeeded(), // docker version
      succeeded(), // docker compose version
      succeeded(), // docker ps -a
      {kind: "cancelled", stdout: "", stderr: "", durationMs: 0}, // actual compose invocation, cancelled
    ]);
    const command = createComposeCommand({host: buildCommandHost({runtime: {runner}})});

    const execution = await command.invoke(
      {engine: "rancher", file: "docker-compose.yml", passthrough: ["up", "-d"]},
      {signal: controller.signal},
    );

    expect(execution).toMatchObject({
      status: "cancelled",
      exitCode: 143,
      failure: {kind: "cancelled", message: "Terminated by test signal."},
    });
    expect(runner.calls).toHaveLength(5);
  });

  describe("parser lifecycle", () => {
    it("requires the literal -- delimiter even when trailing tokens are present", async () => {
      const runner = buildRecordingProcessRunner();
      const command = createComposeCommand({host: buildCommandHost({runtime: {runner}})});

      const execution = await command.run(["--file", "infra/Local/Storage/docker-compose.yml", "--engine", "rancher", "up"]);

      expect(execution).toMatchObject({status: "failed", exitCode: 2});
      expect(execution.status === "failed" ? execution.failure.message : "").toBe("Use --file <compose-file> -- <compose arguments>");
      expect(runner.calls).toHaveLength(0);
    });

    it("rejects a missing --file with the existing usage error", async () => {
      const runner = buildRecordingProcessRunner();
      const command = createComposeCommand({host: buildCommandHost({runtime: {runner}})});

      const execution = await command.run(["--engine", "rancher", "--", "up", "-d"]);

      expect(execution).toMatchObject({status: "failed", exitCode: 2});
      expect(execution.status === "failed" ? execution.failure.message : "").toBe("Use --file <compose-file> -- <compose arguments>");
    });

    it("rejects missing pass-through arguments with the existing usage error", async () => {
      const runner = buildRecordingProcessRunner();
      const command = createComposeCommand({host: buildCommandHost({runtime: {runner}})});

      const execution = await command.run(["--file", "infra/Local/Storage/docker-compose.yml", "--engine", "rancher"]);

      expect(execution).toMatchObject({status: "failed", exitCode: 2});
      expect(execution.status === "failed" ? execution.failure.message : "").toBe("Use --file <compose-file> -- <compose arguments>");
    });

    it("rejects an empty pass-through list after a literal --", async () => {
      const runner = buildRecordingProcessRunner();
      const command = createComposeCommand({host: buildCommandHost({runtime: {runner}})});

      const execution = await command.run(["--file", "infra/Local/Storage/docker-compose.yml", "--engine", "rancher", "--"]);

      expect(execution).toMatchObject({status: "failed", exitCode: 2});
    });

    it("decodes every pass-through byte unchanged through the full CLI parse path", async () => {
      const runner = buildRecordingProcessRunner();
      const command = createComposeCommand({host: buildCommandHost({runtime: {runner}})});

      const execution = await command.run([
        "--file",
        "infra/Local/Storage/docker-compose.yml",
        "--engine",
        "rancher",
        "--",
        "up",
        "-d",
        "--remove-orphans",
      ]);

      expect(execution).toMatchObject({status: "completed", exitCode: 0});
      expect(runner.calls.at(-1)?.request.args).toEqual([
        "compose",
        "-f",
        "infra/Local/Storage/docker-compose.yml",
        "up",
        "-d",
        "--remove-orphans",
      ]);
    });
  });
});
