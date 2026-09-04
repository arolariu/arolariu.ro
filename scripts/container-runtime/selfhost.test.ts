/**
 * @fileoverview Tests for the declarative engine-aware selfhost orchestration command.
 * @module scripts/container-runtime/selfhost.test
 */

import {readFile} from "node:fs/promises";
import {describe, expect, it, vi, type Mock} from "vitest";
import type {CommandExecution, CommandInvoker} from "../core/command/command-execution.ts";
import {buildCommandHost} from "../testing/builders/command-host.builder.ts";
import {ComposedTerminalPresenter} from "../core/presentation/composed-terminal-presenter.ts";
import {RecordingTerminalPresenterSink} from "../testing/fixtures/terminal.fixture.ts";
import type {TerminalPresenter} from "../core/presentation/terminal-presenter.ts";
import type {ProcessExecutionOptions, ProcessExecutionRequest} from "../core/process/process-execution-request.ts";
import type {ProcessExecutionResult} from "../core/process/process-execution-result.ts";
import type {ProcessRunner} from "../core/process/process-runner.ts";
import {createRepositoryFixtureFileSystem, repositoryFixtureRoot} from "../common/runtime.testing.ts";
import {buildRecordingProcessRunner} from "../testing/builders/process-result.builder.ts";
import {
  CommandCancellation,
  LifoCleanupRegistry,
  type CleanupFailure,
  type CleanupRegistry,
  type Clock,
  type FileSystem,
  type RuntimeEnvironment,
} from "../common/runtime.ts";
import type {ArtifactGenerationResult, GenerateArtifactsInput} from "../generate.artifacts.ts";
import {getContainerAdapter} from "./adapters.ts";
import type {LocalStorageBootstrap} from "./selfhost.bootstrap.ts";
import {
  buildLocalStorageBootstrapCommand,
  buildSelfhostPlan,
  createSelfhostCommand,
  getRequiredSqlPassword,
  shouldGenerateTaxonomyArtifacts,
} from "./selfhost.ts";
import {selfhostTraefikConfigPath} from "./traefik.ts";
import type {SelfhostAction} from "./types.ts";

const sqlPassword = "local-strong-password";
const certFixturePath = "infra/Local/Management/certs/local-cert.pem";
const keyFixturePath = "infra/Local/Management/certs/local-key.pem";

const launcherCases = [
  {path: "../../infra/Local/selfhost-start.bat", action: "start", forwarding: "%*", shell: "batch"},
  {path: "../../infra/Local/selfhost-stop.bat", action: "stop", forwarding: "%*", shell: "batch"},
  {path: "../../infra/Local/selfhost-start.sh", action: "start", forwarding: '"$@"', shell: "bash"},
  {path: "../../infra/Local/selfhost-stop.sh", action: "stop", forwarding: '"$@"', shell: "bash"},
] as const;

function succeeded(stdout = ""): ProcessExecutionResult {
  return {kind: "succeeded", exitCode: 0, stdout, stderr: "", durationMs: 0};
}

function exited(code: number, stderr = ""): ProcessExecutionResult {
  return {kind: "exited", exitCode: code, stdout: "", stderr, durationMs: 0};
}

function cancelled(): ProcessExecutionResult {
  return {kind: "cancelled", stdout: "", stderr: "", durationMs: 0};
}

function succeededTimes(count: number): readonly ProcessExecutionResult[] {
  return Array.from({length: count}, () => succeeded());
}

/** One `succeeded` outcome per Podman preflight probe: tool, Docker Desktop rejection, backend x2, compose, existing containers. */
const podmanPreflightProbeCount = 6;

