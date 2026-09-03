/**
 * @fileoverview Tests for the declarative local image build/run command.
 * @module scripts/container-runtime/image.test
 */

import {describe, expect, it, vi, type Mock} from "vitest";
import type {CommandExecution, CommandInvoker} from "../common/commander.ts";
import type {ProcessOutcome} from "../common/runner.ts";
import {createProcessRunner, createTestRuntimeFactory} from "../common/runtime.testing.ts";
import {CommandCancellation} from "../common/runtime.ts";
import type {ArtifactGenerationResult, GenerateArtifactsInput} from "../generate.artifacts.ts";
import {getContainerAdapter} from "./adapters.ts";
import {buildImageBuildCommand, buildImageRunCommand, createImageCommand} from "./image.ts";

function succeeded(stdout = ""): ProcessOutcome {
  return {kind: "succeeded", exitCode: 0, stdout, stderr: "", durationMs: 0};
}

function exited(code: number): ProcessOutcome {
  return {kind: "exited", exitCode: code, stdout: "", stderr: "", durationMs: 0};
}

/** One `succeeded` outcome per Podman preflight probe: tool, Docker Desktop rejection, backend x2, compose, existing containers. */
const podmanPreflightOutcomes: readonly ProcessOutcome[] = [succeeded(), succeeded(), succeeded(), succeeded(), succeeded(), succeeded()];

function artifactResult(overrides: Partial<ArtifactGenerationResult> = {}): ArtifactGenerationResult {
  return {summary: "Generated 5 artifact file(s).", generatedFiles: [], ...overrides};
}

type ArtifactsInvoke = CommandInvoker<GenerateArtifactsInput, ArtifactGenerationResult>["invoke"];
type ArtifactsStub = CommandInvoker<GenerateArtifactsInput, ArtifactGenerationResult> & Readonly<{invoke: Mock<ArtifactsInvoke>}>;

/**
 * Creates a typed artifacts stub recording every composed invocation.
 *
 * @param implementation - Behavior the stub replays; defaults to a completed, successful result.
 * @returns A recording {@link CommandInvoker}.
 */
function createArtifactsStub(implementation?: ArtifactsInvoke): ArtifactsStub {
  const invoke = vi.fn<ArtifactsInvoke>(
    implementation
      ?? ((): Promise<CommandExecution<ArtifactGenerationResult>> =>
        Promise.resolve({status: "completed", value: artifactResult(), exitCode: 0})),
  );
  return {invoke};
}

describe("buildImageBuildCommand", () => {
  it("builds frontend image with Podman", () => {
    const command = buildImageBuildCommand(getContainerAdapter("podman"), {
      dockerfile: "infra/containers/Dockerfile.frontend",
      tag: "arolariu-frontend",
      context: ".",
      buildArgs: {VERSION: "local"},
    });

    expect(command).toEqual({
      command: "podman",
      args: ["build", "-f", "infra/containers/Dockerfile.frontend", "-t", "arolariu-frontend", "--build-arg", "VERSION=local", "."],
    });
  });
});

describe("buildImageRunCommand", () => {
  it("runs backend image with Rancher", () => {
    const command = buildImageRunCommand(getContainerAdapter("rancher"), {
      tag: "arolariu-backend",
      ports: ["5000:8080"],
      environment: {INFRA: "local"},
    });

    expect(command).toEqual({
      command: "docker",
      args: ["run", "--rm", "-p", "5000:8080", "-e", "INFRA=local", "arolariu-backend"],
    });
  });
});

