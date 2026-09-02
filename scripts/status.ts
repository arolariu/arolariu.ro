/**
 * @fileoverview Monorepo status dashboard for the arolariu.ro monorepo.
 * @module scripts/status
 *
 * @remarks
 * Collects data from multiple sources concurrently (workspaces, the Nx
 * dependency graph derived from tracked workspace metadata, git state, npm
 * audit/outdated, disk usage, and the doctor health report) then renders a
 * dashboard through {@link MonorepositoryLogger} or emits it as a single JSON
 * document.
 *
 * Every collector runs independently through `Promise.allSettled()`, so a
 * failure or malformed result from any single source degrades that section
 * to `null` ("unavailable") without invalidating the rest of the report and
 * without inventing a zero, `"unknown"`, or empty-array stand-in for a
 * genuine failure. Every external probe (git, npm, the disk usage probe, and
 * the doctor report) is issued through the shared
 * {@link CommandRunner} as an explicit {@link CommandSpec} — never a shell
 * string — and the script never writes a temporary file or inherits child
 * process output. The workspace graph is read from tracked metadata instead of
 * an Nx child process, which would rewrite Nx's native workspace database. All
 * human or machine-readable output is produced by
 * {@link MonorepositoryLogger}.
 *
 * @example
 * ```bash
 * node scripts/status.ts          # full dashboard
 * node scripts/status.ts --json   # machine-readable JSON
 * node scripts/status.ts --help   # usage info
 * ```
 */

import {existsSync, readFileSync} from "node:fs";
import {join, resolve} from "node:path";
import {fileURLToPath} from "node:url";

import {commanderExitCode, createToolProgram} from "./common/cli.ts";
import {formatBytes} from "./common/index.ts";
import {MonorepositoryConsoleLogger, type LogSegment, type MonorepositoryLogger} from "./common/logger.ts";
import {defaultCommandRunner, type CommandResult, type CommandRunner, type CommandSpec} from "./common/process.ts";
import {resolveRepositoryPaths, type RepositoryPaths} from "./common/repository-paths.ts";
import {nodeFileSystem} from "./common/runtime.node.ts";
import {runDoctor} from "./doctor.ts";
import type {DoctorSummary} from "./doctor.types.ts";
import {createRepositoryInspectionSession, type RepositoryInspectionSession} from "./inspection/repository.ts";

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
 * repository-path resolver, or fatal-error logger without replacing the
 * repository modules that own those boundaries.
 */
export interface StatusDependencies {
  /** Executes read-only status commands. */
  readonly runner: CommandRunner;
  /** Receives dashboard presentation and JSON output. */
  readonly logger: MonorepositoryLogger;
  /** Resolves canonical repository paths; may be synchronous or asynchronous. */
  readonly resolveRepositoryPaths: () => RepositoryPaths | Promise<RepositoryPaths>;
  /**
   * Receives a fatal, pre-collection diagnostic (a repository-context
   * failure) so it always reaches stderr.
   */
  readonly errorLogger: MonorepositoryLogger;
  /**
   * Pre-created repository inspection session for workspace facts and
   * typed doctor. When supplied, status reuses it; otherwise it creates
   * one quick session after path resolution.
   */
  readonly inspection: RepositoryInspectionSession;
  /** Factory for creating an inspection session; defaults to {@link createRepositoryInspectionSession}. */
  readonly createInspectionSession: typeof createRepositoryInspectionSession;
  /** Typed doctor runner; defaults to the production {@link runDoctor}. */
  readonly runDoctor: typeof runDoctor;
}

// ============================================================================
// Constants
// ============================================================================

const GIT_TIMEOUT_MS = 30_000;
const NPM_TIMEOUT_MS = 60_000;
const DISK_PROBE_TIMEOUT_MS = 60_000;

