/**
 * @fileoverview Read-only repository, package-manager, Nx, and host diagnostics.
 * @module scripts.doctor.workspace
 */

import {constants as fsConstants} from "node:fs";
import {access, readFile, stat, statfs} from "node:fs/promises";
import {freemem, homedir, totalmem} from "node:os";
import {basename, dirname, join, resolve} from "node:path";

import type {CommandResult, CommandSpec} from "./common/process.ts";
import {parseVersion, satisfiesMinimum, type MinimumVersion} from "./common/requirements.ts";
import {getExpectedTaxonomyArtifactPaths} from "./generate.artifacts.ts";
import {
  diagnosticResult,
  skippedDiagnostic,
  type DiagnosticFix,
  type DiagnosticPotentialCause,
  type DiagnosticResult,
  type DoctorContext,
  type DiagnosticModule,
} from "./doctor.types.ts";

const REPOSITORY_PACKAGE_NAME = "@arolariu/monorepo";
const WEBSITE_PROJECT = "@arolariu/website";
const COMPONENTS_PROJECT = "@arolariu/components";
const GIBIBYTE = 1024 ** 3;
const MINIMUM_DISK_BYTES = GIBIBYTE;
const RECOMMENDED_DISK_BYTES = 5 * GIBIBYTE;
const RECOMMENDED_MEMORY_BYTES = GIBIBYTE;

const GIT_VERSION_COMMAND = {command: "git", args: ["--version"]} as const satisfies CommandSpec;
const GIT_STATUS_COMMAND = {command: "git", args: ["status", "--short", "--branch"]} as const satisfies CommandSpec;
const GIT_LOG_COMMAND = {command: "git", args: ["log", "--oneline", "-1", "HEAD"]} as const satisfies CommandSpec;
const NODE_VERSION_COMMAND = {command: "node", args: ["--version"]} as const satisfies CommandSpec;
const NPM_VERSION_COMMAND = {command: "npm", args: ["--version"]} as const satisfies CommandSpec;
const NPM_TREE_COMMAND = {command: "npm", args: ["ls", "--all", "--json"]} as const satisfies CommandSpec;
const NPM_CACHE_COMMAND = {command: "npm", args: ["config", "get", "cache"]} as const satisfies CommandSpec;
const NX_PROJECTS_COMMAND = {
  command: "npx",
  args: ["--no-install", "nx", "show", "projects", "--json"],
} as const satisfies CommandSpec;
const NX_GRAPH_COMMAND = {
  command: "npx",
  args: ["--no-install", "nx", "graph", "--print", "--open=false", "--watch=false"],
} as const satisfies CommandSpec;
const NPM_AUDIT_COMMAND = {command: "npm", args: ["audit", "--json"]} as const satisfies CommandSpec;
const NPM_OUTDATED_COMMAND = {command: "npm", args: ["outdated", "--json"]} as const satisfies CommandSpec;

const REQUIRED_CONFIG_PATHS = [
  ".nvmrc",
  ".node-version",
  "package.json",
  "package-lock.json",
  "nx.json",
  "tsconfig.json",
  "eslint.config.ts",
  "arolariu.slnx",
  join(".config", "dotnet-tools.json"),
  join(".github", "scripts", "package.json"),
  join(".github", "scripts", "package-lock.json"),
] as const;

type UnknownRecord = Readonly<Record<string, unknown>>;

