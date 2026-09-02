/**
 * @fileoverview Read-only repository, package-manager, Nx, and host diagnostics.
 * @module scripts.doctor.workspace
 *
 * @remarks
 * Every check in this module is derived exclusively from one of three sources:
 * memoized {@link https://en.wikipedia.org/wiki/Inspection | inspection} facts obtained through
 * `context.inspection.inspect(...)` (Nx workspace projects/graph, and both npm dependency trees),
 * opaque allowlisted probes executed through `context.probes.run(...)` (Git, node/npm runtime
 * versions, npm cache/audit/outdated), or narrowly-scoped reads issued through the injected
 * read-only filesystem (`context.files`) for repository-wide configuration files and generated
 * taxonomy artifacts that no fact model represents. This module never imports a Node filesystem
 * API, never imports `ProcessRequest`/`ProcessRunner` from `./common/runner.ts`, and never
 * receives a mutable filesystem or unrestricted runner; it consumes only the typed
 * `ProcessOutcome` produced by probe execution, and classifies every one of its variants
 * explicitly.
 */

import {basename, join, resolve} from "node:path";

import type {ProcessOutcome} from "./common/runner.ts";
import {parseVersion, satisfiesMinimum, type MinimumVersion} from "./common/requirements.ts";
import {getExpectedTaxonomyArtifactPaths} from "./common/taxonomy-artifacts.ts";
import {
  boundCommandExcerpt,
  boundEvidence,
  diagnosticResult,
  normalizeErrorForReport,
  skippedDiagnostic,
  STANDARD_EVIDENCE_LIMIT,
} from "./doctor.diagnostics.ts";
import type {DiagnosticFix, DiagnosticModule, DiagnosticPotentialCause, DiagnosticResult, DoctorContext} from "./doctor.types.ts";
import type {AggregateFacts} from "./inspection/aggregate.ts";
import type {NpmTreeFacts, NpmProblemFact} from "./inspection/packages.ts";
import {probes} from "./inspection/probes.ts";
import type {InspectionOutcome} from "./inspection/types.ts";
import type {WorkspaceFacts} from "./inspection/workspace.ts";

const REPOSITORY_PACKAGE_NAME = "@arolariu/monorepo";
const WEBSITE_PROJECT = "@arolariu/website";
const COMPONENTS_PROJECT = "@arolariu/components";
const GIBIBYTE = 1024 ** 3;
const MINIMUM_DISK_BYTES = GIBIBYTE;
const RECOMMENDED_DISK_BYTES = 5 * GIBIBYTE;
const RECOMMENDED_MEMORY_BYTES = GIBIBYTE;

/** Shared decoder for mirrored taxonomy artifact bytes. */
const artifactDecoder = new TextDecoder("utf-8");

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

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function isSuccessfulCommand(outcome: Readonly<ProcessOutcome>): boolean {
  return outcome.kind === "succeeded";
}

/**
 * Maps one probe {@link ProcessOutcome} onto the numeric exit code doctor's evidence reports.
 *
 * @param outcome - Typed probe outcome.
 * @returns `0` for success, the reported exit code for a completed nonzero exit, `1` otherwise.
 */
function processExitCode(outcome: Readonly<ProcessOutcome>): number {
  switch (outcome.kind) {
    case "succeeded":
      return 0;
    case "exited":
      return outcome.exitCode;
    case "spawn-failed":
    case "timed-out":
    case "signalled":
    case "cancelled":
      return 1;
  }
}

/**
 * Reads the terminating signal from one probe outcome, when the runner reported one.
 *
 * @param outcome - Typed probe outcome.
 * @returns The signal name, or `undefined` when the child was not stopped by a signal.
 */
function processSignal(outcome: Readonly<ProcessOutcome>): NodeJS.Signals | undefined {
  switch (outcome.kind) {
    case "signalled":
      return outcome.signal;
    case "timed-out":
    case "cancelled":
      return outcome.signal;
    case "succeeded":
    case "exited":
    case "spawn-failed":
      return undefined;
  }
}

function isMissingExecutable(outcome: Readonly<ProcessOutcome>): boolean {
  const detail = `${outcome.kind === "spawn-failed" ? outcome.message : ""}\n${outcome.stderr}`;
  return (
    processExitCode(outcome) === 127
    || /\bENOENT\b|command not found|not recognized as an internal or external command|no such file or directory/iu.test(detail)
  );
}

