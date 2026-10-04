/**
 * @fileoverview Tests for the declarative local image build/run command.
 * @module scripts/container-runtime/image.test
 */

import {describe, expect, it, vi, type Mock} from "vitest";
import type {CommandExecution, CommandInvoker, CommandRuntimeFactory} from "../common/commander.ts";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "../common/logger.ts";
import type {ProcessOutcome, ProcessRequest, ProcessRunOptions} from "../common/runner.ts";
import {createProcessRunner, createTestRuntimeFactory, repositoryFixtureRoot} from "../common/runtime.testing.ts";
import {CommandCancellation, type CommandRuntime, type RuntimeEnvironment} from "../common/runtime.ts";
import type {ArtifactGenerationResult, GenerateArtifactsInput} from "../commands/generate/artifacts.ts";
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
      options: {output: "tee", logCommands: true},
    });
  });

  it("runs the exact engine-owned run command with tee output", async () => {
    const runner = createProcessRunner([...podmanPreflightOutcomes, succeeded()]);
    const artifacts = createArtifactsStub();
    const command = createImageCommand({runtimeFactory: createTestRuntimeFactory({runner}), artifacts});

    await command.invoke({action: "run", target: "exp", engine: "podman"});

    expect(runner.calls.at(-1)).toMatchObject({
      request: {command: "podman", args: ["run", "--rm", "-p", "5002:80", "-e", "INFRA=local", "arolariu-exp"]},
      options: {output: "tee", logCommands: true},
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

  it("preserves the invocation's cancellation reason when the run command itself is cancelled on an aborted invocation", async () => {
    const controller = new AbortController();
    controller.abort(new CommandCancellation("Terminated by test signal.", 143));
    const runner = createProcessRunner([...podmanPreflightOutcomes, {kind: "cancelled", stdout: "", stderr: "", durationMs: 0}]);
    const artifacts = createArtifactsStub();
    const command = createImageCommand({runtimeFactory: createTestRuntimeFactory({runner}), artifacts});

    const execution = await command.invoke({action: "run", target: "exp", engine: "podman"}, {signal: controller.signal});

    expect(execution).toMatchObject({
      status: "cancelled",
      exitCode: 143,
      failure: {kind: "cancelled", message: "Terminated by test signal."},
    });
    expect(runner.calls).toHaveLength(podmanPreflightOutcomes.length + 1);
  });

  describe("human invocation", () => {
    it("builds a target end to end after the artifact prerequisite", async () => {
      const runner = createProcessRunner([...podmanPreflightOutcomes, succeeded()]);
      const artifacts = createArtifactsStub();
      const command = createImageCommand({runtimeFactory: createTestRuntimeFactory({runner}), artifacts});

      const execution = await command.invoke({action: "build", target: "backend", engine: "podman"}, {presentation: "human"});

      expect(execution).toMatchObject({status: "completed", exitCode: 0});
      expect(artifacts.invoke).toHaveBeenCalledTimes(1);
    });
  });
});

// ============================================================================
// Characterization (pre-Effect migration)
// ============================================================================

/** Replaces the machine-dependent fixture root and normalizes path separators. */
function withPortablePaths(text: string): string {
  return text.replaceAll(repositoryFixtureRoot, "<root>").replaceAll("\\", "/");
}

/** Projects run options into plain values, naming the signal and logger instead of embedding them. */
function projectOptions(options: Readonly<ProcessRunOptions>): Readonly<Record<string, unknown>> {
  return Object.fromEntries(
    Object.entries(options).map(([key, value]) => [key, key === "signal" ? "<signal>" : key === "logger" ? "<logger>" : value]),
  );
}

/** Projects recorded runner calls into plain request and option values. */
function projectCalls(calls: readonly Readonly<{request: ProcessRequest; options: ProcessRunOptions}>[]): readonly unknown[] {
  return calls.map(({request, options}) => ({command: request.command, args: [...request.args], options: projectOptions(options)}));
}

/** Projects one execution into a plain value, naming the failure cause by its class. */
function projectExecution(execution: Readonly<CommandExecution<unknown>>): unknown {
  if (execution.status === "completed" || execution.status === "help") {
    return {...execution};
  }
  const {cause, ...failure} = execution.failure;
  return {
    ...execution,
    failure: {
      ...failure,
      message: withPortablePaths(failure.message),
      evidence: failure.evidence.map(withPortablePaths),
      cause: cause instanceof Error ? cause.constructor.name : String(cause),
    },
  };
}

/** Projects every rendered logger record with portable paths. */
function projectOutput(sink: InMemoryLoggerSink): readonly unknown[] {
  return sink.records.map((record) => ({...record, text: withPortablePaths(record.text)}));
}

/**
 * Creates a runtime factory whose logger honors the invocation presentation, like the Node factory.
 *
 * @param name - Command name used as the logger context, as the Node factory does.
 * @param sink - Sink receiving every rendered record.
 * @param overrides - Runtime capabilities.
 * @returns The runtime factory.
 */
function presentationRuntimeFactory(
  name: string,
  sink: InMemoryLoggerSink,
  overrides: Readonly<Partial<CommandRuntime>>,
): CommandRuntimeFactory {
  return {
    createRoot: (options) =>
      createTestRuntimeFactory({
        ...overrides,
        logger: new MonorepositoryConsoleLogger(name, {mode: options.presentation, color: false, sink}),
      }).createRoot(options),
    createChild: (parent, options) => createTestRuntimeFactory(overrides).createChild(parent, options),
  };
}

/** Builds a deterministic environment snapshot anchored to the fixture repository root. */
function characterizationEnvironment(variables: Readonly<Record<string, string>>): RuntimeEnvironment {
  return {
    variables,
    cwd: repositoryFixtureRoot,
    executablePath: "/usr/bin/node",
    platform: "linux",
    architecture: "x64",
    stdinIsTTY: false,
    stdoutIsTTY: false,
    isCI: true,
  };
}
/**
 * Runs the legacy image build once in human presentation, recording when the artifact
 * prerequisite ran relative to the runner calls.
 *
 * @param engine - Requested engine.
 * @param target - Image target.
 * @param outcomes - Scripted preflight and build outcomes.
 * @returns The projected execution, artifact invocations, runner calls, and rendered output.
 */
async function characterizeImageBuild(
  engine: "rancher" | "podman",
  target: "frontend" | "cv",
  outcomes: readonly ProcessOutcome[],
): Promise<unknown> {
  const runner = createProcessRunner(outcomes);
  const sink = new InMemoryLoggerSink();
  const artifactInvocations: unknown[] = [];
  const artifacts = createArtifactsStub((input, options) => {
    artifactInvocations.push({input, presentation: options?.presentation, runnerCallsBefore: runner.calls.length});
    return Promise.resolve({status: "completed", value: artifactResult(), exitCode: 0});
  });
  const command = createImageCommand({
    runtimeFactory: presentationRuntimeFactory("image", sink, {runner, environment: characterizationEnvironment({})}),
    artifacts,
  });

  const execution = await command.invoke({action: "build", target, engine}, {presentation: "human"});

  return {execution: projectExecution(execution), artifactInvocations, calls: projectCalls(runner.calls), output: projectOutput(sink)};
}

describe("containers build characterization (pre-Effect migration)", () => {
  it("--target cv (rancher): no artifact generation, then the exact build args", async () => {
    expect(await characterizeImageBuild("rancher", "cv", [])).toEqual({
      execution: {
        status: "completed",
        value: {
          engine: "rancher",
          action: "build",
          target: "cv",
        },
        exitCode: 0,
      },
      artifactInvocations: [],
      calls: [
        {
          command: "docker",
          args: ["--version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          command: "docker",
          args: ["version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          command: "docker",
          args: ["compose", "version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          command: "docker",
          args: ["ps", "-a", "--format", "{{.Names}}"],
          options: {
            signal: "<signal>",
          },
        },
        {
          command: "docker",
          args: ["build", "-f", "infra/containers/Dockerfile.cv", "-t", "arolariu-cv", "--build-arg", "VERSION=local", "."],
          options: {
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
      ],
      output: [
        {
          stream: "stdout",
          text: "$ docker build -f infra/containers/Dockerfile.cv -t arolariu-cv --build-arg VERSION=local .",
          write: false,
        },
        {
          stream: "stdout",
          text: "[arolariu::image] ✅ Image build completed for target 'cv' with engine 'rancher'.",
          write: false,
        },
      ],
    });
  });

  it("--target frontend (podman): artifact generation after preflight and before the exact build args", async () => {
    expect(
      await characterizeImageBuild("podman", "frontend", [
        succeeded(),
        exited(1),
        succeeded(),
        succeeded("podman-compose version 1.5.0"),
        succeeded("podman-compose version 1.5.0"),
        succeeded(),
        succeeded(),
      ]),
    ).toEqual({
      execution: {
        status: "completed",
        value: {
          engine: "podman",
          action: "build",
          target: "frontend",
        },
        exitCode: 0,
      },
      artifactInvocations: [
        {
          input: {
            verbose: false,
          },
          presentation: "silent",
          runnerCallsBefore: 6,
        },
      ],
      calls: [
        {
          command: "podman",
          args: ["--version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          command: "docker",
          args: ["version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          command: "podman",
          args: ["--version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          command: "podman",
          args: ["compose", "version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          command: "podman",
          args: ["compose", "version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          command: "podman",
          args: ["ps", "-a", "--format", "{{.Names}}"],
          options: {
            signal: "<signal>",
          },
        },
        {
          command: "podman",
          args: ["build", "-f", "infra/containers/Dockerfile.frontend", "-t", "arolariu-frontend", "--build-arg", "VERSION=local", "."],
          options: {
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
      ],
      output: [
        {
          stream: "stdout",
          text: "$ podman build -f infra/containers/Dockerfile.frontend -t arolariu-frontend --build-arg VERSION=local .",
          write: false,
        },
        {
          stream: "stdout",
          text: "[arolariu::image] ✅ Image build completed for target 'frontend' with engine 'podman'.",
          write: false,
        },
      ],
    });
  });
});
