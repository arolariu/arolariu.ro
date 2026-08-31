// @vitest-environment node
/**
 * @fileoverview Contract tests for the independent Python setup phase.
 * @module scripts.setup.python.test
 */

import {mkdir, mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {CommandResult, CommandRunner, CommandSpec} from "./common/process.ts";
import {createRepositoryPaths, type RepositoryPaths} from "./common/repository-paths.ts";
import type {MinimumVersion, RepositoryRequirements} from "./common/requirements.ts";
import {sha256File, type ToolingConfigV1} from "./common/tooling-config.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import {
  createPythonSetupPhase,
  pythonInVirtualEnvironment,
  pythonSetupPhase,
  selectPythonInstallationProposal,
  selectPythonInterpreter,
} from "./setup.python.ts";
import type {SetupAction, SetupActionDisposition, SetupActionExecutor, SetupContext, SetupOptions} from "./setup.types.ts";

/** A typed fake {@link RepositoryInspectionSession} that never resolves a real repository fact. */
function createFakeInspectionSession(): RepositoryInspectionSession {
  return {
    inspect: async () => ({kind: "unavailable", reason: "Not exercised by this test.", durationMs: 0}),
    invalidate: () => {},
  };
}

const filesystemFailures = vi.hoisted((): {readFile?: Readonly<{path: string; code: "EACCES"}>} => ({}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: (...args: unknown[]) => {
      const failure = filesystemFailures.readFile;
      if (failure !== undefined && String(args[0]) === failure.path) {
        return Promise.reject(Object.assign(new Error(`${failure.code}: simulated read failure`), {code: failure.code}));
      }
      return Reflect.apply(actual.readFile, actual, args);
    },
  };
});

const temporaryRoots: string[] = [];
const requiredPython: MinimumVersion = {major: 3, minor: 12, patch: 0};

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

async function writeFixture(path: string, contents: string): Promise<void> {
  await mkdir(join(path, ".."), {recursive: true});
  await writeFile(path, contents, "utf8");
}

async function createFixture(): Promise<RepositoryPaths> {
  const root = await mkdtemp(join(tmpdir(), "arolariu-setup-python-test-"));
  temporaryRoots.push(root);
  const paths = createRepositoryPaths(root);
  await mkdir(paths.expRoot, {recursive: true});
  await writeFixture(paths.pythonRequirements, "-r requirements.txt\npytest==9.1.1\n");
  return paths;
}

async function writeToolingConfigFixture(paths: RepositoryPaths, config: Readonly<ToolingConfigV1>): Promise<void> {
  await writeFixture(paths.toolingConfig, `${JSON.stringify(config, null, 2)}\n`);
}

function venvPython(paths: RepositoryPaths, platform: NodeJS.Platform): CommandSpec {
  return pythonInVirtualEnvironment(paths.expRoot, platform);
}

function defaultResponse(command: Readonly<CommandSpec>): CommandResult {
  if (command.args[0] === "--version" || command.args[command.args.length - 1] === "--version") {
    return commandResult({stdout: "Python 3.12.4\n"});
  }
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
      return configured[offset] ?? configured.at(-1) ?? defaultResponse(command);
    }
    return (configured as CommandResult | undefined) ?? defaultResponse(command);
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
    paths: RepositoryPaths;
    responses?: Readonly<Record<string, CommandResult | readonly CommandResult[]>>;
    dispositions?: Readonly<Record<string, SetupActionDisposition>>;
    options?: SetupOptions;
    platform?: NodeJS.Platform;
    venvExists?: boolean;
    removeDirectory?: (path: string) => Promise<void>;
    actionsOverride?: SetupActionExecutor;
  }>,
): Readonly<{
  phase: ReturnType<typeof createPythonSetupPhase>;
  context: SetupContext;
  run: ReturnType<typeof vi.fn<CommandRunner["run"]>>;
  actionIds: string[];
  actionRecords: SetupAction[];
  removedDirectories: string[];
}> {
  const {runner, run} = createRunner(input.responses);
  const {actions: builtActions, actionIds, actionRecords} = createActions(input.dispositions);
  const actions = input.actionsOverride ?? builtActions;
  const removedDirectories: string[] = [];
  let now = 0;
  const context: SetupContext = {
    options: input.options ?? setupOptions(),
    paths: input.paths,
    requirements: requirements(),
    inspection: createFakeInspectionSession(),
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
    virtualEnvironmentExists: async () => input.venvExists ?? true,
    removeDirectory:
      input.removeDirectory
      ?? (async (path) => {
        removedDirectories.push(path);
      }),
  });
  return {phase, context, run, actionIds, actionRecords, removedDirectories};
}