interface NxGraphPayload {
  readonly projects: readonly string[];
  readonly dependencies: ReadonlyMap<string, readonly string[]>;
  readonly cycles: readonly string[];
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function isSuccessfulCommand(result: Readonly<CommandResult>): boolean {
  return result.code === 0 && !result.timedOut && result.signal === undefined && result.spawnError === undefined;
}

function isMissingExecutable(result: Readonly<CommandResult>): boolean {
  const detail = `${result.spawnError ?? ""}\n${result.stderr}`;
  return result.code === 127
    || /\bENOENT\b|command not found|not recognized as an internal or external command|no such file or directory/iu.test(detail);
}

function commandEvidence(result: Readonly<CommandResult>): readonly string[] {
  return [
    ...(result.spawnError === undefined ? [] : [`Unable to start command: ${result.spawnError}`]),
    ...(result.timedOut ? ["Command timed out."] : []),
    ...(result.signal === undefined ? [] : [`Command stopped with signal ${result.signal}.`]),
    ...(result.code === 0 ? [] : [`Command exited with code ${String(result.code)}.`]),
    ...(result.stdout.trim() === "" ? [] : [`stdout: ${result.stdout.trim()}`]),
    ...(result.stderr.trim() === "" ? [] : [`stderr: ${result.stderr.trim()}`]),
  ];
}

function formattedVersion(version: MinimumVersion): string {
  return `${String(version.major)}.${String(version.minor)}.${String(version.patch)}`;
}

function diagnostic(
  context: Readonly<DoctorContext>,
  startedAt: number,
  input: Omit<DiagnosticResult, "durationMs" | "module">,
): DiagnosticResult {
  return diagnosticResult(
    {
      module: "workspace",
      ...input,
    },
    startedAt,
    context.now,
  );
}

function issueDiagnostic(
  context: Readonly<DoctorContext>,
  startedAt: number,
  input: Readonly<{
    id: string;
    name: string;
    status: "warn" | "fail";
    summary: string;
    evidence: readonly string[];
    fixes: readonly DiagnosticFix[];
    rootCause?: string;
    potentialCauses?: readonly DiagnosticPotentialCause[];
  }>,
): DiagnosticResult {
  return diagnostic(context, startedAt, {
    id: input.id,
    name: input.name,
    status: input.status,
    summary: input.summary,
    evidence: input.evidence,
    ...(input.rootCause === undefined ? {} : {rootCause: input.rootCause}),
    potentialCauses: input.potentialCauses ?? [],
    fixes: input.fixes,
  });
}

function passDiagnostic(
  context: Readonly<DoctorContext>,
  startedAt: number,
  id: string,
  name: string,
  summary: string,
  evidence: readonly string[],
): DiagnosticResult {
  return diagnostic(context, startedAt, {
    id,
    name,
    status: "pass",
    summary,
    evidence,
    potentialCauses: [],
    fixes: [],
  });
}

function treeIdentity(treeName: string): Readonly<{id: string; name: string; cwdLabel: string}> {
  const github = treeName.toLowerCase().includes("github");
  return github
    ? {
        id: "workspace.github-scripts-dependencies",
        name: "GitHub scripts dependencies",
        cwdLabel: ".github scripts",
      }
    : {
        id: "workspace.root-dependencies",
        name: "Root dependencies",
        cwdLabel: "root workspace",
      };
}

function addPotentialCause(
  causes: DiagnosticPotentialCause[],
  seen: Set<string>,
  cause: string,
  confidence: DiagnosticPotentialCause["confidence"],
): void {
  if (!seen.has(cause)) {
    seen.add(cause);
    causes.push({cause, confidence});
  }
}

/**
 * Classifies one `npm ls --all --json` result without discarding failed-command output.
 *
 * @param result - Complete npm command result.
 * @param treeName - Human-readable dependency-tree owner.
 * @returns One stable dependency-integrity diagnostic.
 */
export function diagnoseNpmIntegrity(result: Readonly<CommandResult>, treeName: string): DiagnosticResult {
  const tree = treeIdentity(treeName);
  const evidence = [...commandEvidence(result)];
  const combined = `${result.stdout}\n${result.stderr}\n${result.spawnError ?? ""}`;
  const permissionFailure = /\b(?:EACCES|EPERM)\b|permission denied|access is denied/iu.test(combined);
  const causes: DiagnosticPotentialCause[] = [];
  const seenCauses = new Set<string>();
  let validDocument = false;
  let problems: readonly string[] = [];

  if (result.stdout.trim() !== "") {
    try {
      const parsed: unknown = JSON.parse(result.stdout);
      if (isRecord(parsed)) {
        const rawProblems = parsed["problems"];
        if (
          rawProblems === undefined
          || (Array.isArray(rawProblems) && rawProblems.every((problem) => typeof problem === "string" && problem.trim() !== ""))
        ) {
          validDocument = true;
          problems = rawProblems === undefined ? [] : rawProblems;
        }

        const rawError = parsed["error"];
        if (isRecord(rawError)) {
          for (const key of ["code", "summary", "detail"] as const) {
            const value = rawError[key];
            if (typeof value === "string" && value.trim() !== "") {
              evidence.push(`npm ${key}: ${value.trim()}`);
            }
          }
        }
      }
    } catch (error: unknown) {
      evidence.push(`Unable to parse npm ls JSON: ${errorMessage(error)}`);
    }
  } else {
    evidence.push("npm ls produced no JSON output.");
  }

  if (validDocument && problems.length === 0 && isSuccessfulCommand(result)) {
    return {
      id: tree.id,
      module: "workspace",
      name: tree.name,
      status: "pass",
      summary: `${tree.cwdLabel} dependencies are installed and valid.`,
      evidence: [`npm ls --all --json passed for the ${tree.cwdLabel}.`],
      potentialCauses: [],
      fixes: [],
      durationMs: result.durationMs,
    };
  }

  for (const problem of problems) {
    evidence.push(`npm problem: ${problem}`);
    if (/missing:/iu.test(problem)) {
      addPotentialCause(causes, seenCauses, "Required packages are missing from the installed dependency tree.", "high");
    }
    if (/invalid:/iu.test(problem)) {
      addPotentialCause(causes, seenCauses, "Invalid installed package versions do not satisfy the locked dependency graph.", "medium");
    }
    if (/peer dep|peer dependency/iu.test(problem)) {
      addPotentialCause(causes, seenCauses, "One or more peer dependency requirements are unsatisfied.", "medium");
    }
    if (/extraneous:/iu.test(problem)) {
      addPotentialCause(causes, seenCauses, "Extraneous packages are present but not described by the lockfile.", "low");
    }
  }

  if (/package-lock|lockfile|ELSPROBLEMS/iu.test(combined)) {
    addPotentialCause(causes, seenCauses, "The installed dependency tree and package lockfile are out of sync.", "high");
  }
  if (result.timedOut) {
    addPotentialCause(causes, seenCauses, "The npm integrity command exceeded its diagnostic timeout.", "high");
  }
  if (result.spawnError !== undefined) {
    addPotentialCause(causes, seenCauses, "The npm executable could not be started.", "high");
  }
  if (!validDocument) {
    addPotentialCause(causes, seenCauses, "npm returned missing or malformed dependency metadata.", "medium");
  }
  if (causes.length === 0) {
    addPotentialCause(causes, seenCauses, "npm reported an integrity failure that could not be classified uniquely.", "low");
  }

  const orderedCauses = causes.toSorted((left, right) => {
    const rank = {high: 0, medium: 1, low: 2} as const;
    return rank[left.confidence] - rank[right.confidence];
  });

  return {
    id: tree.id,
    module: "workspace",
    name: tree.name,
    status: "fail",
    summary: `${tree.cwdLabel} dependency integrity could not be verified.`,
    evidence,
    ...(permissionFailure
      ? {rootCause: "npm cannot inspect the dependency tree because filesystem permissions deny access."}
      : {}),
    potentialCauses: permissionFailure ? [] : orderedCauses,
    fixes: [
      {
        description: `Restore and verify the ${tree.cwdLabel} dependency tree through repository setup.`,
        command: "npm run setup",
      },
    ],
    durationMs: result.durationMs,
  };
}

function findGraphCycles(
  projects: readonly string[],
  dependencies: ReadonlyMap<string, readonly string[]>,
): readonly string[] {
  const state = new Map<string, "visiting" | "visited">();
  const stack: string[] = [];
  const cycles = new Set<string>();

  const visit = (project: string): void => {
    const currentState = state.get(project);
    if (currentState === "visited") {
      return;
    }
    if (currentState === "visiting") {
      const start = stack.indexOf(project);
      if (start >= 0) {
        cycles.add([...stack.slice(start), project].join(" -> "));
      }
      return;
    }

    state.set(project, "visiting");
    stack.push(project);
    for (const dependency of dependencies.get(project) ?? []) {
      if (dependencies.has(dependency)) {
        visit(dependency);
      }
    }
    stack.pop();
    state.set(project, "visited");
  };

  for (const project of projects) {
    visit(project);
  }

  return [...cycles].toSorted();
}

/**
 * Parses the JSON emitted by `nx graph --print` and computes dependency cycles.
 *
 * @param stdout - Nx graph JSON.
 * @returns Stable project, dependency, and cycle data.
 * @throws When the graph payload is malformed.
 */
export function parseNxGraph(stdout: string): NxGraphPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch (error: unknown) {
    throw new Error(`Unable to parse Nx graph JSON: ${errorMessage(error)}`);
  }