function environmentWith(variables: Readonly<Record<string, string | undefined>>): RuntimeEnvironment {
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

type RecordingClock = Clock & Readonly<{delays: readonly number[]}>;

function createRecordingClock(): RecordingClock {
  const delays: number[] = [];

  return {
    monotonicNow: (): number => 0,
    isoTimestamp: (): string => "2025-01-01T00:00:00.000Z",
    delay: (milliseconds: number, signal?: AbortSignal): Promise<void> => {
      delays.push(milliseconds);
      return signal?.aborted === true ? Promise.reject(new CommandCancellation("Cancelled while waiting.", 130)) : Promise.resolve();
    },
    delays,
  };
}

interface BootstrapCall {
  readonly name: "ensureCosmos" | "ensureAzurite";
  readonly runnerCalls: number;
  readonly signal: AbortSignal;
}

interface RecordingBootstrap {
  readonly bootstrap: LocalStorageBootstrap;
  readonly calls: readonly BootstrapCall[];
}

/**
 * Creates a local storage bootstrap fake that records call order relative to the process runner.
 *
 * @param runner - Runner whose recorded call count is captured with each bootstrap call.
 * @param behavior - Optional failure behavior layered over the recording fake.
 * @returns A recording bootstrap that never reaches Cosmos or Azurite.
 */
function createRecordingBootstrap(
  runner: Readonly<{calls: readonly unknown[]}>,
  behavior: Readonly<Partial<LocalStorageBootstrap>> = {},
): RecordingBootstrap {
  const calls: BootstrapCall[] = [];

  return {
    calls,
    bootstrap: {
      ensureCosmos: async (signal: AbortSignal): Promise<void> => {
        calls.push({name: "ensureCosmos", runnerCalls: runner.calls.length, signal});
        await behavior.ensureCosmos?.(signal);
      },
      ensureAzurite: async (signal: AbortSignal): Promise<void> => {
        calls.push({name: "ensureAzurite", runnerCalls: runner.calls.length, signal});
        await behavior.ensureAzurite?.(signal);
      },
    },
  };
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
        Promise.resolve({
          status: "completed",
          value: {summary: "Generated 5 artifact file(s).", generatedFiles: []},
          exitCode: 0,
        })),
  );
  return {invoke};
}

type RecordingCleanupRegistry = CleanupRegistry & Readonly<{labels: readonly string[]}>;

/**
 * Creates a cleanup registry that records every registered label.
 *
 * @param onDrain - Optional additional failures appended to the drained result.
 * @returns A LIFO cleanup registry exposing its registration labels.
 */
function createRecordingCleanupRegistry(onDrain?: readonly CleanupFailure[]): RecordingCleanupRegistry {
  const inner = new LifoCleanupRegistry();
  const labels: string[] = [];

  return {
    labels,
    register: (label: string, cleanup: () => void | Promise<void>): (() => void) => {
      labels.push(label);
      return inner.register(label, cleanup);
    },
    drain: async (): Promise<readonly CleanupFailure[]> => [...(await inner.drain()), ...(onDrain ?? [])],
  };
}

type RecordedRunner = ProcessRunner & Readonly<{calls: readonly Readonly<{request: ProcessExecutionRequest; options: ProcessExecutionOptions}>[]}>;

interface HarnessOptions {
  readonly outcomes?: readonly ProcessExecutionResult[];
  readonly variables?: Readonly<Record<string, string | undefined>>;
  readonly files?: FileSystem;
  readonly cleanup?: CleanupRegistry;
  readonly bootstrapBehavior?: Readonly<Partial<LocalStorageBootstrap>>;
  readonly artifacts?: ArtifactsStub;
}

interface SelfhostHarness {
  readonly command: ReturnType<typeof createSelfhostCommand>;
  readonly runner: RecordedRunner;
  readonly clock: RecordingClock;
  readonly files: FileSystem;
  readonly logger: TerminalPresenter;
  readonly sink: RecordingTerminalPresenterSink;
  readonly bootstrap: RecordingBootstrap;
  readonly artifacts: ArtifactsStub;
}

/**
 * Builds a fully faked selfhost command harness with no real infrastructure access.
 *
 * @param options - Optional scripted outcomes, environment, filesystem, and cleanup overrides.
 * @returns The command under test and every recording fake it was built with.
 */
function createHarness(options: Readonly<HarnessOptions> = {}): SelfhostHarness {
  const runner = buildRecordingProcessRunner(options.outcomes ?? []);
  const clock = createRecordingClock();
  const files = options.files ?? createRepositoryFixtureFileSystem({[certFixturePath]: "local-cert", [keyFixturePath]: "local-key"});
  const sink = new RecordingTerminalPresenterSink();
  const logger = new ComposedTerminalPresenter("test", {color: false, sink});
  const bootstrap = createRecordingBootstrap(runner, options.bootstrapBehavior ?? {});
  const artifacts = options.artifacts ?? createArtifactsStub();
  const environment = environmentWith(options.variables ?? {MSSQL_SA_PASSWORD: sqlPassword});
  const host = buildCommandHost({
    runtime: {
      runner,
      clock,
      files,
      presenter: logger,
      environment,
      ...(options.cleanup === undefined ? {} : {cleanup: options.cleanup}),
    },
  });

  return {
    command: createSelfhostCommand({bootstrap: bootstrap.bootstrap, artifacts}, {host}),
    runner,
    clock,
    files,
    logger,
    sink,
    bootstrap,
    artifacts,
  };
}

