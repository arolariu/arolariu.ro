// @vitest-environment node
/**
 * @fileoverview Contract tests for the independent Python setup phase.
 * @module scripts.setup.python.test
 */

import {resolve} from "node:path";
import {describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {CommandResult, CommandRunner, CommandSpec} from "./common/process.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import type {MinimumVersion, RepositoryRequirements} from "./common/requirements.ts";
import type {PythonFacts, PythonInterpreterFact} from "./inspection/python.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";
import {createPythonSetupPhase, pythonInVirtualEnvironment, pythonSetupPhase, selectPythonInstallationProposal} from "./setup.python.ts";
import type {SetupAction, SetupActionDisposition, SetupActionExecutor, SetupContext, SetupOptions} from "./setup.types.ts";

const requiredPython: MinimumVersion = {major: 3, minor: 12, patch: 0};
const paths = createRepositoryPaths(resolve("C:\\fixture\\arolariu.ro"));
const defaultInterpreter: PythonInterpreterFact = {command: "py", prefixArgs: ["-3.12"], version: "3.12.4"};
const venvSpecWin32 = pythonInVirtualEnvironment(paths.expRoot, "win32");
const venvDirectoryWin32 = `${paths.expRoot}\\.venv`;

function commandResult(patch: Partial<CommandResult> = {}): CommandResult {
  return {
    code: 0,
    stdout: "",
    stderr: "",
    durationMs: 1,
    timedOut: false,
    ...patch,
  };
}

function commandKey(command: Readonly<CommandSpec>): string {
  return [command.command, ...command.args].join("\u0000");
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

function setupOptions(patch: Partial<SetupOptions> = {}): SetupOptions {
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
  return {session: {inspect, invalidate} as unknown as RepositoryInspectionSession, inspect, invalidate};
}

function defaultResponse(): CommandResult {
  return commandResult();
}

function createRunner(responses: Readonly<Record<string, CommandResult | readonly CommandResult[]>> = {}): Readonly<{
  runner: CommandRunner;
  run: ReturnType<typeof vi.fn<CommandRunner["run"]>>;
}> {
  const offsets = new Map<string, number>();
  const run = vi.fn<CommandRunner["run"]>(async (command) => {
    const key = commandKey(command);
    const configured = responses[key];
    if (Array.isArray(configured)) {
      const offset = offsets.get(key) ?? 0;
      offsets.set(key, offset + 1);
      return configured[offset] ?? configured.at(-1) ?? defaultResponse();
    }
    return configured ?? defaultResponse();
  });
  return {runner: {run}, run};
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

function createHarness(
  input: Readonly<{
    responses?: Readonly<Record<string, CommandResult | readonly CommandResult[]>>;
    dispositions?: Readonly<Record<string, SetupActionDisposition>>;
    options?: SetupOptions;
    platform?: NodeJS.Platform;
    removeDirectory?: (path: string) => Promise<void>;
    pythonOutcomes?: readonly InspectionOutcome<PythonFacts>[];
    actionsOverride?: SetupActionExecutor;
  }> = {},
): Readonly<{
  phase: ReturnType<typeof createPythonSetupPhase>;
  context: SetupContext;
  run: ReturnType<typeof vi.fn<CommandRunner["run"]>>;
  actionIds: string[];
  actionRecords: SetupAction[];
  removedDirectories: string[];
  inspect: ReturnType<typeof vi.fn>;
  invalidate: ReturnType<typeof vi.fn>;
}> {
  const {runner, run} = createRunner(input.responses);
  const {actions: builtActions, actionIds, actionRecords} = createActions(input.dispositions);
  const actions = input.actionsOverride ?? builtActions;
  const {session, inspect, invalidate} = createPythonInspectionHarness(input.pythonOutcomes);
  const removedDirectories: string[] = [];
  let now = 0;
  const context: SetupContext = {
    options: input.options ?? setupOptions(),
    paths,
    requirements: requirements(),
    inspection: session,
    runner,
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
    logger: new MonorepositoryConsoleLogger("setup::python", {color: false, sink: new InMemoryLoggerSink()}),
    now: () => now++,
  };
  const phase = createPythonSetupPhase({
    platform: input.platform ?? "win32",
    removeDirectory:
      input.removeDirectory
      ?? (async (path) => {
        removedDirectories.push(path);
      }),
  });
  return {phase, context, run, actionIds, actionRecords, removedDirectories, inspect, invalidate};
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
    const harness = createHarness();

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).not.toContain("python.install-interpreter");
    expect(harness.inspect).toHaveBeenCalledWith("python");
  });

  it("fails explicitly with bounded evidence when python is unavailable and unrecoverable", async () => {
    const harness = createHarness({pythonOutcomes: [unavailableOutcome("The Python inspection platform is unsupported.")]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("The Python inspection platform is unsupported.");
    expect(result.nextActions.join("\n")).toContain("https://www.python.org/downloads/");
    expect(harness.actionIds).toEqual([]);
    expect(harness.run).not.toHaveBeenCalled();
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("fails explicitly with bounded evidence when the initial python fact is invalid", async () => {
    const harness = createHarness({pythonOutcomes: [invalidOutcome(["The Python virtual environment returned malformed metadata."])]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("The Python virtual environment returned malformed metadata.");
    expect(harness.run).not.toHaveBeenCalled();
    expect(harness.actionIds).toEqual([]);
  });

  it("fails with official guidance when no supported installer is discoverable, without probing anything", async () => {
    const harness = createHarness({
      platform: "freebsd",
      pythonOutcomes: [availableOutcome({interpreters: [], selected: undefined})],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toContain("https://www.python.org/downloads/");
    expect(harness.run).not.toHaveBeenCalled();
  });

  it("does not treat a successful install command as proof of readiness when refreshed facts still lack a selected interpreter", async () => {
    const wingetKey = commandKey({command: "winget", args: ["--version"]});
    const installKey = commandKey(
      selectPythonInstallationProposal({platform: "win32", availablePackageManagers: new Set(["winget"]), required: requiredPython})!
        .command,
    );
    const harness = createHarness({
      pythonOutcomes: [
        availableOutcome({interpreters: [], selected: undefined}),
        availableOutcome({interpreters: [], selected: undefined}),
      ],
      responses: {[wingetKey]: commandResult({stdout: "v1.11.0\n"}), [installKey]: commandResult()},
    });

    const result = await harness.phase.run(harness.context);

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
    const harness = createHarness({
      pythonOutcomes: [availableOutcome({interpreters: [], selected: undefined}), availableOutcome()],
      responses: {[wingetKey]: commandResult({stdout: "v1.11.0\n"}), [installKey]: commandResult()},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds[0]).toBe("python.install-interpreter");
    expect(harness.invalidate).toHaveBeenCalledWith("python");
    expect(result.evidence.join("\n")).toContain("Executed and verified action: python.install-interpreter");
  });

  it("fails with manual guidance when installation is declined, without invalidating facts", async () => {
    const wingetKey = commandKey({command: "winget", args: ["--version"]});
    const harness = createHarness({
      pythonOutcomes: [availableOutcome({interpreters: [], selected: undefined})],
      responses: {[wingetKey]: commandResult({stdout: "v1.11.0\n"})},
      dispositions: {"python.install-interpreter": "declined"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Declined action: python.install-interpreter");
    expect(result.nextActions.join("\n")).toContain("https://www.python.org/downloads/");
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("stops dependent preparation and returns skipped when installation is planned by dry-run", async () => {
    const wingetKey = commandKey({command: "winget", args: ["--version"]});
    const harness = createHarness({
      options: setupOptions({dryRun: true}),
      pythonOutcomes: [availableOutcome({interpreters: [], selected: undefined})],
      responses: {[wingetKey]: commandResult({stdout: "v1.11.0\n"})},
      dispositions: {"python.install-interpreter": "planned"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toContain("Planned action: python.install-interpreter");
    expect(harness.actionIds).toEqual(["python.install-interpreter"]);
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.inspect).toHaveBeenCalledTimes(1);
  });

  it("discovers Homebrew and executes the exact macOS installation proposal", async () => {
    const brewVersionKey = commandKey({command: "brew", args: ["--version"]});
    const brewInstallKey = commandKey({command: "brew", args: ["install", "python@3.12"]});
    const harness = createHarness({
      platform: "darwin",
      pythonOutcomes: [availableOutcome({interpreters: [], selected: undefined}), availableOutcome()],
      responses: {[brewVersionKey]: commandResult({stdout: "Homebrew 4.6.0\n"}), [brewInstallKey]: commandResult()},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.find(({id}) => id === "python.install-interpreter")?.scope).toBe("system");
    expect(harness.run.mock.calls.find(([command]) => commandKey(command) === brewInstallKey)?.[1]).toMatchObject({
      cwd: paths.root,
      output: "inherit",
    });
  });
});

describe("python virtual environment readiness", () => {
  it("accepts a compatible canonical venv without a create action, but still runs pip steps", async () => {
    const harness = createHarness();

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
  });

  it("creates an absent venv without removing anything, verifies compatibility, and continues to pip steps", async () => {
    const createKey = commandKey({command: "py", args: ["-3.12", "-m", "venv", venvDirectoryWin32]});
    const harness = createHarness({
      pythonOutcomes: [availableOutcome({virtualEnvironment: {exists: false, compatible: false}}), availableOutcome()],
      responses: {[createKey]: commandResult()},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).toEqual(["python.venv.create", "python.pip.upgrade", "python.dependencies.install"]);
    expect(harness.run.mock.calls.map(([command]) => commandKey(command))).toContain(createKey);
    expect(harness.removedDirectories).toEqual([]);
  });

  it("removes an existing incompatible venv before recreating it", async () => {
    const createKey = commandKey({command: "py", args: ["-3.12", "-m", "venv", venvDirectoryWin32]});
    const harness = createHarness({
      pythonOutcomes: [availableOutcome({virtualEnvironment: {exists: true, compatible: false, version: "3.10.0"}}), availableOutcome()],
      responses: {[createKey]: commandResult()},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds[0]).toBe("python.venv.create");
    expect(harness.removedDirectories).toEqual([venvDirectoryWin32]);
  });

  it("does not treat a successful venv creation command as proof of readiness when refreshed facts remain incompatible", async () => {
    const createKey = commandKey({command: "py", args: ["-3.12", "-m", "venv", venvDirectoryWin32]});
    const incompatible = availableOutcome({virtualEnvironment: {exists: false, compatible: false}});
    const harness = createHarness({pythonOutcomes: [incompatible, incompatible], responses: {[createKey]: commandResult()}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.summary).toMatch(/remains incompatible/i);
    expect(harness.actionIds).toEqual(["python.venv.create"]);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("python");
    expect(harness.inspect).toHaveBeenCalledTimes(2);
  });

  it("declines venv creation and fails as required, without invalidating facts", async () => {
    const harness = createHarness({
      pythonOutcomes: [availableOutcome({virtualEnvironment: {exists: false, compatible: false}})],
      dispositions: {"python.venv.create": "declined"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Declined action: python.venv.create");
    expect(harness.actionIds).toEqual(["python.venv.create"]);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("plans venv creation in dry-run and continues to plan dependent pip actions without probing them", async () => {
    const harness = createHarness({
      options: setupOptions({dryRun: true}),
      pythonOutcomes: [availableOutcome({virtualEnvironment: {exists: false, compatible: false}})],
      dispositions: {
        "python.venv.create": "planned",
        "python.pip.upgrade": "planned",
        "python.dependencies.install": "planned",
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toEqual(["python.venv.create", "python.pip.upgrade", "python.dependencies.install"]);
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.inspect).toHaveBeenCalledTimes(1);
  });

  it("fails without removing anything or running any pip action when creating an absent venv itself fails", async () => {
    const createKey = commandKey({command: "py", args: ["-3.12", "-m", "venv", venvDirectoryWin32]});
    const harness = createHarness({
      pythonOutcomes: [availableOutcome({virtualEnvironment: {exists: false, compatible: false}})],
      responses: {[createKey]: commandResult({code: 1, stderr: "boom\n"})},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual(["python.venv.create"]);
    expect(result.evidence.join("\n")).toContain("Python virtual environment creation failed.");
    expect(result.evidence.join("\n")).toContain("stderr: boom");
    expect(harness.removedDirectories).toEqual([]);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("python");
  });

  it("still removes an existing incompatible venv before an unsuccessful recreation attempt", async () => {
    const createKey = commandKey({command: "py", args: ["-3.12", "-m", "venv", venvDirectoryWin32]});
    const harness = createHarness({
      pythonOutcomes: [availableOutcome({virtualEnvironment: {exists: true, compatible: false, version: "3.10.0"}})],
      responses: {[createKey]: commandResult({code: 1, stderr: "boom\n"})},
    });

    const result = await harness.phase.run(harness.context);

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
    const harness = createHarness();

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    const upgradeCall = harness.run.mock.calls.find(([command]) => commandKey(command) === upgradeKey);
    const installCall = harness.run.mock.calls.find(([command]) => commandKey(command) === installKey);
    expect(upgradeCall?.[1]).toMatchObject({cwd: paths.expRoot, output: "tee"});
    expect(installCall?.[1]).toMatchObject({cwd: paths.expRoot, output: "tee"});
  });

  it("fails without installing requirements when the pip upgrade command fails", async () => {
    const harness = createHarness({responses: {[upgradeKey]: commandResult({code: 1, stderr: "boom\n"})}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual(["python.pip.upgrade"]);
    expect(result.evidence.join("\n")).toContain("Upgrading pip inside the isolated virtual environment failed.");
  });

  it("fails the pip-upgrade postcondition when refreshed facts report pip unavailable", async () => {
    const harness = createHarness({
      pythonOutcomes: [availableOutcome(), availableOutcome({pip: {available: false, conflicts: []}})],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.summary).toMatch(/did not satisfy its postcondition/i);
    expect(result.evidence.join("\n")).toContain("pip is not available inside the isolated virtual environment after upgrading pip.");
    expect(harness.actionIds).toEqual(["python.pip.upgrade"]);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("python");
    expect(harness.inspect).toHaveBeenCalledTimes(2);
  });

  it("declines the pip upgrade without invalidating facts or reaching dependency installation", async () => {
    const harness = createHarness({dispositions: {"python.pip.upgrade": "declined"}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Declined action: python.pip.upgrade");
    expect(harness.actionIds).toEqual(["python.pip.upgrade"]);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("fails without a satisfied postcondition when requirement installation fails", async () => {
    const harness = createHarness({responses: {[installKey]: commandResult({code: 1, stderr: "boom\n"})}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
    expect(result.evidence.join("\n")).toContain("Installing Python requirements inside the isolated virtual environment failed.");
  });

  it("fails the dependency-install postcondition when refreshed facts report pip conflicts", async () => {
    const conflict = "pip reported a dependency conflict for 'broken-package'.";
    const harness = createHarness({
      pythonOutcomes: [availableOutcome(), availableOutcome(), availableOutcome({pip: {available: true, conflicts: [conflict]}})],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain(conflict);
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
  });

  it("fails the dependency-install postcondition when refreshed facts report exact requirement mismatches", async () => {
    const mismatch = "pytest requires 9.1.1 but 8.3.2 is installed.";
    const harness = createHarness({
      pythonOutcomes: [
        availableOutcome(),
        availableOutcome(),
        availableOutcome({requirements: {declared: [], unverifiable: [], mismatches: [mismatch]}}),
      ],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain(mismatch);
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
  });

  it("does not require mismatches or conflicts to be clear before dependency installation may repair them", async () => {
    const harness = createHarness({
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

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
  });

  it("declines dependency installation after pip upgrade already executed, invalidating exactly once", async () => {
    const harness = createHarness({dispositions: {"python.dependencies.install": "declined"}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
    expect(result.evidence.join("\n")).toContain("Declined action: python.dependencies.install");
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("python");
  });

  it("is idempotent across repeated runs of an already-ready environment", async () => {
    const first = createHarness();
    const firstResult = await first.phase.run(first.context);
    expect(firstResult.status).toBe("succeeded");
    expect(first.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);

    const second = createHarness();
    const secondResult = await second.phase.run(second.context);
    expect(secondResult.status).toBe("succeeded");
    expect(second.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
  });
});

describe("python cache freshness around mutations", () => {
  it("invalidates and re-inspects python after each executed mutation, including venv creation", async () => {
    const createKey = commandKey({command: "py", args: ["-3.12", "-m", "venv", venvDirectoryWin32]});
    const harness = createHarness({
      pythonOutcomes: [availableOutcome({virtualEnvironment: {exists: false, compatible: false}}), availableOutcome(), availableOutcome()],
      responses: {[createKey]: commandResult()},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.invalidate).toHaveBeenCalledTimes(3);
    expect(harness.invalidate.mock.calls).toEqual([["python"], ["python"], ["python"]]);
    expect(harness.inspect).toHaveBeenCalledTimes(4);
  });

  it("propagates a later AbortError after an earlier mutation already executed and invalidated", async () => {
    const interruption = new DOMException("interrupted", "AbortError");
    const harness = createHarness();
    const actions: SetupActionExecutor = {
      run: async (action) => {
        if (action.id === "python.dependencies.install") {
          throw interruption;
        }
        return harness.context.actions.run(action);
      },
    };

    await expect(harness.phase.run({...harness.context, actions})).rejects.toBe(interruption);
    expect(harness.actionIds).toEqual(["python.pip.upgrade"]);
    expect(harness.invalidate).toHaveBeenCalledTimes(1);
  });

  it("rethrows interruption instead of reporting a failed result", async () => {
    const abortError = Object.assign(new Error("aborted"), {name: "AbortError"});
    const harness = createHarness({actionsOverride: {run: async () => Promise.reject(abortError)}});

    await expect(harness.phase.run(harness.context)).rejects.toBe(abortError);
  });
});

describe("dry-run and safety contracts", () => {
  it("accumulates safely knowable planned actions without running mutations or postconditions", async () => {
    const harness = createHarness({
      options: setupOptions({dryRun: true}),
      dispositions: {"python.pip.upgrade": "planned", "python.dependencies.install": "planned"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.inspect).toHaveBeenCalledTimes(1);
  });

  it("never issues a bare pip, remote-installer, build, test, or service command", async () => {
    const createKey = commandKey({command: "py", args: ["-3.12", "-m", "venv", venvDirectoryWin32]});
    const harness = createHarness({
      pythonOutcomes: [availableOutcome({virtualEnvironment: {exists: false, compatible: false}}), availableOutcome(), availableOutcome()],
      responses: {[createKey]: commandResult()},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    for (const [command] of harness.run.mock.calls) {
      expect(command.command).not.toBe("pip");
      if (command.args.includes("pip")) {
        expect(command.args[0]).toBe("-m");
        expect(command.args[1]).toBe("pip");
      }
      const joined = [command.command, ...command.args].join(" ");
      expect(joined).not.toMatch(/curl|wget|Invoke-WebRequest|uvicorn|pytest|npm ci|--fix/iu);
    }
  });
});
