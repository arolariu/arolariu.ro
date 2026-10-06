// @vitest-environment node
/**
 * @fileoverview Contract tests for local infrastructure preparation.
 * @module scripts/commands/setup/phases/infrastructure.test
 *
 * @remarks
 * All readiness observations are consumed from shared {@link InfrastructureFacts} via
 * `context.inspection.inspect("infrastructure")`. Tests inject a controllable recording
 * {@link RepositoryInspectionSession} that resolves the `"infrastructure"` key through a
 * call-ordered sequence, tracks invalidation events, and records `updateInfrastructureEngine`
 * calls.
 *
 * Every test runs the real Effect phase on the in-memory `makeTestLayer` harness: request-keyed
 * scripted commands replaying legacy-shaped outcomes, an in-memory filesystem seeded with the
 * non-secret local tooling configuration and observed by a recording filesystem, a recording (or
 * the production dry-run) `SetupActions`, a spying `Prompts`, and an environment snapshot that
 * supplies the host platform, environment variables, and interactive terminal state. Phases run
 * under a counting clock (see `runPhase`), so each reports the deterministic duration of its
 * legacy test clock. No test in this file reads the live checkout, spawns a real process, or
 * mutates disk.
 */

import {dirname, resolve} from "node:path";

import {Deferred, Effect, Exit, Fiber, FileSystem, Layer, PlatformError, Terminal} from "effect";
import {describe, expect, it, vi} from "vitest";

import {createRepositoryPaths} from "../../../common/repository-paths.ts";
import type {RepositoryRequirements} from "../../../common/requirements.ts";
import type {ToolingConfigV1} from "../../../common/tooling-config.ts";
import {requiredLocalPorts} from "../../../container-runtime/preflight.ts";
import type {ContainerEngine} from "../../../container-runtime/types.ts";
import type {InfrastructureFacts, PortFact} from "../../../inspection/infrastructure.ts";
import type {RepositoryInspectionFacts, RepositoryInspectionKey, RepositoryInspectionSession} from "../../../inspection/repository.ts";
import type {InspectionOutcome} from "../../../inspection/types.ts";
import type {Presenter} from "../../../platform/Output.ts";
import type {ProcessRequest} from "../../../platform/Process.ts";
import {Prompts, promptUnavailable, type PromptChoice, type PromptUnavailable} from "../../../platform/Prompts.ts";
import {makeTestLayer, runScoped, type RecordedProcessCall, type TestHarness} from "../../../platform/testing.ts";
import {SetupActions} from "../actions.ts";
import {
  interruptingActions,
  keyedResponder,
  productionActions,
  recordingActions,
  runPhase as runPhaseWith,
  runPhaseExit,
  scriptedCommands,
  setupActionLines,
  type ScriptedCommandOutcome,
} from "../phase-testing.ts";
import type {
  SetupAction,
  SetupActionDisposition,
  SetupContext,
  SetupInput,
  SetupPhaseDefinition,
  SetupPhaseResult,
  SetupRequirements,
} from "../types.ts";
import {createInfrastructureSetupPhase, infrastructureSetupPhase, selectContainerInstallationProposal} from "./infrastructure.ts";

// ---------------------------------------------------------------------------
// Fact fixtures
// ---------------------------------------------------------------------------

const ROOT = resolve(process.cwd(), ".synthetic", "setup-infrastructure-root");
const paths = createRepositoryPaths(ROOT);
const certificatePath = resolve(ROOT, "infra", "Local", "Management", "certs", "local-cert.pem");
const certificateKeyPath = resolve(ROOT, "infra", "Local", "Management", "certs", "local-key.pem");

/** The setup command default timeout every `--version` probe runs with. */
const PHASE_PROBE_TIMEOUT_MS = 120_000;

/** The explicit ceiling every long-running infrastructure mutation requests. */
const LONG_MUTATION_TIMEOUT_MS = 1_200_000;

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
// Process outcome fixtures
// ---------------------------------------------------------------------------

