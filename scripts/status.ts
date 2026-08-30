/**
 * @fileoverview Monorepo status dashboard for the arolariu.ro monorepo.
 * @module scripts/status
 *
 * @remarks
 * Collects data from multiple sources concurrently (workspaces, the Nx
 * dependency graph, git state, npm audit/outdated, disk usage, and the
 * doctor health report) then renders a dashboard through
 * {@link MonorepositoryLogger} or emits it as a single JSON document.
 *
 * Every collector runs independently through `Promise.allSettled()`, so a
 * failure or malformed result from any single source degrades that section
 * to `null` ("unavailable") without invalidating the rest of the report and
 * without inventing a zero, `"unknown"`, or empty-array stand-in for a
 * genuine failure. Every external probe (git, npm, the Nx graph, and the
 * doctor report) is issued through the shared {@link CommandRunner} as an
 * explicit {@link CommandSpec} — never a shell string — and the script never
 * writes a temporary file or inherits child process output. All human or
 * machine-readable output is produced by {@link MonorepositoryLogger}.
 *
 * @example
 * ```bash
 * node scripts/status.ts          # full dashboard
 * node scripts/status.ts --json   # machine-readable JSON
 * node scripts/status.ts --help   # usage info
 * ```
 */

import {readdir, stat} from "node:fs/promises";
import {existsSync, readFileSync, type Stats} from "node:fs";
import {join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

import {formatBytes} from "./common/index.ts";
import {MonorepositoryConsoleLogger, type LogSegment, type MonorepositoryLogger} from "./common/logger.ts";
import {defaultCommandRunner, type CommandResult, type CommandRunner, type CommandSpec} from "./common/process.ts";
import {resolveRepositoryPaths, type RepositoryPaths} from "./common/repository-paths.ts";
import {parseDoctorReport} from "./doctor.reporter.ts";
import type {DoctorSummary} from "./doctor.types.ts";
import {parseNxGraph} from "./doctor.workspace.ts";

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
interface DiskInfo {
  readonly nodeModules: number;
  readonly nextBuild: number;
  readonly componentsDist: number;
}

/** Health score and summary from the doctor script. */
export interface HealthInfo {
  readonly score: number;
  readonly grade: string;
  readonly summary: DoctorSummary;
}

/** The complete, six-section status payload. */
interface StatusOutput {
  readonly workspaces: readonly WorkspaceInfo[] | null;
  readonly nxEdges: readonly DependencyEdge[] | null;
  readonly git: GitInfo | null;
  readonly security: SecurityInfo | null;
  readonly disk: DiskInfo | null;
  readonly health: HealthInfo | null;
}

/** Parsed CLI options. */
interface StatusOptions {
  readonly json: boolean;
  readonly help: boolean;
}

/**
 * Boundary values {@link main} needs to resolve repository context and
 * execute every collector.
 *
 * @remarks
 * Exported so tests can inject a deterministic command runner, logger,
 * repository-path resolver, or filesystem traversal without replacing the
 * repository modules that own those boundaries.
 */
export interface StatusDependencies {
  /** Executes read-only status commands. */
  readonly runner: CommandRunner;
  /** Receives dashboard presentation and JSON output. */
  readonly logger: MonorepositoryLogger;
  /** Resolves canonical repository paths. */
  readonly resolveRepositoryPaths: () => RepositoryPaths;
  /** Measures the total byte size of a directory (or file) tree. */
  readonly measureDirectorySize: (absolutePath: string) => Promise<number>;
}

// ============================================================================
// Constants
// ============================================================================

/** Relative paths (from the repository root) to every workspace project. */
const WORKSPACE_DIRS: readonly string[] = [
  "packages/components",
  "sites/arolariu.ro",
  "sites/cv.arolariu.ro",
  "sites/api.arolariu.ro",
  "sites/docs.arolariu.ro",
];

const GIT_TIMEOUT_MS = 30_000;
const NPM_TIMEOUT_MS = 60_000;
const NX_TIMEOUT_MS = 60_000;
const DOCTOR_TIMEOUT_MS = 60_000;
const MAX_CONCURRENT_STAT_OPERATIONS = 64;

const GIT_BRANCH_COMMAND = {command: "git", args: ["rev-parse", "--abbrev-ref", "HEAD"]} as const satisfies CommandSpec;
const GIT_SHA_COMMAND = {command: "git", args: ["rev-parse", "--short", "HEAD"]} as const satisfies CommandSpec;
const GIT_LAST_COMMIT_TIME_COMMAND = {command: "git", args: ["log", "-1", "--format=%cr"]} as const satisfies CommandSpec;
const GIT_LAST_COMMIT_MSG_COMMAND = {command: "git", args: ["log", "-1", "--format=%s"]} as const satisfies CommandSpec;
const GIT_STATUS_COMMAND = {command: "git", args: ["status", "--porcelain"]} as const satisfies CommandSpec;
const NPM_AUDIT_COMMAND = {command: "npm", args: ["audit", "--json"]} as const satisfies CommandSpec;
const NPM_OUTDATED_COMMAND = {command: "npm", args: ["outdated", "--json"]} as const satisfies CommandSpec;
const NX_GRAPH_COMMAND = {
  command: "npx",
  args: ["--no-install", "nx", "graph", "--print", "--open=false", "--watch=false"],
} as const satisfies CommandSpec;

const HELP_LINES: readonly string[] = [
  "Usage: node scripts/status.ts [options]",
  "",
  "Options:",
  "  --json        Output all collected data as a single JSON document.",
  "  --help, -h    Show this help message.",
];

// ============================================================================
// Small Utilities
// ============================================================================

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function hasCommandTransportFailure(result: Readonly<CommandResult>): boolean {
  return result.spawnError !== undefined || result.timedOut || result.signal !== undefined;
}

function isSuccessfulCommand(result: Readonly<CommandResult>): boolean {
  return result.code === 0 && !hasCommandTransportFailure(result);
}

/** Builds the `node <repo>/scripts/doctor.ts --quick --json` command run through the process runner. */
function doctorCommand(paths: Readonly<RepositoryPaths>): CommandSpec {
  return {
    command: process.execPath,
    args: [join(paths.root, "scripts", "doctor.ts"), "--quick", "--json"],
  };
}

// ============================================================================
// Doctor Health Parsing
// ============================================================================

/**
 * Parses a doctor command result into a health summary.
 *
 * @remarks
 * Parses {@link CommandResult.stdout} directly with `JSON.parse` followed by
 * {@link parseDoctorReport} — it never scans for the first `{` and never
 * reuses a stale value. A schema-v1 report is accepted whether the doctor
 * process exited `0` or `1` (doctor exits `1` when checks fail, not when the
 * report itself is invalid), and `stderr` warnings are ignored whenever
 * `stdout` holds a valid report. An empty `stdout`, a non-JSON preamble, a
 * missing/old/future schema, malformed JSON, or an internally inconsistent
 * score/grade/summary all resolve to `null`.
 *
 * @param result - The complete result of running the doctor command.
 * @returns The parsed health summary, or `null` when unavailable.
 */
export function healthFromDoctorResult(result: Readonly<CommandResult>): HealthInfo | null {
  if (result.stdout.trim().length === 0) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    return null;
  }

  try {
    const report = parseDoctorReport(parsed);
    return {score: report.score, grade: report.grade, summary: report.summary};
  } catch {
    return null;
  }
}

