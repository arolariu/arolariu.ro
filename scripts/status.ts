/**
 * @fileoverview Monorepo status dashboard for the arolariu.ro monorepo.
 * @module scripts/status
 *
 * @remarks
 * Collects data from multiple sources in parallel (workspaces, Nx dependency
 * graph, git state, npm audit/outdated, disk usage, and doctor health score)
 * then renders a rich terminal dashboard with box-drawing characters and ANSI
 * colors via `node:util` {@link styleText}.
 *
 * All collectors use `Promise.allSettled()` so a failure in any single source
 * degrades gracefully to "unavailable" without blocking the rest of the output.
 *
 * No external npm packages are imported — only Node.js built-ins and the
 * monorepo's own `scripts/common` utilities.
 *
 * @example
 * ```bash
 * node scripts/status.ts          # full dashboard
 * node scripts/status.ts --json   # machine-readable JSON
 * node scripts/status.ts --help   # usage info
 * ```
 */

import {execSync} from "node:child_process";
import {existsSync, readFileSync, unlinkSync} from "node:fs";
import {join} from "node:path";
import {platform} from "node:os";
import {styleText} from "node:util";

import {formatBytes} from "./common/index.ts";

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

/** Health score from the doctor script. */
interface HealthInfo {
  readonly score: number;
  readonly grade: string;
}