  if (!isRecord(parsed) || !isRecord(parsed["graph"])) {
    throw new Error("Nx graph output must contain a graph object.");
  }
  const graph = parsed["graph"];
  if (!isRecord(graph["nodes"]) || !isRecord(graph["dependencies"])) {
    throw new Error("Nx graph nodes and dependencies must be objects.");
  }

  const projects = Object.keys(graph["nodes"]).toSorted();
  const dependencies = new Map<string, readonly string[]>();
  for (const project of projects) {
    const rawDependencies = graph["dependencies"][project];
    if (!Array.isArray(rawDependencies)) {
      throw new Error(`Nx graph dependencies for '${project}' must be an array.`);
    }
    const targets: string[] = [];
    for (const dependency of rawDependencies) {
      if (!isRecord(dependency) || typeof dependency["target"] !== "string" || dependency["target"].trim() === "") {
        throw new Error(`Nx graph dependency for '${project}' must contain a target.`);
      }
      targets.push(dependency["target"]);
    }
    dependencies.set(project, targets.toSorted());
  }

  return {
    projects,
    dependencies,
    cycles: findGraphCycles(projects, dependencies),
  };
}

async function pathIsDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) {
      return false;
    }
    throw error;
  }
}

async function pathIsFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch (error: unknown) {
    if (hasErrorCode(error, "ENOENT")) {
      return false;
    }
    throw error;
  }
}

function commonExecutableCandidates(
  executable: "git" | "node" | "npm",
  context: Readonly<DoctorContext>,
): readonly string[] {
  if (context.platform === "win32") {
    const programFiles = context.env["ProgramFiles"];
    const localAppData = context.env["LOCALAPPDATA"];
    const nvmHome = context.env["NVM_HOME"];
    const fileName = executable === "npm" ? "npm.cmd" : `${executable}.exe`;
    return [
      ...(programFiles === undefined
        ? []
        : [
            executable === "git"
              ? resolve(programFiles, "Git", "cmd", fileName)
              : resolve(programFiles, "nodejs", fileName),
          ]),
      ...(localAppData === undefined
        ? []
        : [
            executable === "git"
              ? resolve(localAppData, "Programs", "Git", "cmd", fileName)
              : resolve(localAppData, "Programs", "nodejs", fileName),
          ]),
      ...(nvmHome === undefined || executable === "git" ? [] : [resolve(nvmHome, fileName)]),
    ];
  }

  const home = context.env["HOME"] ?? homedir();
  return [
    `/usr/local/bin/${executable}`,
    `/opt/homebrew/bin/${executable}`,
    resolve(home, ".volta", "bin", executable),
    ...(context.env["NVM_BIN"] === undefined ? [] : [resolve(context.env["NVM_BIN"], executable)]),
  ];
}

async function executableFailureEvidence(
  executable: "git" | "node" | "npm",
  context: Readonly<DoctorContext>,
): Promise<readonly string[]> {
  if (context.options.quick) {
    return ["Quick mode omitted PATH and common-location follow-up probes."];
  }

  const resolution = await runExecutableResolutionProbe(executable, context);
  const evidence = commandEvidence(resolution).map((entry) => `Resolution probe: ${entry}`);
  if (isSuccessfulCommand(resolution) && resolution.stdout.trim() !== "") {
    evidence.push(`Resolution candidates: ${resolution.stdout.trim()}`);
  }

  const existingCandidates: string[] = [];
  for (const candidate of commonExecutableCandidates(executable, context)) {
    try {
      await access(candidate, fsConstants.X_OK);
      existingCandidates.push(candidate);
    } catch {
      // A failed read-only access probe is represented by absence from evidence.
    }
  }
  evidence.push(
    existingCandidates.length === 0
      ? "No executable was found in supported common installation locations."
      : `Executable exists outside the active PATH: ${existingCandidates.join(", ")}`,
  );
  return evidence;
}

async function runExecutableResolutionProbe(
  executable: "git" | "node" | "npm",
  context: Readonly<DoctorContext>,
): Promise<CommandResult> {
  const options = {cwd: context.paths.root};

  if (context.platform === "win32") {
    if (executable === "git") {
      return context.runner.run({command: "where.exe", args: ["git.exe"]}, options);
    }
    if (executable === "node") {
      return context.runner.run({command: "where.exe", args: ["node.exe"]}, options);
    }
    return context.runner.run({command: "where.exe", args: ["npm.cmd"]}, options);
  }

  if (executable === "git") {
    return context.runner.run({command: "which", args: ["git"]}, options);
  }
  if (executable === "node") {
    return context.runner.run({command: "which", args: ["node"]}, options);
  }
  return context.runner.run({command: "which", args: ["npm"]}, options);
}

