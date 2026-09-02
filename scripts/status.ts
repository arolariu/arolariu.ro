/**
 * @fileoverview Monorepo status dashboard command for the arolariu.ro monorepo.
 * @module scripts/status
 *
 * @remarks
 * Status is a read-only command: it resolves canonical repository paths through the runtime's
 * read-only filesystem, obtains exactly one quick repository inspection session from the
 * runtime-owned inspection registry, and then collects five degradation-tolerant sections
 * (workspaces, the Nx dependency graph derived from tracked workspace metadata, git state, npm
 * audit/outdated, and disk usage) concurrently through {@link CommandRuntime.tasks}. A failure or
 * malformed result from any single one of those sources degrades that section to `null`
 * ("unavailable") without invalidating the rest of the report and without inventing a zero,
 * `"unknown"`, or empty-array stand-in for a genuine failure.
 *
 * The sixth section, health, is not a collector at all: doctor is composed as a typed child
 * command through `doctorCommand.invoke()` inside this invocation's runtime scope, so the child
 * shares this command's cancellation, cleanup ownership, and — decisively — the exact same shared
 * inspection session Status already obtained for its own collectors. Both doctor completion exit
 * codes are health data, while a failed, cancelled, or help child outcome is owned by Status: it
 * becomes a command failure or cancellation instead of a fabricated "unavailable" health section,
 * and no dashboard or JSON document is rendered in that case.
 *
 * Every external probe (git, npm, and the disk usage probe) is issued through the runtime process
 * runner as an explicit {@link ProcessRequest} — never a shell string — and the command never
 * writes a temporary file, never mutates the repository, and never inherits child process output.
 * The workspace graph is read from tracked metadata instead of an Nx child process, which would
 * rewrite Nx's native workspace database. All human or machine-readable output is produced by the
 * runtime logger.
 *
 * @example
 * ```bash
 * node scripts/status.ts          # full dashboard
 * node scripts/status.ts --json   # machine-readable JSON
 * node scripts/status.ts --help   # usage info
 * ```
 */

import {join} from "node:path";

import {MonorepoCommand, toJsonValue, type CommandContext, type CommandInvoker, type CommandRuntimeFactory} from "./common/commander.ts";
import {formatBytes} from "./common/index.ts";
import type {LogSegment, MonorepositoryLogger} from "./common/logger.ts";
import {resolveRepositoryPaths, type RepositoryPaths} from "./common/repository-paths.ts";
import type {ProcessOutcome, ProcessRequest, ProcessRunner} from "./common/runner.ts";
import {
  asReadOnlyFileSystem,
  CommandCancellation,
  type ReadOnlyFileSystem,
  type RepositoryInspectionRequest,
  type TaskScheduler,
} from "./common/runtime.ts";
import {doctorCommand} from "./doctor.ts";
import type {DoctorInput, DoctorReport, DoctorSummary} from "./doctor.types.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";

// ============================================================================
// Types
// ============================================================================

/** Workspace metadata for a single project in the monorepo. */
interface WorkspaceInfo {
  readonly name: string;
  readonly version: string;
  readonly type: string;
  readonly tags: readonly string[];
}

/** Dependency edge from the Nx project graph. */
interface DependencyEdge {
  readonly source: string;
  readonly target: string;
}

/** Git repository state. */
interface GitInfo {
  readonly branch: string;
  readonly sha: string;
  readonly lastCommitTime: string;
  readonly lastCommitMsg: string;
  readonly dirtyFiles: number;
}

/** npm audit and outdated summary. */
interface SecurityInfo {
  readonly critical: number;
  readonly high: number;
  readonly moderate: number;
  readonly low: number;
  readonly majorOutdated: number;
  readonly minorOutdated: number;
  readonly patchOutdated: number;
}

/** Disk usage in bytes for key directories. */
export interface DiskInfo {
  readonly nodeModules: number;
  readonly nextBuild: number;
  readonly componentsDist: number;
}

/** Health score and summary from the composed doctor command. */
export interface HealthInfo {
  readonly score: number;
  readonly grade: string;
  readonly summary: DoctorSummary;
}

/** Typed status command input decoded from the CLI or supplied by a programmatic caller. */
export interface StatusInput {
  readonly json: boolean;
}

