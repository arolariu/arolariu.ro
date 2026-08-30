/**
 * @fileoverview SvelteKit workspace validation and generated-state preparation.
 * @module scripts.setup.svelte
 */

import {readFile, stat} from "node:fs/promises";
import {resolve} from "node:path";

import type {CommandResult, CommandSpec} from "./common/process.ts";
import {satisfiesMinimum, type MinimumVersion} from "./common/requirements.ts";
import type {SetupContext, SetupPhaseDefinition, SetupPhaseResult} from "./setup.types.ts";

type WorkspaceName = "cv" | "status";
type UnknownRecord = Readonly<Record<string, unknown>>;
type InspectedPathKind = "file" | "directory" | "other" | "missing";
type InstalledEvidenceMode = "inspect" | "defer";

interface WorkspaceDefinition {
  readonly name: WorkspaceName;
  readonly root: (context: SetupContext) => string;
  readonly packageName: string;
  readonly workspace: string;
}

interface SvelteWorkspaceInspection extends SvelteWorkspaceState {
  readonly generatedConfigPath: string;
  readonly generatedConfigKind: InspectedPathKind;
  readonly installedEvidenceDeferred: boolean;
}

/** Injectable filesystem boundaries used by the Svelte setup phase. */
export interface SvelteSetupDependencies {
  /** Reads one UTF-8 text file. */
  readonly readTextFile: (path: string) => Promise<string>;
  /** Inspects whether a path is a file, directory, another object, or absent. */
  readonly inspectPath: (path: string) => Promise<InspectedPathKind>;
}

/** Read-only state for one Svelte workspace. */
export interface SvelteWorkspaceState {
  /** Stable setup workspace name. */
  readonly name: WorkspaceName;
  /** Canonical workspace root. */
  readonly root: string;
  /** Whether manifest, Node, root requirement, and installed package contracts are valid. */
  readonly packageContractValid: boolean;
  /** Whether `.svelte-kit/tsconfig.json` is a regular file. */
  readonly generatedConfigExists: boolean;
  /** Deterministically ordered workspace problems. */
  readonly problems: readonly string[];
}

const REQUIRED_PACKAGES = [
  "@sveltejs/kit",
  "@sveltejs/vite-plugin-svelte",
  "svelte",
  "svelte-adapter-azure-swa",
  "vite",
  "vitest",
  "typescript",
] as const;
const WORKSPACES: Readonly<Record<WorkspaceName, WorkspaceDefinition>> = {
  cv: {
    name: "cv",
    root: (context) => context.paths.cvRoot,
    packageName: "@arolariu/cv",
    workspace: "sites/cv.arolariu.ro",
  },
  status: {
    name: "status",
    root: (context) => context.paths.statusRoot,
    packageName: "@arolariu/status",
    workspace: "sites/status.arolariu.ro",
  },
};
const PREPARE_ACTION_ID = "svelte.prepare";
const PREPARE_COMMAND: CommandSpec = {
  command: "npm",
  args: ["run", "prepare", "--workspace=sites/cv.arolariu.ro", "--workspace=sites/status.arolariu.ro"],
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInterrupted(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isSuccessfulCommand(result: Readonly<CommandResult>): boolean {
  return result.code === 0 && !result.timedOut && result.signal === undefined && result.spawnError === undefined;
}

function commandFailureEvidence(result: Readonly<CommandResult>): readonly string[] {
  return [
    ...(result.spawnError === undefined ? [] : [`Unable to start command: ${result.spawnError}`]),
    ...(result.timedOut ? ["Command timed out."] : []),
    ...(result.signal === undefined ? [] : [`Command stopped with signal ${result.signal}.`]),
    ...(result.code === 0 ? [] : [`Command exited with code ${result.code}.`]),
    ...(result.stdout.trim() === "" ? [] : [`stdout: ${result.stdout.trim()}`]),
    ...(result.stderr.trim() === "" ? [] : [`stderr: ${result.stderr.trim()}`]),
  ];
}

function normalizedVersion(version: MinimumVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

function parseNodeMinimum(value: string): MinimumVersion | null {
  const match = /^>=(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:\.(0|[1-9]\d*))?$/u.exec(value.trim());
  if (match === null) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2] ?? 0),
    patch: Number(match[3] ?? 0),
  };
}