async function diagnoseRepositoryRoot(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  try {
    const contents = await readFile(context.paths.packageJson, "utf8");
    const parsed: unknown = JSON.parse(contents);
    if (!isRecord(parsed) || parsed["name"] !== REPOSITORY_PACKAGE_NAME) {
      return issueDiagnostic(context, startedAt, {
        id: "workspace.repository-root",
        name: "Repository root",
        status: "fail",
        summary: "The canonical path is not the arolariu.ro repository root.",
        evidence: [`Expected '${context.paths.packageJson}' to declare '${REPOSITORY_PACKAGE_NAME}'.`],
        rootCause: "The resolved repository package identity is missing or incorrect.",
        fixes: [{description: "Run doctor from a valid checkout of the arolariu.ro monorepository."}],
      });
    }
    return passDiagnostic(
      context,
      startedAt,
      "workspace.repository-root",
      "Repository root",
      "Canonical repository identity is valid.",
      [context.paths.root],
    );
  } catch (error: unknown) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.repository-root",
      name: "Repository root",
      status: "fail",
      summary: "The canonical repository identity could not be read.",
      evidence: [errorMessage(error)],
      rootCause: "The repository package manifest is missing, inaccessible, or malformed.",
      fixes: [{description: "Restore a valid root package.json and rerun doctor."}],
    });
  }
}

async function diagnoseGit(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  const version = await context.runner.run(GIT_VERSION_COMMAND, {cwd: context.paths.root});
  if (!isSuccessfulCommand(version) || !/^git version \d+\.\d+\.\d+/u.test(version.stdout.trim())) {
    const followUp = isMissingExecutable(version) ? await executableFailureEvidence("git", context) : [];
    return issueDiagnostic(context, startedAt, {
      id: "workspace.git",
      name: "Git",
      status: "fail",
      summary: "Git is unavailable or returned an invalid version.",
      evidence: [...commandEvidence(version), ...followUp],
      potentialCauses: [
        {cause: "Git is not installed or is not available on the active PATH.", confidence: "high"},
        {cause: "A version-manager or installation path is not active in this shell.", confidence: "medium"},
      ],
      fixes: [{description: "Install Git or correct PATH, then rerun doctor."}],
    });
  }

  const [statusResult, logResult] = await Promise.all([
    context.runner.run(GIT_STATUS_COMMAND, {cwd: context.paths.root}),
    context.runner.run(GIT_LOG_COMMAND, {cwd: context.paths.root}),
  ]);
  if (!isSuccessfulCommand(statusResult) || !isSuccessfulCommand(logResult)) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.git",
      name: "Git",
      status: "fail",
      summary: "Git is installed but repository state could not be inspected.",
      evidence: [...commandEvidence(statusResult), ...commandEvidence(logResult)],
      potentialCauses: [
        {cause: "The checkout metadata is incomplete or inaccessible.", confidence: "high"},
        {cause: "The current path is not inside the expected Git worktree.", confidence: "medium"},
      ],
      fixes: [{description: "Repair the checkout or its permissions, then rerun doctor."}],
    });
  }

  const lines = statusResult.stdout.split(/\r?\n/u).filter((line) => line.trim() !== "");
  const branch = lines[0]?.replace(/^##\s*/u, "").split("...")[0] ?? "unknown";
  const changedPaths = lines.filter((line) => !line.startsWith("##")).length;
  return passDiagnostic(context, startedAt, "workspace.git", "Git", "Git and checkout metadata are readable.", [
    version.stdout.trim(),
    `Branch: ${branch}`,
    `${String(changedPaths)} changed path${changedPaths === 1 ? "" : "s"}.`,
    `HEAD: ${logResult.stdout.trim()}`,
  ]);
}

