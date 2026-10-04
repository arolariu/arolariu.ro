/**
 * @fileoverview Tests for the declarative Aspire AppHost startup command.
 * @module scripts/container-runtime/aspire.test
 */

import {describe, expect, it} from "vitest";
import type {CommandExecution, CommandPresentation, CommandRuntimeFactory} from "../common/commander.ts";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "../common/logger.ts";
import type {ProcessOutcome, ProcessRequest, ProcessRunOptions} from "../common/runner.ts";
import {
  createProcessRunner,
  createRepositoryFixtureFileSystem,
  createTestRuntimeFactory,
  repositoryFixtureRoot,
} from "../common/runtime.testing.ts";
import {CommandCancellation, type CommandRuntime, type RuntimeEnvironment} from "../common/runtime.ts";
import {getContainerAdapter} from "./adapters.ts";
import {buildAspireCommand, createAspireCommand} from "./aspire.ts";

function succeeded(stdout = ""): ProcessOutcome {
  return {kind: "succeeded", exitCode: 0, stdout, stderr: "", durationMs: 0};
}

function exited(code: number): ProcessOutcome {
  return {kind: "exited", exitCode: code, stdout: "", stderr: "", durationMs: 0};
}

/** One `succeeded` outcome per Rancher preflight probe: tool, backend, compose, existing containers. */
const rancherPreflightOutcomes: readonly ProcessOutcome[] = [succeeded(), succeeded(), succeeded(), succeeded()];

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
    const runner = createProcessRunner([...rancherPreflightOutcomes, succeeded()]);
    const command = createAspireCommand(createTestRuntimeFactory({runner}));

    const execution = await command.invoke({engine: "rancher"});

    expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {engine: "rancher"}});
    expect(runner.calls.at(-1)).toMatchObject({
      request: {command: "dotnet", args: ["run", "--project", "tooling/AppHost"]},
      options: {output: "inherit"},
    });
    expect(runner.calls.at(-1)?.options.env?.["DOTNET_ASPIRE_CONTAINER_RUNTIME"]).toBe("docker");
  });

  it("runs Podman preflight before starting AppHost", async () => {
    const runner = createProcessRunner([
      succeeded(), // podman --version (assertToolAvailable)
      succeeded(), // docker version (assertNoDockerDesktopBackend)
      succeeded(), // podman --version (assertPodmanBackend)
      succeeded("podman-compose version 1.5.0"), // podman compose version (assertPodmanBackend)
      succeeded("podman-compose version 1.5.0"), // podman compose version (compose provider check)
      succeeded(), // podman ps -a (warnOnExistingLocalContainers)
      succeeded(), // dotnet run
    ]);
    const command = createAspireCommand(createTestRuntimeFactory({runner}));

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
    const runner = createProcessRunner([...rancherPreflightOutcomes, exited(1)]);
    const command = createAspireCommand(createTestRuntimeFactory({runner}));

    const execution = await command.invoke({engine: "rancher"});

    expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "operational"}});
  });

  it("rejects Docker Desktop before starting AppHost", async () => {
    const runner = createProcessRunner([succeeded("docker version 27.0"), succeeded("Docker Desktop 4.40.0")]);
    const command = createAspireCommand(createTestRuntimeFactory({runner}));

    const execution = await command.invoke({engine: "rancher"});

    expect(execution).toMatchObject({status: "failed", exitCode: 1});
    expect(execution.status === "failed" ? execution.failure.message : "").toContain("Docker Desktop appears to be active");
  });

  it("stops before starting AppHost when preflight itself is cancelled on an aborted invocation", async () => {
    const controller = new AbortController();
    controller.abort(new CommandCancellation("Terminated by test signal.", 130));
    const runner = createProcessRunner([{kind: "cancelled", stdout: "", stderr: "", durationMs: 0}]);
    const command = createAspireCommand(createTestRuntimeFactory({runner}));

    const execution = await command.invoke({engine: "rancher"}, {signal: controller.signal});

    expect(execution).toMatchObject({
      status: "cancelled",
      exitCode: 130,
      failure: {kind: "cancelled", message: "Terminated by test signal."},
    });
    expect(runner.calls).toHaveLength(1);
  });

  it("resolves the persisted engine through the invocation filesystem when no engine is requested", async () => {
    // Arrange
    const runner = createProcessRunner([...rancherPreflightOutcomes, succeeded()]);
    const files = createRepositoryFixtureFileSystem({
      [`${repositoryFixtureRoot}/.arolariu/tooling.local.json`]: JSON.stringify({schemaVersion: 1, containerEngine: "rancher"}),
    });
    const command = createAspireCommand(createTestRuntimeFactory({runner, files}));

    // Act
    const execution = await command.invoke({});

    // Assert
    expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {engine: "rancher"}});
    expect(runner.calls[0]?.request).toEqual({command: "docker", args: ["--version"]});
  });

  it("rejects the deprecated docker engine value as a usage failure", async () => {
    const runner = createProcessRunner();
    const command = createAspireCommand(createTestRuntimeFactory({runner}));

    const execution = await command.invoke({engine: "docker" as never});

    expect(execution).toMatchObject({status: "failed", exitCode: 1});
    expect(execution.status === "failed" ? execution.failure.message : "").toContain("Docker Desktop is deprecated");
    expect(runner.calls).toHaveLength(0);
  });

  describe("human invocation", () => {
    it("starts AppHost with an explicit engine", async () => {
      const runner = createProcessRunner([...rancherPreflightOutcomes, succeeded()]);
      const command = createAspireCommand(createTestRuntimeFactory({runner}));

      const execution = await command.invoke({engine: "rancher"}, {presentation: "human"});

      expect(execution).toMatchObject({status: "completed", exitCode: 0});
      expect(runner.calls.at(-1)?.request).toEqual({command: "dotnet", args: ["run", "--project", "tooling/AppHost"]});
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
 * Runs the legacy Aspire command once.
 *
 * @param engine - Requested engine.
 * @param outcomes - Scripted preflight and AppHost outcomes.
 * @param presentation - Legacy presentation; defaults to human.
 * @returns The projected execution, runner calls, and rendered output.
 */
async function characterizeAspire(
  engine: "rancher" | "podman",
  outcomes: readonly ProcessOutcome[],
  presentation: CommandPresentation = "human",
): Promise<unknown> {
  const runner = createProcessRunner(outcomes);
  const sink = new InMemoryLoggerSink();
  const command = createAspireCommand(
    presentationRuntimeFactory("aspire", sink, {runner, environment: characterizationEnvironment({HOME: "/home/fixture"})}),
  );

  const execution = await command.invoke({engine}, {presentation});

  return {execution: projectExecution(execution), calls: projectCalls(runner.calls), output: projectOutput(sink)};
}

describe("dev aspire characterization (pre-Effect migration)", () => {
  it("rancher: preflight calls in order, then AppHost with the merged environment and inherited output", async () => {
    const result = await characterizeAspire("rancher", [
      succeeded("Docker version 27.3.1"),
      succeeded("Server: Moby Engine"),
      succeeded("Docker Compose version v2.29.7"),
      succeeded("traefik\nredis\nunrelated\n"),
      succeeded(),
    ]);

    expect(result).toEqual({
      execution: {
        status: "completed",
        value: {
          engine: "rancher",
        },
        exitCode: 0,
      },
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
          command: "dotnet",
          args: ["run", "--project", "tooling/AppHost"],
          options: {
            output: "inherit",
            signal: "<signal>",
            env: {
              HOME: "/home/fixture",
              DOTNET_ASPIRE_CONTAINER_RUNTIME: "docker",
            },
          },
        },
      ],
      output: [
        {
          stream: "stderr",
          text: "[arolariu::aspire::preflight] ⚠️ Existing local containers detected for Rancher Desktop: traefik, redis",
          write: false,
        },
        {
          stream: "stdout",
          text: "[arolariu::aspire] ✅ Aspire AppHost exited successfully for engine 'rancher'.",
          write: false,
        },
      ],
    });
  });

  it("podman: preflight calls in order, then AppHost with the podman runtime and inherited output", async () => {
    const result = await characterizeAspire("podman", [
      succeeded("podman version 5.2.0"),
      exited(1),
      succeeded("podman version 5.2.0"),
      succeeded("podman-compose version 1.5.0"),
      succeeded("podman-compose version 1.5.0"),
      succeeded(""),
      succeeded(),
    ]);

    expect(result).toEqual({
      execution: {
        status: "completed",
        value: {
          engine: "podman",
        },
        exitCode: 0,
      },
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
          command: "dotnet",
          args: ["run", "--project", "tooling/AppHost"],
          options: {
            output: "inherit",
            signal: "<signal>",
            env: {
              HOME: "/home/fixture",
              DOTNET_ASPIRE_CONTAINER_RUNTIME: "podman",
            },
          },
        },
      ],
      output: [
        {
          stream: "stdout",
          text: "[arolariu::aspire] ✅ Aspire AppHost exited successfully for engine 'podman'.",
          write: false,
        },
      ],
    });
  });
  it("rancher (json): AppHost still runs, then legacy fails with exit 1 because it has no JSON document", async () => {
    const result = await characterizeAspire(
      "rancher",
      [
        succeeded("Docker version 27.3.1"),
        succeeded("Server: Moby Engine"),
        succeeded("Docker Compose version v2.29.7"),
        succeeded(""),
        succeeded(),
      ],
      "json",
    );

    expect(result).toEqual({
      execution: {
        status: "failed",
        exitCode: 1,
        failure: {
          kind: "internal",
          message: 'Command "aspire" selected JSON presentation without a JSON document.',
          evidence: [],
          cause: "undefined",
        },
      },
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
          command: "dotnet",
          args: ["run", "--project", "tooling/AppHost"],
          options: {
            output: "inherit",
            signal: "<signal>",
            env: {
              HOME: "/home/fixture",
              DOTNET_ASPIRE_CONTAINER_RUNTIME: "docker",
            },
          },
        },
      ],
      output: [
        {
          stream: "stderr",
          text: 'Command "aspire" selected JSON presentation without a JSON document.',
          write: false,
        },
      ],
    });
  });
});
