/**
 * @fileoverview Tests for the declarative engine-aware selfhost orchestration command.
 * @module scripts/container-runtime/selfhost.test
 */

import {readFile} from "node:fs/promises";
import {dirname} from "node:path";
import {describe, expect, it, vi, type Mock} from "vitest";
import type {CommandExecution, CommandInvoker, CommandPresentation, CommandRuntimeFactory} from "../common/commander.ts";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger, type MonorepositoryLogger} from "../common/logger.ts";
import {
  AbstractProcessRunner,
  type ProcessOutcome,
  type ProcessRequest,
  type ProcessRunOptions,
  type ProcessRunner,
} from "../common/runner.ts";
import {
  createHttpResponse,
  createProcessRunner,
  createRepositoryFixtureFileSystem,
  createTestRuntimeFactory,
  repositoryFixtureRoot,
} from "../common/runtime.testing.ts";
import {
  CommandCancellation,
  LifoCleanupRegistry,
  type CleanupFailure,
  type CleanupRegistry,
  type Clock,
  type CommandRuntime,
  type FileSystem,
  type HttpClient,
  type HttpRequest,
  type HttpResponse,
  type RuntimeEnvironment,
} from "../common/runtime.ts";
import type {ArtifactGenerationResult, GenerateArtifactsInput} from "../commands/generate/artifacts.ts";
import {getContainerAdapter} from "./adapters.ts";
import {createLocalStorageBootstrap, type LocalBlobStorageFactory, type LocalStorageBootstrap} from "./selfhost.bootstrap.ts";
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

function succeeded(stdout = ""): ProcessOutcome {
  return {kind: "succeeded", exitCode: 0, stdout, stderr: "", durationMs: 0};
}

function exited(code: number, stderr = ""): ProcessOutcome {
  return {kind: "exited", exitCode: code, stdout: "", stderr, durationMs: 0};
}

function cancelled(): ProcessOutcome {
  return {kind: "cancelled", stdout: "", stderr: "", durationMs: 0};
}

