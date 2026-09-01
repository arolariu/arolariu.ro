// @vitest-environment node
/**
 * @fileoverview Contract tests for dependency-free workspace setup phases.
 * @module scripts.setup.workspace.test
 */

import {mkdir, mkdtemp, rm, stat, unlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {CommandResult, CommandRunner, CommandSpec} from "./common/process.ts";
import {createRepositoryPaths, type RepositoryPaths} from "./common/repository-paths.ts";
import {parseVersion, type MinimumVersion, type RepositoryRequirements} from "./common/requirements.ts";
import {getExpectedTaxonomyArtifactPaths} from "./common/taxonomy-artifacts.ts";
import type {NpmTreeFacts} from "./inspection/packages.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";
import {workspaceSetupPhases} from "./setup.workspace.ts";
import type {
  SetupAction,
  SetupActionDisposition,
  SetupActionExecutor,
  SetupContext,
  SetupOptions,
  SetupPhaseDefinition,
} from "./setup.types.ts";

const filesystemFailures = vi.hoisted(
  (): {
    readFile?: Readonly<{path: string; code: "EACCES"}>;
    stat?: Readonly<{path: string; code: "EPERM" | "EIO"}>;
  } => ({}),
);

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
    stat: (...args: unknown[]) => {
      const failure = filesystemFailures.stat;
      if (failure !== undefined && String(args[0]) === failure.path) {
        return Promise.reject(Object.assign(new Error(`${failure.code}: simulated stat failure`), {code: failure.code}));
      }
      return Reflect.apply(actual.stat, actual, args);
    },
  };
});

const temporaryRoots: string[] = [];
function requireNodeVersion(): MinimumVersion {
  const version = parseVersion(process.version);
  if (version === null) {
    throw new Error(`The test runtime uses an unsupported Node version '${process.version}'.`);
  }
  return version;
}

const nodeVersion = requireNodeVersion();

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

function requirements(patch: Partial<RepositoryRequirements> = {}): RepositoryRequirements {
  return {
    node: nodeVersion,
    npm: {major: 11, minor: 0, patch: 0},
    dotnet: {major: 10, minor: 0, patch: 0},
    python: {major: 3, minor: 12, patch: 0},
    packages: new Map(),
    ...patch,
  };
}

function options(patch: Partial<SetupOptions> = {}): SetupOptions {
  return {
    verbose: false,
    dryRun: false,
    yes: false,
    ...patch,
  };
}

/** Session-inspected npm tree keys consumed by workspace setup phases. */
type NpmInspectionKey = "npm.root" | "npm.github-scripts";

/** A typed fake {@link RepositoryInspectionSession} that never resolves a real repository fact by default. */
function createInspectionHarness(
  overrides: Readonly<
    Partial<Record<NpmInspectionKey, () => InspectionOutcome<NpmTreeFacts> | Promise<InspectionOutcome<NpmTreeFacts>>>>
  > = {},
): Readonly<{
  session: RepositoryInspectionSession;
  inspect: ReturnType<typeof vi.fn>;
  invalidate: ReturnType<typeof vi.fn>;
}> {
  const inspect = vi.fn(async (key: NpmInspectionKey) => {
    const provider = overrides[key];
    return provider === undefined ? {kind: "unavailable" as const, reason: "Not exercised by this test.", durationMs: 0} : provider();
  });
  const invalidate = vi.fn();
  return {
    session: {inspect, invalidate, updateInfrastructureEngine: vi.fn()} as unknown as RepositoryInspectionSession,
    inspect,
    invalidate,
  };
}

function findPhase(id: string): SetupPhaseDefinition {
  const phase = workspaceSetupPhases.find((candidate) => candidate.id === id);
  if (phase === undefined) {
    throw new Error(`Missing workspace phase '${id}'.`);
  }
  return phase;
}

function defaultCommandResponse(command: Readonly<CommandSpec>): CommandResult {
  if (command.command === "git") {
    return commandResult({stdout: "git version 2.50.0\n"});
  }
  if (command.command === "node") {
    return commandResult({stdout: `${process.version}\n`});
  }
  if (command.command === "npm" && command.args[0] === "--version") {
    return commandResult({stdout: "11.0.0\n"});
  }
  if (command.command === "npm" && command.args[0] === "ls") {
    return commandResult({stdout: "{}\n"});
  }
  if (command.command === "npx") {
    return commandResult({stdout: '["website"]\n'});
  }
  return commandResult();
}

