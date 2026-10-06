// @vitest-environment node
/**
 * @fileoverview Contract tests for React, website environment, and Playwright setup.
 * @module scripts/commands/setup/phases/react.test
 *
 * @remarks
 * Every test runs the real Effect phase on the in-memory `makeTestLayer` harness: a filesystem
 * that records atomic writes and mode changes, request-keyed scripted commands replaying
 * legacy-shaped outcomes, a recording inspection session that replays per-key outcome sequences
 * and records every inspection event in order, scripted prompts, a recording `SetupActions`, and
 * an environment snapshot supplying the host platform and the terminal signal. Phases run under a
 * counting clock (see `runPhase`), so each reports the deterministic duration of its legacy test
 * clock. No test in this file reads the live checkout, spawns a process, mocks a repository
 * module, or observes ambient Node state.
 */

import {join, resolve} from "node:path";

import {Effect, Exit, FileSystem, Layer, PlatformError, Redacted, Terminal} from "effect";
import {afterEach, describe, expect, it, vi} from "vitest";

import {createRepositoryPaths} from "../../../common/repository-paths.ts";
import type {PackageRequirement, RepositoryRequirements} from "../../../common/requirements.ts";
import type {EnvironmentFacts, ReactFacts} from "../../../inspection/frontend.ts";
import type {InstalledPackageFact, PackageInventoryFacts} from "../../../inspection/packages.ts";
import type {RepositoryInspectionKey, RepositoryInspectionSession} from "../../../inspection/repository.ts";
import type {InspectionOutcome} from "../../../inspection/types.ts";
import type {Presenter} from "../../../platform/Output.ts";
import type {ProcessRequest} from "../../../platform/Process.ts";
import {Prompts} from "../../../platform/Prompts.ts";
import {makeTestLayer, type RecordedProcessCall, type TestHarness} from "../../../platform/testing.ts";
import type {SetupActions} from "../actions.ts";
import {
  interruptingActions,
  keyedResponder,
  productionActions,
  recordingActions,
  runPhase as runPhaseWith,
  runPhaseExit,
  scriptedCommands,
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
import {createReactSetupPhase, reactSetupPhase} from "./react.ts";

const paths = createRepositoryPaths(resolve("C:\\fixture\\arolariu.ro"));
const lockedPackageVersions = new Map<string, string>([
  ["react", "19.2.8"],
  ["react-dom", "19.2.8"],
  ["next", "16.3.0"],
  ["@clerk/nextjs", "7.6.5"],
  ["@docusaurus/core", "3.10.2"],
  ["@playwright/test", "1.62.1"],
  ["playwright", "1.62.1"],
]);
const workspaceLinkedPackage = "@arolariu/components";
const workspaceLinkedRoot = "packages/components";
const installedComponentsVersion = "2.3.0";
const lockedPlaywrightVersion = "1.62.1";
/**
 * Pre-migration ceiling for every long-running Playwright installation.
 *
 * @remarks
 * Setup commands default to 120s, which is bounded for the `install-deps --dry-run` probe but far
 * too short for a browser or host-library download, so every such mutation requests this timeout
 * explicitly.
 */
const LEGACY_MUTATION_TIMEOUT_MS = 1_200_000;
/** The setup command default timeout every probe runs with. */
const PHASE_COMMAND_TIMEOUT_MS = 120_000;
const browserInstallCommand: ProcessRequest = {
  command: "npx",
  args: ["--no-install", "playwright", "install", "chromium"],
};
const dependencyProbeCommand: ProcessRequest = {
  command: "npx",
  args: ["--no-install", "playwright", "install-deps", "--dry-run", "chromium"],
};
const dependencyInstallCommand: ProcessRequest = {
  command: "npx",
  args: ["--no-install", "playwright", "install-deps", "chromium"],
};
const packageInventoryCommand: ProcessRequest = {
  command: "npm",
  args: ["ls", "--json", "--depth=0"],
};
const browserInventoryCommand: ProcessRequest = {
  command: "npx",
  args: ["--no-install", "playwright", "install", "--list"],
};
const completeEnvironment = [
  "SITE_ENV=DEVELOPMENT",
  "SITE_NAME=dev.arolariu.ro",
  "SITE_URL=https://localhost:3000",
  "USE_CDN=false",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_existing",
  "CLERK_SECRET_KEY=sk_test_existing",
  "",
].join("\n");

function succeeded(patch: Readonly<{stdout?: string; stderr?: string}> = {}): ScriptedCommandOutcome {
  return {kind: "succeeded", exitCode: 0, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function exited(exitCode: number, patch: Readonly<{stdout?: string; stderr?: string}> = {}): ScriptedCommandOutcome {
  return {kind: "exited", exitCode, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function timedOut(): ScriptedCommandOutcome {
  return {kind: "timed-out", stdout: "", stderr: "", durationMs: 1};
}

function cancelledOutcome(): ScriptedCommandOutcome {
  return {kind: "cancelled"};
}

function commandKey(command: Readonly<ProcessRequest>): string {
  return [command.command, ...command.args].join("\u0000");
}

function requirement(name: string, version: string): PackageRequirement {
  return {name, version};
}

function requirements(input: Readonly<{patch?: ReadonlyMap<string, string>; omit?: string}> = {}): RepositoryRequirements {
  const packages = new Map<string, PackageRequirement>();
  for (const [name, version] of lockedPackageVersions) {
    if (name === input.omit) {
      continue;
    }
    packages.set(name, requirement(name, input.patch?.get(name) ?? version));
  }
  packages.set(workspaceLinkedPackage, requirement(workspaceLinkedPackage, "2.2.0"));
  return {
    node: {major: 24, minor: 0, patch: 0},
    npm: {major: 11, minor: 0, patch: 0},
    dotnet: {major: 10, minor: 0, patch: 0},
    python: {major: 3, minor: 12, patch: 0},
    packages,
  };
}

function options(patch: Partial<SetupInput> = {}): SetupInput {
  return {
    verbose: false,
    dryRun: false,
    yes: false,
    ...patch,
  };
}

function inventory(
  patch: Readonly<{
    absent?: readonly string[];
    versions?: ReadonlyMap<string, string>;
    componentsWorkspaceRoot?: string | null;
    malformed?: readonly string[];
  }> = {},
): PackageInventoryFacts {
  const installed: Record<string, InstalledPackageFact> = {};
  for (const [name, version] of lockedPackageVersions) {
    if (patch.absent?.includes(name) === true) {
      continue;
    }
    installed[name] = {version: patch.versions?.get(name) ?? version};
  }
  if (patch.absent?.includes(workspaceLinkedPackage) !== true) {
    const workspaceRoot = patch.componentsWorkspaceRoot === undefined ? workspaceLinkedRoot : patch.componentsWorkspaceRoot;
    installed[workspaceLinkedPackage] = {
      version: installedComponentsVersion,
      ...(workspaceRoot === null ? {} : {workspaceRoot}),
    };
  }
  return {installed, malformed: patch.malformed ?? []};
}

const emptyInventory: PackageInventoryFacts = {installed: {}, malformed: []};

function environmentFacts(patch: Partial<EnvironmentFacts> = {}): EnvironmentFacts {
  return {
    syntaxErrors: [],
    presentKeys: ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "SITE_ENV", "SITE_NAME", "SITE_URL", "USE_CDN"],
    missingCoreKeys: [],
    missingAuthenticationKeys: [],
    ...patch,
  };
}

type PlaywrightFacts = ReactFacts["playwright"];

function playwrightFacts(patch: Readonly<{version?: string | null; browsers?: readonly string[]}> = {}): PlaywrightFacts {
  const version = patch.version === undefined ? lockedPlaywrightVersion : patch.version;
  return {
    ...(version === null ? {} : {version}),
    browsers: patch.browsers ?? ["chromium-1179", "ffmpeg-1011"],
  };
}

function reactFacts(patch: Partial<ReactFacts> = {}): ReactFacts {
  return {
    packages: inventory(),
    workspaceLinkIssues: [],
    environment: environmentFacts(),
    i18nIssues: [],
    artifactIssues: [],
    playwright: playwrightFacts(),
    frameworkIssues: [],
    ...patch,
  };
}

function reactAvailable(patch: Partial<ReactFacts> = {}): InspectionOutcome<ReactFacts> {
  return {kind: "available", value: reactFacts(patch), durationMs: 1};
}

function packagesAvailable(value: PackageInventoryFacts = inventory()): InspectionOutcome<PackageInventoryFacts> {
  return {kind: "available", value, durationMs: 1};
}

function unavailable<T>(reason = "The Playwright browser inventory could not be read."): InspectionOutcome<T> {
  return {kind: "unavailable", reason, durationMs: 1};
}

function invalid<T>(
  issues: readonly string[] = ["The Playwright browser inventory reported multiple ambiguous versions."],
): InspectionOutcome<T> {
  return {kind: "invalid", issues, durationMs: 1};
}

interface InspectionHarness {
  readonly session: RepositoryInspectionSession;
  readonly inspect: ReturnType<typeof vi.fn>;
  readonly invalidate: ReturnType<typeof vi.fn>;
  readonly events: string[];
}

/** A controllable fake session resolving only the `"packages"` and `"react"` keys, in call order. */
function createInspectionHarness(
  input: Readonly<{
    packages?: readonly InspectionOutcome<PackageInventoryFacts>[];
    react?: readonly InspectionOutcome<ReactFacts>[];
  }> = {},
): InspectionHarness {
  const sequences: Readonly<Record<string, readonly InspectionOutcome<unknown>[]>> = {
    packages: input.packages ?? [packagesAvailable()],
    react: input.react ?? [reactAvailable()],
  };
  const offsets = new Map<string, number>();
  const events: string[] = [];
  const inspect = vi.fn((key: string): InspectionOutcome<unknown> => {
    events.push(`inspect:${key}`);
    const sequence = sequences[key];
    if (sequence === undefined || sequence.length === 0) {
      return {kind: "unavailable", reason: "Not exercised by this test.", durationMs: 0};
    }
    const offset = offsets.get(key) ?? 0;
    offsets.set(key, offset + 1);
    return sequence[Math.min(offset, sequence.length - 1)]!;
  });
  const invalidate = vi.fn((...keys: string[]) => {
    events.push(`invalidate:${keys.join("+")}`);
  });
  const session: RepositoryInspectionSession = {
    inspect: <K extends RepositoryInspectionKey>(key: K) => Effect.sync(() => inspect(key) as never),
    invalidate: (...keys) =>
      Effect.sync(() => {
        invalidate(...keys.map(String));
      }),
    updateInfrastructureEngine: () => Effect.void,
  };
  return {session, inspect, invalidate, events};
}

/** One atomic write the phase performed through the platform `writeTextAtomic`. */
interface RecordedWrite {
  readonly path: string;
  readonly contents: string;
  readonly mode: number | undefined;
}

/**
 * The seeded website environment, the host snapshot, and every filesystem mutation the phase made.
 *
 * @remarks
 * One fixture carries both the recording filesystem state and the platform/terminal facts the
 * harness `Environment` reports.
 */
interface ReactFixture {
  /** Seeded files. */
  readonly files: Readonly<Record<string, string>>;
  /** Host platform the environment snapshot reports. */
  readonly platform: NodeJS.Platform;
  /** Whether the environment snapshot reports an interactive terminal. */
  readonly interactive: boolean;
  /** When set, the atomic write's temporary file fails with this description. */
  readonly failAtomicWrite?: string;
  /** Every atomic write (temporary file then rename), in call order. */
  readonly writes: RecordedWrite[];
  /** Every non-atomic write path, which the environment mutation must never produce. */
  readonly nonAtomicWrites: string[];
  /** Every `chmod` call, in call order. */
  readonly modes: Array<Readonly<{path: string; mode: number}>>;
  /** Reads the current stored content of a path, or `undefined` when it does not exist. */
  readonly read: (path: string) => Promise<string | undefined>;
  /** Binds {@link ReactFixture.read} to the harness filesystem store. */
  readonly bind: (harness: TestHarness) => void;
}

/**
 * Creates the recording filesystem fixture the React phase writes the website environment through.
 *
 * @param input - Optional seeded `.env` content (`null` seeds no file at all), host snapshot, and
 * atomic-write failure.
 * @returns The fixture.
 */
function createReactFixture(
  input: Readonly<{environment?: string | null; platform?: NodeJS.Platform; interactive?: boolean; failAtomicWrite?: string}> = {},
): ReactFixture {
  let store: TestHarness | undefined;
  return {
    files: input.environment === null ? {} : {[paths.websiteEnvironment]: input.environment ?? completeEnvironment},
    platform: input.platform ?? "win32",
    interactive: input.interactive ?? false,
    ...(input.failAtomicWrite === undefined ? {} : {failAtomicWrite: input.failAtomicWrite}),
    writes: [],
    nonAtomicWrites: [],
    modes: [],
    read: async (path: string): Promise<string | undefined> => {
      const value = store?.files().get(path.replaceAll("\\", "/"));
      return value === undefined ? undefined : String(value);
    },
    bind: (harness) => {
      store = harness;
    },
  };
}

/** Matches the temporary sibling `writeTextAtomic` writes before renaming it over its destination. */
const ATOMIC_TEMPORARY_FILE = /^(.*)[\\/]\.(.+)\.[0-9a-f]{16}\.tmp$/u;

/**
 * Re-provides the harness filesystem, recording atomic and non-atomic writes and mode changes.
 *
 * @param fixture - Receives every recorded mutation.
 * @returns The layer.
 */
function recordingEnvironmentFiles(fixture: ReactFixture): Layer.Layer<FileSystem.FileSystem, never, FileSystem.FileSystem> {
  return Layer.effect(
    FileSystem.FileSystem,
    Effect.map(Effect.service(FileSystem.FileSystem), (files) =>
      FileSystem.FileSystem.of({
        ...files,
        writeFileString: (path, data, options) => {
          const temporary = ATOMIC_TEMPORARY_FILE.exec(path);
          if (temporary === null) {
            fixture.nonAtomicWrites.push(path);
          } else {
            if (fixture.failAtomicWrite !== undefined) {
              return Effect.fail(
                PlatformError.systemError({
                  _tag: "PermissionDenied",
                  module: "FileSystem",
                  method: "writeFileString",
                  pathOrDescriptor: path,
                  description: fixture.failAtomicWrite,
                }),
              );
            }
            fixture.writes.push({path: join(temporary[1] ?? "", temporary[2] ?? ""), contents: data, mode: options?.mode});
          }
          return files.writeFileString(path, data, options);
        },
        writeFile: (path, data, options) => {
          fixture.nonAtomicWrites.push(path);
          return files.writeFile(path, data, options);
        },
        chmod: (path, mode) =>
          Effect.sync(() => {
            fixture.modes.push({path, mode});
          }),
      }),
    ),
  );
}

/** One recorded child invocation. */
type RecordedCall = RecordedProcessCall;

/** Everything one React phase test needs to drive and observe the phase. */
interface ReactHarness {
  /** The phase under test. */
  readonly phase: SetupPhaseDefinition;
  /** The setup context handed to the phase. */
  readonly context: SetupContext;
  /** The recording filesystem fixture the phase writes the website environment through. */
  readonly fixture: ReactFixture;
  /** The in-memory platform harness. */
  readonly platform: TestHarness;
  /** Every recorded process call, in order. */
  readonly runner: {readonly calls: readonly RecordedCall[]};
  /** Action identifiers in evaluation order. */
  readonly actionIds: string[];
  /** Complete action records in evaluation order. */
  readonly actionRecords: readonly SetupAction[];
  /** Text prompt probe. */
  readonly text: ReturnType<typeof vi.fn<(message: string) => void>>;
  /** Secret prompt probe. */
  readonly secret: ReturnType<typeof vi.fn<(message: string) => void>>;
  /** Inspection session probe. */
  readonly inspect: ReturnType<typeof vi.fn>;
  /** Inspection invalidation probe. */
  readonly invalidate: ReturnType<typeof vi.fn>;
  /** Ordered inspection events. */
  readonly events: string[];
  /** Every service the phase runs with. */
  readonly layer: Layer.Layer<SetupRequirements>;
}

async function createHarness(
  input: Readonly<{
    fixture?: ReactFixture;
    responses?: Readonly<Record<string, ScriptedCommandOutcome | readonly ScriptedCommandOutcome[]>>;
    dispositions?: Readonly<Record<string, SetupActionDisposition>>;
    setupOptions?: SetupInput;
    requirementsOverride?: RepositoryRequirements;
    packages?: readonly InspectionOutcome<PackageInventoryFacts>[];
    react?: readonly InspectionOutcome<ReactFacts>[];
    textAnswers?: readonly string[];
    secretAnswers?: readonly string[];
    /** Replaces the recording consent policy. */
    actions?: (recording: Layer.Layer<SetupActions>) => Layer.Layer<SetupActions, never, Presenter>;
    platform?: NodeJS.Platform;
    interactive?: boolean;
  }> = {},
): Promise<ReactHarness> {
  const fixture = input.fixture ?? createReactFixture();
  const interactive = input.interactive ?? fixture.interactive;
  const platform = makeTestLayer({
    files: fixture.files,
    processes: [scriptedCommands(keyedResponder(input.responses ?? {}))],
    environment: {
      cwd: paths.root,
      executablePath: "C:\\Program Files\\nodejs\\node.exe",
      platform: input.platform ?? fixture.platform,
      architecture: "x64",
      stdinIsTTY: interactive,
      stdoutIsTTY: interactive,
      isCI: !interactive,
    },
    context: "setup::react",
  });
  fixture.bind(platform);

  const textAnswers = [...(input.textAnswers ?? [])];
  const secretAnswers = [...(input.secretAnswers ?? [])];
  const text = vi.fn<(message: string) => void>();
  const secret = vi.fn<(message: string) => void>();
  const refuse = (): Effect.Effect<never> => Effect.die(new Error("The React phase never asks for a confirmation or a choice."));
  const prompts = Prompts.of({
    confirm: refuse,
    select: refuse,
    text: (message) =>
      Effect.sync(() => {
        text(message);
        return textAnswers.shift() ?? "";
      }),
    secret: (message) =>
      Effect.sync(() => {
        secret(message);
        return Redacted.make(secretAnswers.shift() ?? "");
      }),
  });

  const recording = recordingActions(false, input.dispositions);
  const actions = input.actions === undefined ? recording.layer : input.actions(recording.layer);
  const inspection = createInspectionHarness({
    ...(input.packages === undefined ? {} : {packages: input.packages}),
    ...(input.react === undefined ? {} : {react: input.react}),
  });

  const context: SetupContext = {
    options: input.setupOptions ?? options(),
    paths,
    requirements: input.requirementsOverride ?? requirements(),
    inspection: inspection.session,
  };

  return {
    phase: createReactSetupPhase(),
    context,
    fixture,
    platform,
    runner: {
      get calls(): readonly RecordedCall[] {
        return platform.processCalls();
      },
    },
    actionIds: recording.actionIds,
    get actionRecords(): readonly SetupAction[] {
      return recording.run.mock.calls.map(([action]) => action);
    },
    text,
    secret,
    inspect: inspection.inspect,
    invalidate: inspection.invalidate,
    events: inspection.events,
    layer: Layer.mergeAll(actions, Layer.succeed(Prompts, prompts), recordingEnvironmentFiles(fixture)).pipe(
      Layer.provideMerge(platform.layer),
    ),
  };
}

/**
 * Runs the phase against its harness.
 *
 * @param harness - Assembled test harness.
 * @returns The completed phase result.
 */
function runPhase(harness: ReactHarness): Promise<SetupPhaseResult> {
  return runPhaseWith(harness.phase, harness.context, harness.layer);
}

function callsFor(harness: ReactHarness, command: Readonly<ProcessRequest>): readonly RecordedCall[] {
  return harness.runner.calls.filter(({request}) => commandKey(request) === commandKey(command));
}

function callFor(harness: ReactHarness, command: Readonly<ProcessRequest>): RecordedCall | undefined {
  return callsFor(harness, command)[0];
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock("@azure/identity");
});

describe("website environment atomic write boundary", () => {
  it("writes the secret-bearing environment file only through the atomic filesystem capability", async () => {
    const fixture = createReactFixture({environment: null});
    const harness = await createHarness({
      fixture,
      react: [reactAvailable({environment: environmentFacts({presentKeys: []})}), reactAvailable()],
    });

    await expect(runPhase(harness)).resolves.toMatchObject({status: "degraded"});

    expect(fixture.writes).toHaveLength(1);
    expect(fixture.writes[0]).toMatchObject({path: paths.websiteEnvironment, mode: 0o600});
    expect(fixture.nonAtomicWrites).toEqual([]);
    await expect(fixture.read(paths.websiteEnvironment)).resolves.toBe(fixture.writes[0]?.contents);
  });

  it("leaves an existing environment file byte-for-byte untouched when the atomic write fails", async () => {
    const original = "CLERK_SECRET_KEY=sk_test_original\n";
    const fixture = createReactFixture({environment: original, failAtomicWrite: "EPERM: simulated atomic write failure"});
    const harness = await createHarness({
      fixture,
      react: [reactAvailable({environment: environmentFacts({presentKeys: ["CLERK_SECRET_KEY"]})})],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("simulated atomic write failure");
    expect(JSON.stringify({records: harness.platform.output(), result})).not.toContain("sk_test_original");
    await expect(fixture.read(paths.websiteEnvironment)).resolves.toBe(original);
    expect(fixture.nonAtomicWrites).toEqual([]);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("react");
  });
});

describe("React setup public contract", () => {
  it("publishes a required phase with both workspace dependencies", () => {
    expect(reactSetupPhase).toMatchObject({
      id: "react",
      required: true,
      dependsOn: ["workspace.root-dependencies", "workspace.generators"],
    });
  });

  it("keeps the setup import graph safe before external packages are restored", async () => {
    vi.resetModules();
    vi.doMock("@azure/identity", () => {
      throw new Error("Azure identity loaded eagerly");
    });

    await expect(import("./react.ts")).resolves.toMatchObject({
      createReactSetupPhase: expect.any(Function),
      prepareWebsiteEnvironment: expect.any(Function),
      reactSetupPhase: expect.any(Object),
    });
  });
});

describe("shared fact consumption", () => {
  it("consumes exactly the shared packages and react facts and runs no inventory command", async () => {
    const harness = await createHarness();

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.events).toEqual(["inspect:packages", "inspect:react"]);
    expect(harness.inspect.mock.calls.map(([key]) => key)).toEqual(["packages", "react"]);
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.runner.calls).toEqual([]);
  });

  it.each([
    ["unavailable", unavailable<PackageInventoryFacts>("The repository root could not be inspected for installed package metadata.")],
    ["invalid", invalid<PackageInventoryFacts>(["Installed package metadata is malformed for 'next'."])],
  ])("fails when the shared package inventory is %s", async (_name, outcome) => {
    const harness = await createHarness({packages: [outcome]});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/installed package metadata|repository root/i);
    expect(harness.actionIds).toEqual([]);
    expect(harness.runner.calls).toEqual([]);
  });

  it.each([
    ["unavailable", unavailable<ReactFacts>()],
    ["invalid", invalid<ReactFacts>()],
  ])("fails when the shared React facts are %s", async (_name, outcome) => {
    const harness = await createHarness({react: [outcome]});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/Playwright browser inventory/i);
    expect(harness.actionIds).toEqual([]);
    expect(harness.runner.calls).toEqual([]);
  });

  it("defers a fresh-checkout dry-run only when the shared inventory proves every package is absent", async () => {
    const fixture = createReactFixture({environment: null});
    const harness = await createHarness({
      fixture,
      packages: [packagesAvailable(emptyInventory)],
      react: [unavailable<ReactFacts>()],
      setupOptions: options({dryRun: true}),
      dispositions: {
        "react.environment.write": "planned",
        "react.playwright.chromium.install": "planned",
      },
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toEqual(["react.environment.write", "react.playwright.chromium.install"]);
    expect(result.evidence.join("\n")).toMatch(/workspace\.root-dependencies/);
    expect(harness.runner.calls).toEqual([]);
    expect(fixture.writes).toHaveLength(0);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("does not defer a fresh-checkout dry-run when only some required packages are absent", async () => {
    const harness = await createHarness({
      packages: [packagesAvailable(inventory({absent: ["next"]}))],
      react: [unavailable<ReactFacts>()],
      setupOptions: options({dryRun: true}),
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual([]);
  });

  it("never defers an invalid React fact in a fresh-checkout dry-run", async () => {
    const harness = await createHarness({
      packages: [packagesAvailable(emptyInventory)],
      react: [invalid<ReactFacts>()],
      setupOptions: options({dryRun: true}),
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual([]);
  });
});

describe("locked package policy", () => {
  it("fails before inspecting any fact when a manifest package requirement is missing", async () => {
    const harness = await createHarness({requirementsOverride: requirements({omit: "next"})});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("next");
    expect(harness.inspect).not.toHaveBeenCalled();
  });

  it("requires playwright and @playwright/test to share one manifest-derived version", async () => {
    const harness = await createHarness({requirementsOverride: requirements({patch: new Map([["playwright", "1.61.0"]])})});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/playwright/i);
    expect(harness.inspect).not.toHaveBeenCalled();
  });

  it("fails when an installed package version disagrees with its locked requirement", async () => {
    const harness = await createHarness({packages: [packagesAvailable(inventory({versions: new Map([["react", "18.3.1"]])}))]});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/react.*18\.3\.1|18\.3\.1.*react/i);
    expect(harness.actionIds).toEqual([]);
  });

  it("fails when a required package is absent outside dry-run", async () => {
    const harness = await createHarness({packages: [packagesAvailable(inventory({absent: ["@clerk/nextjs"]}))]});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("@clerk/nextjs");
  });

  it("defers absent required packages to the planned root-dependency action during dry-run", async () => {
    const harness = await createHarness({
      packages: [packagesAvailable(inventory({absent: ["@clerk/nextjs"]}))],
      setupOptions: options({dryRun: true}),
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toMatch(/workspace\.root-dependencies/);
  });

  it("requires the components package to resolve to the local workspace link", async () => {
    const harness = await createHarness({packages: [packagesAvailable(inventory({componentsWorkspaceRoot: null}))]});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/@arolariu\/components/);
  });

  it("fails when the components package is linked outside the packages/components workspace", async () => {
    const harness = await createHarness({packages: [packagesAvailable(inventory({componentsWorkspaceRoot: "sites/arolariu.ro"}))]});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/@arolariu\/components/);
  });

  it("fails when the shared React facts report workspace link issues", async () => {
    const harness = await createHarness({
      react: [reactAvailable({workspaceLinkIssues: ["sites/arolariu.ro/project.json build target does not depend on components:build."]})],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("components:build");
  });

  it("fails when the shared inventory reports a malformed required package manifest", async () => {
    const harness = await createHarness({packages: [packagesAvailable(inventory({malformed: ["next"]}))]});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("next");
  });
});

describe("website contract postconditions", () => {
  it.each([
    ["i18n", {i18nIssues: ["ro.json is missing 3 key(s) present in en.json, e.g. 'about.title'."]}],
    ["framework", {frameworkIssues: ["next.config.ts does not call createNextIntlPlugin."]}],
  ])("fails on %s contract defects even during dry-run", async (_name, patch) => {
    const harness = await createHarness({react: [reactAvailable(patch)], setupOptions: options({dryRun: true})});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual([]);
  });

  it("fails when a generated artifact is absent outside dry-run", async () => {
    const harness = await createHarness({react: [reactAvailable({artifactIssues: ["licenses.json is missing."]})]});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("licenses.json is missing.");
  });

  it("defers absent generated artifacts to the planned generator action during dry-run", async () => {
    const harness = await createHarness({
      react: [reactAvailable({artifactIssues: ["licenses.json is missing.", "messages/fr.json is missing."]})],
      setupOptions: options({dryRun: true}),
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toMatch(/workspace\.generators/);
  });

  it("never defers a malformed generated artifact during dry-run", async () => {
    const harness = await createHarness({
      react: [reactAvailable({artifactIssues: ["licenses.json contains malformed license entries."]})],
      setupOptions: options({dryRun: true}),
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("malformed license entries");
  });

  it("fails on website environment syntax errors before prompting or writing", async () => {
    const fixture = createReactFixture({environment: "SITE_ENV\n", interactive: true});
    const harness = await createHarness({
      fixture,
      react: [reactAvailable({environment: environmentFacts({syntaxErrors: ["Line 1: expected KEY=VALUE syntax."]})})],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Line 1: expected KEY=VALUE syntax.");
    expect(harness.text).not.toHaveBeenCalled();
    expect(fixture.writes).toHaveLength(0);
    expect(harness.actionIds).toEqual([]);
  });
});

describe("website environment preparation", () => {
  it("creates an absent file with ordered safe defaults and valid prompted Clerk credentials", async () => {
    const fixture = createReactFixture({environment: null, interactive: true});
    const publishable = "pk_test_entered-publishable";
    const secret = "sk_test_entered-secret";
    const harness = await createHarness({
      fixture,
      textAnswers: [publishable],
      secretAnswers: [secret],
      react: [reactAvailable({environment: environmentFacts({presentKeys: []})}), reactAvailable()],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.find(({id}) => id === "react.environment.write")?.scope).toBe("repository");
    expect(fixture.writes).toHaveLength(1);
    expect(fixture.writes[0]).toMatchObject({path: paths.websiteEnvironment, mode: 0o600});
    expect(fixture.writes[0]?.contents).toBe(
      [
        "# arolariu.ro setup-managed values",
        "SITE_ENV=DEVELOPMENT",
        "SITE_NAME=dev.arolariu.ro",
        "SITE_URL=https://localhost:3000",
        "USE_CDN=false",
        `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${publishable}`,
        `CLERK_SECRET_KEY=${secret}`,
        "# End arolariu.ro setup-managed values",
        "",
      ].join("\n"),
    );
  });

  it("invalidates exactly the react fact and re-inspects it immediately after an executed write", async () => {
    const fixture = createReactFixture({environment: null, interactive: true});
    const harness = await createHarness({
      fixture,
      textAnswers: ["pk_test_written"],
      secretAnswers: ["sk_test_written"],
      react: [reactAvailable({environment: environmentFacts({presentKeys: []})}), reactAvailable()],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.events).toEqual(["inspect:packages", "inspect:react", "invalidate:react", "inspect:react"]);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("react");
  });

  it("fails when refreshed facts omit a written setup-owned key", async () => {
    const fixture = createReactFixture({environment: null, interactive: false});
    const harness = await createHarness({
      fixture,
      react: [
        reactAvailable({environment: environmentFacts({presentKeys: []})}),
        reactAvailable({environment: environmentFacts({presentKeys: ["SITE_ENV", "SITE_NAME", "SITE_URL"]})}),
      ],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("USE_CDN");
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("react");
  });

  it("fails when refreshed facts report an environment syntax regression", async () => {
    const fixture = createReactFixture({environment: null, interactive: false});
    const harness = await createHarness({
      fixture,
      react: [
        reactAvailable({environment: environmentFacts({presentKeys: []})}),
        reactAvailable({environment: environmentFacts({syntaxErrors: ["Line 9: 'SITE ENV' is not a valid environment key name."]})}),
      ],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Line 9");
  });

  it("fails when the react fact cannot be re-inspected after an executed write", async () => {
    const fixture = createReactFixture({environment: null, interactive: false});
    const harness = await createHarness({
      fixture,
      react: [reactAvailable({environment: environmentFacts({presentKeys: []})}), unavailable<ReactFacts>()],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("react.environment.write");
  });

  it("preserves user comments and values byte-for-byte and appends only missing keys", async () => {
    const original = "# user-owned\r\nSITE_NAME=custom\r\nSITE_URL=https://custom.test\r\n";
    const fixture = createReactFixture({environment: original, interactive: false});
    const harness = await createHarness({
      fixture,
      react: [
        reactAvailable({environment: environmentFacts({presentKeys: ["SITE_NAME", "SITE_URL"]})}),
        reactAvailable({environment: environmentFacts({presentKeys: ["SITE_ENV", "SITE_NAME", "SITE_URL", "USE_CDN"]})}),
      ],
    });

    const result = await runPhase(harness);
    const written = fixture.writes[0]?.contents ?? "";

    expect(result.status).toBe("degraded");
    expect(written.startsWith(original)).toBe(true);
    expect(written.slice(original.length)).toBe(
      ["# arolariu.ro setup-managed values", "SITE_ENV=DEVELOPMENT", "USE_CDN=false", "# End arolariu.ro setup-managed values", ""].join(
        "\r\n",
      ),
    );
    expect(written).not.toContain("SITE_NAME=dev.arolariu.ro");
    expect(written).not.toContain("SITE_URL=https://localhost:3000");
  });

  it("never overwrites or prompts for existing empty or invalid Clerk values", async () => {
    const original = [
      "SITE_ENV=DEVELOPMENT",
      "SITE_NAME=dev.arolariu.ro",
      "SITE_URL=https://localhost:3000",
      "USE_CDN=false",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=",
      "CLERK_SECRET_KEY=not-a-secret-key",
      "",
    ].join("\n");
    const fixture = createReactFixture({environment: original, interactive: true});
    const harness = await createHarness({fixture});

    const result = await runPhase(harness);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    expect(result.evidence.join("\n")).toContain("CLERK_SECRET_KEY");
    expect(harness.text).not.toHaveBeenCalled();
    expect(harness.secret).not.toHaveBeenCalled();
    expect(fixture.writes).toHaveLength(0);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("prompts only for the absent half and rejects a mismatched Clerk mode without writing it", async () => {
    const original = [
      "SITE_ENV=DEVELOPMENT",
      "SITE_NAME=dev.arolariu.ro",
      "SITE_URL=https://localhost:3000",
      "USE_CDN=false",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_existing",
      "",
    ].join("\n");
    const fixture = createReactFixture({environment: original, interactive: true});
    const entered = "sk_test_mismatched";
    const harness = await createHarness({fixture, secretAnswers: [entered]});

    const result = await runPhase(harness);

    expect(result.status).toBe("degraded");
    expect(harness.text).not.toHaveBeenCalled();
    expect(harness.secret).toHaveBeenCalledExactlyOnceWith("CLERK_SECRET_KEY");
    expect(fixture.writes).toHaveLength(0);
    expect(result.evidence.join("\n")).not.toContain(entered);
  });

  it("does not prompt noninteractively and reports missing credentials as degraded", async () => {
    const fixture = createReactFixture({environment: null, interactive: false});
    const harness = await createHarness({
      fixture,
      react: [reactAvailable({environment: environmentFacts({presentKeys: []})}), reactAvailable()],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("degraded");
    expect(result.summary).toBe(
      "React tooling is ready, but Clerk credentials are incomplete or invalid outside keyless local development.",
    );
    expect(harness.text).not.toHaveBeenCalled();
    expect(harness.secret).not.toHaveBeenCalled();
    expect(fixture.writes[0]?.contents).not.toMatch(/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=|CLERK_SECRET_KEY=/);
  });

  it("skips empty prompt answers without writing empty credential lines", async () => {
    const fixture = createReactFixture({environment: null, interactive: true});
    const harness = await createHarness({
      fixture,
      textAnswers: ["  "],
      secretAnswers: [""],
      react: [reactAvailable({environment: environmentFacts({presentKeys: []})}), reactAvailable()],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("degraded");
    expect(fixture.writes[0]?.contents).not.toMatch(/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=|CLERK_SECRET_KEY=/);
  });

  it("never exposes an entered credential through output, evidence, or action metadata", async () => {
    const fixture = createReactFixture({environment: null, interactive: true});
    const publishable = "pk_test_redacted-publishable";
    const secret = "sk_test_redacted-secret";
    const harness = await createHarness({
      fixture,
      textAnswers: [publishable],
      secretAnswers: [secret],
      react: [reactAvailable({environment: environmentFacts({presentKeys: []})}), reactAvailable()],
    });

    const result = await runPhase(harness);
    const retained = JSON.stringify({
      records: harness.platform.output(),
      result,
      actions: harness.actionRecords.map(({id, scope, summary}) => ({id, scope, summary})),
    });

    expect(retained).not.toContain(publishable);
    expect(retained).not.toContain(secret);
  });

  it("enforces mode 0600 after a successful write on non-Windows platforms", async () => {
    const fixture = createReactFixture({environment: null, platform: "linux"});
    const harness = await createHarness({
      fixture,
      react: [reactAvailable({environment: environmentFacts({presentKeys: []})}), reactAvailable()],
    });

    await expect(runPhase(harness)).resolves.toMatchObject({status: "degraded"});

    expect(fixture.writes[0]).toMatchObject({mode: 0o600});
    expect(fixture.modes).toEqual([{path: paths.websiteEnvironment, mode: 0o600}]);
  });

  it("is idempotent after the first additive write", async () => {
    const fixture = createReactFixture({environment: null, interactive: true});
    const harness = await createHarness({
      fixture,
      textAnswers: ["pk_test_idempotent"],
      secretAnswers: ["sk_test_idempotent"],
      react: [reactAvailable({environment: environmentFacts({presentKeys: []})}), reactAvailable()],
    });

    await expect(runPhase(harness)).resolves.toMatchObject({status: "succeeded"});
    const firstContent = await fixture.read(paths.websiteEnvironment);
    await expect(runPhase(harness)).resolves.toMatchObject({status: "succeeded"});

    expect(fixture.writes).toHaveLength(1);
    await expect(fixture.read(paths.websiteEnvironment)).resolves.toBe(firstContent);
    expect(harness.text).toHaveBeenCalledTimes(1);
    expect(harness.secret).toHaveBeenCalledTimes(1);
  });

  it("plans the write without mutating or invalidating during dry-run", async () => {
    const fixture = createReactFixture({environment: null});
    const harness = await createHarness({
      fixture,
      setupOptions: options({dryRun: true}),
      dispositions: {"react.environment.write": "planned"},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toContain("Planned action: react.environment.write");
    expect(fixture.writes).toHaveLength(0);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("never prompts during a dry run, even on an interactive terminal", async () => {
    const fixture = createReactFixture({environment: null, interactive: true});
    const harness = await createHarness({
      fixture,
      setupOptions: options({dryRun: true}),
      dispositions: {"react.environment.write": "planned"},
      react: [reactAvailable({environment: environmentFacts({presentKeys: []})})],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(harness.text).not.toHaveBeenCalled();
    expect(harness.secret).not.toHaveBeenCalled();
    expect(fixture.writes).toEqual([]);
  });

  it("fails when the required environment write is declined", async () => {
    const fixture = createReactFixture({environment: null});
    const harness = await createHarness({fixture, dispositions: {"react.environment.write": "declined"}});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("react.environment.write");
    expect(harness.invalidate).not.toHaveBeenCalled();
  });
});

describe("Playwright Chromium preparation", () => {
  it("accepts Chromium only from the locked Playwright version reported by shared facts", async () => {
    const harness = await createHarness();

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).toEqual([]);
    expect(harness.runner.calls).toEqual([]);
  });

  it("installs Chromium when shared facts report a different Playwright version", async () => {
    const harness = await createHarness({
      react: [reactAvailable({playwright: playwrightFacts({version: "1.61.0"})}), reactAvailable()],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.find(({id}) => id === "react.playwright.chromium.install")?.scope).toBe("repository");
    expect(callFor(harness, browserInstallCommand)?.options).toMatchObject({
      cwd: paths.root,
      output: "tee",
      timeout: LEGACY_MUTATION_TIMEOUT_MS,
    });
    expect(harness.events).toEqual(["inspect:packages", "inspect:react", "invalidate:react", "inspect:react"]);
  });

  it("requests the legacy mutation ceiling for the Chromium and Linux dependency installs only", async () => {
    const harness = await createHarness({
      platform: "linux",
      react: [reactAvailable({playwright: playwrightFacts({browsers: []})}), reactAvailable()],
      responses: {
        [commandKey(dependencyProbeCommand)]: [exited(1, {stderr: "missing packages"}), succeeded()],
      },
    });

    await expect(runPhase(harness)).resolves.toMatchObject({status: "succeeded"});

    expect(callFor(harness, dependencyInstallCommand)?.options.timeout).toBe(LEGACY_MUTATION_TIMEOUT_MS);
    expect(callFor(harness, browserInstallCommand)?.options.timeout).toBe(LEGACY_MUTATION_TIMEOUT_MS);
    for (const probe of callsFor(harness, dependencyProbeCommand)) {
      expect(probe.options.timeout).toBe(PHASE_COMMAND_TIMEOUT_MS);
    }
  });

  it("fails when refreshed facts still lack a locked Chromium entry after a successful install command", async () => {
    const harness = await createHarness({
      react: [
        reactAvailable({playwright: playwrightFacts({browsers: ["firefox-999"]})}),
        reactAvailable({playwright: playwrightFacts({browsers: ["firefox-999"]})}),
      ],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/postcondition|chromium/i);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("react");
  });

  it("fails when refreshed facts report a Playwright version other than the locked one", async () => {
    const harness = await createHarness({
      react: [
        reactAvailable({playwright: playwrightFacts({browsers: []})}),
        reactAvailable({playwright: playwrightFacts({version: "1.61.0"})}),
      ],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/1\.62\.1/);
  });

  it("fails when the react fact cannot be re-inspected after an executed install", async () => {
    const harness = await createHarness({
      react: [reactAvailable({playwright: playwrightFacts({browsers: []})}), unavailable<ReactFacts>()],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("react.playwright.chromium.install");
  });

  it("redacts every observed Clerk credential from failure evidence", async () => {
    const harness = await createHarness({
      react: [reactAvailable({playwright: playwrightFacts({browsers: []})})],
      responses: {[commandKey(browserInstallCommand)]: exited(1, {stderr: "echoed sk_test_existing and pk_test_existing"})},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.at(-1)).toBe(
      "Playwright Chromium installation failed.\nCommand exited with code 1.\nstderr: echoed [REDACTED] and [REDACTED]",
    );
    expect(JSON.stringify(result)).not.toMatch(/[ps]k_test_existing/u);
  });

  it("invalidates the react fact even when the attempted install command fails", async () => {
    const harness = await createHarness({
      react: [reactAvailable({playwright: playwrightFacts({browsers: []})})],
      responses: {[commandKey(browserInstallCommand)]: exited(1, {stderr: "download failed"})},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("download failed");
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("react");
  });

  it("fails without invalidating when the required Chromium install is declined", async () => {
    const harness = await createHarness({
      react: [reactAvailable({playwright: playwrightFacts({browsers: []})})],
      dispositions: {"react.playwright.chromium.install": "declined"},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("react.playwright.chromium.install");
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("plans the Chromium install without invalidating or running a command during dry-run", async () => {
    const harness = await createHarness({
      react: [reactAvailable({playwright: playwrightFacts({browsers: []})})],
      setupOptions: options({dryRun: true}),
      dispositions: {"react.playwright.chromium.install": "planned"},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toContain("Planned action: react.playwright.chromium.install");
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.runner.calls).toEqual([]);
  });

  it("runs no Linux mutation when the dependency probe is healthy", async () => {
    const harness = await createHarness({fixture: createReactFixture({platform: "linux"})});

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.runner.calls).toHaveLength(1);
    expect(callFor(harness, dependencyProbeCommand)?.options).toMatchObject({cwd: paths.root});
    expect(callFor(harness, dependencyProbeCommand)?.options.timeout).toBe(PHASE_COMMAND_TIMEOUT_MS);
    expect(harness.actionIds).toEqual([]);
  });

  it("installs missing Linux dependencies as a system action, verifies them, then installs and verifies Chromium", async () => {
    const harness = await createHarness({
      fixture: createReactFixture({platform: "linux"}),
      react: [reactAvailable({playwright: playwrightFacts({browsers: ["firefox-999"]})}), reactAvailable()],
      responses: {
        [commandKey(dependencyProbeCommand)]: [exited(1, {stderr: "missing packages"}), succeeded()],
        [commandKey(dependencyInstallCommand)]: succeeded(),
        [commandKey(browserInstallCommand)]: succeeded(),
      },
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.map(({id, scope}) => ({id, scope}))).toEqual([
      {id: "react.playwright.system-dependencies.install", scope: "system"},
      {id: "react.playwright.chromium.install", scope: "repository"},
    ]);
    expect(callFor(harness, dependencyInstallCommand)?.options).toMatchObject({
      cwd: paths.root,
      output: "tee",
      timeout: LEGACY_MUTATION_TIMEOUT_MS,
    });
    expect(callsFor(harness, dependencyProbeCommand)).toHaveLength(2);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("react");
  });

  it("plans the Linux dependency install during dry-run without running anything but the probe", async () => {
    // Arrange
    const setupOptions = options({dryRun: true});
    const dryRun = productionActions(setupOptions);
    const harness = await createHarness({
      fixture: createReactFixture({platform: "linux"}),
      setupOptions,
      actions: () => dryRun.layer,
      responses: {[commandKey(dependencyProbeCommand)]: exited(1, {stderr: "missing packages"})},
    });

    // Act
    const result = await runPhase(harness);

    // Assert
    expect(result.evidence).toContain("Planned action: react.playwright.system-dependencies.install");
    expect(dryRun.executed).toEqual([]);
    expect(harness.runner.calls.map(({request}) => request)).toEqual([dependencyProbeCommand]);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("treats a declined proven-required Linux dependency action as blocking", async () => {
    const harness = await createHarness({
      fixture: createReactFixture({platform: "linux"}),
      responses: {[commandKey(dependencyProbeCommand)]: exited(1, {stderr: "missing packages"})},
      dispositions: {"react.playwright.system-dependencies.install": "declined"},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("react.playwright.system-dependencies.install");
    expect(harness.actionIds).not.toContain("react.playwright.chromium.install");
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("reports an inconclusive Linux dependency probe as a required failure", async () => {
    const harness = await createHarness({
      fixture: createReactFixture({platform: "linux"}),
      responses: {[commandKey(dependencyProbeCommand)]: timedOut()},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
  });

  it("propagates an interrupted Linux dependency probe without attempting the install action", async () => {
    const harness = await createHarness({
      fixture: createReactFixture({platform: "linux"}),
      responses: {[commandKey(dependencyProbeCommand)]: cancelledOutcome()},
    });

    const exit = await runPhaseExit(harness.phase, harness.context, harness.layer);

    expect(Exit.hasInterrupts(exit)).toBe(true);
    expect(harness.actionIds).not.toContain("react.playwright.system-dependencies.install");
    expect(harness.actionIds).toEqual([]);
    expect(callsFor(harness, dependencyInstallCommand)).toHaveLength(0);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });
});

describe("dry-run, interruption, and command safety", () => {
  it("propagates an interruption at the consent gate instead of converting it to a failure", async () => {
    const harness = await createHarness({
      fixture: createReactFixture({environment: null}),
      actions: (recording) => interruptingActions("react.environment.write", recording),
    });

    const exit = await runPhaseExit(harness.phase, harness.context, harness.layer);

    expect(Exit.hasInterrupts(exit)).toBe(true);
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.fixture.writes).toEqual([]);
  });

  it("invalidates the react fact when an attempted mutation is interrupted", async () => {
    const harness = await createHarness({
      react: [reactAvailable({playwright: playwrightFacts({browsers: []})})],
      responses: {[commandKey(browserInstallCommand)]: cancelledOutcome()},
    });

    const exit = await runPhaseExit(harness.phase, harness.context, harness.layer);

    expect(Exit.hasInterrupts(exit)).toBe(true);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("react");
  });

  it("interrupts setup when a credential prompt is quit at the terminal", async () => {
    const fixture = createReactFixture({environment: null, interactive: true});
    const harness = await createHarness({fixture, react: [reactAvailable({environment: environmentFacts({presentKeys: []})})]});
    const quitting = Layer.succeed(
      Prompts,
      Prompts.of({
        confirm: () => Effect.die(new Error("unexpected confirmation")),
        select: () => Effect.die(new Error("unexpected choice")),
        text: () => Effect.fail(new Terminal.QuitError()),
        secret: () => Effect.fail(new Terminal.QuitError()),
      }),
    );

    const exit = await runPhaseExit(harness.phase, harness.context, Layer.merge(harness.layer, quitting));

    expect(Exit.hasInterrupts(exit)).toBe(true);
    expect(fixture.writes).toEqual([]);
    expect(harness.actionIds).toEqual([]);
  });

  it("uses explicit cwd and argument arrays without builds, tests, services, or package restoration", async () => {
    const harness = await createHarness({
      fixture: createReactFixture({platform: "linux"}),
      react: [reactAvailable({playwright: playwrightFacts({browsers: []})}), reactAvailable()],
    });
    const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
      vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
    );

    await expect(runPhase(harness)).resolves.toMatchObject({status: "succeeded"});

    expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    const executed = harness.runner.calls.map(({request}) => commandKey(request));
    expect(executed).not.toContain(commandKey(packageInventoryCommand));
    expect(executed).not.toContain(commandKey(browserInventoryCommand));
    for (const {request: command, options: runOptions} of harness.runner.calls) {
      expect(Array.isArray(command.args)).toBe(true);
      expect(runOptions.cwd).toBe(paths.root);
      const joined = [command.command, ...command.args].join(" ");
      expect(command.args).not.toEqual(expect.arrayContaining(["build"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["test"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["typecheck"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["check"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["dev"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["start"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["serve"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["launch"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["ls"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["--list"]));
      expect(joined).not.toMatch(/\bnpm (?:ci|install)\b/iu);
    }
  });
});

describe("react characterization (pre-Effect migration)", () => {
  function withRootPlaceholder(value: unknown): unknown {
    const escapedRoot = JSON.stringify(paths.root).slice(1, -1);
    return JSON.parse(JSON.stringify(value).split(escapedRoot).join("<root>"));
  }

  function observe(harness: ReactHarness, result: SetupPhaseResult): unknown {
    return withRootPlaceholder({
      result,
      actionIds: harness.actionIds,
      commands: harness.runner.calls.map(({request}) => request),
    });
  }

  it("pins the exact result when every package, artifact, environment key, and Chromium is already present", async () => {
    // Arrange
    const harness = await createHarness();

    // Act
    const observed = observe(harness, await runPhase(harness));

    // Assert
    expect(observed).toEqual({
      result: {
        id: "react",
        status: "succeeded",
        summary: "React packages, generated artifacts, website environment, and Playwright Chromium are ready.",
        evidence: [
          "Verified 8 locked React workspace package(s) and the @arolariu/components workspace link from shared facts.",
          "Verified the website message dictionary and framework configuration contracts.",
          "Verified every generated website taxonomy, license, and locale artifact.",
          "Preserved setup-owned environment keys: SITE_ENV, SITE_NAME, SITE_URL, USE_CDN, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY.",
          "Wrote setup-owned environment keys: none.",
          "Playwright Chromium is installed for locked version 1.62.1.",
        ],
        nextActions: [],
        durationMs: 1,
      },
      actionIds: [],
      commands: [],
    });
  });

  it("pins the exact result when locked Chromium is missing and its installation succeeds", async () => {
    // Arrange
    const harness = await createHarness({
      react: [reactAvailable({playwright: playwrightFacts({browsers: []})}), reactAvailable()],
    });

    // Act
    const observed = observe(harness, await runPhase(harness));

    // Assert
    expect(observed).toEqual({
      result: {
        id: "react",
        status: "succeeded",
        summary: "React packages, generated artifacts, website environment, and Playwright Chromium are ready.",
        evidence: [
          "Verified 8 locked React workspace package(s) and the @arolariu/components workspace link from shared facts.",
          "Verified the website message dictionary and framework configuration contracts.",
          "Verified every generated website taxonomy, license, and locale artifact.",
          "Preserved setup-owned environment keys: SITE_ENV, SITE_NAME, SITE_URL, USE_CDN, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY.",
          "Wrote setup-owned environment keys: none.",
          "The installed Playwright browser inventory has no Chromium browser entry.",
          "Executed and verified action: react.playwright.chromium.install",
        ],
        nextActions: [],
        durationMs: 1,
      },
      actionIds: ["react.playwright.chromium.install"],
      commands: [{command: "npx", args: ["--no-install", "playwright", "install", "chromium"]}],
    });
  });

  it("pins the exact result when the Chromium installation fails", async () => {
    // Arrange
    const harness = await createHarness({
      react: [reactAvailable({playwright: playwrightFacts({browsers: []})})],
      responses: {[commandKey(browserInstallCommand)]: exited(1, {stderr: "download failed"})},
    });

    // Act
    const observed = observe(harness, await runPhase(harness));

    // Assert
    expect(observed).toEqual({
      result: {
        id: "react",
        status: "failed",
        summary: "The required React workspace preparation phase failed.",
        evidence: [
          "Verified 8 locked React workspace package(s) and the @arolariu/components workspace link from shared facts.",
          "Verified the website message dictionary and framework configuration contracts.",
          "Verified every generated website taxonomy, license, and locale artifact.",
          "Preserved setup-owned environment keys: SITE_ENV, SITE_NAME, SITE_URL, USE_CDN, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY.",
          "Wrote setup-owned environment keys: none.",
          "The installed Playwright browser inventory has no Chromium browser entry.",
          "Playwright Chromium installation failed.\nCommand exited with code 1.\nstderr: download failed",
        ],
        nextActions: ["Resolve the reported React setup failure, then rerun setup."],
        durationMs: 1,
      },
      actionIds: ["react.playwright.chromium.install"],
      commands: [{command: "npx", args: ["--no-install", "playwright", "install", "chromium"]}],
    });
  });
});
