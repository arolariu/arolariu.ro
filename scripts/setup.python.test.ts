// @vitest-environment node
/**
 * @fileoverview Contract tests for the independent Python setup phase.
 * @module scripts.setup.python.test
 *
 * @remarks
 * Every test drives the real phase against an injected {@link SetupPhaseRuntime}: a recording
 * process runner replaying typed {@link ProcessExecutionResult} fixtures, a deterministic clock, an
 * in-memory recursive-removal filesystem, and an immutable environment snapshot that supplies the
 * host platform. No test in this file reads the live checkout, spawns a process, or observes
 * ambient Node state.
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
import type {Clock, RuntimeEnvironment} from "./core/runtime/runtime-capability.ts";
import {buildRuntimeExecutionContext} from "./testing/builders/runtime-context.builder.ts";
import {createMemoryFileSystem} from "./testing/fixtures/memory-filesystem.fixture.ts";
import type {PythonFacts, PythonInterpreterFact} from "./inspection/python.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";
import {createPythonSetupPhase, pythonInVirtualEnvironment, pythonSetupPhase, selectPythonInstallationProposal} from "./setup.python.ts";
import type {
  SetupAction,
  SetupActionDisposition,
  SetupActionExecutor,
  SetupContext,
  SetupInput,
  SetupPhaseResult,
  SetupPhaseRuntime,
} from "./setup.types.ts";

const requiredPython: MinimumVersion = {major: 3, minor: 12, patch: 0};
const paths = createRepositoryPaths(resolve("C:\\fixture\\arolariu.ro"));
const defaultInterpreter: PythonInterpreterFact = {command: "py", prefixArgs: ["-3.12"], version: "3.12.4"};
const venvSpecWin32 = pythonInVirtualEnvironment(paths.expRoot, "win32");
const venvDirectoryWin32 = `${paths.expRoot}\\.venv`;

function succeeded(patch: Readonly<{stdout?: string; stderr?: string}> = {}): ProcessExecutionResult {
  return {kind: "succeeded", exitCode: 0, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function exited(exitCode: number, patch: Readonly<{stdout?: string; stderr?: string}> = {}): ProcessExecutionResult {
  return {kind: "exited", exitCode, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
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
  protected override execute(
    request: Readonly<ProcessExecutionRequest>,
    options: Readonly<ProcessExecutionOptions>,
  ): Promise<ProcessExecutionResult> {
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
    dotnet: {major: 10, minor: 0, patch: 0},
    python: requiredPython,
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

/** A {@link PythonFacts} patch that may explicitly clear the optional `selected` field to `undefined`. */
type PythonFactsPatch = Partial<Omit<PythonFacts, "selected">> & {selected?: PythonInterpreterFact | undefined};

/** Builds one complete, compatible-by-default {@link PythonFacts} value for tests to patch. */
function pythonFacts(patch: PythonFactsPatch = {}): PythonFacts {
  const {selected, ...rest} = patch;
  // `"key" in patch` distinguishes an absent field (use the default) from an explicit `undefined`
  // (clear the optional field), which a destructuring default alone cannot tell apart.
  const includeSelected = !("selected" in patch) || selected !== undefined;
  return {
    interpreters: [defaultInterpreter],
    virtualEnvironment: {exists: true, compatible: true, interpreterPath: `${venvDirectoryWin32}\\Scripts\\python.exe`, version: "3.12.4"},
    pip: {available: true, version: "24.3.1", conflicts: []},
    requirements: {declared: [], unverifiable: [], mismatches: []},
    configurationIssues: [],
    ...rest,
    ...(includeSelected ? {selected: selected ?? defaultInterpreter} : {}),
  };
}

function availableOutcome(patch: PythonFactsPatch = {}): InspectionOutcome<PythonFacts> {
  return {kind: "available", value: pythonFacts(patch), durationMs: 1};
}

