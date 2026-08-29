// @vitest-environment node
/**
 * @fileoverview Contract tests for dependency-free workspace setup phases.
 * @module scripts.setup.workspace.test
 */

import {mkdir, mkdtemp, readFile, rm, stat, unlink, writeFile} from "node:fs/promises";
import {dirname, join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {CommandResult, CommandRunner, CommandSpec} from "./common/process.ts";
import {createRepositoryPaths, type RepositoryPaths} from "./common/repository-paths.ts";
import {parseVersion, type MinimumVersion, type RepositoryRequirements} from "./common/requirements.ts";
import {sha256File} from "./common/tooling-config.ts";
import {getExpectedTaxonomyArtifactPaths} from "./generate.artifacts.ts";
import {inspectNpmTreeResult, shouldRestoreNpmTree, workspaceSetupPhases, type NpmTreeInspection} from "./setup.workspace.ts";
import type {
  SetupAction,
  SetupActionDisposition,
  SetupActionExecutor,
  SetupContext,
  SetupOptions,
  SetupPhaseDefinition,
} from "./setup.types.ts";

const testDirectory = dirname(fileURLToPath(import.meta.url));
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

function createActions(dryRun: boolean): Readonly<{
  actions: SetupActionExecutor;
  run: ReturnType<typeof vi.fn<SetupActionExecutor["run"]>>;
  actionIds: string[];
}> {
  const actionIds: string[] = [];
  const run = vi.fn<SetupActionExecutor["run"]>(async (action: Readonly<SetupAction>): Promise<SetupActionDisposition> => {
    actionIds.push(action.id);
    if (dryRun) {
      return "planned";
    }
    await action.execute();
    return "executed";
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
  }> = {},
): SetupContext {
  let time = 0;
  return {
    options: patch.options ?? options(),
    paths,
    requirements: patch.requirements ?? requirements(),
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
  const root = await mkdtemp(join(testDirectory, ".setup-workspace-test-"));
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

async function writeMatchingConfig(paths: RepositoryPaths): Promise<void> {
  await writeFixture(
    paths.toolingConfig,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        containerEngine: "podman",
        fingerprints: {
          nodeVersion: `${nodeVersion.major}.${nodeVersion.minor}.${nodeVersion.patch}`,
          rootPackageLockSha256: await sha256File(paths.packageLock),
          githubScriptsPackageLockSha256: await sha256File(paths.githubScriptsPackageLock),
          pythonRequirementsSha256: "preserve-python",
        },
      },
      null,
      2,
    )}\n`,
  );
}

async function writeGeneratedArtifacts(paths: RepositoryPaths): Promise<readonly string[]> {
  const generatedPaths = [
    ...getExpectedTaxonomyArtifactPaths(paths.root),
    resolve(paths.websiteRoot, "messages", "en.d.json.ts"),
    resolve(paths.root, "scripts", "__generated__", "gql", "README.placeholder.txt"),
  ];
  await Promise.all(generatedPaths.map((path) => writeFixture(path, "generated\n")));
  return generatedPaths;
}

beforeEach(() => {
  vi.restoreAllMocks();
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

describe("inspectNpmTreeResult", () => {
  it("accepts a successful npm tree with no problems", () => {
    expect(inspectNpmTreeResult(commandResult({stdout: '{"name":"fixture"}\n'}))).toEqual({
      valid: true,
      problems: [],
      stdout: '{"name":"fixture"}\n',
      stderr: "",
    });
  });

  it("preserves problem JSON from a nonzero npm exit", () => {
    expect(
      inspectNpmTreeResult(
        commandResult({
          code: 1,
          stdout: '{"problems":["missing: dep@1.0.0"]}\n',
          stderr: "npm error",
        }),
      ),
    ).toEqual({
      valid: false,
      problems: ["missing: dep@1.0.0"],
      stdout: '{"problems":["missing: dep@1.0.0"]}\n',
      stderr: "npm error",
    });
  });

  it.each([
    ["empty output", commandResult(), /empty/i],
    ["malformed JSON", commandResult({stdout: "not json"}), /json/i],
    ["a non-object document", commandResult({stdout: "[]"}), /object/i],
    ["a malformed problems property", commandResult({stdout: '{"problems":"bad"}'}), /problems/i],
    ["a timed out command", commandResult({stdout: "{}", timedOut: true}), /timed out/i],
    ["a spawn failure", commandResult({stdout: "{}", spawnError: "ENOENT"}), /ENOENT/i],
  ])("rejects %s without trusting command output", (_name, result, expectedProblem) => {
    const inspection = inspectNpmTreeResult(result);

    expect(inspection.valid).toBe(false);
    expect(inspection.problems.join("\n")).toMatch(expectedProblem);
    expect(inspection.stdout).toBe(result.stdout);
    expect(inspection.stderr).toBe(result.stderr);
  });
});

describe("shouldRestoreNpmTree", () => {
  const validInspection: NpmTreeInspection = {
    valid: true,
    problems: [],
    stdout: "{}",
    stderr: "",
  };
  const base = {
    directoryExists: true,
    inspection: validInspection,
    currentNodeVersion: "24.1.0",
    currentLockHash: "abc",
    storedNodeVersion: "24.1.0",
    storedLockHash: "abc",
  };

  it.each([
    ["node_modules is absent", {...base, directoryExists: false}],
    [
      "the live tree is broken despite matching fingerprints",
      {
        ...base,
        inspection: {
          valid: false,
          problems: ["missing dep"],
          stdout: "{}",
          stderr: "",
        },
      },
    ],
    ["the Node version changed", {...base, currentNodeVersion: "24.2.0"}],
    ["the lockfile changed", {...base, currentLockHash: "def"}],
    [
      "the successful fingerprint is absent",
      {
        directoryExists: true,
        inspection: validInspection,
        currentNodeVersion: "24.1.0",
        currentLockHash: "abc",
        storedNodeVersion: "24.1.0",
      },
    ],
  ])("restores when %s", (_name, input) => {
    expect(shouldRestoreNpmTree(input)).toBe(true);
  });

  it("does not restore a valid live tree with matching fingerprints", () => {
    expect(shouldRestoreNpmTree(base)).toBe(false);
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

  it("accepts supported Node and npm versions", async () => {
    const paths = await createFixture();
    const {runner} = createRunner();
    const {actions} = createActions(false);

    const result = await findPhase("workspace.prerequisites").run(createContext(paths, runner, actions));

    expect(result.status).toBe("succeeded");
    expect(result.evidence.join("\n")).toContain(process.version);
    expect(result.evidence.join("\n")).toContain("11.0.0");
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

describe("workspace npm restoration", () => {
  it("restores a missing root tree through exact repository actions and preserves config", async () => {
    const paths = await createFixture();
    await rm(resolve(paths.root, "node_modules"), {recursive: true, force: true});
    await writeMatchingConfig(paths);
    const {runner, run} = createRunner((command) =>
      command.command === "npm" && command.args[0] === "ls"
        ? commandResult({code: 1, stdout: '{"problems":["missing node_modules"]}'})
        : defaultCommandResponse(command),
    );
    let inspectionCount = 0;
    run.mockImplementation(async (command, _runOptions) => {
      if (command.command === "npm" && command.args[0] === "ls") {
        inspectionCount++;
        return inspectionCount === 1
          ? commandResult({code: 1, stdout: '{"problems":["missing node_modules"]}'})
          : commandResult({stdout: "{}"});
      }
      return defaultCommandResponse(command);
    });
    const {actions, actionIds} = createActions(false);

    const result = await findPhase("workspace.root-dependencies").run(createContext(paths, runner, actions));

    expect(result.status).toBe("succeeded");
    expect(actionIds).toEqual(["workspace.root-dependencies.npm-ci", "workspace.root-dependencies.write-fingerprint"]);
    expect(run).toHaveBeenCalledWith(
      {
        command: "npm",
        args: ["ci", "--prefer-offline", "--no-audit", "--no-fund"],
      },
      expect.objectContaining({cwd: paths.root}),
    );
    const config = JSON.parse(await readFile(paths.toolingConfig, "utf8")) as unknown;
    expect(config).toMatchObject({
      containerEngine: "podman",
      fingerprints: {
        rootPackageLockSha256: await sha256File(paths.packageLock),
        githubScriptsPackageLockSha256: await sha256File(paths.githubScriptsPackageLock),
        pythonRequirementsSha256: "preserve-python",
      },
    });
  });

  it("does not restore a valid live root tree with matching fingerprints", async () => {
    const paths = await createFixture();
    await writeMatchingConfig(paths);
    const {runner, run} = createRunner();
    const {actions, run: runAction} = createActions(false);

    const result = await findPhase("workspace.root-dependencies").run(createContext(paths, runner, actions));

    expect(result.status).toBe("succeeded");
    expect(runAction).not.toHaveBeenCalled();
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith({command: "npm", args: ["ls", "--all", "--json"]}, expect.objectContaining({cwd: paths.root}));
  });

  it("does not let a matching fingerprint hide a broken live tree", async () => {
    const paths = await createFixture();
    await writeMatchingConfig(paths);
    let inspections = 0;
    const {runner} = createRunner((command) => {
      if (command.command === "npm" && command.args[0] === "ls") {
        inspections++;
        return inspections === 1 ? commandResult({code: 1, stdout: '{"problems":["missing dependency"]}'}) : commandResult({stdout: "{}"});
      }
      return defaultCommandResponse(command);
    });
    const {actions, actionIds} = createActions(false);

    const result = await findPhase("workspace.root-dependencies").run(createContext(paths, runner, actions));

    expect(result.status).toBe("succeeded");
    expect(actionIds).toContain("workspace.root-dependencies.npm-ci");
  });

  it("fails when npm ci fails", async () => {
    const paths = await createFixture();
    const {runner} = createRunner((command) =>
      command.command === "npm" && command.args[0] === "ci"
        ? commandResult({code: 1, stderr: "restore failed"})
        : defaultCommandResponse(command),
    );
    const {actions} = createActions(false);

    const result = await findPhase("workspace.root-dependencies").run(createContext(paths, runner, actions));

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("restore failed");
  });

  it("fails when the restored tree does not pass reinspection", async () => {
    const paths = await createFixture();
    const {runner} = createRunner((command) =>
      command.command === "npm" && command.args[0] === "ls"
        ? commandResult({code: 1, stdout: '{"problems":["still broken"]}'})
        : defaultCommandResponse(command),
    );
    const {actions, actionIds} = createActions(false);

    const result = await findPhase("workspace.root-dependencies").run(createContext(paths, runner, actions));

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("still broken");
    expect(actionIds).toEqual(["workspace.root-dependencies.npm-ci"]);
  });

  it("is idempotent after a successful restore and fingerprint write", async () => {
    const paths = await createFixture();
    let inspections = 0;
    const {runner} = createRunner((command) => {
      if (command.command === "npm" && command.args[0] === "ls") {
        inspections++;
        return commandResult({stdout: "{}"});
      }
      return defaultCommandResponse(command);
    });
    const {actions, actionIds} = createActions(false);
    const context = createContext(paths, runner, actions);

    await expect(findPhase("workspace.root-dependencies").run(context)).resolves.toMatchObject({status: "succeeded"});
    await expect(findPhase("workspace.root-dependencies").run(context)).resolves.toMatchObject({status: "succeeded"});

    expect(inspections).toBe(3);
    expect(actionIds).toEqual(["workspace.root-dependencies.npm-ci", "workspace.root-dependencies.write-fingerprint"]);
  });

  it("owns the .github scripts tree and its separate fingerprint", async () => {
    const paths = await createFixture();
    let inspections = 0;
    const {runner, run} = createRunner((command) => {
      if (command.command === "npm" && command.args[0] === "ls") {
        inspections++;
        return commandResult({stdout: "{}"});
      }
      return defaultCommandResponse(command);
    });
    const {actions, actionIds} = createActions(false);

    const result = await findPhase("workspace.github-scripts-dependencies").run(createContext(paths, runner, actions));

    expect(result.status).toBe("succeeded");
    expect(inspections).toBe(2);
    expect(actionIds).toEqual(["workspace.github-scripts-dependencies.npm-ci", "workspace.github-scripts-dependencies.write-fingerprint"]);
    expect(run).toHaveBeenCalledWith(
      {
        command: "npm",
        args: ["ci", "--prefer-offline", "--no-audit", "--no-fund"],
      },
      expect.objectContaining({cwd: paths.githubScriptsRoot}),
    );
    const config = JSON.parse(await readFile(paths.toolingConfig, "utf8")) as {
      readonly fingerprints?: Readonly<Record<string, string>>;
    };
    expect(config.fingerprints?.["githubScriptsPackageLockSha256"]).toBe(await sha256File(paths.githubScriptsPackageLock));
  });

  it("returns a traversable skipped result in dry-run without mutation", async () => {
    const paths = await createFixture();
    const {runner, run} = createRunner();
    const {actions, actionIds} = createActions(true);
    const context = createContext(paths, runner, actions, {
      options: options({dryRun: true}),
    });

    const result = await findPhase("workspace.root-dependencies").run(context);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toContain("workspace.root-dependencies.npm-ci");
    expect(actionIds).toEqual(["workspace.root-dependencies.npm-ci"]);
    expect(run.mock.calls.some(([command]) => command.args[0] === "ci")).toBe(false);
    await expect(stat(paths.toolingConfig)).rejects.toMatchObject({code: "ENOENT"});
  });
});

describe("workspace generators", () => {
  it("validates Nx metadata and executes the exact generator command through an action", async () => {
    const paths = await createFixture();
    await writeGeneratedArtifacts(paths);
    const {runner, run} = createRunner();
    const {actions, actionIds} = createActions(false);

    const result = await findPhase("workspace.generators").run(createContext(paths, runner, actions));

    expect(result.status).toBe("succeeded");
    expect(actionIds).toEqual(["workspace.generators.generate"]);
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
    const {runner} = createRunner((command) => (command.command === "npx" ? commandResult({stdout}) : defaultCommandResponse(command)));
    const {actions, run} = createActions(false);

    const result = await findPhase("workspace.generators").run(createContext(paths, runner, actions));

    expect(result.status).toBe("failed");
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects failed Nx execution even when stdout contains valid JSON", async () => {
    const paths = await createFixture();
    const {runner} = createRunner((command) =>
      command.command === "npx" ? commandResult({code: 1, stdout: '["website"]', stderr: "nx failed"}) : defaultCommandResponse(command),
    );
    const {actions, run} = createActions(false);

    const result = await findPhase("workspace.generators").run(createContext(paths, runner, actions));

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("nx failed");
    expect(run).not.toHaveBeenCalled();
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
    expect(run.mock.calls.some(([command]) => command.command === process.execPath)).toBe(false);
  });
});
