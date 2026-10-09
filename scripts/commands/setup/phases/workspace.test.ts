// @vitest-environment node
/**
 * @fileoverview Contract tests for the dependency-free workspace setup phases.
 * @module scripts/commands/setup/phases/workspace.test
 *
 * @remarks
 * Every phase test runs the real Effect phase on the in-memory `makeTestLayer` harness: an
 * in-memory repository fixture, request-driven scripted commands, a recording inspection session,
 * a recording (or the production dry-run) `SetupActions`, and a fake generation program. Phases
 * run under a counting clock (see `runPhase`), so each reports the deterministic duration of its
 * legacy test clock. No test in this file reads the live checkout, spawns a process, or mutates
 * disk state.
 */

import {resolve} from "node:path";

import {Effect, Exit, Layer, PlatformError, Terminal} from "effect";
import {describe, expect, it, vi} from "vitest";

import {createRepositoryPaths, type RepositoryPaths} from "../../../common/repository-paths.ts";
import type {RepositoryRequirements} from "../../../common/requirements.ts";
import {getExpectedTaxonomyArtifactPaths} from "../../../common/taxonomy-artifacts.ts";
import type {NpmTreeFacts} from "../../../inspection/packages.ts";
import type {InspectionOutcome} from "../../../inspection/types.ts";
import {Presenter} from "../../../platform/Output.ts";
import type {ProcessRequest} from "../../../platform/Process.ts";
import {makeTestLayer, type RecordedProcessCall, type TestHarness} from "../../../platform/testing.ts";
import type {GenerateInput, GenerateResult, GenerateTaskName} from "../../generate/index.ts";
import type {SetupActions} from "../actions.ts";
import {
  patchReadOnlyFiles,
  productionActions,
  recordingActions,
  recordingFileSystem,
  recordingInspection,
  runPhase as runPhaseWith,
  runPhaseExit,
  scriptedCommands,
  type InspectionProviders,
  type RecordingInspection,
  type ScriptedCommandOutcome,
} from "../phase-testing.ts";
import type {SetupContext, SetupInput, SetupPhaseResult} from "../types.ts";
import {createWorkspaceSetupPhases, workspaceSetupPhases, type WorkspaceGenerateProgram} from "./workspace.ts";

/** Fixture repository root; only the in-memory filesystem ever observes it. */
const FIXTURE_ROOT = resolve("/fixture/arolariu.ro");
const FIXTURE_PATHS: RepositoryPaths = createRepositoryPaths(FIXTURE_ROOT);
/** Executable path reported by the test environment snapshot. */
const FIXTURE_EXECUTABLE_PATH = "/usr/bin/node";
/** Version reported by both `node --version` and the running runtime executable by default. */
const FIXTURE_NODE_VERSION = "v24.5.0";

function succeeded(stdout: string = "", stderr: string = ""): ScriptedCommandOutcome {
  return {kind: "succeeded", exitCode: 0, stdout, stderr, durationMs: 1};
}

function exited(exitCode: number, patch: Readonly<{stdout?: string; stderr?: string}> = {}): ScriptedCommandOutcome {
  return {kind: "exited", exitCode, stdout: patch.stdout ?? "", stderr: patch.stderr ?? "", durationMs: 1};
}

function spawnFailed(message: string): ScriptedCommandOutcome {
  return {kind: "spawn-failed", message, stdout: "", stderr: "", durationMs: 1};
}