function createRunner(
  response: (command: Readonly<CommandSpec>, cwd: string | undefined, callIndex: number) => CommandResult | Promise<CommandResult> = (
    command,
  ) => defaultCommandResponse(command),
): Readonly<{
  runner: CommandRunner;
  run: ReturnType<typeof vi.fn<CommandRunner["run"]>>;
}> {
  let callIndex = 0;
  const run = vi.fn<CommandRunner["run"]>(async (command, runOptions) => {
    callIndex++;
    return response(command, runOptions?.cwd, callIndex);
  });
  return {runner: {run}, run};
}

function createActions(
  dryRun: boolean,
  dispositions: Readonly<Record<string, SetupActionDisposition>> = {},
): Readonly<{
  actions: SetupActionExecutor;
  run: ReturnType<typeof vi.fn<SetupActionExecutor["run"]>>;
  actionIds: string[];
}> {
  const actionIds: string[] = [];
  const run = vi.fn<SetupActionExecutor["run"]>(async (action: Readonly<SetupAction>): Promise<SetupActionDisposition> => {
    actionIds.push(action.id);
    const disposition = dispositions[action.id] ?? (dryRun ? "planned" : "executed");
    if (disposition === "executed") {
      await action.execute();
    }
    return disposition;
  });
  return {actions: {run}, run, actionIds};
}

function createContext(
  paths: RepositoryPaths,
  runner: CommandRunner,
  actions: SetupActionExecutor,
  patch: Readonly<{
    options?: SetupOptions;
    requirements?: RepositoryRequirements;
    inspection?: RepositoryInspectionSession;
  }> = {},
): SetupContext {
  let time = 0;
  return {
    options: patch.options ?? options(),
    paths,
    requirements: patch.requirements ?? requirements(),
    inspection: patch.inspection ?? createInspectionHarness().session,
    runner,
    prompts: {
      confirm: async () => true,
      select: async <TValue extends string>(
        _message: string,
        choices: readonly Readonly<{value: TValue; label: string}>[],
      ): Promise<TValue> => {
        const choice = choices[0]?.value;
        if (choice === undefined) {
          throw new Error("Test prompt requires a choice.");
        }
        return choice;
      },
      text: async () => "",
      secret: async () => "",
    },
    actions,
    logger: new MonorepositoryConsoleLogger("setup::workspace", {
      color: false,
      sink: new InMemoryLoggerSink(),
    }),
    now: () => time++,
  };
}

async function writeFixture(path: string, contents: string = ""): Promise<void> {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, contents, "utf8");
}

async function createFixture(): Promise<RepositoryPaths> {
  const root = await mkdtemp(join(tmpdir(), "arolariu-setup-workspace-test-"));
  temporaryRoots.push(root);
  const paths = createRepositoryPaths(root);
  const nodeMajor = String(nodeVersion.major);

  await Promise.all([
    writeFixture(resolve(paths.root, ".nvmrc"), `${nodeMajor}\n`),
    writeFixture(resolve(paths.root, ".node-version"), `${nodeMajor}\n`),
    writeFixture(
      paths.packageJson,
      JSON.stringify({
        name: "@arolariu/monorepo",
        engines: {node: `>=${nodeMajor}`, npm: ">=11"},
        devDependencies: {},
      }),
    ),
    writeFixture(
      paths.packageLock,
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          "": {
            name: "@arolariu/monorepo",
            version: "0.0.0",
            devDependencies: {},
          },
        },
      }),
    ),
    writeFixture(paths.githubScriptsPackageJson, JSON.stringify({name: "@arolariu/github-scripts"})),
    writeFixture(paths.githubScriptsPackageLock, '{"lockfileVersion":3}\n'),
    writeFixture(paths.dotnetBuildProps, "<Project><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>"),
    writeFixture(paths.pythonProject, '[project]\nrequires-python = ">=3.12"\n'),
    mkdir(resolve(paths.root, "node_modules"), {recursive: true}),
    mkdir(resolve(paths.githubScriptsRoot, "node_modules"), {recursive: true}),
  ]);
  return paths;
}

