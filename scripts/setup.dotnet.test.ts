// @vitest-environment node
/**
 * @fileoverview Contract tests for the independent .NET setup phase.
 * @module scripts.setup.dotnet.test
 *
 * @remarks
 * Every test drives the real phase against an injected {@link SetupPhaseRuntime}: a recording
 * process runner replaying typed {@link ProcessExecutionResult} fixtures, a deterministic clock, and an
 * immutable environment snapshot that supplies the host platform. No test in this file reads the
 * live checkout, spawns a process, or observes ambient Node state.
 */

import {resolve} from "node:path";
import {describe, expect, it, vi} from "vitest";

import type {CommandExecutionContext} from "./core/command/command-execution.ts";
import {ComposedTerminalPresenter} from "./core/presentation/composed-terminal-presenter.ts";
import {RecordingTerminalPresenterSink} from "./testing/fixtures/terminal.fixture.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import type {MinimumVersion, RepositoryRequirements} from "./common/requirements.ts";
import type {ProcessExecutionOptions, ProcessExecutionRequest} from "./core/process/process-execution-request.ts";
import type {ProcessExecutionResult} from "./core/process/process-execution-result.ts";
import {AbstractProcessRunner} from "./core/process/process-runner.ts";
import {createMemoryFileSystem, createTestRuntimeFactory} from "./common/runtime.testing.ts";
import type {Clock, RuntimeEnvironment} from "./common/runtime.ts";
import type {DotnetFacts} from "./inspection/dotnet.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";
import {
  createDotnetSetupPhase,
  dotnetSetupPhase,
  generateLocalDevelopmentPassword,
  selectDotnetInstallationProposal,
} from "./setup.dotnet.ts";
import type {
  SetupAction,
  SetupActionDisposition,
  SetupActionExecutor,
  SetupContext,
  SetupInput,
  SetupPhaseResult,
  SetupPhaseRuntime,
} from "./setup.types.ts";

const requiredDotnet: MinimumVersion = {major: 10, minor: 0, patch: 0};
const paths = createRepositoryPaths(resolve("C:\\fixture\\arolariu.ro"));
const appHostProject = resolve(paths.root, "tooling", "AppHost", "AppHost.csproj");
const sqlSecretKey = "Parameters:sql-password";
const redisSecretKey = "Parameters:redis-password";
/**
 * Pre-migration ceiling for every long-running .NET install, restore, and trust mutation.
 *
 * @remarks
 * The invocation-scoped runner defaults to 120s, which is bounded for probes but far too short for
 * an SDK install or a full solution restore. Every mutation that previously inherited the legacy
 * `tee`/`inherit` mutation default must therefore request this timeout explicitly now that the
 * phase no longer flows through the deprecated setup runner bridge.
 */
const LEGACY_MUTATION_TIMEOUT_MS = 1_200_000;

function expectedPasswordForRepeatedByte(byte: number): string {
  return `Aa1!${Buffer.alloc(24, byte).toString("base64url")}`;
}