function commandStatusEvidence(outcome: Readonly<ProcessOutcome>): readonly string[] {
  const exitCode = processExitCode(outcome);
  const signal = processSignal(outcome);
  return [
    ...(outcome.kind === "spawn-failed" ? [`Unable to start command: ${outcome.message}`] : []),
    ...(outcome.kind === "timed-out" ? ["Command timed out."] : []),
    ...(signal === undefined ? [] : [`Command stopped with signal ${signal}.`]),
    ...(exitCode === 0 ? [] : [`Command exited with code ${String(exitCode)}.`]),
  ];
}

function commandEvidence(outcome: Readonly<ProcessOutcome>): readonly string[] {
  return [
    ...commandStatusEvidence(outcome),
    ...(outcome.stdout.trim() === "" ? [] : [`stdout: ${boundCommandExcerpt(outcome.stdout.trim())}`]),
    ...(outcome.stderr.trim() === "" ? [] : [`stderr: ${boundCommandExcerpt(outcome.stderr.trim())}`]),
  ];
}

/**
 * Guarantees at least one evidence entry for a probe-derived failure.
 *
 * @remarks
 * A probe can exit successfully and still print nothing recognizable — a shim that swallows its
 * own output, for example — in which case {@link commandEvidence} is empty. The reporter rejects
 * a failed row without evidence and aborts the whole report, so the empty case is described
 * explicitly instead of collapsing every sibling diagnostic.
 *
 * @param entries - Evidence already derived from one or more probe outcomes.
 * @param fallback - Stable description used when no probe evidence exists.
 * @returns Non-empty evidence entries.
 */
function probeEvidence(entries: readonly string[], fallback: string): readonly string[] {
  return entries.length === 0 ? [fallback] : entries;
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
    context.clock.monotonicNow,
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

/**
 * Resolves the stable diagnostic identity for one npm dependency-tree lock domain.
 *
 * @param scope - The lock domain the tree belongs to.
 * @returns The diagnostic id, display name, and human-readable label for that lock domain.
 */
function treeIdentity(scope: "root" | "github-scripts"): Readonly<{id: string; name: string; label: string}> {
  return scope === "github-scripts"
    ? {id: "workspace.github-scripts-dependencies", name: "GitHub scripts dependencies", label: ".github scripts"}
    : {id: "workspace.root-dependencies", name: "Root dependencies", label: "root workspace"};
}

/**
 * Classifies normalized npm dependency problems into concise potential causes.
 *
 * @param problems - Bounded, already-normalized npm problem facts.
 * @returns Deterministic potential causes for the reported dependency-tree problems.
 */
function npmTreePotentialCauses(problems: readonly NpmProblemFact[]): readonly DiagnosticPotentialCause[] {
  const codes = new Set(problems.map((problem) => problem.code).filter((code): code is string => code !== undefined));
  const causes: DiagnosticPotentialCause[] = [];

  if (codes.has("missing")) {
    causes.push({cause: "Required packages are missing from the installed dependency tree.", confidence: "high"});
  }
  if (codes.has("invalid")) {
    causes.push({cause: "Invalid installed package versions do not satisfy the locked dependency graph.", confidence: "medium"});
  }
  if (codes.has("extraneous")) {
    causes.push({cause: "Extraneous packages are present but not described by the lockfile.", confidence: "low"});
  }
  if (codes.has("npm-exit")) {
    causes.push({cause: "npm dependency inspection exited unsuccessfully.", confidence: "high"});
  }
  if (causes.length === 0) {
    causes.push({cause: "npm reported a dependency problem that could not be classified uniquely.", confidence: "low"});
  }

  return causes;
}

async function pathIsFile(context: Readonly<DoctorContext>, path: string): Promise<boolean> {
  return (await context.files.inspect(path)).kind === "file";
}

/**
 * Compares two artifact byte sequences without materializing an intermediate string.
 *
 * @param left - First artifact contents.
 * @param right - Second artifact contents.
 * @returns Whether both mirrors are byte-identical.
 */
function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) {
    return false;
  }
  return left.every((byte, index) => byte === right[index]);
}

/**
 * Resolves the exact executable filename an executable-resolution probe should look up.
 *
 * @param executable - Bare executable domain (`git`, `node`, or `npm`).
 * @param platform - Target platform.
 * @returns The extension-qualified filename on Windows (for example `npm.cmd`), or the bare
 * executable name on every other platform.
 */