describe("createImageCommand", () => {
  it.each([
    ["frontend", true],
    ["backend", true],
    ["cv", false],
    ["exp", false],
  ] as const)("gates the artifact prerequisite for %s builds", async (target, shouldGenerate) => {
    const runner = createProcessRunner([...podmanPreflightOutcomes, succeeded()]);
    const artifacts = createArtifactsStub();
    const command = createImageCommand({runtimeFactory: createTestRuntimeFactory({runner}), artifacts});

    const execution = await command.invoke({action: "build", target, engine: "podman"});

    expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {action: "build", target, engine: "podman"}});
    expect(artifacts.invoke).toHaveBeenCalledTimes(shouldGenerate ? 1 : 0);
    if (shouldGenerate) {
      expect(artifacts.invoke).toHaveBeenCalledWith({verbose: false}, expect.objectContaining({presentation: "silent"}));
    }
  });

  it("never invokes the artifact prerequisite for run actions", async () => {
    const runner = createProcessRunner([...podmanPreflightOutcomes, succeeded()]);
    const artifacts = createArtifactsStub();
    const command = createImageCommand({runtimeFactory: createTestRuntimeFactory({runner}), artifacts});

    const execution = await command.invoke({action: "run", target: "frontend", engine: "podman"});

    expect(execution).toMatchObject({status: "completed", exitCode: 0});
    expect(artifacts.invoke).not.toHaveBeenCalled();
  });

  it("builds the exact engine-owned build command with tee output", async () => {
    const runner = createProcessRunner([...podmanPreflightOutcomes, succeeded()]);
    const artifacts = createArtifactsStub();
    const command = createImageCommand({runtimeFactory: createTestRuntimeFactory({runner}), artifacts});

    await command.invoke({action: "build", target: "backend", engine: "podman"});

    expect(runner.calls.at(-1)).toMatchObject({
      request: {
        command: "podman",
        args: ["build", "-f", "infra/containers/Dockerfile.backend", "-t", "arolariu-backend", "--build-arg", "VERSION=local", "."],
      },
      options: {output: "tee"},
    });
  });

  it("runs the exact engine-owned run command with tee output", async () => {
    const runner = createProcessRunner([...podmanPreflightOutcomes, succeeded()]);
    const artifacts = createArtifactsStub();
    const command = createImageCommand({runtimeFactory: createTestRuntimeFactory({runner}), artifacts});

    await command.invoke({action: "run", target: "exp", engine: "podman"});

    expect(runner.calls.at(-1)).toMatchObject({
      request: {command: "podman", args: ["run", "--rm", "-p", "5002:80", "-e", "INFRA=local", "arolariu-exp"]},
      options: {output: "tee"},
    });
  });

  it("surfaces a nonzero build exit as a failed execution", async () => {
    const runner = createProcessRunner([...podmanPreflightOutcomes, exited(1)]);
    const artifacts = createArtifactsStub();
    const command = createImageCommand({runtimeFactory: createTestRuntimeFactory({runner}), artifacts});

    const execution = await command.invoke({action: "build", target: "cv", engine: "podman"});

    expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "operational"}});
  });

  it("stops before building when the artifact prerequisite fails", async () => {
    const runner = createProcessRunner([...podmanPreflightOutcomes, succeeded()]);
    const artifacts = createArtifactsStub(() =>
      Promise.resolve({
        status: "failed",
        failure: {kind: "operational", message: "taxonomy source unavailable", evidence: []},
        exitCode: 1,
      }),
    );
    const command = createImageCommand({runtimeFactory: createTestRuntimeFactory({runner}), artifacts});

    const execution = await command.invoke({action: "build", target: "frontend", engine: "podman"});

    expect(execution).toMatchObject({status: "failed", exitCode: 1});
    expect(execution.status === "failed" ? execution.failure.message : "").toContain("taxonomy source unavailable");
    expect(runner.calls).toHaveLength(podmanPreflightOutcomes.length);
  });

  it("propagates a cancelled artifact prerequisite as a cancelled execution", async () => {
    const runner = createProcessRunner([...podmanPreflightOutcomes, succeeded()]);
    const cause = new CommandCancellation("Invocation was cancelled.", 130);
    const artifacts = createArtifactsStub(() =>
      Promise.resolve({status: "cancelled", failure: {kind: "cancelled", message: cause.message, evidence: [], cause}, exitCode: 130}),
    );
    const command = createImageCommand({runtimeFactory: createTestRuntimeFactory({runner}), artifacts});

    const execution = await command.invoke({action: "build", target: "backend", engine: "podman"});

    expect(execution).toMatchObject({status: "cancelled", exitCode: 130});
    expect(runner.calls).toHaveLength(podmanPreflightOutcomes.length);
  });

  describe("parser lifecycle", () => {
    it("reports a clean target error when --target is missing", async () => {
      const runner = createProcessRunner();
      const command = createImageCommand({runtimeFactory: createTestRuntimeFactory({runner})});

      const execution = await command.run(["build", "--engine", "podman"]);

      expect(execution).toMatchObject({status: "failed", exitCode: 2});
      expect(execution.status === "failed" ? execution.failure.message : "").toBe("Use --target frontend|backend|cv|exp");
      expect(runner.calls).toHaveLength(0);
    });

    it("reports a clean action error when build/run is missing", async () => {
      const runner = createProcessRunner();
      const command = createImageCommand({runtimeFactory: createTestRuntimeFactory({runner})});

      const execution = await command.run(["--target", "backend", "--engine", "podman"]);

      expect(execution).toMatchObject({status: "failed", exitCode: 2});
      expect(execution.status === "failed" ? execution.failure.message : "").toBe("Use build or run as the first argument.");
    });

    it("rejects an unknown option as a usage failure instead of throwing", async () => {
      const runner = createProcessRunner();
      const command = createImageCommand({runtimeFactory: createTestRuntimeFactory({runner})});

      const execution = await command.run(["--bogus"]);

      expect(execution).toMatchObject({status: "failed", exitCode: 2});
      expect(runner.calls).toHaveLength(0);
    });

    it("decodes build/target/engine end to end", async () => {
      const runner = createProcessRunner([...podmanPreflightOutcomes, succeeded()]);
      const artifacts = createArtifactsStub();
      const command = createImageCommand({runtimeFactory: createTestRuntimeFactory({runner}), artifacts});

      const execution = await command.run(["build", "--target", "backend", "--engine", "podman"]);

      expect(execution).toMatchObject({status: "completed", exitCode: 0});
      expect(artifacts.invoke).toHaveBeenCalledTimes(1);
    });
  });
});