async function writeGeneratedArtifacts(paths: RepositoryPaths): Promise<readonly string[]> {
  const generatedPaths = [
    ...getExpectedTaxonomyArtifactPaths(paths.root),
    resolve(paths.root, "scripts", "__generated__", "gql", "README.placeholder.txt"),
  ];
  await Promise.all(generatedPaths.map((path) => writeFixture(path, "generated\n")));
  return generatedPaths;
}

beforeEach(() => {
  vi.restoreAllMocks();
  delete filesystemFailures.readFile;
  delete filesystemFailures.stat;
});

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, {recursive: true, force: true})));
});

describe("workspaceSetupPhases", () => {
  it("publishes the required workspace phase graph", () => {
    expect(
      workspaceSetupPhases.map(({id, required, dependsOn}) => ({
        id,
        required,
        dependsOn,
      })),
    ).toEqual([
      {id: "workspace.prerequisites", required: true, dependsOn: []},
      {
        id: "workspace.root-dependencies",
        required: true,
        dependsOn: ["workspace.prerequisites"],
      },
      {
        id: "workspace.github-scripts-dependencies",
        required: true,
        dependsOn: ["workspace.prerequisites"],
      },
      {
        id: "workspace.generators",
        required: true,
        dependsOn: ["workspace.root-dependencies"],
      },
    ]);
  });
});

describe("workspace prerequisites", () => {
  it("validates repository identity and probes exact commands from a subdirectory", async () => {
    const paths = await createFixture();
    const nested = resolve(paths.root, "sites", "nested");
    await mkdir(nested, {recursive: true});
    const {runner, run} = createRunner();
    const {actions} = createActions(false);
    const cwd = vi.spyOn(process, "cwd").mockReturnValue(nested);

    const result = await findPhase("workspace.prerequisites").run(createContext(paths, runner, actions));

    expect(result.status).toBe("succeeded");
    expect(cwd).not.toHaveBeenCalled();

    expect(run.mock.calls.map(([command]) => command)).toEqual([
      {command: "git", args: ["--version"]},
      {command: "node", args: ["--version"]},
      {command: "npm", args: ["--version"]},
    ]);
    expect(run.mock.calls.map(([, runOptions]) => runOptions?.cwd)).toEqual([paths.root, paths.root, paths.root]);
  });

  it("fails when the canonical package is not this repository", async () => {
    const paths = await createFixture();
    await writeFixture(paths.packageJson, JSON.stringify({name: "wrong-repository"}));
    const {runner, run} = createRunner();
    const {actions} = createActions(false);

    const result = await findPhase("workspace.prerequisites").run(createContext(paths, runner, actions));

    expect(result.status).toBe("failed");
    expect(result.summary).toMatch(/repository/i);
    expect(run).not.toHaveBeenCalled();
  });

  it("fails with installation guidance when Git is unavailable", async () => {
    const paths = await createFixture();
    const {runner} = createRunner((command) =>
      command.command === "git" ? commandResult({code: 1, spawnError: "git not found"}) : defaultCommandResponse(command),
    );
    const {actions, run} = createActions(false);

    const result = await findPhase("workspace.prerequisites").run(createContext(paths, runner, actions));

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toMatch(/install Git/i);
    expect(run).not.toHaveBeenCalled();
  });

  it.each([
    ["plain", "git version 2.50.0\n"],
    ["Apple", "git version 2.39.5 (Apple Git-154)\n"],
    ["Windows", "git version 2.51.0.windows.1\n"],
  ])("accepts %s vendor Git output with supported Node and npm versions", async (_vendor, gitOutput) => {
    const paths = await createFixture();
    const {runner} = createRunner((command) =>
      command.command === "git" ? commandResult({stdout: gitOutput}) : defaultCommandResponse(command),
    );
    const {actions} = createActions(false);

    const result = await findPhase("workspace.prerequisites").run(createContext(paths, runner, actions));

    expect(result.status).toBe("succeeded");
    expect(result.evidence.join("\n")).toContain(gitOutput.trim());
    expect(result.evidence.join("\n")).toContain(process.version);
    expect(result.evidence.join("\n")).toContain("11.0.0");
  });

  it("rejects malformed Git output", async () => {
    const paths = await createFixture();
    const {runner} = createRunner((command) =>
      command.command === "git" ? commandResult({stdout: "git version vendor-only\n"}) : defaultCommandResponse(command),
    );
    const {actions} = createActions(false);

    const result = await findPhase("workspace.prerequisites").run(createContext(paths, runner, actions));

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/malformed.*vendor-only/i);
  });

  it("reports malformed repository identity instead of inferring a missing checkout", async () => {
    const paths = await createFixture();
    await writeFixture(paths.packageJson, "{not-json");
    const {runner, run} = createRunner();
    const {actions, run: runAction} = createActions(false);

    const result = await findPhase("workspace.prerequisites").run(createContext(paths, runner, actions));

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/parse|JSON/i);
    expect(run).not.toHaveBeenCalled();
    expect(runAction).not.toHaveBeenCalled();
  });

  it("reports repository identity permission failures without probing or mutating", async () => {
    const paths = await createFixture();
    filesystemFailures.readFile = {path: paths.packageJson, code: "EACCES"};
    const {runner, run} = createRunner();
    const {actions, run: runAction} = createActions(false);

    const result = await findPhase("workspace.prerequisites").run(createContext(paths, runner, actions));

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("EACCES");
    expect(run).not.toHaveBeenCalled();
    expect(runAction).not.toHaveBeenCalled();
  });

  it.each([
    ["Node", {node: {major: nodeVersion.major + 1, minor: 0, patch: 0}}],
    ["npm", {npm: {major: 12, minor: 0, patch: 0}}],
  ])("fails with manual installation guidance for unsupported %s", async (tool, requirementPatch) => {
    const paths = await createFixture();
    const {runner} = createRunner();
    const {actions, run} = createActions(false);

    const result = await findPhase("workspace.prerequisites").run(
      createContext(paths, runner, actions, {
        requirements: requirements(requirementPatch),
      }),
    );

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toMatch(new RegExp(`install.*${tool}|${tool}.*install`, "i"));
    expect(run).not.toHaveBeenCalled();
  });

  it("fails when node --version contradicts the running process", async () => {
    const paths = await createFixture();
    const {runner} = createRunner((command) =>
      command.command === "node" ? commandResult({stdout: "v99.0.0\n"}) : defaultCommandResponse(command),
    );
    const {actions} = createActions(false);

    const result = await findPhase("workspace.prerequisites").run(createContext(paths, runner, actions));

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/process\.version|running process/i);
  });

  it("fails invalid manifest-derived requirements instead of guessing", async () => {
    const paths = await createFixture();
    await writeFixture(resolve(paths.root, ".node-version"), `${nodeVersion.major + 1}\n`);
    const {runner} = createRunner();
    const {actions} = createActions(false);

    const result = await findPhase("workspace.prerequisites").run(createContext(paths, runner, actions));

    expect(result.status).toBe("failed");
    expect(result.summary).toMatch(/requirement/i);
  });
});