/**
 * Read-only capabilities and repository context every status collector observes.
 *
 * @remarks
 * Each collector declares the narrow `Pick` of this shape it actually needs, so no collector can
 * reach a capability it has no business using, and every collector stays free of ambient state.
 */
interface StatusSources {
  /** Read-only filesystem used for workspace manifests. */
  readonly files: ReadOnlyFileSystem;
  /** Engine-neutral process runner used for every external probe. */
  readonly runner: ProcessRunner;
  /** Deterministic task orchestration used instead of raw `Promise` combinators. */
  readonly tasks: TaskScheduler;
  /** The single shared repository inspection session for this invocation. */
  readonly inspection: RepositoryInspectionSession;
  /** Canonical repository paths resolved once for this invocation. */
  readonly paths: RepositoryPaths;
  /** Absolute path to the executable running this command, used by the disk probe. */
  readonly executablePath: string;
  /** Cancellation signal of the owning command invocation. */
  readonly signal: AbortSignal;
}

/** Capabilities the workspace metadata collector observes. */
type WorkspaceSources = Pick<StatusSources, "inspection" | "files" | "tasks" | "paths" | "signal">;

/** Capabilities the dependency-graph collector observes. */
type GraphSources = Pick<StatusSources, "inspection">;

/** Capabilities the git and npm collectors observe. */
type ProbeSources = Pick<StatusSources, "runner" | "tasks" | "paths" | "signal">;

/** Capabilities the disk-usage collector observes. */
type DiskSources = Pick<StatusSources, "runner" | "tasks" | "paths" | "executablePath" | "signal">;

/** The five degradation-tolerant sections collected before doctor is composed. */
interface OrdinaryStatusSections {
  readonly workspaces: readonly WorkspaceInfo[] | null;
  readonly nxEdges: readonly DependencyEdge[] | null;
  readonly git: GitInfo | null;
  readonly security: SecurityInfo | null;
  readonly disk: DiskInfo | null;
}

/** Construction seams {@link createStatusCommand} accepts. */
export interface StatusCommandDependencies {
  /** Runtime factory used for every scope; tests inject a fake instead of the Node adapter. */
  readonly runtimeFactory?: CommandRuntimeFactory;
  /** Typed doctor command composed as the health source; defaults to the production singleton. */
  readonly doctor?: CommandInvoker<DoctorInput, DoctorReport>;
}

// ============================================================================
// Constants
// ============================================================================

const GIT_TIMEOUT_MS = 30_000;
const NPM_TIMEOUT_MS = 60_000;
const DISK_PROBE_TIMEOUT_MS = 60_000;
const WORKSPACE_MANIFEST_CONCURRENCY = 8;

const GIT_BRANCH_COMMAND = {command: "git", args: ["rev-parse", "--abbrev-ref", "HEAD"]} as const satisfies ProcessRequest;
const GIT_SHA_COMMAND = {command: "git", args: ["rev-parse", "--short", "HEAD"]} as const satisfies ProcessRequest;
const GIT_LAST_COMMIT_TIME_COMMAND = {command: "git", args: ["log", "-1", "--format=%cr"]} as const satisfies ProcessRequest;
const GIT_LAST_COMMIT_MSG_COMMAND = {command: "git", args: ["log", "-1", "--format=%s"]} as const satisfies ProcessRequest;
const GIT_STATUS_COMMAND = {command: "git", args: ["status", "--porcelain"]} as const satisfies ProcessRequest;
const NPM_AUDIT_COMMAND = {command: "npm", args: ["audit", "--json"]} as const satisfies ProcessRequest;
const NPM_OUTDATED_COMMAND = {command: "npm", args: ["outdated", "--json"]} as const satisfies ProcessRequest;

/**
 * Read-only Node.js source, executed as a separate process via `node --eval`, that measures the
 * total byte size of a directory or file tree.
 *
 * @remarks
 * Runs entirely inside the spawned child process — no parent-process recursion, no unbounded
 * pending-task fan-out, and no temp file. Traversal is single-threaded and therefore inherently
 * sequential/bounded. A directory/file entry reported as a symbolic link (which also covers
 * Windows junctions, verified cross-platform via `Dirent#isSymbolicLink()`) is skipped rather
 * than followed, so no cycle or double counting is possible. A missing target resolves to `0`;
 * every other filesystem error (permission failure, etc.) is written to stderr and the process
 * exits non-zero so the parent can classify the whole disk section unavailable.
 */