/** Parsed CLI flags. */
interface CliFlags {
  readonly json: boolean;
  readonly help: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Absolute path to the monorepo root. */
const ROOT = join(import.meta.dirname, "..");

/** Relative paths (from ROOT) to every workspace project. */
const WORKSPACE_DIRS: readonly string[] = [
  "packages/components",
  "sites/arolariu.ro",
  "sites/cv.arolariu.ro",
  "sites/api.arolariu.ro",
  "sites/docs.arolariu.ro",
];

// ============================================================================
// Utility Helpers
// ============================================================================

/**
 * Executes a shell command synchronously and returns trimmed stdout.
 *
 * Returns `null` when the command fails **and** produces no usable stdout.
 * Commands like `npm audit --json` exit non-zero but still write valid JSON to
 * stdout — that output is preserved.
 *
 * @param cmd - The shell command to run.
 * @param timeoutMs - Maximum execution time in milliseconds (default 30 s).
 * @returns Trimmed stdout, or `null` on failure with no output.
 */
function exec(cmd: string, timeoutMs: number = 30_000): string | null {
  try {
    return execSync(cmd, {encoding: "utf-8", stdio: "pipe", timeout: timeoutMs, cwd: ROOT}).trim();
  } catch (error: unknown) {
    // npm audit / npm outdated exit non-zero but still emit valid stdout.
    if (error !== null && typeof error === "object" && "stdout" in error) {
      const stdout = String((error as {stdout: unknown}).stdout).trim();
      if (stdout.length > 0) return stdout;
    }
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
 * @returns Array of workspace info objects.
 */
async function collectWorkspaces(): Promise<readonly WorkspaceInfo[]> {
  const workspaces: WorkspaceInfo[] = [];

  for (const dir of WORKSPACE_DIRS) {
    const absDir = join(ROOT, dir);
    let name = dir;
    let version = "—";
    let type = "unknown";
    let tags: string[] = [];

    const pkgPath = join(absDir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
        if (typeof pkg["name"] === "string") name = pkg["name"];
        if (typeof pkg["version"] === "string") version = pkg["version"];
      } catch {
        // ignore parse errors
      }
    }

    const projPath = join(absDir, "project.json");
    if (existsSync(projPath)) {
      try {
        const proj = JSON.parse(readFileSync(projPath, "utf-8")) as Record<string, unknown>;
        if (typeof proj["name"] === "string") name = proj["name"];
        if (typeof proj["projectType"] === "string") {
          type = proj["projectType"] === "library" ? "lib" : "app";
        }
        if (Array.isArray(proj["tags"])) {
          tags = (proj["tags"] as unknown[]).filter((t): t is string => typeof t === "string");
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
 * Runs `npx nx graph --file=<tmpfile>` and parses the resulting JSON to
 * extract inter-project dependency edges.
 *
 * The temporary file is always cleaned up, even on failure.
 *
 * @returns Array of `{source, target}` dependency edges.
 */
async function collectNxGraph(): Promise<readonly DependencyEdge[]> {
  const tmpFile = join(ROOT, "nx-graph-status-tmp.json");

  try {
    exec(`npx nx graph --file="${tmpFile}"`, 60_000);

    if (!existsSync(tmpFile)) return [];

    const raw = readFileSync(tmpFile, "utf-8");
    const data = JSON.parse(raw) as Record<string, unknown>;
    const edges: DependencyEdge[] = [];

    // Nx may nest under `graph.dependencies` or directly under `dependencies`.
    const graphObj = (data["graph"] as Record<string, unknown> | undefined) ?? data;
    const deps = graphObj["dependencies"];
    if (typeof deps !== "object" || deps === null) return edges;

    for (const [source, targets] of Object.entries(deps as Record<string, unknown>)) {
      if (!Array.isArray(targets)) continue;
      for (const dep of targets as unknown[]) {
        const target = typeof dep === "string" ? dep : (dep as Record<string, unknown> | null)?.["target"];
        // Only keep edges between workspace projects, skip npm:* externals.
        if (typeof target === "string" && !target.startsWith("npm:")) {
          edges.push({source, target});
        }
      }
    }

    return edges;
  } finally {
    try {
      if (existsSync(tmpFile)) unlinkSync(tmpFile);
    } catch {
      // cleanup is best-effort
    }
  }
}

/**
 * Collects current git repository state: branch, SHA, last commit info, and
 * the number of dirty (uncommitted) files.
 *
 * @returns Git info object.
 */
async function collectGit(): Promise<GitInfo> {
  const branch = exec("git rev-parse --abbrev-ref HEAD") ?? "unknown";
  const sha = exec("git rev-parse --short HEAD") ?? "unknown";
  const lastCommitTime = exec("git log -1 --format=%cr") ?? "unknown";
  let lastCommitMsg = exec("git log -1 --format=%s") ?? "unknown";
  if (lastCommitMsg.length > 60) {
    lastCommitMsg = lastCommitMsg.slice(0, 57) + "...";
  }
  const porcelain = exec("git status --porcelain");
  const dirtyFiles = porcelain ? porcelain.split("\n").filter((l) => l.trim().length > 0).length : 0;

  return {branch, sha, lastCommitTime, lastCommitMsg, dirtyFiles};
}

/**
 * Runs `npm audit --json` and `npm outdated --json` to gather vulnerability
 * counts by severity and outdated-package counts by semver bump level.
 *
 * Both commands may exit non-zero in normal operation (e.g. when
 * vulnerabilities or outdated packages exist). The {@link exec} helper
 * preserves their stdout regardless.
 *
 * @returns Security and dependency-health summary.
 */
async function collectSecurity(): Promise<SecurityInfo> {
  let critical = 0;
  let high = 0;
  let moderate = 0;
  let low = 0;

  const auditRaw = exec("npm audit --json", 60_000);
  if (auditRaw) {
    try {
      const audit = JSON.parse(auditRaw) as Record<string, unknown>;
      const meta = audit["metadata"] as Record<string, unknown> | undefined;
      const vulns = (meta?.["vulnerabilities"] ?? {}) as Record<string, number>;
      critical = vulns["critical"] ?? 0;
      high = vulns["high"] ?? 0;
      moderate = vulns["moderate"] ?? 0;
      low = vulns["low"] ?? 0;
    } catch {
      // malformed JSON — leave zeroes
    }
  }

  let majorOutdated = 0;
  let minorOutdated = 0;
  let patchOutdated = 0;

  const outdatedRaw = exec("npm outdated --json", 60_000);
  if (outdatedRaw) {
    try {
      const outdated = JSON.parse(outdatedRaw) as Record<string, Record<string, string>>;
      for (const pkg of Object.values(outdated)) {
        const current = pkg["current"]?.split(".") ?? [];
        const latest = pkg["latest"]?.split(".") ?? [];
        if (current.length >= 1 && latest.length >= 1) {
          if (current[0] !== latest[0]) majorOutdated++;
          else if (current.length >= 2 && latest.length >= 2 && current[1] !== latest[1]) minorOutdated++;
          else patchOutdated++;
        }
      }
    } catch {
      // malformed JSON — leave zeroes
    }
  }

  return {critical, high, moderate, low, majorOutdated, minorOutdated, patchOutdated};
}

/**
 * Measures on-disk size of key directories using PowerShell
 * `Get-ChildItem -Recurse`.
 *
 * @returns Byte counts for `node_modules`, `.next`, and `dist`.
 */
async function collectDisk(): Promise<DiskInfo> {
  function measureDir(relativePath: string): number {
    const absPath = join(ROOT, relativePath);
    if (!existsSync(absPath)) return 0;
    let result: string | null;
    if (platform() === "win32") {
      const escaped = absPath.replaceAll("'", "''");
      result = exec(
        `powershell -NoProfile -Command "(Get-ChildItem '${escaped}' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum"`,
        60_000,
      );
    } else {
      result = exec(`du -sb "${absPath}" 2>/dev/null | cut -f1`, 60_000);
    }
    if (!result) return 0;
    const parsed = Number.parseInt(result, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return {
    nodeModules: measureDir("node_modules"),
    nextBuild: measureDir("sites/arolariu.ro/.next"),
    componentsDist: measureDir("packages/components/dist"),
  };
}

/**
 * Runs the doctor script in quick JSON mode to retrieve the overall health
 * score and letter grade.
 *
 * @returns Health score and grade, or `null` if the doctor script failed.
 */
async function collectHealthScore(): Promise<HealthInfo | null> {
  const raw = exec("node scripts/doctor.ts --quick --json", 60_000);
  if (!raw) return null;

  try {
    // The doctor output may include npm warnings before the JSON — find the JSON object
    const jsonStart = raw.indexOf("{");
    if (jsonStart < 0) return null;
    const jsonStr = raw.slice(jsonStart);
    const data = JSON.parse(jsonStr) as Record<string, unknown>;
    if (typeof data["score"] === "number" && typeof data["grade"] === "string") {
      return {score: data["score"], grade: data["grade"]};
    }
  } catch {
    // malformed JSON
  }

  return null;
}

// ============================================================================
// Rendering
// ============================================================================

/** Pads or truncates a string to exactly `width` visible characters. */
function pad(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  return text + " ".repeat(width - text.length);
}

/**
 * Renders the full status dashboard to the terminal using box-drawing
 * characters and ANSI colour codes.
 */
function renderDashboard(
  workspaces: readonly WorkspaceInfo[] | null,
  nxEdges: readonly DependencyEdge[] | null,
  git: GitInfo | null,
  security: SecurityInfo | null,
  disk: DiskInfo | null,
  health: HealthInfo | null,
): void {
  const nodeMajor = process.versions["node"]?.split(".")[0] ?? "?";
  const healthLabel = health ? `${health.score} (${health.grade})` : "—";
  const branchLabel = git?.branch ?? "—";

  // ── Header box ────────────────────────────────────────────────────────────
  const innerWidth = 56;
  console.log();
  console.log(`  ${styleText("cyan", "╭" + "─".repeat(innerWidth) + "╮")}`);
  console.log(
    `  ${styleText("cyan", "│")}  🏠 ${styleText("bold", "arolariu.ro monorepo")}` +
      `${" ".repeat(innerWidth - 25)}${styleText("cyan", "│")}`,
  );
  console.log(
    `  ${styleText("cyan", "│")}  Branch: ${styleText("yellow", pad(branchLabel, 10))}` +
      `  │  Node: ${pad(nodeMajor + ".x", 6)}` +
      ` │  Health: ${pad(healthLabel, 8)}${styleText("cyan", "│")}`,
  );
  console.log(`  ${styleText("cyan", "╰" + "─".repeat(innerWidth) + "╯")}`);

  // ── Workspaces ────────────────────────────────────────────────────────────
  console.log();
  console.log(`  ${styleText("bold", "📦 Workspaces")}`);
  console.log(`  ${styleText("gray", "─".repeat(57))}`);
  if (workspaces) {
    console.log(
      `  ${styleText("gray", pad("  Package", 28) + pad("Version", 9) + pad("Type", 9) + "Tags")}`,
    );
    for (const ws of workspaces) {
      const shortName = ws.name.replace("@arolariu/", "");
      const tagStr = ws.tags
        .filter((t) => t.startsWith("domain:"))
        .map((t) => t.replace("domain:", ""))
        .join(", ");
      console.log(
        `  ${pad("  " + shortName, 28)}${pad(ws.version, 9)}${pad(ws.type, 9)}${tagStr}`,
      );
    }
  } else {
    console.log(`  ${styleText("yellow", "  unavailable")}`);
  }

  // ── Dependency Graph ──────────────────────────────────────────────────────
  console.log();
  console.log(`  ${styleText("bold", "🔗 Dependency Graph")}`);
  if (nxEdges && nxEdges.length > 0) {
    // Group by target: show "target ← dependents"
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
      console.log(`  ${styleText("cyan", "  " + target)} ← ${sources.join(", ")}`);
    }

    // Show isolated workspace projects
    if (workspaces) {
      for (const ws of workspaces) {
        const short = ws.name.replace("@arolariu/", "");
        if (!mentioned.has(short)) {
          console.log(`  ${styleText("gray", "  " + short + " (isolated)")}`);
        }
      }
    }
  } else if (nxEdges) {
    console.log(`  ${styleText("gray", "  No inter-project dependencies found")}`);
  } else {
    console.log(`  ${styleText("yellow", "  unavailable")}`);
  }

  // ── Git ────────────────────────────────────────────────────────────────────
  console.log();
  console.log(`  ${styleText("bold", "📋 Git")}`);
  if (git) {
    console.log(
      `  ${styleText("gray", "  Branch:")} ${styleText("yellow", git.branch)} @ ${styleText("cyan", git.sha)}`,
    );
    console.log(`  ${styleText("gray", "  Last:")} ${git.lastCommitTime} — "${git.lastCommitMsg}"`);
    const treeStatus =
      git.dirtyFiles === 0
        ? styleText("green", "clean ✅")
        : styleText("yellow", `${git.dirtyFiles} file${git.dirtyFiles === 1 ? "" : "s"} modified ⚠️`);
    console.log(`  ${styleText("gray", "  Working tree:")} ${treeStatus}`);
  } else {
    console.log(`  ${styleText("yellow", "  unavailable")}`);
  }

  // ── Security & Dependencies ───────────────────────────────────────────────
  console.log();
  console.log(`  ${styleText("bold", "🔒 Security & Dependencies")}`);
  if (security) {
    const auditParts: string[] = [];
    auditParts.push(
      security.critical > 0
        ? styleText("red", `${security.critical} critical`)
        : `${security.critical} critical`,
    );
    auditParts.push(
      security.high > 0 ? styleText("red", `${security.high} high`) : `${security.high} high`,
    );
    auditParts.push(
      security.moderate > 0
        ? styleText("yellow", `${security.moderate} moderate`)
        : `${security.moderate} moderate`,
    );
    console.log(`  ${styleText("gray", "  Audit:    ")}${auditParts.join(", ")}`);
    console.log(
      `  ${styleText("gray", "  Outdated: ")}${security.majorOutdated} major, ${security.minorOutdated} minor, ${security.patchOutdated} patch`,
    );
  } else {
    console.log(`  ${styleText("yellow", "  unavailable")}`);
  }

  // ── Disk Usage ────────────────────────────────────────────────────────────
  console.log();
  console.log(`  ${styleText("bold", "💾 Disk Usage")}`);
  if (disk) {
    console.log(
      `  ${styleText("gray", "  node_modules:")} ${formatBytes(disk.nodeModules)}` +
        `  │  ${styleText("gray", ".next:")} ${formatBytes(disk.nextBuild)}` +
        `  │  ${styleText("gray", "dist:")} ${formatBytes(disk.componentsDist)}`,
    );
  } else {
    console.log(`  ${styleText("yellow", "  unavailable")}`);
  }

  console.log();
}

// ============================================================================
// Main
// ============================================================================

/**
 * Entry-point: runs all collectors in parallel via `Promise.allSettled()`,
 * then renders the dashboard or emits JSON.
 *
 * @param flags - Parsed CLI flags.
 */
async function main(flags: CliFlags): Promise<void> {
  if (flags.help) {
    console.log(`
  ${styleText("bold", "arolariu.ro monorepo status dashboard")}

  ${styleText("cyan", "Usage:")}
    node scripts/status.ts [options]

  ${styleText("cyan", "Options:")}
    --json        Output all collected data as JSON
    --help, -h    Show this help message
`);
    return;
  }

  const [workspacesResult, nxGraphResult, gitResult, securityResult, diskResult, healthResult] =
    await Promise.allSettled([
      collectWorkspaces(),
      collectNxGraph(),
      collectGit(),
      collectSecurity(),
      collectDisk(),
      collectHealthScore(),
    ]);

  const workspaces = workspacesResult.status === "fulfilled" ? workspacesResult.value : null;
  const nxEdges = nxGraphResult.status === "fulfilled" ? nxGraphResult.value : null;
  const git = gitResult.status === "fulfilled" ? gitResult.value : null;
  const security = securityResult.status === "fulfilled" ? securityResult.value : null;
  const disk = diskResult.status === "fulfilled" ? diskResult.value : null;
  const health = healthResult.status === "fulfilled" ? healthResult.value : null;

  if (flags.json) {
    const output = {workspaces, nxEdges, git, security, disk, health};
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  renderDashboard(workspaces, nxEdges, git, security, disk, health);
}

// ============================================================================
// Entry Point
// ============================================================================

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flags: CliFlags = {
    json: argv.some((a) => a === "--json"),
    help: argv.some((a) => ["--help", "-h"].includes(a)),
  };

  main(flags)
    .then(() => process.exit(0))
    .catch((error: unknown) => {
      console.error(styleText("red", "\n❌ Unexpected error:"), error);
      process.exit(1);
    });
}