describe("workspace root dependency validation", () => {
  function npmTreeFacts(patch: Partial<NpmTreeFacts> = {}): NpmTreeFacts {
    return {
      scope: "root",
      valid: true,
      packageCount: 42,
      problemCount: 0,
      problems: [],
      ...patch,
    };
  }

  it("consumes npm.root exactly once, registers no action, and never runs npm ci when the tree is valid", async () => {
    const paths = await createFixture();
    const {runner, run} = createRunner();
    const {actions, run: runAction} = createActions(false);
    const {session, inspect} = createInspectionHarness({"npm.root": () => ({kind: "available", value: npmTreeFacts(), durationMs: 1})});

    const result = await findPhase("workspace.root-dependencies").run(createContext(paths, runner, actions, {inspection: session}));

    expect(result.status).toBe("succeeded");
    expect(result.evidence.join("\n")).toContain("42");
    expect(inspect).toHaveBeenCalledTimes(1);
    expect(inspect).toHaveBeenCalledWith("npm.root");
    expect(runAction).not.toHaveBeenCalled();
    expect(run.mock.calls.some(([command]) => command.command === "npm" && command.args[0] === "ci")).toBe(false);
  });

  it("fails with exact npm-ci guidance when npm.root is unavailable", async () => {
    const paths = await createFixture();
    const {runner} = createRunner();
    const {actions, run: runAction} = createActions(false);
    const {session} = createInspectionHarness({
      "npm.root": () => ({kind: "unavailable", reason: "npm dependency inspection could not be started.", durationMs: 1}),
    });

    const result = await findPhase("workspace.root-dependencies").run(createContext(paths, runner, actions, {inspection: session}));

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("npm dependency inspection could not be started.");
    expect(result.nextActions.join("\n")).toContain("npm ci");
    expect(runAction).not.toHaveBeenCalled();
  });

  it("fails with exact npm-ci guidance when npm.root is invalid", async () => {
    const paths = await createFixture();
    const {runner} = createRunner();
    const {actions, run: runAction} = createActions(false);
    const {session} = createInspectionHarness({
      "npm.root": () => ({kind: "invalid", issues: ["npm dependency inspection produced malformed tree data."], durationMs: 1}),
    });

    const result = await findPhase("workspace.root-dependencies").run(createContext(paths, runner, actions, {inspection: session}));

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("npm dependency inspection produced malformed tree data.");
    expect(result.nextActions.join("\n")).toContain("npm ci");
    expect(runAction).not.toHaveBeenCalled();
  });

  it("fails with exact npm-ci guidance and safe problem evidence when the live tree is broken", async () => {
    const paths = await createFixture();
    const {runner} = createRunner();
    const {actions, run: runAction} = createActions(false);
    const {session} = createInspectionHarness({
      "npm.root": () => ({
        kind: "available",
        value: npmTreeFacts({valid: false, problemCount: 1, problems: [{code: "missing", detail: "npm reported missing for 'left-pad'."}]}),
        durationMs: 1,
      }),
    });

    const result = await findPhase("workspace.root-dependencies").run(createContext(paths, runner, actions, {inspection: session}));

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("npm reported missing for 'left-pad'.");
    expect(result.nextActions.join("\n")).toContain("npm ci");
    expect(runAction).not.toHaveBeenCalled();
  });
});