const DISK_PROBE_SCRIPT = [
  '"use strict";',
  'const fs = require("node:fs");',
  'const path = require("node:path");',
  "function sizeOf(target) {",
  "  let stats;",
  "  try {",
  "    stats = fs.lstatSync(target);",
  "  } catch (error) {",
  '    if (error && error.code === "ENOENT") return 0;',
  "    throw error;",
  "  }",
  "  if (stats.isSymbolicLink()) return 0;",
  "  if (stats.isFile()) return stats.size;",
  "  if (!stats.isDirectory()) return 0;",
  "  let total = 0;",
  "  for (const entry of fs.readdirSync(target, {withFileTypes: true})) {",
  "    if (entry.isSymbolicLink()) continue;",
  "    total += sizeOf(path.join(target, entry.name));",
  "  }",
  "  return total;",
  "}",
  "const target = process.argv[1];",
  "try {",
  "  process.stdout.write(String(sizeOf(target)));",
  "} catch (error) {",
  "  process.stderr.write(error && error.message ? error.message : String(error));",
  "  process.exitCode = 1;",
  "}",
].join("\n");

/** Strict, sign-free, decimal-point-free byte-count pattern for probe stdout. */
const NONNEGATIVE_INTEGER_PATTERN = /^[0-9]+$/;

// ============================================================================
// Small Utilities
// ============================================================================

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSuccessfulOutcome(outcome: Readonly<ProcessOutcome>): boolean {
  return outcome.kind === "succeeded";
}

/**
 * Reports whether an outcome failed before the child could report its own exit status.
 *
 * @remarks
 * A spawn failure, timeout, cancellation, or signal termination means the probe never produced
 * trustworthy output, while an ordinary nonzero exit (`"exited"`) is normal for `npm audit` and
 * `npm outdated` and keeps its JSON payload.
 *
 * @param outcome - The completed process outcome.
 * @returns `true` when the transport itself failed.
 */
function hasTransportFailure(outcome: Readonly<ProcessOutcome>): boolean {
  return (
    outcome.kind === "spawn-failed" || outcome.kind === "timed-out" || outcome.kind === "cancelled" || outcome.kind === "signalled"
  );
}

/**
 * Reads and parses one optional JSON manifest without failing the caller.
 *
 * @param files - Read-only filesystem capability.
 * @param path - Absolute manifest path.
 * @returns The parsed value, or `undefined` when the file is absent or malformed.
 */
async function readOptionalJson(files: ReadOnlyFileSystem, path: string): Promise<unknown> {
  try {
    const parsed: unknown = JSON.parse(await files.readText(path));
    return parsed;
  } catch {
    return undefined;
  }
}

/**
 * Builds the disk-size probe request for one absolute target path.
 *
 * @remarks
 * The executable, the fixed `--eval` script literal, and the target path are three separate
 * {@link ProcessRequest.args} elements — never an interpolated or shell-joined string — so the
 * child process receives the target purely as `process.argv[1]`.
 *
 * @param executablePath - Absolute path to the Node executable running this command.
 * @param absolutePath - Absolute directory or file path to measure.
 * @returns The disk-size probe request.
 */
function buildDiskSizeRequest(executablePath: string, absolutePath: string): ProcessRequest {
  return {command: executablePath, args: ["--eval", DISK_PROBE_SCRIPT, absolutePath]};
}

/**
 * Parses one disk-size probe result into a strict nonnegative byte count.
 *
 * @remarks
 * A transport failure (spawn error, timeout, cancellation, or signal termination), a nonzero exit
 * code, or stdout that is empty or does not match a strict nonnegative integer all resolve to
 * `null` — never a fabricated `0`.
 *
 * @param outcome - The complete outcome of running the disk-size probe.
 * @returns The parsed byte count, or `null` when unavailable.
 */
function parseDiskProbeSize(outcome: Readonly<ProcessOutcome>): number | null {
  if (!isSuccessfulOutcome(outcome)) {
    return null;
  }

  const trimmed = outcome.stdout.trim();
  if (!NONNEGATIVE_INTEGER_PATTERN.test(trimmed)) {
    return null;
  }

  const size = Number(trimmed);
  return Number.isSafeInteger(size) ? size : null;
}

// ============================================================================
// Data Collectors
// ============================================================================