function unavailableOutcome(reason = "Python interpreter candidates could not be inspected."): InspectionOutcome<PythonFacts> {
  return {kind: "unavailable", reason, durationMs: 1};
}

function invalidOutcome(
  issues: readonly string[] = ["The Python virtual environment returned malformed metadata."],
): InspectionOutcome<PythonFacts> {
  return {kind: "invalid", issues, durationMs: 1};
}

/** A controllable fake {@link RepositoryInspectionSession} that only ever resolves the `"python"` key. */
function createPythonInspectionHarness(outcomes: readonly InspectionOutcome<PythonFacts>[] = [availableOutcome()]): Readonly<{
  session: RepositoryInspectionSession;
  inspect: ReturnType<typeof vi.fn>;
  invalidate: ReturnType<typeof vi.fn>;
}> {
  let callIndex = 0;
  const inspect = vi.fn(async (key: "python") => {
    if (key !== "python") {
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
 * The exact context view the migrated Python phase reads.
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

interface PythonHarness {
  /** The phase under test. */
  readonly phase: ReturnType<typeof createPythonSetupPhase>;
  /** The migrated setup context handed to the phase. */
  readonly context: MigratedSetupContext;
  /** Recording process runner observed by the phase. */
  readonly runner: FakeProcessRunner;
  /** Action identifiers in evaluation order. */
  readonly actionIds: string[];
  /** Complete action records in evaluation order. */
  readonly actionRecords: SetupAction[];
  /** Every directory path passed to the recursive-removal filesystem. */
  readonly removedDirectories: readonly string[];
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
    pythonOutcomes?: readonly InspectionOutcome<PythonFacts>[];
  }> = {},
): Promise<PythonHarness> {
  const runner = new FakeProcessRunner(input.responses);
  const {actions, actionIds, actionRecords} = createActions(input.dispositions);
  const {session, inspect, invalidate} = createPythonInspectionHarness(input.pythonOutcomes);
  const sink = new RecordingTerminalPresenterSink();
  const logger = new ComposedTerminalPresenter("setup::python", {color: false, sink});

  let elapsed = 0;
  const clock: Clock = {
    monotonicNow: (): number => elapsed++,
    isoTimestamp: (): string => "2026-09-01T00:00:00.000Z",
    delay: (): Promise<void> => Promise.resolve(),
  };

  const files = createMemoryFileSystem({});
  const removedDirectories: string[] = [];
  vi.spyOn(files, "remove").mockImplementation(async (path: string) => {
    removedDirectories.push(path);
  });

  const commandRuntime = buildRuntimeExecutionContext({
    files,
    runner,
    clock,
    presenter: logger,
    environment: environmentSnapshot(input.platform ?? "win32"),
  });
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
      Promise.reject(new Error("The Python setup phase must never invoke generation.")),
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

  const phase = createPythonSetupPhase();
  return {phase, context, runner, actionIds, actionRecords, removedDirectories, inspect, invalidate};
}

/**
 * Runs the phase against the migrated context view, optionally replacing one context member.
 *
 * @param harness - Assembled test harness.
 * @param patch - Context members replaced for this run.
 * @returns The completed phase result.
 */
function runPhase(harness: PythonHarness, patch: Partial<MigratedSetupContext> = {}): Promise<SetupPhaseResult> {
  return harness.phase.run({...harness.context, ...patch} as SetupContext);
}

function callFor(harness: PythonHarness, key: string): RecordedCall | undefined {
  return harness.runner.calls.find(({request}) => commandKey(request) === key);
}

describe("python setup public contract", () => {
  it("publishes an independent required phase", () => {
    expect(pythonSetupPhase).toMatchObject({id: "python", required: true, dependsOn: []});
  });

  it("requires an invocation-scoped runtime instead of falling back to ambient capabilities", async () => {
    const harness = await createHarness();
    const {runtime: _runtime, ...withoutRuntime} = harness.context;

    await expect(harness.phase.run(withoutRuntime as SetupContext)).rejects.toThrow(/setup phase runtime/i);
  });
});

describe("pythonInVirtualEnvironment", () => {
  it("resolves the Windows venv interpreter path", () => {
    expect(pythonInVirtualEnvironment("C:\\repo\\sites\\exp.arolariu.ro", "win32")).toEqual({
      command: "C:\\repo\\sites\\exp.arolariu.ro\\.venv\\Scripts\\python.exe",
      args: [],
    });
  });

  it.each(["linux", "darwin"] as const)("resolves the Unix venv interpreter path on %s", (platform) => {
    expect(pythonInVirtualEnvironment("/repo/sites/exp.arolariu.ro", platform)).toEqual({
      command: "/repo/sites/exp.arolariu.ro/.venv/bin/python",
      args: [],
    });
  });
});

describe("selectPythonInstallationProposal", () => {
  it.each([
    [
      "Windows winget",
      {platform: "win32" as const, availablePackageManagers: new Set(["winget"]), required: requiredPython},
      {
        command: "winget",
        args: ["install", "--id", "Python.Python.3.12", "--exact", "--accept-package-agreements", "--accept-source-agreements"],
      },
    ],
    [
      "macOS Homebrew",
      {platform: "darwin" as const, availablePackageManagers: new Set(["brew"]), required: requiredPython},
      {command: "brew", args: ["install", "python@3.12"]},
    ],
    [
      "Linux apt",
      {platform: "linux" as const, availablePackageManagers: new Set(["apt-get", "dnf"]), required: requiredPython},
      {command: "sudo", args: ["apt-get", "install", "-y", "python3.12", "python3.12-venv"]},
    ],
    [
      "Linux dnf",
      {platform: "linux" as const, availablePackageManagers: new Set(["dnf"]), required: requiredPython},
      {command: "sudo", args: ["dnf", "install", "-y", "python3.12"]},
    ],
  ])("selects the supported %s proposal", (_name, input, command) => {
    expect(selectPythonInstallationProposal(input)?.command).toEqual(command);
  });

  it.each([
    ["missing manager", {platform: "linux" as const, availablePackageManagers: new Set<string>(), required: requiredPython}],
    ["unsupported platform", {platform: "freebsd" as const, availablePackageManagers: new Set(["winget"]), required: requiredPython}],
    [
      "an unsupported required version",
      {platform: "win32" as const, availablePackageManagers: new Set(["winget"]), required: {major: 3, minor: 13, patch: 0}},
    ],
  ])("does not invent an installation path for %s", (_name, input) => {
    expect(selectPythonInstallationProposal(input)).toBeNull();
  });
});

describe("python interpreter fact readiness", () => {
  it("accepts an already-selected interpreter without an install action", async () => {
    const harness = await createHarness();

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).not.toContain("python.install-interpreter");
    expect(harness.inspect).toHaveBeenCalledWith("python");
  });

  it("fails explicitly with bounded evidence when python is unavailable and unrecoverable", async () => {
    const harness = await createHarness({pythonOutcomes: [unavailableOutcome("The Python inspection platform is unsupported.")]});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("The Python inspection platform is unsupported.");
    expect(result.nextActions.join("\n")).toContain("https://www.python.org/downloads/");
    expect(harness.actionIds).toEqual([]);
    expect(harness.runner.calls).toEqual([]);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("fails explicitly with bounded evidence when the initial python fact is invalid", async () => {
    const harness = await createHarness({
      pythonOutcomes: [invalidOutcome(["The Python virtual environment returned malformed metadata."])],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("The Python virtual environment returned malformed metadata.");
    expect(harness.runner.calls).toEqual([]);
    expect(harness.actionIds).toEqual([]);
  });

  it("fails with official guidance when no supported installer is discoverable, without probing anything", async () => {
    const harness = await createHarness({
      platform: "freebsd",
      pythonOutcomes: [availableOutcome({interpreters: [], selected: undefined})],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toContain("https://www.python.org/downloads/");
    expect(harness.runner.calls).toEqual([]);
  });

  it("does not treat a successful install command as proof of readiness when refreshed facts still lack a selected interpreter", async () => {
    const wingetKey = commandKey({command: "winget", args: ["--version"]});
    const installKey = commandKey(
      selectPythonInstallationProposal({platform: "win32", availablePackageManagers: new Set(["winget"]), required: requiredPython})!
        .command,
    );
    const harness = await createHarness({
      pythonOutcomes: [
        availableOutcome({interpreters: [], selected: undefined}),
        availableOutcome({interpreters: [], selected: undefined}),
      ],
      responses: {[wingetKey]: succeeded({stdout: "v1.11.0\n"}), [installKey]: succeeded()},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.summary).toMatch(/remains unavailable/i);
    expect(harness.actionIds).toEqual(["python.install-interpreter"]);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("python");
    expect(harness.inspect).toHaveBeenCalledTimes(2);
  });

  it("installs, invalidates exactly python, and verifies a selected interpreter from refreshed facts", async () => {
    const wingetKey = commandKey({command: "winget", args: ["--version"]});
    const installKey = commandKey(
      selectPythonInstallationProposal({platform: "win32", availablePackageManagers: new Set(["winget"]), required: requiredPython})!
        .command,
    );
    const harness = await createHarness({
      pythonOutcomes: [availableOutcome({interpreters: [], selected: undefined}), availableOutcome()],
      responses: {[wingetKey]: succeeded({stdout: "v1.11.0\n"}), [installKey]: succeeded()},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds[0]).toBe("python.install-interpreter");
    expect(harness.invalidate).toHaveBeenCalledWith("python");
    expect(result.evidence.join("\n")).toContain("Executed and verified action: python.install-interpreter");
  });

  it("fails with manual guidance when installation is declined, without invalidating facts", async () => {
    const wingetKey = commandKey({command: "winget", args: ["--version"]});
    const harness = await createHarness({
      pythonOutcomes: [availableOutcome({interpreters: [], selected: undefined})],
      responses: {[wingetKey]: succeeded({stdout: "v1.11.0\n"})},
      dispositions: {"python.install-interpreter": "declined"},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Declined action: python.install-interpreter");
    expect(result.nextActions.join("\n")).toContain("https://www.python.org/downloads/");
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("stops dependent preparation and returns skipped when installation is planned by dry-run", async () => {
    const wingetKey = commandKey({command: "winget", args: ["--version"]});
    const harness = await createHarness({
      options: setupOptions({dryRun: true}),
      pythonOutcomes: [availableOutcome({interpreters: [], selected: undefined})],
      responses: {[wingetKey]: succeeded({stdout: "v1.11.0\n"})},
      dispositions: {"python.install-interpreter": "planned"},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toContain("Planned action: python.install-interpreter");
    expect(harness.actionIds).toEqual(["python.install-interpreter"]);
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.inspect).toHaveBeenCalledTimes(1);
  });

  it("discovers Homebrew and executes the exact macOS installation proposal", async () => {
    const brewVersionKey = commandKey({command: "brew", args: ["--version"]});
    const brewInstallKey = commandKey({command: "brew", args: ["install", "python@3.12"]});
    const harness = await createHarness({
      platform: "darwin",
      pythonOutcomes: [availableOutcome({interpreters: [], selected: undefined}), availableOutcome()],
      responses: {[brewVersionKey]: succeeded({stdout: "Homebrew 4.6.0\n"}), [brewInstallKey]: succeeded()},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.find(({id}) => id === "python.install-interpreter")?.scope).toBe("system");
    expect(callFor(harness, brewInstallKey)?.options).toMatchObject({
      cwd: paths.root,
      output: "inherit",
      timeoutMs: 1_200_000,
    });
  });
});

describe("python virtual environment readiness", () => {
  it("accepts a compatible canonical venv without a create action, but still runs pip steps", async () => {
    const harness = await createHarness();

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
  });

  it("creates an absent venv without removing anything, verifies compatibility, and continues to pip steps", async () => {
    const createKey = commandKey({command: "py", args: ["-3.12", "-m", "venv", venvDirectoryWin32]});
    const harness = await createHarness({
      pythonOutcomes: [availableOutcome({virtualEnvironment: {exists: false, compatible: false}}), availableOutcome()],
      responses: {[createKey]: succeeded()},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).toEqual(["python.venv.create", "python.pip.upgrade", "python.dependencies.install"]);
    expect(callFor(harness, createKey)).toBeDefined();
    expect(harness.removedDirectories).toEqual([]);
  });

  it("removes an existing incompatible venv before recreating it", async () => {
    const createKey = commandKey({command: "py", args: ["-3.12", "-m", "venv", venvDirectoryWin32]});
    const harness = await createHarness({
      pythonOutcomes: [availableOutcome({virtualEnvironment: {exists: true, compatible: false, version: "3.10.0"}}), availableOutcome()],
      responses: {[createKey]: succeeded()},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds[0]).toBe("python.venv.create");
    expect(harness.removedDirectories).toEqual([venvDirectoryWin32]);
  });

  it("does not treat a successful venv creation command as proof of readiness when refreshed facts remain incompatible", async () => {
    const createKey = commandKey({command: "py", args: ["-3.12", "-m", "venv", venvDirectoryWin32]});
    const incompatible = availableOutcome({virtualEnvironment: {exists: false, compatible: false}});
    const harness = await createHarness({pythonOutcomes: [incompatible, incompatible], responses: {[createKey]: succeeded()}});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.summary).toMatch(/remains incompatible/i);
    expect(harness.actionIds).toEqual(["python.venv.create"]);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("python");
    expect(harness.inspect).toHaveBeenCalledTimes(2);
  });

  it("declines venv creation and fails as required, without invalidating facts", async () => {
    const harness = await createHarness({
      pythonOutcomes: [availableOutcome({virtualEnvironment: {exists: false, compatible: false}})],
      dispositions: {"python.venv.create": "declined"},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Declined action: python.venv.create");
    expect(harness.actionIds).toEqual(["python.venv.create"]);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("plans venv creation in dry-run and continues to plan dependent pip actions without probing them", async () => {
    const harness = await createHarness({
      options: setupOptions({dryRun: true}),
      pythonOutcomes: [availableOutcome({virtualEnvironment: {exists: false, compatible: false}})],
      dispositions: {
        "python.venv.create": "planned",
        "python.pip.upgrade": "planned",
        "python.dependencies.install": "planned",
      },
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toEqual(["python.venv.create", "python.pip.upgrade", "python.dependencies.install"]);
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.inspect).toHaveBeenCalledTimes(1);
  });

  it("fails without removing anything or running any pip action when creating an absent venv itself fails", async () => {
    const createKey = commandKey({command: "py", args: ["-3.12", "-m", "venv", venvDirectoryWin32]});
    const harness = await createHarness({
      pythonOutcomes: [availableOutcome({virtualEnvironment: {exists: false, compatible: false}})],
      responses: {[createKey]: exited(1, {stderr: "boom\n"})},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual(["python.venv.create"]);
    expect(result.evidence.join("\n")).toContain("Python virtual environment creation failed.");
    expect(result.evidence.join("\n")).toContain("boom");
    expect(harness.removedDirectories).toEqual([]);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("python");
  });

  it("still removes an existing incompatible venv before an unsuccessful recreation attempt", async () => {
    const createKey = commandKey({command: "py", args: ["-3.12", "-m", "venv", venvDirectoryWin32]});
    const harness = await createHarness({
      pythonOutcomes: [availableOutcome({virtualEnvironment: {exists: true, compatible: false, version: "3.10.0"}})],
      responses: {[createKey]: exited(1, {stderr: "boom\n"})},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual(["python.venv.create"]);
    expect(harness.removedDirectories).toEqual([venvDirectoryWin32]);
  });
});

describe("pip upgrade and dependency installation", () => {
  const upgradeKey = commandKey({
    command: venvSpecWin32.command,
    args: [...venvSpecWin32.args, "-m", "pip", "install", "--upgrade", "pip"],
  });
  const installKey = commandKey({
    command: venvSpecWin32.command,
    args: [...venvSpecWin32.args, "-m", "pip", "install", "-r", paths.pythonRequirements],
  });

  it("upgrades pip and installs pinned requirements using only the venv-owned interpreter", async () => {
    const harness = await createHarness();

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(callFor(harness, upgradeKey)?.options).toMatchObject({cwd: paths.expRoot, output: "tee", timeoutMs: 1_200_000});
    expect(callFor(harness, installKey)?.options).toMatchObject({cwd: paths.expRoot, output: "tee", timeoutMs: 1_200_000});
  });

  it("fails without installing requirements when the pip upgrade command fails", async () => {
    const harness = await createHarness({responses: {[upgradeKey]: exited(1, {stderr: "boom\n"})}});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual(["python.pip.upgrade"]);
    expect(result.evidence.join("\n")).toContain("Upgrading pip inside the isolated virtual environment failed.");
  });

  it("fails the pip-upgrade postcondition when refreshed facts report pip unavailable", async () => {
    const harness = await createHarness({
      pythonOutcomes: [availableOutcome(), availableOutcome({pip: {available: false, conflicts: []}})],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.summary).toMatch(/did not satisfy its postcondition/i);
    expect(result.evidence.join("\n")).toContain("pip is not available inside the isolated virtual environment after upgrading pip.");
    expect(harness.actionIds).toEqual(["python.pip.upgrade"]);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("python");
    expect(harness.inspect).toHaveBeenCalledTimes(2);
  });

  it("declines the pip upgrade without invalidating facts or reaching dependency installation", async () => {
    const harness = await createHarness({dispositions: {"python.pip.upgrade": "declined"}});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Declined action: python.pip.upgrade");
    expect(harness.actionIds).toEqual(["python.pip.upgrade"]);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("fails without a satisfied postcondition when requirement installation fails", async () => {
    const harness = await createHarness({responses: {[installKey]: exited(1, {stderr: "boom\n"})}});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
    expect(result.evidence.join("\n")).toContain("Installing Python requirements inside the isolated virtual environment failed.");
  });

  it("fails the dependency-install postcondition when refreshed facts report pip conflicts", async () => {
    const conflict = "pip reported a dependency conflict for 'broken-package'.";
    const harness = await createHarness({
      pythonOutcomes: [availableOutcome(), availableOutcome(), availableOutcome({pip: {available: true, conflicts: [conflict]}})],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain(conflict);
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
  });

  it("fails the dependency-install postcondition when refreshed facts report exact requirement mismatches", async () => {
    const mismatch = "pytest requires 9.1.1 but 8.3.2 is installed.";
    const harness = await createHarness({
      pythonOutcomes: [
        availableOutcome(),
        availableOutcome(),
        availableOutcome({requirements: {declared: [], unverifiable: [], mismatches: [mismatch]}}),
      ],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain(mismatch);
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
  });

  it("does not require mismatches or conflicts to be clear before dependency installation may repair them", async () => {
    const harness = await createHarness({
      pythonOutcomes: [
        availableOutcome({
          pip: {available: true, conflicts: ["pip reported a dependency conflict for 'broken-package'."]},
          requirements: {declared: [], unverifiable: [], mismatches: ["pytest requires 9.1.1 but 8.3.2 is installed."]},
        }),
        availableOutcome({
          pip: {available: true, conflicts: ["pip reported a dependency conflict for 'broken-package'."]},
          requirements: {declared: [], unverifiable: [], mismatches: ["pytest requires 9.1.1 but 8.3.2 is installed."]},
        }),
        availableOutcome(),
      ],
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
  });

  it("declines dependency installation after pip upgrade already executed, invalidating exactly once", async () => {
    const harness = await createHarness({dispositions: {"python.dependencies.install": "declined"}});

    const result = await runPhase(harness);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
    expect(result.evidence.join("\n")).toContain("Declined action: python.dependencies.install");
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("python");
  });

  it("is idempotent across repeated runs of an already-ready environment", async () => {
    const first = await createHarness();
    const firstResult = await runPhase(first);
    expect(firstResult.status).toBe("succeeded");
    expect(first.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);

    const second = await createHarness();
    const secondResult = await runPhase(second);
    expect(secondResult.status).toBe("succeeded");
    expect(second.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
  });
});

describe("python cache freshness around mutations", () => {
  it("invalidates and re-inspects python after each executed mutation, including venv creation", async () => {
    const createKey = commandKey({command: "py", args: ["-3.12", "-m", "venv", venvDirectoryWin32]});
    const harness = await createHarness({
      pythonOutcomes: [availableOutcome({virtualEnvironment: {exists: false, compatible: false}}), availableOutcome(), availableOutcome()],
      responses: {[createKey]: succeeded()},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    expect(harness.invalidate).toHaveBeenCalledTimes(3);
    expect(harness.invalidate.mock.calls).toEqual([["python"], ["python"], ["python"]]);
    expect(harness.inspect).toHaveBeenCalledTimes(4);
  });

  it("propagates a later AbortError after an earlier mutation already executed and invalidated", async () => {
    const interruption = new DOMException("interrupted", "AbortError");
    const harness = await createHarness();
    const actions: SetupActionExecutor = {
      run: async (action) => {
        if (action.id === "python.dependencies.install") {
          throw interruption;
        }
        return harness.context.actions.run(action);
      },
    };

    await expect(runPhase(harness, {actions})).rejects.toBe(interruption);
    expect(harness.actionIds).toEqual(["python.pip.upgrade"]);
    expect(harness.invalidate).toHaveBeenCalledTimes(1);
  });

  it("rethrows interruption instead of reporting a failed result", async () => {
    const abortError = Object.assign(new Error("aborted"), {name: "AbortError"});
    const harness = await createHarness();
    const actions: SetupActionExecutor = {run: async () => Promise.reject(abortError)};

    await expect(runPhase(harness, {actions})).rejects.toBe(abortError);
  });
});

describe("dry-run and safety contracts", () => {
  it("accumulates safely knowable planned actions without running mutations or postconditions", async () => {
    const harness = await createHarness({
      options: setupOptions({dryRun: true}),
      dispositions: {"python.pip.upgrade": "planned", "python.dependencies.install": "planned"},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.inspect).toHaveBeenCalledTimes(1);
  });

  it("never issues a bare pip, remote-installer, build, test, or service command", async () => {
    const createKey = commandKey({command: "py", args: ["-3.12", "-m", "venv", venvDirectoryWin32]});
    const harness = await createHarness({
      pythonOutcomes: [availableOutcome({virtualEnvironment: {exists: false, compatible: false}}), availableOutcome(), availableOutcome()],
      responses: {[createKey]: succeeded()},
    });

    const result = await runPhase(harness);

    expect(result.status).toBe("succeeded");
    for (const {request} of harness.runner.calls) {
      expect(request.command).not.toBe("pip");
      if (request.args.includes("pip")) {
        expect(request.args[0]).toBe("-m");
        expect(request.args[1]).toBe("pip");
      }
      const joined = [request.command, ...request.args].join(" ");
      expect(joined).not.toMatch(/curl|wget|Invoke-WebRequest|uvicorn|pytest|npm ci|--fix/iu);
    }
  });
});