function diagnoseRequirementSources(context: Readonly<DoctorContext>): DiagnosticResult {
  const startedAt = context.now();
  if (context.requirements.status === "invalid") {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.node-sources",
      name: "Runtime requirement sources",
      status: "fail",
      summary: "Repository runtime requirement sources are inconsistent.",
      evidence: context.requirements.errors,
      rootCause: "Repository runtime requirement sources disagree.",
      fixes: [{description: "Align the tracked runtime and package requirement sources, then rerun doctor."}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "workspace.node-sources",
    "Runtime requirement sources",
    "Tracked runtime requirement sources agree.",
    [
      `Node.js >=${formattedVersion(context.requirements.requirements.node)}`,
      `npm >=${formattedVersion(context.requirements.requirements.npm)}`,
    ],
  );
}

async function diagnoseRuntime(
  context: Readonly<DoctorContext>,
  input: Readonly<{
    id: "workspace.node-runtime" | "workspace.npm-runtime";
    name: "Node.js runtime" | "npm runtime";
    executable: "node" | "npm";
    command: Readonly<CommandSpec>;
    minimum: MinimumVersion | null;
  }>,
): Promise<DiagnosticResult> {
  const startedAt = context.now();
  if (input.minimum === null) {
    return skippedDiagnostic({
      id: input.id,
      module: "workspace",
      name: input.name,
      summary: "Runtime comparison was skipped because requirement sources are invalid.",
      evidence: ["Blocked by workspace.node-sources."],
    });
  }

  const result = await context.runner.run(input.command, {cwd: context.paths.root});
  const version = parseVersion(result.stdout);
  if (!isSuccessfulCommand(result) || version === null) {
    const followUp = isMissingExecutable(result) ? await executableFailureEvidence(input.executable, context) : [];
    return issueDiagnostic(context, startedAt, {
      id: input.id,
      name: input.name,
      status: "fail",
      summary: `${input.name} is unavailable or returned an invalid version.`,
      evidence: [
        ...commandEvidence(result),
        ...(isSuccessfulCommand(result) && version === null
          ? [`Unsupported version output: '${result.stdout.trim()}'.`]
          : []),
        ...followUp,
      ],
      potentialCauses: [
        {cause: `${input.name} is not installed or is not available on PATH.`, confidence: "high"},
        {cause: "A version-manager shim is installed but inactive in this shell.", confidence: "medium"},
      ],
      fixes: [{description: `Install a supported ${input.name} version and rerun doctor.`}],
    });
  }
  if (!satisfiesMinimum(version, input.minimum)) {
    return issueDiagnostic(context, startedAt, {
      id: input.id,
      name: input.name,
      status: "fail",
      summary: `${input.name} does not meet the repository minimum.`,
      evidence: [
        `Installed: ${formattedVersion(version)}`,
        `Required: >=${formattedVersion(input.minimum)}`,
      ],
      rootCause: `${input.name} is older than the repository minimum.`,
      fixes: [{description: `Install a supported ${input.name} version, then rerun doctor.`}],
    });
  }

  return passDiagnostic(context, startedAt, input.id, input.name, `${input.name} satisfies the repository requirement.`, [
    `Installed: ${formattedVersion(version)}`,
    `Required: >=${formattedVersion(input.minimum)}`,
  ]);
}

async function diagnoseNpmTree(
  context: Readonly<DoctorContext>,
  treeName: "root workspace" | ".github scripts",
  root: string,
): Promise<DiagnosticResult> {
  let directoryExists = false;
  try {
    directoryExists = await pathIsDirectory(resolve(root, "node_modules"));
  } catch (error: unknown) {
    return issueDiagnostic(context, context.now(), {
      id: treeIdentity(treeName).id,
      name: treeIdentity(treeName).name,
      status: "fail",
      summary: `${treeName} dependency directory could not be inspected.`,
      evidence: [errorMessage(error)],
      potentialCauses: [{cause: "Filesystem permissions prevent dependency inspection.", confidence: "high"}],
      fixes: [{description: `Correct filesystem access for ${root}, then rerun doctor.`}],
    });
  }

  const result = await context.runner.run(NPM_TREE_COMMAND, {cwd: root});
  const diagnosticResultValue = diagnoseNpmIntegrity(result, treeName);
  if (directoryExists) {
    return diagnosticResultValue;
  }

  return {
    id: diagnosticResultValue.id,
    module: diagnosticResultValue.module,
    name: diagnosticResultValue.name,
    status: "fail",
    summary: `${treeName} dependencies are not installed.`,
    evidence: [`Missing directory: ${resolve(root, "node_modules")}`, ...diagnosticResultValue.evidence],
    potentialCauses: [{cause: "The dependency tree has not been restored for this checkout.", confidence: "high"}],
    fixes: [{description: `Restore the ${treeName} dependency tree through repository setup.`, command: "npm run setup"}],
    durationMs: diagnosticResultValue.durationMs,
  };
}

async function diagnoseNpmCache(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  const result = await context.runner.run(NPM_CACHE_COMMAND, {cwd: context.paths.root});
  const cachePath = result.stdout.trim();
  if (!isSuccessfulCommand(result) || cachePath === "") {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.npm-cache",
      name: "npm cache",
      status: "fail",
      summary: "npm cache location could not be resolved.",
      evidence: [...commandEvidence(result), ...(cachePath === "" ? ["npm returned an empty cache path."] : [])],
      potentialCauses: [
        {cause: "npm configuration is unavailable or malformed.", confidence: "high"},
        {cause: "The active user profile cannot resolve its npm cache.", confidence: "medium"},
      ],
      fixes: [{description: "Correct npm configuration or user-profile permissions, then rerun doctor."}],
    });
  }

  try {
    await access(cachePath, fsConstants.R_OK | fsConstants.W_OK);
    return passDiagnostic(context, startedAt, "workspace.npm-cache", "npm cache", "npm cache is readable and writable.", [cachePath]);
  } catch (error: unknown) {
    const permissionFailure = hasErrorCode(error, "EACCES") || hasErrorCode(error, "EPERM");
    return issueDiagnostic(context, startedAt, {
      id: "workspace.npm-cache",
      name: "npm cache",
      status: "fail",
      summary: "npm cache is not usable by the current user.",
      evidence: [cachePath, errorMessage(error)],
      ...(permissionFailure
        ? {rootCause: "The current user does not have read/write access to the configured npm cache."}
        : {
            potentialCauses: [
              {cause: "The configured npm cache directory does not exist.", confidence: "high"},
              {cause: "npm points at a stale or unavailable filesystem path.", confidence: "medium"},
            ],
          }),
      fixes: [{description: "Correct the npm cache path or permissions, then rerun doctor."}],
    });
  }
}

async function diagnoseNxProjects(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  const result = await context.runner.run(NX_PROJECTS_COMMAND, {cwd: context.paths.root});
  let projects: readonly string[];
  try {
    const parsed: unknown = JSON.parse(result.stdout);
    if (!Array.isArray(parsed) || !parsed.every((project) => typeof project === "string" && project.trim() !== "")) {
      throw new Error("Nx project output must be an array of non-empty strings.");
    }
    projects = parsed.toSorted();
  } catch (error: unknown) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.nx-projects",
      name: "Nx projects",
      status: "fail",
      summary: "Nx project metadata is missing or malformed.",
      evidence: [...commandEvidence(result), errorMessage(error)],
      potentialCauses: [
        {cause: "The Nx workspace metadata is invalid.", confidence: "high"},
        {cause: "The root dependency tree is incomplete.", confidence: "medium"},
      ],
      fixes: [{description: "Restore dependencies and correct Nx project metadata.", command: "npm run setup"}],
    });
  }

  if (projects.length === 0) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.nx-projects",
      name: "Nx projects",
      status: "fail",
      summary: "Nx discovered no projects.",
      evidence: ["Nx returned an empty project list.", ...commandEvidence(result)],
      rootCause: "The Nx workspace contains no discoverable projects.",
      fixes: [{description: "Correct nx.json and project configuration before rerunning doctor."}],
    });
  }
  if (!isSuccessfulCommand(result)) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.nx-projects",
      name: "Nx projects",
      status: "warn",
      summary: "Nx returned project metadata with a nonzero exit.",
      evidence: [`Projects: ${projects.join(", ")}`, ...commandEvidence(result)],
      potentialCauses: [{cause: "Nx completed metadata generation but also reported a workspace warning.", confidence: "medium"}],
      fixes: [{description: "Inspect the Nx command output and correct the reported workspace warning."}],
    });
  }

  return passDiagnostic(context, startedAt, "workspace.nx-projects", "Nx projects", "Nx project discovery succeeded.", [
    `${String(projects.length)} projects: ${projects.join(", ")}`,
  ]);
}