/**
 * Collects workspace metadata from the inspection session's WorkspaceFacts.
 *
 * @remarks
 * Project metadata is derived from the shared inspection session's workspace facts instead of a
 * hard-coded project list, so a newly added Nx project automatically appears. Manifests are read
 * through the read-only filesystem with bounded concurrency and in declared project order.
 *
 * @param sources - Inspection session, read-only filesystem, scheduler, paths, and signal.
 * @returns Array of workspace info objects, or `null` when unavailable.
 */
async function collectWorkspaces(sources: Readonly<WorkspaceSources>): Promise<readonly WorkspaceInfo[] | null> {
  const outcome = await sources.inspection.inspect("workspace");
  if (outcome.kind !== "available") {
    return null;
  }

  return sources.tasks.mapBounded(
    [...outcome.value.projects],
    WORKSPACE_MANIFEST_CONCURRENCY,
    async (project): Promise<WorkspaceInfo> => {
      const projectDirectory = join(sources.paths.root, project.root);
      let name = project.name;
      let version = "—";
      let type = "unknown";
      let tags: readonly string[] = [];

      const manifest = await readOptionalJson(sources.files, join(projectDirectory, "package.json"));
      if (isRecord(manifest)) {
        if (typeof manifest["name"] === "string") name = manifest["name"];
        if (typeof manifest["version"] === "string") version = manifest["version"];
      }

      const projectFile = await readOptionalJson(sources.files, join(projectDirectory, "project.json"));
      if (isRecord(projectFile)) {
        if (typeof projectFile["name"] === "string") name = projectFile["name"];
        if (typeof projectFile["projectType"] === "string") {
          type = projectFile["projectType"] === "library" ? "lib" : "app";
        }
        const declaredTags: unknown = projectFile["tags"];
        if (Array.isArray(declaredTags)) {
          tags = declaredTags.filter((tag: unknown): tag is string => typeof tag === "string");
        }
      }

      return {name, version, type, tags};
    },
    sources.signal,
  );
}

/**
 * Derives inter-project dependency edges from the inspection session's WorkspaceFacts.
 *
 * @param sources - The shared repository inspection session.
 * @returns Dependency edges, or `null` when unavailable.
 */
async function collectNxGraph(sources: Readonly<GraphSources>): Promise<readonly DependencyEdge[] | null> {
  const outcome = await sources.inspection.inspect("workspace");
  if (outcome.kind !== "available") {
    return null;
  }

  const targetsBySource = new Map<string, Set<string>>();
  for (const dependency of outcome.value.dependencies) {
    const targets = targetsBySource.get(dependency.source) ?? new Set<string>();
    targets.add(dependency.target);
    targetsBySource.set(dependency.source, targets);
  }

  return [...targetsBySource.entries()]
    .toSorted(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .flatMap(([source, targets]) =>
      [...targets].toSorted((left, right) => (left < right ? -1 : left > right ? 1 : 0)).map((target) => ({source, target})),
    );
}

/**
 * Collects current git repository state: branch, SHA, last commit info, and the number of dirty
 * (uncommitted) files.
 *
 * @remarks
 * Every underlying git command must succeed for git state to be considered available; a single
 * failing command makes the whole section `null` instead of substituting `"unknown"` per field.
 *
 * @param sources - Process runner, scheduler, repository paths, and cancellation signal.
 * @returns Git info, or `null` when any underlying command fails.
 */
async function collectGit(sources: Readonly<ProbeSources>): Promise<GitInfo | null> {
  const options = {cwd: sources.paths.root, timeoutMs: GIT_TIMEOUT_MS, signal: sources.signal};
  const outcomes = await sources.tasks.parallel(
    [GIT_BRANCH_COMMAND, GIT_SHA_COMMAND, GIT_LAST_COMMIT_TIME_COMMAND, GIT_LAST_COMMIT_MSG_COMMAND, GIT_STATUS_COMMAND].map(
      (request) => (): Promise<ProcessOutcome> => sources.runner.run(request, options),
    ),
    sources.signal,
  );

  const [branch, sha, lastCommitTime, lastCommitMsg, status] = outcomes;
  if (
    branch === undefined
    || sha === undefined
    || lastCommitTime === undefined
    || lastCommitMsg === undefined
    || status === undefined
  ) {
    return null;
  }

  if (![branch, sha, lastCommitTime, lastCommitMsg, status].every(isSuccessfulOutcome)) {
    return null;
  }

  let lastCommitMsgText = lastCommitMsg.stdout.trim();
  if (lastCommitMsgText.length > 60) {
    lastCommitMsgText = `${lastCommitMsgText.slice(0, 57)}...`;
  }
  const dirtyFiles = status.stdout.split("\n").filter((line) => line.trim().length > 0).length;

  return {
    branch: branch.stdout.trim(),
    sha: sha.stdout.trim(),
    lastCommitTime: lastCommitTime.stdout.trim(),
    lastCommitMsg: lastCommitMsgText,
    dirtyFiles,
  };
}

function parseSeverityCount(value: unknown, label: string): number {
  if (value === undefined) {
    return 0;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`npm audit ${label} count must be a non-negative number.`);
  }
  return value;
}