function defaultDependencies(): SvelteSetupDependencies {
  return {
    readTextFile: (path) => readFile(path, "utf8"),
    inspectPath: async (path) => {
      try {
        const entry = await stat(path);
        if (entry.isFile()) {
          return "file";
        }
        if (entry.isDirectory()) {
          return "directory";
        }
        return "other";
      } catch (error: unknown) {
        if (hasErrorCode(error, "ENOENT")) {
          return "missing";
        }
        throw error;
      }
    },
  };
}

function requiredObject(record: UnknownRecord, key: string, source: string, problems: string[]): UnknownRecord | null {
  const value = record[key];
  if (!isRecord(value)) {
    problems.push(`${source}#${key} must be an object.`);
    return null;
  }
  return value;
}

function validateManifest(
  contents: string,
  manifestPath: string,
  definition: WorkspaceDefinition,
  rootNode: MinimumVersion,
  problems: string[],
): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch (error: unknown) {
    problems.push(`Unable to parse ${manifestPath}: ${errorMessage(error)}`);
    return;
  }
  if (!isRecord(parsed)) {
    problems.push(`${manifestPath} must contain a JSON object.`);
    return;
  }

  if (parsed["name"] !== definition.packageName) {
    problems.push(`${manifestPath} must declare exact package name '${definition.packageName}'.`);
  }
  if (typeof parsed["version"] !== "string" || parsed["version"].trim() === "") {
    problems.push(`${manifestPath} must declare a nonempty version string.`);
  }

  const scripts = requiredObject(parsed, "scripts", manifestPath, problems);
  if (scripts !== null && (typeof scripts["prepare"] !== "string" || scripts["prepare"].trim() === "")) {
    problems.push(`${manifestPath}#scripts.prepare must be a nonempty string.`);
  }

  const engines = requiredObject(parsed, "engines", manifestPath, problems);
  if (engines !== null) {
    const node = engines["node"];
    if (typeof node !== "string") {
      problems.push(`${manifestPath}#engines.node must be a string.`);
    } else {
      const siteMinimum = parseNodeMinimum(node);
      if (siteMinimum === null) {
        problems.push(`${manifestPath}#engines.node uses unsupported engine syntax '${node}'.`);
      } else if (!satisfiesMinimum(rootNode, siteMinimum)) {
        problems.push(
          `Root Node minimum ${normalizedVersion(rootNode)} does not satisfy ${definition.name} minimum ${normalizedVersion(siteMinimum)}.`,
        );
      }
    }
  }

  const devDependencies = requiredObject(parsed, "devDependencies", manifestPath, problems);
  if (devDependencies !== null) {
    for (const packageName of REQUIRED_PACKAGES) {
      if (devDependencies[packageName] !== "*") {
        problems.push(`${manifestPath}#devDependencies.${packageName} must be declared exactly as '*'.`);
      }
    }
  }
}

function expectedPackageVersions(context: SetupContext, problems: string[]): ReadonlyMap<string, string> {
  const expected = new Map<string, string>();
  for (const packageName of REQUIRED_PACKAGES) {
    const requirement = context.requirements.packages.get(packageName);
    if (requirement === undefined || requirement.version.trim() === "") {
      problems.push(`Manifest-derived root requirement '${packageName}' is missing or blank.`);
    } else {
      expected.set(packageName, requirement.version);
    }
  }
  return expected;
}

function packageInspectionCommand(definition: WorkspaceDefinition): CommandSpec {
  return {
    command: "npm",
    args: ["ls", "--json", "--depth=0", `--workspace=${definition.workspace}`, ...REQUIRED_PACKAGES],
  };
}

