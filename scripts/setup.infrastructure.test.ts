// @vitest-environment node
/**
 * @fileoverview Contract tests for local infrastructure preparation.
 * @module scripts.setup.infrastructure.test
 *
 * @remarks
 * All readiness observations are consumed from shared {@link InfrastructureFacts} via
 * `context.inspection.inspect("infrastructure")`. Tests inject a controllable fake
 * {@link RepositoryInspectionSession} that resolves the `"infrastructure"` key through
 * a call-ordered sequence, tracks invalidation events, and records
 * `updateInfrastructureEngine` calls.
 *
 * Every test drives the real phase against an injected {@link SetupPhaseRuntime}: a recording
 * process runner replaying typed {@link ProcessOutcome} fixtures, an in-memory filesystem seeded
 * with the non-secret local tooling configuration, a deterministic clock, and an immutable
 * environment snapshot that supplies the host platform, environment variables, and interactive
 * terminal state. No test in this file reads the live checkout, spawns a real process, or mutates
 * disk.
 */

import {dirname, resolve} from "node:path";
import {describe, expect, it, vi} from "vitest";

import type {CommandContext} from "./common/commander.ts";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import {AbstractProcessRunner, type ProcessOutcome, type ProcessRequest, type ProcessRunOptions} from "./common/runner.ts";
import {createMemoryFileSystem, createTestRuntimeFactory} from "./common/runtime.testing.ts";
import type {Clock, FileSystem, RuntimeEnvironment} from "./common/runtime.ts";
import type {ToolingConfigV1} from "./common/tooling-config.ts";
import {requiredLocalPorts} from "./container-runtime/preflight.ts";
import type {ContainerEngine} from "./container-runtime/types.ts";
import type {InfrastructureFacts, PortFact} from "./inspection/infrastructure.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";
import {createInfrastructureSetupPhase, infrastructureSetupPhase, selectContainerInstallationProposal} from "./setup.infrastructure.ts";
import type {SetupAction, SetupActionDisposition, SetupActionExecutor, SetupContext, SetupInput, SetupPhaseRuntime} from "./setup.types.ts";

// ---------------------------------------------------------------------------
// Fact fixtures
// ---------------------------------------------------------------------------

const ROOT = resolve(process.cwd(), ".synthetic", "setup-infrastructure-root");
const paths = createRepositoryPaths(ROOT);
const certificatePath = resolve(ROOT, "infra", "Local", "Management", "certs", "local-cert.pem");
const certificateKeyPath = resolve(ROOT, "infra", "Local", "Management", "certs", "local-key.pem");

function allPortsAvailable(): readonly PortFact[] {
  return requiredLocalPorts.map((port) => ({port, available: true}));
}

function infrastructureAvailable(patch: Partial<InfrastructureFacts> = {}): InspectionOutcome<InfrastructureFacts> {
  return {
    kind: "available",
    value: {
      selectedEngine: "rancher",
      cliAvailable: true,
      backendAvailable: true,
      composeAvailable: true,
      dockerConflict: false,
      socketContextIssues: [],
      ports: allPortsAvailable(),
      certificateIssues: [],
      manifestIssues: [],
      containers: [],
      ...patch,
    },
    durationMs: 1,
  };
}

function unavailableInfra(reason = "Test unavailable."): InspectionOutcome<InfrastructureFacts> {
  return {kind: "unavailable", reason, durationMs: 1};
}

// ---------------------------------------------------------------------------
// Process outcome fixtures and fake runner
// ---------------------------------------------------------------------------

