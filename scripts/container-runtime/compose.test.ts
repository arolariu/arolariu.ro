/**
 * @fileoverview Tests for the declarative Compose command.
 * @module scripts/container-runtime/compose.test
 */

import {describe, expect, it} from "vitest";
import type {CommandExecution, CommandPresentation, CommandRuntimeFactory} from "../common/commander.ts";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "../common/logger.ts";
import type {ProcessOutcome, ProcessRequest, ProcessRunOptions} from "../common/runner.ts";
import {createProcessRunner, createTestRuntimeFactory, repositoryFixtureRoot} from "../common/runtime.testing.ts";
import {CommandCancellation, type CommandRuntime, type RuntimeEnvironment} from "../common/runtime.ts";
import {getContainerAdapter} from "./adapters.ts";
import {buildComposeCommand, createComposeCommand} from "./compose.ts";

function succeeded(stdout = ""): ProcessOutcome {
  return {kind: "succeeded", exitCode: 0, stdout, stderr: "", durationMs: 0};
}

function exited(code: number): ProcessOutcome {
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
    const runner = createProcessRunner();
    const command = createComposeCommand(createTestRuntimeFactory({runner}));

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
    const runner = createProcessRunner([
      succeeded(), // docker --version
      succeeded(), // docker version
      succeeded(), // docker compose version
      succeeded(), // docker ps -a
      succeeded(), // actual compose invocation
    ]);
    const command = createComposeCommand(createTestRuntimeFactory({runner}));

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
    const runner = createProcessRunner([succeeded(), succeeded(), succeeded(), succeeded(), exited(1)]);
    const command = createComposeCommand(createTestRuntimeFactory({runner}));

    const execution = await command.invoke({engine: "rancher", file: "docker-compose.yml", passthrough: ["up", "-d"]});

    expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "operational"}});
  });

  it("preserves the invocation's cancellation reason when Compose itself is cancelled on an aborted invocation", async () => {
    const controller = new AbortController();
    controller.abort(new CommandCancellation("Terminated by test signal.", 143));
    const runner = createProcessRunner([
      succeeded(), // docker --version
      succeeded(), // docker version
      succeeded(), // docker compose version
      succeeded(), // docker ps -a
      {kind: "cancelled", stdout: "", stderr: "", durationMs: 0}, // actual compose invocation, cancelled
    ]);
    const command = createComposeCommand(createTestRuntimeFactory({runner}));

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

  describe("human invocation", () => {
    it("forwards every pass-through byte unchanged", async () => {
      const runner = createProcessRunner();
      const command = createComposeCommand(createTestRuntimeFactory({runner}));

      const execution = await command.invoke(
        {file: "infra/Local/Storage/docker-compose.yml", engine: "rancher", passthrough: ["up", "-d", "--remove-orphans"]},
        {presentation: "human"},
      );

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
 * Runs the legacy Compose command once.
 *
 * @param engine - Requested engine.
 * @param presentation - Legacy presentation.
 * @returns The projected execution, runner calls, and rendered output.
 */
async function characterizeCompose(engine: "rancher" | "podman", presentation: CommandPresentation): Promise<unknown> {
  const runner = createProcessRunner();
  const sink = new InMemoryLoggerSink();
  const command = createComposeCommand(presentationRuntimeFactory("compose", sink, {runner, environment: characterizationEnvironment({})}));

  const execution = await command.invoke(
    {engine, file: "infra/Local/Storage/docker-compose.yml", passthrough: ["--profile", "selfhost", "up", "-d", "--remove-orphans"]},
    {presentation},
  );

  return {execution: projectExecution(execution), calls: projectCalls(runner.calls), output: projectOutput(sink)};
}

describe("containers compose characterization (pre-Effect migration)", () => {
  it("rancher (human): preflight, then exactly [-f, file, ...passthrough] through the engine adapter", async () => {
    expect(await characterizeCompose("rancher", "human")).toEqual({
      execution: {
        status: "completed",
        value: {
          engine: "rancher",
          file: "infra/Local/Storage/docker-compose.yml",
          passthrough: ["--profile", "selfhost", "up", "-d", "--remove-orphans"],
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
          command: "docker",
          args: ["compose", "-f", "infra/Local/Storage/docker-compose.yml", "--profile", "selfhost", "up", "-d", "--remove-orphans"],
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
          text: "$ docker compose -f infra/Local/Storage/docker-compose.yml --profile selfhost up -d --remove-orphans",
          write: false,
        },
        {
          stream: "stdout",
          text: "[arolariu::compose] ✅ Compose completed for 'infra/Local/Storage/docker-compose.yml' with engine 'rancher'.",
          write: false,
        },
      ],
    });
  });

  it("podman (json): legacy has no JSON document, so a successful Compose run fails with exit 1", async () => {
    expect(await characterizeCompose("podman", "json")).toEqual({
      execution: {
        status: "failed",
        exitCode: 1,
        failure: {
          kind: "internal",
          message: 'Command "compose" selected JSON presentation without a JSON document.',
          evidence: [],
          cause: "undefined",
        },
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
          command: "podman",
          args: ["compose", "-f", "infra/Local/Storage/docker-compose.yml", "--profile", "selfhost", "up", "-d", "--remove-orphans"],
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
          stream: "stderr",
          text: 'Command "compose" selected JSON presentation without a JSON document.',
          write: false,
        },
      ],
    });
  });
});