async function diagnoseNxGraph(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  const result = await context.runner.run(NX_GRAPH_COMMAND, {cwd: context.paths.root});
  let graph: NxGraphPayload;
  try {
    graph = parseNxGraph(result.stdout);
  } catch (error: unknown) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.nx-graph",
      name: "Nx graph",
      status: "fail",
      summary: "Nx graph metadata is missing or malformed.",
      evidence: [...commandEvidence(result), errorMessage(error)],
      potentialCauses: [
        {cause: "The Nx project graph could not be constructed from workspace metadata.", confidence: "high"},
        {cause: "The installed Nx dependency tree is incomplete or inconsistent.", confidence: "medium"},
      ],
      fixes: [{description: "Restore dependencies and correct Nx configuration.", command: "npm run setup"}],
    });
  }

  if (graph.projects.length === 0) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.nx-graph",
      name: "Nx graph",
      status: "fail",
      summary: "Nx graph contains no projects.",
      evidence: ["The graph nodes object is empty."],
      rootCause: "Nx produced an empty project graph.",
      fixes: [{description: "Correct the Nx project configuration and rerun doctor."}],
    });
  }
  if (graph.cycles.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.nx-graph",
      name: "Nx graph",
      status: "fail",
      summary: "Nx graph contains circular project dependencies.",
      evidence: graph.cycles,
      rootCause: "The Nx project dependency graph contains a cycle.",
      fixes: [{description: "Break the reported project dependency cycle before rerunning doctor."}],
    });
  }

  const websiteDependencies = graph.dependencies.get(WEBSITE_PROJECT) ?? [];
  if (!graph.projects.includes(WEBSITE_PROJECT) || !graph.projects.includes(COMPONENTS_PROJECT) || !websiteDependencies.includes(COMPONENTS_PROJECT)) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.nx-graph",
      name: "Nx graph",
      status: "fail",
      summary: "The expected website-to-components Nx dependency is missing.",
      evidence: [
        `Projects: ${graph.projects.join(", ")}`,
        `${WEBSITE_PROJECT} dependencies: ${websiteDependencies.join(", ") || "(none)"}`,
      ],
      rootCause: "Nx does not report the required website dependency on the shared components project.",
      fixes: [{description: "Restore the website project dependency on @arolariu/components."}],
    });
  }
  if (!isSuccessfulCommand(result)) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.nx-graph",
      name: "Nx graph",
      status: "warn",
      summary: "Nx returned a valid graph with a nonzero exit.",
      evidence: [`${String(graph.projects.length)} projects parsed.`, ...commandEvidence(result)],
      potentialCauses: [{cause: "Nx produced usable graph data while also reporting a workspace warning.", confidence: "medium"}],
      fixes: [{description: "Inspect the Nx graph command output and correct the warning."}],
    });
  }

  return passDiagnostic(context, startedAt, "workspace.nx-graph", "Nx graph", "Nx graph is valid and acyclic.", [
    `${String(graph.projects.length)} projects.`,
    `${WEBSITE_PROJECT} depends on ${COMPONENTS_PROJECT}.`,
  ]);
}

async function diagnoseConfigFiles(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  const missing: string[] = [];
  const inaccessible: string[] = [];
  for (const relativePath of REQUIRED_CONFIG_PATHS) {
    const path = resolve(context.paths.root, relativePath);
    try {
      if (!(await pathIsFile(path))) {
        missing.push(relativePath);
      }
    } catch (error: unknown) {
      inaccessible.push(`${relativePath}: ${errorMessage(error)}`);
    }
  }

  if (missing.length > 0 || inaccessible.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.config-files",
      name: "Required configuration",
      status: "fail",
      summary: "Required repository configuration files are missing or inaccessible.",
      evidence: [
        ...missing.map((path) => `Missing: ${path}`),
        ...inaccessible.map((detail) => `Inaccessible: ${detail}`),
      ],
      rootCause: "The checkout is missing required tracked configuration or cannot read it.",
      fixes: [{description: "Restore the missing tracked files or correct their permissions."}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "workspace.config-files",
    "Required configuration",
    "Required repository configuration files are present.",
    [`Verified ${String(REQUIRED_CONFIG_PATHS.length)} tracked configuration files.`],
  );
}

async function diagnoseGeneratedArtifacts(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  const paths = getExpectedTaxonomyArtifactPaths(context.paths.root);
  const missing: string[] = [];
  const stale: string[] = [];
  const mismatched: string[] = [];
  const contents = new Map<string, Buffer>();
  let generatorModifiedAt = 0;

  try {
    generatorModifiedAt = (await stat(resolve(context.paths.root, "scripts", "generate.artifacts.ts"))).mtimeMs;
    for (const path of paths) {
      try {
        const metadata = await stat(path);
        if (!metadata.isFile()) {
          missing.push(path);
          continue;
        }
        contents.set(path, await readFile(path));
        if (metadata.mtimeMs < generatorModifiedAt) {
          stale.push(path);
        }
      } catch (error: unknown) {
        if (hasErrorCode(error, "ENOENT")) {
          missing.push(path);
        } else {
          throw error;
        }
      }
    }
  } catch (error: unknown) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.generated-artifacts",
      name: "Generated artifacts",
      status: "fail",
      summary: "Generated artifact metadata could not be inspected.",
      evidence: [errorMessage(error)],
      potentialCauses: [{cause: "Generated artifact paths or their source file are inaccessible.", confidence: "high"}],
      fixes: [{description: "Correct filesystem access and regenerate repository artifacts.", command: "npm run generate -- /a"}],
    });
  }

  const byName = new Map<string, string[]>();
  for (const path of paths) {
    const name = basename(path);
    byName.set(name, [...(byName.get(name) ?? []), path]);
  }
  for (const [name, mirrors] of byName) {
    if (mirrors.length !== 2 || mirrors.some((path) => !contents.has(path))) {
      continue;
    }
    const first = contents.get(mirrors[0]!);
    const second = contents.get(mirrors[1]!);
    if (first !== undefined && second !== undefined && !first.equals(second)) {
      mismatched.push(name);
    }
  }

  if (missing.length > 0 || mismatched.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.generated-artifacts",
      name: "Generated artifacts",
      status: "fail",
      summary: "Required mirrored taxonomy artifacts are incomplete or inconsistent.",
      evidence: [
        ...missing.map((path) => `Missing artifact: ${path}`),
        ...mismatched.map((name) => `Mirrored taxonomy bytes differ: ${name}`),
        ...stale.map((path) => `Potentially stale artifact: ${path}`),
      ],
      potentialCauses: [
        ...(missing.length > 0
          ? [{cause: "Required taxonomy generation output is missing.", confidence: "high" as const}]
          : []),
        ...(mismatched.length > 0
          ? [{cause: "API and website taxonomy mirrors were generated from different content.", confidence: "high" as const}]
          : []),
        ...(stale.length > 0
          ? [{cause: "One or more taxonomy artifacts predate the generator source.", confidence: "medium" as const}]
          : []),
      ],
      fixes: [{description: "Regenerate taxonomy artifacts without running a build.", command: "npm run generate -- /a"}],
    });
  }
  if (stale.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.generated-artifacts",
      name: "Generated artifacts",
      status: "warn",
      summary: "Mirrored taxonomy artifacts exist but may be stale.",
      evidence: stale.map((path) => `Potentially stale artifact: ${path}`),
      rootCause: "One or more taxonomy artifacts predate the generator source.",
      fixes: [{description: "Regenerate taxonomy artifacts.", command: "npm run generate -- /a"}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "workspace.generated-artifacts",
    "Generated artifacts",
    "Mirrored taxonomy artifacts are present, current, and byte-identical.",
    [`Verified ${String(paths.length)} taxonomy artifacts across ${String(byName.size)} mirrored sets.`],
  );
}

