/**
 * @fileoverview Monorepo status dashboard for the arolariu.ro monorepo, as an Effect program.
 * @module scripts/commands/status/index
 *
 * @remarks
 * Status is read-only by construction: {@link collectStatus} requires only the
 * {@link StatusRequirements} profile (Doctor's read-only profile plus the shared `Inspection`
 * service). It resolves canonical repository paths through the bridge's legacy read-only view,
 * obtains exactly one quick repository inspection session, and then collects five
 * degradation-tolerant sections (workspaces, the Nx dependency graph derived from tracked workspace
 * metadata, git state, npm audit/outdated, and disk usage) concurrently. A malformed or unavailable
 * result, or a defect, from any single one of those sources degrades that section to `null`
 * ("unavailable") without invalidating the rest of the report and without inventing a zero,
 * `"unknown"`, or empty-array stand-in for a genuine failure.
 *
 * The sixth section, health, is not a collector: {@link runDoctor} runs in the same concurrent
 * batch as a plain effect over the same `Inspection` service, so doctor resolves the identical
 * quick session Status already holds and every inspection provider runs at most once per
 * invocation. Both doctor outcomes (passing or failing checks) are health data; a doctor defect is
 * owned by Status and fails the invocation instead of becoming a fabricated `null` health section.
 *
 * Every external probe (git, npm, the disk usage probe, and — for the human dashboard header only
 * — the Node runtime version probe) runs through the `Process` service as an explicit
 * {@link ProcessRequest}, never a shell string. The command never writes a temporary file, never
 * mutates the repository, and never reads ambient process state. The workspace graph is read from
 * tracked metadata instead of an Nx child process, which would rewrite Nx's native workspace
 * database. All output goes through the `Presenter`.
 *
 * @example
 * ```bash
 * node scripts/cli.ts status          # full dashboard
 * node scripts/cli.ts status --json   # machine-readable JSON
 * node scripts/cli.ts status --help   # usage info
 * ```
 */

import {join} from "node:path";

import {Duration, Effect} from "effect";

import {resolveRepositoryPaths, type RepositoryPaths} from "../../common/repository-paths.ts";
import {Inspection} from "../../inspection/Inspection.ts";
import type {ProbeOutcome} from "../../inspection/probes.ts";
import type {RepositoryInspectionSession} from "../../inspection/repository.ts";
import {legacyReadOnlyFiles} from "../../platform/bridge.ts";
import {Environment} from "../../platform/Environment.ts";
import {ReadOnlyFiles} from "../../platform/Files.ts";
import {Presenter} from "../../platform/Output.ts";
import {Process, type ProcessRequest} from "../../platform/Process.ts";
import {runDoctor} from "../doctor/index.ts";
import type {DoctorInput, DoctorReport, DoctorRequirements, DoctorSummary} from "../doctor/types.ts";

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

/** Health score and summary from the composed doctor program. */
export interface HealthInfo {
  readonly score: number;
  readonly grade: string;
  readonly summary: DoctorSummary;
}

/** The complete, six-section status payload produced by one status invocation. */
export interface StatusDocument {
  readonly workspaces: readonly WorkspaceInfo[] | null;
  readonly nxEdges: readonly DependencyEdge[] | null;
  readonly git: GitInfo | null;
  readonly security: SecurityInfo | null;
  readonly disk: DiskInfo | null;
  readonly health: HealthInfo | null;
}

/** The status document plus the presentation-only Node major version label of the human dashboard. */
export interface StatusDashboard {
  /** The six-section status document. */
  readonly document: StatusDocument;
  /** Major version of the running Node executable, or `"?"` when it could not be determined. */
  readonly nodeMajor: string;
}

/** Services every status program may require: Doctor's read-only profile plus the shared inspection sessions. */
export type StatusRequirements = DoctorRequirements | Inspection;

/** The doctor program Status composes as its health source; production uses {@link runDoctor}. */
export type StatusDoctor = (input: Readonly<DoctorInput>) => Effect.Effect<DoctorReport, never, DoctorRequirements | Inspection>;

/** Repository context every status collector observes. */
interface StatusContext {
  /** Canonical repository paths resolved once for this invocation. */
  readonly paths: RepositoryPaths;
  /** The single shared quick repository inspection session for this invocation. */
  readonly inspection: RepositoryInspectionSession;
}