function executableProbeName(executable: "git" | "node" | "npm", platform: NodeJS.Platform): string {
  if (platform !== "win32") {
    return executable;
  }
  return executable === "npm" ? "npm.cmd" : `${executable}.exe`;
}

/**
 * Runs the opaque executable-resolution follow-up probe and formats its result as evidence.
 *
 * @param executable - Bare executable domain whose resolution should be probed.
 * @param context - Shared doctor execution context.
 * @returns Bounded follow-up evidence, or a fixed explanatory entry in quick mode.
 */
async function executableFailureEvidence(executable: "git" | "node" | "npm", context: Readonly<DoctorContext>): Promise<readonly string[]> {
  if (context.options.quick) {
    return ["Quick mode omitted the executable-resolution follow-up probe."];
  }

  const resolution = await context.probes.run(
    probes.workspace.executableResolution(executableProbeName(executable, context.environment.platform), context.environment.platform),
    {cwd: context.paths.root},
  );
  const evidence = commandEvidence(resolution).map((entry) => `Resolution probe: ${entry}`);
  if (isSuccessfulCommand(resolution) && resolution.stdout.trim() !== "") {
    evidence.push(`Resolution candidates: ${boundCommandExcerpt(resolution.stdout.trim())}`);
  }
  return evidence.length === 0 ? ["Resolution probe returned no additional detail."] : evidence;
}

async function diagnoseRepositoryRoot(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.clock.monotonicNow();
  try {
    const contents = await context.files.readText(context.paths.packageJson);
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
    return passDiagnostic(context, startedAt, "workspace.repository-root", "Repository root", "Canonical repository identity is valid.", [
      context.paths.root,
    ]);
  } catch (error: unknown) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.repository-root",
      name: "Repository root",
      status: "fail",
      summary: "The canonical repository identity could not be read.",
      evidence: [normalizeErrorForReport(error, "The repository package manifest could not be read.")],
      rootCause: "The repository package manifest is missing, inaccessible, or malformed.",
      fixes: [{description: "Restore a valid root package.json and rerun doctor."}],
    });
  }
}

async function diagnoseGit(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.clock.monotonicNow();
  const version = await context.probes.run(probes.workspace.gitVersion(), {cwd: context.paths.root});
  if (!isSuccessfulCommand(version) || !/^git version \d+\.\d+\.\d+/u.test(version.stdout.trim())) {
    const followUp = isMissingExecutable(version) ? await executableFailureEvidence("git", context) : [];
    return issueDiagnostic(context, startedAt, {
      id: "workspace.git",
      name: "Git",
      status: "fail",
      summary: "Git is unavailable or returned an invalid version.",
      evidence: probeEvidence(
        [...commandEvidence(version), ...followUp],
        "The git version probe completed without producing a recognizable version.",
      ),
      potentialCauses: [
        {cause: "Git is not installed or is not available on the active PATH.", confidence: "high"},
        {cause: "A version-manager or installation path is not active in this shell.", confidence: "medium"},
      ],
      fixes: [{description: "Install Git or correct PATH, then rerun doctor."}],
    });
  }

  // Intentionally sequential: doctor modules receive no task scheduler, so repository-state
  // probes are issued one after the other rather than through an ad-hoc concurrency primitive.
  const statusResult = await context.probes.run(probes.workspace.gitStatus(), {cwd: context.paths.root});
  const logResult = await context.probes.run(probes.workspace.gitLastCommit(), {cwd: context.paths.root});
  if (!isSuccessfulCommand(statusResult) || !isSuccessfulCommand(logResult)) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.git",
      name: "Git",
      status: "fail",
      summary: "Git is installed but repository state could not be inspected.",
      evidence: probeEvidence(
        [...commandEvidence(statusResult), ...commandEvidence(logResult)],
        "The git status and last-commit probes completed without producing any output.",
      ),
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
  const startedAt = context.clock.monotonicNow();
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
    runProbe: () => Promise<ProcessOutcome>;
    minimum: MinimumVersion | null;
  }>,
): Promise<DiagnosticResult> {
  const startedAt = context.clock.monotonicNow();
  if (input.minimum === null) {
    return skippedDiagnostic({
      id: input.id,
      module: "workspace",
      name: input.name,
      summary: "Runtime comparison was skipped because requirement sources are invalid.",
      evidence: ["Blocked by workspace.node-sources."],
    });
  }

  const result = await input.runProbe();
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
        ...(isSuccessfulCommand(result) && version === null ? [`Unsupported version output: '${result.stdout.trim()}'.`] : []),
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
      evidence: [`Installed: ${formattedVersion(version)}`, `Required: >=${formattedVersion(input.minimum)}`],
      rootCause: `${input.name} is older than the repository minimum.`,
      fixes: [{description: `Install a supported ${input.name} version, then rerun doctor.`}],
    });
  }

  return passDiagnostic(context, startedAt, input.id, input.name, `${input.name} satisfies the repository requirement.`, [
    `Installed: ${formattedVersion(version)}`,
    `Required: >=${formattedVersion(input.minimum)}`,
  ]);
}