function formatCalls(runner: RecordedRunner): readonly string[] {
  return runner.calls.map((call) => [call.request.command, ...call.request.args].join(" "));
}

function businessCalls(runner: RecordedRunner): readonly string[] {
  return formatCalls(runner).slice(podmanPreflightProbeCount);
}

describe("supported selfhost launchers", () => {
  it.each(launcherCases)(
    "routes $path through the TypeScript entrypoint with argument and exit-code propagation",
    async ({path, action, forwarding, shell}) => {
      const source = await readFile(new URL(path, import.meta.url), "utf8");
      const command = `node scripts/container-runtime/selfhost.ts ${action} ${forwarding}`;

      expect(source).not.toContain("scripts/dev-selfhost.mjs");
      expect(source).toContain(command);

      if (shell === "batch") {
        expect(source).toContain('pushd "%~dp0..\\.."');
        expect(source).toMatch(
          /node scripts\/container-runtime\/selfhost\.ts (?:start|stop) %\*\r?\nset "EXIT_CODE=%ERRORLEVEL%"\r?\npopd\r?\nexit \/b %EXIT_CODE%/,
        );
      } else {
        expect(source).toContain("set -euo pipefail");
        expect(source).toContain('cd "$(dirname "$0")/../.."');
        expect(source.trimEnd().endsWith(command)).toBe(true);
      }
    },
  );
});

describe("buildSelfhostPlan", () => {
  it("builds a Rancher-only start plan", () => {
    const plan = buildSelfhostPlan({action: "start", adapter: getContainerAdapter("rancher")});

    expect(plan.map((command) => command.command)).toEqual(["docker", "docker", "docker", "docker"]);
    expect(plan.map((command) => command.args.join(" "))).toEqual([
      "compose -f Management/docker-compose.yml up -d",
      "compose -f Storage/docker-compose.yml --profile selfhost up -d",
      "compose -f Backend/docker-compose.yml up -d",
      "compose -f Frontend/docker-compose.yml up -d",
    ]);
  });

  it("builds a Podman-only stop plan", () => {
    const plan = buildSelfhostPlan({action: "stop", adapter: getContainerAdapter("podman")});

    expect(plan.map((command) => command.command)).toEqual(["podman", "podman", "podman", "podman"]);
    expect(plan.map((command) => command.args.join(" "))).toEqual([
      "compose -f Frontend/docker-compose.yml down",
      "compose -f Backend/docker-compose.yml down",
      "compose -f Storage/docker-compose.yml down",
      "compose -f Management/docker-compose.yml down",
    ]);
  });

  it("builds engine-owned logs commands", () => {
    const plan = buildSelfhostPlan({action: "logs", adapter: getContainerAdapter("podman")});

    expect(plan.map((command) => [command.command, command.args.join(" ")])).toEqual([
      ["podman", "logs --tail 100 exp-arolariu-ro"],
      ["podman", "logs --tail 100 api-arolariu-ro"],
      ["podman", "logs --tail 100 website-arolariu-ro"],
    ]);
  });
});

describe("buildLocalStorageBootstrapCommand", () => {
  it("uses the shared .NET local storage provisioner", () => {
    expect(buildLocalStorageBootstrapCommand()).toEqual({
      command: "dotnet",
      args: ["run", "--project", "../../tooling/LocalDevelopment.Bootstrap", "--", "--ensure-storage-only"],
    });
  });
});

describe("shouldGenerateTaxonomyArtifacts", () => {
  it("generates artifacts before selfhost start", () => {
    expect(shouldGenerateTaxonomyArtifacts("start")).toBe(true);
  });

  it.each(["stop", "logs"] as const)("does not generate artifacts for %s", (action: SelfhostAction) => {
    expect(shouldGenerateTaxonomyArtifacts(action)).toBe(false);
  });
});

describe("getRequiredSqlPassword", () => {
  it("reads the SQL password from the supplied environment snapshot", () => {
    expect(getRequiredSqlPassword({MSSQL_SA_PASSWORD: sqlPassword})).toBe(sqlPassword);
  });

  it.each([undefined, "", "   "])("rejects a missing or blank SQL password (%s)", (value) => {
    expect(() => getRequiredSqlPassword({MSSQL_SA_PASSWORD: value})).toThrow("MSSQL_SA_PASSWORD environment variable is required");
  });
});