describe("workspace github scripts dependency restoration", () => {
  function npmTreeFacts(patch: Partial<NpmTreeFacts> = {}): NpmTreeFacts {
    return {
      scope: "github-scripts",
      valid: true,
      packageCount: 7,
      problemCount: 0,
      problems: [],
      ...patch,
    };
  }

  it("always executes the exact npm ci restoration command, then invalidates and re-verifies npm.github-scripts", async () => {
    const paths = await createFixture();
    const {runner, run} = createRunner();
    const {actions, actionIds} = createActions(false);
    const {session, inspect, invalidate} = createInspectionHarness({
      "npm.github-scripts": () => ({kind: "available", value: npmTreeFacts(), durationMs: 1}),
    });

    const result = await findPhase("workspace.github-scripts-dependencies").run(
      createContext(paths, runner, actions, {inspection: session}),
    );

    expect(result.status).toBe("succeeded");
    expect(actionIds).toEqual(["workspace.github-scripts-dependencies.npm-ci"]);
    expect(run).toHaveBeenCalledWith(
      {command: "npm", args: ["ci", "--prefer-offline", "--no-audit", "--no-fund"]},
      expect.objectContaining({cwd: paths.githubScriptsRoot}),
    );
    expect(invalidate).toHaveBeenCalledWith("npm.github-scripts");
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(inspect).toHaveBeenCalledWith("npm.github-scripts");
    expect(inspect).toHaveBeenCalledTimes(1);
  });

  it("plans the exact restoration command without executing it or touching inspection in dry-run", async () => {
    const paths = await createFixture();
    const {runner, run} = createRunner();
    const {actions, actionIds} = createActions(true);
    const {session, inspect, invalidate} = createInspectionHarness();
    const context = createContext(paths, runner, actions, {options: options({dryRun: true}), inspection: session});

    const result = await findPhase("workspace.github-scripts-dependencies").run(context);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toContain("workspace.github-scripts-dependencies.npm-ci");
    expect(actionIds).toEqual(["workspace.github-scripts-dependencies.npm-ci"]);
    expect(run.mock.calls.some(([command]) => command.args[0] === "ci")).toBe(false);
    expect(invalidate).not.toHaveBeenCalled();
    expect(inspect).not.toHaveBeenCalled();
  });

  it("fails explicitly and reports no invalidation when the restoration action is declined", async () => {
    const paths = await createFixture();
    const {runner, run} = createRunner();
    const {actions, actionIds} = createActions(false, {"workspace.github-scripts-dependencies.npm-ci": "declined"});
    const {session, inspect, invalidate} = createInspectionHarness();

    const result = await findPhase("workspace.github-scripts-dependencies").run(
      createContext(paths, runner, actions, {inspection: session}),
    );

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Declined action: workspace.github-scripts-dependencies.npm-ci");
    expect(actionIds).toEqual(["workspace.github-scripts-dependencies.npm-ci"]);
    expect(run.mock.calls.some(([command]) => command.args[0] === "ci")).toBe(false);
    expect(invalidate).not.toHaveBeenCalled();
    expect(inspect).not.toHaveBeenCalled();
  });

  it("fails when npm ci fails, without invalidating or re-inspecting", async () => {
    const paths = await createFixture();
    const {runner} = createRunner((command) =>
      command.command === "npm" && command.args[0] === "ci"
        ? commandResult({code: 1, stderr: "restore failed"})
        : defaultCommandResponse(command),
    );
    const {actions} = createActions(false);
    const {session, inspect, invalidate} = createInspectionHarness();

    const result = await findPhase("workspace.github-scripts-dependencies").run(
      createContext(paths, runner, actions, {inspection: session}),
    );

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("restore failed");
    expect(invalidate).not.toHaveBeenCalled();
    expect(inspect).not.toHaveBeenCalled();
  });

  it("fails when the refreshed npm.github-scripts facts remain unavailable after npm ci", async () => {
    const paths = await createFixture();
    const {runner} = createRunner();
    const {actions, actionIds} = createActions(false);
    const {session, invalidate} = createInspectionHarness({
      "npm.github-scripts": () => ({kind: "unavailable", reason: "npm dependency inspection could not be started.", durationMs: 1}),
    });

    const result = await findPhase("workspace.github-scripts-dependencies").run(
      createContext(paths, runner, actions, {inspection: session}),
    );

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("npm dependency inspection could not be started.");
    expect(invalidate).toHaveBeenCalledWith("npm.github-scripts");
    expect(actionIds).toEqual(["workspace.github-scripts-dependencies.npm-ci"]);
  });

  it("fails when the refreshed npm.github-scripts facts remain invalid after npm ci", async () => {
    const paths = await createFixture();
    const {runner} = createRunner();
    const {actions} = createActions(false);
    const {session} = createInspectionHarness({
      "npm.github-scripts": () => ({kind: "invalid", issues: ["npm dependency inspection produced malformed tree data."], durationMs: 1}),
    });

    const result = await findPhase("workspace.github-scripts-dependencies").run(
      createContext(paths, runner, actions, {inspection: session}),
    );

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("npm dependency inspection produced malformed tree data.");
  });

  it("fails with safe problem evidence when the refreshed tree remains broken after npm ci", async () => {
    const paths = await createFixture();
    const {runner} = createRunner();
    const {actions} = createActions(false);
    const {session} = createInspectionHarness({
      "npm.github-scripts": () => ({
        kind: "available",
        value: npmTreeFacts({valid: false, problemCount: 1, problems: [{code: "missing", detail: "npm reported missing for 'left-pad'."}]}),
        durationMs: 1,
      }),
    });

    const result = await findPhase("workspace.github-scripts-dependencies").run(
      createContext(paths, runner, actions, {inspection: session}),
    );

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("npm reported missing for 'left-pad'.");
  });
});