function defaultOutcome(request: Readonly<ProcessRequest>): ScriptedCommandOutcome {
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

/** A recording inspection session over npm tree outcome providers; every other key is unavailable. */
function createInspectionHarness(
  overrides: Readonly<Partial<Record<NpmInspectionKey, () => InspectionOutcome<NpmTreeFacts>>>> = {},
): RecordingInspection {
  return recordingInspection(overrides as InspectionProviders);
}

/** Completed generation result returned by the fake generation program unless a test overrides it. */
function completedGeneration(): GenerateResult {
  return {selected: ["i18n", "gql", "artifacts"], completed: ["i18n", "gql", "artifacts"]};
}

/**
 * The realistic stopped generation: one generator stopped the run, and the typed result names it
 * even though the composed run renders nothing itself.
 *
 * @param failed - Generator that stopped the run.
 * @returns The stopped generation result.
 */
function stoppedGeneration(failed: GenerateTaskName): GenerateResult {
  return {selected: ["i18n", "gql", "artifacts"], completed: ["i18n"], failed};
}

/** A failing mutation of the in-memory filesystem, reported like a Node `EACCES`/`EIO` failure. */
function simulatedFailure(method: string, path: string, description: string): PlatformError.PlatformError {
  return PlatformError.systemError({_tag: "Unknown", module: "FileSystem", method, pathOrDescriptor: path, description});
}

interface WorkspaceHarnessInput {
  /** Parsed setup options for this phase run. */
  readonly options?: SetupInput;
  /** Manifest-derived requirements shared by the phase. */
  readonly requirements?: RepositoryRequirements;
  /** Recording inspection session the phase consumes facts through. */
  readonly inspection?: RecordingInspection;
  /** Files overlaid on the in-memory repository fixture. */
  readonly files?: Readonly<Record<string, string>>;
  /** Replaces the whole in-memory repository fixture. */
  readonly replaceFiles?: Readonly<Record<string, string>>;
  /** Overrides harness `ReadOnlyFiles` members, for I/O failure simulation. */
  readonly readOnlyFiles?: Parameters<typeof patchReadOnlyFiles>[0];
  /** Receives every mutating filesystem call. */
  readonly fileMutations?: string[];
  /** Request-driven command outcomes. */
  readonly respond?: (request: Readonly<ProcessRequest>) => ScriptedCommandOutcome;
  /** The composed generation program's result, or the program itself. */
  readonly generation?: GenerateResult | WorkspaceGenerateProgram;
  /** Consent policy; defaults to a recording one derived from `options.dryRun`. */
  readonly actions?: Layer.Layer<SetupActions, never, Presenter>;
}

interface WorkspaceHarness {
  /** The setup context handed to the phase under test. */
  readonly context: SetupContext;
  /** The in-memory platform harness. */
  readonly harness: TestHarness;
  /** Recorded generation invocations. */
  readonly generate: ReturnType<typeof vi.fn<(input: Readonly<GenerateInput>) => void>>;
  /** Every recorded process call, in order. */
  readonly calls: () => readonly RecordedProcessCall[];
  /** Runs one workspace phase to its result. */
  readonly run: (id: string) => Promise<SetupPhaseResult>;
  /** Runs one workspace phase to its exit. */
  readonly runExit: (id: string) => Promise<Exit.Exit<SetupPhaseResult>>;
}

/**
 * Assembles the harness, services, and setup context one workspace phase test runs against.
 *
 * @param input - Optional seam replacements for this test.
 * @returns The context, the harness, and the phase runners.
 */
function createHarness(input: Readonly<WorkspaceHarnessInput> = {}): WorkspaceHarness {
  const setupOptions = input.options ?? options();
  const harness = makeTestLayer({
    files: input.replaceFiles ?? fixtureFiles(input.files ?? {}),
    processes: [scriptedCommands((request) => (input.respond ?? defaultOutcome)(request))],
    environment: {executablePath: FIXTURE_EXECUTABLE_PATH},
    context: "setup::workspace",
  });

  const generation = input.generation ?? completedGeneration();
  const generate = vi.fn<(input: Readonly<GenerateInput>) => void>();
  const program: WorkspaceGenerateProgram = (generateInput) =>
    Effect.suspend(() => {
      generate(generateInput);
      return typeof generation === "function" ? generation(generateInput) : Effect.succeed(generation);
    });
  const phases = createWorkspaceSetupPhases({generate: program});

  const readOnlyPatch = input.readOnlyFiles;
  const layer = Layer.mergeAll(
    input.actions ?? recordingActions(setupOptions.dryRun).layer,
    readOnlyPatch === undefined ? Layer.empty : patchReadOnlyFiles(readOnlyPatch),
    input.fileMutations === undefined ? Layer.empty : recordingFileSystem(input.fileMutations),
  ).pipe(Layer.provideMerge(harness.layer));

  const context: SetupContext = {
    options: setupOptions,
    paths: FIXTURE_PATHS,
    requirements: input.requirements ?? requirements(),
    inspection: (input.inspection ?? createInspectionHarness()).session,
  };

  const findPhase = (id: string): (typeof phases)[number] => {
    const phase = phases.find((candidate) => candidate.id === id);
    if (phase === undefined) {
      throw new Error(`Missing workspace phase '${id}'.`);
    }
    return phase;
  };

  return {
    context,
    harness,
    generate,
    calls: harness.processCalls,
    run: (id) => runPhaseWith(findPhase(id), context, layer),
    runExit: (id) => runPhaseExit(findPhase(id), context, layer),
  };
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
    const {run, calls} = createHarness();

    const result = await run("workspace.prerequisites");

    expect(result.status).toBe("succeeded");
    expect(calls().map(({request}) => request)).toEqual([
      {command: "git", args: ["--version"]},
      {command: "node", args: ["--version"]},
      {command: "npm", args: ["--version"]},
      {command: FIXTURE_EXECUTABLE_PATH, args: ["--version"]},
    ]);
    expect(calls().map(({options: runOptions}) => runOptions.cwd)).toEqual([FIXTURE_ROOT, FIXTURE_ROOT, FIXTURE_ROOT, FIXTURE_ROOT]);
  });

  it("runs every probe with the bounded setup command defaults and echoes commands only under --verbose", async () => {
    const quiet = createHarness();
    const verbose = createHarness({options: options({verbose: true})});

    await quiet.run("workspace.prerequisites");
    await verbose.run("workspace.prerequisites");

    expect(quiet.calls().map(({options: runOptions}) => runOptions)).toEqual(
      Array.from({length: 4}, () => ({cwd: FIXTURE_ROOT, timeout: 120_000, echo: false, failureOutput: "full"})),
    );
    expect(verbose.calls().map(({options: runOptions}) => runOptions.echo)).toEqual([true, true, true, true]);
  });

  it("fails when the canonical package is not this repository", async () => {
    const {run, calls} = createHarness({
      files: {[FIXTURE_PATHS.packageJson]: JSON.stringify({name: "wrong-repository"})},
    });

    const result = await run("workspace.prerequisites");

    expect(result.status).toBe("failed");
    expect(result.summary).toMatch(/repository/i);
    expect(calls()).toHaveLength(0);
  });

  it("fails when the canonical repository identity is missing", async () => {
    const {run, calls} = createHarness({replaceFiles: {}});

    const result = await run("workspace.prerequisites");

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain(FIXTURE_PATHS.packageJson);
    expect(calls()).toHaveLength(0);
  });

  it("fails with installation guidance when Git is unavailable", async () => {
    const {run} = createHarness({
      respond: (request) => (request.command === "git" ? spawnFailed("git not found") : defaultOutcome(request)),
    });

    const result = await run("workspace.prerequisites");

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toMatch(/install Git/i);
  });

  it.each([
    ["plain", "git version 2.50.0\n"],
    ["Apple", "git version 2.39.5 (Apple Git-154)\n"],
    ["Windows", "git version 2.51.0.windows.1\n"],
  ])("accepts %s vendor Git output with supported Node and npm versions", async (_vendor, gitOutput) => {
    const {run} = createHarness({
      respond: (request) => (request.command === "git" ? succeeded(gitOutput) : defaultOutcome(request)),
    });

    const result = await run("workspace.prerequisites");

    expect(result.status).toBe("succeeded");
    expect(result.evidence.join("\n")).toContain(gitOutput.trim());
    expect(result.evidence.join("\n")).toContain(FIXTURE_NODE_VERSION);
    expect(result.evidence.join("\n")).toContain("11.0.0");
  });

  it("rejects malformed Git output", async () => {
    const {run} = createHarness({
      respond: (request) => (request.command === "git" ? succeeded("git version vendor-only\n") : defaultOutcome(request)),
    });

    const result = await run("workspace.prerequisites");

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/malformed.*vendor-only/i);
  });

  it("reports malformed repository identity instead of inferring a missing checkout", async () => {
    const {run, calls} = createHarness({files: {[FIXTURE_PATHS.packageJson]: "{not-json"}});

    const result = await run("workspace.prerequisites");

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/parse|JSON/i);
    expect(calls()).toHaveLength(0);
  });

  it("reports repository identity permission failures without probing or mutating", async () => {
    const {run, calls} = createHarness({
      readOnlyFiles: (files) => ({
        readFileString: (path, encoding) =>
          path === FIXTURE_PATHS.packageJson
            ? Effect.fail(simulatedFailure("readFileString", path, "EACCES: simulated read failure"))
            : files.readFileString(path, encoding),
      }),
    });

    const result = await run("workspace.prerequisites");

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("EACCES");
    expect(calls()).toHaveLength(0);
  });

  it.each([
    ["Node", {node: {major: 25, minor: 0, patch: 0}}],
    ["npm", {npm: {major: 12, minor: 0, patch: 0}}],
  ])("fails with manual installation guidance for unsupported %s", async (tool, requirementPatch) => {
    const {run} = createHarness({requirements: requirements(requirementPatch)});

    const result = await run("workspace.prerequisites");

    expect(result.status).toBe("failed");
    expect(result.nextActions.join("\n")).toMatch(new RegExp(`install.*${tool}|${tool}.*install`, "i"));
  });

  it.each([
    ["v24.14.9", "failed"],
    ["v24.15.0", "succeeded"],
    ["v25.9.9", "failed"],
    ["v26.0.0", "succeeded"],
  ])("enforces the declared LTS/current branches for %s", async (version, status) => {
    const engine = "^24.15.0 || >=26.0.0";
    const {run, calls} = createHarness({
      requirements: requirements({node: {major: 24, minor: 15, patch: 0, nextSupportedMajor: 26}}),
      files: {
        [FIXTURE_PATHS.packageJson]: JSON.stringify({
          name: "@arolariu/monorepo",
          engines: {node: engine, npm: ">=11"},
          devDependencies: {},
        }),
      },
      respond: (request) =>
        request.command === "node" || request.command === FIXTURE_EXECUTABLE_PATH ? succeeded(`${version}\n`) : defaultOutcome(request),
    });

    const result = await run("workspace.prerequisites");

    expect(result.status).toBe(status);
    expect(result.evidence.join("\n")).toContain(engine);
    expect(calls()).toHaveLength(4);
  });

  it("fails when node --version contradicts the running runtime executable", async () => {
    const {run} = createHarness({
      respond: (request) => (request.command === "node" ? succeeded("v24.9.0\n") : defaultOutcome(request)),
    });

    const result = await run("workspace.prerequisites");

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/running Node\.js runtime/i);
    expect(result.nextActions.join("\n")).toMatch(/same supported Node\.js executable/i);
  });

  it("fails when the running runtime executable does not report a usable version", async () => {
    const {run} = createHarness({
      respond: (request) => (request.command === FIXTURE_EXECUTABLE_PATH ? spawnFailed("probe failed") : defaultOutcome(request)),
    });

    const result = await run("workspace.prerequisites");

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/running Node\.js runtime/i);
  });

  it("fails invalid manifest-derived requirements instead of guessing", async () => {
    const {run} = createHarness({files: {[resolve(FIXTURE_ROOT, ".node-version")]: "25\n"}});

    const result = await run("workspace.prerequisites");

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
    const inspection = createInspectionHarness({"npm.root": () => ({kind: "available", value: npmTreeFacts(), durationMs: 1})});
    const actions = recordingActions(false);
    const {run, calls} = createHarness({inspection, actions: actions.layer});

    const result = await run("workspace.root-dependencies");

    expect(result.status).toBe("succeeded");
    expect(result.evidence.join("\n")).toContain("42");
    expect(inspection.inspect).toHaveBeenCalledTimes(1);
    expect(inspection.inspect).toHaveBeenCalledWith("npm.root");
    expect(actions.run).not.toHaveBeenCalled();
    expect(calls().some(({request}) => request.command === "npm" && request.args[0] === "ci")).toBe(false);
  });

  it("fails with exact npm-ci guidance when npm.root is unavailable", async () => {
    const inspection = createInspectionHarness({
      "npm.root": () => ({kind: "unavailable", reason: "npm dependency inspection could not be started.", durationMs: 1}),
    });
    const actions = recordingActions(false);
    const {run} = createHarness({inspection, actions: actions.layer});

    const result = await run("workspace.root-dependencies");

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("npm dependency inspection could not be started.");
    expect(result.nextActions.join("\n")).toContain("npm ci");
    expect(actions.run).not.toHaveBeenCalled();
  });

  it("fails with exact npm-ci guidance when npm.root is invalid", async () => {
    const inspection = createInspectionHarness({
      "npm.root": () => ({kind: "invalid", issues: ["npm dependency inspection produced malformed tree data."], durationMs: 1}),
    });
    const actions = recordingActions(false);
    const {run} = createHarness({inspection, actions: actions.layer});

    const result = await run("workspace.root-dependencies");

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("npm dependency inspection produced malformed tree data.");
    expect(result.nextActions.join("\n")).toContain("npm ci");
    expect(actions.run).not.toHaveBeenCalled();
  });

  it("fails with exact npm-ci guidance and safe problem evidence when the live tree is broken", async () => {
    const inspection = createInspectionHarness({
      "npm.root": () => ({
        kind: "available",
        value: npmTreeFacts({valid: false, problemCount: 1, problems: [{code: "missing", detail: "npm reported missing for 'left-pad'."}]}),
        durationMs: 1,
      }),
    });
    const actions = recordingActions(false);
    const {run} = createHarness({inspection, actions: actions.layer});

    const result = await run("workspace.root-dependencies");

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("npm reported missing for 'left-pad'.");
    expect(result.nextActions.join("\n")).toContain("npm ci");
    expect(actions.run).not.toHaveBeenCalled();
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
    const inspection = createInspectionHarness({
      "npm.github-scripts": () => ({kind: "available", value: npmTreeFacts(), durationMs: 1}),
    });
    const actions = recordingActions(false);
    const {run, calls} = createHarness({inspection, actions: actions.layer});

    const result = await run("workspace.github-scripts-dependencies");

    expect(result.status).toBe("succeeded");
    expect(actions.actionIds).toEqual(["workspace.github-scripts-dependencies.npm-ci"]);
    const restore = calls().find(({request}) => request.args[0] === "ci");
    expect(restore?.request).toEqual({command: "npm", args: ["ci", "--prefer-offline", "--no-audit", "--no-fund"]});
    expect(restore?.options.cwd).toBe(FIXTURE_PATHS.githubScriptsRoot);
    expect(restore?.options.output).toBe("tee");
    expect(inspection.invalidate).toHaveBeenCalledWith("npm.github-scripts");
    expect(inspection.invalidate).toHaveBeenCalledTimes(1);
    expect(inspection.inspect).toHaveBeenCalledWith("npm.github-scripts");
    expect(inspection.inspect).toHaveBeenCalledTimes(1);
  });

  it("bounds the restoration command with the mutation timeout instead of a probe timeout", async () => {
    const inspection = createInspectionHarness({
      "npm.github-scripts": () => ({kind: "available", value: npmTreeFacts(), durationMs: 1}),
    });
    const {run, calls} = createHarness({inspection});

    await run("workspace.github-scripts-dependencies");

    expect(calls().find(({request}) => request.args[0] === "ci")?.options.timeout).toBe(1_200_000);
  });

  it("plans the exact restoration command without executing it or touching inspection in dry-run", async () => {
    const inspection = createInspectionHarness();
    const actions = recordingActions(true);
    const {run, calls} = createHarness({options: options({dryRun: true}), inspection, actions: actions.layer});

    const result = await run("workspace.github-scripts-dependencies");

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toContain("workspace.github-scripts-dependencies.npm-ci");
    expect(actions.actionIds).toEqual(["workspace.github-scripts-dependencies.npm-ci"]);
    expect(calls().some(({request}) => request.args[0] === "ci")).toBe(false);
    expect(inspection.invalidate).not.toHaveBeenCalled();
    expect(inspection.inspect).not.toHaveBeenCalled();
  });

  it("fails explicitly and reports no invalidation when the restoration action is declined", async () => {
    const inspection = createInspectionHarness();
    const actions = recordingActions(false, {"workspace.github-scripts-dependencies.npm-ci": "declined"});
    const {run, calls} = createHarness({inspection, actions: actions.layer});

    const result = await run("workspace.github-scripts-dependencies");

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Declined action: workspace.github-scripts-dependencies.npm-ci");
    expect(actions.actionIds).toEqual(["workspace.github-scripts-dependencies.npm-ci"]);
    expect(calls().some(({request}) => request.args[0] === "ci")).toBe(false);
    expect(inspection.invalidate).not.toHaveBeenCalled();
    expect(inspection.inspect).not.toHaveBeenCalled();
  });

  it("fails when npm ci fails, without invalidating or re-inspecting", async () => {
    const inspection = createInspectionHarness();
    const {run} = createHarness({
      inspection,
      respond: (request) => (request.args[0] === "ci" ? exited(1, {stderr: "restore failed"}) : defaultOutcome(request)),
    });

    const result = await run("workspace.github-scripts-dependencies");

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("restore failed");
    expect(inspection.invalidate).not.toHaveBeenCalled();
    expect(inspection.inspect).not.toHaveBeenCalled();
  });

  it("propagates an interruption of the restoration instead of degrading it to a failed phase", async () => {
    const inspection = createInspectionHarness();
    const {runExit} = createHarness({
      inspection,
      respond: (request) => (request.args[0] === "ci" ? {kind: "cancelled"} : defaultOutcome(request)),
    });

    const exit = await runExit("workspace.github-scripts-dependencies");

    expect(Exit.hasInterrupts(exit)).toBe(true);
    expect(inspection.invalidate).not.toHaveBeenCalled();
  });

  it("fails when the refreshed npm.github-scripts facts remain unavailable after npm ci", async () => {
    const inspection = createInspectionHarness({
      "npm.github-scripts": () => ({kind: "unavailable", reason: "npm dependency inspection could not be started.", durationMs: 1}),
    });
    const actions = recordingActions(false);
    const {run} = createHarness({inspection, actions: actions.layer});

    const result = await run("workspace.github-scripts-dependencies");

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("npm dependency inspection could not be started.");
    expect(inspection.invalidate).toHaveBeenCalledWith("npm.github-scripts");
    expect(actions.actionIds).toEqual(["workspace.github-scripts-dependencies.npm-ci"]);
  });

  it("fails when the refreshed npm.github-scripts facts remain invalid after npm ci", async () => {
    const inspection = createInspectionHarness({
      "npm.github-scripts": () => ({kind: "invalid", issues: ["npm dependency inspection produced malformed tree data."], durationMs: 1}),
    });
    const {run} = createHarness({inspection});

    const result = await run("workspace.github-scripts-dependencies");

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("npm dependency inspection produced malformed tree data.");
  });

  it("fails with safe problem evidence when the refreshed tree remains broken after npm ci", async () => {
    const inspection = createInspectionHarness({
      "npm.github-scripts": () => ({
        kind: "available",
        value: npmTreeFacts({valid: false, problemCount: 1, problems: [{code: "missing", detail: "npm reported missing for 'left-pad'."}]}),
        durationMs: 1,
      }),
    });
    const {run} = createHarness({inspection});

    const result = await run("workspace.github-scripts-dependencies");

    expect(result.status).toBe("failed");
    expect(result.evidence).toContain("npm reported missing for 'left-pad'.");
  });
});