describe("createSelfhostCommand start", () => {
  it("runs preflight, then the exact engine-owned stack commands in management, storage, backend, frontend order", async () => {
    const harness = createHarness();

    const execution = await harness.command.invoke({action: "start", engine: "podman"});

    expect(execution).toMatchObject({
      status: "completed",
      exitCode: 0,
      value: {action: "start", engine: "podman", stacks: ["management", "storage", "profile", "backend", "frontend"]},
    });
    expect(businessCalls(harness.runner)).toEqual([
      "podman compose -f Management/docker-compose.yml up -d",
      "podman compose -f Storage/docker-compose.yml --profile selfhost up -d",
      `podman exec mssql /opt/mssql-tools/bin/sqlcmd -C -S localhost -U sa -P ${sqlPassword} -d master -i /usr/sql/sqlSchema.sql -No`,
      "dotnet run --project ../../tooling/LocalDevelopment.Bootstrap -- --ensure-storage-only",
      "podman compose -f Backend/docker-compose.yml up -d",
      "podman compose -f Frontend/docker-compose.yml up -d",
    ]);
    expect(harness.runner.calls.at(-1)?.options).toMatchObject({cwd: "infra/Local", output: "tee", logCommands: true});
  });

  it("waits 10 seconds for storage readiness and 3 seconds between stack operations", async () => {
    const harness = createHarness();

    await harness.command.invoke({action: "start", engine: "podman"});

    expect(harness.clock.delays).toEqual([3_000, 10_000, 3_000, 3_000, 3_000]);
  });

  it("bootstraps SQL, Cosmos, Azurite, and local storage in order after the storage wait", async () => {
    const harness = createHarness();

    await harness.command.invoke({action: "start", engine: "podman"});

    expect(harness.bootstrap.calls.map((call) => [call.name, call.runnerCalls])).toEqual([
      ["ensureCosmos", podmanPreflightProbeCount + 3],
      ["ensureAzurite", podmanPreflightProbeCount + 3],
    ]);
    expect(harness.runner.calls[podmanPreflightProbeCount + 3]?.options.env).toEqual({
      DOTNET_ENVIRONMENT: "Development",
      INFRA: "local",
      ConnectionStrings__blobs: "UseDevelopmentStorage=true",
      ConnectionStrings__queues: "UseDevelopmentStorage=true",
    });
  });

  it("generates taxonomy artifacts exactly once, before any stack command", async () => {
    const harness = createHarness();

    await harness.command.invoke({action: "start", engine: "podman"});

    expect(harness.artifacts.invoke).toHaveBeenCalledTimes(1);
    expect(harness.artifacts.invoke).toHaveBeenCalledWith({verbose: false}, expect.objectContaining({presentation: "silent"}));
  });

  it("stops before any stack command when the artifact prerequisite fails", async () => {
    const artifacts = createArtifactsStub(() =>
      Promise.resolve({
        status: "failed",
        failure: {kind: "operational", message: "taxonomy source unavailable", evidence: []},
        exitCode: 1,
      }),
    );
    const harness = createHarness({artifacts});

    const execution = await harness.command.invoke({action: "start", engine: "podman"});

    expect(execution).toMatchObject({status: "failed", exitCode: 1});
    expect(execution.status === "failed" ? execution.failure.message : "").toContain("taxonomy source unavailable");
    expect(harness.runner.calls).toHaveLength(podmanPreflightProbeCount);
  });

  it("requires the SQL password before starting any stack", async () => {
    const harness = createHarness({variables: {}});

    const execution = await harness.command.invoke({action: "start", engine: "podman"});

    expect(execution).toMatchObject({status: "failed", exitCode: 1});
    expect(execution.status === "failed" ? execution.failure.message : "").toContain("MSSQL_SA_PASSWORD environment variable is required");
    expect(harness.runner.calls).toHaveLength(podmanPreflightProbeCount);
    expect(harness.bootstrap.calls).toEqual([]);
  });

  it("writes the generated Traefik config and keeps it as requested persistent state", async () => {
    const harness = createHarness();

    await harness.command.invoke({action: "start", engine: "podman"});

    await expect(harness.files.readText(selfhostTraefikConfigPath)).resolves.toContain("website-localhost");
  });

  it("keeps started stacks and the generated Traefik config when a later stack fails", async () => {
    const harness = createHarness({
      outcomes: [...succeededTimes(podmanPreflightProbeCount + 5), exited(1, "frontend stack refused to start")],
    });

    const execution = await harness.command.invoke({action: "start", engine: "podman"});

    expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "operational"}});
    await expect(harness.files.exists(selfhostTraefikConfigPath)).resolves.toBe(true);
    expect(businessCalls(harness.runner).some((call) => call.includes("down"))).toBe(false);
    expect(harness.runner.calls).toHaveLength(podmanPreflightProbeCount + 6);
  });

  it("registers no invocation cleanup for started stacks or the generated Traefik config", async () => {
    const cleanup = createRecordingCleanupRegistry();
    const harness = createHarness({cleanup});

    await harness.command.invoke({action: "start", engine: "podman"});

    // Started stacks and the generated Traefik file are requested persistent state, and this
    // invocation creates no transient resource of its own, so nothing is registered at all.
    expect(cleanup.labels).toEqual([]);
  });

  it("preserves the invocation's cancellation reason when a stack command is cancelled on an aborted invocation", async () => {
    const controller = new AbortController();
    controller.abort(new CommandCancellation("Terminated by test signal.", 143));
    const harness = createHarness({outcomes: [...succeededTimes(podmanPreflightProbeCount), cancelled()]});

    const execution = await harness.command.invoke({action: "start", engine: "podman"}, {signal: controller.signal});

    expect(execution).toMatchObject({
      status: "cancelled",
      exitCode: 143,
      failure: {kind: "cancelled", message: "Terminated by test signal."},
    });
  });
});