function classifyOutdatedBump(current: string, latest: string): "major" | "minor" | "patch" {
  const currentParts = current.split(".");
  const latestParts = latest.split(".");
  if ((currentParts[0] ?? "") !== (latestParts[0] ?? "")) {
    return "major";
  }
  if ((currentParts[1] ?? "") !== (latestParts[1] ?? "")) {
    return "minor";
  }
  return "patch";
}

/**
 * Runs `npm audit --json` and `npm outdated --json` to gather vulnerability counts by severity
 * and outdated-package counts by semver bump level.
 *
 * @remarks
 * Both commands may exit non-zero in normal operation (vulnerabilities or outdated packages
 * found) — that nonzero JSON is preserved. Only a transport failure, or JSON that does not match
 * the expected shape, makes the whole section `null`; it never falls back to all-zero counts.
 *
 * @param sources - Process runner, scheduler, repository paths, and cancellation signal.
 * @returns Security info, or `null` when unavailable.
 */
async function collectSecurity(sources: Readonly<ProbeSources>): Promise<SecurityInfo | null> {
  const options = {cwd: sources.paths.root, timeoutMs: NPM_TIMEOUT_MS, signal: sources.signal};
  const outcomes = await sources.tasks.parallel(
    [NPM_AUDIT_COMMAND, NPM_OUTDATED_COMMAND].map((request) => (): Promise<ProcessOutcome> => sources.runner.run(request, options)),
    sources.signal,
  );

  const [auditOutcome, outdatedOutcome] = outcomes;
  if (auditOutcome === undefined || outdatedOutcome === undefined) {
    return null;
  }

  if (hasTransportFailure(auditOutcome) || hasTransportFailure(outdatedOutcome)) {
    return null;
  }

  let auditPayload: unknown;
  try {
    auditPayload = JSON.parse(auditOutcome.stdout);
  } catch {
    return null;
  }
  if (!isRecord(auditPayload)) {
    return null;
  }
  const metadata = auditPayload["metadata"];
  if (!isRecord(metadata)) {
    return null;
  }
  const vulnerabilities = metadata["vulnerabilities"];
  if (!isRecord(vulnerabilities)) {
    return null;
  }

  let critical: number;
  let high: number;
  let moderate: number;
  let low: number;
  try {
    critical = parseSeverityCount(vulnerabilities["critical"], "critical");
    high = parseSeverityCount(vulnerabilities["high"], "high");
    moderate = parseSeverityCount(vulnerabilities["moderate"], "moderate");
    low = parseSeverityCount(vulnerabilities["low"], "low");
  } catch {
    return null;
  }

  // A successful current `npm outdated --json` run always writes a JSON object — an empty
  // `{}` when nothing is outdated — because npm's JSON branch is unconditional. Empty stdout
  // is therefore unambiguously a failed probe (registry/auth error, arborist load failure,
  // EJSONPARSE, etc.) and must never be treated as a "0 outdated" success.
  const trimmedOutdated = outdatedOutcome.stdout.trim();
  if (trimmedOutdated.length === 0) {
    return null;
  }
  let outdatedPayload: unknown;
  try {
    outdatedPayload = JSON.parse(trimmedOutdated);
  } catch {
    return null;
  }
  if (!isRecord(outdatedPayload)) {
    return null;
  }

  let majorOutdated = 0;
  let minorOutdated = 0;
  let patchOutdated = 0;
  for (const entry of Object.values(outdatedPayload)) {
    if (!isRecord(entry) || typeof entry["current"] !== "string" || typeof entry["latest"] !== "string") {
      continue;
    }
    const bump = classifyOutdatedBump(entry["current"], entry["latest"]);
    if (bump === "major") majorOutdated++;
    else if (bump === "minor") minorOutdated++;
    else patchOutdated++;
  }

  return {critical, high, moderate, low, majorOutdated, minorOutdated, patchOutdated};
}