function succeeded(patch: Readonly<{stdout?: string; stderr?: string}> = {}): ProcessExecutionResult {
  return {kind: "succeeded", exitCode: 0, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function exited(exitCode: number, patch: Readonly<{stdout?: string; stderr?: string}> = {}): ProcessExecutionResult {
  return {kind: "exited", exitCode, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function timedOut(): ProcessExecutionResult {
  return {kind: "timed-out", stdout: "", stderr: "", durationMs: 1};
}

function signalled(signal: NodeJS.Signals): ProcessExecutionResult {
  return {kind: "signalled", signal, stdout: "", stderr: "", durationMs: 1};
}

function spawnFailed(message: string): ProcessExecutionResult {
  return {kind: "spawn-failed", message, stdout: "", stderr: "", durationMs: 1};
}

function commandKey(request: Readonly<ProcessExecutionRequest>): string {
  return [request.command, ...request.args].join("\u0000");
}

/** One recorded child invocation. */
type RecordedCall = Readonly<{request: ProcessExecutionRequest; options: ProcessExecutionOptions}>;

/** Records every invocation while replaying request-keyed typed outcomes. */
class FakeProcessRunner extends AbstractProcessRunner {
  readonly #responses: Readonly<Record<string, ProcessExecutionResult | readonly ProcessExecutionResult[]>>;
  readonly #offsets = new Map<string, number>();
  readonly #calls: RecordedCall[] = [];

  public constructor(responses: Readonly<Record<string, ProcessExecutionResult | readonly ProcessExecutionResult[]>> = {}) {
    super();
    this.#responses = responses;
  }

  /** Every recorded invocation, in call order. */
  public get calls(): readonly RecordedCall[] {
    return this.#calls;
  }

  /** {@inheritDoc AbstractProcessRunner.execute} */
  protected override execute(request: Readonly<ProcessExecutionRequest>, options: Readonly<ProcessExecutionOptions>): Promise<ProcessExecutionResult> {
    this.#calls.push({request, options});
    const key = commandKey(request);
    const configured = this.#responses[key];
    if (configured === undefined) {
      return Promise.resolve(succeeded());
    }
    if (!Array.isArray(configured)) {
      return Promise.resolve(configured as ProcessExecutionResult);
    }
    const sequence = configured as readonly ProcessExecutionResult[];
    const offset = this.#offsets.get(key) ?? 0;
    this.#offsets.set(key, offset + 1);
    return Promise.resolve(sequence[offset] ?? sequence.at(-1) ?? succeeded());
  }
}

function requirements(): RepositoryRequirements {
  return {
    node: {major: 24, minor: 0, patch: 0},
    npm: {major: 11, minor: 0, patch: 0},
    dotnet: requiredDotnet,
    python: {major: 3, minor: 12, patch: 0},
    packages: new Map(),
  };
}

function setupOptions(patch: Partial<SetupInput> = {}): SetupInput {
  return {
    verbose: false,
    dryRun: false,
    yes: false,
    ...patch,
  };
}

/** A {@link DotnetFacts} patch that may explicitly clear an optional field to `undefined`. */
type DotnetFactsPatch = Partial<Omit<DotnetFacts, "selectedVersion" | "host">> & {
  selectedVersion?: string | undefined;
  host?: DotnetFacts["host"] | undefined;
};

/** Builds one complete, compatible-by-default {@link DotnetFacts} value for tests to patch. */
function dotnetFacts(patch: DotnetFactsPatch = {}): DotnetFacts {
  const {selectedVersion, host, ...rest} = patch;
  // `"key" in patch` distinguishes an absent field (use the default) from an explicit `undefined`
  // (clear the optional field), which a destructuring default alone cannot tell apart.
  const includeSelectedVersion = !("selectedVersion" in patch) || selectedVersion !== undefined;
  const includeHost = !("host" in patch) || host !== undefined;
  return {
    executable: {available: true, resolvedPaths: ["C:\\Program Files\\dotnet\\dotnet.exe"]},
    sdks: ["10.0.100"],
    workloads: [],
    nugetCachePath: "C:\\fixture\\nuget\\packages",
    solutionIssues: [],
    solutionRestoreIssues: [],
    localTools: [{name: "defaultdocumentation.console", version: "1.2.4"}],
    certificate: {exists: true, trusted: true},
    appHost: {
      projectExists: true,
      missingParameterKeys: [],
      userSecretKeys: [sqlSecretKey, redisSecretKey],
    },
    ...rest,
    ...(includeSelectedVersion ? {selectedVersion: selectedVersion ?? "10.0.100"} : {}),
    ...(includeHost ? {host: host ?? {version: "10.0.0", architecture: "x64", rid: "win-x64"}} : {}),
  };
}

function availableOutcome(patch: DotnetFactsPatch = {}): InspectionOutcome<DotnetFacts> {
  return {kind: "available", value: dotnetFacts(patch), durationMs: 1};
}

function unavailableOutcome(reason = "The dotnet executable is unavailable."): InspectionOutcome<DotnetFacts> {
  return {kind: "unavailable", reason, durationMs: 1};
}

function invalidOutcome(issues: readonly string[] = ["dotnet --version returned malformed output."]): InspectionOutcome<DotnetFacts> {
  return {kind: "invalid", issues, durationMs: 1};
}

/**
 * Builds a `dotnet` inspection outcome sequence for tests. Every executed mutation invalidates and
 * re-inspects `dotnet` immediately, and the three restore actions execute by default, so `initial`
 * is repeated for the initial fetch plus those three restore refreshes before any further supplied
 * outcomes model the mutation actually under test (a secret write or certificate operation).
 */
function dotnetOutcomeSequence(
  initial: InspectionOutcome<DotnetFacts>,
  ...after: readonly InspectionOutcome<DotnetFacts>[]
): readonly InspectionOutcome<DotnetFacts>[] {
  return [initial, initial, initial, initial, ...after];
}

/** A controllable fake {@link RepositoryInspectionSession} that only ever resolves the `"dotnet"` key. */
function createDotnetInspectionHarness(outcomes: readonly InspectionOutcome<DotnetFacts>[] = [availableOutcome()]): Readonly<{
  session: RepositoryInspectionSession;
  inspect: ReturnType<typeof vi.fn>;
  invalidate: ReturnType<typeof vi.fn>;
}> {
  let callIndex = 0;
  const inspect = vi.fn(async (key: "dotnet") => {
    if (key !== "dotnet") {
      return {kind: "unavailable" as const, reason: "Not exercised by this test.", durationMs: 0};
    }
    const outcome = outcomes[Math.min(callIndex, outcomes.length - 1)]!;
    callIndex += 1;
    return outcome;
  });
  const invalidate = vi.fn();
  return {
    session: {inspect, invalidate, updateInfrastructureEngine: vi.fn()} as unknown as RepositoryInspectionSession,
    inspect,
    invalidate,
  };
}

function createActions(dispositions: Readonly<Record<string, SetupActionDisposition>> = {}): Readonly<{
  actions: SetupActionExecutor;
  actionIds: string[];
  actionRecords: SetupAction[];
}> {
  const actionIds: string[] = [];
  const actionRecords: SetupAction[] = [];
  const actions: SetupActionExecutor = {
    run: async (action) => {
      actionIds.push(action.id);
      actionRecords.push(action);
      const disposition = dispositions[action.id] ?? "executed";
      if (disposition === "executed") {
        await action.execute();
      }
      return disposition;
    },
  };
  return {actions, actionIds, actionRecords};
}

/**
 * The exact context view the migrated .NET phase reads.
 *
 * @remarks
 * The deprecated {@link SetupContext.runner} and {@link SetupContext.now} members are deliberately
 * absent: a migrated phase must read its capabilities from {@link SetupContext.runtime} only, so
 * any relapse becomes a type error instead of a silently passing test.
 */
type MigratedSetupContext = Omit<SetupContext, "runner" | "now"> & Readonly<{runtime: SetupPhaseRuntime}>;

function environmentSnapshot(platform: NodeJS.Platform): RuntimeEnvironment {
  return {
    variables: Object.freeze({}),
    cwd: paths.root,
    executablePath: "C:\\Program Files\\nodejs\\node.exe",
    platform,
    architecture: "x64",
    stdinIsTTY: false,
    stdoutIsTTY: false,
    isCI: true,
  };
}

interface DotnetHarness {
  /** The phase under test. */
  readonly phase: ReturnType<typeof createDotnetSetupPhase>;
  /** The migrated setup context handed to the phase. */
  readonly context: MigratedSetupContext;
  /** Recording process runner observed by the phase. */
  readonly runner: FakeProcessRunner;
  /** Action identifiers in evaluation order. */
  readonly actionIds: string[];
  /** Complete action records in evaluation order. */
  readonly actionRecords: SetupAction[];
  /** Rendered logger output. */
  readonly sink: RecordingTerminalPresenterSink;
  /** Every value the phase asked the logger to redact. */
  readonly redactions: string[];
  /** Inspection session probe. */
  readonly inspect: ReturnType<typeof vi.fn>;
  /** Inspection invalidation probe. */
  readonly invalidate: ReturnType<typeof vi.fn>;
}

async function createHarness(
  input: Readonly<{
    responses?: Readonly<Record<string, ProcessExecutionResult | readonly ProcessExecutionResult[]>>;
    dispositions?: Readonly<Record<string, SetupActionDisposition>>;
    options?: SetupInput;
    platform?: NodeJS.Platform;
    randomBytes?: (size: number) => Uint8Array;
    dotnetOutcomes?: readonly InspectionOutcome<DotnetFacts>[];
  }> = {},
): Promise<DotnetHarness> {
  const runner = new FakeProcessRunner(input.responses);
  const {actions, actionIds, actionRecords} = createActions(input.dispositions);
  const {session, inspect, invalidate} = createDotnetInspectionHarness(input.dotnetOutcomes);
  const sink = new RecordingTerminalPresenterSink();
  const redactions: string[] = [];
  const logger = new ComposedTerminalPresenter("setup::dotnet", {color: false, sink});
  const originalRedact = logger.redact.bind(logger);
  logger.redact = (value: string): void => {
    redactions.push(value);
    originalRedact(value);
  };

  let elapsed = 0;
  const clock: Clock = {
    monotonicNow: (): number => elapsed++,
    isoTimestamp: (): string => "2026-09-01T00:00:00.000Z",
    delay: (): Promise<void> => Promise.resolve(),
  };

  const factory = createTestRuntimeFactory({
    files: createMemoryFileSystem({}),
    runner,
    clock,
    logger,
    environment: environmentSnapshot(input.platform ?? "win32"),
  });
  const commandRuntime = await factory.createRoot({presentation: "silent", registerProcessSignals: false});
  const command: CommandExecutionContext = {runtime: commandRuntime, presentation: "silent"};

  const runtime: SetupPhaseRuntime = {
    command,
    runner: commandRuntime.runner,
    files: commandRuntime.files,
    http: commandRuntime.http,
    clock: commandRuntime.clock,
    tasks: commandRuntime.tasks,
    environment: commandRuntime.environment,
    invokeGenerate: vi.fn<SetupPhaseRuntime["invokeGenerate"]>(() =>
      Promise.reject(new Error("The .NET setup phase must never invoke generation.")),
    ),
  };

  const context: MigratedSetupContext = {
    options: input.options ?? setupOptions(),
    paths,
    requirements: requirements(),
    inspection: session,
    runtime,
    prompts: {
      confirm: async () => true,
      select: async <TValue extends string>(
        _message: string,
        choices: readonly Readonly<{value: TValue; label: string}>[],
      ): Promise<TValue> => {
        const selected = choices[0]?.value;
        if (selected === undefined) {
          throw new Error("A test choice is required.");
        }
        return selected;
      },
      text: async () => "",
      secret: async () => "",
    },
    actions,
    logger,
  };

  const phase = createDotnetSetupPhase({
    randomBytes: input.randomBytes ?? ((size) => new Uint8Array(size).fill(7)),
  });
  return {phase, context, runner, actionIds, actionRecords, sink, redactions, inspect, invalidate};
}

/**
 * Runs the phase against the migrated context view, optionally replacing one dependency.
 *
 * @param harness - Assembled test harness.
 * @param patch - Context members replaced for this run.
 * @returns The completed phase result.
 */
function runPhase(harness: DotnetHarness, patch: Partial<MigratedSetupContext> = {}): Promise<SetupPhaseResult> {
  return harness.phase.run({...harness.context, ...patch} as SetupContext);
}

function callFor(harness: DotnetHarness, key: string): RecordedCall | undefined {
  return harness.runner.calls.find(({request}) => commandKey(request) === key);
}

function ranCommand(harness: DotnetHarness, key: string): boolean {
  return callFor(harness, key) !== undefined;
}

const workloadRestoreKey = commandKey({command: "dotnet", args: ["workload", "restore", paths.solution]});
const solutionRestoreKey = commandKey({command: "dotnet", args: ["restore", paths.solution]});
const toolRestoreKey = commandKey({command: "dotnet", args: ["tool", "restore"]});
const userSecretsSetKey = commandKey({command: "dotnet", args: ["user-secrets", "set", "--project", appHostProject]});
const certificateCreateKey = commandKey({command: "dotnet", args: ["dev-certs", "https"]});
const certificateTrustKey = commandKey({command: "dotnet", args: ["dev-certs", "https", "--trust"]});
const wingetVersionKey = commandKey({command: "winget", args: ["--version"]});
const wingetInstallKey = commandKey(
  selectDotnetInstallationProposal({platform: "win32", availablePackageManagers: new Set(["winget"]), required: requiredDotnet})!.command,
);

describe("dotnet setup public contract", () => {
  it("publishes an independent required phase", () => {
    expect(dotnetSetupPhase).toMatchObject({
      id: "dotnet",
      required: true,
      dependsOn: [],
    });
  });

  it.each([
    [
      "Windows winget",
      {platform: "win32" as const, availablePackageManagers: new Set(["winget"]), required: requiredDotnet},
      {
        command: "winget",
        args: ["install", "--id", "Microsoft.DotNet.SDK.10", "--exact", "--accept-package-agreements", "--accept-source-agreements"],
      },
    ],
    [
      "macOS Homebrew",
      {platform: "darwin" as const, availablePackageManagers: new Set(["brew"]), required: requiredDotnet},
      {command: "brew", args: ["install", "--cask", "dotnet-sdk"]},
    ],
    [
      "Linux apt",
      {platform: "linux" as const, availablePackageManagers: new Set(["apt-get", "dnf"]), required: requiredDotnet},
      {command: "sudo", args: ["apt-get", "install", "-y", "dotnet-sdk-10.0"]},
    ],
    [
      "Linux dnf",
      {platform: "linux" as const, availablePackageManagers: new Set(["dnf"]), required: requiredDotnet},
      {command: "sudo", args: ["dnf", "install", "-y", "dotnet-sdk-10.0"]},
    ],
  ])("selects the supported $0 proposal", (_name, input, command) => {
    expect(selectDotnetInstallationProposal(input)?.command).toEqual(command);
  });

  it.each([
    ["missing manager", {platform: "linux" as const, availablePackageManagers: new Set<string>(), required: requiredDotnet}],
    ["apt without a candidate", {platform: "linux" as const, availablePackageManagers: new Set(["apt-cache"]), required: requiredDotnet}],
    ["unsupported platform", {platform: "freebsd" as const, availablePackageManagers: new Set(["winget"]), required: requiredDotnet}],
  ])("does not invent an installation path for $0", (_name, input) => {
    expect(selectDotnetInstallationProposal(input)).toBeNull();
  });
});

describe("generateLocalDevelopmentPassword", () => {
  it("requests exactly 24 bytes and emits an unpadded base64url password", () => {
    const bytes = Uint8Array.from({length: 24}, (_, index) => index + 240);
    const source = vi.fn<(size: number) => Uint8Array>().mockReturnValue(bytes);

    const password = generateLocalDevelopmentPassword(source);

    expect(source).toHaveBeenCalledExactlyOnceWith(24);
    expect(password).toBe(`Aa1!${Buffer.from(bytes).toString("base64url")}`);
    expect(password).toMatch(/^Aa1![A-Za-z0-9_-]{32}$/);
    expect(password).not.toMatch(/[+/=]/);
  });

  it("rejects a random source that returns the wrong byte count", () => {
    expect(() => generateLocalDevelopmentPassword(() => new Uint8Array(23))).toThrow(/exactly 24/i);
  });
});

describe("dotnet fact readiness", () => {
  it("accepts compatible facts without an SDK inspection round trip beyond the initial fetch", async () => {
    const harness = await createHarness();

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).not.toContain("dotnet.install-sdk");
    expect(harness.inspect).toHaveBeenCalledWith("dotnet");
  });

  it("fails explicitly with bounded evidence when dotnet is unavailable and unrecoverable", async () => {
    const harness = await createHarness({
      dotnetOutcomes: [unavailableOutcome("The dotnet executable is unavailable.")],
      responses: {[wingetVersionKey]: exited(1, {stderr: "winget missing"})},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("The dotnet executable is unavailable.");
    expect(result.evidence.join("\n")).not.toContain("winget missing");
    expect(result.nextActions.join("\n")).toContain("https://dotnet.microsoft.com/download");
    expect(harness.actionIds).toEqual([]);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("fails explicitly with bounded evidence when the initial dotnet fact is invalid", async () => {
    const harness = await createHarness({dotnetOutcomes: [invalidOutcome(["dotnet --version returned malformed output."])]});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("dotnet --version returned malformed output.");
    expect(harness.runner.calls).toEqual([]);
  });

  it.each([
    ["only older installed and selected SDKs", {sdks: ["9.0.400"], selectedVersion: "9.0.400"}],
    ["no selected SDK", {selectedVersion: undefined}],
    ["a selected-SDK mismatch", {sdks: ["10.0.100"], selectedVersion: "9.0.400"}],
  ])("requires installation for %s", async (_name, patch) => {
    const harness = await createHarness({
      dotnetOutcomes: [availableOutcome(patch)],
      responses: {[wingetVersionKey]: succeeded({stdout: "v1.11.0\n"})},
      dispositions: {"dotnet.install-sdk": "declined"},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("dotnet.install-sdk");
  });

  it("fails with official guidance when no supported installer is discoverable, without probing anything", async () => {
    const harness = await createHarness({
      platform: "freebsd",
      dotnetOutcomes: [availableOutcome({sdks: [], selectedVersion: undefined})],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toContain("https://dotnet.microsoft.com/download");
    expect(harness.runner.calls).toEqual([]);
  });

  it("does not treat a successful install command as proof of readiness when refreshed facts remain incompatible", async () => {
    const harness = await createHarness({
      dotnetOutcomes: [availableOutcome({sdks: [], selectedVersion: undefined}), availableOutcome({sdks: [], selectedVersion: undefined})],
      responses: {
        [wingetVersionKey]: succeeded({stdout: "v1.11.0\n"}),
        [wingetInstallKey]: succeeded(),
      },
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.summary).toMatch(/remains incompatible/i);
    expect(harness.actionIds).toEqual(["dotnet.install-sdk"]);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("dotnet");
    expect(harness.inspect).toHaveBeenCalledTimes(2);
  });

  it("installs, invalidates exactly dotnet, and verifies compatibility from refreshed facts", async () => {
    const harness = await createHarness({
      dotnetOutcomes: [availableOutcome({sdks: [], selectedVersion: undefined}), availableOutcome()],
      responses: {
        [wingetVersionKey]: succeeded({stdout: "v1.11.0\n"}),
        [wingetInstallKey]: succeeded(),
      },
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds[0]).toBe("dotnet.install-sdk");
    expect(harness.invalidate).toHaveBeenCalledWith("dotnet");
    expect(result.evidence.join("\n")).toContain("Executed and verified action: dotnet.install-sdk");
  });

  it("discovers an apt candidate and prefers the exact apt installation over dnf", async () => {
    const aptVersionKey = commandKey({command: "apt-get", args: ["--version"]});
    const dnfVersionKey = commandKey({command: "dnf", args: ["--version"]});
    const aptPolicyKey = commandKey({command: "apt-cache", args: ["policy", "dotnet-sdk-10.0"]});
    const aptInstallKey = commandKey({command: "sudo", args: ["apt-get", "install", "-y", "dotnet-sdk-10.0"]});
    const dnfInstallKey = commandKey({command: "sudo", args: ["dnf", "install", "-y", "dotnet-sdk-10.0"]});
    const harness = await createHarness({
      platform: "linux",
      dotnetOutcomes: [availableOutcome({sdks: [], selectedVersion: undefined}), availableOutcome()],
      responses: {
        [aptVersionKey]: succeeded({stdout: "apt 2.9.0\n"}),
        [dnfVersionKey]: succeeded({stdout: "4.21.1\n"}),
        [aptPolicyKey]: succeeded({
          stdout: "dotnet-sdk-10.0:\n  Installed: (none)\n  Candidate: 10.0.100-1\n  Version table:\n",
        }),
        [aptInstallKey]: succeeded(),
      },
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.find(({id}) => id === "dotnet.install-sdk")?.scope).toBe("system");
    expect(callFor(harness, aptInstallKey)?.options).toMatchObject({
      cwd: paths.root,
      output: "inherit",
    });
    expect(ranCommand(harness, dnfInstallKey)).toBe(false);
  });

  it("falls back to the exact dnf installation when apt reports no candidate", async () => {
    const aptVersionKey = commandKey({command: "apt-get", args: ["--version"]});
    const dnfVersionKey = commandKey({command: "dnf", args: ["--version"]});
    const aptPolicyKey = commandKey({command: "apt-cache", args: ["policy", "dotnet-sdk-10.0"]});
    const aptInstallKey = commandKey({command: "sudo", args: ["apt-get", "install", "-y", "dotnet-sdk-10.0"]});
    const dnfInstallKey = commandKey({command: "sudo", args: ["dnf", "install", "-y", "dotnet-sdk-10.0"]});
    const harness = await createHarness({
      platform: "linux",
      dotnetOutcomes: [availableOutcome({sdks: [], selectedVersion: undefined}), availableOutcome()],
      responses: {
        [aptVersionKey]: succeeded({stdout: "apt 2.9.0\n"}),
        [dnfVersionKey]: succeeded({stdout: "4.21.1\n"}),
        [aptPolicyKey]: succeeded({
          stdout: "dotnet-sdk-10.0:\n  Installed: (none)\n  Candidate: (none)\n  Version table:\n",
        }),
        [dnfInstallKey]: succeeded(),
      },
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(ranCommand(harness, aptInstallKey)).toBe(false);
    expect(callFor(harness, dnfInstallKey)?.options).toMatchObject({
      cwd: paths.root,
      output: "inherit",
    });
  });

  it("discovers Homebrew and executes the exact macOS installation proposal", async () => {
    const brewVersionKey = commandKey({command: "brew", args: ["--version"]});
    const brewInstallKey = commandKey({command: "brew", args: ["install", "--cask", "dotnet-sdk"]});
    const harness = await createHarness({
      platform: "darwin",
      dotnetOutcomes: [availableOutcome({sdks: [], selectedVersion: undefined}), availableOutcome()],
      responses: {
        [brewVersionKey]: succeeded({stdout: "Homebrew 4.6.0\n"}),
        [brewInstallKey]: succeeded(),
      },
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(callFor(harness, brewInstallKey)?.options).toMatchObject({
      cwd: paths.root,
      output: "inherit",
    });
  });
});

describe("repository solution integrity", () => {
  it("fails immediately on non-empty solution issues without attempting any mutation", async () => {
    const harness = await createHarness({
      dotnetOutcomes: [availableOutcome({solutionIssues: ["Missing solution project: src/Broken.csproj"]})],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("Missing solution project: src/Broken.csproj");
    expect(harness.runner.calls).toEqual([]);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });
});

describe("restore ordering and failures", () => {
  it("runs the exact restore commands in order, invalidating and verifying after each one", async () => {
    const harness = await createHarness();

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.slice(0, 3).map(({id, scope}) => ({id, scope}))).toEqual([
      {id: "dotnet.workload-restore", scope: "system"},
      {id: "dotnet.solution-restore", scope: "repository"},
      {id: "dotnet.tool-restore", scope: "user"},
    ]);
    const restoreCalls = harness.runner.calls.filter(
      ({request}) => request.command === "dotnet" && request.args.includes("restore"),
    );
    expect(restoreCalls.map(({request}) => request.args)).toEqual([
      ["workload", "restore", paths.solution],
      ["restore", paths.solution],
      ["tool", "restore"],
    ]);
    for (const {options} of restoreCalls) {
      expect(options).toMatchObject({cwd: paths.root, output: "tee", presenter: harness.context.logger});
    }
    expect(harness.invalidate).toHaveBeenCalledTimes(3);
    expect(harness.inspect).toHaveBeenCalledTimes(4);
  });

  it.each([
    ["nonzero", exited(7, {stdout: "restore output", stderr: "restore error"}), "restore error"],
    ["timeout", timedOut(), "timed out"],
    ["signal", signalled("SIGTERM"), "SIGTERM"],
    ["spawn error", spawnFailed("EACCES"), "EACCES"],
  ])("retains explicit safe restore evidence for %s and invalidates the attempted mutation", async (_name, failure, expected) => {
    const harness = await createHarness({responses: {[workloadRestoreKey]: failure}});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("dotnet.workload-restore");
    expect(result.evidence.join("\n")).toContain(expected);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("dotnet");
  });

  it("fails when the refreshed solution issues are non-empty after an otherwise successful restore", async () => {
    const harness = await createHarness({
      dotnetOutcomes: [availableOutcome(), availableOutcome({solutionIssues: ["Missing solution project: X"]})],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("Missing solution project: X");
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("dotnet");
  });

  it("fails when refreshed facts are unavailable after an otherwise successful restore", async () => {
    const harness = await createHarness({
      dotnetOutcomes: [availableOutcome(), unavailableOutcome("The dotnet executable is unavailable.")],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("The dotnet executable is unavailable.");
  });
});

describe("long-running mutation timeouts", () => {
  it.each([
    ["workload restore", workloadRestoreKey],
    ["solution restore", solutionRestoreKey],
    ["tool restore", toolRestoreKey],
  ])("requests the legacy mutation ceiling for the %s", async (_name, key) => {
    const harness = await createHarness();

    await expect(runPhase(harness)).resolves.toMatchObject({status: "succeeded"});
    expect(callFor(harness, key)?.options.timeoutMs).toBe(LEGACY_MUTATION_TIMEOUT_MS);
  });

  it("requests the legacy mutation ceiling for the SDK installation", async () => {
    const harness = await createHarness({
      dotnetOutcomes: [availableOutcome({sdks: [], selectedVersion: undefined}), availableOutcome()],
      responses: {[wingetVersionKey]: succeeded({stdout: "v1.11.0\n"})},
    });

    await expect(runPhase(harness)).resolves.toMatchObject({status: "succeeded"});
    expect(callFor(harness, wingetInstallKey)?.options.timeoutMs).toBe(LEGACY_MUTATION_TIMEOUT_MS);
  });

  it("requests the legacy mutation ceiling for certificate trust", async () => {
    const harness = await createHarness({
      dotnetOutcomes: dotnetOutcomeSequence(availableOutcome({certificate: {exists: true, trusted: false}}), availableOutcome()),
    });

    await expect(runPhase(harness)).resolves.toMatchObject({status: "succeeded"});
    expect(callFor(harness, certificateTrustKey)?.options.timeoutMs).toBe(LEGACY_MUTATION_TIMEOUT_MS);
  });

  it("leaves every probe and captured command on the invocation-scoped default timeout", async () => {
    const missingSecrets = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [sqlSecretKey], userSecretKeys: []},
      certificate: {exists: false, trusted: false},
    });
    const secretsProvisioned = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: [sqlSecretKey, redisSecretKey]},
      certificate: {exists: false, trusted: false},
    });
    const harness = await createHarness({
      dotnetOutcomes: [
        availableOutcome({sdks: [], selectedVersion: undefined}),
        missingSecrets,
        missingSecrets,
        missingSecrets,
        missingSecrets,
        secretsProvisioned,
        availableOutcome(),
      ],
      responses: {[wingetVersionKey]: succeeded({stdout: "v1.11.0\n"})},
    });

    await expect(runPhase(harness)).resolves.toMatchObject({status: "succeeded"});
    for (const key of [wingetVersionKey, userSecretsSetKey, certificateCreateKey]) {
      expect(callFor(harness, key)).toBeDefined();
      expect(callFor(harness, key)?.options.timeoutMs).toBeUndefined();
    }
  });
});

describe("AppHost project and user secrets", () => {
  it("fails when the AppHost project does not exist, without attempting user-secret commands", async () => {
    const harness = await createHarness({
      dotnetOutcomes: [availableOutcome({appHost: {projectExists: false, missingParameterKeys: [], userSecretKeys: []}})],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(harness.runner.calls.some(({request}) => request.args[0] === "user-secrets")).toBe(false);
  });

  it("succeeds without a user-secrets action when no required key is missing", async () => {
    const harness = await createHarness();

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).not.toContain("dotnet.user-secrets.set");
    expect(harness.runner.calls.some(({request}) => request.args[0] === "user-secrets")).toBe(false);
  });

  it("generates each missing key independently inside one action and sends values only through stdin", async () => {
    const random = vi
      .fn<(size: number) => Uint8Array>()
      .mockReturnValueOnce(new Uint8Array(24).fill(1))
      .mockReturnValueOnce(new Uint8Array(24).fill(2));
    const sqlPassword = expectedPasswordForRepeatedByte(1);
    const redisPassword = expectedPasswordForRepeatedByte(2);
    const missing = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [sqlSecretKey, redisSecretKey], userSecretKeys: []},
    });
    const resolved = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: [sqlSecretKey, redisSecretKey]},
    });
    const harness = await createHarness({
      randomBytes: random,
      dotnetOutcomes: dotnetOutcomeSequence(missing, resolved),
      responses: {[userSecretsSetKey]: succeeded()},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(random).toHaveBeenNthCalledWith(1, 24);
    expect(random).toHaveBeenNthCalledWith(2, 24);
    expect(harness.actionRecords.find(({id}) => id === "dotnet.user-secrets.set")?.scope).toBe("user");
    const setCall = callFor(harness, userSecretsSetKey);
    expect(setCall?.request.args).toEqual(["user-secrets", "set", "--project", appHostProject]);
    expect(sqlPassword).not.toBe(redisPassword);
    expect(JSON.parse(String(setCall?.options.input))).toEqual({
      [sqlSecretKey]: sqlPassword,
      [redisSecretKey]: redisPassword,
    });
    const secretValues = Object.values(JSON.parse(String(setCall?.options.input)) as Readonly<Record<string, string>>);
    const retained = JSON.stringify({
      args: harness.runner.calls.map(({request}) => request.args),
      logs: harness.sink.records,
      result,
      actions: harness.actionRecords.map(({id, scope, summary}) => ({id, scope, summary})),
    });
    for (const secret of secretValues) {
      expect(harness.redactions).toContain(secret);
      expect(retained).not.toContain(secret);
    }
  });

  it("sets only the independently missing secret key named by facts", async () => {
    const random = vi.fn<(size: number) => Uint8Array>().mockReturnValue(new Uint8Array(24).fill(3));
    const missing = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [redisSecretKey], userSecretKeys: [sqlSecretKey]},
    });
    const resolved = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: [sqlSecretKey, redisSecretKey]},
    });
    const harness = await createHarness({randomBytes: random, dotnetOutcomes: dotnetOutcomeSequence(missing, resolved)});

    await expect(runPhase(harness)).resolves.toMatchObject({status: "succeeded"});
    expect(random).toHaveBeenCalledOnce();
    const setCall = callFor(harness, userSecretsSetKey);
    expect(Object.keys(JSON.parse(String(setCall?.options.input)) as object)).toEqual([redisSecretKey]);
  });

  it("fails post-set verification when refreshed facts still report a missing key, without leaking the generated value", async () => {
    const generated = expectedPasswordForRepeatedByte(4);
    const missing = availableOutcome({appHost: {projectExists: true, missingParameterKeys: [sqlSecretKey], userSecretKeys: []}});
    const harness = await createHarness({
      randomBytes: () => new Uint8Array(24).fill(4),
      dotnetOutcomes: dotnetOutcomeSequence(missing, missing),
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).not.toContain(generated);
    expect(result.evidence.join("\n")).toMatch(/postcondition/i);
  });

  it("fails when the set command itself fails, sanitizing known generated values from child errors", async () => {
    const generated = expectedPasswordForRepeatedByte(4);
    const missing = availableOutcome({appHost: {projectExists: true, missingParameterKeys: [sqlSecretKey], userSecretKeys: []}});
    const harness = await createHarness({
      randomBytes: () => new Uint8Array(24).fill(4),
      dotnetOutcomes: [missing, missing],
      responses: {
        [userSecretsSetKey]: exited(1, {stderr: `tool echoed ${generated}`}),
      },
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).not.toContain(generated);
  });

  it("never renders child stdout for the secret write, even when the child echoes it back", async () => {
    const generated = expectedPasswordForRepeatedByte(5);
    const missing = availableOutcome({appHost: {projectExists: true, missingParameterKeys: [sqlSecretKey], userSecretKeys: []}});
    const harness = await createHarness({
      randomBytes: () => new Uint8Array(24).fill(5),
      dotnetOutcomes: [missing, missing],
      responses: {
        [userSecretsSetKey]: exited(1, {stdout: `echoed payload ${generated}`}),
      },
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).not.toContain(generated);
    expect(result.evidence.join("\n")).not.toContain("echoed payload");
    expect(result.evidence.join("\n")).toContain("user-secret");
  });

  it("plans a missing-secret action in dry-run without generating or setting", async () => {
    const random = vi.fn<(size: number) => Uint8Array>();
    const missing = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [sqlSecretKey, redisSecretKey], userSecretKeys: []},
    });
    const harness = await createHarness({
      options: setupOptions({dryRun: true}),
      randomBytes: random,
      dotnetOutcomes: [missing],
      dispositions: {
        "dotnet.workload-restore": "planned",
        "dotnet.solution-restore": "planned",
        "dotnet.tool-restore": "planned",
        "dotnet.user-secrets.set": "planned",
      },
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(random).not.toHaveBeenCalled();
    expect(harness.actionIds).toEqual(
      expect.arrayContaining(["dotnet.workload-restore", "dotnet.solution-restore", "dotnet.tool-restore", "dotnet.user-secrets.set"]),
    );
    expect(ranCommand(harness, userSecretsSetKey)).toBe(false);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });
});

describe("HTTPS development certificate", () => {
  it("accepts an already-trusted certificate without any mutation", async () => {
    const harness = await createHarness();

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(result.evidence.join("\n")).toMatch(/certificate is trusted/i);
    expect(harness.actionIds).not.toContain("dotnet.certificate.trust");
    expect(harness.actionIds).not.toContain("dotnet.certificate.create");
  });

  it("creates an absent certificate and verifies existence from refreshed facts before checking trust", async () => {
    const harness = await createHarness({
      dotnetOutcomes: dotnetOutcomeSequence(availableOutcome({certificate: {exists: false, trusted: false}}), availableOutcome()),
      responses: {[certificateCreateKey]: succeeded()},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.find(({id}) => id === "dotnet.certificate.create")?.scope).toBe("user");
    expect(ranCommand(harness, certificateCreateKey)).toBe(true);
  });

  it("fails when certificate creation cannot establish the required existence postcondition", async () => {
    const before = availableOutcome({certificate: {exists: false, trusted: false}});
    const harness = await createHarness({dotnetOutcomes: dotnetOutcomeSequence(before, before)});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toMatch(/certificate/i);
  });

  it("declines certificate creation and fails as required", async () => {
    const before = availableOutcome({certificate: {exists: false, trusted: false}});
    const harness = await createHarness({
      dotnetOutcomes: [before],
      dispositions: {"dotnet.certificate.create": "declined"},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("dotnet.certificate.create");
  });

  it("plans certificate creation in dry-run without running dependent trust mutations", async () => {
    const before = availableOutcome({certificate: {exists: false, trusted: false}});
    const harness = await createHarness({
      options: setupOptions({dryRun: true}),
      dotnetOutcomes: [before],
      dispositions: {
        "dotnet.workload-restore": "planned",
        "dotnet.solution-restore": "planned",
        "dotnet.tool-restore": "planned",
        "dotnet.certificate.create": "planned",
      },
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toContain("dotnet.certificate.create");
    expect(harness.actionIds).not.toContain("dotnet.certificate.trust");
    expect(ranCommand(harness, certificateTrustKey)).toBe(false);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("trusts an untrusted certificate and requires the refreshed trust postcondition", async () => {
    const harness = await createHarness({
      dotnetOutcomes: dotnetOutcomeSequence(availableOutcome({certificate: {exists: true, trusted: false}}), availableOutcome()),
      responses: {[certificateTrustKey]: succeeded()},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.find(({id}) => id === "dotnet.certificate.trust")?.scope).toBe("system");
    expect(callFor(harness, certificateTrustKey)?.options).toMatchObject({cwd: paths.root, output: "inherit"});
  });

  it.each(["declined", "planned"] as const)("reports %s trust without fabricating trusted success", async (disposition) => {
    const before = availableOutcome({certificate: {exists: true, trusted: false}});
    const harness = await createHarness({
      dotnetOutcomes: [before],
      dispositions: {"dotnet.certificate.trust": disposition},
      ...(disposition === "planned"
        ? {
            options: setupOptions({dryRun: true}),
            dispositions: {
              "dotnet.workload-restore": "planned" as const,
              "dotnet.solution-restore": "planned" as const,
              "dotnet.tool-restore": "planned" as const,
              "dotnet.certificate.trust": "planned" as const,
            },
          }
        : {}),
    });

    const result = await runPhase(harness);

    expect(result.status).toBe(disposition === "planned" ? "skipped" : "degraded");
    expect(result.evidence.join("\n")).toContain("dotnet.certificate.trust");
    expect(result.summary).not.toMatch(/trusted successfully/i);
  });

  it("degrades when trust execution fails and names remediation", async () => {
    const harness = await createHarness({
      dotnetOutcomes: [availableOutcome({certificate: {exists: true, trusted: false}})],
      responses: {[certificateTrustKey]: exited(1, {stderr: "trust denied"})},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("dotnet.certificate.trust");
    expect(result.evidence.join("\n")).toContain("trust denied");
    expect(result.nextActions.join("\n")).toMatch(/trust/i);
  });

  it("degrades when the refreshed trust postcondition remains false after a successful trust command", async () => {
    const before = availableOutcome({certificate: {exists: true, trusted: false}});
    const harness = await createHarness({dotnetOutcomes: dotnetOutcomeSequence(before, before)});

    const result = await runPhase(harness);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("dotnet.certificate.trust");
  });
});

describe("dry-run and safety contracts", () => {
  it("accumulates safely knowable planned actions without running mutations or postconditions", async () => {
    const harness = await createHarness({
      options: setupOptions({dryRun: true}),
      dotnetOutcomes: [availableOutcome({certificate: {exists: true, trusted: false}})],
      dispositions: {
        "dotnet.workload-restore": "planned",
        "dotnet.solution-restore": "planned",
        "dotnet.tool-restore": "planned",
        "dotnet.certificate.trust": "planned",
      },
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(result.evidence).toEqual(expect.arrayContaining(harness.actionIds.map((actionId) => expect.stringContaining(actionId))));
    expect(harness.actionIds).toEqual([
      "dotnet.workload-restore",
      "dotnet.solution-restore",
      "dotnet.tool-restore",
      "dotnet.certificate.trust",
    ]);
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.inspect).toHaveBeenCalledTimes(1);
  });

  it("plans SDK installation and all safely knowable restore actions without post-install probes", async () => {
    const harness = await createHarness({
      options: setupOptions({dryRun: true}),
      dotnetOutcomes: [availableOutcome({sdks: [], selectedVersion: undefined})],
      responses: {[wingetVersionKey]: succeeded({stdout: "v1.11.0"})},
      dispositions: {
        "dotnet.install-sdk": "planned",
        "dotnet.workload-restore": "planned",
        "dotnet.solution-restore": "planned",
        "dotnet.tool-restore": "planned",
      },
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toEqual(["dotnet.install-sdk", "dotnet.workload-restore", "dotnet.solution-restore", "dotnet.tool-restore"]);
    expect(harness.runner.calls.some(({request}) => request.args[0] === "workload")).toBe(false);
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.inspect).toHaveBeenCalledTimes(1);
  });

  it("rethrows AbortError interruption", async () => {
    const interruption = new DOMException("interrupted", "AbortError");
    const actions: SetupActionExecutor = {run: async () => Promise.reject(interruption)};
    const harness = await createHarness();

    await expect(runPhase(harness, {actions})).rejects.toBe(interruption);
  });

  it("requires an invocation-scoped runtime instead of falling back to ambient capabilities", async () => {
    const harness = await createHarness();
    const {runtime: _runtime, ...withoutRuntime} = harness.context;

    await expect(harness.phase.run(withoutRuntime as SetupContext)).rejects.toThrow(/setup phase runtime/i);
  });

  it("never invokes build, test, service, update, or remote-installer commands", async () => {
    const harness = await createHarness();

    await expect(runPhase(harness)).resolves.toMatchObject({status: "succeeded"});

    const commands = harness.runner.calls.map(({request}) => [request.command, ...request.args].join(" "));
    expect(commands.join("\n")).not.toMatch(/\bdotnet (?:build|test|run|watch|workload update|tool update)\b/i);
    expect(commands.join("\n")).not.toMatch(/\bcurl\b|Invoke-WebRequest|dotnet-install\.(?:ps1|sh)/i);
    expect(commands.join("\n")).not.toMatch(/--list-sdks|--check-trust-machine-readable|user-secrets list/i);
  });
});

describe("initially unavailable dotnet installation", () => {
  it("discovers an installer, installs, and completes when dotnet is initially unavailable", async () => {
    const harness = await createHarness({
      dotnetOutcomes: [unavailableOutcome("The dotnet executable is unavailable."), availableOutcome()],
      responses: {[wingetVersionKey]: succeeded({stdout: "v1.11.0\n"}), [wingetInstallKey]: succeeded()},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).toEqual(["dotnet.install-sdk", "dotnet.workload-restore", "dotnet.solution-restore", "dotnet.tool-restore"]);
    expect(result.evidence).toContain("The dotnet executable is unavailable.");
    expect(result.evidence.join("\n")).toContain("Executed and verified action: dotnet.install-sdk");
  });

  it("plans installation and dependent restores in dry-run when dotnet is initially unavailable", async () => {
    const harness = await createHarness({
      options: setupOptions({dryRun: true}),
      dotnetOutcomes: [unavailableOutcome()],
      responses: {[wingetVersionKey]: succeeded({stdout: "v1.11.0\n"})},
      dispositions: {
        "dotnet.install-sdk": "planned",
        "dotnet.workload-restore": "planned",
        "dotnet.solution-restore": "planned",
        "dotnet.tool-restore": "planned",
      },
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toEqual(["dotnet.install-sdk", "dotnet.workload-restore", "dotnet.solution-restore", "dotnet.tool-restore"]);
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.inspect).toHaveBeenCalledTimes(1);
  });

  it("fails with official guidance when dotnet is unavailable and no installer is discoverable", async () => {
    const harness = await createHarness({platform: "freebsd", dotnetOutcomes: [unavailableOutcome()]});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toContain("https://dotnet.microsoft.com/download");
    expect(harness.runner.calls).toEqual([]);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("keeps an initially invalid dotnet fact an explicit bounded failure without probing installers", async () => {
    const harness = await createHarness({dotnetOutcomes: [invalidOutcome(["dotnet --version returned malformed output."])]});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("dotnet --version returned malformed output.");
    expect(harness.runner.calls).toEqual([]);
    expect(harness.actionIds).toEqual([]);
  });
});

describe("dotnet cache freshness around mutations", () => {
  const plannedRestores = {
    "dotnet.workload-restore": "planned" as const,
    "dotnet.solution-restore": "planned" as const,
    "dotnet.tool-restore": "planned" as const,
  };

  it("invalidates and re-inspects dotnet after each executed restore", async () => {
    const harness = await createHarness();

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.invalidate).toHaveBeenCalledTimes(3);
    expect(harness.invalidate.mock.calls).toEqual([["dotnet"], ["dotnet"], ["dotnet"]]);
    expect(harness.inspect).toHaveBeenCalledTimes(4);
  });

  it("invalidates dotnet when an attempted restore mutation fails", async () => {
    const harness = await createHarness({responses: {[workloadRestoreKey]: exited(7, {stderr: "restore error"})}});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("dotnet");
    expect(harness.actionIds).toEqual(["dotnet.workload-restore"]);
  });

  it("propagates a later AbortError after an earlier mutation already executed and invalidated", async () => {
    const interruption = new DOMException("interrupted", "AbortError");
    const harness = await createHarness();
    const actions: SetupActionExecutor = {
      run: async (action) => {
        if (action.id === "dotnet.tool-restore") {
          throw interruption;
        }
        return harness.context.actions.run(action);
      },
    };

    await expect(runPhase(harness, {actions})).rejects.toBe(interruption);
    expect(harness.actionIds).toEqual(["dotnet.workload-restore", "dotnet.solution-restore"]);
    expect(harness.invalidate).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["dotnet.workload-restore", ["dotnet.workload-restore"]],
    ["dotnet.solution-restore", ["dotnet.workload-restore", "dotnet.solution-restore"]],
    ["dotnet.tool-restore", ["dotnet.workload-restore", "dotnet.solution-restore", "dotnet.tool-restore"]],
  ])("declines %s without invalidating facts or running a later action", async (declined, expectedActionIds) => {
    const harness = await createHarness({
      dispositions: {...plannedRestores, [declined]: "declined"},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain(`Declined action: ${declined}`);
    expect(harness.actionIds).toEqual(expectedActionIds);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("declines a restore after an earlier executed restore and invalidates exactly once", async () => {
    const harness = await createHarness({dispositions: {"dotnet.solution-restore": "declined"}});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual(["dotnet.workload-restore", "dotnet.solution-restore"]);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("dotnet");
    expect(harness.inspect).toHaveBeenCalledTimes(2);
  });

  it("declines the user-secret write without invalidating facts or reaching certificate actions", async () => {
    const missing = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [sqlSecretKey], userSecretKeys: []},
      certificate: {exists: false, trusted: false},
    });
    const harness = await createHarness({
      dotnetOutcomes: [missing],
      dispositions: {...plannedRestores, "dotnet.user-secrets.set": "declined"},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual([
      "dotnet.workload-restore",
      "dotnet.solution-restore",
      "dotnet.tool-restore",
      "dotnet.user-secrets.set",
    ]);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("invalidates and re-inspects exactly once for an executed user-secret write", async () => {
    const missing = availableOutcome({appHost: {projectExists: true, missingParameterKeys: [sqlSecretKey], userSecretKeys: []}});
    const resolved = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: [sqlSecretKey, redisSecretKey]},
    });
    const harness = await createHarness({dotnetOutcomes: [missing, resolved], dispositions: plannedRestores});

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("dotnet");
    expect(harness.inspect).toHaveBeenCalledTimes(2);
  });

  it("invalidates and re-inspects exactly once per executed certificate mutation", async () => {
    const absent = availableOutcome({certificate: {exists: false, trusted: false}});
    const untrusted = availableOutcome({certificate: {exists: true, trusted: false}});
    const harness = await createHarness({dotnetOutcomes: [absent, untrusted, availableOutcome()], dispositions: plannedRestores});

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toEqual([
      "dotnet.workload-restore",
      "dotnet.solution-restore",
      "dotnet.tool-restore",
      "dotnet.certificate.create",
      "dotnet.certificate.trust",
    ]);
    expect(harness.invalidate).toHaveBeenCalledTimes(2);
    expect(harness.inspect).toHaveBeenCalledTimes(3);
  });

  it("reports bounded refresh evidence when the trust postcondition cannot be verified", async () => {
    const untrusted = availableOutcome({certificate: {exists: true, trusted: false}});
    const harness = await createHarness({
      dotnetOutcomes: [untrusted, untrusted, untrusted, untrusted, unavailableOutcome("The dotnet executable is unavailable.")],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("dotnet.certificate.trust");
    expect(result.evidence).toContain("The dotnet executable is unavailable.");
  });
});

describe("restore postconditions", () => {
  it("fails when the workload restore drops a previously observed workload", async () => {
    const harness = await createHarness({
      dotnetOutcomes: [availableOutcome({workloads: ["aspire", "wasm-tools"]}), availableOutcome({workloads: ["aspire"]})],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("wasm-tools");
    expect(harness.actionIds).toEqual(["dotnet.workload-restore"]);
  });

  it("fails when the solution restore leaves generated NuGet restore issues", async () => {
    const restoreIssue = "Missing NuGet restore assets: tooling/AppHost/AppHost.csproj";
    const harness = await createHarness({
      dotnetOutcomes: [availableOutcome(), availableOutcome(), availableOutcome({solutionRestoreIssues: [restoreIssue]})],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain(restoreIssue);
    expect(harness.actionIds).toEqual(["dotnet.workload-restore", "dotnet.solution-restore"]);
  });

  it("fails when the tool restore does not install the manifest-pinned repository tool", async () => {
    const harness = await createHarness({
      dotnetOutcomes: [availableOutcome(), availableOutcome(), availableOutcome(), availableOutcome({localTools: []})],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("defaultdocumentation.console");
    expect(result.evidence.join("\n")).not.toContain("1.2.4");
    expect(harness.actionIds).toEqual(["dotnet.workload-restore", "dotnet.solution-restore", "dotnet.tool-restore"]);
  });

  it("does not claim static solution structure proves every restore", async () => {
    const harness = await createHarness();

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(result.evidence.join("\n")).not.toMatch(/remains structurally valid after restore/i);
    expect(result.evidence.join("\n")).toContain("Executed and verified action: dotnet.workload-restore");
    expect(result.evidence.join("\n")).toContain("Executed and verified action: dotnet.solution-restore");
    expect(result.evidence.join("\n")).toContain("Executed and verified action: dotnet.tool-restore");
  });
});

describe("user-secret provisioning policy", () => {
  const plannedRestores = {
    "dotnet.workload-restore": "planned" as const,
    "dotnet.solution-restore": "planned" as const,
    "dotnet.tool-restore": "planned" as const,
  };

  it("provisions per-machine user secrets when tracked configuration alone satisfies precedence", async () => {
    const trackedOnly = availableOutcome({appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: []}});
    const provisioned = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: [sqlSecretKey, redisSecretKey]},
    });
    const harness = await createHarness({dotnetOutcomes: [trackedOnly, provisioned], dispositions: plannedRestores});

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toContain("dotnet.user-secrets.set");
    const setCall = callFor(harness, userSecretsSetKey);
    expect(Object.keys(JSON.parse(String(setCall?.options.input)) as object)).toEqual([sqlSecretKey, redisSecretKey]);
    expect(setCall?.options.output).toBeUndefined();
  });

  it("provisions a required key whose user secret exists but remains blank", async () => {
    const blankRedis = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [redisSecretKey], userSecretKeys: [sqlSecretKey, redisSecretKey]},
    });
    const provisioned = availableOutcome({
      appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: [sqlSecretKey, redisSecretKey]},
    });
    const harness = await createHarness({dotnetOutcomes: [blankRedis, provisioned], dispositions: plannedRestores});

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    const setCall = callFor(harness, userSecretsSetKey);
    expect(Object.keys(JSON.parse(String(setCall?.options.input)) as object)).toEqual([redisSecretKey]);
  });

  it("fails the user-secret postcondition when refreshed precedence succeeds without the written key", async () => {
    const generated = expectedPasswordForRepeatedByte(9);
    const trackedOnly = availableOutcome({appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: []}});
    const partial = availableOutcome({appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: [sqlSecretKey]}});
    const harness = await createHarness({
      randomBytes: () => new Uint8Array(24).fill(9),
      dotnetOutcomes: [trackedOnly, partial],
      dispositions: plannedRestores,
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/postcondition/i);
    expect(result.evidence.join("\n")).toContain(redisSecretKey);
    expect(result.evidence.join("\n")).not.toContain(generated);
  });
});