beforeEach(() => {
  delete filesystemFailures.readFile;
});

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

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

describe("selectPythonInterpreter", () => {
  it("selects the first compatible candidate in order, parsing stdout", () => {
    const selected = selectPythonInterpreter(
      [
        {command: "py", prefixArgs: ["-3.12"], result: commandResult({code: 1, stdout: "Python 3.9.0\n"})},
        {command: "python3.12", prefixArgs: [], result: commandResult({stdout: "Python 3.12.4\n"})},
        {command: "python", prefixArgs: [], result: commandResult({stdout: "Python 3.13.0\n"})},
      ],
      requiredPython,
    );
    expect(selected).toEqual({command: "python3.12", prefixArgs: [], version: {major: 3, minor: 12, patch: 4}});
  });

  it("parses the version from stderr when stdout is unusable", () => {
    const selected = selectPythonInterpreter(
      [{command: "python", prefixArgs: [], result: commandResult({stdout: "", stderr: "Python 3.12.1\n"})}],
      requiredPython,
    );
    expect(selected).toEqual({command: "python", prefixArgs: [], version: {major: 3, minor: 12, patch: 1}});
  });

  it("accepts a prerelease suffix after the numeric patch", () => {
    const selected = selectPythonInterpreter(
      [{command: "python3.12", prefixArgs: [], result: commandResult({stdout: "Python 3.13.0rc1\n"})}],
      requiredPython,
    );
    expect(selected).toEqual({command: "python3.12", prefixArgs: [], version: {major: 3, minor: 13, patch: 0}});
  });

  it.each([
    ["a version below the requirement", commandResult({stdout: "Python 3.11.9\n"})],
    ["malformed output", commandResult({stdout: "not a version\n"})],
    ["non-leading arbitrary text", commandResult({stdout: "Preparing... Python 3.12.4\n"})],
    ["a nonzero exit code", commandResult({code: 1, stdout: "Python 3.12.4\n"})],
    ["a timeout", commandResult({stdout: "Python 3.12.4\n", timedOut: true})],
    ["a termination signal", commandResult({stdout: "Python 3.12.4\n", signal: "SIGTERM"})],
    ["an unspawnable executable", commandResult({code: 1, spawnError: "spawn python ENOENT"})],
  ])("ignores a candidate with %s", (_name, result) => {
    expect(selectPythonInterpreter([{command: "python", prefixArgs: [], result}], requiredPython)).toBeNull();
  });

  it("returns null when no candidate is compatible", () => {
    expect(
      selectPythonInterpreter(
        [
          {command: "py", prefixArgs: ["-3.12"], result: commandResult({code: 1, spawnError: "ENOENT"})},
          {command: "python3.12", prefixArgs: [], result: commandResult({code: 1, spawnError: "ENOENT"})},
          {command: "python", prefixArgs: [], result: commandResult({stdout: "Python 3.9.0\n"})},
        ],
        requiredPython,
      ),
    ).toBeNull();
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

describe("python interpreter readiness", () => {
  it("probes the Windows candidate order and selects the first compatible interpreter", async () => {
    const paths = await createFixture();
    const pyKey = commandKey({command: "py", args: ["-3.12", "--version"]});
    const python312Key = commandKey({command: "python3.12", args: ["--version"]});
    const venv = venvPython(paths, "win32");
    const harness = createHarness({
      paths,
      platform: "win32",
      responses: {
        [pyKey]: commandResult({code: 1, spawnError: "ENOENT"}),
        [python312Key]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["-m", "pip", "check"]})]: commandResult(),
      },
    });
    await writeToolingConfigFixture(paths, {
      schemaVersion: 1,
      fingerprints: {pythonRequirementsSha256: await sha256File(paths.pythonRequirements)},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.run.mock.calls.map(([command]) => commandKey(command))).toContain(pyKey);
    expect(harness.run.mock.calls.map(([command]) => commandKey(command))).toContain(python312Key);
    expect(harness.actionIds).not.toContain("python.install-interpreter");
  });

  it("probes the macOS/Linux candidate order", async () => {
    const paths = await createFixture();
    const python312Key = commandKey({command: "python3.12", args: ["--version"]});
    const python3Key = commandKey({command: "python3", args: ["--version"]});
    const venv = venvPython(paths, "linux");
    const harness = createHarness({
      paths,
      platform: "linux",
      responses: {
        [python312Key]: commandResult({code: 1, spawnError: "ENOENT"}),
        [python3Key]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["-m", "pip", "check"]})]: commandResult(),
      },
    });
    await writeToolingConfigFixture(paths, {
      schemaVersion: 1,
      fingerprints: {pythonRequirementsSha256: await sha256File(paths.pythonRequirements)},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    const calledKeys = harness.run.mock.calls.map(([command]) => commandKey(command));
    expect(calledKeys).toContain(python312Key);
    expect(calledKeys).toContain(python3Key);
  });

  it("installs a missing interpreter through the qualified Windows proposal and re-probes", async () => {
    const paths = await createFixture();
    const unavailable = commandResult({code: 1, spawnError: "ENOENT"});
    const wingetVersionKey = commandKey({command: "winget", args: ["--version"]});
    const installKey = commandKey({
      command: "winget",
      args: ["install", "--id", "Python.Python.3.12", "--exact", "--accept-package-agreements", "--accept-source-agreements"],
    });
    const venv = venvPython(paths, "win32");
    const harness = createHarness({
      paths,
      platform: "win32",
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: [unavailable, commandResult({stdout: "Python 3.12.4\n"})],
        [commandKey({command: "python3.12", args: ["--version"]})]: unavailable,
        [commandKey({command: "python", args: ["--version"]})]: unavailable,
        [wingetVersionKey]: commandResult({stdout: "v1.11.0\n"}),
        [installKey]: commandResult(),
        [commandKey({command: venv.command, args: ["--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["-m", "pip", "check"]})]: commandResult(),
      },
    });
    await writeToolingConfigFixture(paths, {
      schemaVersion: 1,
      fingerprints: {pythonRequirementsSha256: await sha256File(paths.pythonRequirements)},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).toContain("python.install-interpreter");
    expect(harness.run.mock.calls.map(([command]) => commandKey(command))).toContain(installKey);
  });

  it("fails with manual guidance when installation is declined", async () => {
    const paths = await createFixture();
    const unavailable = commandResult({code: 1, spawnError: "ENOENT"});
    const harness = createHarness({
      paths,
      platform: "win32",
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: unavailable,
        [commandKey({command: "python3.12", args: ["--version"]})]: unavailable,
        [commandKey({command: "python", args: ["--version"]})]: unavailable,
        [commandKey({command: "winget", args: ["--version"]})]: commandResult({stdout: "v1.11.0\n"}),
      },
      dispositions: {"python.install-interpreter": "declined"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Declined action: python.install-interpreter");
    expect(result.nextActions.join("\n")).toContain("https://www.python.org/downloads/");
  });

  it("fails when the interpreter remains incompatible after an executed installation", async () => {
    const paths = await createFixture();
    const unavailable = commandResult({code: 1, spawnError: "ENOENT"});
    const installKey = commandKey({
      command: "winget",
      args: ["install", "--id", "Python.Python.3.12", "--exact", "--accept-package-agreements", "--accept-source-agreements"],
    });
    const harness = createHarness({
      paths,
      platform: "win32",
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: unavailable,
        [commandKey({command: "python3.12", args: ["--version"]})]: unavailable,
        [commandKey({command: "python", args: ["--version"]})]: unavailable,
        [commandKey({command: "winget", args: ["--version"]})]: commandResult({stdout: "v1.11.0\n"}),
        [installKey]: commandResult(),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toContain("https://www.python.org/downloads/");
  });

  it("stops dependent venv probes and returns skipped when installation is planned by dry-run", async () => {
    const paths = await createFixture();
    const unavailable = commandResult({code: 1, spawnError: "ENOENT"});
    const venv = venvPython(paths, "win32");
    const harness = createHarness({
      paths,
      platform: "win32",
      options: setupOptions({dryRun: true}),
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: unavailable,
        [commandKey({command: "python3.12", args: ["--version"]})]: unavailable,
        [commandKey({command: "python", args: ["--version"]})]: unavailable,
        [commandKey({command: "winget", args: ["--version"]})]: commandResult({stdout: "v1.11.0\n"}),
      },
      dispositions: {"python.install-interpreter": "planned"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toContain("Planned action: python.install-interpreter");
    const calledKeys = harness.run.mock.calls.map(([command]) => commandKey(command));
    expect(calledKeys).not.toContain(commandKey({command: venv.command, args: ["--version"]}));
  });

  it("fails with official guidance and never invents a remote installer when no package manager qualifies", async () => {
    const paths = await createFixture();
    const unavailable = commandResult({code: 1, spawnError: "ENOENT"});
    const harness = createHarness({
      paths,
      platform: "freebsd",
      responses: {
        [commandKey({command: "python3.12", args: ["--version"]})]: unavailable,
        [commandKey({command: "python3", args: ["--version"]})]: unavailable,
        [commandKey({command: "python", args: ["--version"]})]: unavailable,
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toContain("https://www.python.org/downloads/");
    const allText = harness.run.mock.calls.flatMap(([command]) => [command.command, ...command.args]).join(" ");
    expect(allText).not.toMatch(/curl|wget|Invoke-WebRequest|dotnet-install|python-install/iu);
  });
});

describe("python virtual environment preparation", () => {
  it("creates the venv, installs pinned requirements, and records the fingerprint when .venv is missing", async () => {
    const paths = await createFixture();
    const venv = venvPython(paths, "win32");
    const venvVersionKey = commandKey({command: venv.command, args: ["--version"]});
    const createKey = commandKey({command: "py", args: ["-3.12", "-m", "venv", `${paths.expRoot}\\.venv`]});
    const upgradeKey = commandKey({command: venv.command, args: ["-m", "pip", "install", "--upgrade", "pip"]});
    const installKey = commandKey({command: venv.command, args: ["-m", "pip", "install", "-r", paths.pythonRequirements]});
    const checkKey = commandKey({command: venv.command, args: ["-m", "pip", "check"]});
    const harness = createHarness({
      paths,
      platform: "win32",
      venvExists: false,
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [venvVersionKey]: commandResult({stdout: "Python 3.12.4\n"}),
        [createKey]: commandResult(),
        [upgradeKey]: commandResult(),
        [installKey]: commandResult(),
        [checkKey]: commandResult(),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).toEqual([
      "python.venv.create",
      "python.pip.upgrade",
      "python.dependencies.install",
      "python.fingerprint.write",
    ]);
    expect(harness.run.mock.calls.map(([command]) => commandKey(command))).toContain(createKey);
    expect(harness.removedDirectories).toEqual([]);
    const config = JSON.parse(await readFile(paths.toolingConfig, "utf8")) as ToolingConfigV1;
    expect(config.fingerprints?.pythonRequirementsSha256).toBe(await sha256File(paths.pythonRequirements));
  });

  it("recreates the venv when the existing interpreter version does not satisfy the requirement", async () => {
    const paths = await createFixture();
    const venv = venvPython(paths, "win32");
    const venvVersionKey = commandKey({command: venv.command, args: ["--version"]});
    const createKey = commandKey({command: "py", args: ["-3.12", "-m", "venv", `${paths.expRoot}\\.venv`]});
    const harness = createHarness({
      paths,
      platform: "win32",
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [venvVersionKey]: [commandResult({stdout: "Python 3.10.0\n"}), commandResult({stdout: "Python 3.12.4\n"})],
        [createKey]: commandResult(),
        [commandKey({command: venv.command, args: ["-m", "pip", "install", "--upgrade", "pip"]})]: commandResult(),
        [commandKey({command: venv.command, args: ["-m", "pip", "install", "-r", paths.pythonRequirements]})]: commandResult(),
        [commandKey({command: venv.command, args: ["-m", "pip", "check"]})]: commandResult(),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds[0]).toBe("python.venv.create");
    expect(harness.removedDirectories).toEqual([`${paths.expRoot}\\.venv`]);
  });

  it.each([
    ["a timeout", commandResult({code: 1, timedOut: true})],
    ["a termination signal", commandResult({code: 1, signal: "SIGTERM"})],
    ["a non-ENOENT spawn failure", commandResult({code: 1, spawnError: "spawn EBUSY"})],
    ["a nonzero probe exit", commandResult({code: 1, stderr: "interpreter locked\n"})],
    ["malformed version output", commandResult({stdout: "not a Python version\n"})],
  ])("fails without removing or recreating an existing venv when its version probe has %s", async (_name, probeResult) => {
    const paths = await createFixture();
    const venv = venvPython(paths, "win32");
    const harness = createHarness({
      paths,
      platform: "win32",
      venvExists: true,
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["--version"]})]: probeResult,
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/virtual environment version probe.*inconclusive/i);
    expect(result.nextActions.join("\n")).toMatch(/resolve.*probe.*rerun setup/i);
    expect(harness.actionIds).toEqual([]);
    expect(harness.removedDirectories).toEqual([]);
  });

  it("performs no mutation when the fingerprint matches and pip check succeeds", async () => {
    const paths = await createFixture();
    const venv = venvPython(paths, "win32");
    const harness = createHarness({
      paths,
      platform: "win32",
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["-m", "pip", "check"]})]: commandResult(),
      },
    });
    await writeToolingConfigFixture(paths, {
      schemaVersion: 1,
      fingerprints: {pythonRequirementsSha256: await sha256File(paths.pythonRequirements)},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).toEqual([]);
    expect(harness.removedDirectories).toEqual([]);
  });

  it("reinstalls without recreating the venv when the requirements fingerprint is stale", async () => {
    const paths = await createFixture();
    const venv = venvPython(paths, "win32");
    const harness = createHarness({
      paths,
      platform: "win32",
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["-m", "pip", "install", "--upgrade", "pip"]})]: commandResult(),
        [commandKey({command: venv.command, args: ["-m", "pip", "install", "-r", paths.pythonRequirements]})]: commandResult(),
        [commandKey({command: venv.command, args: ["-m", "pip", "check"]})]: commandResult(),
      },
    });
    await writeToolingConfigFixture(paths, {schemaVersion: 1, fingerprints: {pythonRequirementsSha256: "stale-hash"}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install", "python.fingerprint.write"]);
  });

  it("reinstalls without recreating the venv when the matching-fingerprint pip check fails", async () => {
    const paths = await createFixture();
    const venv = venvPython(paths, "win32");
    const checkKey = commandKey({command: venv.command, args: ["-m", "pip", "check"]});
    const harness = createHarness({
      paths,
      platform: "win32",
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [checkKey]: [commandResult({code: 1, stderr: "broken\n"}), commandResult()],
        [commandKey({command: venv.command, args: ["-m", "pip", "install", "--upgrade", "pip"]})]: commandResult(),
        [commandKey({command: venv.command, args: ["-m", "pip", "install", "-r", paths.pythonRequirements]})]: commandResult(),
      },
    });
    await writeToolingConfigFixture(paths, {
      schemaVersion: 1,
      fingerprints: {pythonRequirementsSha256: await sha256File(paths.pythonRequirements)},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install", "python.fingerprint.write"]);
  });

  it("fails without further actions when venv creation fails", async () => {
    const paths = await createFixture();
    const venv = venvPython(paths, "win32");
    const venvVersionKey = commandKey({command: venv.command, args: ["--version"]});
    const createKey = commandKey({command: "py", args: ["-3.12", "-m", "venv", `${paths.expRoot}\\.venv`]});
    const harness = createHarness({
      paths,
      platform: "win32",
      venvExists: false,
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [createKey]: commandResult({code: 1, stderr: "boom\n"}),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual(["python.venv.create"]);
    expect(result.evidence.join("\n")).toContain("Python virtual environment creation failed.");
    expect(result.evidence.join("\n")).toContain("stderr: boom");
    const calledKeys = harness.run.mock.calls.map(([command]) => commandKey(command));
    expect(calledKeys).not.toContain(venvVersionKey);
    expect(calledKeys).not.toContain(commandKey({command: venv.command, args: ["-m", "pip", "install", "--upgrade", "pip"]}));
    expect(calledKeys).not.toContain(commandKey({command: venv.command, args: ["-m", "pip", "install", "-r", paths.pythonRequirements]}));
    expect(calledKeys).not.toContain(commandKey({command: venv.command, args: ["-m", "pip", "check"]}));
  });

  it("fails without installing requirements when pip upgrade fails", async () => {
    const paths = await createFixture();
    const venv = venvPython(paths, "win32");
    const harness = createHarness({
      paths,
      platform: "win32",
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["-m", "pip", "install", "--upgrade", "pip"]})]: commandResult({
          code: 1,
          stderr: "boom\n",
        }),
      },
    });
    await writeToolingConfigFixture(paths, {schemaVersion: 1, fingerprints: {pythonRequirementsSha256: "stale"}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual(["python.pip.upgrade"]);
  });

  it("fails without a fingerprint write when requirements installation fails", async () => {
    const paths = await createFixture();
    const venv = venvPython(paths, "win32");
    const harness = createHarness({
      paths,
      platform: "win32",
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["-m", "pip", "install", "--upgrade", "pip"]})]: commandResult(),
        [commandKey({command: venv.command, args: ["-m", "pip", "install", "-r", paths.pythonRequirements]})]: commandResult({
          code: 1,
          stderr: "boom\n",
        }),
      },
    });
    await writeToolingConfigFixture(paths, {schemaVersion: 1, fingerprints: {pythonRequirementsSha256: "stale"}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
  });

  it("fails without writing a fingerprint when the final pip check fails", async () => {
    const paths = await createFixture();
    const venv = venvPython(paths, "win32");
    const harness = createHarness({
      paths,
      platform: "win32",
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["-m", "pip", "install", "--upgrade", "pip"]})]: commandResult(),
        [commandKey({command: venv.command, args: ["-m", "pip", "install", "-r", paths.pythonRequirements]})]: commandResult(),
        [commandKey({command: venv.command, args: ["-m", "pip", "check"]})]: commandResult({code: 1, stderr: "inconsistent\n"}),
      },
    });
    await writeToolingConfigFixture(paths, {schemaVersion: 1, fingerprints: {pythonRequirementsSha256: "stale"}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.summary).toMatch(/pip check/i);
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
  });

  it("is idempotent across repeated runs once dependencies are installed", async () => {
    const paths = await createFixture();
    const venv = venvPython(paths, "win32");
    const responses = {
      [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
      [commandKey({command: venv.command, args: ["--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
      [commandKey({command: venv.command, args: ["-m", "pip", "install", "--upgrade", "pip"]})]: commandResult(),
      [commandKey({command: venv.command, args: ["-m", "pip", "install", "-r", paths.pythonRequirements]})]: commandResult(),
      [commandKey({command: venv.command, args: ["-m", "pip", "check"]})]: commandResult(),
    };
    await writeToolingConfigFixture(paths, {schemaVersion: 1, fingerprints: {pythonRequirementsSha256: "stale"}});

    const first = createHarness({paths, platform: "win32", responses});
    const firstResult = await first.phase.run(first.context);
    expect(firstResult.status).toBe("succeeded");
    expect(first.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install", "python.fingerprint.write"]);

    const second = createHarness({paths, platform: "win32", responses});
    const secondResult = await second.phase.run(second.context);
    expect(secondResult.status).toBe("succeeded");
    expect(second.actionIds).toEqual([]);
  });

  it("accumulates planned venv and pip actions in order without running dependent postconditions", async () => {
    const paths = await createFixture();
    const venv = venvPython(paths, "win32");
    const harness = createHarness({
      paths,
      platform: "win32",
      options: setupOptions({dryRun: true}),
      venvExists: false,
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
      },
      dispositions: {
        "python.venv.create": "planned",
        "python.pip.upgrade": "planned",
        "python.dependencies.install": "planned",
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toEqual(["python.venv.create", "python.pip.upgrade", "python.dependencies.install"]);
    const calledKeys = harness.run.mock.calls.map(([command]) => commandKey(command));
    expect(calledKeys).not.toContain(commandKey({command: venv.command, args: ["-m", "pip", "check"]}));
  });

  it("accumulates planned pip actions without recreating an already compatible venv", async () => {
    const paths = await createFixture();
    const venv = venvPython(paths, "win32");
    const harness = createHarness({
      paths,
      platform: "win32",
      options: setupOptions({dryRun: true}),
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
      },
      dispositions: {
        "python.pip.upgrade": "planned",
        "python.dependencies.install": "planned",
      },
    });
    await writeToolingConfigFixture(paths, {schemaVersion: 1, fingerprints: {pythonRequirementsSha256: "stale"}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toEqual(["python.pip.upgrade", "python.dependencies.install"]);
    const calledKeys = harness.run.mock.calls.map(([command]) => commandKey(command));
    expect(calledKeys).not.toContain(commandKey({command: venv.command, args: ["-m", "pip", "check"]}));
  });

  it("declines to mutate when the fingerprint action is declined", async () => {
    const paths = await createFixture();
    const venv = venvPython(paths, "win32");
    const harness = createHarness({
      paths,
      platform: "win32",
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["-m", "pip", "install", "--upgrade", "pip"]})]: commandResult(),
        [commandKey({command: venv.command, args: ["-m", "pip", "install", "-r", paths.pythonRequirements]})]: commandResult(),
        [commandKey({command: venv.command, args: ["-m", "pip", "check"]})]: commandResult(),
      },
      dispositions: {"python.fingerprint.write": "declined"},
    });
    await writeToolingConfigFixture(paths, {schemaVersion: 1, fingerprints: {pythonRequirementsSha256: "stale"}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Declined action: python.fingerprint.write");
  });

  it("preserves unrelated tooling preferences and fingerprints while updating the Python fingerprint", async () => {
    const paths = await createFixture();
    const venv = venvPython(paths, "win32");
    const harness = createHarness({
      paths,
      platform: "win32",
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["-m", "pip", "install", "--upgrade", "pip"]})]: commandResult(),
        [commandKey({command: venv.command, args: ["-m", "pip", "install", "-r", paths.pythonRequirements]})]: commandResult(),
        [commandKey({command: venv.command, args: ["-m", "pip", "check"]})]: commandResult(),
      },
    });
    await writeToolingConfigFixture(paths, {
      schemaVersion: 1,
      containerEngine: "podman",
      fingerprints: {nodeVersion: "24.0.0", rootPackageLockSha256: "root-hash", pythonRequirementsSha256: "stale"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    const config = JSON.parse(await readFile(paths.toolingConfig, "utf8")) as ToolingConfigV1;
    expect(config.containerEngine).toBe("podman");
    expect(config.fingerprints?.nodeVersion).toBe("24.0.0");
    expect(config.fingerprints?.rootPackageLockSha256).toBe("root-hash");
    expect(config.fingerprints?.pythonRequirementsSha256).toBe(await sha256File(paths.pythonRequirements));
  });

  it("fails explicitly when the local tooling configuration is invalid", async () => {
    const paths = await createFixture();
    const venv = venvPython(paths, "win32");
    await writeFixture(paths.toolingConfig, "not json\n");
    const harness = createHarness({
      paths,
      platform: "win32",
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual([]);
  });

  it("treats a non-ENOENT tooling configuration read failure as an explicit error", async () => {
    const paths = await createFixture();
    const venv = venvPython(paths, "win32");
    await writeFixture(paths.toolingConfig, JSON.stringify({schemaVersion: 1}));
    filesystemFailures.readFile = {path: paths.toolingConfig, code: "EACCES"};
    const harness = createHarness({
      paths,
      platform: "win32",
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/EACCES|unable to read/i);
    expect(harness.actionIds).toEqual([]);
  });

  it("rethrows interruption instead of reporting a failed result", async () => {
    const paths = await createFixture();
    const abortError = Object.assign(new Error("aborted"), {name: "AbortError"});
    const venv = venvPython(paths, "win32");
    const harness = createHarness({
      paths,
      platform: "win32",
      venvExists: false,
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["--version"]})]: commandResult({code: 1, spawnError: "ENOENT"}),
      },
      actionsOverride: {
        run: async () => {
          throw abortError;
        },
      },
    });

    await expect(harness.phase.run(harness.context)).rejects.toBe(abortError);
  });

  it("never issues a bare pip, remote-installer, build, test, or service command", async () => {
    const paths = await createFixture();
    const venv = venvPython(paths, "win32");
    const createKey = commandKey({command: "py", args: ["-3.12", "-m", "venv", `${paths.expRoot}\\.venv`]});
    const harness = createHarness({
      paths,
      platform: "win32",
      venvExists: false,
      responses: {
        [commandKey({command: "py", args: ["-3.12", "--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [commandKey({command: venv.command, args: ["--version"]})]: commandResult({stdout: "Python 3.12.4\n"}),
        [createKey]: commandResult(),
        [commandKey({command: venv.command, args: ["-m", "pip", "install", "--upgrade", "pip"]})]: commandResult(),
        [commandKey({command: venv.command, args: ["-m", "pip", "install", "-r", paths.pythonRequirements]})]: commandResult(),
        [commandKey({command: venv.command, args: ["-m", "pip", "check"]})]: commandResult(),
      },
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