function formatBytes(bytes: number): string {
  return `${(bytes / GIBIBYTE).toFixed(2)} GiB`;
}

async function diagnoseHostCapacity(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.now();
  try {
    const filesystem = await statfs(context.paths.root);
    const freeDisk = Number(filesystem.bavail) * Number(filesystem.bsize);
    const availableMemory = freemem();
    const installedMemory = totalmem();
    const evidence = [
      `Free disk: ${formatBytes(freeDisk)}`,
      `Available memory: ${formatBytes(availableMemory)} of ${formatBytes(installedMemory)}`,
    ];

    if (freeDisk < MINIMUM_DISK_BYTES) {
      return issueDiagnostic(context, startedAt, {
        id: "workspace.host-capacity",
        name: "Host capacity",
        status: "fail",
        summary: "The workspace filesystem has critically low free space.",
        evidence,
        rootCause: "Less than 1 GiB of disk space is available on the workspace filesystem.",
        fixes: [{description: "Free disk space before restoring dependencies or running local services."}],
      });
    }
    if (freeDisk < RECOMMENDED_DISK_BYTES || availableMemory < RECOMMENDED_MEMORY_BYTES) {
      return issueDiagnostic(context, startedAt, {
        id: "workspace.host-capacity",
        name: "Host capacity",
        status: "warn",
        summary: "Host capacity is below the recommended development headroom.",
        evidence,
        potentialCauses: [
          ...(freeDisk < RECOMMENDED_DISK_BYTES
            ? [{cause: "Less than 5 GiB of disk space is available.", confidence: "high" as const}]
            : []),
          ...(availableMemory < RECOMMENDED_MEMORY_BYTES
            ? [{cause: "Less than 1 GiB of memory is currently available.", confidence: "medium" as const}]
            : []),
        ],
        fixes: [{description: "Free host disk or memory before starting the complete local stack."}],
      });
    }

    return passDiagnostic(context, startedAt, "workspace.host-capacity", "Host capacity", "Host capacity is sufficient.", evidence);
  } catch (error: unknown) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.host-capacity",
      name: "Host capacity",
      status: "warn",
      summary: "Host capacity could not be measured.",
      evidence: [errorMessage(error)],
      potentialCauses: [{cause: "The platform did not expose filesystem capacity metadata.", confidence: "medium"}],
      fixes: [{description: "Verify available disk and memory manually before starting the local stack."}],
    });
  }
}

function isNetworkUnavailable(result: Readonly<CommandResult>): boolean {
  if (result.timedOut) {
    return true;
  }
  const detail = `${result.stdout}\n${result.stderr}\n${result.spawnError ?? ""}`;
  return /\b(?:ENOTFOUND|EAI_AGAIN|ENETUNREACH|ECONNRESET|ETIMEDOUT)\b|timed?\s*out|network is unreachable/iu.test(detail);
}

function parseVulnerabilityCounts(stdout: string): Readonly<Record<"info" | "low" | "moderate" | "high" | "critical", number>> {
  const parsed: unknown = JSON.parse(stdout);
  if (!isRecord(parsed) || !isRecord(parsed["metadata"]) || !isRecord(parsed["metadata"]["vulnerabilities"])) {
    throw new Error("npm audit JSON must contain metadata.vulnerabilities.");
  }
  const vulnerabilities = parsed["metadata"]["vulnerabilities"];
  const result: Record<"info" | "low" | "moderate" | "high" | "critical", number> = {
    info: 0,
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0,
  };
  for (const severity of Object.keys(result) as readonly (keyof typeof result)[]) {
    const value = vulnerabilities[severity];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new Error(`npm audit ${severity} count must be a non-negative number.`);
    }
    result[severity] = value;
  }
  return result;
}