/**
 * Measures on-disk size of key directories through the shared, out-of-process disk-size probe.
 *
 * @remarks
 * Each of the three targets is measured by a separate, argument-separated
 * `<node> --eval <script> <targetPath>` invocation issued through the runtime process runner —
 * never an in-process recursive traversal, a shell string, or a temp file. Every probe carries
 * the repository `cwd`, a bounded 60 s `timeoutMs`, and the invocation cancellation signal; the
 * runner terminates a stalled child rather than merely racing a promise while filesystem work
 * continues. The three probes are independent child processes started through the runtime
 * scheduler, so running them concurrently adds no unbounded parent-process queue. A transport
 * failure, a nonzero exit code, or malformed/negative/non-integer stdout from any single probe
 * makes the whole disk section `null` — never a fabricated `0` for a real I/O failure. A probe
 * legitimately reports `0` only when its target is absent.
 *
 * @param sources - Process runner, scheduler, repository paths, executable path, and signal.
 * @returns Byte counts for `node_modules`, `.next`, and `dist`, or `null`.
 */
export async function collectDisk(sources: Readonly<DiskSources>): Promise<DiskInfo | null> {
  const {root} = sources.paths;
  const targets = [
    join(root, "node_modules"),
    join(root, "sites", "arolariu.ro", ".next"),
    join(root, "packages", "components", "dist"),
  ] as const;
  const options = {cwd: root, timeoutMs: DISK_PROBE_TIMEOUT_MS, signal: sources.signal};

  const outcomes = await sources.tasks.parallel(
    targets.map(
      (target) => (): Promise<ProcessOutcome> => sources.runner.run(buildDiskSizeRequest(sources.executablePath, target), options),
    ),
    sources.signal,
  );

  const [nodeModules, nextBuild, componentsDist] = outcomes.map(parseDiskProbeSize);
  if (
    nodeModules === null
    || nodeModules === undefined
    || nextBuild === null
    || nextBuild === undefined
    || componentsDist === null
    || componentsDist === undefined
  ) {
    return null;
  }

  return {nodeModules, nextBuild, componentsDist};
}

// ============================================================================
// Rendering
// ============================================================================

function renderHealthSummary(summary: Readonly<DoctorSummary>): string {
  return `${String(summary.passed)} passed, ${String(summary.warnings)} warning${summary.warnings === 1 ? "" : "s"}, ${String(summary.failed)} failure${summary.failed === 1 ? "" : "s"}, ${String(summary.skipped)} skipped`;
}

/**
 * Renders the full status dashboard through the invocation logger.
 *
 * @param logger - Repository logger abstraction.
 * @param document - The complete, six-section status payload.
 * @param nodeMajor - Major version label of the Node runtime executing this command.
 */