describe("workspace generators", () => {
  it("validates Nx metadata and executes the exact generator command through an action", async () => {
    const paths = await createFixture();
    await writeGeneratedArtifacts(paths);
    const {runner, run} = createRunner();
    const {actions, actionIds, run: runAction} = createActions(false);

    const result = await findPhase("workspace.generators").run(createContext(paths, runner, actions));

    expect(result.status).toBe("succeeded");
    expect(actionIds).toEqual(["workspace.generators.generate"]);
    expect(runAction.mock.calls[0]?.[0]).toMatchObject({id: "workspace.generators.generate", scope: "repository"});
    expect(run.mock.calls.map(([command]) => command.command)).toEqual(["npx", process.execPath]);
    expect(run).toHaveBeenCalledWith(
      {
        command: "npx",
        args: ["--no-install", "nx", "show", "projects", "--json"],
      },
      expect.objectContaining({cwd: paths.root}),
    );
    expect(run).toHaveBeenCalledWith(
      {
        command: process.execPath,
        args: [resolve(paths.root, "scripts", "generate.ts"), "/a", "/g", "/i"],
      },
      expect.objectContaining({cwd: paths.root}),
    );
  });

  it.each([
    ["malformed", "not json"],
    ["empty", "[]"],
    ["wrong-shaped", '{"projects":["website"]}'],
    ["invalid project names", '[""]'],
  ])("rejects %s Nx JSON", async (_name, stdout) => {
    const paths = await createFixture();
    const {runner, run} = createRunner((command) =>
      command.command === "npx" ? commandResult({stdout}) : defaultCommandResponse(command),
    );
    const {actions, actionIds} = createActions(false);

    const result = await findPhase("workspace.generators").run(createContext(paths, runner, actions));

    expect(result.status).toBe("failed");
    expect(actionIds).toEqual(["workspace.generators.generate"]);
    expect(run.mock.calls.some(([command]) => command.command === process.execPath)).toBe(false);
  });

  it("rejects failed Nx execution even when stdout contains valid JSON", async () => {
    const paths = await createFixture();
    const {runner, run} = createRunner((command) =>
      command.command === "npx" ? commandResult({code: 1, stdout: '["website"]', stderr: "nx failed"}) : defaultCommandResponse(command),
    );
    const {actions, actionIds} = createActions(false);

    const result = await findPhase("workspace.generators").run(createContext(paths, runner, actions));

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("nx failed");
    expect(actionIds).toEqual(["workspace.generators.generate"]);
    expect(run.mock.calls.some(([command]) => command.command === process.execPath)).toBe(false);
  });

  it("fails when the generator command fails", async () => {
    const paths = await createFixture();
    const {runner} = createRunner((command) =>
      command.command === process.execPath ? commandResult({code: 1, stderr: "generator failed"}) : defaultCommandResponse(command),
    );
    const {actions} = createActions(false);

    const result = await findPhase("workspace.generators").run(createContext(paths, runner, actions));

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("generator failed");
  });

  it("checks every required generated artifact postcondition", async () => {
    const paths = await createFixture();
    const generatedPaths = await writeGeneratedArtifacts(paths);

    for (const missingPath of generatedPaths) {
      await unlink(missingPath);
      const {runner} = createRunner();
      const {actions} = createActions(false);

      const result = await findPhase("workspace.generators").run(createContext(paths, runner, actions));

      expect(result.status, missingPath).toBe("failed");
      expect(result.evidence.join("\n"), missingPath).toContain(missingPath);
      await writeFixture(missingPath, "generated\n");
    }
  });

  it("does not own the Next-generated locale declaration", async () => {
    const paths = await createFixture();
    const generatedPaths = await writeGeneratedArtifacts(paths);
    const nextDeclaration = resolve(paths.websiteRoot, "messages", "en.d.json.ts");
    const {runner} = createRunner();
    const {actions} = createActions(false);

    expect(generatedPaths).not.toContain(nextDeclaration);
    await expect(stat(nextDeclaration)).rejects.toMatchObject({code: "ENOENT"});
    await expect(findPhase("workspace.generators").run(createContext(paths, runner, actions))).resolves.toMatchObject({
      status: "succeeded",
    });
  });

  it("reports generated artifact I/O failures instead of inferring a missing artifact", async () => {
    const paths = await createFixture();
    const generatedPaths = await writeGeneratedArtifacts(paths);
    const inaccessibleArtifact = generatedPaths[0];
    if (inaccessibleArtifact === undefined) {
      throw new Error("Expected at least one generated artifact.");
    }
    filesystemFailures.stat = {path: inaccessibleArtifact, code: "EIO"};
    const {runner} = createRunner();
    const {actions} = createActions(false);

    const result = await findPhase("workspace.generators").run(createContext(paths, runner, actions));

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("EIO");
    expect(result.evidence.join("\n")).not.toContain(`Missing generated artifact: ${inaccessibleArtifact}`);
  });

  it("returns a traversable skipped result in dry-run and names the generator action", async () => {
    const paths = await createFixture();
    const {runner, run} = createRunner();
    const {actions, actionIds} = createActions(true);
    const context = createContext(paths, runner, actions, {
      options: options({dryRun: true}),
    });

    const result = await findPhase("workspace.generators").run(context);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toContain("workspace.generators.generate");
    expect(actionIds).toEqual(["workspace.generators.generate"]);
    expect(run).not.toHaveBeenCalled();
  });
});