describe("workspace generators", () => {
  it("validates Nx metadata and generates artifacts through a typed nested generation run", async () => {
    const actions = recordingActions(false);
    const {run, calls, generate} = createHarness({files: generatedArtifactFiles(), actions: actions.layer});

    const result = await run("workspace.generators");

    expect(result.status).toBe("succeeded");
    expect(actions.actionIds).toEqual(["workspace.generators.generate"]);
    expect(actions.run.mock.calls[0]?.[0]).toMatchObject({id: "workspace.generators.generate", scope: "repository"});
    expect(calls().map(({request}) => request)).toEqual([{command: "npx", args: ["--no-install", "nx", "show", "projects", "--json"]}]);
    expect(calls()[0]?.options.cwd).toBe(FIXTURE_ROOT);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledWith({verbose: false, env: false, i18n: true, gql: true, artifacts: true});
  });

  it("propagates the setup verbosity into the nested generation run", async () => {
    const {run, generate} = createHarness({options: options({verbose: true}), files: generatedArtifactFiles()});

    await run("workspace.generators");

    expect(generate).toHaveBeenCalledWith(expect.objectContaining({verbose: true}));
  });

  it("runs the composed generation silently, so none of its output reaches setup", async () => {
    const {run, harness} = createHarness({
      files: generatedArtifactFiles(),
      generation: () =>
        Effect.gen(function* () {
          const presenter = yield* Presenter;
          yield* Effect.logInfo("Running internationalization (i18n) generator...");
          yield* presenter.success("Generated every checkout artifact.");
          yield* presenter.line("stdout", "nested generation line");
          return completedGeneration();
        }),
    });

    const result = await run("workspace.generators");

    expect(result.status).toBe("succeeded");
    expect(harness.output()).toEqual([]);
  });

  it.each([
    ["malformed", "not json"],
    ["empty", "[]"],
    ["wrong-shaped", '{"projects":["website"]}'],
    ["invalid project names", '[""]'],
  ])("rejects %s Nx JSON", async (_name, stdout) => {
    const actions = recordingActions(false);
    const {run, generate} = createHarness({
      actions: actions.layer,
      files: generatedArtifactFiles(),
      respond: (request) => (request.command === "npx" ? succeeded(stdout) : defaultOutcome(request)),
    });

    const result = await run("workspace.generators");

    expect(result.status).toBe("failed");
    expect(actions.actionIds).toEqual(["workspace.generators.generate"]);
    expect(generate).not.toHaveBeenCalled();
  });

  it("rejects failed Nx execution even when stdout contains valid JSON", async () => {
    const actions = recordingActions(false);
    const {run, generate} = createHarness({
      actions: actions.layer,
      files: generatedArtifactFiles(),
      respond: (request) => (request.command === "npx" ? exited(1, {stdout: '["website"]', stderr: "nx failed"}) : defaultOutcome(request)),
    });

    const result = await run("workspace.generators");

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("nx failed");
    expect(actions.actionIds).toEqual(["workspace.generators.generate"]);
    expect(generate).not.toHaveBeenCalled();
  });

  it("names the generator that stopped the nested generation run", async () => {
    const {run} = createHarness({files: generatedArtifactFiles(), generation: stoppedGeneration("gql")});

    const result = await run("workspace.generators");

    expect(result).toEqual({
      id: "workspace.generators",
      status: "failed",
      summary: "Repository artifact generation failed.",
      evidence: [
        [
          "Repository artifact generation reported exit code 1.",
          "The 'gql' generator stopped the generation run.",
          "Completed generators: i18n.",
          "Selected generators: i18n, gql, artifacts.",
        ].join("\n"),
      ],
      nextActions: ["Correct the generator failure, then rerun setup."],
      durationMs: 1,
    });
  });

  it("fails when the nested generation run itself failed", async () => {
    const {run} = createHarness({
      files: generatedArtifactFiles(),
      generation: () => Effect.die(new Error("The i18n generator failed.")),
    });

    const result = await run("workspace.generators");

    expect(result.status).toBe("failed");
    expect(result.evidence).toEqual(["Repository artifact generation failed.\nThe i18n generator failed."]);
  });

  it("propagates an interrupted nested generation instead of degrading it to a failed phase", async () => {
    const {runExit} = createHarness({files: generatedArtifactFiles(), generation: () => Effect.interrupt});

    const exit = await runExit("workspace.generators");

    expect(Exit.hasInterrupts(exit)).toBe(true);
  });

  it("interrupts setup when the nested generation is quit at a terminal prompt", async () => {
    const {runExit} = createHarness({
      files: generatedArtifactFiles(),
      generation: () => Effect.fail(new Terminal.QuitError()),
    });

    const exit = await runExit("workspace.generators");

    expect(Exit.hasInterrupts(exit)).toBe(true);
  });

  it("checks every required generated artifact postcondition", async () => {
    for (const missingPath of expectedGeneratedArtifacts()) {
      const present = expectedGeneratedArtifacts().filter((path) => path !== missingPath);
      const {run} = createHarness({files: generatedArtifactFiles(present)});

      const result = await run("workspace.generators");

      expect(result.status, missingPath).toBe("failed");
      expect(result.evidence.join("\n"), missingPath).toContain(missingPath);
    }
  });

  it("does not own the Next-generated locale declaration", async () => {
    const nextDeclaration = resolve(FIXTURE_PATHS.websiteRoot, "messages", "en.d.json.ts");
    const {run, harness} = createHarness({files: generatedArtifactFiles()});

    expect(expectedGeneratedArtifacts()).not.toContain(nextDeclaration);
    expect([...harness.files().keys()].some((path) => path.endsWith("en.d.json.ts"))).toBe(false);
    await expect(run("workspace.generators")).resolves.toMatchObject({status: "succeeded"});
  });

  it("reports generated artifact I/O failures instead of inferring a missing artifact", async () => {
    const inaccessibleArtifact = expectedGeneratedArtifacts()[0];
    if (inaccessibleArtifact === undefined) {
      throw new Error("Expected at least one generated artifact.");
    }
    const {run} = createHarness({
      files: generatedArtifactFiles(),
      readOnlyFiles: (files) => ({
        stat: (path) =>
          path === inaccessibleArtifact ? Effect.fail(simulatedFailure("stat", path, "EIO: simulated inspect failure")) : files.stat(path),
      }),
    });

    const result = await run("workspace.generators");

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("EIO");
    expect(result.evidence.join("\n")).not.toContain(`Missing generated artifact: ${inaccessibleArtifact}`);
  });

  it("returns a traversable skipped result in dry-run and names the generator action", async () => {
    const actions = recordingActions(true);
    const {run, calls, generate} = createHarness({options: options({dryRun: true}), actions: actions.layer});

    const result = await run("workspace.generators");

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toContain("workspace.generators.generate");
    expect(actions.actionIds).toEqual(["workspace.generators.generate"]);
    expect(calls()).toHaveLength(0);
    expect(generate).not.toHaveBeenCalled();
  });

  it("fails explicitly when the generator action is declined", async () => {
    const actions = recordingActions(false, {"workspace.generators.generate": "declined"});
    const {run, generate} = createHarness({actions: actions.layer});

    const result = await run("workspace.generators");

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Declined action: workspace.generators.generate");
    expect(generate).not.toHaveBeenCalled();
  });
});