describe("createSelfhostCommand HTTPS certificates", () => {
  it("generates trusted localhost certificates through mkcert when they are missing", async () => {
    const harness = createHarness({files: createRepositoryFixtureFileSystem()});

    await harness.command.invoke({action: "start", engine: "podman"});

    expect(businessCalls(harness.runner).slice(0, 3)).toEqual([
      "mkcert --version",
      "mkcert -install",
      "mkcert -key-file Management/certs/local-key.pem -cert-file Management/certs/local-cert.pem localhost *.localhost",
    ]);
    expect(harness.runner.calls[podmanPreflightProbeCount]?.options.cwd).toBeUndefined();
    expect(harness.runner.calls[podmanPreflightProbeCount + 1]?.options.cwd).toBe("infra/Local");
  });

  it("warns and continues with Traefik defaults when mkcert is unavailable", async () => {
    const harness = createHarness({
      files: createRepositoryFixtureFileSystem(),
      outcomes: [...succeededTimes(podmanPreflightProbeCount), exited(1, "mkcert: command not found")],
    });

    const execution = await harness.command.invoke({action: "start", engine: "podman"});

    expect(execution).toMatchObject({status: "completed", exitCode: 0});
    expect(businessCalls(harness.runner)).toEqual([
      "mkcert --version",
      "podman compose -f Management/docker-compose.yml up -d",
      "podman compose -f Storage/docker-compose.yml --profile selfhost up -d",
      `podman exec mssql /opt/mssql-tools/bin/sqlcmd -C -S localhost -U sa -P ${sqlPassword} -d master -i /usr/sql/sqlSchema.sql -No`,
      "dotnet run --project ../../tooling/LocalDevelopment.Bootstrap -- --ensure-storage-only",
      "podman compose -f Backend/docker-compose.yml up -d",
      "podman compose -f Frontend/docker-compose.yml up -d",
    ]);
    expect(harness.sink.records.some((record) => record.text.includes("mkcert is not available"))).toBe(true);
  });
});

describe("createSelfhostCommand stop", () => {
  it("stops stacks in reverse order, removes the generated Traefik config, and skips artifacts and bootstrap", async () => {
    const files = createRepositoryFixtureFileSystem({[certFixturePath]: "local-cert", [keyFixturePath]: "local-key"});
    await createHarness({files}).command.invoke({action: "start", engine: "podman"});
    await expect(files.exists(selfhostTraefikConfigPath)).resolves.toBe(true);
    const started = createHarness({files});

    const execution = await started.command.invoke({action: "stop", engine: "podman"});

    expect(execution).toMatchObject({
      status: "completed",
      exitCode: 0,
      value: {action: "stop", engine: "podman", stacks: ["frontend", "backend", "storage", "management"]},
    });
    expect(businessCalls(started.runner)).toEqual([
      "podman compose -f Frontend/docker-compose.yml down",
      "podman compose -f Backend/docker-compose.yml down",
      "podman compose -f Storage/docker-compose.yml down",
      "podman compose -f Management/docker-compose.yml down",
    ]);
    expect(started.clock.delays).toEqual([3_000, 3_000, 3_000, 3_000]);
    expect(started.artifacts.invoke).not.toHaveBeenCalled();
    expect(started.bootstrap.calls).toEqual([]);
    await expect(started.files.exists(selfhostTraefikConfigPath)).resolves.toBe(false);
  });

  it("does not require the SQL password", async () => {
    const harness = createHarness({variables: {}});

    const execution = await harness.command.invoke({action: "stop", engine: "podman"});

    expect(execution).toMatchObject({status: "completed", exitCode: 0});
  });
});