function collectInstalledVersions(
  value: unknown,
  targets: ReadonlySet<string>,
  versions: Map<string, string[]>,
  problems: string[],
  location: string,
): void {
  if (!isRecord(value)) {
    return;
  }
  const dependencies = value["dependencies"];
  if (!isRecord(dependencies)) {
    return;
  }
  for (const [name, dependency] of Object.entries(dependencies)) {
    const dependencyLocation = `${location} > ${name}`;
    if (targets.has(name)) {
      if (!isRecord(dependency) || typeof dependency["version"] !== "string" || dependency["version"].trim() === "") {
        problems.push(`${dependencyLocation} has no installed version.`);
      } else {
        const found = versions.get(name) ?? [];
        found.push(dependency["version"]);
        versions.set(name, found);
      }
    }
    collectInstalledVersions(dependency, targets, versions, problems, dependencyLocation);
  }
}

function validateInstalledEvidence(
  result: Readonly<CommandResult>,
  definition: WorkspaceDefinition,
  expected: ReadonlyMap<string, string>,
  problems: string[],
): void {
  if (!isSuccessfulCommand(result)) {
    problems.push([`Workspace package inspection failed for ${definition.name}.`, ...commandFailureEvidence(result)].join(" "));
    return;
  }
  if (result.stdout.trim() === "") {
    problems.push(`Workspace package inspection for ${definition.name} produced empty JSON output.`);
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (error: unknown) {
    problems.push(`Unable to parse ${definition.name} npm evidence: ${errorMessage(error)}`);
    return;
  }
  if (!isRecord(parsed)) {
    problems.push(`${definition.name} npm evidence must contain a JSON object.`);
    return;
  }
  const rootDependencies = parsed["dependencies"];
  const selectedWorkspace = isRecord(rootDependencies) ? rootDependencies[definition.packageName] : undefined;
  if (!isRecord(selectedWorkspace)) {
    problems.push(`${definition.name} npm evidence is missing selected workspace '${definition.packageName}'.`);
    return;
  }

  const versions = new Map<string, string[]>();
  collectInstalledVersions(selectedWorkspace, new Set(REQUIRED_PACKAGES), versions, problems, definition.packageName);
  for (const packageName of REQUIRED_PACKAGES) {
    const installedVersions = versions.get(packageName) ?? [];
    if (installedVersions.length === 0) {
      problems.push(`Required package '${packageName}' is absent from ${definition.name} workspace npm evidence.`);
      continue;
    }
    const expectedVersion = expected.get(packageName);
    if (expectedVersion === undefined) {
      continue;
    }
    for (const installedVersion of installedVersions) {
      if (installedVersion !== expectedVersion) {
        problems.push(
          `Required package '${packageName}' expected ${expectedVersion}, but ${definition.name} npm evidence reported ${installedVersion}.`,
        );
      }
    }
  }
}

async function inspectWorkspace(
  context: SetupContext,
  definition: WorkspaceDefinition,
  dependencies: SvelteSetupDependencies,
  installedEvidenceMode: InstalledEvidenceMode,
): Promise<SvelteWorkspaceInspection> {
  const root = definition.root(context);
  const manifestPath = resolve(root, "package.json");
  const generatedConfigPath = resolve(root, ".svelte-kit", "tsconfig.json");
  const packageProblems: string[] = [];
  const generatedProblems: string[] = [];

  let manifestContents: string | null = null;
  try {
    manifestContents = await dependencies.readTextFile(manifestPath);
  } catch (error: unknown) {
    if (isInterrupted(error)) {
      throw error;
    }
    packageProblems.push(`Unable to read ${manifestPath}: ${errorMessage(error)}`);
  }

  if (manifestContents !== null) {
    validateManifest(manifestContents, manifestPath, definition, context.requirements.node, packageProblems);
  }
  const expected = expectedPackageVersions(context, packageProblems);

  let generatedConfigKind: InspectedPathKind = "missing";
  try {
    generatedConfigKind = await dependencies.inspectPath(generatedConfigPath);
    if (generatedConfigKind === "directory") {
      generatedProblems.push(`Generated config path is a directory, not a regular file: ${generatedConfigPath}`);
    } else if (generatedConfigKind === "other") {
      generatedProblems.push(`Generated config path has invalid path kind 'other': ${generatedConfigPath}`);
    }
  } catch (error: unknown) {
    if (isInterrupted(error)) {
      throw error;
    }
    generatedConfigKind = "other";
    generatedProblems.push(`Unable to inspect generated config '${generatedConfigPath}': ${errorMessage(error)}`);
  }

  if (installedEvidenceMode === "inspect") {
    try {
      const result = await context.runner.run(packageInspectionCommand(definition), {cwd: context.paths.root});
      validateInstalledEvidence(result, definition, expected, packageProblems);
    } catch (error: unknown) {
      if (isInterrupted(error)) {
        throw error;
      }
      packageProblems.push(`Unable to inspect ${definition.name} installed packages: ${errorMessage(error)}`);
    }
  }

  return {
    name: definition.name,
    root,
    packageContractValid: packageProblems.length === 0,
    generatedConfigExists: generatedConfigKind === "file",
    problems: [...packageProblems, ...generatedProblems],
    generatedConfigPath,
    generatedConfigKind,
    installedEvidenceDeferred: installedEvidenceMode === "defer",
  };
}

function workspaceEvidence(state: SvelteWorkspaceInspection): readonly string[] {
  const evidence = state.problems.map((problem) => `${state.name}: ${problem}`);
  if (state.packageContractValid) {
    evidence.push(
      state.installedEvidenceDeferred
        ? `${state.name}: package contract static validation passed; installed npm evidence is deferred.`
        : `${state.name}: package contract and installed evidence are ready.`,
    );
  }
  if (state.generatedConfigExists) {
    evidence.push(`${state.name}: generated config is a regular file: ${state.generatedConfigPath}`);
  } else if (state.generatedConfigKind === "missing") {
    evidence.push(`${state.name}: generated config is missing: ${state.generatedConfigPath}`);
  }
  return evidence;
}

function phaseResult(context: SetupContext, startedAt: number, input: Omit<SetupPhaseResult, "durationMs">): SetupPhaseResult {
  return {
    ...input,
    durationMs: Math.max(0, context.now() - startedAt),
  };
}

async function inspectPostconditions(
  states: readonly SvelteWorkspaceInspection[],
  dependencies: SvelteSetupDependencies,
): Promise<readonly string[]> {
  const problems: string[] = [];
  for (const state of states) {
    try {
      const kind = await dependencies.inspectPath(state.generatedConfigPath);
      if (kind !== "file") {
        problems.push(`${state.name}: svelte.prepare postcondition is ${kind}, not a regular file: ${state.generatedConfigPath}`);
      }
    } catch (error: unknown) {
      if (isInterrupted(error)) {
        throw error;
      }
      problems.push(`${state.name}: unable to inspect svelte.prepare postcondition '${state.generatedConfigPath}': ${errorMessage(error)}`);
    }
  }
  return problems;
}

async function runSvelteSetup(context: SetupContext, dependencies: SvelteSetupDependencies): Promise<SetupPhaseResult> {
  const startedAt = context.now();
  const evidence: string[] = [];

  try {
    const nodeModulesPath = resolve(context.paths.root, "node_modules");
    const rootDependenciesKind = await dependencies.inspectPath(nodeModulesPath);
    const installedEvidenceMode: InstalledEvidenceMode = rootDependenciesKind === "directory" ? "inspect" : "defer";
    const states: SvelteWorkspaceInspection[] = [];
    for (const name of ["cv", "status"] as const) {
      states.push(await inspectWorkspace(context, WORKSPACES[name], dependencies, installedEvidenceMode));
    }
    evidence.push(...states.flatMap(workspaceEvidence));
    if (rootDependenciesKind === "missing" && context.options.dryRun) {
      evidence.push("root: workspace-scoped npm evidence is deferred until planned workspace.root-dependencies restoration.");
    }

    if (rootDependenciesKind !== "directory" && rootDependenciesKind !== "missing") {
      evidence.push(`root: node_modules must be a directory; found ${rootDependenciesKind}: ${nodeModulesPath}`);
    }
    const invalidGeneratedPath = states.some(
      ({generatedConfigKind}) => generatedConfigKind !== "file" && generatedConfigKind !== "missing",
    );
    if (
      states.some(({packageContractValid}) => !packageContractValid)
      || invalidGeneratedPath
      || (rootDependenciesKind !== "directory" && rootDependenciesKind !== "missing")
    ) {
      return phaseResult(context, startedAt, {
        id: "svelte",
        status: "failed",
        summary: "The required Svelte workspace contracts are invalid.",
        evidence,
        nextActions: ["Correct the reported Svelte workspace contracts, then rerun setup."],
      });
    }

    if (rootDependenciesKind === "missing" && !context.options.dryRun) {
      evidence.push("root: installed package evidence requires the workspace.root-dependencies action.");
      return phaseResult(context, startedAt, {
        id: "svelte",
        status: "failed",
        summary: "Svelte installed package evidence is unavailable because root dependencies are missing.",
        evidence,
        nextActions: ["Complete workspace.root-dependencies, then rerun setup."],
      });
    }

    const missingStates = states.filter(({generatedConfigKind}) => generatedConfigKind === "missing");
    if (missingStates.length > 0) {
      const disposition = await context.actions.run({
        id: PREPARE_ACTION_ID,
        scope: "repository",
        summary: "Prepare generated SvelteKit workspace configuration.",
        execute: async () => {
          const prepareResult = await context.runner.run(PREPARE_COMMAND, {
            cwd: context.paths.root,
            output: "tee",
            logger: context.logger,
          });
          if (!isSuccessfulCommand(prepareResult)) {
            throw new Error(["svelte.prepare command failed.", ...commandFailureEvidence(prepareResult)].join("\n"));
          }
        },
      });
      if (disposition === "declined") {
        return phaseResult(context, startedAt, {
          id: "svelte",
          status: "failed",
          summary: "Required SvelteKit generated-state preparation was declined.",
          evidence: [...evidence, `Declined action: ${PREPARE_ACTION_ID}`],
          nextActions: [`Allow the repository-scoped ${PREPARE_ACTION_ID} action, then rerun setup.`],
        });
      }
      if (disposition === "planned") {
        return phaseResult(context, startedAt, {
          id: "svelte",
          status: "skipped",
          summary: "SvelteKit generated-state preparation is planned by dry-run.",
          evidence: [
            ...evidence,
            `Planned action: ${PREPARE_ACTION_ID}`,
            ...missingStates.map(
              (state) => `${state.name}: generated config remains a postcondition for ${PREPARE_ACTION_ID}: ${state.generatedConfigPath}`,
            ),
          ],
          nextActions: [],
        });
      }

      const postconditionProblems = await inspectPostconditions(states, dependencies);
      if (postconditionProblems.length > 0) {
        return phaseResult(context, startedAt, {
          id: "svelte",
          status: "failed",
          summary: "SvelteKit preparation completed without every generated config postcondition.",
          evidence: [...evidence, ...postconditionProblems],
          nextActions: ["Inspect the SvelteKit prepare scripts; do not replace them with a build, type-check, or test command."],
        });
      }
      evidence.push(`Executed and verified action: ${PREPARE_ACTION_ID}`);
    }

    if (rootDependenciesKind === "missing") {
      return phaseResult(context, startedAt, {
        id: "svelte",
        status: "skipped",
        summary: "Svelte installed package evidence is deferred by fresh-checkout dry-run.",
        evidence,
        nextActions: [],
      });
    }

    return phaseResult(context, startedAt, {
      id: "svelte",
      status: "succeeded",
      summary: "Both Svelte workspaces have valid package contracts and generated configuration.",
      evidence,
      nextActions: [],
    });
  } catch (error: unknown) {
    if (isInterrupted(error)) {
      throw error;
    }
    return phaseResult(context, startedAt, {
      id: "svelte",
      status: "failed",
      summary: "The required Svelte workspace preparation phase failed.",
      evidence: [...evidence, errorMessage(error)],
      nextActions: ["Resolve the reported Svelte setup failure, then rerun setup."],
    });
  }
}

/**
 * Inspects one Svelte workspace without mutating repository state.
 *
 * @param context - Active setup context.
 * @param name - Canonical Svelte workspace name.
 * @param dependencies - Optional filesystem-boundary replacements for deterministic callers and tests.
 * @returns Manifest, installed-package, and generated-state evidence for the selected site.
 */
export async function inspectSvelteWorkspace(
  context: SetupContext,
  name: WorkspaceName,
  dependencies: Partial<SvelteSetupDependencies> = {},
): Promise<SvelteWorkspaceState> {
  const defaults = defaultDependencies();
  const resolvedDependencies: SvelteSetupDependencies = {
    readTextFile: dependencies.readTextFile ?? defaults.readTextFile,
    inspectPath: dependencies.inspectPath ?? defaults.inspectPath,
  };
  const rootDependenciesPath = resolve(context.paths.root, "node_modules");
  let rootDependenciesKind: InspectedPathKind = "other";
  let rootInspectionProblem: string | null = null;
  try {
    rootDependenciesKind = await resolvedDependencies.inspectPath(rootDependenciesPath);
  } catch (error: unknown) {
    if (isInterrupted(error)) {
      throw error;
    }
    rootInspectionProblem = `Unable to inspect root node_modules '${rootDependenciesPath}': ${errorMessage(error)} Installed package evidence could not be verified.`;
  }
  const installedEvidenceMode: InstalledEvidenceMode = rootDependenciesKind === "directory" ? "inspect" : "defer";
  const inspection = await inspectWorkspace(context, WORKSPACES[name], resolvedDependencies, installedEvidenceMode);
  const rootProblem =
    rootInspectionProblem
    ?? (rootDependenciesKind === "directory" || (rootDependenciesKind === "missing" && context.options.dryRun)
      ? null
      : rootDependenciesKind === "missing"
        ? "Installed package evidence requires workspace.root-dependencies."
        : `Root node_modules must be a directory; found ${rootDependenciesKind}.`);
  return {
    name: inspection.name,
    root: inspection.root,
    packageContractValid: inspection.packageContractValid && rootProblem === null,
    generatedConfigExists: inspection.generatedConfigExists,
    problems: rootProblem === null ? inspection.problems : [...inspection.problems, rootProblem],
  };
}

/**
 * Creates the Svelte setup phase with explicit filesystem boundaries.
 *
 * @param dependencies - Optional production-boundary replacements for tests.
 * @returns The required Svelte setup phase definition.
 */
export function createSvelteSetupPhase(dependencies: Partial<SvelteSetupDependencies> = {}): SetupPhaseDefinition {
  const defaults = defaultDependencies();
  const resolvedDependencies: SvelteSetupDependencies = {
    readTextFile: dependencies.readTextFile ?? defaults.readTextFile,
    inspectPath: dependencies.inspectPath ?? defaults.inspectPath,
  };
  return {
    id: "svelte",
    title: "Svelte workspaces",
    required: true,
    dependsOn: ["workspace.root-dependencies"],
    run: (context) => runSvelteSetup(context, resolvedDependencies),
  };
}

/** Required phase that validates and prepares both SvelteKit workspaces. */
export const svelteSetupPhase: SetupPhaseDefinition = createSvelteSetupPhase();
