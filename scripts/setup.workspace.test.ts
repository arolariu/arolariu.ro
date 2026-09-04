// @vitest-environment node
/**
 * @fileoverview Contract tests for dependency-free workspace setup phases.
 * @module scripts.setup.workspace.test
 *
 * @remarks
 * Every phase test drives the real phase against an injected {@link SetupPhaseRuntime}: an
 * in-memory filesystem, a recording process runner, a deterministic clock and task scheduler, and
 * a fake generation invoker. No test in this file reads the live checkout, spawns a process, or
 * mutates disk state.
 */

import {resolve} from "node:path";
import {describe, expect, it, vi} from "vitest";

import type {CommandExecution, CommandExecutionContext} from "./core/command/command-execution.ts";
import {ComposedTerminalPresenter} from "./core/presentation/composed-terminal-presenter.ts";
import {RecordingTerminalPresenterSink} from "./testing/fixtures/terminal.fixture.ts";
import {createRepositoryPaths, type RepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import type {ProcessExecutionOptions, ProcessExecutionRequest} from "./core/process/process-execution-request.ts";
import type {ProcessExecutionResult} from "./core/process/process-execution-result.ts";
import {AbstractProcessRunner} from "./core/process/process-runner.ts";
import {createMemoryFileSystem, createTestRuntimeFactory} from "./common/runtime.testing.ts";
import {FileSystemError, type Clock, type FileSystem} from "./common/runtime.ts";
import {getExpectedTaxonomyArtifactPaths} from "./common/taxonomy-artifacts.ts";
import type {GenerateResult, GenerateTaskName} from "./generate.ts";
import type {NpmTreeFacts} from "./inspection/packages.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";
import type {
  SetupAction,
  SetupActionDisposition,
  SetupActionExecutor,
  SetupContext,
  SetupInput,
  SetupPhaseDefinition,
  SetupPhaseResult,
  SetupPhaseRuntime,
} from "./setup.types.ts";
import {workspaceSetupPhases} from "./setup.workspace.ts";

/** Fixture repository root; only the in-memory filesystem ever observes it. */
const FIXTURE_ROOT = resolve("/fixture/arolariu.ro");
const FIXTURE_PATHS: RepositoryPaths = createRepositoryPaths(FIXTURE_ROOT);
/** Executable path reported by the test runtime environment snapshot. */
const FIXTURE_EXECUTABLE_PATH = "/usr/bin/node";
/** Version reported by both `node --version` and the running runtime executable by default. */
const FIXTURE_NODE_VERSION = "v24.5.0";

function succeeded(stdout: string = "", stderr: string = ""): ProcessExecutionResult {
  return {kind: "succeeded", exitCode: 0, stdout, stderr, durationMs: 1};
}

function exited(exitCode: number, patch: Readonly<{stdout?: string; stderr?: string}> = {}): ProcessExecutionResult {
  return {kind: "exited", exitCode, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function spawnFailed(message: string): ProcessExecutionResult {
  return {kind: "spawn-failed", message, stdout: "", stderr: "", durationMs: 1};
}

/** Records every invocation while replaying request-driven outcomes. */
class FakeProcessRunner extends AbstractProcessRunner {
  readonly #respond: (request: Readonly<ProcessExecutionRequest>) => ProcessExecutionResult;
  readonly #calls: Readonly<{request: ProcessExecutionRequest; options: ProcessExecutionOptions}>[] = [];

  public constructor(respond: (request: Readonly<ProcessExecutionRequest>) => ProcessExecutionResult) {
    super();
    this.#respond = respond;
  }

  /** Every recorded invocation, in call order. */
  public get calls(): readonly Readonly<{request: ProcessExecutionRequest; options: ProcessExecutionOptions}>[] {
    return this.#calls;
  }

  /** {@inheritDoc AbstractProcessRunner.execute} */
  protected override execute(request: Readonly<ProcessExecutionRequest>, options: Readonly<ProcessExecutionOptions>): Promise<ProcessExecutionResult> {
    this.#calls.push({request, options});
    return Promise.resolve(this.#respond(request));
  }
}

function defaultOutcome(request: Readonly<ProcessExecutionRequest>): ProcessExecutionResult {
  if (request.command === "git") {
    return succeeded("git version 2.50.0\n");
  }
  if (request.command === "node" || request.command === FIXTURE_EXECUTABLE_PATH) {
    return succeeded(`${FIXTURE_NODE_VERSION}\n`);
  }
  if (request.command === "npm" && request.args[0] === "--version") {
    return succeeded("11.0.0\n");
  }
  if (request.command === "npx") {
    return succeeded('["website"]\n');
  }
  return succeeded();
}

function requirements(patch: Partial<RepositoryRequirements> = {}): RepositoryRequirements {
  return {
    node: {major: 24, minor: 0, patch: 0},
    npm: {major: 11, minor: 0, patch: 0},
    dotnet: {major: 10, minor: 0, patch: 0},
    python: {major: 3, minor: 12, patch: 0},
    packages: new Map(),
    ...patch,
  };
}

function options(patch: Partial<SetupInput> = {}): SetupInput {
  return {verbose: false, dryRun: false, yes: false, ...patch};
}

/** Manifest sources the live requirement reload and repository identity checks read. */
function fixtureFiles(patch: Readonly<Record<string, string>> = {}): Record<string, string> {
  return {
    [FIXTURE_PATHS.packageJson]: JSON.stringify({
      name: "@arolariu/monorepo",
      engines: {node: ">=24", npm: ">=11"},
      devDependencies: {},
    }),
    [FIXTURE_PATHS.packageLock]: JSON.stringify({
      lockfileVersion: 3,
      packages: {"": {name: "@arolariu/monorepo", version: "0.0.0", devDependencies: {}}},
    }),
    [resolve(FIXTURE_ROOT, ".nvmrc")]: "24\n",
    [resolve(FIXTURE_ROOT, ".node-version")]: "24\n",
    [FIXTURE_PATHS.dotnetBuildProps]: "<Project><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>",
    [FIXTURE_PATHS.pythonProject]: '[project]\nrequires-python = ">=3.12"\n',
    [FIXTURE_PATHS.githubScriptsPackageJson]: JSON.stringify({name: "@arolariu/github-scripts"}),
    [FIXTURE_PATHS.githubScriptsPackageLock]: '{"lockfileVersion":3}\n',
    ...patch,
  };
}

/** Every generated checkout artifact the generators phase asserts as a postcondition. */
function expectedGeneratedArtifacts(): readonly string[] {
  return [
    ...getExpectedTaxonomyArtifactPaths(FIXTURE_ROOT),
    resolve(FIXTURE_ROOT, "scripts", "__generated__", "gql", "README.placeholder.txt"),
  ];
}

function generatedArtifactFiles(paths: readonly string[] = expectedGeneratedArtifacts()): Record<string, string> {
  return Object.fromEntries(paths.map((path) => [path, "generated\n"]));
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

/** Completed generation outcome returned by the fake generation invoker unless a test overrides it. */
function completedGeneration(): CommandExecution<GenerateResult> {
  return {
    status: "completed",
    value: {selected: ["i18n", "gql", "artifacts"], completed: ["i18n", "gql", "artifacts"]},
    exitCode: 0,
  };
}

/**
 * The realistic nonzero completed generation: the child ran, one generator stopped the run, and
 * the typed result names it even though the composed child renders nothing itself.
 *
 * @param failed - Generator that stopped the run.
 * @returns A completed generation execution reporting exit code 1.
 */
function stoppedGeneration(failed: GenerateTaskName): CommandExecution<GenerateResult> {
  return {
    status: "completed",
    value: {selected: ["i18n", "gql", "artifacts"], completed: ["i18n"], failed},
    exitCode: 1,
  };
}

interface WorkspaceHarnessInput {
  /** Parsed setup options for this phase run. */
  readonly options?: SetupInput;
  /** Manifest-derived requirements shared by the phase. */
  readonly requirements?: RepositoryRequirements;
  /** Repository inspection session the phase consumes facts through. */
  readonly inspection?: RepositoryInspectionSession;
  /** Files seeded into (or overlaid on) the in-memory repository fixture. */
  readonly files?: Readonly<Record<string, string>>;
  /** Replaces the assembled filesystem capability, for I/O failure simulation. */
  readonly wrapFiles?: (files: FileSystem) => FileSystem;
  /** Request-driven process outcomes. */
  readonly respond?: (request: Readonly<ProcessExecutionRequest>) => ProcessExecutionResult;
  /** Typed generation outcome the composed generation command returns. */
  readonly generation?: CommandExecution<GenerateResult> | (() => Promise<CommandExecution<GenerateResult>>);
  /** Mutation controller; defaults to one derived from `options.dryRun`. */
  readonly actions?: SetupActionExecutor;
}

interface WorkspaceHarness {
  /** The setup context handed to the phase under test. */
  readonly context: MigratedSetupContext;
  /** Recording process runner. */
  readonly runner: FakeProcessRunner;
  /** In-memory filesystem observed by the phase. */
  readonly files: FileSystem;
  /** Recorded generation invocations. */
  readonly generate: ReturnType<typeof vi.fn<SetupPhaseRuntime["invokeGenerate"]>>;
  /** Rendered logger output. */
  readonly sink: RecordingTerminalPresenterSink;
}

/**
 * The exact context view a migrated workspace phase reads.
 *
 * @remarks
 * The deprecated {@link SetupContext.runner} and {@link SetupContext.now} members are deliberately
 * absent: a migrated phase must read its capabilities from {@link SetupContext.runtime} only, and
 * omitting them here makes any relapse a type error rather than a silently passing test.
 */
type MigratedSetupContext = Omit<SetupContext, "runner" | "now"> & Readonly<{runtime: SetupPhaseRuntime}>;

/**
 * Runs one migrated workspace phase against a context without the deprecated transitional members.
 *
 * @param id - Workspace phase identifier.
 * @param context - Migrated context view assembled by {@link createHarness}.
 * @returns The completed phase result.
 */
function runPhase(id: string, context: MigratedSetupContext): Promise<SetupPhaseResult> {
  return findPhase(id).run(context as SetupContext);
}

/**
 * Assembles the injected phase runtime and setup context one workspace phase test runs against.
 *
 * @param input - Optional seam replacements for this test.
 * @returns The context plus its recorded runner, filesystem, and generation seams.
 */
async function createHarness(input: Readonly<WorkspaceHarnessInput> = {}): Promise<WorkspaceHarness> {
  const setupOptions = input.options ?? options();
  const memoryFiles = createMemoryFileSystem(fixtureFiles(input.files ?? {}));
  const files = input.wrapFiles === undefined ? memoryFiles : input.wrapFiles(memoryFiles);
  const runner = new FakeProcessRunner(input.respond ?? defaultOutcome);

  let elapsed = 0;
  const clock: Clock = {
    monotonicNow: (): number => elapsed++,
    isoTimestamp: (): string => "2026-09-01T00:00:00.000Z",
    delay: (): Promise<void> => Promise.resolve(),
  };

  const generation = input.generation ?? completedGeneration();
  const generate = vi.fn<SetupPhaseRuntime["invokeGenerate"]>(async () =>
    typeof generation === "function" ? generation() : generation,
  );

  const sink = new RecordingTerminalPresenterSink();
  const logger = new ComposedTerminalPresenter("setup::workspace", {color: false, sink});
  const factory = createTestRuntimeFactory({files, runner, clock, logger});
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
    invokeGenerate: generate,
  };

  const context: MigratedSetupContext = {
    options: setupOptions,
    paths: FIXTURE_PATHS,
    requirements: input.requirements ?? requirements(),
    inspection: input.inspection ?? createInspectionHarness().session,
    runtime,
    prompts: commandRuntime.prompts,
    actions: input.actions ?? createActions(setupOptions.dryRun).actions,
    logger,
  };

  return {context, runner, files, generate, sink};
}

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
  it("validates repository identity and probes the exact prerequisite commands in the repository root", async () => {
    const {context, runner} = await createHarness();

    const result = await runPhase("workspace.prerequisites", context);

    expect(result.status).toBe("succeeded");
    expect(runner.calls.map(({request}) => request)).toEqual([
      {command: "git", args: ["--version"]},
      {command: "node", args: ["--version"]},
      {command: "npm", args: ["--version"]},
      {command: FIXTURE_EXECUTABLE_PATH, args: ["--version"]},
    ]);
    expect(runner.calls.map(({options: runOptions}) => runOptions.cwd)).toEqual([
      FIXTURE_ROOT,
      FIXTURE_ROOT,
      FIXTURE_ROOT,
      FIXTURE_ROOT,
    ]);
  });

  it("fails when the canonical package is not this repository", async () => {
    const {context, runner} = await createHarness({
      files: {[FIXTURE_PATHS.packageJson]: JSON.stringify({name: "wrong-repository"})},
    });

    const result = await runPhase("workspace.prerequisites", context);

    expect(result.status).toBe("failed");
    expect(result.summary).toMatch(/repository/i);
    expect(runner.calls).toHaveLength(0);
  });

  it("fails when the canonical repository identity is missing", async () => {
    const files = createMemoryFileSystem({});
    const {context, runner} = await createHarness({wrapFiles: () => files});

    const result = await runPhase("workspace.prerequisites", context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain(FIXTURE_PATHS.packageJson);
    expect(runner.calls).toHaveLength(0);
  });

  it("fails with installation guidance when Git is unavailable", async () => {
    const {context} = await createHarness({
      respond: (request) => (request.command === "git" ? spawnFailed("git not found") : defaultOutcome(request)),
    });

    const result = await runPhase("workspace.prerequisites", context);

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toMatch(/install Git/i);
  });

  it.each([
    ["plain", "git version 2.50.0\n"],
    ["Apple", "git version 2.39.5 (Apple Git-154)\n"],
    ["Windows", "git version 2.51.0.windows.1\n"],
  ])("accepts %s vendor Git output with supported Node and npm versions", async (_vendor, gitOutput) => {
    const {context} = await createHarness({
      respond: (request) => (request.command === "git" ? succeeded(gitOutput) : defaultOutcome(request)),
    });

    const result = await runPhase("workspace.prerequisites", context);

    expect(result.status).toBe("succeeded");
    expect(result.evidence.join("\n")).toContain(gitOutput.trim());
    expect(result.evidence.join("\n")).toContain(FIXTURE_NODE_VERSION);
    expect(result.evidence.join("\n")).toContain("11.0.0");
  });

  it("rejects malformed Git output", async () => {
    const {context} = await createHarness({
      respond: (request) => (request.command === "git" ? succeeded("git version vendor-only\n") : defaultOutcome(request)),
    });

    const result = await runPhase("workspace.prerequisites", context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/malformed.*vendor-only/i);
  });

  it("reports malformed repository identity instead of inferring a missing checkout", async () => {
    const {context, runner} = await createHarness({files: {[FIXTURE_PATHS.packageJson]: "{not-json"}});

    const result = await runPhase("workspace.prerequisites", context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/parse|JSON/i);
    expect(runner.calls).toHaveLength(0);
  });

  it("reports repository identity permission failures without probing or mutating", async () => {
    const {context, runner} = await createHarness({
      wrapFiles: (files) => ({
        ...files,
        readText: async (path: string): Promise<string> => {
          if (path === FIXTURE_PATHS.packageJson) {
            throw new FileSystemError("readText", path, "EACCES: simulated read failure", {code: "EACCES"});
          }
          return files.readText(path);
        },
      }),
    });

    const result = await runPhase("workspace.prerequisites", context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("EACCES");
    expect(runner.calls).toHaveLength(0);
  });

  it.each([
    ["Node", {node: {major: 25, minor: 0, patch: 0}}],
    ["npm", {npm: {major: 12, minor: 0, patch: 0}}],
  ])("fails with manual installation guidance for unsupported %s", async (tool, requirementPatch) => {
    const {context} = await createHarness({requirements: requirements(requirementPatch)});

    const result = await runPhase("workspace.prerequisites", context);

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toMatch(new RegExp(`install.*${tool}|${tool}.*install`, "i"));
  });

  it("fails when node --version contradicts the running runtime executable", async () => {
    const {context} = await createHarness({
      respond: (request) => (request.command === "node" ? succeeded("v24.9.0\n") : defaultOutcome(request)),
    });

    const result = await runPhase("workspace.prerequisites", context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/running Node\.js runtime/i);
    expect(result.nextActions.join("\n")).toMatch(/same supported Node\.js executable/i);
  });

  it("fails when the running runtime executable does not report a usable version", async () => {
    const {context} = await createHarness({
      respond: (request) => (request.command === FIXTURE_EXECUTABLE_PATH ? spawnFailed("probe failed") : defaultOutcome(request)),
    });

    const result = await runPhase("workspace.prerequisites", context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/running Node\.js runtime/i);
  });

  it("fails invalid manifest-derived requirements instead of guessing", async () => {
    const {context} = await createHarness({files: {[resolve(FIXTURE_ROOT, ".node-version")]: "25\n"}});

    const result = await runPhase("workspace.prerequisites", context);

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
    const harness = createInspectionHarness({"npm.root": () => ({kind: "available", value: npmTreeFacts(), durationMs: 1})});
    const {actions, run: runAction} = createActions(false);
    const {context, runner} = await createHarness({inspection: harness.session, actions});

    const result = await runPhase("workspace.root-dependencies", context);

    expect(result.status).toBe("succeeded");
    expect(result.evidence.join("\n")).toContain("42");
    expect(harness.inspect).toHaveBeenCalledTimes(1);
    expect(harness.inspect).toHaveBeenCalledWith("npm.root");
    expect(runAction).not.toHaveBeenCalled();
    expect(runner.calls.some(({request}) => request.command === "npm" && request.args[0] === "ci")).toBe(false);
  });

  it("fails with exact npm-ci guidance when npm.root is unavailable", async () => {
    const harness = createInspectionHarness({
      "npm.root": () => ({kind: "unavailable", reason: "npm dependency inspection could not be started.", durationMs: 1}),
    });
    const {actions, run: runAction} = createActions(false);
    const {context} = await createHarness({inspection: harness.session, actions});

    const result = await runPhase("workspace.root-dependencies", context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("npm dependency inspection could not be started.");
    expect(result.nextActions.join("\n")).toContain("npm ci");
    expect(runAction).not.toHaveBeenCalled();
  });

  it("fails with exact npm-ci guidance when npm.root is invalid", async () => {
    const harness = createInspectionHarness({
      "npm.root": () => ({kind: "invalid", issues: ["npm dependency inspection produced malformed tree data."], durationMs: 1}),
    });
    const {actions, run: runAction} = createActions(false);
    const {context} = await createHarness({inspection: harness.session, actions});

    const result = await runPhase("workspace.root-dependencies", context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("npm dependency inspection produced malformed tree data.");
    expect(result.nextActions.join("\n")).toContain("npm ci");
    expect(runAction).not.toHaveBeenCalled();
  });

  it("fails with exact npm-ci guidance and safe problem evidence when the live tree is broken", async () => {
    const harness = createInspectionHarness({
      "npm.root": () => ({
        kind: "available",
        value: npmTreeFacts({valid: false, problemCount: 1, problems: [{code: "missing", detail: "npm reported missing for 'left-pad'."}]}),
        durationMs: 1,
      }),
    });
    const {actions, run: runAction} = createActions(false);
    const {context} = await createHarness({inspection: harness.session, actions});

    const result = await runPhase("workspace.root-dependencies", context);

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
    const harness = createInspectionHarness({
      "npm.github-scripts": () => ({kind: "available", value: npmTreeFacts(), durationMs: 1}),
    });
    const {actions, actionIds} = createActions(false);
    const {context, runner} = await createHarness({inspection: harness.session, actions});

    const result = await runPhase("workspace.github-scripts-dependencies", context);

    expect(result.status).toBe("succeeded");
    expect(actionIds).toEqual(["workspace.github-scripts-dependencies.npm-ci"]);
    const restore = runner.calls.find(({request}) => request.args[0] === "ci");
    expect(restore?.request).toEqual({command: "npm", args: ["ci", "--prefer-offline", "--no-audit", "--no-fund"]});
    expect(restore?.options.cwd).toBe(FIXTURE_PATHS.githubScriptsRoot);
    expect(restore?.options.output).toBe("tee");
    expect(harness.invalidate).toHaveBeenCalledWith("npm.github-scripts");
    expect(harness.invalidate).toHaveBeenCalledTimes(1);
    expect(harness.inspect).toHaveBeenCalledWith("npm.github-scripts");
    expect(harness.inspect).toHaveBeenCalledTimes(1);
  });

  it("bounds the restoration command with the mutation timeout instead of a probe timeout", async () => {
    const harness = createInspectionHarness({
      "npm.github-scripts": () => ({kind: "available", value: npmTreeFacts(), durationMs: 1}),
    });
    const {context, runner} = await createHarness({inspection: harness.session});

    await runPhase("workspace.github-scripts-dependencies", context);

    expect(runner.calls.find(({request}) => request.args[0] === "ci")?.options.timeoutMs).toBe(1_200_000);
  });

  it("plans the exact restoration command without executing it or touching inspection in dry-run", async () => {
    const harness = createInspectionHarness();
    const {actions, actionIds} = createActions(true);
    const {context, runner} = await createHarness({
      options: options({dryRun: true}),
      inspection: harness.session,
      actions,
    });

    const result = await runPhase("workspace.github-scripts-dependencies", context);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toContain("workspace.github-scripts-dependencies.npm-ci");
    expect(actionIds).toEqual(["workspace.github-scripts-dependencies.npm-ci"]);
    expect(runner.calls.some(({request}) => request.args[0] === "ci")).toBe(false);
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.inspect).not.toHaveBeenCalled();
  });

  it("fails explicitly and reports no invalidation when the restoration action is declined", async () => {
    const harness = createInspectionHarness();
    const {actions, actionIds} = createActions(false, {"workspace.github-scripts-dependencies.npm-ci": "declined"});
    const {context, runner} = await createHarness({inspection: harness.session, actions});

    const result = await runPhase("workspace.github-scripts-dependencies", context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Declined action: workspace.github-scripts-dependencies.npm-ci");
    expect(actionIds).toEqual(["workspace.github-scripts-dependencies.npm-ci"]);
    expect(runner.calls.some(({request}) => request.args[0] === "ci")).toBe(false);
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.inspect).not.toHaveBeenCalled();
  });

  it("fails when npm ci fails, without invalidating or re-inspecting", async () => {
    const harness = createInspectionHarness();
    const {context} = await createHarness({
      inspection: harness.session,
      respond: (request) => (request.args[0] === "ci" ? exited(1, {stderr: "restore failed"}) : defaultOutcome(request)),
    });

    const result = await runPhase("workspace.github-scripts-dependencies", context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("restore failed");
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.inspect).not.toHaveBeenCalled();
  });

  it("fails when the refreshed npm.github-scripts facts remain unavailable after npm ci", async () => {
    const harness = createInspectionHarness({
      "npm.github-scripts": () => ({kind: "unavailable", reason: "npm dependency inspection could not be started.", durationMs: 1}),
    });
    const {actions, actionIds} = createActions(false);
    const {context} = await createHarness({inspection: harness.session, actions});

    const result = await runPhase("workspace.github-scripts-dependencies", context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("npm dependency inspection could not be started.");
    expect(harness.invalidate).toHaveBeenCalledWith("npm.github-scripts");
    expect(actionIds).toEqual(["workspace.github-scripts-dependencies.npm-ci"]);
  });

  it("fails when the refreshed npm.github-scripts facts remain invalid after npm ci", async () => {
    const harness = createInspectionHarness({
      "npm.github-scripts": () => ({kind: "invalid", issues: ["npm dependency inspection produced malformed tree data."], durationMs: 1}),
    });
    const {context} = await createHarness({inspection: harness.session});

    const result = await runPhase("workspace.github-scripts-dependencies", context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("npm dependency inspection produced malformed tree data.");
  });

  it("fails with safe problem evidence when the refreshed tree remains broken after npm ci", async () => {
    const harness = createInspectionHarness({
      "npm.github-scripts": () => ({
        kind: "available",
        value: npmTreeFacts({valid: false, problemCount: 1, problems: [{code: "missing", detail: "npm reported missing for 'left-pad'."}]}),
        durationMs: 1,
      }),
    });
    const {context} = await createHarness({inspection: harness.session});

    const result = await runPhase("workspace.github-scripts-dependencies", context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("npm reported missing for 'left-pad'.");
  });
});

describe("workspace generators", () => {
  it("validates Nx metadata and generates artifacts through a typed nested generation invocation", async () => {
    const {actions, actionIds, run: runAction} = createActions(false);
    const {context, runner, generate} = await createHarness({files: generatedArtifactFiles(), actions});

    const result = await runPhase("workspace.generators", context);

    expect(result.status).toBe("succeeded");
    expect(actionIds).toEqual(["workspace.generators.generate"]);
    expect(runAction.mock.calls[0]?.[0]).toMatchObject({id: "workspace.generators.generate", scope: "repository"});
    expect(runner.calls.map(({request}) => request)).toEqual([
      {command: "npx", args: ["--no-install", "nx", "show", "projects", "--json"]},
    ]);
    expect(runner.calls[0]?.options.cwd).toBe(FIXTURE_ROOT);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledWith({verbose: false, env: false, i18n: true, gql: true, artifacts: true});
  });

  it("propagates the setup verbosity into the nested generation invocation", async () => {
    const {context, generate} = await createHarness({options: options({verbose: true}), files: generatedArtifactFiles()});

    await runPhase("workspace.generators", context);

    expect(generate).toHaveBeenCalledWith(expect.objectContaining({verbose: true}));
  });

  it.each([
    ["malformed", "not json"],
    ["empty", "[]"],
    ["wrong-shaped", '{"projects":["website"]}'],
    ["invalid project names", '[""]'],
  ])("rejects %s Nx JSON", async (_name, stdout) => {
    const {actions, actionIds} = createActions(false);
    const {context, generate} = await createHarness({
      actions,
      files: generatedArtifactFiles(),
      respond: (request) => (request.command === "npx" ? succeeded(stdout) : defaultOutcome(request)),
    });

    const result = await runPhase("workspace.generators", context);

    expect(result.status).toBe("failed");
    expect(actionIds).toEqual(["workspace.generators.generate"]);
    expect(generate).not.toHaveBeenCalled();
  });

  it("rejects failed Nx execution even when stdout contains valid JSON", async () => {
    const {actions, actionIds} = createActions(false);
    const {context, generate} = await createHarness({
      actions,
      files: generatedArtifactFiles(),
      respond: (request) => (request.command === "npx" ? exited(1, {stdout: '["website"]', stderr: "nx failed"}) : defaultOutcome(request)),
    });

    const result = await runPhase("workspace.generators", context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("nx failed");
    expect(actionIds).toEqual(["workspace.generators.generate"]);
    expect(generate).not.toHaveBeenCalled();
  });

  it("names the generator that stopped a nonzero completed nested generation", async () => {
    const {context} = await createHarness({files: generatedArtifactFiles(), generation: stoppedGeneration("gql")});

    const result = await runPhase("workspace.generators", context);

    expect(result.status).toBe("failed");
    const evidence = result.evidence.join("\n");
    expect(evidence).toContain("gql");
    expect(evidence).toMatch(/generat/i);
    // Bounded typed context only: no unsafe child output is copied into setup evidence.
    expect(evidence).toContain("i18n");
    expect(evidence).not.toContain("env");
  });

  it("fails when the nested generation itself failed", async () => {
    const {context} = await createHarness({
      files: generatedArtifactFiles(),
      generation: {
        status: "failed",
        failure: {kind: "operational", message: "The i18n generator failed.", evidence: []},
        exitCode: 1,
      },
    });

    const result = await runPhase("workspace.generators", context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("The i18n generator failed.");
  });

  it("propagates a cancelled nested generation instead of degrading it to a failed phase", async () => {
    const {context} = await createHarness({
      files: generatedArtifactFiles(),
      generation: {
        status: "cancelled",
        failure: {kind: "cancelled", message: "The command was interrupted.", evidence: []},
        exitCode: 130,
      },
    });

    await expect(runPhase("workspace.generators", context)).rejects.toMatchObject({
      name: "CommandCancellation",
      exitCode: 130,
    });
  });

  it("checks every required generated artifact postcondition", async () => {
    for (const missingPath of expectedGeneratedArtifacts()) {
      const present = expectedGeneratedArtifacts().filter((path) => path !== missingPath);
      const {context} = await createHarness({files: generatedArtifactFiles(present)});

      const result = await runPhase("workspace.generators", context);

      expect(result.status, missingPath).toBe("failed");
      expect(result.evidence.join("\n"), missingPath).toContain(missingPath);
    }
  });

  it("does not own the Next-generated locale declaration", async () => {
    const nextDeclaration = resolve(FIXTURE_PATHS.websiteRoot, "messages", "en.d.json.ts");
    const {context, files} = await createHarness({files: generatedArtifactFiles()});

    expect(expectedGeneratedArtifacts()).not.toContain(nextDeclaration);
    await expect(files.exists(nextDeclaration)).resolves.toBe(false);
    await expect(runPhase("workspace.generators", context)).resolves.toMatchObject({status: "succeeded"});
  });

  it("reports generated artifact I/O failures instead of inferring a missing artifact", async () => {
    const inaccessibleArtifact = expectedGeneratedArtifacts()[0];
    if (inaccessibleArtifact === undefined) {
      throw new Error("Expected at least one generated artifact.");
    }
    const {context} = await createHarness({
      files: generatedArtifactFiles(),
      wrapFiles: (files) => ({
        ...files,
        inspect: async (path: string) => {
          if (path === inaccessibleArtifact) {
            throw new FileSystemError("inspect", path, "EIO: simulated inspect failure", {code: "EIO"});
          }
          return files.inspect(path);
        },
      }),
    });

    const result = await runPhase("workspace.generators", context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("EIO");
    expect(result.evidence.join("\n")).not.toContain(`Missing generated artifact: ${inaccessibleArtifact}`);
  });

  it("returns a traversable skipped result in dry-run and names the generator action", async () => {
    const {actions, actionIds} = createActions(true);
    const {context, runner, generate} = await createHarness({options: options({dryRun: true}), actions});

    const result = await runPhase("workspace.generators", context);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toContain("workspace.generators.generate");
    expect(actionIds).toEqual(["workspace.generators.generate"]);
    expect(runner.calls).toHaveLength(0);
    expect(generate).not.toHaveBeenCalled();
  });

  it("fails explicitly when the generator action is declined", async () => {
    const {actions} = createActions(false, {"workspace.generators.generate": "declined"});
    const {context, generate} = await createHarness({actions});

    const result = await runPhase("workspace.generators", context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Declined action: workspace.generators.generate");
    expect(generate).not.toHaveBeenCalled();
  });
});

describe("workspace phase runtime contract", () => {
  it("fails loudly when a migrated phase is given a context without its runtime", async () => {
    const {context} = await createHarness();
    const {runtime: _runtime, ...withoutRuntime} = context;

    await expect(findPhase("workspace.root-dependencies").run(withoutRuntime as SetupContext)).rejects.toThrow(/runtime/i);
  });
});