function renderDashboard(logger: MonorepositoryLogger, document: Readonly<StatusDocument>, nodeMajor: string): void {
  const {workspaces, nxEdges, git, security, disk, health} = document;
  const healthLabel = health ? `${String(health.score)} (${health.grade})` : "unavailable";
  const branchLabel = git?.branch ?? "unavailable";

  logger.banner(["🏠 arolariu.ro monorepo status"], "cyan");
  logger.line(`Branch: ${branchLabel}  │  Node: ${nodeMajor}.x  │  Health: ${healthLabel}`);
  if (health) {
    logger.line(`Health summary: ${renderHealthSummary(health.summary)}`);
  }

  logger.section("📦 Workspaces");
  if (workspaces) {
    logger.table({
      headers: ["Package", "Version", "Type", "Tags"],
      rows: workspaces.map((workspace) => [
        workspace.name.replace("@arolariu/", ""),
        workspace.version,
        workspace.type,
        workspace.tags
          .filter((tag) => tag.startsWith("domain:"))
          .map((tag) => tag.replace("domain:", ""))
          .join(", "),
      ]),
    });
  } else {
    logger.line([{text: "unavailable", styles: ["yellow"]}]);
  }

  logger.section("🔗 Dependency Graph");
  if (nxEdges && nxEdges.length > 0) {
    const inbound = new Map<string, string[]>();
    const mentioned = new Set<string>();

    for (const edge of nxEdges) {
      const source = edge.source.replace("@arolariu/", "");
      const target = edge.target.replace("@arolariu/", "");
      mentioned.add(source);
      mentioned.add(target);
      const list = inbound.get(target);
      if (list) {
        if (!list.includes(source)) list.push(source);
      } else {
        inbound.set(target, [source]);
      }
    }

    for (const [target, sources] of inbound) {
      logger.line(`${target} ← ${sources.join(", ")}`);
    }

    if (workspaces) {
      for (const workspace of workspaces) {
        const short = workspace.name.replace("@arolariu/", "");
        if (!mentioned.has(short)) {
          logger.line([{text: `${short} (isolated)`, styles: ["gray"]}]);
        }
      }
    }
  } else if (nxEdges) {
    logger.line([{text: "No inter-project dependencies found", styles: ["gray"]}]);
  } else {
    logger.line([{text: "unavailable", styles: ["yellow"]}]);
  }

  logger.section("📋 Git");
  if (git) {
    logger.line(`Branch: ${git.branch} @ ${git.sha}`);
    logger.line(`Last: ${git.lastCommitTime} — "${git.lastCommitMsg}"`);
    const treeStatus: LogSegment =
      git.dirtyFiles === 0
        ? {text: "clean", styles: ["green"]}
        : {text: `${String(git.dirtyFiles)} file${git.dirtyFiles === 1 ? "" : "s"} modified`, styles: ["yellow"]};
    logger.line([{text: "Working tree: "}, treeStatus]);
  } else {
    logger.line([{text: "unavailable", styles: ["yellow"]}]);
  }

  logger.section("🔒 Security & Dependencies");
  if (security) {
    logger.line(`Audit:    ${String(security.critical)} critical, ${String(security.high)} high, ${String(security.moderate)} moderate`);
    logger.line(
      `Outdated: ${String(security.majorOutdated)} major, ${String(security.minorOutdated)} minor, ${String(security.patchOutdated)} patch`,
    );
  } else {
    logger.line([{text: "unavailable", styles: ["yellow"]}]);
  }

  logger.section("💾 Disk Usage");
  if (disk) {
    logger.line(
      `node_modules: ${formatBytes(disk.nodeModules)}  │  .next: ${formatBytes(disk.nextBuild)}  │  dist: ${formatBytes(disk.componentsDist)}`,
    );
  } else {
    logger.line([{text: "unavailable", styles: ["yellow"]}]);
  }
}

// ============================================================================
// Collection
// ============================================================================

function toHealthInfo(report: Readonly<DoctorReport>): HealthInfo {
  return {score: report.score, grade: report.grade, summary: report.summary};
}

/**
 * Collects every status section for one invocation.
 *
 * @remarks
 * The five ordinary collectors run concurrently through {@link TaskScheduler.allSettled}, so a
 * rejected or unavailable collector degrades to exactly one `null` section in the fixed six-key
 * document while its siblings keep their data. Health is different: Status obtains its own quick
 * inspection session from the runtime registry *before* composing doctor, and the child doctor
 * invocation resolves the identical `{profile: "quick", paths}` request from the shared parent
 * registry, so both lookups return one session instead of tripping the conflicting-request guard
 * or starting a second inspection. Both doctor completion exit codes contribute their typed
 * report, while a cancelled, failed, or help outcome is rethrown so the command lifecycle owns it
 * and no success document is ever rendered.
 *
 * @param context - The invocation context owning every capability this run may use.
 * @param doctor - Typed doctor command composed as the health source.
 * @returns The complete six-section status document.
 * @throws {CommandCancellation} When the composed doctor invocation was cancelled.
 * @throws {Error} When the composed doctor invocation failed or returned help.
 */