// ============================================================================
// Constants
// ============================================================================

const GIT_TIMEOUT_MS = 30_000;
const NPM_TIMEOUT_MS = 60_000;
const DISK_PROBE_TIMEOUT_MS = 60_000;
const NODE_VERSION_TIMEOUT_MS = 10_000;
const WORKSPACE_MANIFEST_CONCURRENCY = 8;

/** The doctor input Status composes: quick (no network) and non-verbose. */
const STATUS_DOCTOR_INPUT: DoctorInput = {quick: true, verbose: false};

/** Dashboard label used when the running binary does not report a parseable version. */
const UNKNOWN_NODE_MAJOR = "?";

/** Leading major-version group of a `node --version` line such as `v26.3.1`. */
const NODE_MAJOR_VERSION_PATTERN = /^v?(\d+)(?:\.|$)/;

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

/**
 * Formats a byte count exactly like the legacy `scripts/common/index.ts` `formatBytes`, without
 * loading that legacy-kernel barrel.
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function isSuccessfulOutcome(outcome: Readonly<ProbeOutcome>): boolean {
  return outcome.kind === "succeeded";
}

/**
 * Reports whether an outcome failed before the child could report its own exit status.
 *
 * @remarks
 * A spawn failure, timeout, or signal termination means the probe never produced trustworthy
 * output, while an ordinary nonzero exit (`"exited"`) is normal for `npm audit` and
 * `npm outdated` and keeps its JSON payload.
 *
 * @param outcome - The completed probe outcome.
 * @returns `true` when the transport itself failed.
 */
function hasTransportFailure(outcome: Readonly<ProbeOutcome>): boolean {
  return outcome.kind === "spawn-failed" || outcome.kind === "timed-out" || outcome.kind === "signalled";
}

/**
 * Runs one status probe through the `Process` service and reports every completion as data.
 *
 * @remarks
 * Output is captured and kept in full on a failure, because `npm audit --json` and
 * `npm outdated --json` report their data with a nonzero exit.
 *
 * @param request - The argument-separated probe request.
 * @param cwd - Working directory of the probe.
 * @param timeoutMs - Bounded time limit of the probe.
 * @returns The probe outcome; a typed process failure becomes its outcome kind.
 */
function runProbe(request: ProcessRequest, cwd: string, timeoutMs: number): Effect.Effect<ProbeOutcome, never, Process> {
  return Effect.flatMap(Process, (process) =>
    process.run(request, {cwd, timeout: Duration.millis(timeoutMs), failureOutput: "full"}).pipe(
      Effect.map((result): ProbeOutcome => ({kind: "succeeded", exitCode: 0, ...result})),
      Effect.catchTags({
        ProcessExited: (error) => Effect.succeed<ProbeOutcome>({kind: "exited", exitCode: error.exitCode, ...outputOf(error)}),
        ProcessSignalled: (error) => Effect.succeed<ProbeOutcome>({kind: "signalled", signal: error.signal, ...outputOf(error)}),
        ProcessSpawnFailed: (error) => Effect.succeed<ProbeOutcome>({kind: "spawn-failed", message: error.reason, ...outputOf(error)}),
        ProcessTimedOut: (error) => Effect.succeed<ProbeOutcome>({kind: "timed-out", ...outputOf(error)}),
      }),
    ),
  );
}

/**
 * Copies the captured output of a process failure.
 *
 * @param error - The process failure.
 * @returns Its `stdout`, `stderr`, and `durationMs`.
 */
function outputOf(error: {readonly stdout: string; readonly stderr: string; readonly durationMs: number}): {
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
} {
  return {stdout: error.stdout, stderr: error.stderr, durationMs: error.durationMs};
}

/**
 * Reads and parses one optional JSON manifest without failing the caller.
 *
 * @param path - Absolute manifest path.
 * @returns The parsed value, or `undefined` when the file is absent, unreadable, or malformed.
 */
function readOptionalJson(path: string): Effect.Effect<unknown, never, ReadOnlyFiles> {
  return Effect.flatMap(ReadOnlyFiles, (files) => files.readFileString(path)).pipe(
    Effect.flatMap((text) => Effect.try({try: (): unknown => JSON.parse(text), catch: (error) => error})),
    Effect.orElseSucceed((): unknown => undefined),
  );
}