function succeeded(patch: Readonly<{stdout?: string; stderr?: string}> = {}): ScriptedCommandOutcome {
  return {kind: "succeeded", exitCode: 0, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function exited(exitCode: number, patch: Readonly<{stdout?: string; stderr?: string}> = {}): ScriptedCommandOutcome {
  return {kind: "exited", exitCode, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function spawnFailed(message: string): ScriptedCommandOutcome {
  return {kind: "spawn-failed", message, stdout: "", stderr: "", durationMs: 1};
}

/** Response key of one command (see `keyedResponder`). */
function commandKey(command: Readonly<ProcessRequest>): string {
  return [command.command, ...command.args].join("\u0000");
}

/** Human-readable command line of one request. */
function commandLine(command: Readonly<ProcessRequest>): string {
  return [command.command, ...command.args].join(" ");
}

/** One recorded child invocation. */
type RecordedCall = RecordedProcessCall;

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

// ---------------------------------------------------------------------------
// Inspection harness
// ---------------------------------------------------------------------------

interface InspectionHarness {
  readonly session: RepositoryInspectionSession;
  readonly inspect: ReturnType<typeof vi.fn<(key: RepositoryInspectionKey) => void>>;
  readonly invalidate: ReturnType<typeof vi.fn<(...keys: RepositoryInspectionKey[]) => void>>;
  readonly updateInfrastructureEngine: ReturnType<typeof vi.fn<(engine: ContainerEngine) => void>>;
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
  const inspect = vi.fn<(key: RepositoryInspectionKey) => void>((key) => {
    events.push(`inspect:${key}`);
  });
  const invalidate = vi.fn<(...keys: RepositoryInspectionKey[]) => void>((...keys) => {
    events.push(`invalidate:${keys.join("+")}`);
  });
  const updateInfrastructureEngine = vi.fn<(engine: ContainerEngine) => void>(() => {
    events.push("updateInfrastructureEngine");
  });
  const session: RepositoryInspectionSession = {
    inspect: <K extends RepositoryInspectionKey>(key: K) =>
      Effect.sync((): InspectionOutcome<RepositoryInspectionFacts[K]> => {
        inspect(key);
        const sequence = sequences[key];
        if (sequence === undefined || sequence.length === 0) {
          return {kind: "unavailable", reason: "Not exercised by this test.", durationMs: 0};
        }
        const offset = offsets.get(key) ?? 0;
        offsets.set(key, offset + 1);
        return sequence[Math.min(offset, sequence.length - 1)] as InspectionOutcome<RepositoryInspectionFacts[K]>;
      }),
    invalidate: (...keys) =>
      Effect.sync(() => {
        invalidate(...keys);
      }),
    updateInfrastructureEngine: (engine) =>
      Effect.sync(() => {
        updateInfrastructureEngine(engine);
      }),
  };
  return {session, inspect, invalidate, updateInfrastructureEngine, events};
}

// ---------------------------------------------------------------------------
// Filesystem harness
// ---------------------------------------------------------------------------

type ToolingConfigSeed =
  | Readonly<{status: "missing"}>
  | Readonly<{status: "valid"; config: ToolingConfigV1}>
  | Readonly<{status: "invalid"}>
  | Readonly<{status: "raw"; contents: string}>;

/** Seeds the in-memory filesystem's non-secret local tooling configuration file. */
function seedToolingConfig(seed: ToolingConfigSeed): Readonly<Record<string, string>> {
  switch (seed.status) {
    case "missing":
      return {};
    case "invalid":
      // A secret-shaped key is rejected by `parseToolingConfig` regardless of where it is nested,
      // producing a real `"invalid"` read result without hand-crafting one.
      return {[paths.toolingConfig]: JSON.stringify({schemaVersion: 1, token: "leaked"})};
    case "valid":
      return {[paths.toolingConfig]: JSON.stringify(seed.config)};
    case "raw":
      return {[paths.toolingConfig]: seed.contents};
  }
}

/** Every completed atomic write (`rename` onto its destination) and every directory creation. */
interface FileTracker {
  readonly writes: Readonly<{path: string; config: ToolingConfigV1}>[];
  readonly createdDirectories: string[];
  /** Called once per completed write, so its call order can be compared with other recorders. */
  readonly writeCompleted: ReturnType<typeof vi.fn<(path: string) => void>>;
}

/** Holds every atomic write before its rename until `release` completes; `started` completes first. */
interface WriteGate {
  readonly started: Deferred.Deferred<void>;
  readonly release: Deferred.Deferred<void>;
}

/**
 * Observes the harness filesystem: every directory creation, and every atomic write once its
 * temporary file was renamed onto its destination (with the parsed destination contents).
 * `failWritesTo` fails the rename onto that destination with a permission error; `gate` holds
 * every rename until it is released.
 */
function trackingFileSystem(
  tracker: FileTracker,
  failWritesTo: string | undefined,
  gate: WriteGate | undefined,
): Layer.Layer<FileSystem.FileSystem, never, FileSystem.FileSystem> {
  const hold = gate === undefined ? Effect.void : Effect.andThen(Deferred.succeed(gate.started, undefined), Deferred.await(gate.release));
  return Layer.effect(
    FileSystem.FileSystem,
    Effect.map(Effect.service(FileSystem.FileSystem), (files) =>
      FileSystem.FileSystem.of({
        ...files,
        makeDirectory: (path, options) =>
          Effect.suspend(() => {
            tracker.createdDirectories.push(path);
            return files.makeDirectory(path, options);
          }),
        rename: (from, to) =>
          to === failWritesTo
            ? Effect.fail(
                PlatformError.systemError({
                  _tag: "PermissionDenied",
                  module: "FileSystem",
                  method: "rename",
                  pathOrDescriptor: to,
                  description: "write denied",
                }),
              )
            : hold.pipe(
                Effect.andThen(files.rename(from, to)),
                Effect.andThen(files.readFileString(to)),
                Effect.map((contents) => {
                  tracker.writes.push({path: to, config: JSON.parse(contents) as ToolingConfigV1});
                  tracker.writeCompleted(to);
                }),
              ),
      }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

/** A scripted engine prompt: answers `Prompts.select`. */
type ScriptedSelect = <T extends string>(
  message: string,
  choices: readonly PromptChoice<T>[],
) => Effect.Effect<T, PromptUnavailable | Terminal.QuitError>;

interface HarnessInput {
  readonly options?: SetupInput;
  readonly environmentVariables?: Readonly<Record<string, string | undefined>>;
  readonly stdinIsTTY?: boolean;
  readonly platform?: NodeJS.Platform;
  readonly config?: ToolingConfigSeed;
  readonly responses?: Readonly<Record<string, ScriptedCommandOutcome | readonly ScriptedCommandOutcome[]>>;
  readonly dispositions?: Readonly<Record<string, SetupActionDisposition>>;
  /** Replaces the recording consent policy. */
  readonly actions?: (recording: Layer.Layer<SetupActions>) => Layer.Layer<SetupActions, never, Presenter>;
  /** Answers the engine prompt instead of the harness's scripted prompts. */
  readonly select?: ScriptedSelect;
  /** Scripted harness prompt answers (used when `select` is not given). */
  readonly prompts?: readonly string[];
  /** Fails the atomic write onto the tooling configuration. */
  readonly failToolingConfigWrite?: boolean;
  /** Holds every atomic write before its rename. */
  readonly writeGate?: WriteGate;
  readonly infrastructure?: readonly InspectionOutcome<InfrastructureFacts>[];
}

interface Harness {
  readonly phase: SetupPhaseDefinition;
  readonly context: SetupContext;
  readonly platform: TestHarness;
  readonly runner: {readonly calls: readonly RecordedCall[]};
  readonly select: ReturnType<typeof vi.fn<(message: string, choices: readonly PromptChoice<string>[]) => void>>;
  readonly actionIds: string[];
  readonly actionRecords: readonly SetupAction[];
  readonly writes: FileTracker["writes"];
  readonly writeCompleted: FileTracker["writeCompleted"];
  readonly createdDirectories: FileTracker["createdDirectories"];
  readonly inspection: InspectionHarness;
  readonly layer: Layer.Layer<SetupRequirements>;
}

function createHarness(input: HarnessInput = {}): Harness {
  const options = input.options ?? setupOptions();
  const stdinIsTTY = input.stdinIsTTY ?? true;
  const platform = makeTestLayer({
    files: seedToolingConfig(input.config ?? {status: "missing"}),
    processes: [scriptedCommands(keyedResponder(input.responses ?? {}))],
    environment: {
      variables: input.environmentVariables ?? {},
      cwd: paths.root,
      executablePath: "C:\\Program Files\\nodejs\\node.exe",
      platform: input.platform ?? "win32",
      architecture: "x64",
      stdinIsTTY,
      stdoutIsTTY: false,
      isCI: true,
    },
    prompts: input.prompts ?? [],
    context: "setup::infrastructure",
    verbose: options.verbose,
  });

  const select = vi.fn<(message: string, choices: readonly PromptChoice<string>[]) => void>();
  const prompts = Layer.effect(
    Prompts,
    Effect.map(Effect.service(Prompts), (scripted) =>
      Prompts.of({
        ...scripted,
        select: <T extends string>(message: string, choices: readonly PromptChoice<T>[], defaultValue?: T) =>
          Effect.suspend(() => {
            select(message, choices);
            return input.select === undefined ? scripted.select(message, choices, defaultValue) : input.select(message, choices);
          }),
      }),
    ),
  );

  const tracker: FileTracker = {writes: [], createdDirectories: [], writeCompleted: vi.fn<(path: string) => void>()};
  const files = trackingFileSystem(tracker, input.failToolingConfigWrite === true ? paths.toolingConfig : undefined, input.writeGate);

  const recording = recordingActions(false, input.dispositions);
  const actions = input.actions === undefined ? recording.layer : input.actions(recording.layer);
  const inspection = createInspectionHarness({
    ...(input.infrastructure === undefined ? {} : {infrastructure: input.infrastructure}),
  });

  const context: SetupContext = {
    options,
    paths,
    requirements: requirements(),
    inspection: inspection.session,
  };

  return {
    phase: createInfrastructureSetupPhase(),
    context,
    platform,
    runner: {
      get calls(): readonly RecordedCall[] {
        return platform.processCalls();
      },
    },
    select,
    actionIds: recording.actionIds,
    get actionRecords(): readonly SetupAction[] {
      return recording.run.mock.calls.map(([action]) => action);
    },
    writes: tracker.writes,
    writeCompleted: tracker.writeCompleted,
    createdDirectories: tracker.createdDirectories,
    inspection,
    layer: Layer.mergeAll(actions, prompts, files).pipe(Layer.provideMerge(platform.layer)),
  };
}

/**
 * Runs the phase against its harness.
 *
 * @param harness - Assembled test harness.
 * @returns The completed phase result.
 */
function runPhase(harness: Harness): Promise<SetupPhaseResult> {
  return runPhaseWith(harness.phase, harness.context, harness.layer);
}

/**
 * Reads the tooling configuration bytes in the harness filesystem.
 *
 * @param harness - The harness.
 * @returns The file contents, or `undefined` when the file is absent.
 */
function toolingConfigContents(harness: Harness): string | undefined {
  const entry = [...harness.platform.files()].find(([path]) => path.endsWith("/.arolariu/tooling.local.json"));
  return entry === undefined ? undefined : String(entry[1]);
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
    const harness = createHarness({
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
    const harness = createHarness({
      options: setupOptions({engine: undefined}),
      environmentVariables: {AROLARIU_CONTAINER_ENGINE: "podman"},
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.evidence).toContain("Selected Podman Desktop from environment.");
    expect(harness.writes).toEqual([expect.objectContaining({config: expect.objectContaining({containerEngine: "podman"})})]);
  });

  it("uses the persisted selection without scheduling a redundant write", async () => {
    const harness = createHarness({
      options: setupOptions({engine: undefined}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "podman"}},
      infrastructure: [infrastructureAvailable({selectedEngine: "podman"})],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(result.evidence).toContain("Selected Podman Desktop from configuration.");
    expect(harness.actionIds).not.toContain("infrastructure.engine.persist");
    expect(harness.writes).toHaveLength(0);
  });

  it("calls updateInfrastructureEngine with the selected engine", async () => {
    const harness = createHarness({
      options: setupOptions({engine: "podman"}),
      infrastructure: [infrastructureAvailable({selectedEngine: "podman"})],
    });

    await runPhase(harness);

    expect(harness.inspection.updateInfrastructureEngine).toHaveBeenCalledWith("podman");
  });

  it("prompts with explicit runtime requirements only when interactive selection is required", async () => {
    const harness = createHarness({
      options: setupOptions({engine: undefined, yes: true}),
      stdinIsTTY: true,
      select: <T extends string>(message: string, choices: readonly PromptChoice<T>[]) =>
        Effect.sync(() => {
          expect(message).toBe("Select the local container engine:");
          expect(choices).toEqual([
            {value: "rancher", label: "Rancher Desktop (Moby/dockerd; Docker Desktop must be stopped)"},
            {value: "podman", label: "Podman Desktop (podman compose provider required)"},
          ]);
          const podman = choices.find(({value}) => value === "podman");
          if (podman === undefined) {
            throw new Error("Expected the Podman choice.");
          }
          return podman.value;
        }),
      infrastructure: [infrastructureAvailable({selectedEngine: "podman"})],
    });

    const result = await runPhase(harness);

    expect(result.evidence).toContain("Selected Podman Desktop interactively.");
    expect(harness.select).toHaveBeenCalledTimes(1);
  });

  it("persists the selected engine", async () => {
    // Arrange
    const harness = createHarness({
      options: setupOptions({engine: undefined}),
      stdinIsTTY: true,
      prompts: ["podman"],
      infrastructure: [infrastructureAvailable({selectedEngine: "podman"})],
    });

    // Act
    const result = await runPhase(harness);

    // Assert
    expect(result.status).toBe("succeeded");
    expect(result.evidence).toEqual(
      expect.arrayContaining(["Selected Podman Desktop interactively.", "Executed action: infrastructure.engine.persist"]),
    );
    expect(toolingConfigContents(harness)).toBe('{\n  "schemaVersion": 1,\n  "containerEngine": "podman"\n}\n');
    expect([...harness.platform.files().keys()]).toHaveLength(1);
    expect(harness.inspection.events).toEqual([
      "updateInfrastructureEngine",
      "invalidate:infrastructure",
      "inspect:infrastructure",
      "inspect:infrastructure",
    ]);
  });

  it.each([
    ["absent", undefined],
    ["present without an engine", '{"schemaVersion":1}'],
  ] as const)("leaves tooling config untouched when interrupted at the engine prompt (%s)", async (_label, original) => {
    // Arrange
    const prompted = Deferred.makeUnsafe<void>();
    const harness = createHarness({
      options: setupOptions({engine: undefined}),
      stdinIsTTY: true,
      config: original === undefined ? {status: "missing"} : {status: "raw", contents: original},
      select: () => Effect.andThen(Deferred.succeed(prompted, undefined), Effect.never),
    });

    // Act
    const exit = await runScoped(
      Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(harness.phase.run(harness.context));
        yield* Deferred.await(prompted);
        yield* Fiber.interrupt(fiber);
        return yield* Fiber.await(fiber);
      }),
      harness.layer,
    );

    // Assert
    expect(Exit.hasInterrupts(exit)).toBe(true);
    expect(harness.select).toHaveBeenCalledTimes(1);
    expect(toolingConfigContents(harness)).toBe(original);
    expect(harness.writes).toEqual([]);
    expect(harness.createdDirectories).toEqual([]);
    expect(harness.actionIds).toEqual([]);
    expect(harness.inspection.events).toEqual([]);
  });

  it.each([false, true])("does not invent a noninteractive selection when --yes is %s", async (yes) => {
    const harness = createHarness({
      options: setupOptions({engine: undefined, yes}),
      stdinIsTTY: false,
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.nextActions[0]).toBe("npm run setup -- --engine rancher|podman");
    expect(harness.select).not.toHaveBeenCalled();
  });

  it("reports an unavailable engine prompt as a failed selection without writing", async () => {
    const harness = createHarness({
      options: setupOptions({engine: undefined}),
      stdinIsTTY: true,
      select: () => Effect.fail(promptUnavailable("select")),
    });

    const result = await runPhase(harness);

    expect(result).toMatchObject({
      status: "failed",
      summary: "A supported local container engine was not selected.",
      evidence: ["Cannot request a selection without an interactive terminal. Re-run setup in a TTY."],
      nextActions: ["npm run setup -- --engine rancher|podman"],
    });
    expect(harness.writes).toEqual([]);
    expect(harness.actionIds).toEqual([]);
  });

  it.each(["docker", "docker-desktop", "colima"])("blocks unsupported environment selection %s without prompting", async (value) => {
    const harness = createHarness({
      options: setupOptions({engine: undefined}),
      environmentVariables: {AROLARIU_CONTAINER_ENGINE: value},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(value === "colima" ? /Unsupported container engine/u : /Docker Desktop is deprecated/u);
    expect(harness.select).not.toHaveBeenCalled();
  });

  it("blocks invalid configuration without prompting or overwriting it", async () => {
    const harness = createHarness({
      options: setupOptions({engine: undefined}),
      config: {status: "invalid"},
    });

    const result = await runPhase(harness);

    expect(result).toMatchObject({status: "failed", summary: expect.stringContaining("tooling configuration is invalid")});
    expect(harness.writes).toHaveLength(0);
    expect(harness.actionRecords).toHaveLength(0);
    expect(harness.select).not.toHaveBeenCalled();
  });

  it("plans changed selection persistence without writing during dry-run", async () => {
    const harness = createHarness({
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
    const harness = createHarness({
      options: setupOptions({engine: "podman"}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
      infrastructure: [infrastructureAvailable({selectedEngine: "podman"})],
    });

    await runPhase(harness);

    expect(harness.inspection.events).toContain("invalidate:infrastructure");
  });

  it("does not invalidate for planned engine persistence", async () => {
    const harness = createHarness({
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
    const harness = createHarness({
      infrastructure: [infrastructureAvailable({dockerConflict: true})],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Docker Desktop appears to be active");
    expect(harness.actionIds).not.toContain("infrastructure.container.install");
  });

  it("reports manual backend start when CLI is available but backend is not", async () => {
    const harness = createHarness({
      infrastructure: [infrastructureAvailable({backendAvailable: false})],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toContain("Start or restart Rancher Desktop");
  });

  it("proposes installation when CLI is not available", async () => {
    const harness = createHarness({
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
    expect(harness.actionIds).toContain("infrastructure.container.install");
  });

  it("proposes installation when compose is not available", async () => {
    const harness = createHarness({
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
    expect(harness.actionIds).toContain("infrastructure.container.install");
  });

  it("invalidates infrastructure and aggregate after container installation", async () => {
    const harness = createHarness({
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
    const harness = createHarness({
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
    const harness = createHarness({
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
    const harness = createHarness({
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
    const harness = createHarness({
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    for (const port of requiredLocalPorts) {
      expect(result.evidence).toContain(`Port ${port} is available.`);
    }
  });

  it("blocks an unrelated port occupant", async () => {
    const harness = createHarness({
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
    const harness = createHarness({
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
    const harness = createHarness({
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
    const harness = createHarness({
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
    const harness = createHarness({
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
    const harness = createHarness({
      infrastructure: [infrastructureAvailable({certificateIssues: []})],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(result.evidence).toContain("Optional selfhost certificate and key are present.");
    expect(harness.actionIds).not.toContain("infrastructure.certificates.generate");
  });

  it("degrades for invalid certificate path kinds without attempting repair", async () => {
    const harness = createHarness({
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
    const harness = createHarness({
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
    expect(harness.actionIds).toEqual(["infrastructure.mkcert.trust", "infrastructure.certificates.generate"]);
    expect(result.evidence).toContain("Optional selfhost certificate generation postcondition is satisfied.");
  });

  it("installs mkcert when unavailable and certificates are missing", async () => {
    const harness = createHarness({
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
    expect(harness.actionIds).toContain("infrastructure.mkcert.install");
  });

  it("verifies certificate postcondition from refreshed facts after generation", async () => {
    const harness = createHarness({
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
    const harness = createHarness({
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
    // Invalidation still happened in the finalizer
    expect(harness.inspection.events.filter((e) => e === "invalidate:infrastructure").length).toBeGreaterThanOrEqual(1);
    expect(harness.inspection.events.slice(-2)).toEqual(["inspect:infrastructure", "invalidate:infrastructure"]);
  });

  it("plans the complete mkcert dependency chain during dry-run", async () => {
    const harness = createHarness({
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
    expect(harness.actionIds).toEqual([
      "infrastructure.mkcert.install",
      "infrastructure.mkcert.trust",
      "infrastructure.certificates.generate",
    ]);
    // No invalidation because actions were only planned
    expect(harness.inspection.invalidate).not.toHaveBeenCalled();
  });

  it("creates the certificate directory and uses exact paths for mkcert generate", async () => {
    const harness = createHarness({
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
    expect(harness.runner.calls.map(({request}) => commandLine(request))).toContain(
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
    const harness = createHarness({
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
    const harness = createHarness({
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

describe("long mutation timeout ceiling", () => {
  it("requests the long mutation timeout for container runtime installation and keeps the probe-scoped default for the package-manager version probe", async () => {
    const harness = createHarness({
      responses: {[commandKey({command: "winget", args: ["--version"]})]: succeeded({stdout: "v1.10"})},
      infrastructure: [
        infrastructureAvailable({cliAvailable: false}),
        infrastructureAvailable(), // refreshed after install
      ],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    const probe = harness.runner.calls.find(({request}) => commandLine(request) === "winget --version");
    const install = harness.runner.calls.find(
      ({request}) =>
        commandLine(request) === "winget install --id SUSE.RancherDesktop --exact --accept-package-agreements --accept-source-agreements",
    );
    expect(probe?.options).toMatchObject({timeout: PHASE_PROBE_TIMEOUT_MS});
    expect(install?.options).toMatchObject({output: "inherit", timeout: LONG_MUTATION_TIMEOUT_MS});
  });

  it("requests the long mutation timeout for mkcert installation and keeps the probe-scoped default for the mkcert and package-manager version probes", async () => {
    const harness = createHarness({
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

    expect(harness.actionIds).toContain("infrastructure.mkcert.install");
    const mkcertProbes = harness.runner.calls.filter(({request}) => commandLine(request) === "mkcert --version");
    const wingetProbe = harness.runner.calls.find(({request}) => commandLine(request) === "winget --version");
    const install = harness.runner.calls.find(
      ({request}) =>
        commandLine(request) === "winget install --id FiloSottile.mkcert --exact --accept-package-agreements --accept-source-agreements",
    );
    expect(mkcertProbes.length).toBeGreaterThan(0);
    for (const probe of mkcertProbes) {
      expect(probe.options).toMatchObject({timeout: PHASE_PROBE_TIMEOUT_MS});
    }
    expect(wingetProbe?.options).toMatchObject({timeout: PHASE_PROBE_TIMEOUT_MS});
    expect(install?.options).toMatchObject({output: "inherit", timeout: LONG_MUTATION_TIMEOUT_MS});
  });

  it("requests the long mutation timeout for mkcert trust and certificate generation and keeps the probe-scoped default for the mkcert version probe", async () => {
    const harness = createHarness({
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
    const mkcertProbe = harness.runner.calls.find(({request}) => commandLine(request) === "mkcert --version");
    const trust = harness.runner.calls.find(({request}) => commandLine(request) === "mkcert -install");
    const generate = harness.runner.calls.find(
      ({request}) => commandLine(request) === `mkcert -key-file ${certificateKeyPath} -cert-file ${certificatePath} localhost *.localhost`,
    );
    expect(mkcertProbe?.options).toMatchObject({timeout: PHASE_PROBE_TIMEOUT_MS});
    expect(trust?.options).toMatchObject({output: "inherit", timeout: LONG_MUTATION_TIMEOUT_MS});
    expect(generate?.options).toMatchObject({output: "inherit", timeout: LONG_MUTATION_TIMEOUT_MS});
  });
});

describe("interruption and failure", () => {
  it("interrupts setup when the engine prompt is quit at the terminal", async () => {
    const harness = createHarness({
      options: setupOptions({engine: undefined}),
      select: () => Effect.fail(new Terminal.QuitError()),
    });

    const exit = await runPhaseExit(harness.phase, harness.context, harness.layer);

    expect(Exit.hasInterrupts(exit)).toBe(true);
    expect(harness.writes).toEqual([]);
    expect(harness.actionIds).toEqual([]);
  });

  it("propagates an interruption at the persistence consent gate without writing or invalidating", async () => {
    const harness = createHarness({
      options: setupOptions({engine: "podman"}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
      actions: (recording) => interruptingActions("infrastructure.engine.persist", recording),
    });

    const exit = await runPhaseExit(harness.phase, harness.context, harness.layer);

    expect(Exit.hasInterrupts(exit)).toBe(true);
    expect(harness.writes).toEqual([]);
    expect(harness.inspection.invalidate).not.toHaveBeenCalled();
    expect(toolingConfigContents(harness)).toBe(JSON.stringify({schemaVersion: 1, containerEngine: "rancher"}));
  });

  it("fails the phase and invalidates when persisting the tooling configuration fails", async () => {
    const original = JSON.stringify({schemaVersion: 1, containerEngine: "rancher"});
    const harness = createHarness({
      options: setupOptions({engine: "podman"}),
      config: {status: "raw", contents: original},
      failToolingConfigWrite: true,
    });

    const result = await runPhase(harness);

    expect(result).toMatchObject({
      status: "failed",
      summary: "Local infrastructure preparation failed.",
      nextActions: ["Resolve the reported infrastructure preparation failure, then rerun setup."],
    });
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence[0]).toContain(`Failed to writeTextAtomic '${paths.toolingConfig}'`);
    expect(harness.inspection.invalidate).toHaveBeenCalledExactlyOnceWith("infrastructure");
    expect(toolingConfigContents(harness)).toBe(original);
    expect([...harness.platform.files().keys()]).toHaveLength(1);
  });

  it("invalidates before propagating an interruption that follows an attempted mutation", async () => {
    const harness = createHarness({
      options: setupOptions({engine: "podman"}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
      actions: () => Layer.succeed(SetupActions, SetupActions.of({run: (action) => Effect.andThen(action.execute, Effect.interrupt)})),
    });

    const exit = await runPhaseExit(harness.phase, harness.context, harness.layer);

    expect(Exit.hasInterrupts(exit)).toBe(true);
    // Engine persist action was attempted, so infrastructure was invalidated in the finalizer
    expect(harness.inspection.invalidate).toHaveBeenCalledExactlyOnceWith("infrastructure");
    expect(harness.writes).toEqual([{path: paths.toolingConfig, config: {schemaVersion: 1, containerEngine: "podman"}}]);
  });

  it("completes an in-flight tooling configuration write before an interruption invalidates", async () => {
    // Arrange
    const gate: WriteGate = {started: Deferred.makeUnsafe<void>(), release: Deferred.makeUnsafe<void>()};
    const harness = createHarness({
      options: setupOptions({engine: "podman"}),
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
      writeGate: gate,
    });

    // Act
    const exit = await runScoped(
      Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(harness.phase.run(harness.context));
        yield* Deferred.await(gate.started);
        const interruption = yield* Effect.forkChild(Fiber.interrupt(fiber));
        // Give an interruptible write the chance to be abandoned before the gate opens.
        yield* Effect.promise(() => new Promise<void>((settle) => setTimeout(settle, 20)));
        yield* Deferred.succeed(gate.release, undefined);
        yield* Fiber.await(interruption);
        return yield* Fiber.await(fiber);
      }),
      harness.layer,
    );

    // Assert
    expect(Exit.hasInterrupts(exit)).toBe(true);
    expect(harness.writes).toEqual([{path: paths.toolingConfig, config: {schemaVersion: 1, containerEngine: "podman"}}]);
    expect(harness.inspection.invalidate).toHaveBeenCalledExactlyOnceWith("infrastructure");
    expect(harness.writeCompleted.mock.invocationCallOrder[0]).toBeLessThan(harness.inspection.invalidate.mock.invocationCallOrder[0]!);
    expect(harness.inspection.inspect).not.toHaveBeenCalled();
  });

  it("invalidates infrastructure and aggregate when an interruption stops the container installation", async () => {
    const harness = createHarness({
      responses: {
        [commandKey({command: "winget", args: ["--version"]})]: succeeded({stdout: "v1.10"}),
        [commandKey({
          command: "winget",
          args: ["install", "--id", "SUSE.RancherDesktop", "--exact", "--accept-package-agreements", "--accept-source-agreements"],
        })]: {kind: "cancelled"},
      },
      infrastructure: [infrastructureAvailable({cliAvailable: false})],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const exit = await runPhaseExit(harness.phase, harness.context, harness.layer);

    expect(Exit.hasInterrupts(exit)).toBe(true);
    expect(harness.inspection.invalidate).toHaveBeenCalledExactlyOnceWith("infrastructure", "aggregate");
    expect(harness.inspection.events).toEqual([
      "updateInfrastructureEngine",
      "inspect:infrastructure",
      "invalidate:infrastructure+aggregate",
    ]);
  });

  it("fails when shared infrastructure inspection returns unavailable", async () => {
    const harness = createHarness({
      infrastructure: [unavailableInfra("Certificate path is unreadable.")],
      config: {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.summary).toContain("Shared infrastructure inspection failed");
    expect(result.evidence.join("\n")).toContain("Certificate path is unreadable.");
  });

  it("gives port blockers precedence over planned persistence", async () => {
    const harness = createHarness({
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
    const harness = createHarness({
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
});

describe("infrastructure characterization (pre-Effect migration)", () => {
  const wingetVersionKey = commandKey({command: "winget", args: ["--version"]});
  const rancherInstallKey = commandKey({
    command: "winget",
    args: ["install", "--id", "SUSE.RancherDesktop", "--exact", "--accept-package-agreements", "--accept-source-agreements"],
  });
  const persistedRancher: ToolingConfigSeed = {status: "valid", config: {schemaVersion: 1, containerEngine: "rancher"}};

  function withRootPlaceholder(value: unknown): unknown {
    const escapedRoot = JSON.stringify(paths.root).slice(1, -1);
    return JSON.parse(JSON.stringify(value).split(escapedRoot).join("<root>"));
  }

  function observe(harness: Harness, result: SetupPhaseResult): unknown {
    return withRootPlaceholder({
      result,
      actionIds: harness.actionIds,
      commands: harness.runner.calls.map(({request}) => request),
      writes: harness.writes,
    });
  }

  it("pins the exact result when the runtime, ports, manifests, and certificates are already ready", async () => {
    // Arrange
    const harness = createHarness({config: persistedRancher});

    // Act
    const observed = observe(harness, await runPhase(harness));

    // Assert
    expect(observed).toEqual({
      result: {
        id: "infrastructure",
        status: "succeeded",
        summary: "Local infrastructure is ready.",
        evidence: [
          "Selected Rancher Desktop from argument.",
          "The persisted container engine selection is already current.",
          "Rancher Desktop runtime postcondition is satisfied.",
          "Port 3000 is available.",
          "Port 3002 is available.",
          "Port 4173 is available.",
          "Port 5000 is available.",
          "Port 5002 is available.",
          "Port 6379 is available.",
          "Port 8081 is available.",
          "Port 8082 is available.",
          "Port 10000 is available.",
          "Optional selfhost certificate and key are present.",
        ],
        nextActions: [],
        durationMs: 1,
      },
      actionIds: [],
      commands: [],
      writes: [],
    });
  });

  it("pins the exact result when the container CLI is missing and the winget installation proposal succeeds", async () => {
    // Arrange
    const harness = createHarness({
      config: persistedRancher,
      responses: {[wingetVersionKey]: succeeded({stdout: "v1.10"})},
      infrastructure: [infrastructureAvailable({cliAvailable: false}), infrastructureAvailable()],
    });

    // Act
    const observed = observe(harness, await runPhase(harness));

    // Assert
    expect(observed).toEqual({
      result: {
        id: "infrastructure",
        status: "succeeded",
        summary: "Local infrastructure is ready.",
        evidence: [
          "Selected Rancher Desktop from argument.",
          "The persisted container engine selection is already current.",
          "Executed action: infrastructure.container.install",
          "Rancher Desktop runtime postcondition is satisfied.",
          "Port 3000 is available.",
          "Port 3002 is available.",
          "Port 4173 is available.",
          "Port 5000 is available.",
          "Port 5002 is available.",
          "Port 6379 is available.",
          "Port 8081 is available.",
          "Port 8082 is available.",
          "Port 10000 is available.",
          "Optional selfhost certificate and key are present.",
        ],
        nextActions: [],
        durationMs: 1,
      },
      actionIds: ["infrastructure.container.install"],
      commands: [
        {command: "winget", args: ["--version"]},
        {
          command: "winget",
          args: ["install", "--id", "SUSE.RancherDesktop", "--exact", "--accept-package-agreements", "--accept-source-agreements"],
        },
      ],
      writes: [],
    });
  });

  it("pins the exact result when the winget installation proposal fails", async () => {
    // Arrange
    const harness = createHarness({
      config: persistedRancher,
      responses: {[wingetVersionKey]: succeeded({stdout: "v1.10"}), [rancherInstallKey]: exited(1, {stderr: "winget installer failed"})},
      infrastructure: [infrastructureAvailable({cliAvailable: false})],
    });

    // Act
    const observed = observe(harness, await runPhase(harness));

    // Assert
    expect(observed).toEqual({
      result: {
        id: "infrastructure",
        status: "failed",
        summary: "Local infrastructure preparation failed.",
        evidence: ["Container runtime installation failed.\nCommand exited with code 1.\nwinget installer failed"],
        nextActions: ["Resolve the reported infrastructure preparation failure, then rerun setup."],
        durationMs: 1,
      },
      actionIds: ["infrastructure.container.install"],
      commands: [
        {command: "winget", args: ["--version"]},
        {
          command: "winget",
          args: ["install", "--id", "SUSE.RancherDesktop", "--exact", "--accept-package-agreements", "--accept-source-agreements"],
        },
      ],
      writes: [],
    });
  });

  it("pins a mutation-free dry run when the engine changes and the container CLI and certificates are missing", async () => {
    // Arrange
    const options = setupOptions({engine: "podman", dryRun: true});
    const dryRun = productionActions(options);
    const harness = createHarness({
      options,
      actions: () => dryRun.layer,
      config: persistedRancher,
      responses: {[wingetVersionKey]: succeeded({stdout: "v1.10"})},
      infrastructure: [
        infrastructureAvailable({
          selectedEngine: "podman",
          cliAvailable: false,
          certificateIssues: ["Missing selfhost certificate file: infra/Local/Management/certs/local-cert.pem"],
        }),
      ],
    });

    // Act
    const result = await runPhase(harness);
    const observed = withRootPlaceholder({
      result,
      actionLines: setupActionLines(harness.platform.output()),
      executed: dryRun.executed,
      commands: harness.runner.calls.map(({request}) => request),
      writes: harness.writes,
      createdDirectories: harness.createdDirectories,
      inspectionEvents: harness.inspection.events,
    });

    // Assert
    expect(observed).toEqual({
      result: {
        id: "infrastructure",
        status: "skipped",
        summary: "Local infrastructure preparation is planned by dry-run.",
        evidence: [
          "Selected Podman Desktop from argument.",
          "Planned action: infrastructure.engine.persist",
          "Podman Desktop runtime postcondition failed: the podman CLI is not available.",
          "Planned action: infrastructure.container.install",
          "Port 3000 is available.",
          "Port 3002 is available.",
          "Port 4173 is available.",
          "Port 5000 is available.",
          "Port 5002 is available.",
          "Port 6379 is available.",
          "Port 8081 is available.",
          "Port 8082 is available.",
          "Port 10000 is available.",
          "Optional selfhost certificate generation is required.",
          "mkcert is available.",
          "Planned action: infrastructure.mkcert.trust",
          "Planned action: infrastructure.certificates.generate",
        ],
        nextActions: [],
        durationMs: 1,
      },
      actionLines: [
        "stdout: [arolariu::setup] ℹ️ Planned setup action 'infrastructure.engine.persist' (repository): Persist Podman Desktop as the non-secret local container engine selection.",
        "stdout: [arolariu::setup] ℹ️ Planned setup action 'infrastructure.container.install' (system): Install Podman Desktop with Windows Package Manager.",
        "stdout: [arolariu::setup] ℹ️ Planned setup action 'infrastructure.mkcert.trust' (system): Install the mkcert local certificate authority into the system trust stores.",
        "stdout: [arolariu::setup] ℹ️ Planned setup action 'infrastructure.certificates.generate' (user): Generate the ignored localhost certificate and private key for selfhost.",
      ],
      executed: [],
      commands: [
        {command: "winget", args: ["--version"]},
        {command: "mkcert", args: ["--version"]},
      ],
      writes: [],
      createdDirectories: [],
      inspectionEvents: ["updateInfrastructureEngine", "inspect:infrastructure"],
    });
  });
});