const GIT_BRANCH_COMMAND = {command: "git", args: ["rev-parse", "--abbrev-ref", "HEAD"]} as const satisfies CommandSpec;
const GIT_SHA_COMMAND = {command: "git", args: ["rev-parse", "--short", "HEAD"]} as const satisfies CommandSpec;
const GIT_LAST_COMMIT_TIME_COMMAND = {command: "git", args: ["log", "-1", "--format=%cr"]} as const satisfies CommandSpec;
const GIT_LAST_COMMIT_MSG_COMMAND = {command: "git", args: ["log", "-1", "--format=%s"]} as const satisfies CommandSpec;
const GIT_STATUS_COMMAND = {command: "git", args: ["status", "--porcelain"]} as const satisfies CommandSpec;
const NPM_AUDIT_COMMAND = {command: "npm", args: ["audit", "--json"]} as const satisfies CommandSpec;
const NPM_OUTDATED_COMMAND = {command: "npm", args: ["outdated", "--json"]} as const satisfies CommandSpec;

/**
 * Read-only Node.js source, executed as a separate process via `node --eval`,
 * that measures the total byte size of a directory or file tree.
 *
 * @remarks
 * Runs entirely inside the spawned child process — no parent-process
 * recursion, no unbounded pending-task fan-out, and no temp file. Traversal
 * is single-threaded and therefore inherently sequential/bounded. A
 * directory/file entry reported as a symbolic link (which also covers
 * Windows junctions, verified cross-platform via `Dirent#isSymbolicLink()`)
 * is skipped rather than followed, so no cycle or double counting is
 * possible. A missing target resolves to `0`; every other filesystem error
 * (permission failure, etc.) is written to stderr and the process exits
 * non-zero so the parent can classify the whole disk section unavailable.
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function hasCommandTransportFailure(result: Readonly<CommandResult>): boolean {
  return result.spawnError !== undefined || result.timedOut || result.signal !== undefined;
}

function isSuccessfulCommand(result: Readonly<CommandResult>): boolean {
  return result.code === 0 && !hasCommandTransportFailure(result);
}

/**
 * Builds the disk-size probe command for one absolute target path.
 *
 * @remarks
 * The executable, the fixed `--eval` script literal, and the target path are
 * three separate {@link CommandSpec.args} elements — never an interpolated
 * or shell-joined string — so the child process receives the target purely
 * as `process.argv[1]`.
 *
 * @param absolutePath - Absolute directory or file path to measure.
 * @returns The disk-size probe command.
 */
function buildDiskSizeCommand(absolutePath: string): CommandSpec {
  return {command: process.execPath, args: ["--eval", DISK_PROBE_SCRIPT, absolutePath]};
}

/**
 * Parses one disk-size probe result into a strict nonnegative byte count.
 *
 * @remarks
 * A runner-level transport failure (spawn error, timeout, or signal
 * termination), a nonzero exit code, or stdout that is empty or does not
 * match a strict nonnegative integer all resolve to `null` — never a
 * fabricated `0`.
 *
 * @param result - The complete result of running the disk-size probe.
 * @returns The parsed byte count, or `null` when unavailable.
 */