function succeededTimes(count: number): readonly ProcessOutcome[] {
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

type RecordedRunner = ProcessRunner & Readonly<{calls: readonly Readonly<{request: ProcessRequest; options: ProcessRunOptions}>[]}>;

interface HarnessOptions {
  readonly outcomes?: readonly ProcessOutcome[];
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
  readonly logger: MonorepositoryLogger;
  readonly sink: InMemoryLoggerSink;
  readonly bootstrap: RecordingBootstrap;
  readonly artifacts: ArtifactsStub;
  readonly runtimeFactory: CommandRuntimeFactory;
}

/**
 * Builds a fully faked selfhost command harness with no real infrastructure access.
 *
 * @param options - Optional scripted outcomes, environment, filesystem, and cleanup overrides.
 * @returns The command under test and every recording fake it was built with.
 */
function createHarness(options: Readonly<HarnessOptions> = {}): SelfhostHarness {
  const runner = createProcessRunner(options.outcomes ?? []);
  const clock = createRecordingClock();
  const files = options.files ?? createRepositoryFixtureFileSystem({[certFixturePath]: "local-cert", [keyFixturePath]: "local-key"});
  const sink = new InMemoryLoggerSink();
  const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});
  const bootstrap = createRecordingBootstrap(runner, options.bootstrapBehavior ?? {});
  const artifacts = options.artifacts ?? createArtifactsStub();
  const environment = environmentWith(options.variables ?? {MSSQL_SA_PASSWORD: sqlPassword});
  const runtimeFactory = createTestRuntimeFactory({
    runner,
    clock,
    files,
    logger,
    environment,
    ...(options.cleanup === undefined ? {} : {cleanup: options.cleanup}),
  });

  return {
    command: createSelfhostCommand({runtimeFactory, bootstrap: bootstrap.bootstrap, artifacts}),
    runner,
    clock,
    files,
    logger,
    sink,
    bootstrap,
    artifacts,
    runtimeFactory,
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
    "routes $path through the effect cli entrypoint with argument and exit-code propagation",
    async ({path, action, forwarding, shell}) => {
      const source = await readFile(new URL(path, import.meta.url), "utf8");
      const command = `node scripts/cli.ts dev selfhost ${action} ${forwarding}`;

      expect(source).not.toContain("scripts/dev-selfhost.mjs");
      expect(source).toContain(command);

      if (shell === "batch") {
        expect(source).toContain('pushd "%~dp0..\\.."');
        expect(source).toMatch(
          /node scripts\/cli\.ts dev selfhost (?:start|stop) %\*\r?\nset "EXIT_CODE=%ERRORLEVEL%"\r?\npopd\r?\nexit \/b %EXIT_CODE%/,
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

  it("preserves the initiating failure and appends cleanup evidence when transient cleanup fails", async () => {
    const cleanup = createRecordingCleanupRegistry([
      {label: "transient bootstrap listener", message: "listener teardown failed", cause: new Error("listener teardown failed")},
    ]);
    const harness = createHarness({
      cleanup,
      outcomes: [...succeededTimes(podmanPreflightProbeCount + 5), exited(1, "frontend stack refused to start")],
    });

    const execution = await harness.command.invoke({action: "start", engine: "podman"});

    expect(execution.status).toBe("failed");
    const failure = execution.status === "failed" ? execution.failure : undefined;
    expect(failure?.kind).toBe("operational");
    expect(failure?.evidence.at(-1)).toBe("transient bootstrap listener: listener teardown failed");
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
/** One ordered side effect observed while a characterized selfhost invocation ran. */
type TimelineEvent = Readonly<Record<string, unknown>>;

/** Replaces the generated Traefik paths, then the fixture root, with portable placeholders. */
function withPortableSelfhostPaths(text: string): string {
  return withPortablePaths(
    text.replaceAll(selfhostTraefikConfigPath, "<traefik-config>").replaceAll(dirname(selfhostTraefikConfigPath), "<traefik-dir>"),
  );
}

/** Process runner that appends every request to the shared timeline with the SQL password replaced. */
class TimelineRunner extends AbstractProcessRunner {
  readonly #timeline: TimelineEvent[];
  readonly #outcomes: ProcessOutcome[];
  readonly #requests: ProcessRequest[] = [];

  public constructor(timeline: TimelineEvent[], outcomes: readonly ProcessOutcome[]) {
    super();
    this.#timeline = timeline;
    this.#outcomes = [...outcomes];
  }

  /** Every raw request, in call order. */
  public get requests(): readonly ProcessRequest[] {
    return this.#requests;
  }

  /** {@inheritDoc AbstractProcessRunner.execute} */
  protected override execute(request: Readonly<ProcessRequest>, options: Readonly<ProcessRunOptions>): Promise<ProcessOutcome> {
    this.#requests.push(request);
    this.#timeline.push({
      process: request.command,
      args: request.args.map((arg) => arg.replaceAll(sqlPassword, "<sql-password>")),
      options: projectOptions(options),
    });
    return Promise.resolve(this.#outcomes.shift() ?? succeeded());
  }
}

/** Wraps a filesystem so every mutation is appended to the timeline. */
function timelineFiles(timeline: TimelineEvent[], files: FileSystem): FileSystem {
  return {
    ...files,
    createDirectory: (path, options) => {
      timeline.push({fs: "createDirectory", path: withPortableSelfhostPaths(path), options});
      return files.createDirectory(path, options);
    },
    writeText: (path, contents, options) => {
      timeline.push({fs: "writeText", path: withPortableSelfhostPaths(path), length: contents.length});
      return files.writeText(path, contents, options);
    },
    remove: (path, options) => {
      timeline.push({fs: "remove", path: withPortableSelfhostPaths(path), options});
      return files.remove(path, options);
    },
  };
}

/** HTTP client appending every request to the timeline and answering through `respond`. */
function timelineHttp(timeline: TimelineEvent[], respond: (request: Readonly<HttpRequest>) => HttpResponse): HttpClient {
  return {
    request: (request) => {
      timeline.push({
        http: request.method,
        url: request.url.href,
        headers: request.headers,
        body: request.body,
        maximumResponseBytes: request.maximumResponseBytes,
        signal: request.signal === undefined ? undefined : "<signal>",
      });
      return Promise.resolve(respond(request));
    },
  };
}

/** Blob-storage factory appending every provisioning step to the timeline. */
function timelineBlobStorage(timeline: TimelineEvent[]): LocalBlobStorageFactory {
  return (connectionString) => {
    timeline.push({blob: "connect", connectionString});
    return {
      ensureContainer: (name) => {
        timeline.push({blob: "ensureContainer", name});
        return Promise.resolve();
      },
      applyCorsPolicy: () => {
        timeline.push({blob: "applyCorsPolicy"});
        return Promise.resolve();
      },
    };
  };
}

/** Options of one characterized selfhost invocation. */
interface SelfhostCharacterizationOptions {
  readonly action: SelfhostAction;
  readonly variables?: Readonly<Record<string, string>>;
  readonly seededFiles?: Readonly<Record<string, string>>;
  readonly respond?: (request: Readonly<HttpRequest>) => HttpResponse;
  readonly presentation?: CommandPresentation;
}

/**
 * Runs the legacy selfhost command once with Rancher (human presentation by default), recording every
 * process, delay, file mutation, HTTP request, blob step, and artifact invocation in order.
 *
 * @param options - Action, environment, seeded files, Cosmos responder, and presentation.
 * @returns The projected execution, the ordered timeline, rendered output, cleanup labels, the
 * Traefik file bytes, and where the SQL password appeared in process arguments.
 */
async function characterizeSelfhost(options: Readonly<SelfhostCharacterizationOptions>): Promise<Readonly<Record<string, unknown>>> {
  const timeline: TimelineEvent[] = [];
  const runner = new TimelineRunner(timeline, []);
  const files = createRepositoryFixtureFileSystem({
    [certFixturePath]: "local-cert",
    [keyFixturePath]: "local-key",
    ...options.seededFiles,
  });
  const sink = new InMemoryLoggerSink();
  const cleanup = createRecordingCleanupRegistry();
  const clock: Clock = {
    monotonicNow: (): number => 0,
    isoTimestamp: (): string => "2025-01-01T00:00:00.000Z",
    delay: (milliseconds: number): Promise<void> => {
      timeline.push({delay: milliseconds});
      return Promise.resolve();
    },
  };
  const http = timelineHttp(timeline, options.respond ?? (() => createHttpResponse(201, "{}")));
  const artifacts = createArtifactsStub((input, invocation) => {
    timeline.push({artifacts: input, presentation: invocation?.presentation});
    return Promise.resolve({status: "completed", value: {summary: "Generated 5 artifact file(s).", generatedFiles: []}, exitCode: 0});
  });
  const command = createSelfhostCommand({
    runtimeFactory: presentationRuntimeFactory("selfhost", sink, {
      runner,
      clock,
      cleanup,
      http,
      files: timelineFiles(timeline, files),
      environment: characterizationEnvironment(options.variables ?? {MSSQL_SA_PASSWORD: sqlPassword}),
    }),
    bootstrap: createLocalStorageBootstrap({http, createBlobStorage: timelineBlobStorage(timeline)}),
    artifacts,
  });

  const execution = await command.invoke({action: options.action, engine: "rancher"}, {presentation: options.presentation ?? "human"});

  const rendered = {execution: projectExecution(execution), output: projectOutput(sink)};
  expect(JSON.stringify(rendered).includes(sqlPassword)).toBe(false);
  return {
    ...rendered,
    timeline,
    cleanupLabels: cleanup.labels,
    traefik: (await files.exists(selfhostTraefikConfigPath)) ? await files.readText(selfhostTraefikConfigPath) : null,
    passwordArgs: runner.requests.flatMap((request, call) =>
      request.args.flatMap((arg, index) =>
        arg.includes(sqlPassword)
          ? [{call, index, command: request.command, flag: request.args[index - 1], exact: arg === sqlPassword}]
          : [],
      ),
    ),
  };
}

describe("dev selfhost characterization (pre-Effect migration)", () => {
  it("start: preflight, artifacts, certificates, Traefik file, ordered stacks, bootstrap, and success line", async () => {
    expect(await characterizeSelfhost({action: "start"})).toEqual({
      execution: {
        status: "completed",
        value: {
          action: "start",
          engine: "rancher",
          stacks: ["management", "storage", "profile", "backend", "frontend"],
        },
        exitCode: 0,
      },
      output: [
        {
          stream: "stdout",
          text: "$ docker compose -f Management/docker-compose.yml up -d",
          write: false,
        },
        {
          stream: "stdout",
          text: "$ docker compose -f Storage/docker-compose.yml --profile selfhost up -d",
          write: false,
        },
        {
          stream: "stdout",
          text: "$ docker exec mssql /opt/mssql-tools/bin/sqlcmd -C -S localhost -U sa -P [REDACTED] -d master -i /usr/sql/sqlSchema.sql -No",
          write: false,
        },
        {
          stream: "stdout",
          text: "$ dotnet run --project ../../tooling/LocalDevelopment.Bootstrap -- --ensure-storage-only",
          write: false,
        },
        {
          stream: "stdout",
          text: "$ docker compose -f Backend/docker-compose.yml up -d",
          write: false,
        },
        {
          stream: "stdout",
          text: "$ docker compose -f Frontend/docker-compose.yml up -d",
          write: false,
        },
        {
          stream: "stdout",
          text: "[arolariu::selfhost] ✅ Selfhost start completed for engine 'rancher'.",
          write: false,
        },
      ],
      timeline: [
        {
          process: "docker",
          args: ["--version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["compose", "version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["ps", "-a", "--format", "{{.Names}}"],
          options: {
            signal: "<signal>",
          },
        },
        {
          artifacts: {
            verbose: false,
          },
          presentation: "silent",
        },
        {
          fs: "createDirectory",
          path: "<traefik-dir>",
          options: {
            recursive: true,
          },
        },
        {
          fs: "writeText",
          path: "<traefik-config>",
          length: 1310,
        },
        {
          process: "docker",
          args: ["compose", "-f", "Management/docker-compose.yml", "up", "-d"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          delay: 3000,
        },
        {
          process: "docker",
          args: ["compose", "-f", "Storage/docker-compose.yml", "--profile", "selfhost", "up", "-d"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          delay: 10000,
        },
        {
          process: "docker",
          args: [
            "exec",
            "mssql",
            "/opt/mssql-tools/bin/sqlcmd",
            "-C",
            "-S",
            "localhost",
            "-U",
            "sa",
            "-P",
            "<sql-password>",
            "-d",
            "master",
            "-i",
            "/usr/sql/sqlSchema.sql",
            "-No",
          ],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          http: "POST",
          url: "http://localhost:8081/dbs",
          headers: {
            "Content-Type": "application/json",
          },
          body: '{"id":"primary"}',
          maximumResponseBytes: 65536,
          signal: "<signal>",
        },
        {
          http: "POST",
          url: "http://localhost:8081/dbs/primary/colls",
          headers: {
            "Content-Type": "application/json",
          },
          body: '{"id":"invoices","partitionKey":{"paths":["/UserIdentifier"],"kind":"Hash"}}',
          maximumResponseBytes: 65536,
          signal: "<signal>",
        },
        {
          http: "POST",
          url: "http://localhost:8081/dbs/primary/colls",
          headers: {
            "Content-Type": "application/json",
          },
          body: '{"id":"merchants","partitionKey":{"paths":["/ParentCompanyId"],"kind":"Hash"}}',
          maximumResponseBytes: 65536,
          signal: "<signal>",
        },
        {
          blob: "connect",
          connectionString: "UseDevelopmentStorage=true",
        },
        {
          blob: "ensureContainer",
          name: "invoices",
        },
        {
          blob: "applyCorsPolicy",
        },
        {
          process: "dotnet",
          args: ["run", "--project", "../../tooling/LocalDevelopment.Bootstrap", "--", "--ensure-storage-only"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
            env: {
              DOTNET_ENVIRONMENT: "Development",
              INFRA: "local",
              ConnectionStrings__blobs: "UseDevelopmentStorage=true",
              ConnectionStrings__queues: "UseDevelopmentStorage=true",
            },
          },
        },
        {
          delay: 3000,
        },
        {
          process: "docker",
          args: ["compose", "-f", "Backend/docker-compose.yml", "up", "-d"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          delay: 3000,
        },
        {
          process: "docker",
          args: ["compose", "-f", "Frontend/docker-compose.yml", "up", "-d"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          delay: 3000,
        },
      ],
      cleanupLabels: [],
      traefik:
        "http:\n  routers:\n    traefik-localhost:\n      rule: Host(`traefik.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: api@internal\n    website-localhost:\n      rule: Host(`website.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: website\n    api-localhost:\n      rule: Host(`api.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: api\n    health-localhost:\n      rule: Host(`health.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: healthchecks\n    cosmosdb-localhost:\n      rule: Host(`cosmosdb.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: cosmosdb\n    azurite-blob-localhost:\n      rule: Host(`azurite-blob.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: azurite-blob\n  services:\n    website:\n      loadBalancer:\n        servers:\n          - url: http://website:3000\n    api:\n      loadBalancer:\n        servers:\n          - url: http://api:8080\n    healthchecks:\n      loadBalancer:\n        servers:\n          - url: http://healthchecks:8000\n    cosmosdb:\n      loadBalancer:\n        servers:\n          - url: http://cosmosdb:8081\n    azurite-blob:\n      loadBalancer:\n        servers:\n          - url: http://azurite:10000\n",
      passwordArgs: [
        {
          call: 6,
          index: 9,
          command: "docker",
          flag: "-P",
          exact: true,
        },
      ],
    });
  });

  it("start with a failing Cosmos bootstrap: exit 1, the message, and no compensating cleanup", async () => {
    expect(
      await characterizeSelfhost({
        action: "start",
        respond: (request) =>
          request.url.pathname === "/dbs" ? createHttpResponse(503, "emulator starting") : createHttpResponse(201, "{}"),
      }),
    ).toEqual({
      execution: {
        status: "failed",
        exitCode: 1,
        failure: {
          kind: "operational",
          message:
            "Cosmos bootstrap failed. Ensure the cosmosdb container is running and reachable at http://localhost:8081. Original error: Cosmos bootstrap failed for http://localhost:8081/dbs: HTTP 503 emulator starting",
          evidence: [],
          cause: "ContainerRuntimeError",
        },
      },
      output: [
        {
          stream: "stdout",
          text: "$ docker compose -f Management/docker-compose.yml up -d",
          write: false,
        },
        {
          stream: "stdout",
          text: "$ docker compose -f Storage/docker-compose.yml --profile selfhost up -d",
          write: false,
        },
        {
          stream: "stdout",
          text: "$ docker exec mssql /opt/mssql-tools/bin/sqlcmd -C -S localhost -U sa -P [REDACTED] -d master -i /usr/sql/sqlSchema.sql -No",
          write: false,
        },
        {
          stream: "stderr",
          text: "[arolariu::selfhost] ⛔ Cosmos bootstrap failed. Ensure the cosmosdb container is running and reachable at http://localhost:8081. Original error: Cosmos bootstrap failed for http://localhost:8081/dbs: HTTP 503 emulator starting",
          write: false,
        },
      ],
      timeline: [
        {
          process: "docker",
          args: ["--version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["compose", "version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["ps", "-a", "--format", "{{.Names}}"],
          options: {
            signal: "<signal>",
          },
        },
        {
          artifacts: {
            verbose: false,
          },
          presentation: "silent",
        },
        {
          fs: "createDirectory",
          path: "<traefik-dir>",
          options: {
            recursive: true,
          },
        },
        {
          fs: "writeText",
          path: "<traefik-config>",
          length: 1310,
        },
        {
          process: "docker",
          args: ["compose", "-f", "Management/docker-compose.yml", "up", "-d"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          delay: 3000,
        },
        {
          process: "docker",
          args: ["compose", "-f", "Storage/docker-compose.yml", "--profile", "selfhost", "up", "-d"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          delay: 10000,
        },
        {
          process: "docker",
          args: [
            "exec",
            "mssql",
            "/opt/mssql-tools/bin/sqlcmd",
            "-C",
            "-S",
            "localhost",
            "-U",
            "sa",
            "-P",
            "<sql-password>",
            "-d",
            "master",
            "-i",
            "/usr/sql/sqlSchema.sql",
            "-No",
          ],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          http: "POST",
          url: "http://localhost:8081/dbs",
          headers: {
            "Content-Type": "application/json",
          },
          body: '{"id":"primary"}',
          maximumResponseBytes: 65536,
          signal: "<signal>",
        },
      ],
      cleanupLabels: [],
      traefik:
        "http:\n  routers:\n    traefik-localhost:\n      rule: Host(`traefik.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: api@internal\n    website-localhost:\n      rule: Host(`website.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: website\n    api-localhost:\n      rule: Host(`api.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: api\n    health-localhost:\n      rule: Host(`health.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: healthchecks\n    cosmosdb-localhost:\n      rule: Host(`cosmosdb.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: cosmosdb\n    azurite-blob-localhost:\n      rule: Host(`azurite-blob.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: azurite-blob\n  services:\n    website:\n      loadBalancer:\n        servers:\n          - url: http://website:3000\n    api:\n      loadBalancer:\n        servers:\n          - url: http://api:8080\n    healthchecks:\n      loadBalancer:\n        servers:\n          - url: http://healthchecks:8000\n    cosmosdb:\n      loadBalancer:\n        servers:\n          - url: http://cosmosdb:8081\n    azurite-blob:\n      loadBalancer:\n        servers:\n          - url: http://azurite:10000\n",
      passwordArgs: [
        {
          call: 6,
          index: 9,
          command: "docker",
          flag: "-P",
          exact: true,
        },
      ],
    });
  });

  it("start without MSSQL_SA_PASSWORD: exit 1 before any stack command", async () => {
    expect(await characterizeSelfhost({action: "start", variables: {}})).toEqual({
      execution: {
        status: "failed",
        exitCode: 1,
        failure: {
          kind: "operational",
          message:
            "MSSQL_SA_PASSWORD environment variable is required for selfhost SQL bootstrap. Set it in your shell/session environment only; do not commit it to .env files, launch profiles, or source control.",
          evidence: [],
          cause: "ContainerRuntimeError",
        },
      },
      output: [
        {
          stream: "stderr",
          text: "[arolariu::selfhost] ⛔ MSSQL_SA_PASSWORD environment variable is required for selfhost SQL bootstrap. Set it in your shell/session environment only; do not commit it to .env files, launch profiles, or source control.",
          write: false,
        },
      ],
      timeline: [
        {
          process: "docker",
          args: ["--version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["compose", "version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["ps", "-a", "--format", "{{.Names}}"],
          options: {
            signal: "<signal>",
          },
        },
        {
          artifacts: {
            verbose: false,
          },
          presentation: "silent",
        },
      ],
      cleanupLabels: [],
      traefik: null,
      passwordArgs: [],
    });
  });

  it("stop: reverse-order compose down, then the Traefik file removal", async () => {
    expect(await characterizeSelfhost({action: "stop", seededFiles: {[selfhostTraefikConfigPath]: "generated traefik config"}})).toEqual({
      execution: {
        status: "completed",
        value: {
          action: "stop",
          engine: "rancher",
          stacks: ["frontend", "backend", "storage", "management"],
        },
        exitCode: 0,
      },
      output: [
        {
          stream: "stdout",
          text: "$ docker compose -f Frontend/docker-compose.yml down",
          write: false,
        },
        {
          stream: "stdout",
          text: "$ docker compose -f Backend/docker-compose.yml down",
          write: false,
        },
        {
          stream: "stdout",
          text: "$ docker compose -f Storage/docker-compose.yml down",
          write: false,
        },
        {
          stream: "stdout",
          text: "$ docker compose -f Management/docker-compose.yml down",
          write: false,
        },
        {
          stream: "stdout",
          text: "[arolariu::selfhost] ✅ Selfhost stop completed for engine 'rancher'.",
          write: false,
        },
      ],
      timeline: [
        {
          process: "docker",
          args: ["--version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["compose", "version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["ps", "-a", "--format", "{{.Names}}"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["compose", "-f", "Frontend/docker-compose.yml", "down"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          delay: 3000,
        },
        {
          process: "docker",
          args: ["compose", "-f", "Backend/docker-compose.yml", "down"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          delay: 3000,
        },
        {
          process: "docker",
          args: ["compose", "-f", "Storage/docker-compose.yml", "down"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          delay: 3000,
        },
        {
          process: "docker",
          args: ["compose", "-f", "Management/docker-compose.yml", "down"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          delay: 3000,
        },
        {
          fs: "remove",
          path: "<traefik-config>",
          options: {
            force: true,
          },
        },
      ],
      cleanupLabels: [],
      traefik: null,
      passwordArgs: [],
    });
  });

  it("logs: engine-owned logs commands without delays, artifacts, or Traefik changes", async () => {
    expect(await characterizeSelfhost({action: "logs"})).toEqual({
      execution: {
        status: "completed",
        value: {
          action: "logs",
          engine: "rancher",
          stacks: ["profile", "backend", "frontend"],
        },
        exitCode: 0,
      },
      output: [
        {
          stream: "stdout",
          text: "$ docker logs --tail 100 exp-arolariu-ro",
          write: false,
        },
        {
          stream: "stdout",
          text: "$ docker logs --tail 100 api-arolariu-ro",
          write: false,
        },
        {
          stream: "stdout",
          text: "$ docker logs --tail 100 website-arolariu-ro",
          write: false,
        },
        {
          stream: "stdout",
          text: "[arolariu::selfhost] ✅ Selfhost logs completed for engine 'rancher'.",
          write: false,
        },
      ],
      timeline: [
        {
          process: "docker",
          args: ["--version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["compose", "version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["ps", "-a", "--format", "{{.Names}}"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["logs", "--tail", "100", "exp-arolariu-ro"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["logs", "--tail", "100", "api-arolariu-ro"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["logs", "--tail", "100", "website-arolariu-ro"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
      ],
      cleanupLabels: [],
      traefik: null,
      passwordArgs: [],
    });
  });
  it("start (json): every stack starts and bootstrap runs, then legacy fails with exit 1 because it has no JSON document", async () => {
    expect(await characterizeSelfhost({action: "start", presentation: "json"})).toEqual({
      execution: {
        status: "failed",
        exitCode: 1,
        failure: {
          kind: "internal",
          message: 'Command "selfhost" selected JSON presentation without a JSON document.',
          evidence: [],
          cause: "undefined",
        },
      },
      output: [
        {
          stream: "stderr",
          text: 'Command "selfhost" selected JSON presentation without a JSON document.',
          write: false,
        },
      ],
      timeline: [
        {
          process: "docker",
          args: ["--version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["compose", "version"],
          options: {
            signal: "<signal>",
          },
        },
        {
          process: "docker",
          args: ["ps", "-a", "--format", "{{.Names}}"],
          options: {
            signal: "<signal>",
          },
        },
        {
          artifacts: {
            verbose: false,
          },
          presentation: "silent",
        },
        {
          fs: "createDirectory",
          path: "<traefik-dir>",
          options: {
            recursive: true,
          },
        },
        {
          fs: "writeText",
          path: "<traefik-config>",
          length: 1310,
        },
        {
          process: "docker",
          args: ["compose", "-f", "Management/docker-compose.yml", "up", "-d"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          delay: 3000,
        },
        {
          process: "docker",
          args: ["compose", "-f", "Storage/docker-compose.yml", "--profile", "selfhost", "up", "-d"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          delay: 10000,
        },
        {
          process: "docker",
          args: [
            "exec",
            "mssql",
            "/opt/mssql-tools/bin/sqlcmd",
            "-C",
            "-S",
            "localhost",
            "-U",
            "sa",
            "-P",
            "<sql-password>",
            "-d",
            "master",
            "-i",
            "/usr/sql/sqlSchema.sql",
            "-No",
          ],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          http: "POST",
          url: "http://localhost:8081/dbs",
          headers: {
            "Content-Type": "application/json",
          },
          body: '{"id":"primary"}',
          maximumResponseBytes: 65536,
          signal: "<signal>",
        },
        {
          http: "POST",
          url: "http://localhost:8081/dbs/primary/colls",
          headers: {
            "Content-Type": "application/json",
          },
          body: '{"id":"invoices","partitionKey":{"paths":["/UserIdentifier"],"kind":"Hash"}}',
          maximumResponseBytes: 65536,
          signal: "<signal>",
        },
        {
          http: "POST",
          url: "http://localhost:8081/dbs/primary/colls",
          headers: {
            "Content-Type": "application/json",
          },
          body: '{"id":"merchants","partitionKey":{"paths":["/ParentCompanyId"],"kind":"Hash"}}',
          maximumResponseBytes: 65536,
          signal: "<signal>",
        },
        {
          blob: "connect",
          connectionString: "UseDevelopmentStorage=true",
        },
        {
          blob: "ensureContainer",
          name: "invoices",
        },
        {
          blob: "applyCorsPolicy",
        },
        {
          process: "dotnet",
          args: ["run", "--project", "../../tooling/LocalDevelopment.Bootstrap", "--", "--ensure-storage-only"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
            env: {
              DOTNET_ENVIRONMENT: "Development",
              INFRA: "local",
              ConnectionStrings__blobs: "UseDevelopmentStorage=true",
              ConnectionStrings__queues: "UseDevelopmentStorage=true",
            },
          },
        },
        {
          delay: 3000,
        },
        {
          process: "docker",
          args: ["compose", "-f", "Backend/docker-compose.yml", "up", "-d"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          delay: 3000,
        },
        {
          process: "docker",
          args: ["compose", "-f", "Frontend/docker-compose.yml", "up", "-d"],
          options: {
            cwd: "infra/Local",
            output: "tee",
            logCommands: true,
            logger: "<logger>",
            signal: "<signal>",
          },
        },
        {
          delay: 3000,
        },
      ],
      cleanupLabels: [],
      traefik:
        "http:\n  routers:\n    traefik-localhost:\n      rule: Host(`traefik.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: api@internal\n    website-localhost:\n      rule: Host(`website.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: website\n    api-localhost:\n      rule: Host(`api.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: api\n    health-localhost:\n      rule: Host(`health.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: healthchecks\n    cosmosdb-localhost:\n      rule: Host(`cosmosdb.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: cosmosdb\n    azurite-blob-localhost:\n      rule: Host(`azurite-blob.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: azurite-blob\n  services:\n    website:\n      loadBalancer:\n        servers:\n          - url: http://website:3000\n    api:\n      loadBalancer:\n        servers:\n          - url: http://api:8080\n    healthchecks:\n      loadBalancer:\n        servers:\n          - url: http://healthchecks:8000\n    cosmosdb:\n      loadBalancer:\n        servers:\n          - url: http://cosmosdb:8081\n    azurite-blob:\n      loadBalancer:\n        servers:\n          - url: http://azurite:10000\n",
      passwordArgs: [
        {
          call: 6,
          index: 9,
          command: "docker",
          flag: "-P",
          exact: true,
        },
      ],
    });
  });
});