/**
 * Degrades a collector defect to its unavailable value.
 *
 * @remarks
 * Every collector reports expected failures as data; a defect (for example a dying inspection
 * provider) is the legacy "rejected collector" and degrades to `fallback` without touching its
 * siblings. Interruption is never degraded.
 *
 * @param collector - The collector effect.
 * @param fallback - The unavailable value.
 * @returns The collector result, or `fallback` when it died.
 */
function unavailableOnDefect<A, R>(collector: Effect.Effect<A, never, R>, fallback: A): Effect.Effect<A, never, R> {
  return collector.pipe(Effect.catchDefect(() => Effect.succeed(fallback)));
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
 * A transport failure (spawn error, timeout, or signal termination), a nonzero exit code, or
 * stdout that is empty or does not match a strict nonnegative integer all resolve to `null` —
 * never a fabricated `0`.
 *
 * @param outcome - The complete outcome of running the disk-size probe.
 * @returns The parsed byte count, or `null` when unavailable.
 */
function parseDiskProbeSize(outcome: Readonly<ProbeOutcome>): number | null {
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
 * Reads one project's manifests into its workspace metadata.
 *
 * @param root - Repository root.
 * @param project - The project's Nx name and repository-relative root.
 * @returns The workspace metadata; absent or malformed manifests keep the defaults.
 */
function readWorkspaceInfo(
  root: string,
  project: {readonly name: string; readonly root: string},
): Effect.Effect<WorkspaceInfo, never, ReadOnlyFiles> {
  return Effect.gen(function* () {
    const projectDirectory = join(root, project.root);
    let name = project.name;
    let version = "—";
    let type = "unknown";
    let tags: readonly string[] = [];

    const manifest = yield* readOptionalJson(join(projectDirectory, "package.json"));
    if (isRecord(manifest)) {
      if (typeof manifest["name"] === "string") name = manifest["name"];
      if (typeof manifest["version"] === "string") version = manifest["version"];
    }

    const projectFile = yield* readOptionalJson(join(projectDirectory, "project.json"));
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
  });
}

/**
 * Collects workspace metadata from the inspection session's WorkspaceFacts.
 *
 * @remarks
 * Project metadata is derived from the shared inspection session's workspace facts instead of a
 * hard-coded project list, so a newly added Nx project automatically appears. Manifests are read
 * through the read-only filesystem with bounded concurrency and in declared project order.
 *
 * @param context - Repository paths and the shared inspection session.
 * @returns Array of workspace info objects, or `null` when unavailable.
 */
const collectWorkspaces: (context: StatusContext) => Effect.Effect<readonly WorkspaceInfo[] | null, never, ReadOnlyFiles> = Effect.fn(
  "status.collectWorkspaces",
)(function* (context: StatusContext) {
  const outcome = yield* context.inspection.inspect("workspace");
  if (outcome.kind !== "available") {
    return null;
  }

  return yield* Effect.forEach(outcome.value.projects, (project) => readWorkspaceInfo(context.paths.root, project), {
    concurrency: WORKSPACE_MANIFEST_CONCURRENCY,
  });
});

/**
 * Derives inter-project dependency edges from the inspection session's WorkspaceFacts.
 *
 * @param context - The shared repository inspection session.
 * @returns Dependency edges, or `null` when unavailable.
 */
const collectNxGraph: (context: StatusContext) => Effect.Effect<readonly DependencyEdge[] | null> = Effect.fn("status.collectNxGraph")(
  function* (context: StatusContext) {
    const outcome = yield* context.inspection.inspect("workspace");
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
  },
);

/**
 * Collects current git repository state: branch, SHA, last commit info, and the number of dirty
 * (uncommitted) files.
 *
 * @remarks
 * The five git commands run concurrently. Every one must succeed for git state to be considered
 * available; a single failing command makes the whole section `null` instead of substituting
 * `"unknown"` per field.
 *
 * @param context - Repository paths.
 * @returns Git info, or `null` when any underlying command fails.
 */
const collectGit: (context: StatusContext) => Effect.Effect<GitInfo | null, never, Process> = Effect.fn("status.collectGit")(function* (
  context: StatusContext,
) {
  const {root} = context.paths;
  const [branch, sha, lastCommitTime, lastCommitMsg, status] = yield* Effect.all(
    [
      runProbe(GIT_BRANCH_COMMAND, root, GIT_TIMEOUT_MS),
      runProbe(GIT_SHA_COMMAND, root, GIT_TIMEOUT_MS),
      runProbe(GIT_LAST_COMMIT_TIME_COMMAND, root, GIT_TIMEOUT_MS),
      runProbe(GIT_LAST_COMMIT_MSG_COMMAND, root, GIT_TIMEOUT_MS),
      runProbe(GIT_STATUS_COMMAND, root, GIT_TIMEOUT_MS),
    ],
    {concurrency: "unbounded"},
  );

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
});

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
 * Parses the `npm audit --json` and `npm outdated --json` outcomes into the security section.
 *
 * @param auditOutcome - Outcome of `npm audit --json`.
 * @param outdatedOutcome - Outcome of `npm outdated --json`.
 * @returns Security info, or `null` when either probe failed or reported an unexpected shape.
 */
function parseSecurity(auditOutcome: Readonly<ProbeOutcome>, outdatedOutcome: Readonly<ProbeOutcome>): SecurityInfo | null {
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
 * Runs `npm audit --json` and `npm outdated --json` to gather vulnerability counts by severity
 * and outdated-package counts by semver bump level.
 *
 * @remarks
 * Both commands run concurrently and may exit non-zero in normal operation (vulnerabilities or
 * outdated packages found) — that nonzero JSON is preserved. Only a transport failure, or JSON
 * that does not match the expected shape, makes the whole section `null`; it never falls back to
 * all-zero counts.
 *
 * @param context - Repository paths.
 * @returns Security info, or `null` when unavailable.
 */
const collectSecurity: (context: StatusContext) => Effect.Effect<SecurityInfo | null, never, Process> = Effect.fn("status.collectSecurity")(
  function* (context: StatusContext) {
    const {root} = context.paths;
    const [auditOutcome, outdatedOutcome] = yield* Effect.all(
      [runProbe(NPM_AUDIT_COMMAND, root, NPM_TIMEOUT_MS), runProbe(NPM_OUTDATED_COMMAND, root, NPM_TIMEOUT_MS)],
      {concurrency: "unbounded"},
    );
    return parseSecurity(auditOutcome, outdatedOutcome);
  },
);

/**
 * Measures on-disk size of key directories through the shared, out-of-process disk-size probe.
 *
 * @remarks
 * Each of the three targets is measured by a separate, argument-separated
 * `<node> --eval <script> <targetPath>` invocation issued through the `Process` service — never an
 * in-process recursive traversal, a shell string, or a temp file. Every probe carries the
 * repository `cwd` and a bounded 60 s timeout; the `Process` service terminates a stalled child.
 * The three probes are independent child processes and run concurrently. A transport failure, a
 * nonzero exit code, or malformed/negative/non-integer stdout from any single probe makes the
 * whole disk section `null` — never a fabricated `0` for a real I/O failure. A probe legitimately
 * reports `0` only when its target is absent.
 *
 * @param paths - Canonical repository paths.
 * @returns Byte counts for `node_modules`, `.next`, and `dist`, or `null`.
 */
export const collectDisk: (paths: RepositoryPaths) => Effect.Effect<DiskInfo | null, never, Process | Environment> = Effect.fn(
  "status.collectDisk",
)(function* (paths: RepositoryPaths) {
  const {root} = paths;
  const {executablePath} = yield* Environment;
  const probe = (target: string): Effect.Effect<ProbeOutcome, never, Process> =>
    runProbe(buildDiskSizeRequest(executablePath, target), root, DISK_PROBE_TIMEOUT_MS);

  const outcomes = yield* Effect.all(
    [
      probe(join(root, "node_modules")),
      probe(join(root, "sites", "arolariu.ro", ".next")),
      probe(join(root, "packages", "components", "dist")),
    ],
    {concurrency: "unbounded"},
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
});

/**
 * Reads the major version of the Node runtime executing this command through the `Process` service.
 *
 * @remarks
 * The version is presentation-only: it labels the human dashboard header and never enters the
 * status document. Status owns no ambient process state, so the running binary is asked for its
 * own version through the same `Process` service every other probe uses — `<executablePath>
 * --version`, argument-separated, with the repository `cwd` and a bounded timeout. A transport
 * failure, a nonzero exit, or output that does not start with a numeric major version degrades
 * the label to {@link UNKNOWN_NODE_MAJOR} instead of failing the command or fabricating a version.
 *
 * @param context - Repository paths.
 * @returns The Node major version, or `"?"` when the running binary does not report one.
 */
const collectNodeMajorVersion: (context: StatusContext) => Effect.Effect<string, never, Process | Environment> = Effect.fn(
  "status.collectNodeMajorVersion",
)(function* (context: StatusContext) {
  const {executablePath} = yield* Environment;
  const outcome = yield* runProbe({command: executablePath, args: ["--version"]}, context.paths.root, NODE_VERSION_TIMEOUT_MS);

  if (!isSuccessfulOutcome(outcome)) {
    return UNKNOWN_NODE_MAJOR;
  }

  return NODE_MAJOR_VERSION_PATTERN.exec(outcome.stdout.trim())?.[1] ?? UNKNOWN_NODE_MAJOR;
});

// ============================================================================
// Collection
// ============================================================================

function toHealthInfo(report: Readonly<DoctorReport>): HealthInfo {
  return {score: report.score, grade: report.grade, summary: report.summary};
}

/**
 * Collects every status section, plus the Node version label when the dashboard needs it.
 *
 * @remarks
 * Status obtains its quick session from the shared `Inspection` service before the batch starts.
 * The five ordinary collectors, the optional version probe, and `doctor` then start together in
 * one unbounded batch, so nothing is serialized behind a sibling; doctor requests the identical
 * `{profile: "quick", paths}` session from the same service and therefore shares every memoized
 * provider outcome. A collector defect degrades exactly one section to `null` (or the version to
 * `"?"`) while its siblings keep their data. A doctor defect fails the whole program, which
 * interrupts the remaining siblings.
 *
 * @param doctor - The composed doctor program.
 * @param includeNodeMajor - Whether to probe the running Node version (human dashboard only).
 * @returns The document and the Node version label (`"?"` when not probed).
 */
function collectSections(doctor: StatusDoctor, includeNodeMajor: boolean): Effect.Effect<StatusDashboard, never, StatusRequirements> {
  return Effect.gen(function* () {
    const files = yield* legacyReadOnlyFiles;
    const paths = yield* Effect.promise(() => resolveRepositoryPaths(import.meta.url, files));
    const inspection = yield* (yield* Inspection).session({profile: "quick", paths});
    const context: StatusContext = {paths, inspection};

    const [workspaces, nxEdges, git, security, disk, nodeMajor, report] = yield* Effect.all(
      [
        unavailableOnDefect(collectWorkspaces(context), null),
        unavailableOnDefect(collectNxGraph(context), null),
        unavailableOnDefect(collectGit(context), null),
        unavailableOnDefect(collectSecurity(context), null),
        unavailableOnDefect(collectDisk(paths), null),
        includeNodeMajor ? unavailableOnDefect(collectNodeMajorVersion(context), UNKNOWN_NODE_MAJOR) : Effect.succeed(UNKNOWN_NODE_MAJOR),
        doctor(STATUS_DOCTOR_INPUT),
      ],
      {concurrency: "unbounded"},
    );

    return {document: {workspaces, nxEdges, git, security, disk, health: toHealthInfo(report)}, nodeMajor};
  });
}

/**
 * Collects the six-section status document over the given doctor program.
 *
 * @remarks
 * Exported for tests that compose a fake doctor; production code uses {@link collectStatus}.
 *
 * @param doctor - The composed doctor program.
 * @returns The status program; it never probes the Node version.
 */
export function collectStatusWith(doctor: StatusDoctor): Effect.Effect<StatusDocument, never, StatusRequirements> {
  return Effect.map(collectSections(doctor, false), (dashboard) => dashboard.document).pipe(Effect.withSpan("status.collect"));
}

/**
 * Collects the status document and the Node version label of the human dashboard.
 *
 * @param doctor - The composed doctor program; defaults to {@link runDoctor}.
 * @returns The dashboard program; the version probe runs concurrently with every collector.
 */
export function collectStatusDashboardWith(doctor: StatusDoctor = runDoctor): Effect.Effect<StatusDashboard, never, StatusRequirements> {
  return collectSections(doctor, true).pipe(Effect.withSpan("status.collectDashboard"));
}

/** Collects the six-section status document, composing {@link runDoctor} over the shared inspection session. */
export const collectStatus: Effect.Effect<StatusDocument, never, StatusRequirements> = collectStatusWith(runDoctor);

// ============================================================================
// Rendering
// ============================================================================

/**
 * Writes the doctor summary line of the dashboard header.
 *
 * @param summary - The doctor summary.
 * @returns An effect writing `Health summary: …` (human mode only).
 */
export function renderHealthSummary(summary: Readonly<DoctorSummary>): Effect.Effect<void, never, Presenter> {
  return Effect.flatMap(Presenter, (presenter) =>
    presenter.line(
      "stdout",
      `Health summary: ${String(summary.passed)} passed, ${String(summary.warnings)} warning${summary.warnings === 1 ? "" : "s"}, ${String(summary.failed)} failure${summary.failed === 1 ? "" : "s"}, ${String(summary.skipped)} skipped`,
    ),
  );
}

/**
 * Renders the full status dashboard through the {@link Presenter}.
 *
 * @param document - The complete, six-section status payload.
 * @param nodeMajor - Major version label of the Node runtime executing this command.
 * @returns An effect writing the dashboard (human mode only).
 */
export function renderDashboard(document: Readonly<StatusDocument>, nodeMajor: string): Effect.Effect<void, never, Presenter> {
  return Effect.gen(function* () {
    const presenter = yield* Presenter;
    const line = (text: string): Effect.Effect<void> => presenter.line("stdout", text);
    const {workspaces, nxEdges, git, security, disk, health} = document;
    const healthLabel = health ? `${String(health.score)} (${health.grade})` : "unavailable";
    const branchLabel = git?.branch ?? "unavailable";

    yield* presenter.banner("🏠 arolariu.ro monorepo status");
    yield* line(`Branch: ${branchLabel}  │  Node: ${nodeMajor}.x  │  Health: ${healthLabel}`);
    if (health) {
      yield* renderHealthSummary(health.summary);
    }

    yield* presenter.section("Workspaces", "📦");
    if (workspaces) {
      yield* presenter.table({
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
      yield* line("unavailable");
    }

    yield* presenter.section("Dependency Graph", "🔗");
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
        yield* line(`${target} ← ${sources.join(", ")}`);
      }

      for (const workspace of workspaces ?? []) {
        const short = workspace.name.replace("@arolariu/", "");
        if (!mentioned.has(short)) {
          yield* line(`${short} (isolated)`);
        }
      }
    } else if (nxEdges) {
      yield* line("No inter-project dependencies found");
    } else {
      yield* line("unavailable");
    }

    yield* presenter.section("Git", "📋");
    if (git) {
      yield* line(`Branch: ${git.branch} @ ${git.sha}`);
      yield* line(`Last: ${git.lastCommitTime} — "${git.lastCommitMsg}"`);
      const treeStatus = git.dirtyFiles === 0 ? "clean" : `${String(git.dirtyFiles)} file${git.dirtyFiles === 1 ? "" : "s"} modified`;
      yield* line(`Working tree: ${treeStatus}`);
    } else {
      yield* line("unavailable");
    }

    yield* presenter.section("Security & Dependencies", "🔒");
    if (security) {
      yield* line(`Audit:    ${String(security.critical)} critical, ${String(security.high)} high, ${String(security.moderate)} moderate`);
      yield* line(
        `Outdated: ${String(security.majorOutdated)} major, ${String(security.minorOutdated)} minor, ${String(security.patchOutdated)} patch`,
      );
    } else {
      yield* line("unavailable");
    }

    yield* presenter.section("Disk Usage", "💾");
    if (disk) {
      yield* line(
        `node_modules: ${formatBytes(disk.nodeModules)}  │  .next: ${formatBytes(disk.nextBuild)}  │  dist: ${formatBytes(disk.componentsDist)}`,
      );
    } else {
      yield* line("unavailable");
    }
  });
}