describe("createSelfhostCommand logs", () => {
  it("tails the exact logs targets without waits, artifacts, bootstrap, or Traefik changes", async () => {
    const harness = createHarness();

    const execution = await harness.command.invoke({action: "logs", engine: "podman"});

    expect(execution).toMatchObject({
      status: "completed",
      exitCode: 0,
      value: {action: "logs", engine: "podman", stacks: ["profile", "backend", "frontend"]},
    });
    expect(businessCalls(harness.runner)).toEqual([
      "podman logs --tail 100 exp-arolariu-ro",
      "podman logs --tail 100 api-arolariu-ro",
      "podman logs --tail 100 website-arolariu-ro",
    ]);
    expect(harness.clock.delays).toEqual([]);
    expect(harness.artifacts.invoke).not.toHaveBeenCalled();
    expect(harness.bootstrap.calls).toEqual([]);
    await expect(harness.files.exists(selfhostTraefikConfigPath)).resolves.toBe(false);
  });
});

describe("createSelfhostCommand engine selection", () => {
  it("resolves the engine from the invocation environment snapshot when no override is supplied", async () => {
    const harness = createHarness({variables: {MSSQL_SA_PASSWORD: sqlPassword, AROLARIU_CONTAINER_ENGINE: "rancher"}});

    const execution = await harness.command.invoke({action: "logs"});

    expect(execution).toMatchObject({status: "completed", value: {engine: "rancher"}});
    expect(formatCalls(harness.runner).at(-1)).toBe("docker logs --tail 100 website-arolariu-ro");
  });

  it("rejects the deprecated docker engine value without running anything", async () => {
    const harness = createHarness();

    const execution = await harness.command.invoke({action: "logs", engine: "docker" as never});

    expect(execution).toMatchObject({status: "failed", exitCode: 1});
    expect(execution.status === "failed" ? execution.failure.message : "").toContain("Docker Desktop is deprecated");
    expect(harness.runner.calls).toHaveLength(0);
  });
});

describe("createSelfhostCommand parser lifecycle", () => {
  it("defaults the action argument to start", async () => {
    const harness = createHarness();

    const execution = await harness.command.run(["--engine", "podman"]);

    expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {action: "start"}});
  });

  it("decodes an explicit action and engine", async () => {
    const harness = createHarness();

    const execution = await harness.command.run(["logs", "--engine", "podman"]);

    expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {action: "logs", engine: "podman"}});
  });

  it("normalizes engine casing and surrounding whitespace exactly like engine selection", async () => {
    const harness = createHarness();

    const execution = await harness.command.run(["logs", "--engine", " PODMAN "]);

    expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {engine: "podman"}});
  });

  it("rejects an unknown action as a usage failure", async () => {
    const harness = createHarness();

    const execution = await harness.command.run(["restart"]);

    expect(execution).toMatchObject({status: "failed", exitCode: 2});
    expect(execution.status === "failed" ? execution.failure.message : "").toBe("Use start, stop, or logs as the first argument.");
    expect(harness.runner.calls).toHaveLength(0);
  });

  it("rejects the deprecated docker engine argument as a usage failure", async () => {
    const harness = createHarness();

    const execution = await harness.command.run(["start", "--engine", "docker"]);

    expect(execution).toMatchObject({status: "failed", exitCode: 2});
    expect(execution.status === "failed" ? execution.failure.message : "").toContain("Docker Desktop is deprecated");
    expect(harness.runner.calls).toHaveLength(0);
  });

  it("rejects an unsupported engine argument as a usage failure", async () => {
    const harness = createHarness();

    const execution = await harness.command.run(["start", "--engine", "colima"]);

    expect(execution).toMatchObject({status: "failed", exitCode: 2});
    expect(execution.status === "failed" ? execution.failure.message : "").toContain("Unsupported container engine 'colima'");
  });
});