/**
 * Maps one inspected npm dependency-tree outcome into a diagnostic result.
 *
 * @param context - Shared doctor execution context.
 * @param scope - The lock domain the tree belongs to.
 * @param outcome - The memoized inspection outcome for that lock domain's full dependency tree.
 * @returns The completed diagnostic result for the given lock domain.
 */
function diagnoseNpmTree(
  context: Readonly<DoctorContext>,
  scope: "root" | "github-scripts",
  outcome: InspectionOutcome<NpmTreeFacts>,
): DiagnosticResult {
  const startedAt = context.clock.monotonicNow();
  const identity = treeIdentity(scope);

  if (outcome.kind === "unavailable") {
    return issueDiagnostic(context, startedAt, {
      id: identity.id,
      name: identity.name,
      status: "fail",
      summary: `${identity.label} dependencies could not be inspected.`,
      evidence: [outcome.reason],
      potentialCauses: [
        {cause: "The dependency tree has not been restored for this checkout.", confidence: "high"},
        {cause: "Filesystem or process permissions prevent dependency inspection.", confidence: "medium"},
      ],
      fixes: [{description: `Restore the ${identity.label} dependency tree through repository setup.`, command: "npm run setup"}],
    });
  }
  if (outcome.kind === "invalid") {
    return issueDiagnostic(context, startedAt, {
      id: identity.id,
      name: identity.name,
      status: "fail",
      summary: `${identity.label} dependency data is malformed.`,
      evidence: outcome.issues,
      rootCause: "npm dependency inspection returned malformed dependency-tree data.",
      fixes: [{description: `Restore the ${identity.label} dependency tree through repository setup.`, command: "npm run setup"}],
    });
  }

  const facts = outcome.value;
  if (facts.valid) {
    return passDiagnostic(context, startedAt, identity.id, identity.name, `${identity.label} dependencies are installed and valid.`, [
      `${String(facts.packageCount)} dependency node${facts.packageCount === 1 ? "" : "s"} verified.`,
    ]);
  }

  const problemLines = facts.problems.map((problem) => problem.detail);
  const shownProblems = problemLines.slice(0, STANDARD_EVIDENCE_LIMIT);
  const omittedProblems = facts.problemCount - shownProblems.length;

  return issueDiagnostic(context, startedAt, {
    id: identity.id,
    name: identity.name,
    status: "fail",
    summary: `${identity.label} dependency integrity could not be verified.`,
    evidence: [
      `${String(facts.problemCount)} dependency problem${facts.problemCount === 1 ? "" : "s"} reported.`,
      ...shownProblems,
      ...(omittedProblems > 0 ? [`${String(omittedProblems)} additional problems omitted.`] : []),
    ],
    potentialCauses: npmTreePotentialCauses(facts.problems),
    fixes: [{description: `Restore and verify the ${identity.label} dependency tree through repository setup.`, command: "npm run setup"}],
  });
}