// ============================================================================
// Data Collectors
// ============================================================================

/**
 * Reads workspace metadata from `package.json` and `project.json` for each
 * project directory listed in {@link WORKSPACE_DIRS}.
 *
 * @param root - Absolute repository root.
 * @returns Array of workspace info objects.
 */
async function collectWorkspaces(root: string): Promise<readonly WorkspaceInfo[]> {
  const workspaces: WorkspaceInfo[] = [];

  for (const dir of WORKSPACE_DIRS) {
    const absDir = join(root, dir);
    let name = dir;
    let version = "—";
    let type = "unknown";
    let tags: string[] = [];

    const pkgPath = join(absDir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg: unknown = JSON.parse(readFileSync(pkgPath, "utf-8"));
        if (isRecord(pkg)) {
          if (typeof pkg["name"] === "string") name = pkg["name"];
          if (typeof pkg["version"] === "string") version = pkg["version"];
        }
      } catch {
        // ignore parse errors
      }
    }

    const projPath = join(absDir, "project.json");
    if (existsSync(projPath)) {
      try {
        const proj: unknown = JSON.parse(readFileSync(projPath, "utf-8"));
        if (isRecord(proj)) {
          if (typeof proj["name"] === "string") name = proj["name"];
          if (typeof proj["projectType"] === "string") {
            type = proj["projectType"] === "library" ? "lib" : "app";
          }
          if (Array.isArray(proj["tags"])) {
            tags = (proj["tags"] as unknown[]).filter((t): t is string => typeof t === "string");
          }
        }
      } catch {
        // ignore parse errors
      }
    }

    workspaces.push({name, version, type, tags});
  }

  return workspaces;
}