function succeeded(patch: Readonly<{stdout?: string; stderr?: string}> = {}): ProcessOutcome {
  return {kind: "succeeded", exitCode: 0, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function exited(exitCode: number, patch: Readonly<{stdout?: string; stderr?: string}> = {}): ProcessOutcome {
  return {kind: "exited", exitCode, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function spawnFailed(message: string): ProcessOutcome {
  return {kind: "spawn-failed", message, stdout: "", stderr: "", durationMs: 1};
}

function commandKey(command: Readonly<ProcessRequest>): string {
  return [command.command, ...command.args].join(" ");
}

/** One recorded child invocation. */
type RecordedCall = Readonly<{request: ProcessRequest; options: ProcessRunOptions}>;

/** Records every invocation while replaying request-keyed typed outcomes. */
class FakeProcessRunner extends AbstractProcessRunner {
  readonly #responses: Readonly<Record<string, ProcessOutcome | readonly ProcessOutcome[]>>;
  readonly #offsets = new Map<string, number>();
  readonly #calls: RecordedCall[] = [];

  public constructor(responses: Readonly<Record<string, ProcessOutcome | readonly ProcessOutcome[]>> = {}) {
    super();
    this.#responses = responses;
  }

  /** Every recorded invocation, in call order. */
  public get calls(): readonly RecordedCall[] {
    return this.#calls;
  }

  /** {@inheritDoc AbstractProcessRunner.execute} */
  protected override execute(request: Readonly<ProcessRequest>, options: Readonly<ProcessRunOptions>): Promise<ProcessOutcome> {
    this.#calls.push({request, options});
    const key = commandKey(request);
    const configured = this.#responses[key];
    if (configured === undefined) {
      return Promise.resolve(succeeded());
    }
    if (!Array.isArray(configured)) {
      return Promise.resolve(configured as ProcessOutcome);
    }
    const sequence = configured as readonly ProcessOutcome[];
    const offset = this.#offsets.get(key) ?? 0;
    this.#offsets.set(key, offset + 1);
    return Promise.resolve(sequence[offset] ?? sequence.at(-1) ?? succeeded());
  }
}

function requirements(): RepositoryRequirements {
  return {
    node: {major: 24, minor: 0, patch: 0},
    npm: {major: 11, minor: 0, patch: 0},
    dotnet: {major: 10, minor: 0, patch: 0},
    python: {major: 3, minor: 12, patch: 0},
    packages: new Map(),
  };
}

type SetupInputPatch = Partial<Omit<SetupInput, "engine">> & {readonly engine?: SetupInput["engine"] | undefined};

function setupOptions(patch: SetupInputPatch = {}): SetupInput {
  const engine = Object.hasOwn(patch, "engine") ? patch.engine : "rancher";
  return {
    verbose: patch.verbose ?? false,
    dryRun: patch.dryRun ?? false,
    yes: patch.yes ?? false,
    ...(engine === undefined ? {} : {engine}),
  };
}

function createActions(dispositions: Readonly<Record<string, SetupActionDisposition>> = {}): Readonly<{
  actions: SetupActionExecutor;
  records: SetupAction[];
}> {
  const records: SetupAction[] = [];
  return {
    records,
    actions: {
      run: async (action) => {
        records.push(action);
        const disposition = dispositions[action.id] ?? "executed";
        if (disposition === "executed") {
          await action.execute();
        }
        return disposition;
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Inspection harness
// ---------------------------------------------------------------------------

interface InspectionHarness {
  readonly session: RepositoryInspectionSession;
  readonly inspect: ReturnType<typeof vi.fn>;
  readonly invalidate: ReturnType<typeof vi.fn>;
  readonly updateInfrastructureEngine: ReturnType<typeof vi.fn>;
  readonly events: string[];
}

function createInspectionHarness(
  input: Readonly<{
    infrastructure?: readonly InspectionOutcome<InfrastructureFacts>[];
  }> = {},
): InspectionHarness {
  const sequences: Readonly<Record<string, readonly InspectionOutcome<unknown>[]>> = {
    infrastructure: input.infrastructure ?? [infrastructureAvailable()],
  };
  const offsets = new Map<string, number>();
  const events: string[] = [];
  const inspect = vi.fn(async (key: string) => {
    events.push(`inspect:${key}`);
    const sequence = sequences[key];
    if (sequence === undefined || sequence.length === 0) {
      return {kind: "unavailable" as const, reason: "Not exercised by this test.", durationMs: 0};
    }
    const offset = offsets.get(key) ?? 0;
    offsets.set(key, offset + 1);
    return sequence[Math.min(offset, sequence.length - 1)]!;
  });
  const invalidate = vi.fn((...keys: readonly string[]) => {
    events.push(`invalidate:${keys.join("+")}`);
  });
  const updateInfrastructureEngine = vi.fn((_engine: ContainerEngine) => {
    events.push("updateInfrastructureEngine");
  });
  return {
    session: {inspect, invalidate, updateInfrastructureEngine} as unknown as RepositoryInspectionSession,
    inspect,
    invalidate,
    updateInfrastructureEngine,
    events,
  };
}

// ---------------------------------------------------------------------------
// Filesystem harness
// ---------------------------------------------------------------------------

type ToolingConfigSeed =
  Readonly<{status: "missing"}> | Readonly<{status: "valid"; config: ToolingConfigV1}> | Readonly<{status: "invalid"}>;

/** Seeds the in-memory filesystem's non-secret local tooling configuration file. */
function seedToolingConfig(seed: ToolingConfigSeed): Readonly<Record<string, string>> {
  if (seed.status === "missing") {
    return {};
  }
  if (seed.status === "invalid") {
    // A secret-shaped key is rejected by `parseToolingConfig` regardless of where it is nested,
    // producing a real `"invalid"` read result without hand-crafting one.
    return {[paths.toolingConfig]: JSON.stringify({schemaVersion: 1, token: "leaked"})};
  }
  return {[paths.toolingConfig]: JSON.stringify(seed.config)};
}

/** Tracks every write and directory creation the phase requests against the fixture filesystem. */
interface TrackedFileSystem {
  readonly files: FileSystem;
  readonly writes: readonly Readonly<{path: string; config: ToolingConfigV1}>[];
  readonly createdDirectories: readonly string[];
}

function createTrackedFileSystem(seed: ToolingConfigSeed): TrackedFileSystem {
  const memory = createMemoryFileSystem(seedToolingConfig(seed));
  const writes: Readonly<{path: string; config: ToolingConfigV1}>[] = [];
  const createdDirectories: string[] = [];
  const files: FileSystem = {
    ...memory,
    createDirectory: async (path, options) => {
      createdDirectories.push(path);
      await memory.createDirectory(path, options);
    },
    writeTextAtomic: async (path, contents, options) => {
      writes.push({path, config: JSON.parse(contents) as ToolingConfigV1});
      await memory.writeTextAtomic(path, contents, options);
    },
  };
  return {files, writes, createdDirectories};
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

/** The exact context view the migrated infrastructure phase reads. */
type MigratedSetupContext = Omit<SetupContext, "runner" | "now"> & Readonly<{runtime: SetupPhaseRuntime}>;

function environmentSnapshot(
  platform: NodeJS.Platform,
  variables: Readonly<Record<string, string | undefined>>,
  stdinIsTTY: boolean,
): RuntimeEnvironment {
  return {
    variables,
    cwd: paths.root,
    executablePath: "C:\\Program Files\\nodejs\\node.exe",
    platform,
    architecture: "x64",
    stdinIsTTY,
    stdoutIsTTY: false,
    isCI: true,
  };
}

interface HarnessInput {
  readonly options?: SetupInput;
  readonly environmentVariables?: Readonly<Record<string, string | undefined>>;
  readonly stdinIsTTY?: boolean;
  readonly platform?: NodeJS.Platform;
  readonly config?: ToolingConfigSeed;
  readonly responses?: Readonly<Record<string, ProcessOutcome | readonly ProcessOutcome[]>>;
  readonly dispositions?: Readonly<Record<string, SetupActionDisposition>>;
  readonly actions?: SetupActionExecutor;
  readonly select?: SetupContext["prompts"]["select"];
  readonly infrastructure?: readonly InspectionOutcome<InfrastructureFacts>[];
}

interface Harness {
  readonly phase: ReturnType<typeof createInfrastructureSetupPhase>;
  readonly context: MigratedSetupContext;
  readonly runner: FakeProcessRunner;
  readonly select: ReturnType<typeof vi.fn>;
  readonly actionRecords: SetupAction[];
  readonly writes: TrackedFileSystem["writes"];
  readonly createdDirectories: TrackedFileSystem["createdDirectories"];
  readonly inspection: InspectionHarness;
}

async function createHarness(input: HarnessInput = {}): Promise<Harness> {
  const runner = new FakeProcessRunner(input.responses);
  const selected =
    input.select
    ?? (async <TValue extends string>(_message: string, choices: readonly Readonly<{value: TValue; label: string}>[]): Promise<TValue> => {
      const choice = choices[0]?.value;
      if (choice === undefined) {
        throw new Error("Expected an interactive choice.");
      }
      return choice;
    });
  const select = vi.fn<SetupContext["prompts"]["select"]>(selected);
  const {actions: builtActions, records: actionRecords} = createActions(input.dispositions);
  const inspection = createInspectionHarness({
    ...(input.infrastructure === undefined ? {} : {infrastructure: input.infrastructure}),
  });
  const {files, writes, createdDirectories} = createTrackedFileSystem(input.config ?? {status: "missing"});

  let elapsed = 0;
  const clock: Clock = {
    monotonicNow: (): number => elapsed++,
    isoTimestamp: (): string => "2026-09-01T00:00:00.000Z",
    delay: (): Promise<void> => Promise.resolve(),
  };

  const environment = environmentSnapshot(input.platform ?? "win32", input.environmentVariables ?? {}, input.stdinIsTTY ?? true);

  const factory = createTestRuntimeFactory({files, runner, clock, environment});
  const commandRuntime = await factory.createRoot({presentation: "silent", registerProcessSignals: false});
  const command: CommandContext = {runtime: commandRuntime, presentation: "silent"};

  const runtime: SetupPhaseRuntime = {
    command,
    runner: commandRuntime.runner,
    files: commandRuntime.files,
    http: commandRuntime.http,
    clock: commandRuntime.clock,
    tasks: commandRuntime.tasks,
    environment: commandRuntime.environment,
    invokeGenerate: vi.fn<SetupPhaseRuntime["invokeGenerate"]>(() =>
      Promise.reject(new Error("The infrastructure setup phase must never invoke generation.")),
    ),
  };

  const context: MigratedSetupContext = {
    options: input.options ?? setupOptions(),
    paths,
    requirements: requirements(),
    inspection: inspection.session,
    runtime,
    prompts: {
      confirm: async () => true,
      select: select as SetupContext["prompts"]["select"],
      text: async () => "",
      secret: async () => "",
    },
    actions: input.actions ?? builtActions,
    logger: new MonorepositoryConsoleLogger("setup::infrastructure", {
      color: false,
      sink: new InMemoryLoggerSink(),
    }),
  };

  const phase = createInfrastructureSetupPhase();

  return {phase, context, runner, select, actionRecords, writes, createdDirectories, inspection};
}

function runPhase(harness: Harness) {
  return harness.phase.run(harness.context as SetupContext);
}

// ============================================================================
// Tests
// ============================================================================

describe("infrastructure setup public contract", () => {
  it("publishes an independent required phase", () => {
    expect(infrastructureSetupPhase).toMatchObject({
      id: "infrastructure",
      title: "Local infrastructure",
      required: true,
      dependsOn: [],
      run: expect.any(Function),
    });
    expect(createInfrastructureSetupPhase).toEqual(expect.any(Function));
    expect(selectContainerInstallationProposal).toEqual(expect.any(Function));
  });
});

describe("selectContainerInstallationProposal", () => {
  it.each([
    ["win32", "rancher", ["winget"], {command: {command: "winget", args: expect.arrayContaining(["SUSE.RancherDesktop"])}}],
    ["win32", "podman", ["winget"], {command: {command: "winget", args: expect.arrayContaining(["RedHat.Podman-Desktop"])}}],
    ["darwin", "rancher", ["brew"], {command: {command: "brew", args: ["install", "--cask", "rancher"]}}],
    ["darwin", "podman", ["brew"], {command: {command: "brew", args: ["install", "--cask", "podman-desktop"]}}],
    ["linux", "podman", ["apt-get"], {command: {command: "sudo", args: expect.arrayContaining(["podman"])}}],
    ["linux", "podman", ["dnf"], {command: {command: "sudo", args: expect.arrayContaining(["podman"])}}],
  ] as const)("returns the reviewed %s/%s proposal", (platform, engine, managers, expected) => {
    expect(selectContainerInstallationProposal({engine, platform, availablePackageManagers: new Set(managers)})).toMatchObject(expected);
  });

  it.each([
    ["linux", "rancher", ["apt-get"]],
    ["win32", "rancher", []],
    ["darwin", "podman", []],
    ["freebsd", "podman", ["pkg"]],
  ] as const)("returns null for unsupported %s/%s automation", (platform, engine, managers) => {
    expect(selectContainerInstallationProposal({engine, platform, availablePackageManagers: new Set(managers)})).toBeNull();
  });
});

describe("engine selection and persistence", () => {
  it("prefers the CLI option and persists only the schema and container engine", async () => {
    const harness = await createHarness({
      options: setupOptions({engine: "podman"}),
      environmentVariables: {AROLARIU_CONTAINER_ENGINE: "rancher"},
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(result.evidence).toContain("Selected Podman Desktop from argument.");
    expect(harness.writes).toEqual([{path: paths.toolingConfig, config: {schemaVersion: 1, containerEngine: "podman"}}]);
  });

  it("prefers the environment over persisted configuration", async () => {
    const harness = await createHarness({
      options: setupOptions({engine: undefined}),
      environmentVariables: {AROLARIU_CONTAINER_ENGINE: "podman"},
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.evidence).toContain("Selected Podman Desktop from environment.");
    expect(harness.writes).toEqual([expect.objectContaining({config: expect.objectContaining({containerEngine: "podman"})})]);
  });

  it("uses the persisted selection without scheduling a redundant write", async () => {
    const harness = await createHarness({
      options: setupOptions({engine: undefined}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "podman"}},
      infrastructure: [infrastructureAvailable({selectedEngine: "podman"})],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(result.evidence).toContain("Selected Podman Desktop from configuration.");
    expect(harness.actionRecords.map(({id}) => id)).not.toContain("infrastructure.engine.persist");
    expect(harness.writes).toHaveLength(0);
  });

  it("calls updateInfrastructureEngine with the selected engine", async () => {
    const harness = await createHarness({
      options: setupOptions({engine: "podman"}),
      infrastructure: [infrastructureAvailable({selectedEngine: "podman"})],
    });

    await runPhase(harness);

    expect(harness.inspection.updateInfrastructureEngine).toHaveBeenCalledWith("podman");
  });

  it("prompts with explicit runtime requirements only when interactive selection is required", async () => {
    const harness = await createHarness({
      options: setupOptions({engine: undefined, yes: true}),
      stdinIsTTY: true,
      select: async <TValue extends string>(_message: string, choices: readonly Readonly<{value: TValue; label: string}>[]) => {
        expect(choices).toEqual([
          {value: "rancher", label: "Rancher Desktop (Moby/dockerd; Docker Desktop must be stopped)"},
          {value: "podman", label: "Podman Desktop (podman compose provider required)"},
        ]);
        const podman = choices.find(({value}) => value === "podman");
        if (podman === undefined) {
          throw new Error("Expected the Podman choice.");
        }
        return podman.value;
      },
      infrastructure: [infrastructureAvailable({selectedEngine: "podman"})],
    });

    const result = await runPhase(harness);

    expect(result.evidence).toContain("Selected Podman Desktop interactively.");
    expect(harness.select).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])("does not invent a noninteractive selection when --yes is %s", async (yes) => {
    const harness = await createHarness({
      options: setupOptions({engine: undefined, yes}),
      stdinIsTTY: false,
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.nextActions[0]).toBe("npm run setup -- --engine rancher|podman");
    expect(harness.select).not.toHaveBeenCalled();
  });

  it.each(["docker", "docker-desktop", "colima"])("blocks unsupported environment selection %s without prompting", async (value) => {
    const harness = await createHarness({
      options: setupOptions({engine: undefined}),
      environmentVariables: {AROLARIU_CONTAINER_ENGINE: value},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(value === "colima" ? /Unsupported container engine/u : /Docker Desktop is deprecated/u);
  });

  it("blocks invalid configuration without prompting or overwriting it", async () => {
    const harness = await createHarness({
      options: setupOptions({engine: undefined}),
      config: {status: "invalid"},
    });

    const result = await runPhase(harness);

    expect(result).toMatchObject({status: "failed", summary: expect.stringContaining("tooling configuration is invalid")});
    expect(harness.writes).toHaveLength(0);
    expect(harness.actionRecords).toHaveLength(0);
  });

  it("plans changed selection persistence without writing during dry-run", async () => {
    const harness = await createHarness({
      options: setupOptions({engine: "podman", dryRun: true}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
      dispositions: {"infrastructure.engine.persist": "planned"},
      infrastructure: [infrastructureAvailable({selectedEngine: "podman"})],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(result.evidence).toContain("Planned action: infrastructure.engine.persist");
    expect(harness.writes).toHaveLength(0);
  });

  it("invalidates infrastructure after executed engine persistence", async () => {
    const harness = await createHarness({
      options: setupOptions({engine: "podman"}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
      infrastructure: [infrastructureAvailable({selectedEngine: "podman"})],
    });

    await runPhase(harness);

    expect(harness.inspection.events).toContain("invalidate:infrastructure");
  });

  it("does not invalidate for planned engine persistence", async () => {
    const harness = await createHarness({
      options: setupOptions({engine: "podman", dryRun: true}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
      dispositions: {"infrastructure.engine.persist": "planned"},
      infrastructure: [infrastructureAvailable({selectedEngine: "podman"})],
    });

    await runPhase(harness);

    expect(harness.inspection.invalidate).not.toHaveBeenCalled();
  });
});

describe("runtime readiness from shared facts", () => {
  it("reports Docker Desktop conflict without proposing installation", async () => {
    const harness = await createHarness({
      infrastructure: [infrastructureAvailable({dockerConflict: true})],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Docker Desktop appears to be active");
    expect(harness.actionRecords.map(({id}) => id)).not.toContain("infrastructure.container.install");
  });

  it("reports manual backend start when CLI is available but backend is not", async () => {
    const harness = await createHarness({
      infrastructure: [infrastructureAvailable({backendAvailable: false})],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toContain("Start or restart Rancher Desktop");
  });

  it("proposes installation when CLI is not available", async () => {
    const harness = await createHarness({
      responses: {[commandKey({command: "winget", args: ["--version"]})]: succeeded({stdout: "v1.10"})},
      infrastructure: [
        infrastructureAvailable({cliAvailable: false}),
        infrastructureAvailable(), // refreshed after install
      ],
      dispositions: {"infrastructure.container.install": "planned"},
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(harness.actionRecords.map(({id}) => id)).toContain("infrastructure.container.install");
  });

  it("proposes installation when compose is not available", async () => {
    const harness = await createHarness({
      responses: {[commandKey({command: "winget", args: ["--version"]})]: succeeded({stdout: "v1.10"})},
      infrastructure: [
        infrastructureAvailable({composeAvailable: false}),
        infrastructureAvailable(), // refreshed
      ],
      dispositions: {"infrastructure.container.install": "planned"},
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(harness.actionRecords.map(({id}) => id)).toContain("infrastructure.container.install");
  });

  it("invalidates infrastructure and aggregate after container installation", async () => {
    const harness = await createHarness({
      responses: {[commandKey({command: "winget", args: ["--version"]})]: succeeded({stdout: "v1.10"})},
      infrastructure: [
        infrastructureAvailable({cliAvailable: false}),
        infrastructureAvailable(), // refreshed after install
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    await runPhase(harness);

    expect(harness.inspection.invalidate).toHaveBeenCalledWith("infrastructure", "aggregate");
  });

  it("fails when refreshed facts are unavailable after successful installation command", async () => {
    const harness = await createHarness({
      responses: {[commandKey({command: "winget", args: ["--version"]})]: succeeded({stdout: "v1.10"})},
      infrastructure: [
        infrastructureAvailable({cliAvailable: false}),
        unavailableInfra("Runtime is gone."), // refreshed returns unavailable
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("refreshed infrastructure facts are unavailable");
  });

  it("fails when refreshed facts still show runtime not ready", async () => {
    const harness = await createHarness({
      responses: {[commandKey({command: "winget", args: ["--version"]})]: succeeded({stdout: "v1.10"})},
      infrastructure: [
        infrastructureAvailable({cliAvailable: false}),
        infrastructureAvailable({cliAvailable: false}), // still not ready
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("CLI is not available");
  });

  it("does not invalidate for declined container installation", async () => {
    const harness = await createHarness({
      responses: {[commandKey({command: "winget", args: ["--version"]})]: succeeded({stdout: "v1.10"})},
      infrastructure: [infrastructureAvailable({cliAvailable: false})],
      dispositions: {"infrastructure.container.install": "declined"},
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    await runPhase(harness);

    expect(harness.inspection.invalidate).not.toHaveBeenCalled();
  });
});

describe("port readiness from shared facts", () => {
  it("reports all required ports available from shared facts", async () => {
    const harness = await createHarness({
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    for (const port of requiredLocalPorts) {
      expect(result.evidence).toContain(`Port ${port} is available.`);
    }
  });

  it("blocks an unrelated port occupant", async () => {
    const harness = await createHarness({
      infrastructure: [
        infrastructureAvailable({
          ports: requiredLocalPorts.map((port) =>
            port === 3000 ? {port, available: false, pid: 8124, processName: "unrelated-server.exe"} : {port, available: true},
          ),
        }),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Port 3000 is occupied by PID 8124 (unrelated-server.exe)");
  });

  it("accepts a repository-owned port occupant as degraded", async () => {
    const harness = await createHarness({
      infrastructure: [
        infrastructureAvailable({
          ports: requiredLocalPorts.map((port) =>
            port === 3000
              ? {port, available: false, pid: 4100, processName: "node next dev", repositoryOwned: true}
              : {port, available: true},
          ),
        }),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("Port 3000 is occupied by repository PID 4100 (node next dev)");
    expect(result.nextActions).toContain("npm run dev:selfhost:stop -- --engine rancher");
  });

  it("blocks a port with inspection error", async () => {
    const harness = await createHarness({
      infrastructure: [
        infrastructureAvailable({
          ports: requiredLocalPorts.map((port) =>
            port === 5000 ? {port, available: false, error: "Listener lookup failed: lsof exited with code 1."} : {port, available: true},
          ),
        }),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("Port 5000 inspection failed: Listener lookup failed: lsof exited with code 1.");
  });

  it("reports unknown port ownership as blocked", async () => {
    const harness = await createHarness({
      infrastructure: [
        infrastructureAvailable({
          ports: requiredLocalPorts.map((port) => (port === 6379 ? {port, available: false} : {port, available: true})),
        }),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Port 6379 is occupied by an unidentified listener");
  });
});

describe("manifest readiness from shared facts", () => {
  it("blocks when manifest issues are present", async () => {
    const harness = await createHarness({
      infrastructure: [
        infrastructureAvailable({
          manifestIssues: ["Missing required manifest: tooling/AppHost/AppHost.csproj"],
        }),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("Missing required manifest: tooling/AppHost/AppHost.csproj");
    expect(result.nextActions).toContain("Restore the required tracked local infrastructure files, then rerun setup.");
  });
});

describe("certificate readiness from shared facts", () => {
  it("treats no certificate issues as idempotently satisfied", async () => {
    const harness = await createHarness({
      infrastructure: [infrastructureAvailable({certificateIssues: []})],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(result.evidence).toContain("Optional selfhost certificate and key are present.");
    expect(harness.actionRecords.map(({id}) => id)).not.toContain("infrastructure.certificates.generate");
  });

  it("degrades for invalid certificate path kinds without attempting repair", async () => {
    const harness = await createHarness({
      infrastructure: [
        infrastructureAvailable({
          certificateIssues: ["Selfhost certificate path is not a file: infra/Local/Management/certs/local-cert.pem (directory)."],
        }),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("invalid kinds");
    expect(harness.actionRecords).toHaveLength(0);
  });

  it("attempts mkcert chain when certificates are missing", async () => {
    const harness = await createHarness({
      infrastructure: [
        infrastructureAvailable({
          certificateIssues: [
            "Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem",
            "Missing selfhost certificate key: infra/Local/Management/certs/local-key.pem",
          ],
        }),
        infrastructureAvailable({certificateIssues: []}), // after mkcert install invalidation
        infrastructureAvailable({certificateIssues: []}), // after trust invalidation
        infrastructureAvailable({certificateIssues: []}), // after generate invalidation
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.map(({id}) => id)).toEqual(["infrastructure.mkcert.trust", "infrastructure.certificates.generate"]);
    expect(result.evidence).toContain("Optional selfhost certificate generation postcondition is satisfied.");
  });

  it("installs mkcert when unavailable and certificates are missing", async () => {
    const harness = await createHarness({
      responses: {
        [commandKey({command: "mkcert", args: ["--version"]})]: spawnFailed("ENOENT"),
        [commandKey({command: "winget", args: ["--version"]})]: succeeded({stdout: "v1.10"}),
      },
      infrastructure: [
        infrastructureAvailable({
          certificateIssues: ["Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem"],
        }),
        infrastructureAvailable({certificateIssues: []}), // refreshed after mkcert install
        infrastructureAvailable({certificateIssues: []}), // refreshed after trust
        infrastructureAvailable({certificateIssues: []}), // refreshed after generate
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    await runPhase(harness);
    expect(harness.actionRecords.map(({id}) => id)).toContain("infrastructure.mkcert.install");
  });

  it("verifies certificate postcondition from refreshed facts after generation", async () => {
    const harness = await createHarness({
      infrastructure: [
        infrastructureAvailable({
          certificateIssues: ["Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem"],
        }),
        infrastructureAvailable({certificateIssues: []}), // after trust
        infrastructureAvailable({certificateIssues: ["Missing selfhost certificate file: still missing"]}), // after generate - still bad
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("certificate generation postcondition failed");
  });

  it("invalidates infrastructure after certificate generation even on failure", async () => {
    const harness = await createHarness({
      responses: {
        [commandKey({
          command: "mkcert",
          args: ["-key-file", certificateKeyPath, "-cert-file", certificatePath, "localhost", "*.localhost"],
        })]: exited(1, {stderr: "generation denied"}),
      },
      infrastructure: [
        infrastructureAvailable({
          certificateIssues: ["Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem"],
        }),
        infrastructureAvailable({certificateIssues: []}), // after trust
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("generation denied");
    // Invalidation still happened in finally
    expect(harness.inspection.events.filter((e) => e === "invalidate:infrastructure").length).toBeGreaterThanOrEqual(1);
  });

  it("plans the complete mkcert dependency chain during dry-run", async () => {
    const harness = await createHarness({
      options: setupOptions({dryRun: true}),
      responses: {
        [commandKey({command: "mkcert", args: ["--version"]})]: spawnFailed("ENOENT"),
        [commandKey({command: "winget", args: ["--version"]})]: succeeded({stdout: "v1.10"}),
      },
      dispositions: {
        "infrastructure.mkcert.install": "planned",
        "infrastructure.mkcert.trust": "planned",
        "infrastructure.certificates.generate": "planned",
      },
      infrastructure: [
        infrastructureAvailable({
          certificateIssues: ["Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem"],
        }),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(harness.actionRecords.map(({id}) => id)).toEqual([
      "infrastructure.mkcert.install",
      "infrastructure.mkcert.trust",
      "infrastructure.certificates.generate",
    ]);
    // No invalidation because actions were only planned
    expect(harness.inspection.invalidate).not.toHaveBeenCalled();
  });

  it("creates the certificate directory and uses exact paths for mkcert generate", async () => {
    const harness = await createHarness({
      infrastructure: [
        infrastructureAvailable({
          certificateIssues: ["Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem"],
        }),
        infrastructureAvailable({certificateIssues: []}), // after trust
        infrastructureAvailable({certificateIssues: []}), // after generate
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    await runPhase(harness);

    expect(harness.createdDirectories).toEqual([dirname(certificatePath)]);
    expect(harness.runner.calls.map(({request}) => commandKey(request))).toContain(
      `mkcert -key-file ${certificateKeyPath} -cert-file ${certificatePath} localhost *.localhost`,
    );
  });
});

describe("credential isolation", () => {
  it("never reads or forwards MSSQL_SA_PASSWORD to mutation commands", async () => {
    const environmentVariables = new Proxy<Record<string, string | undefined>>(
      {AROLARIU_CONTAINER_ENGINE: "rancher"},
      {
        get(target, property, receiver) {
          if (property === "MSSQL_SA_PASSWORD") {
            throw new Error("SQL password was accessed");
          }
          return Reflect.get(target, property, receiver);
        },
      },
    );
    const harness = await createHarness({
      options: setupOptions({engine: undefined}),
      environmentVariables,
      config: {status: "missing"},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    const serializedCommands = JSON.stringify(harness.runner.calls.map(({request, options}) => ({request, options})));
    expect(serializedCommands).not.toContain("MSSQL_SA_PASSWORD");
  });

  it("removes MSSQL_SA_PASSWORD from every phase child environment", async () => {
    const harness = await createHarness({
      environmentVariables: {MSSQL_SA_PASSWORD: "phase-parent-sentinel"},
      infrastructure: [
        infrastructureAvailable({
          certificateIssues: ["Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem"],
        }),
        infrastructureAvailable({certificateIssues: []}), // after trust
        infrastructureAvailable({certificateIssues: []}), // after generate
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.runner.calls.length).toBeGreaterThan(0);
    for (const call of harness.runner.calls) {
      expect(call.options.env).toHaveProperty("MSSQL_SA_PASSWORD", undefined);
    }
  });
});

describe("abort and failure", () => {
  it.each(["prompt", "action"] as const)("rethrows AbortError from the %s boundary", async (boundary) => {
    const interruption = Object.assign(new Error(`interrupted ${boundary}`), {name: "AbortError"});
    const actions: SetupActionExecutor = {
      run: async () => {
        throw interruption;
      },
    };
    const harness = await createHarness({
      options: setupOptions({engine: boundary === "prompt" ? undefined : "podman"}),
      ...(boundary === "action"
        ? {config: {status: "valid" as const, config: {schemaVersion: 1, containerEngine: "rancher" as const}}}
        : {}),
      ...(boundary === "prompt" ? {select: async () => Promise.reject(interruption)} : {}),
      ...(boundary === "action" ? {actions} : {}),
    });

    await expect(runPhase(harness)).rejects.toBe(interruption);
  });

  it("rethrows AbortError raised while persisting the tooling configuration", async () => {
    // `readToolingConfig` intentionally converts every read failure (including an interruption)
    // into an explicit `"invalid"` status instead of rethrowing, exactly as it did before this
    // phase migrated; that conversion is covered by the "blocks invalid configuration" test
    // above. A write interruption during persistence is not converted and must still escape.
    const interruption = Object.assign(new Error("interrupted persist write"), {name: "AbortError"});
    const harness = await createHarness({
      options: setupOptions({engine: "podman"}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });
    const failingFiles: FileSystem = {
      ...harness.context.runtime.files,
      writeTextAtomic: async (path: string) => {
        if (path === paths.toolingConfig) {
          throw interruption;
        }
        return harness.context.runtime.files.writeTextAtomic(path, "", {});
      },
    };
    const failingContext: MigratedSetupContext = {
      ...harness.context,
      runtime: {...harness.context.runtime, files: failingFiles},
    };

    await expect(harness.phase.run(failingContext as SetupContext)).rejects.toBe(interruption);
  });

  it("invalidates before propagating AbortError during an attempted mutation", async () => {
    const interruption = Object.assign(new Error("interrupted mutation"), {name: "AbortError"});
    const actionRecords: SetupAction[] = [];
    const actions: SetupActionExecutor = {
      run: async (action) => {
        actionRecords.push(action);
        // Execute the callback to set attempted = true, then throw
        await action.execute();
        throw interruption;
      },
    };
    const harness = await createHarness({
      options: setupOptions({engine: "podman"}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
      actions,
    });

    await expect(runPhase(harness)).rejects.toBe(interruption);
    // Engine persist action was attempted, so infrastructure should have been invalidated in finally
    expect(harness.inspection.invalidate).toHaveBeenCalledWith("infrastructure");
  });

  it("fails when shared infrastructure inspection returns unavailable", async () => {
    const harness = await createHarness({
      infrastructure: [unavailableInfra("Certificate path is unreadable.")],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.summary).toContain("Shared infrastructure inspection failed");
    expect(result.evidence.join("\n")).toContain("Certificate path is unreadable.");
  });

  it("executes no mutation during dry-run", async () => {
    const executed: string[] = [];
    const actions: SetupActionExecutor = {
      run: async (action) => {
        executed.push(`planned:${action.id}`);
        return "planned";
      },
    };
    const harness = await createHarness({
      options: setupOptions({dryRun: true}),
      actions,
      infrastructure: [
        infrastructureAvailable({
          certificateIssues: ["Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem"],
        }),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(executed.every((e) => e.startsWith("planned:"))).toBe(true);
  });

  it("gives port blockers precedence over planned persistence", async () => {
    const harness = await createHarness({
      options: setupOptions({engine: "podman", dryRun: true}),
      dispositions: {"infrastructure.engine.persist": "planned"},
      infrastructure: [
        infrastructureAvailable({
          selectedEngine: "podman",
          ports: requiredLocalPorts.map((port) =>
            port === 3000 ? {port, available: false, pid: 7, processName: "unrelated"} : {port, available: true},
          ),
        }),
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
  });

  it("inspection event order: updateEngine, inspect, invalidate cycle", async () => {
    const harness = await createHarness({
      options: setupOptions({engine: "podman"}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
      infrastructure: [
        infrastructureAvailable({selectedEngine: "podman"}), // persistence re-inspect
        infrastructureAvailable({selectedEngine: "podman"}), // main inspect
      ],
    });

    await runPhase(harness);

    // First: updateInfrastructureEngine, then invalidate:infrastructure (persist), then inspect (persist refresh),
    // then inspect:infrastructure (main readiness)
    expect(harness.inspection.events[0]).toBe("updateInfrastructureEngine");
    expect(harness.inspection.events).toContain("invalidate:infrastructure");
    expect(harness.inspection.events).toContain("inspect:infrastructure");
  });

  it("throws when the phase runs without an invocation-scoped setup phase runtime", async () => {
    const harness = await createHarness();
    const {runtime: _runtime, ...withoutRuntime} = harness.context;

    await expect(harness.phase.run(withoutRuntime as SetupContext)).rejects.toThrow(/setup phase runtime/i);
  });
});