async function collectStatus(
  context: Readonly<CommandContext>,
  doctor: CommandInvoker<DoctorInput, DoctorReport> = doctorCommand,
): Promise<{
  readonly workspaces: Awaited<ReturnType<typeof collectWorkspaces>> | null;
  readonly nxEdges: Awaited<ReturnType<typeof collectNxGraph>> | null;
  readonly git: Awaited<ReturnType<typeof collectGit>> | null;
  readonly security: Awaited<ReturnType<typeof collectSecurity>> | null;
  readonly disk: DiskInfo | null;
  readonly health: HealthInfo | null;
}> {
  const {runtime} = context;
  const files = asReadOnlyFileSystem(runtime.files);
  const paths = await resolveRepositoryPaths(import.meta.url, files);

  const request: RepositoryInspectionRequest = {profile: "quick", paths};
  const inspection = runtime.inspection.getRepositorySession(request);
  const sources: StatusSources = {
    files,
    runner: runtime.runner,
    tasks: runtime.tasks,
    inspection,
    paths,
    executablePath: runtime.environment.executablePath,
    signal: runtime.signal,
  };

  const settled = await runtime.tasks.allSettled<Partial<OrdinaryStatusSections>>(
    [
      async (): Promise<Partial<OrdinaryStatusSections>> => ({workspaces: await collectWorkspaces(sources)}),
      async (): Promise<Partial<OrdinaryStatusSections>> => ({nxEdges: await collectNxGraph(sources)}),
      async (): Promise<Partial<OrdinaryStatusSections>> => ({git: await collectGit(sources)}),
      async (): Promise<Partial<OrdinaryStatusSections>> => ({security: await collectSecurity(sources)}),
      async (): Promise<Partial<OrdinaryStatusSections>> => ({disk: await collectDisk(sources)}),
    ],
    runtime.signal,
  );

  let sections: OrdinaryStatusSections = {workspaces: null, nxEdges: null, git: null, security: null, disk: null};
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      sections = {...sections, ...outcome.value};
    }
  }

  const healthExecution = await doctor.invoke({quick: true, verbose: false}, {parent: context, presentation: "silent"});

  let health: HealthInfo;
  switch (healthExecution.status) {
    case "completed":
      health = toHealthInfo(healthExecution.value);
      break;
    case "cancelled":
      throw new CommandCancellation(healthExecution.failure.message, healthExecution.exitCode);
    case "failed":
      throw new Error(healthExecution.failure.message, {cause: healthExecution.failure.cause});
    case "help":
      throw new Error("Doctor returned help during typed invocation.");
  }

  return {...sections, health};
}

/** The complete, six-section status payload produced by one status invocation. */
export type StatusDocument = Awaited<ReturnType<typeof collectStatus>>;

// ============================================================================
// Command
// ============================================================================

/**
 * Reads the major version label of the Node runtime executing this command.
 *
 * @remarks
 * `process.versions` is an immutable, effect-free description of the running binary; the runtime
 * environment snapshot exposes no equivalent, and widening that capability is outside this
 * command's contract. Every other ambient value the dashboard needs arrives through the runtime.
 *
 * @returns The Node major version, or `"?"` when the running binary does not report one.
 */
function nodeMajorVersion(): string {
  return process.versions["node"]?.split(".")[0] ?? "?";
}

/**
 * Creates the status command.
 *
 * @param dependencies - Optional runtime factory and composed doctor command; tests inject
 * deterministic fakes instead of replacing command business code.
 * @returns The typed `status` command object.
 */
export function createStatusCommand(dependencies: Readonly<StatusCommandDependencies> = {}): MonorepoCommand<StatusInput, StatusDocument> {
  const doctor = dependencies.doctor ?? doctorCommand;

  return new MonorepoCommand<StatusInput, StatusDocument>(
    {
      metadata: {
        name: "status",
        description: "Collects and renders monorepo health, workspace, git, security, and disk data.",
        examples: ["npm run status", "npm run status -- --json"],
      },
      configure: (program) => {
        program.option("--json", "Output all collected data as a single JSON document.", false);
      },
      decode: (program) => {
        const options = program.opts<{json?: boolean}>();
        return {json: options.json === true};
      },
      presentation: (input) => (input.json ? "json" : "human"),
      execute: (context) => collectStatus(context, doctor),
      completion: (document) => ({
        exitCode: 0,
        human: (logger) => {
          renderDashboard(logger, document, nodeMajorVersion());
        },
        json: toJsonValue(document),
      }),
    },
    dependencies.runtimeFactory,
  );
}

/** Production singleton used by `npm run status` and this module's direct entrypoint. */
export const statusCommand: MonorepoCommand<StatusInput, StatusDocument> = createStatusCommand();

await statusCommand.runIfMain(import.meta.url);