/**
 * Runs the Nx graph command and extracts inter-project dependency edges.
 *
 * @remarks
 * Reuses {@link parseNxGraph} so status and doctor share identical Nx graph
 * semantics. No temporary file is ever written or read: the graph is parsed
 * directly from captured stdout.
 *
 * @param runner - Command runner used to invoke Nx.
 * @param root - Absolute repository root.
 * @returns Dependency edges between workspace projects, or `null` when the
 * command fails or the graph cannot be parsed.
 */
async function collectNxGraph(runner: CommandRunner, root: string): Promise<readonly DependencyEdge[] | null> {
  const result = await runner.run(NX_GRAPH_COMMAND, {cwd: root, timeoutMs: NX_TIMEOUT_MS});
  if (!isSuccessfulCommand(result)) {
    return null;
  }

  try {
    const graph = parseNxGraph(result.stdout);
    const edges: DependencyEdge[] = [];
    for (const [source, targets] of graph.dependencies) {
      for (const target of targets) {
        if (!target.startsWith("npm:")) {
          edges.push({source, target});
        }
      }
    }
    return edges;
  } catch {
    return null;
  }
}

/**
 * Collects current git repository state: branch, SHA, last commit info, and
 * the number of dirty (uncommitted) files.
 *
 * @remarks
 * Every underlying git command must succeed for git state to be considered
 * available; a single failing command makes the whole section `null`
 * instead of substituting `"unknown"` per field.
 *
 * @param runner - Command runner used to invoke git.
 * @param root - Absolute repository root.
 * @returns Git info, or `null` when any underlying command fails.
 */