async function diagnoseNpmAudit(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  if (context.options.quick) {
    return skippedDiagnostic({
      id: "workspace.npm-audit",
      module: "workspace",
      name: "npm audit",
      summary: "Remote npm audit was skipped in quick mode.",
      evidence: ["--quick omits remote diagnostics."],
    });
  }

  const startedAt = context.now();
  const result = await context.runner.run(NPM_AUDIT_COMMAND, {cwd: context.paths.root});
  if (isNetworkUnavailable(result)) {
    return skippedDiagnostic({
      id: "workspace.npm-audit",
      module: "workspace",
      name: "npm audit",
      summary: "npm audit was skipped because the registry is unavailable.",
      evidence: commandEvidence(result),
    });
  }

  try {
    const counts = parseVulnerabilityCounts(result.stdout);
    const evidence = [
      `critical=${String(counts.critical)}, high=${String(counts.high)}, moderate=${String(counts.moderate)}, low=${String(counts.low)}, info=${String(counts.info)}`,
      ...commandEvidence(result),
    ];
    if (counts.critical > 0 || counts.high > 0) {
      return issueDiagnostic(context, startedAt, {
        id: "workspace.npm-audit",
        name: "npm audit",
        status: "fail",
        summary: "npm audit reports high-severity vulnerabilities.",
        evidence,
        rootCause: "The locked npm dependency graph contains high or critical advisories.",
        fixes: [{description: "Review and update the affected dependencies using the repository dependency workflow."}],
      });
    }
    if (counts.moderate > 0 || counts.low > 0 || counts.info > 0) {
      return issueDiagnostic(context, startedAt, {
        id: "workspace.npm-audit",
        name: "npm audit",
        status: "warn",
        summary: "npm audit reports lower-severity vulnerabilities.",
        evidence,
        rootCause: "The locked npm dependency graph contains moderate, low, or informational advisories.",
        fixes: [{description: "Review the advisories and schedule dependency updates as appropriate."}],
      });
    }
    return passDiagnostic(context, startedAt, "workspace.npm-audit", "npm audit", "npm audit reports no vulnerabilities.", evidence);
  } catch (error: unknown) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.npm-audit",
      name: "npm audit",
      status: "warn",
      summary: "npm audit returned an unrecognized response.",
      evidence: [...commandEvidence(result), errorMessage(error)],
      potentialCauses: [
        {cause: "npm returned malformed or unsupported audit JSON.", confidence: "high"},
        {cause: "The configured registry returned a nonstandard error response.", confidence: "medium"},
      ],
      fixes: [{description: "Run npm audit manually and inspect the complete registry response.", command: "npm audit --json"}],
    });
  }
}

async function diagnoseNpmOutdated(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  if (context.options.quick) {
    return skippedDiagnostic({
      id: "workspace.npm-outdated",
      module: "workspace",
      name: "Outdated npm packages",
      summary: "Remote package freshness was skipped in quick mode.",
      evidence: ["--quick omits remote diagnostics."],
    });
  }

  const startedAt = context.now();
  const result = await context.runner.run(NPM_OUTDATED_COMMAND, {cwd: context.paths.root});
  if (isNetworkUnavailable(result)) {
    return skippedDiagnostic({
      id: "workspace.npm-outdated",
      module: "workspace",
      name: "Outdated npm packages",
      summary: "Package freshness was skipped because the registry is unavailable.",
      evidence: commandEvidence(result),
    });
  }

  try {
    const parsed: unknown = JSON.parse(result.stdout);
    if (!isRecord(parsed)) {
      throw new Error("npm outdated JSON must be an object.");
    }
    const packages = Object.keys(parsed).toSorted();
    if (packages.length > 0) {
      return issueDiagnostic(context, startedAt, {
        id: "workspace.npm-outdated",
        name: "Outdated npm packages",
        status: "warn",
        summary: `${String(packages.length)} npm package${packages.length === 1 ? "" : "s"} can be updated.`,
        evidence: packages,
        rootCause: "The locked npm dependency graph is behind currently available package versions.",
        fixes: [{description: "Review available updates through the repository dependency-update workflow.", command: "npm outdated --json"}],
      });
    }
    return passDiagnostic(
      context,
      startedAt,
      "workspace.npm-outdated",
      "Outdated npm packages",
      "Locked npm packages are current.",
      ["npm outdated returned no packages."],
    );
  } catch (error: unknown) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.npm-outdated",
      name: "Outdated npm packages",
      status: "warn",
      summary: "npm outdated returned an unrecognized response.",
      evidence: [...commandEvidence(result), errorMessage(error)],
      potentialCauses: [
        {cause: "npm returned malformed or unsupported outdated-package JSON.", confidence: "high"},
        {cause: "The configured registry returned a nonstandard error response.", confidence: "medium"},
      ],
      fixes: [{description: "Run npm outdated manually and inspect the complete registry response.", command: "npm outdated --json"}],
    });
  }
}

/** Read-only workspace diagnostic module. */
export const workspaceDoctorModule: DiagnosticModule = {
  id: "workspace",
  title: "Workspace",
  async run(context): Promise<readonly DiagnosticResult[]> {
    const requirementSources = diagnoseRequirementSources(context);
    const nodeMinimum = context.requirements.status === "valid" ? context.requirements.requirements.node : null;
    const npmMinimum = context.requirements.status === "valid" ? context.requirements.requirements.npm : null;

    return [
      await diagnoseRepositoryRoot(context),
      await diagnoseGit(context),
      requirementSources,
      await diagnoseRuntime(context, {
        id: "workspace.node-runtime",
        name: "Node.js runtime",
        executable: "node",
        command: NODE_VERSION_COMMAND,
        minimum: nodeMinimum,
      }),
      await diagnoseRuntime(context, {
        id: "workspace.npm-runtime",
        name: "npm runtime",
        executable: "npm",
        command: NPM_VERSION_COMMAND,
        minimum: npmMinimum,
      }),
      await diagnoseNpmTree(context, "root workspace", context.paths.root),
      await diagnoseNpmTree(context, ".github scripts", context.paths.githubScriptsRoot),
      await diagnoseNpmCache(context),
      await diagnoseNxProjects(context),
      await diagnoseNxGraph(context),
      await diagnoseConfigFiles(context),
      await diagnoseGeneratedArtifacts(context),
      await diagnoseHostCapacity(context),
      await diagnoseNpmAudit(context),
      await diagnoseNpmOutdated(context),
    ];
  },
};