describe("workspace characterization (pre-Effect migration)", () => {
  function withRootPlaceholder(value: unknown): unknown {
    const escapedRoot = JSON.stringify(FIXTURE_ROOT).slice(1, -1);
    return JSON.parse(JSON.stringify(value).split(escapedRoot).join("<root>"));
  }

  function npmTree(scope: NpmTreeFacts["scope"], packageCount: number): InspectionOutcome<NpmTreeFacts> {
    return {kind: "available", value: {scope, valid: true, packageCount, problemCount: 0, problems: []}, durationMs: 1};
  }

  it("pins the exact result of every workspace phase when every tool, tree, and artifact is already present", async () => {
    // Arrange
    const inspection = createInspectionHarness({
      "npm.root": () => npmTree("root", 42),
      "npm.github-scripts": () => npmTree("github-scripts", 7),
    });
    const actions = recordingActions(false);
    const {run, calls} = createHarness({inspection, actions: actions.layer, files: generatedArtifactFiles()});

    // Act
    const results: SetupPhaseResult[] = [];
    for (const phase of workspaceSetupPhases) {
      results.push(await run(phase.id));
    }
    const observed = withRootPlaceholder({results, actionIds: actions.actionIds, commands: calls().map(({request}) => request)});

    // Assert
    expect(observed).toEqual({
      results: [
        {
          id: "workspace.prerequisites",
          status: "succeeded",
          summary: "Repository identity, Git, Node.js, and npm prerequisites are valid.",
          evidence: ["git version 2.50.0", "Node.js v24.5.0 satisfies >=24.0.0.", "npm 11.0.0 satisfies >=11.0.0."],
          nextActions: [],
          durationMs: 1,
        },
        {
          id: "workspace.root-dependencies",
          status: "succeeded",
          summary: "Root workspace dependencies are valid.",
          evidence: ["npm reported 42 installed package(s) with no dependency problems."],
          nextActions: [],
          durationMs: 1,
        },
        {
          id: "workspace.github-scripts-dependencies",
          status: "succeeded",
          summary: ".github scripts dependencies were restored and verified.",
          evidence: [
            "Executed action: workspace.github-scripts-dependencies.npm-ci",
            "npm reported 7 installed package(s) with no dependency problems.",
          ],
          nextActions: [],
          durationMs: 1,
        },
        {
          id: "workspace.generators",
          status: "succeeded",
          summary: "Nx metadata and required generated checkout artifacts are valid.",
          evidence: ["Nx reported 1 project(s).", "Executed action: workspace.generators.generate", "Verified 7 generated artifact(s)."],
          nextActions: [],
          durationMs: 1,
        },
      ],
      actionIds: ["workspace.github-scripts-dependencies.npm-ci", "workspace.generators.generate"],
      commands: [
        {command: "git", args: ["--version"]},
        {command: "node", args: ["--version"]},
        {command: "npm", args: ["--version"]},
        {command: "/usr/bin/node", args: ["--version"]},
        {command: "npm", args: ["ci", "--prefer-offline", "--no-audit", "--no-fund"]},
        {command: "npx", args: ["--no-install", "nx", "show", "projects", "--json"]},
      ],
    });
  });

  it("pins the exact prerequisites result when Git is missing", async () => {
    // Arrange
    const {run, calls} = createHarness({
      respond: (request) => (request.command === "git" ? spawnFailed("git not found") : defaultOutcome(request)),
    });

    // Act
    const result = await run("workspace.prerequisites");
    const observed = withRootPlaceholder({result, commands: calls().map(({request}) => request)});

    // Assert
    expect(observed).toEqual({
      result: {
        id: "workspace.prerequisites",
        status: "failed",
        summary: "Workspace prerequisites are not satisfied.",
        evidence: [
          "Git version probe failed.",
          "Unable to start command: git not found",
          "Node.js v24.5.0 satisfies >=24.0.0.",
          "npm 11.0.0 satisfies >=11.0.0.",
        ],
        nextActions: ["Install Git manually and ensure it is available on PATH, then rerun setup."],
        durationMs: 1,
      },
      commands: [
        {command: "git", args: ["--version"]},
        {command: "node", args: ["--version"]},
        {command: "npm", args: ["--version"]},
        {command: "/usr/bin/node", args: ["--version"]},
      ],
    });
  });

  it("pins the exact .github scripts result when the npm ci restoration fails", async () => {
    // Arrange
    const inspection = createInspectionHarness();
    const actions = recordingActions(false);
    const {run, calls} = createHarness({
      inspection,
      actions: actions.layer,
      respond: (request) => (request.args[0] === "ci" ? exited(1, {stderr: "restore failed"}) : defaultOutcome(request)),
    });

    // Act
    const result = await run("workspace.github-scripts-dependencies");
    const observed = withRootPlaceholder({result, actionIds: actions.actionIds, commands: calls().map(({request}) => request)});

    // Assert
    expect(observed).toEqual({
      result: {
        id: "workspace.github-scripts-dependencies",
        status: "failed",
        summary: ".github scripts dependency setup failed.",
        evidence: ["npm ci failed in <root>\\.github\\scripts.\nCommand exited with code 1.\nstderr: restore failed"],
        nextActions: ["Resolve the reported .github scripts dependency error, then rerun setup."],
        durationMs: 1,
      },
      actionIds: ["workspace.github-scripts-dependencies.npm-ci"],
      commands: [{command: "npm", args: ["ci", "--prefer-offline", "--no-audit", "--no-fund"]}],
    });
  });

  it("pins a mutation-free dry run of every workspace phase when restorations and generated artifacts are pending", async () => {
    // Arrange: the production consent policy (`setupActionsLayer`) in `--dry-run` mode; any prompt dies.
    const options_ = options({dryRun: true});
    const dryRun = productionActions(options_);
    const inspection = createInspectionHarness({"npm.root": () => npmTree("root", 42)});
    const mutations: string[] = [];
    const {run, calls, generate, harness} = createHarness({
      options: options_,
      inspection,
      actions: dryRun.layer,
      fileMutations: mutations,
    });

    // Act
    const results: SetupPhaseResult[] = [];
    for (const phase of workspaceSetupPhases) {
      results.push(await run(phase.id));
    }
    const observed = withRootPlaceholder({
      results,
      actionLines: harness
        .output()
        .map(({stream, text}) => `${stream}: ${text.replace(/\n$/u, "")}`)
        .filter((line) => line.includes("[arolariu::setup] ")),
      executed: dryRun.executed,
      commands: calls().map(({request}) => request),
      generations: generate.mock.calls,
      fileMutations: mutations,
      inspections: inspection.inspect.mock.calls,
      invalidations: inspection.invalidate.mock.calls,
    });

    // Assert
    expect(observed).toEqual({
      results: [
        {
          id: "workspace.prerequisites",
          status: "succeeded",
          summary: "Repository identity, Git, Node.js, and npm prerequisites are valid.",
          evidence: ["git version 2.50.0", "Node.js v24.5.0 satisfies >=24.0.0.", "npm 11.0.0 satisfies >=11.0.0."],
          nextActions: [],
          durationMs: 1,
        },
        {
          id: "workspace.root-dependencies",
          status: "succeeded",
          summary: "Root workspace dependencies are valid.",
          evidence: ["npm reported 42 installed package(s) with no dependency problems."],
          nextActions: [],
          durationMs: 1,
        },
        {
          id: "workspace.github-scripts-dependencies",
          status: "skipped",
          summary: ".github scripts dependency restoration is planned by dry-run.",
          evidence: ["Planned action: workspace.github-scripts-dependencies.npm-ci"],
          nextActions: [],
          durationMs: 1,
        },
        {
          id: "workspace.generators",
          status: "skipped",
          summary: "Repository artifact generation is planned by dry-run.",
          evidence: ["Planned action: workspace.generators.generate"],
          nextActions: [],
          durationMs: 1,
        },
      ],
      actionLines: [
        "stdout: [arolariu::setup] ℹ️ Planned setup action 'workspace.github-scripts-dependencies.npm-ci' (repository): Restore .github scripts dependencies from the lockfile.",
        "stdout: [arolariu::setup] ℹ️ Planned setup action 'workspace.generators.generate' (repository): Generate taxonomy, GraphQL, and internationalization checkout artifacts.",
      ],
      executed: [],
      commands: [
        {command: "git", args: ["--version"]},
        {command: "node", args: ["--version"]},
        {command: "npm", args: ["--version"]},
        {command: "/usr/bin/node", args: ["--version"]},
      ],
      generations: [],
      fileMutations: [],
      inspections: [["npm.root"]],
      invalidations: [],
    });
  });
});