async function collectGit(runner: CommandRunner, root: string): Promise<GitInfo | null> {
  const options = {cwd: root, timeoutMs: GIT_TIMEOUT_MS};
  const [branch, sha, lastCommitTime, lastCommitMsg, status] = await Promise.all([
    runner.run(GIT_BRANCH_COMMAND, options),
    runner.run(GIT_SHA_COMMAND, options),
    runner.run(GIT_LAST_COMMIT_TIME_COMMAND, options),
    runner.run(GIT_LAST_COMMIT_MSG_COMMAND, options),
    runner.run(GIT_STATUS_COMMAND, options),
  ]);

  if (![branch, sha, lastCommitTime, lastCommitMsg, status].every(isSuccessfulCommand)) {
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
 * Runs `npm audit --json` and `npm outdated --json` to gather vulnerability
 * counts by severity and outdated-package counts by semver bump level.
 *
 * @remarks
 * Both commands may exit non-zero in normal operation (vulnerabilities or
 * outdated packages found) — that nonzero JSON is preserved. Only a spawn
 * failure, timeout, or signal termination, or JSON that does not match the
 * expected shape, makes the whole section `null`; it never falls back to
 * all-zero counts.
 *
 * @param runner - Command runner used to invoke npm.
 * @param root - Absolute repository root.
 * @returns Security info, or `null` when unavailable.
 */
async function collectSecurity(runner: CommandRunner, root: string): Promise<SecurityInfo | null> {
  const options = {cwd: root, timeoutMs: NPM_TIMEOUT_MS};
  const [auditResult, outdatedResult] = await Promise.all([
    runner.run(NPM_AUDIT_COMMAND, options),
    runner.run(NPM_OUTDATED_COMMAND, options),
  ]);

  if (hasCommandTransportFailure(auditResult) || hasCommandTransportFailure(outdatedResult)) {
    return null;
  }

  let auditPayload: unknown;
  try {
    auditPayload = JSON.parse(auditResult.stdout);
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

  const trimmedOutdated = outdatedResult.stdout.trim();
  let outdatedPayload: unknown = {};
  if (trimmedOutdated.length > 0) {
    try {
      outdatedPayload = JSON.parse(trimmedOutdated);
    } catch {
      return null;
    }
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

async function tryStat(path: string): Promise<Stats | null> {
  try {
    return await stat(path);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/** Bounds the number of concurrent filesystem operations issued by a single traversal. */
function createConcurrencyGate(limit: number): <T>(task: () => Promise<T>) => Promise<T> {
  let active = 0;
  const queue: Array<() => void> = [];

  function release(): void {
    active--;
    const next = queue.shift();
    if (next !== undefined) {
      next();
    }
  }

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= limit) {
      await new Promise<void>((settle) => queue.push(settle));
    }
    active++;
    try {
      return await task();
    } finally {
      release();
    }
  };
}

const gateDirectoryOperation = createConcurrencyGate(MAX_CONCURRENT_STAT_OPERATIONS);

/**
 * Measures the total byte size of a file or directory tree using read-only
 * Node.js filesystem calls (no shell command, no platform-specific quoting).
 *
 * @remarks
 * A directory or file that does not exist is a legitimate, distinguishable
 * zero. Any other filesystem error (e.g. a permission failure) propagates so
 * the caller can classify the whole disk section as unavailable rather than
 * silently reporting a successful-looking zero.
 *
 * @param absolutePath - Absolute path to measure.
 * @returns Total size in bytes.
 */
async function defaultMeasureDirectorySize(absolutePath: string): Promise<number> {
  const stats = await gateDirectoryOperation(() => tryStat(absolutePath));
  if (stats === null) {
    return 0;
  }
  if (stats.isFile()) {
    return stats.size;
  }
  if (!stats.isDirectory()) {
    return 0;
  }

  const entries = await gateDirectoryOperation(() => readdir(absolutePath, {withFileTypes: true}));
  const sizes = await Promise.all(
    entries.map(async (entry): Promise<number> => {
      if (entry.isSymbolicLink()) {
        return 0;
      }
      const entryPath = join(absolutePath, entry.name);
      if (entry.isDirectory()) {
        return defaultMeasureDirectorySize(entryPath);
      }
      if (!entry.isFile()) {
        return 0;
      }
      const fileStats = await gateDirectoryOperation(() => tryStat(entryPath));
      return fileStats?.size ?? 0;
    }),
  );

  return sizes.reduce((total, size) => total + size, 0);
}

/**
 * Measures on-disk size of key directories.
 *
 * @param root - Absolute repository root.
 * @param measureDirectorySize - Filesystem traversal boundary.
 * @returns Byte counts for `node_modules`, `.next`, and `dist`.
 */
async function collectDisk(
  root: string,
  measureDirectorySize: (absolutePath: string) => Promise<number>,
): Promise<DiskInfo> {
  const [nodeModules, nextBuild, componentsDist] = await Promise.all([
    measureDirectorySize(join(root, "node_modules")),
    measureDirectorySize(join(root, "sites", "arolariu.ro", ".next")),
    measureDirectorySize(join(root, "packages", "components", "dist")),
  ]);

  return {nodeModules, nextBuild, componentsDist};
}

/**
 * Runs the doctor script in quick JSON mode and parses its health report.
 *
 * @param runner - Command runner used to invoke doctor.
 * @param paths - Canonical repository paths.
 * @returns The health summary, or `null` if the report is unavailable.
 */
async function collectHealth(runner: CommandRunner, paths: Readonly<RepositoryPaths>): Promise<HealthInfo | null> {
  const result = await runner.run(doctorCommand(paths), {cwd: paths.root, timeoutMs: DOCTOR_TIMEOUT_MS});
  return healthFromDoctorResult(result);
}

// ============================================================================
// Rendering
// ============================================================================

function renderHealthSummary(summary: Readonly<DoctorSummary>): string {
  return `${String(summary.passed)} passed, ${String(summary.warnings)} warning${summary.warnings === 1 ? "" : "s"}, ${String(summary.failed)} failure${summary.failed === 1 ? "" : "s"}, ${String(summary.skipped)} skipped`;
}

/**
 * Renders the full status dashboard through the injected logger.
 *
 * @param logger - Repository logger abstraction.
 * @param output - The complete, six-section status payload.
 */
function renderDashboard(logger: MonorepositoryLogger, output: Readonly<StatusOutput>): void {
  const {workspaces, nxEdges, git, security, disk, health} = output;
  const nodeMajor = process.versions["node"]?.split(".")[0] ?? "?";
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
      rows: workspaces.map((ws) => [
        ws.name.replace("@arolariu/", ""),
        ws.version,
        ws.type,
        ws.tags
          .filter((t) => t.startsWith("domain:"))
          .map((t) => t.replace("domain:", ""))
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
      const src = edge.source.replace("@arolariu/", "");
      const tgt = edge.target.replace("@arolariu/", "");
      mentioned.add(src);
      mentioned.add(tgt);
      const list = inbound.get(tgt);
      if (list) {
        if (!list.includes(src)) list.push(src);
      } else {
        inbound.set(tgt, [src]);
      }
    }

    for (const [target, sources] of inbound) {
      logger.line(`${target} ← ${sources.join(", ")}`);
    }

    if (workspaces) {
      for (const ws of workspaces) {
        const short = ws.name.replace("@arolariu/", "");
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
// Options
// ============================================================================

/**
 * Parses status command-line options.
 *
 * @param argv - Arguments following the status entrypoint.
 * @returns Strict status options.
 * @throws When an argument is not a supported status option.
 */
export function parseStatusOptions(argv: readonly string[]): StatusOptions {
  let json = false;
  let help = false;

  for (const argument of argv) {
    switch (argument) {
      case "--json":
        json = true;
        break;
      case "--help":
      case "-h":
        help = true;
        break;
      default:
        throw new Error(`Unknown status option '${String(argument)}'.`);
    }
  }

  return {json, help};
}

// ============================================================================
// Main
// ============================================================================

/**
 * Runs the status CLI entrypoint.
 *
 * @remarks
 * `--help`/`-h` is detected before options are parsed or any collector runs,
 * so an unsupported flag combined with `--help` never surfaces a parse
 * error. An option-parsing or repository-context failure renders through the
 * logger and returns `1` without invoking any collector. On a successful
 * run every collector executes independently via `Promise.allSettled()`; a
 * failed or malformed collector renders/serializes as `null`
 * ("unavailable") without fabricating a failure report, and the command
 * always returns `0`. JSON mode emits exactly one document through
 * {@link MonorepositoryLogger.json}; human mode renders the dashboard
 * exclusively through logger methods.
 *
 * @param argv - Arguments following the status entrypoint.
 * @param dependencies - Optional boundary replacements, primarily for tests
 * that must inject a deterministic runner, logger, repository-path
 * resolver, or filesystem traversal without reading the live checkout.
 * @returns Process exit code.
 */
export async function main(
  argv: readonly string[] = process.argv.slice(2),
  dependencies: Readonly<Partial<StatusDependencies>> = {},
): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    const logger = dependencies.logger ?? new MonorepositoryConsoleLogger("status", {verbose: false});
    logger.banner(["arolariu.ro monorepo status dashboard"]);
    for (const line of HELP_LINES) {
      logger.line(line);
    }
    return 0;
  }

  let options: StatusOptions;
  try {
    options = parseStatusOptions(argv);
  } catch (error: unknown) {
    const logger = dependencies.logger ?? new MonorepositoryConsoleLogger("status", {verbose: false});
    logger.error(errorMessage(error));
    return 1;
  }

  const logger =
    dependencies.logger ?? new MonorepositoryConsoleLogger("status", {mode: options.json ? "json" : "human", verbose: false});
  const resolvePaths = dependencies.resolveRepositoryPaths ?? ((): RepositoryPaths => resolveRepositoryPaths());
  const runner = dependencies.runner ?? defaultCommandRunner;
  const measureDirectorySize = dependencies.measureDirectorySize ?? defaultMeasureDirectorySize;

  let paths: RepositoryPaths;
  try {
    paths = resolvePaths();
  } catch (error: unknown) {
    logger.error(errorMessage(error));
    return 1;
  }

  const [workspacesResult, nxGraphResult, gitResult, securityResult, diskResult, healthResult] = await Promise.allSettled([
    collectWorkspaces(paths.root),
    collectNxGraph(runner, paths.root),
    collectGit(runner, paths.root),
    collectSecurity(runner, paths.root),
    collectDisk(paths.root, measureDirectorySize),
    collectHealth(runner, paths),
  ]);

  const output: StatusOutput = {
    workspaces: workspacesResult.status === "fulfilled" ? workspacesResult.value : null,
    nxEdges: nxGraphResult.status === "fulfilled" ? nxGraphResult.value : null,
    git: gitResult.status === "fulfilled" ? gitResult.value : null,
    security: securityResult.status === "fulfilled" ? securityResult.value : null,
    disk: diskResult.status === "fulfilled" ? diskResult.value : null,
    health: healthResult.status === "fulfilled" ? healthResult.value : null,
  };

  if (options.json) {
    logger.json(output);
    return 0;
  }

  renderDashboard(logger, output);
  return 0;
}

// ============================================================================
// Entry Point
// ============================================================================

const statusEntrypointPath = process.argv[1];
if (statusEntrypointPath !== undefined && fileURLToPath(import.meta.url) === resolve(statusEntrypointPath)) {
  main()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      new MonorepositoryConsoleLogger("status", {verbose: false}).error(errorMessage(error));
      process.exitCode = 1;
    });
}