function parseDiskProbeSize(result: Readonly<CommandResult>): number | null {
  if (!isSuccessfulCommand(result)) {
    return null;
  }

  const trimmed = result.stdout.trim();
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
 * Project metadata is derived from the shared inspection session's workspace
 * facts instead of a hard-coded project list. A newly added Nx project
 * automatically appears.
 *
 * @param inspection - The shared repository inspection session.
 * @param root - Absolute repository root.
 * @returns Array of workspace info objects, or `null` when unavailable.
 */
async function collectWorkspaces(inspection: RepositoryInspectionSession, root: string): Promise<readonly WorkspaceInfo[] | null> {
  const outcome = await inspection.inspect("workspace");
  if (outcome.kind !== "available") {
    return null;
  }

  const workspaces: WorkspaceInfo[] = [];
  for (const project of outcome.value.projects) {
    const absDir = join(root, project.root);
    let name = project.name;
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
 * Derives inter-project dependency edges from the inspection session's WorkspaceFacts.
 *
 * @param inspection - The shared repository inspection session.
 * @returns Dependency edges, or `null` when unavailable.
 */
async function collectNxGraph(inspection: RepositoryInspectionSession): Promise<readonly DependencyEdge[] | null> {
  const outcome = await inspection.inspect("workspace");
  if (outcome.kind !== "available") {
    return null;
  }

  const targetsBySource = new Map<string, Set<string>>();
  for (const dep of outcome.value.dependencies) {
    const targets = targetsBySource.get(dep.source) ?? new Set<string>();
    targets.add(dep.target);
    targetsBySource.set(dep.source, targets);
  }

  return [...targetsBySource.entries()]
    .toSorted(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .flatMap(([source, targets]) =>
      [...targets].toSorted((left, right) => (left < right ? -1 : left > right ? 1 : 0)).map((target) => ({source, target})),
    );
}

/**
 * Runs the typed doctor in quick mode and returns the health summary.
 *
 * @param inspection - The exact same inspection session used for workspaces.
 * @param paths - Canonical repository paths.
 * @param doctorRunner - The typed doctor runner function.
 * @returns The health summary, or `null` if doctor fails.
 */
async function collectHealth(
  inspection: RepositoryInspectionSession,
  paths: Readonly<RepositoryPaths>,
  doctorRunner: typeof runDoctor,
): Promise<HealthInfo | null> {
  try {
    const report = await doctorRunner(
      {quick: true, verbose: false},
      {
        inspection,
        resolveRepositoryPaths: () => paths,
      },
    );
    return {score: report.score, grade: report.grade, summary: report.summary};
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

  // A successful current `npm outdated --json` run always writes a JSON object — an empty
  // `{}` when nothing is outdated — because npm's JSON branch is unconditional. Empty stdout
  // is therefore unambiguously a failed probe (registry/auth error, arborist load failure,
  // EJSONPARSE, etc.) and must never be treated as a "0 outdated" success.
  const trimmedOutdated = outdatedResult.stdout.trim();
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
 * Measures on-disk size of key directories through the shared, out-of-process
 * disk-size probe.
 *
 * @remarks
 * Each of the three targets is measured by a separate, argument-separated
 * `process.execPath --eval <script> <targetPath>` invocation issued through
 * the shared {@link CommandRunner} — never an in-process recursive
 * traversal, a shell string, or a temp file. Every probe carries the
 * repository `cwd` and a bounded 60 s `timeoutMs`; the runner terminates
 * (`SIGTERM`, then `SIGKILL`) a stalled child rather than merely racing a
 * promise while filesystem work continues. The three probes are independent
 * child processes, so running them concurrently adds no unbounded
 * parent-process queue. A transport failure (spawn error, timeout, signal),
 * a nonzero exit code, or malformed/negative/non-integer stdout from any
 * single probe makes the whole disk section `null` — never a fabricated `0`
 * for a real I/O failure. A probe legitimately reports `0` only when its
 * target is absent.
 *
 * @param runner - Command runner used to invoke each disk-size probe.
 * @param root - Absolute repository root.
 * @returns Byte counts for `node_modules`, `.next`, and `dist`, or `null`.
 */
export async function collectDisk(runner: CommandRunner, root: string): Promise<DiskInfo | null> {
  const targets = [
    join(root, "node_modules"),
    join(root, "sites", "arolariu.ro", ".next"),
    join(root, "packages", "components", "dist"),
  ] as const;

  const results = await Promise.all(
    targets.map((target) => runner.run(buildDiskSizeCommand(target), {cwd: root, timeoutMs: DISK_PROBE_TIMEOUT_MS})),
  );
  const [nodeModules, nextBuild, componentsDist] = results.map(parseDiskProbeSize);
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
// CLI
// ============================================================================

/**
 * Builds the Commander program that owns status CLI help rendering and
 * slash-alias normalization (`/h` → `--help`).
 *
 * @remarks
 * `allowUnknownOption(true)` lets unknown flags pass through to
 * {@link parseStatusOptions} so the existing human-friendly error-message
 * contract is preserved.
 *
 * @param logger - Logger that receives Commander's rendered help output.
 * @returns A configured, not-yet-parsed Commander program.
 */
function buildStatusProgram(logger: MonorepositoryLogger) {
  const program = createToolProgram({
    name: "node scripts/status.ts",
    description: "Collects and renders monorepo health, workspace, git, security, and disk data.",
    usage: "[options]",
    logger,
  });

  program.option("--json", "Output all collected data as a single JSON document.").allowUnknownOption(true).allowExcessArguments(true);

  return program;
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
 * error. An option-parsing failure renders through the primary logger and
 * returns `1` without invoking any collector. A repository-context
 * (path-resolution) failure is fatal and pre-collection: no partial or
 * success-shaped payload is ever synthesized, no document reaches
 * {@link MonorepositoryLogger.json}, and exactly one normalized, non-empty
 * diagnostic is written through {@link StatusDependencies.errorLogger} —
 * never through the primary `logger`, whose semantic methods (including
 * `error`) are silently suppressed in JSON mode. On a successful run every
 * collector executes independently via `Promise.allSettled()`; a failed or
 * malformed collector renders/serializes as `null` ("unavailable") without
 * fabricating a failure report, and the command always returns `0`. JSON
 * mode emits exactly one document through {@link MonorepositoryLogger.json};
 * human mode renders the dashboard exclusively through logger methods.
 *
 * @param argv - Arguments following the status entrypoint.
 * @param dependencies - Optional boundary replacements, primarily for tests
 * that must inject a deterministic runner, logger, repository-path
 * resolver, or fatal-error logger without reading the live checkout.
 * @returns Process exit code.
 */
export async function main(
  argv: readonly string[] = process.argv.slice(2),
  dependencies: Readonly<Partial<StatusDependencies>> = {},
): Promise<number> {
  const parseLogger = dependencies.logger ?? new MonorepositoryConsoleLogger("status", {verbose: false});
  const program = buildStatusProgram(parseLogger);

  try {
    program.parse(argv, {from: "user"});
  } catch (error: unknown) {
    return commanderExitCode(error) ?? 1;
  }

  let options: StatusOptions;
  try {
    options = parseStatusOptions(argv);
  } catch (error: unknown) {
    parseLogger.error(errorMessage(error));
    return 1;
  }

  const logger = dependencies.logger ?? new MonorepositoryConsoleLogger("status", {mode: options.json ? "json" : "human", verbose: false});

  // In JSON mode the primary `logger`'s semantic `error` is a no-op, so a fatal
  // failure here must be routed through a logger that always reaches stderr.
  // Human mode's primary logger already reaches stderr, so it may serve both roles.
  const errorLogger = dependencies.errorLogger ?? (options.json ? new MonorepositoryConsoleLogger("status", {verbose: false}) : logger);

  const resolvePaths =
    dependencies.resolveRepositoryPaths ?? ((): Promise<RepositoryPaths> => resolveRepositoryPaths(import.meta.url, nodeFileSystem));
  const runner = dependencies.runner ?? defaultCommandRunner;

  let paths: RepositoryPaths;
  try {
    paths = await resolvePaths();
  } catch (error: unknown) {
    errorLogger.error(errorMessage(error));
    return 1;
  }

  const inspection =
    dependencies.inspection
    ?? (dependencies.createInspectionSession ?? createRepositoryInspectionSession)({
      profile: "quick",
      paths,
      runner,
      env: process.env,
      platform: process.platform,
      now: () => performance.now(),
    });

  const doctorRunner = dependencies.runDoctor ?? runDoctor;

  const [workspacesResult, nxGraphResult, gitResult, securityResult, diskResult, healthResult] = await Promise.allSettled([
    collectWorkspaces(inspection, paths.root),
    collectNxGraph(inspection),
    collectGit(runner, paths.root),
    collectSecurity(runner, paths.root),
    collectDisk(runner, paths.root),
    collectHealth(inspection, paths, doctorRunner),
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