async function diagnoseNpmCache(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.clock.monotonicNow();
  const result = await context.probes.run(probes.workspace.npmCache(), {cwd: context.paths.root});
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
    await context.files.assertAccessible(cachePath, {read: true, write: true});
    return passDiagnostic(context, startedAt, "workspace.npm-cache", "npm cache", "npm cache is readable and writable.", [cachePath]);
  } catch (error: unknown) {
    const permissionFailure = hasErrorCode(error, "EACCES") || hasErrorCode(error, "EPERM");
    return issueDiagnostic(context, startedAt, {
      id: "workspace.npm-cache",
      name: "npm cache",
      status: "fail",
      summary: "npm cache is not usable by the current user.",
      evidence: [cachePath, normalizeErrorForReport(error, "npm cache access failed.")],
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

function diagnoseNxProjects(context: Readonly<DoctorContext>, outcome: InspectionOutcome<WorkspaceFacts>): DiagnosticResult {
  const startedAt = context.clock.monotonicNow();

  if (outcome.kind === "unavailable") {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.nx-projects",
      name: "Nx projects",
      status: "fail",
      summary: "Nx project metadata could not be inspected.",
      evidence: [outcome.reason],
      potentialCauses: [
        {cause: "The Nx workspace metadata is invalid.", confidence: "high"},
        {cause: "A tracked project or package manifest is malformed, duplicated, or ambiguous.", confidence: "medium"},
      ],
      fixes: [{description: "Correct nx.json, project.json, and workspace package metadata before rerunning doctor."}],
    });
  }
  if (outcome.kind === "invalid") {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.nx-projects",
      name: "Nx projects",
      status: "fail",
      summary: "Nx project metadata is malformed.",
      evidence: outcome.issues,
      potentialCauses: [{cause: "A tracked project or package manifest is malformed, duplicated, or ambiguous.", confidence: "high"}],
      fixes: [{description: "Correct nx.json, project.json, and workspace package metadata before rerunning doctor."}],
    });
  }

  const projects = outcome.value.projects.map(({name}) => name);
  if (projects.length === 0) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.nx-projects",
      name: "Nx projects",
      status: "fail",
      summary: "Nx discovered no projects.",
      evidence: ["The declared Nx workspace layout contains no project.json file."],
      rootCause: "The Nx workspace contains no discoverable projects.",
      fixes: [{description: "Correct nx.json and project configuration before rerunning doctor."}],
    });
  }

  const shownProjects = projects.slice(0, STANDARD_EVIDENCE_LIMIT);
  const omittedProjects = projects.length - shownProjects.length;
  return passDiagnostic(context, startedAt, "workspace.nx-projects", "Nx projects", "Nx project discovery succeeded.", [
    `${String(projects.length)} project${projects.length === 1 ? "" : "s"} discovered.`,
    omittedProjects > 0
      ? `Projects: ${shownProjects.join(", ")}; ${String(omittedProjects)} additional project names omitted.`
      : `Projects: ${shownProjects.join(", ")}`,
  ]);
}

function diagnoseNxGraph(context: Readonly<DoctorContext>, outcome: InspectionOutcome<WorkspaceFacts>): DiagnosticResult {
  const startedAt = context.clock.monotonicNow();

  if (outcome.kind === "unavailable") {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.nx-graph",
      name: "Nx graph",
      status: "fail",
      summary: "Nx graph metadata could not be inspected.",
      evidence: [outcome.reason],
      potentialCauses: [
        {cause: "The Nx project graph could not be derived from tracked workspace metadata.", confidence: "high"},
        {cause: "A project dependency declaration is unresolved, ambiguous, or unsupported.", confidence: "medium"},
      ],
      fixes: [{description: "Correct the reported Nx workspace metadata declaration and rerun doctor."}],
    });
  }
  if (outcome.kind === "invalid") {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.nx-graph",
      name: "Nx graph",
      status: "fail",
      summary: "Nx graph metadata is malformed.",
      evidence: outcome.issues,
      rootCause: "Nx workspace metadata produced malformed project-graph data.",
      fixes: [{description: "Correct the reported Nx workspace metadata declaration and rerun doctor."}],
    });
  }

  const {projects: projectFacts, dependencies, cycles} = outcome.value;
  const projects = projectFacts.map(({name}) => name);
  if (projects.length === 0) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.nx-graph",
      name: "Nx graph",
      status: "fail",
      summary: "Nx graph contains no projects.",
      evidence: ["The declared Nx workspace layout contains no project.json file."],
      rootCause: "Nx workspace metadata produced an empty project graph.",
      fixes: [{description: "Correct the Nx project configuration and rerun doctor."}],
    });
  }
  if (cycles.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.nx-graph",
      name: "Nx graph",
      status: "fail",
      summary: "Nx graph contains circular project dependencies.",
      evidence: boundEvidence(
        cycles.map((cycle) => cycle.join(" -> ")),
        context.options.verbose,
      ),
      rootCause: "The Nx project dependency graph contains a cycle.",
      fixes: [{description: "Break the reported project dependency cycle before rerunning doctor."}],
    });
  }

  const websiteDependencies = dependencies.filter(({source}) => source === WEBSITE_PROJECT).map(({target}) => target);
  if (!projects.includes(WEBSITE_PROJECT) || !projects.includes(COMPONENTS_PROJECT) || !websiteDependencies.includes(COMPONENTS_PROJECT)) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.nx-graph",
      name: "Nx graph",
      status: "fail",
      summary: "The expected website-to-components Nx dependency is missing.",
      evidence: boundEvidence(
        [`Projects: ${projects.join(", ")}`, `${WEBSITE_PROJECT} dependencies: ${websiteDependencies.join(", ") || "(none)"}`],
        context.options.verbose,
      ),
      rootCause: "Workspace metadata does not declare the required website dependency on the shared components project.",
      fixes: [{description: "Restore the website project dependency on @arolariu/components."}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "workspace.nx-graph",
    "Nx graph",
    "Nx graph is valid and acyclic.",
    boundEvidence(
      [
        `${String(projects.length)} projects.`,
        `${WEBSITE_PROJECT} depends on ${COMPONENTS_PROJECT}.`,
        ...dependencies.map(({source, target}) => `${source} -> ${target}`),
      ],
      context.options.verbose,
    ),
  );
}

