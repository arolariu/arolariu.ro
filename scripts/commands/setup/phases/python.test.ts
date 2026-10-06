// @vitest-environment node
/**
 * @fileoverview Contract tests for the independent Python setup phase.
 * @module scripts/commands/setup/phases/python.test
 *
 * @remarks
 * Every test runs the real Effect phase on the in-memory `makeTestLayer` harness: request-keyed
 * scripted commands replaying legacy-shaped outcomes, a recording `python` inspection session that
 * replays an outcome sequence, a recording (or the production dry-run) `SetupActions`, a recording
 * filesystem that observes every recursive removal, and an environment snapshot that supplies the
 * host platform. Phases run under a counting clock (see `runPhase`), so each reports the
 * deterministic duration of its legacy test clock. No test in this file reads the live checkout,
 * spawns a process, or observes ambient Node state.
 */

import {resolve} from "node:path";

import {Exit, Layer} from "effect";
import {describe, expect, it, vi} from "vitest";

import {createRepositoryPaths} from "../../../common/repository-paths.ts";
import type {MinimumVersion, RepositoryRequirements} from "../../../common/requirements.ts";
import type {PythonFacts, PythonInterpreterFact} from "../../../inspection/python.ts";
import type {InspectionOutcome} from "../../../inspection/types.ts";
import type {Presenter} from "../../../platform/Output.ts";
import type {ProcessRequest} from "../../../platform/Process.ts";
import {makeTestLayer, type RecordedProcessCall, type TestHarness} from "../../../platform/testing.ts";
import type {SetupActions} from "../actions.ts";
import {
  interruptingActions,
  keyedResponder,
  productionActions,
  recordingActions,
  recordingFileSystem,
  recordingInspection,
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
import {createPythonSetupPhase, pythonInVirtualEnvironment, pythonSetupPhase, selectPythonInstallationProposal} from "./python.ts";

const requiredPython: MinimumVersion = {major: 3, minor: 12, patch: 0};
const paths = createRepositoryPaths(resolve("C:\\fixture\\arolariu.ro"));
const defaultInterpreter: PythonInterpreterFact = {command: "py", prefixArgs: ["-3.12"], version: "3.12.4"};
const venvSpecWin32 = pythonInVirtualEnvironment(paths.expRoot, "win32");
const venvDirectoryWin32 = `${paths.expRoot}\\.venv`;

function succeeded(patch: Readonly<{stdout?: string; stderr?: string}> = {}): ScriptedCommandOutcome {
  return {kind: "succeeded", exitCode: 0, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function exited(exitCode: number, patch: Readonly<{stdout?: string; stderr?: string}> = {}): ScriptedCommandOutcome {
  return {kind: "exited", exitCode, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function commandKey(request: Readonly<ProcessRequest>): string {
  return [request.command, ...request.args].join("\u0000");
}

/** One recorded child invocation. */
type RecordedCall = RecordedProcessCall;

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

interface PythonHarness {
  /** The phase under test. */
  readonly phase: SetupPhaseDefinition;
  /** The setup context handed to the phase. */
  readonly context: SetupContext;
  /** The in-memory platform harness. */
  readonly platform: TestHarness;
  /** Every recorded process call, in order. */
  readonly runner: {readonly calls: readonly RecordedCall[]};
  /** Action identifiers in evaluation order. */
  readonly actionIds: string[];
  /** Complete action records in evaluation order. */
  readonly actionRecords: readonly SetupAction[];
  /** Every directory path recursively removed through the filesystem. */
  readonly removedDirectories: readonly string[];
  /** Inspection session probe. */
  readonly inspect: ReturnType<typeof vi.fn>;
  /** Inspection invalidation probe. */
  readonly invalidate: ReturnType<typeof vi.fn>;
  /** Every service the phase runs with. */
  readonly layer: Layer.Layer<SetupRequirements>;
}

async function createHarness(
  input: Readonly<{
    responses?: Readonly<Record<string, ScriptedCommandOutcome | readonly ScriptedCommandOutcome[]>>;
    dispositions?: Readonly<Record<string, SetupActionDisposition>>;
    options?: SetupInput;
    platform?: NodeJS.Platform;
    pythonOutcomes?: readonly InspectionOutcome<PythonFacts>[];
    /** Replaces the recording consent policy. */
    actions?: (recording: Layer.Layer<SetupActions>) => Layer.Layer<SetupActions, never, Presenter>;
  }> = {},
): Promise<PythonHarness> {
  const options = input.options ?? setupOptions();
  const platform = makeTestLayer({
    processes: [scriptedCommands(keyedResponder(input.responses ?? {}))],
    environment: {
      cwd: paths.root,
      executablePath: "C:\\Program Files\\nodejs\\node.exe",
      platform: input.platform ?? "win32",
      architecture: "x64",
      stdinIsTTY: false,
      stdoutIsTTY: false,
      isCI: true,
    },
    context: "setup::python",
    verbose: options.verbose,
  });

  const outcomes = input.pythonOutcomes ?? [availableOutcome()];
  let callIndex = 0;
  const inspection = recordingInspection({
    python: () => {
      const outcome = outcomes[Math.min(callIndex, outcomes.length - 1)]!;
      callIndex += 1;
      return outcome;
    },
  });

  const mutations: string[] = [];
  const recording = recordingActions(false, input.dispositions);
  const actions = input.actions === undefined ? recording.layer : input.actions(recording.layer);
  const layer = Layer.merge(actions, recordingFileSystem(mutations)).pipe(Layer.provideMerge(platform.layer));

  const context: SetupContext = {
    options,
    paths,
    requirements: requirements(),
    inspection: inspection.session,
  };

  return {
    phase: createPythonSetupPhase(),
    context,
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
    get removedDirectories(): readonly string[] {
      return mutations.filter((mutation) => mutation.startsWith("remove: ")).map((mutation) => mutation.slice("remove: ".length));
    },
    inspect: inspection.inspect,
    invalidate: inspection.invalidate,
    layer,
  };
}

/**
 * Runs the phase against its harness.
 *
 * @param harness - Assembled test harness.
 * @returns The completed phase result.
 */
function runPhase(harness: PythonHarness): Promise<SetupPhaseResult> {
  return runPhaseWith(harness.phase, harness.context, harness.layer);
}

function callFor(harness: PythonHarness, key: string): RecordedCall | undefined {
  return harness.runner.calls.find(({request}) => commandKey(request) === key);
}

describe("python setup public contract", () => {
  it("publishes an independent required phase", () => {
    expect(pythonSetupPhase).toMatchObject({id: "python", required: true, dependsOn: []});
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
      timeout: 1_200_000,
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
    expect(callFor(harness, upgradeKey)?.options).toMatchObject({cwd: paths.expRoot, output: "tee", timeout: 1_200_000});
    expect(callFor(harness, installKey)?.options).toMatchObject({cwd: paths.expRoot, output: "tee", timeout: 1_200_000});
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

  it("propagates a later interruption after an earlier mutation already executed and invalidated", async () => {
    const harness = await createHarness({actions: (recording) => interruptingActions("python.dependencies.install", recording)});

    const exit = await runPhaseExit(harness.phase, harness.context, harness.layer);

    expect(Exit.hasInterrupts(exit)).toBe(true);
    expect(harness.actionIds).toEqual(["python.pip.upgrade"]);
    expect(harness.invalidate).toHaveBeenCalledTimes(1);
  });

  it("propagates an interruption instead of reporting a failed result", async () => {
    const harness = await createHarness({actions: (recording) => interruptingActions("python.pip.upgrade", recording)});

    const exit = await runPhaseExit(harness.phase, harness.context, harness.layer);

    expect(Exit.hasInterrupts(exit)).toBe(true);
    expect(harness.runner.calls).toEqual([]);
  });

  it("invalidates python when an interruption stops an attempted mutation", async () => {
    const upgradeKey = commandKey({
      command: venvSpecWin32.command,
      args: [...venvSpecWin32.args, "-m", "pip", "install", "--upgrade", "pip"],
    });
    const harness = await createHarness({responses: {[upgradeKey]: {kind: "cancelled"}}});

    const exit = await runPhaseExit(harness.phase, harness.context, harness.layer);

    expect(Exit.hasInterrupts(exit)).toBe(true);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("python");
    expect(harness.inspect).toHaveBeenCalledTimes(1);
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

describe("python characterization (pre-Effect migration)", () => {
  const wingetVersionKey = commandKey({command: "winget", args: ["--version"]});
  const installKey = commandKey(
    selectPythonInstallationProposal({platform: "win32", availablePackageManagers: new Set(["winget"]), required: requiredPython})!.command,
  );

  function withRootPlaceholder(value: unknown): unknown {
    const escapedRoot = JSON.stringify(paths.root).slice(1, -1);
    return JSON.parse(JSON.stringify(value).split(escapedRoot).join("<root>"));
  }

  function observe(harness: PythonHarness, result: SetupPhaseResult): unknown {
    return withRootPlaceholder({
      result,
      actionIds: harness.actionIds,
      commands: harness.runner.calls.map(({request}) => request),
    });
  }

  it("pins the exact result when the interpreter, venv, and pip are already present", async () => {
    // Arrange
    const harness = await createHarness();

    // Act
    const observed = observe(harness, await runPhase(harness));

    // Assert
    expect(observed).toEqual({
      result: {
        id: "python",
        status: "succeeded",
        summary: "The Python interpreter, isolated virtual environment, and pinned requirements are ready.",
        evidence: [
          "Selected interpreter 'py -3.12' (Python 3.12.4) satisfies >=3.12.0.",
          "The isolated virtual environment satisfies >=3.12.0.",
          "Executed and verified action: python.pip.upgrade",
          "Executed and verified action: python.dependencies.install",
        ],
        nextActions: [],
        durationMs: 1,
      },
      actionIds: ["python.pip.upgrade", "python.dependencies.install"],
      commands: [
        {command: "<root>\\sites\\exp.arolariu.ro\\.venv\\Scripts\\python.exe", args: ["-m", "pip", "install", "--upgrade", "pip"]},
        {
          command: "<root>\\sites\\exp.arolariu.ro\\.venv\\Scripts\\python.exe",
          args: ["-m", "pip", "install", "-r", "<root>\\sites\\exp.arolariu.ro\\requirements-dev.txt"],
        },
      ],
    });
  });

  it("pins the exact result when the interpreter is missing and the winget installation proposal succeeds", async () => {
    // Arrange
    const harness = await createHarness({
      pythonOutcomes: [availableOutcome({interpreters: [], selected: undefined}), availableOutcome()],
      responses: {[wingetVersionKey]: succeeded({stdout: "v1.11.0\n"}), [installKey]: succeeded()},
    });

    // Act
    const observed = observe(harness, await runPhase(harness));

    // Assert
    expect(observed).toEqual({
      result: {
        id: "python",
        status: "succeeded",
        summary: "The Python interpreter, isolated virtual environment, and pinned requirements are ready.",
        evidence: [
          "No available interpreter satisfies >=3.12.0.",
          "Selected interpreter 'py -3.12' (Python 3.12.4) satisfies >=3.12.0.",
          "Executed and verified action: python.install-interpreter",
          "The isolated virtual environment satisfies >=3.12.0.",
          "Executed and verified action: python.pip.upgrade",
          "Executed and verified action: python.dependencies.install",
        ],
        nextActions: [],
        durationMs: 1,
      },
      actionIds: ["python.install-interpreter", "python.pip.upgrade", "python.dependencies.install"],
      commands: [
        {command: "winget", args: ["--version"]},
        {
          command: "winget",
          args: ["install", "--id", "Python.Python.3.12", "--exact", "--accept-package-agreements", "--accept-source-agreements"],
        },
        {command: "<root>\\sites\\exp.arolariu.ro\\.venv\\Scripts\\python.exe", args: ["-m", "pip", "install", "--upgrade", "pip"]},
        {
          command: "<root>\\sites\\exp.arolariu.ro\\.venv\\Scripts\\python.exe",
          args: ["-m", "pip", "install", "-r", "<root>\\sites\\exp.arolariu.ro\\requirements-dev.txt"],
        },
      ],
    });
  });

  it("pins the exact result when the winget installation proposal fails", async () => {
    // Arrange
    const harness = await createHarness({
      pythonOutcomes: [availableOutcome({interpreters: [], selected: undefined})],
      responses: {[wingetVersionKey]: succeeded({stdout: "v1.11.0\n"}), [installKey]: exited(1, {stderr: "winget installer failed"})},
    });

    // Act
    const observed = observe(harness, await runPhase(harness));

    // Assert
    expect(observed).toEqual({
      result: {
        id: "python",
        status: "failed",
        summary: "The required Python preparation phase failed.",
        evidence: [
          "No available interpreter satisfies >=3.12.0.",
          "The supported Python interpreter installation command failed.\nCommand exited with code 1.\nwinget installer failed",
        ],
        nextActions: ["Resolve the reported Python preparation failure, then rerun setup."],
        durationMs: 1,
      },
      actionIds: ["python.install-interpreter"],
      commands: [
        {command: "winget", args: ["--version"]},
        {
          command: "winget",
          args: ["install", "--id", "Python.Python.3.12", "--exact", "--accept-package-agreements", "--accept-source-agreements"],
        },
      ],
    });
  });

  it("pins a mutation-free dry run when the interpreter is missing", async () => {
    // Arrange
    const options = setupOptions({dryRun: true});
    const dryRun = productionActions(options);
    const harness = await createHarness({
      options,
      actions: () => dryRun.layer,
      pythonOutcomes: [availableOutcome({interpreters: [], selected: undefined, virtualEnvironment: {exists: false, compatible: false}})],
      responses: {[wingetVersionKey]: succeeded({stdout: "v1.11.0\n"})},
    });

    // Act
    const result = await runPhase(harness);
    const observed = withRootPlaceholder({
      result,
      actionLines: setupActionLines(harness.platform.output()),
      executed: dryRun.executed,
      commands: harness.runner.calls.map(({request}) => request),
      removedDirectories: harness.removedDirectories,
      invalidations: harness.invalidate.mock.calls,
    });

    // Assert
    expect(observed).toEqual({
      result: {
        id: "python",
        status: "skipped",
        summary: "Required Python interpreter installation and dependent virtual-environment preparation are planned by dry-run.",
        evidence: ["No available interpreter satisfies >=3.12.0.", "Planned action: python.install-interpreter"],
        nextActions: [],
        durationMs: 1,
      },
      actionLines: [
        "stdout: [arolariu::setup] ℹ️ Planned setup action 'python.install-interpreter' (system): Install the required Python 3.12 interpreter with Windows Package Manager.",
      ],
      executed: [],
      commands: [{command: "winget", args: ["--version"]}],
      removedDirectories: [],
      invalidations: [],
    });
  });

  it("pins a mutation-free dry run when an existing incompatible virtual environment would be removed and recreated", async () => {
    // Arrange
    const options = setupOptions({dryRun: true});
    const dryRun = productionActions(options);
    const harness = await createHarness({
      options,
      actions: () => dryRun.layer,
      pythonOutcomes: [availableOutcome({virtualEnvironment: {exists: true, compatible: false}})],
    });

    // Act
    const result = await runPhase(harness);
    const observed = withRootPlaceholder({
      result,
      actionLines: setupActionLines(harness.platform.output()),
      executed: dryRun.executed,
      commands: harness.runner.calls.map(({request}) => request),
      removedDirectories: harness.removedDirectories,
      invalidations: harness.invalidate.mock.calls,
    });

    // Assert
    expect(observed).toEqual({
      result: {
        id: "python",
        status: "skipped",
        summary: "Required Python preparation actions are planned by dry-run.",
        evidence: [
          "Selected interpreter 'py -3.12' (Python 3.12.4) satisfies >=3.12.0.",
          "The isolated virtual environment is not a canonical, isolated Python installation.",
          "Planned action: python.venv.create",
          "Planned action: python.pip.upgrade",
          "Planned action: python.dependencies.install",
        ],
        nextActions: [],
        durationMs: 1,
      },
      actionLines: [
        "stdout: [arolariu::setup] ℹ️ Planned setup action 'python.venv.create' (repository): Create the isolated exp.arolariu.ro Python virtual environment.",
        "stdout: [arolariu::setup] ℹ️ Planned setup action 'python.pip.upgrade' (repository): Upgrade pip inside the isolated virtual environment.",
        "stdout: [arolariu::setup] ℹ️ Planned setup action 'python.dependencies.install' (repository): Install pinned development requirements inside the isolated virtual environment.",
      ],
      executed: [],
      commands: [],
      removedDirectories: [],
      invalidations: [],
    });
  });
});