async function diagnoseConfigFiles(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.clock.monotonicNow();
  const missing: string[] = [];
  const inaccessible: string[] = [];
  for (const relativePath of REQUIRED_CONFIG_PATHS) {
    const path = resolve(context.paths.root, relativePath);
    try {
      if (!(await pathIsFile(context, path))) {
        missing.push(relativePath);
      }
    } catch (error: unknown) {
      inaccessible.push(`${relativePath}: ${normalizeErrorForReport(error, "configuration file access failed.")}`);
    }
  }

  if (missing.length > 0 || inaccessible.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.config-files",
      name: "Required configuration",
      status: "fail",
      summary: "Required repository configuration files are missing or inaccessible.",
      evidence: boundEvidence(
        [...missing.map((path) => `Missing: ${path}`), ...inaccessible.map((detail) => `Inaccessible: ${detail}`)],
        context.options.verbose,
      ),
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
  const startedAt = context.clock.monotonicNow();
  const paths = getExpectedTaxonomyArtifactPaths(context.paths.root);
  const missing: string[] = [];
  const mismatched: string[] = [];
  const metadataErrors: string[] = [];
  const freshnessWarnings: string[] = [];
  const freshnessEvidence: string[] = [];
  const contents = new Map<string, Uint8Array>();

  try {
    for (const path of paths) {
      try {
        const metadata = await context.files.inspect(path);
        if (metadata.kind !== "file") {
          missing.push(path);
          continue;
        }
        contents.set(path, await context.files.readBytes(path));
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
      evidence: [normalizeErrorForReport(error, "Generated artifact metadata could not be inspected.")],
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
    if (first !== undefined && second !== undefined && !sameBytes(first, second)) {
      mismatched.push(name);
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(artifactDecoder.decode(first!));
      if (!isRecord(parsed)) {
        throw new Error("artifact root must be an object");
      }

      const expectedVersion =
        /^ecoicop-v(?<version>.+)\.min\.json$/u.exec(name)?.groups?.["version"]
        ?? /^(?:gpc|nace)-(?<version>.+)\.min\.json$/u.exec(name)?.groups?.["version"];
      if (expectedVersion === undefined || parsed["version"] !== expectedVersion) {
        metadataErrors.push(
          `${name}: expected embedded version '${expectedVersion ?? "(unknown)"}', received '${String(parsed["version"])}'.`,
        );
      }

      const generatedAt = parsed["generatedAt"];
      if (typeof generatedAt !== "string" || Number.isNaN(Date.parse(generatedAt))) {
        freshnessWarnings.push(`${name}: invalid generatedAt '${String(generatedAt)}'.`);
      } else {
        freshnessEvidence.push(`${name}: generated at ${generatedAt}.`);
      }
    } catch (error: unknown) {
      metadataErrors.push(`${name}: ${normalizeErrorForReport(error, "artifact metadata is malformed.")}`);
    }
  }

  if (missing.length > 0 || mismatched.length > 0 || metadataErrors.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.generated-artifacts",
      name: "Generated artifacts",
      status: "fail",
      summary: "Required mirrored taxonomy artifacts are incomplete, inconsistent, or invalid.",
      evidence: boundEvidence(
        [
          ...missing.map((path) => `Missing artifact: ${path}`),
          ...mismatched.map((name) => `Mirrored taxonomy bytes differ: ${name}`),
          ...metadataErrors,
          ...freshnessWarnings,
        ],
        context.options.verbose,
      ),
      potentialCauses: [
        ...(missing.length > 0 ? [{cause: "Required taxonomy generation output is missing.", confidence: "high" as const}] : []),
        ...(mismatched.length > 0
          ? [{cause: "API and website taxonomy mirrors were generated from different content.", confidence: "high" as const}]
          : []),
        ...(metadataErrors.length > 0
          ? [{cause: "One or more taxonomy artifacts contain invalid or outdated release metadata.", confidence: "high" as const}]
          : []),
      ],
      fixes: [{description: "Regenerate taxonomy artifacts without running a build.", command: "npm run generate -- /a"}],
    });
  }
  if (freshnessWarnings.length > 0) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.generated-artifacts",
      name: "Generated artifacts",
      status: "warn",
      summary: "Mirrored taxonomy artifacts have invalid freshness metadata.",
      evidence: boundEvidence([...freshnessWarnings, ...freshnessEvidence], context.options.verbose),
      rootCause: "One or more taxonomy artifacts have invalid embedded generation timestamps.",
      fixes: [{description: "Regenerate taxonomy artifacts.", command: "npm run generate -- /a"}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    "workspace.generated-artifacts",
    "Generated artifacts",
    "Mirrored taxonomy artifacts are present, metadata-valid, and byte-identical.",
    [`Verified ${String(paths.length)} taxonomy artifacts across ${String(byName.size)} mirrored sets.`, ...freshnessEvidence],
  );
}

function formatBytes(bytes: number): string {
  return `${(bytes / GIBIBYTE).toFixed(2)} GiB`;
}

async function diagnoseHostCapacity(context: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  const startedAt = context.clock.monotonicNow();
  if (context.options.quick) {
    return skippedDiagnostic({
      id: "workspace.host-capacity",
      module: "workspace",
      name: "Host capacity",
      summary: "Host capacity inspection was skipped in quick mode.",
      evidence: ["--quick omits full host capacity inspection."],
    });
  }

  const aggregate: InspectionOutcome<AggregateFacts> = await context.inspection.inspect("aggregate");
  if (aggregate.kind === "unavailable") {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.host-capacity",
      name: "Host capacity",
      status: "warn",
      summary: "Host capacity could not be measured.",
      evidence: [aggregate.reason],
      potentialCauses: [{cause: "The host inspection worker could not observe system capacity.", confidence: "medium"}],
      fixes: [{description: "Verify available disk and memory manually before starting the local stack."}],
    });
  }
  if (aggregate.kind === "invalid") {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.host-capacity",
      name: "Host capacity",
      status: "warn",
      summary: "Host capacity metadata is malformed.",
      evidence: aggregate.issues,
      potentialCauses: [{cause: "The host inspection worker returned malformed capacity data.", confidence: "medium"}],
      fixes: [{description: "Verify available disk and memory manually before starting the local stack."}],
    });
  }

  const {host} = aggregate.value;
  if (host.kind === "unavailable") {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.host-capacity",
      name: "Host capacity",
      status: "warn",
      summary: "Host capacity could not be measured.",
      evidence: [host.reason],
      potentialCauses: [{cause: "The platform did not expose host capacity metadata.", confidence: "medium"}],
      fixes: [{description: "Verify available disk and memory manually before starting the local stack."}],
    });
  }
  if (host.kind === "invalid") {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.host-capacity",
      name: "Host capacity",
      status: "warn",
      summary: "Host capacity metadata is malformed.",
      evidence: host.issues,
      potentialCauses: [{cause: "The host inspection worker returned malformed capacity data.", confidence: "medium"}],
      fixes: [{description: "Verify available disk and memory manually before starting the local stack."}],
    });
  }

  const facts = host.value;
  const repositoryFilesystem = facts.filesystems.find((filesystem) => filesystem.repositoryVolume);
  const relevantFilesystems = repositoryFilesystem === undefined ? facts.filesystems : [repositoryFilesystem];
  const freeDisk =
    relevantFilesystems.length === 0
      ? undefined
      : relevantFilesystems.reduce((minimum, filesystem) => Math.min(minimum, filesystem.availableBytes), Number.POSITIVE_INFINITY);
  const availableMemory = facts.memory.availableBytes;

  const evidence = [
    freeDisk === undefined ? "Free disk: unavailable." : `Free disk: ${formatBytes(freeDisk)}`,
    `Available memory: ${formatBytes(availableMemory)} of ${formatBytes(facts.memory.totalBytes)}`,
  ];

  if (freeDisk !== undefined && freeDisk < MINIMUM_DISK_BYTES) {
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
  if ((freeDisk !== undefined && freeDisk < RECOMMENDED_DISK_BYTES) || availableMemory < RECOMMENDED_MEMORY_BYTES) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.host-capacity",
      name: "Host capacity",
      status: "warn",
      summary: "Host capacity is below the recommended development headroom.",
      evidence,
      potentialCauses: [
        ...(freeDisk !== undefined && freeDisk < RECOMMENDED_DISK_BYTES
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
}

function isNetworkUnavailable(outcome: Readonly<ProcessOutcome>): boolean {
  if (outcome.kind === "timed-out") {
    return true;
  }
  const detail = `${outcome.stdout}\n${outcome.stderr}\n${outcome.kind === "spawn-failed" ? outcome.message : ""}`;
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

  const startedAt = context.clock.monotonicNow();
  const result = await context.probes.run(probes.workspace.npmAudit(), {cwd: context.paths.root});
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
      evidence: [...commandEvidence(result), normalizeErrorForReport(error, "npm audit returned malformed JSON.")],
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

  const startedAt = context.clock.monotonicNow();
  const result = await context.probes.run(probes.workspace.npmOutdated(), {cwd: context.paths.root});
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
        evidence: boundEvidence(packages, context.options.verbose),
        rootCause: "The locked npm dependency graph is behind currently available package versions.",
        fixes: [
          {description: "Review available updates through the repository dependency-update workflow.", command: "npm outdated --json"},
        ],
      });
    }
    return passDiagnostic(context, startedAt, "workspace.npm-outdated", "Outdated npm packages", "Locked npm packages are current.", [
      "npm outdated returned no packages.",
    ]);
  } catch (error: unknown) {
    return issueDiagnostic(context, startedAt, {
      id: "workspace.npm-outdated",
      name: "Outdated npm packages",
      status: "warn",
      summary: "npm outdated returned an unrecognized response.",
      evidence: [...commandEvidence(result), normalizeErrorForReport(error, "npm outdated returned malformed JSON.")],
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
  facts: ["workspace", "npm.root", "npm.github-scripts"],
  async run(context): Promise<readonly DiagnosticResult[]> {
    const requirementSources = diagnoseRequirementSources(context);
    const nodeMinimum = context.requirements.status === "valid" ? context.requirements.requirements.node : null;
    const npmMinimum = context.requirements.status === "valid" ? context.requirements.requirements.npm : null;

    const [workspaceOutcome, npmRootOutcome, npmGithubScriptsOutcome] = [
      // Sequential by design, concurrent in effect: these three facts are declared above, so the
      // command already started them together through the runtime task scheduler and each await
      // below resolves the memoized promise of an inspection that is already in flight.
      await context.inspection.inspect("workspace"),
      await context.inspection.inspect("npm.root"),
      await context.inspection.inspect("npm.github-scripts"),
    ];

    return [
      await diagnoseRepositoryRoot(context),
      await diagnoseGit(context),
      requirementSources,
      await diagnoseRuntime(context, {
        id: "workspace.node-runtime",
        name: "Node.js runtime",
        executable: "node",
        runProbe: () => context.probes.run(probes.workspace.nodeVersion(), {cwd: context.paths.root}),
        minimum: nodeMinimum,
      }),
      await diagnoseRuntime(context, {
        id: "workspace.npm-runtime",
        name: "npm runtime",
        executable: "npm",
        runProbe: () => context.probes.run(probes.workspace.npmVersion(), {cwd: context.paths.root}),
        minimum: npmMinimum,
      }),
      diagnoseNpmTree(context, "root", npmRootOutcome),
      diagnoseNpmTree(context, "github-scripts", npmGithubScriptsOutcome),
      await diagnoseNpmCache(context),
      diagnoseNxProjects(context, workspaceOutcome),
      diagnoseNxGraph(context, workspaceOutcome),
      await diagnoseConfigFiles(context),
      await diagnoseGeneratedArtifacts(context),
      await diagnoseHostCapacity(context),
      await diagnoseNpmAudit(context),
      await diagnoseNpmOutdated(context),
    ];
  },
};
