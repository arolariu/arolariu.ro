/**
 * @fileoverview Workspace health diagnostics script for the arolariu.ro monorepo.
 * @module scripts/doctor
 *
 * @remarks
 * Validates the local development environment by running a series of diagnostic
 * checks across toolchain versions, workspace integrity, environment configuration,
 * and system resources.
 *
 * Each check produces a pass/warn/fail result with actionable fix suggestions.
 * The script exits with code 0 when no failures are found (warnings are acceptable)
 * and code 1 when any check fails — making it suitable for CI gating.
 *
 * @example
 * ```bash
 * node --experimental-strip-types scripts/doctor.ts
 * node --experimental-strip-types scripts/doctor.ts --verbose
 * node --experimental-strip-types scripts/doctor.ts --ci
 * ```
 */

import {execSync} from "node:child_process";
import {existsSync, readFileSync, statSync, unlinkSync} from "node:fs";
import {createServer} from "node:net";
import {freemem, platform} from "node:os";
import {join} from "node:path";
import {styleText} from "node:util";
import {formatBytes} from "./common/index.ts";

// ============================================================================
// Types
// ============================================================================

/** Outcome status for a single diagnostic check. */
type CheckStatus = "pass" | "warn" | "fail";

/** Logical grouping for diagnostic checks. */
type CheckCategory = "toolchain" | "workspace" | "environment" | "system" | "security" | "quality" | "graph";

/**
 * Result of a single diagnostic check.
 *
 * @remarks
 * The `fix` field is populated only when `status` is `"warn"` or `"fail"` and
 * provides a concrete remediation step the developer can follow.
 */
interface DiagnosticCheck {
  /** Human-readable check name. */
  readonly name: string;
  /** Logical section this check belongs to. */
  readonly category: CheckCategory;
  /** Outcome of the check. */
  readonly status: CheckStatus;
  /** One-line summary of the result. */
  readonly message: string;
  /** Optional verbose detail (shown only with `--verbose`). */
  readonly detail?: string;
  /** Suggested fix when the check is not passing. */
  readonly fix?: string;
}

/** Parsed CLI flags. */
interface CliFlags {
  readonly verbose: boolean;
  readonly ci: boolean;
  readonly help: boolean;
  readonly score: boolean;
  readonly json: boolean;
  readonly quick: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const REQUIRED_NODE_MAJOR = 24;
const REQUIRED_NPM_MAJOR = 11;
const REQUIRED_DOTNET_MAJOR = 10;
const MIN_DISK_BYTES = 1024 * 1024 * 1024; // 1 GB

const REQUIRED_CONFIG_FILES: readonly string[] = [
  "nx.json",
  "eslint.config.ts",
  "prettier.config.ts",
  "tsconfig.json",
  "package.json",
];

const CHECKED_PORTS: readonly {port: number; label: string}[] = [
  {port: 3000, label: "Website (Next.js)"},
  {port: 5000, label: "API (.NET)"},
  {port: 6006, label: "Storybook"},
];

const BUNDLE_SIZE_WARN_BYTES = 15 * 1024 * 1024; // 15 MB
const BUNDLE_SIZE_FAIL_BYTES = 20 * 1024 * 1024; // 20 MB
const MAX_MAJOR_OUTDATED_WARN = 5;
const MAX_MAJOR_OUTDATED_FAIL = 10;

const CHECK_WEIGHTS: Record<string, number> = {
  "Node.js version": 8,
  "npm version": 8,
  ".NET SDK": 3,
  "Nx CLI": 5,
  "node_modules": 8,
  "npm workspace integrity": 5,
  "Required config files": 5,
  "Environment files": 3,
  "Git status": 2,
  "Disk space": 3,
  "Port availability": 1,
  "npm audit": 15,
  "Outdated packages": 5,
  "TypeScript strict": 10,
  "Bundle size": 5,
  "Nx graph integrity": 5,
  "Circular dependencies": 5,
  "Website depends on Components": 5,
};

// ============================================================================
// Utility Helpers
// ============================================================================

/**
 * Executes a shell command and returns trimmed stdout, or `null` on failure.
 *
 * @param cmd - Shell command to execute.
 * @returns Trimmed stdout or `null` when the command fails.
 */
function exec(cmd: string): string | null {
  try {
    return execSync(cmd, {encoding: "utf-8", stdio: "pipe", timeout: 15_000}).trim();
  } catch {
    return null;
  }
}

/**
 * Parses a semver-like version string and returns the major version.
 *
 * @param version - Version string (e.g. `"v24.9.0"`, `"11.2.0"`, `"10.0.100"`).
 * @returns The major version number, or `NaN` if parsing fails.
 */
function parseMajor(version: string): number {
  return parseInt(version.replace(/^v/, "").split(".")[0] ?? "", 10);
}

/**
 * Checks whether a given TCP port is available for binding.
 *
 * @param port - TCP port number to test.
 * @param timeoutMs - Maximum time to wait for the probe (default 1500 ms).
 * @returns A promise resolving to `true` when the port is free, `false` otherwise.
 */
function isPortAvailable(port: number, timeoutMs: number = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      server.close();
      resolve(false);
    }, timeoutMs);

    const server = createServer();
    server.once("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
    server.once("listening", () => {
      clearTimeout(timer);
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

// ============================================================================
// Diagnostic Checks
// ============================================================================

/** Checks the installed Node.js version against the minimum requirement. */
function checkNodeVersion(): DiagnosticCheck {
  const raw = exec("node --version");
  if (!raw) {
    return {
      name: "Node.js version",
      category: "toolchain",
      status: "fail",
      message: "Node.js is not installed or not on PATH",
      fix: `Install Node.js >= ${REQUIRED_NODE_MAJOR} from https://nodejs.org/`,
    };
  }
  const major = parseMajor(raw);
  if (Number.isNaN(major) || major < REQUIRED_NODE_MAJOR) {
    return {
      name: "Node.js version",
      category: "toolchain",
      status: "fail",
      message: `Found Node.js ${raw}, requires >= ${REQUIRED_NODE_MAJOR}`,
      detail: `Detected version string: ${raw}`,
      fix: `Upgrade Node.js to version ${REQUIRED_NODE_MAJOR}.x or later`,
    };
  }
  return {
    name: "Node.js version",
    category: "toolchain",
    status: "pass",
    message: `Node.js ${raw}`,
    detail: `Major version ${major} meets requirement >= ${REQUIRED_NODE_MAJOR}`,
  };
}

/** Checks the installed npm version against the minimum requirement. */
function checkNpmVersion(): DiagnosticCheck {
  const raw = exec("npm --version");
  if (!raw) {
    return {
      name: "npm version",
      category: "toolchain",
      status: "fail",
      message: "npm is not installed or not on PATH",
      fix: "npm is bundled with Node.js — reinstall Node.js",
    };
  }
  const major = parseMajor(raw);
  if (Number.isNaN(major) || major < REQUIRED_NPM_MAJOR) {
    return {
      name: "npm version",
      category: "toolchain",
      status: "fail",
      message: `Found npm ${raw}, requires >= ${REQUIRED_NPM_MAJOR}`,
      fix: `Run: npm install -g npm@latest`,
    };
  }
  return {
    name: "npm version",
    category: "toolchain",
    status: "pass",
    message: `npm ${raw}`,
  };
}

/** Checks the installed .NET SDK version (optional — warn only). */
function checkDotnetVersion(): DiagnosticCheck {
  const raw = exec("dotnet --version");
  if (!raw) {
    return {
      name: ".NET SDK",
      category: "toolchain",
      status: "warn",
      message: ".NET SDK not installed (optional for frontend-only devs)",
      detail: "Backend development requires .NET SDK",
      fix: `Install .NET ${REQUIRED_DOTNET_MAJOR} SDK from https://dot.net/`,
    };
  }
  const major = parseMajor(raw);
  if (Number.isNaN(major) || major < REQUIRED_DOTNET_MAJOR) {
    return {
      name: ".NET SDK",
      category: "toolchain",
      status: "warn",
      message: `Found .NET SDK ${raw}, recommended >= ${REQUIRED_DOTNET_MAJOR}`,
      fix: `Upgrade .NET SDK to version ${REQUIRED_DOTNET_MAJOR}.x`,
    };
  }
  return {
    name: ".NET SDK",
    category: "toolchain",
    status: "pass",
    message: `.NET SDK ${raw}`,
  };
}

/** Checks that the Nx CLI is available via npx. */
function checkNxInstalled(): DiagnosticCheck {
  const raw = exec("npx nx --version");
  if (!raw) {
    return {
      name: "Nx CLI",
      category: "toolchain",
      status: "fail",
      message: "Nx CLI is not available via npx",
      fix: "Run: npm install",
    };
  }
  // Nx --version may output multi-line text; extract the local version
  const localMatch = raw.match(/Local:\s*v?([\d.]+)/i);
  const version = localMatch?.[1] ?? raw.split("\n")[0]?.trim() ?? raw;
  return {
    name: "Nx CLI",
    category: "toolchain",
    status: "pass",
    message: `Nx ${version}`,
  };
}

/** Checks that the root `node_modules/` directory exists. */
function checkNodeModules(): DiagnosticCheck {
  const modulesPath = join(process.cwd(), "node_modules");
  if (!existsSync(modulesPath)) {
    return {
      name: "node_modules",
      category: "workspace",
      status: "fail",
      message: "node_modules/ directory not found",
      fix: "Run: npm install",
    };
  }
  return {
    name: "node_modules",
    category: "workspace",
    status: "pass",
    message: "node_modules/ exists",
  };
}

/** Runs `npm ls` and checks for workspace integrity errors. */
function checkNpmIntegrity(): DiagnosticCheck {
  const raw = exec("npm ls --all --json");
  if (!raw) {
    return {
      name: "npm workspace integrity",
      category: "workspace",
      status: "warn",
      message: "Could not run npm ls to verify workspace integrity",
      fix: "Run: npm install",
    };
  }
  try {
    // npm ls may include non-JSON preamble; extract the first JSON object
    const jsonStart = raw.indexOf("{");
    const jsonStr = jsonStart >= 0 ? raw.slice(jsonStart) : raw;
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    if (parsed["problems"] && Array.isArray(parsed["problems"]) && parsed["problems"].length > 0) {
      const count = parsed["problems"].length;
      return {
        name: "npm workspace integrity",
        category: "workspace",
        status: "warn",
        message: `npm ls reports ${count} problem(s)`,
        detail: (parsed["problems"] as string[]).slice(0, 5).join("\n"),
        fix: "Run: npm install to resolve dependency issues",
      };
    }
  } catch {
    // JSON parse failure is non-critical — exit code may be non-zero with valid workspace
    return {
      name: "npm workspace integrity",
      category: "workspace",
      status: "pass",
      message: "Workspace dependencies are installed",
    };
  }
  return {
    name: "npm workspace integrity",
    category: "workspace",
    status: "pass",
    message: "No dependency issues detected",
  };
}

/** Checks that all required config files exist at the repo root. */
function checkConfigFiles(): DiagnosticCheck {
  const missing: string[] = [];
  for (const file of REQUIRED_CONFIG_FILES) {
    if (!existsSync(join(process.cwd(), file))) {
      missing.push(file);
    }
  }
  if (missing.length > 0) {
    return {
      name: "Required config files",
      category: "workspace",
      status: "fail",
      message: `Missing: ${missing.join(", ")}`,
      fix: "Ensure these files exist in the repository root",
    };
  }
  return {
    name: "Required config files",
    category: "workspace",
    status: "pass",
    message: `All ${REQUIRED_CONFIG_FILES.length} config files present`,
    detail: REQUIRED_CONFIG_FILES.join(", "),
  };
}

/** Checks for environment files in the website project. */
function checkEnvFiles(): DiagnosticCheck {
  const siteDir = join(process.cwd(), "sites", "arolariu.ro");
  const hasEnv = existsSync(join(siteDir, ".env"));
  const hasEnvLocal = existsSync(join(siteDir, ".env.local"));

  if (!hasEnv && !hasEnvLocal) {
    return {
      name: "Environment files",
      category: "environment",
      status: "warn",
      message: "No .env or .env.local found in sites/arolariu.ro/",
      detail: "Environment files are needed for local development",
      fix: "Run: npm run generate -- --env",
    };
  }

  const found = [hasEnv && ".env", hasEnvLocal && ".env.local"].filter(Boolean).join(", ");
  return {
    name: "Environment files",
    category: "environment",
    status: "pass",
    message: `Found: ${found} in sites/arolariu.ro/`,
  };
}

/** Reports the current Git branch and uncommitted change status. */
function checkGitStatus(): DiagnosticCheck {
  const branch = exec("git rev-parse --abbrev-ref HEAD");
  if (!branch) {
    return {
      name: "Git status",
      category: "environment",
      status: "warn",
      message: "Could not determine Git branch",
      fix: "Ensure git is installed and this is a git repository",
    };
  }

  const status = exec("git status --porcelain");
  const changedFiles = status ? status.split("\n").filter(Boolean).length : 0;
  const message =
    changedFiles > 0
      ? `Branch: ${branch} (${changedFiles} uncommitted change${changedFiles === 1 ? "" : "s"})`
      : `Branch: ${branch} (clean)`;

  return {
    name: "Git status",
    category: "environment",
    status: "pass",
    message,
    detail: changedFiles > 0 ? `${changedFiles} file(s) with uncommitted changes` : undefined,
  };
}

/** Checks available disk space on the current drive. */
function checkDiskSpace(): DiagnosticCheck {
  const free = freemem(); // RAM free (used as fallback indicator)
  let diskFree: number | null = null;

  try {
    if (platform() === "win32") {
      const drive = process.cwd().slice(0, 2); // e.g. "C:"
      const raw = exec(`wmic logicaldisk where "DeviceID='${drive}'" get FreeSpace /format:value`);
      if (raw) {
        const match = raw.match(/FreeSpace=(\d+)/);
        if (match?.[1]) {
          diskFree = parseInt(match[1], 10);
        }
      }
      // Fallback: PowerShell
      if (diskFree === null) {
        const psRaw = exec(
          `powershell -NoProfile -Command "(Get-PSDrive ${drive[0]}).Free"`,
        );
        if (psRaw) {
          diskFree = parseInt(psRaw, 10);
        }
      }
    } else {
      const raw = exec("df -k . | tail -1");
      if (raw) {
        const parts = raw.split(/\s+/);
        const available = parts[3];
        if (available) {
          diskFree = parseInt(available, 10) * 1024; // KB → bytes
        }
      }
    }
  } catch {
    // Disk check is best-effort
  }

  if (diskFree === null) {
    return {
      name: "Disk space",
      category: "system",
      status: "pass",
      message: `Could not determine disk space (free RAM: ${formatBytes(free)})`,
    };
  }

  if (diskFree < MIN_DISK_BYTES) {
    return {
      name: "Disk space",
      category: "system",
      status: "warn",
      message: `Low disk space: ${formatBytes(diskFree)} free`,
      fix: "Free up disk space — builds and node_modules require significant storage",
    };
  }

  return {
    name: "Disk space",
    category: "system",
    status: "pass",
    message: `${formatBytes(diskFree)} free`,
  };
}

/**
 * Checks whether common dev-server ports are available.
 *
 * @returns A promise resolving to a `DiagnosticCheck` for port availability.
 */
async function checkPorts(): Promise<DiagnosticCheck> {
  const results: string[] = [];
  let anyInUse = false;

  for (const {port, label} of CHECKED_PORTS) {
    const available = await isPortAvailable(port);
    if (available) {
      results.push(`${port} (${label}): free`);
    } else {
      results.push(`${port} (${label}): in use`);
      anyInUse = true;
    }
  }

  return {
    name: "Port availability",
    category: "system",
    status: "pass", // Info only — never fail on ports
    message: anyInUse ? "Some dev ports are in use" : "All dev ports are free",
    detail: results.join("\n"),
  };
}

// ============================================================================
// Security, Quality & Graph Checks
// ============================================================================

/** Runs npm audit and checks for critical/high vulnerabilities. */
function checkNpmAudit(): DiagnosticCheck {
  const raw = exec("npm audit --json 2>&1");
  if (!raw) {
    return {
      name: "npm audit",
      category: "security",
      status: "warn",
      message: "Could not run npm audit",
      fix: "Run: npm install to generate package-lock.json",
    };
  }
  try {
    const jsonStart = raw.indexOf("{");
    if (jsonStart < 0) {
      return {name: "npm audit", category: "security", status: "pass", message: "No vulnerabilities found"};
    }
    const parsed = JSON.parse(raw.slice(jsonStart)) as Record<string, unknown>;
    const vuln = parsed["metadata"] as Record<string, unknown> | undefined;
    const vulnerabilities = vuln?.["vulnerabilities"] as Record<string, number> | undefined;
    if (!vulnerabilities) {
      return {name: "npm audit", category: "security", status: "pass", message: "No vulnerabilities found"};
    }
    const critical = vulnerabilities["critical"] ?? 0;
    const high = vulnerabilities["high"] ?? 0;
    const moderate = vulnerabilities["moderate"] ?? 0;
    const low = vulnerabilities["low"] ?? 0;
    const total = critical + high + moderate + low;
    if (critical > 0 || high > 0) {
      return {
        name: "npm audit",
        category: "security",
        status: "fail",
        message: `${critical} critical, ${high} high, ${moderate} moderate, ${low} low`,
        fix: "Run: npm audit fix or review vulnerabilities with npm audit",
      };
    }
    if (total > 0) {
      return {
        name: "npm audit",
        category: "security",
        status: "warn",
        message: `${moderate} moderate, ${low} low (no critical/high)`,
      };
    }
    return {name: "npm audit", category: "security", status: "pass", message: "No vulnerabilities found"};
  } catch {
    return {name: "npm audit", category: "security", status: "warn", message: "Could not parse npm audit output"};
  }
}

/** Checks for outdated packages with major version bumps. */
function checkOutdatedPackages(): DiagnosticCheck {
  const raw = exec("npm outdated --json 2>&1");
  if (!raw || raw.trim() === "{}") {
    return {name: "Outdated packages", category: "security", status: "pass", message: "All packages up to date"};
  }
  try {
    const jsonStart = raw.indexOf("{");
    if (jsonStart < 0) {
      return {name: "Outdated packages", category: "security", status: "pass", message: "All packages up to date"};
    }
    const parsed = JSON.parse(raw.slice(jsonStart)) as Record<string, Record<string, string>>;
    let majorCount = 0;
    let minorCount = 0;
    let patchCount = 0;
    for (const pkg of Object.values(parsed)) {
      const current = pkg["current"];
      const latest = pkg["latest"];
      if (!current || !latest) continue;
      const currentMajor = parseMajor(current);
      const latestMajor = parseMajor(latest);
      if (latestMajor > currentMajor) majorCount++;
      else if (latest !== current) {
        const currentMinor = parseInt(current.split(".")[1] ?? "0", 10);
        const latestMinor = parseInt(latest.split(".")[1] ?? "0", 10);
        if (latestMinor > currentMinor) minorCount++;
        else patchCount++;
      }
    }
    const total = majorCount + minorCount + patchCount;
    if (total === 0) {
      return {name: "Outdated packages", category: "security", status: "pass", message: "All packages up to date"};
    }
    const msg = `${majorCount} major, ${minorCount} minor, ${patchCount} patch updates available`;
    if (majorCount > MAX_MAJOR_OUTDATED_FAIL) {
      return {name: "Outdated packages", category: "security", status: "fail", message: msg, fix: "Run: npm outdated to review and update packages"};
    }
    if (majorCount > MAX_MAJOR_OUTDATED_WARN) {
      return {name: "Outdated packages", category: "security", status: "warn", message: msg};
    }
    return {name: "Outdated packages", category: "security", status: "pass", message: msg};
  } catch {
    return {name: "Outdated packages", category: "security", status: "warn", message: "Could not parse npm outdated output"};
  }
}

/** Checks for TypeScript compilation errors using tsc --noEmit. */
function checkTypeScript(): DiagnosticCheck {
  const result = exec("npx tsc --noEmit --pretty false 2>&1");
  if (result === null) {
    return {name: "TypeScript strict", category: "quality", status: "warn", message: "Could not run tsc"};
  }
  const errorMatch = result.match(/error TS\d+/g);
  if (errorMatch && errorMatch.length > 0) {
    return {
      name: "TypeScript strict",
      category: "quality",
      status: "fail",
      message: `${errorMatch.length} TypeScript error(s)`,
      detail: result.split("\n").slice(0, 5).join("\n"),
      fix: "Fix TypeScript errors shown above",
    };
  }
  return {name: "TypeScript strict", category: "quality", status: "pass", message: "No type errors"};
}

/** Checks the website bundle size by scanning the .next directory. */
function checkBundleSize(): DiagnosticCheck {
  const nextDir = join(process.cwd(), "sites", "arolariu.ro", ".next");
  if (!existsSync(nextDir)) {
    return {
      name: "Bundle size",
      category: "quality",
      status: "warn",
      message: "No .next/ directory found — run a build first",
    };
  }
  try {
    let sizeBytes = 0;
    if (platform() === "win32") {
      const escapedPath = nextDir.replaceAll("'", "''");
      const raw = exec(`powershell -NoProfile -Command "(Get-ChildItem '${escapedPath}' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum"`);
      if (!raw) return {name: "Bundle size", category: "quality", status: "warn", message: "Could not measure .next/ size"};
      sizeBytes = parseInt(raw, 10);
    } else {
      const raw = exec(`du -sb "${nextDir}" 2>/dev/null | cut -f1`);
      if (!raw) return {name: "Bundle size", category: "quality", status: "warn", message: "Could not measure .next/ size"};
      sizeBytes = parseInt(raw, 10);
    }
    if (Number.isNaN(sizeBytes)) {
      return {name: "Bundle size", category: "quality", status: "warn", message: "Could not parse .next/ size"};
    }
    const sizeStr = formatBytes(sizeBytes);
    if (sizeBytes > BUNDLE_SIZE_FAIL_BYTES) {
      return {name: "Bundle size", category: "quality", status: "fail", message: `${sizeStr} (exceeds ${formatBytes(BUNDLE_SIZE_FAIL_BYTES)} threshold)`, fix: "Investigate bundle bloat with: cd sites/arolariu.ro && npm run analyze"};
    }
    if (sizeBytes > BUNDLE_SIZE_WARN_BYTES) {
      return {name: "Bundle size", category: "quality", status: "warn", message: `${sizeStr} (approaching ${formatBytes(BUNDLE_SIZE_FAIL_BYTES)} threshold)`};
    }
    return {name: "Bundle size", category: "quality", status: "pass", message: sizeStr};
  } catch {
    return {name: "Bundle size", category: "quality", status: "warn", message: "Could not measure bundle size"};
  }
}

/**
 * Loads the Nx dependency graph once for reuse across multiple graph checks.
 *
 * @returns The parsed graph object or `null` if generation failed.
 */
function loadNxGraph(): Record<string, unknown> | null {
  const tmpFile = join(process.cwd(), ".nx-graph-check.json");
  try {
    exec(`npx nx graph --file="${tmpFile}"`);
    if (!existsSync(tmpFile)) return null;
    const raw = readFileSync(tmpFile, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return (parsed["graph"] ?? parsed) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    try { unlinkSync(tmpFile); } catch { /* ignore */ }
  }
}

/** Checks Nx graph integrity and detects workspace projects. */
function checkNxGraph(graph: Record<string, unknown> | null): DiagnosticCheck {
  if (!graph) {
    return {name: "Nx graph integrity", category: "graph", status: "warn", message: "Could not generate Nx graph"};
  }
  const nodes = graph["nodes"] as Record<string, unknown> | undefined;
  const projectCount = nodes ? Object.keys(nodes).length : 0;
  if (projectCount === 0) {
    return {name: "Nx graph integrity", category: "graph", status: "fail", message: "No projects detected in Nx graph", fix: "Check nx.json and project.json files"};
  }
  return {name: "Nx graph integrity", category: "graph", status: "pass", message: `${projectCount} projects detected`};
}

/** Checks for circular dependencies between workspaces in the Nx graph. */
function checkCircularDeps(graph: Record<string, unknown> | null): DiagnosticCheck {
  if (!graph) {
    return {name: "Circular dependencies", category: "graph", status: "warn", message: "Could not generate graph for cycle check"};
  }
  const deps = graph["dependencies"] as Record<string, Array<{target: string}>> | undefined;
  if (!deps) {
    return {name: "Circular dependencies", category: "graph", status: "pass", message: "No dependencies to analyze"};
  }
  // DFS-based cycle detection for cycles of any length
  const cycles: string[] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      if (cycleStart >= 0) {
        const cycle = path.slice(cycleStart).join(" → ") + " → " + node;
        cycles.push(cycle);
      }
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    inStack.add(node);
    path.push(node);
    for (const edge of deps[node] ?? []) {
      dfs(edge.target, path);
    }
    path.pop();
    inStack.delete(node);
  }

  for (const node of Object.keys(deps)) {
    dfs(node, []);
  }
  if (cycles.length > 0) {
    return {
      name: "Circular dependencies",
      category: "graph",
      status: "fail",
      message: `${cycles.length} circular dependency(ies) found`,
      detail: cycles.join("\n"),
      fix: "Break circular dependencies between workspaces",
    };
  }
  return {name: "Circular dependencies", category: "graph", status: "pass", message: "No circular dependencies"};
}

/** Checks that website depends on components in the Nx graph. */
function checkWebsiteDependsOnComponents(graph: Record<string, unknown> | null): DiagnosticCheck {
  if (!graph) {
    return {name: "Website depends on Components", category: "graph", status: "warn", message: "Could not generate graph"};
  }
  const deps = graph["dependencies"] as Record<string, Array<{target: string}>> | undefined;
  if (!deps) {
    return {name: "Website depends on Components", category: "graph", status: "warn", message: "No dependency data"};
  }
  const websiteDeps = deps["@arolariu/website"] ?? [];
  const hasComponentsDep = websiteDeps.some((d) => d.target === "@arolariu/components");
  if (!hasComponentsDep) {
    return {
      name: "Website depends on Components",
      category: "graph",
      status: "fail",
      message: "Website does not depend on @arolariu/components",
      fix: "Ensure @arolariu/components is listed in the website's package.json dependencies and project.json has dependsOn: ['components:build']",
    };
  }
  return {name: "Website depends on Components", category: "graph", status: "pass", message: "Edge present in graph"};
}
// ============================================================================

/** Maps a check status to a colored badge string. */
function statusBadge(status: CheckStatus): string {
  switch (status) {
    case "pass":
      return styleText("green", "✓ PASS");
    case "warn":
      return styleText("yellow", "⚠ WARN");
    case "fail":
      return styleText("red", "✗ FAIL");
  }
}

/** Human-readable labels for check categories. */
const CATEGORY_LABELS: Record<CheckCategory, string> = {
  toolchain: "🔧 Toolchain",
  workspace: "📦 Workspace",
  environment: "🌐 Environment",
  system: "💻 System",
  security: "🔒 Security",
  quality: "🧪 Quality",
  graph: "🔗 Graph",
};

/**
 * Renders all diagnostic results to the console, grouped by category.
 *
 * @param checks - Array of completed diagnostic checks.
 * @param verbose - Whether to show detail lines for each check.
 */
function printResults(checks: readonly DiagnosticCheck[], verbose: boolean): void {
  const categories: CheckCategory[] = ["toolchain", "workspace", "environment", "system", "security", "quality", "graph"];

  for (const cat of categories) {
    const group = checks.filter((c) => c.category === cat);
    if (group.length === 0) continue;

    console.log(styleText("bold", `\n  ${CATEGORY_LABELS[cat]}`));
    console.log(styleText("gray", `  ${"─".repeat(50)}`));

    for (const check of group) {
      const badge = statusBadge(check.status);
      const name = check.name.padEnd(28);
      console.log(`  ${badge}  ${name} ${styleText("dim", check.message)}`);

      if (verbose && check.detail) {
        for (const line of check.detail.split("\n")) {
          console.log(styleText("gray", `                                     ${line}`));
        }
      }
    }
  }
}

/**
 * Prints the summary line and any suggested fixes for non-passing checks.
 *
 * @param checks - Array of completed diagnostic checks.
 */
function printSummary(checks: readonly DiagnosticCheck[]): void {
  const passed = checks.filter((c) => c.status === "pass").length;
  const warnings = checks.filter((c) => c.status === "warn").length;
  const failures = checks.filter((c) => c.status === "fail").length;

  console.log(styleText("gray", `\n  ${"─".repeat(50)}`));
  const parts: string[] = [
    styleText("green", `${passed} passed`),
    warnings > 0 ? styleText("yellow", `${warnings} warning${warnings === 1 ? "" : "s"}`) : "",
    failures > 0 ? styleText("red", `${failures} failure${failures === 1 ? "" : "s"}`) : "",
  ].filter(Boolean);
  console.log(`\n  Summary: ${parts.join(styleText("dim", ", "))}`);

  // Suggested fixes
  const fixable = checks.filter((c) => c.status !== "pass" && c.fix);
  if (fixable.length > 0) {
    console.log(styleText("bold", "\n  Suggested fixes:"));
    for (const check of fixable) {
      const icon = check.status === "fail" ? styleText("red", "✗") : styleText("yellow", "⚠");
      console.log(`  ${icon} ${styleText("bold", check.name)}: ${styleText("dim", check.fix!)}`);
    }
  }

  console.log();
}

/**
 * Prints CLI usage information.
 */
function printHelp(): void {
  console.log(styleText("bold", "\n  Usage:"));
  console.log(styleText("dim", "    node --experimental-strip-types scripts/doctor.ts [options]\n"));
  console.log(styleText("bold", "  Options:"));
  console.log(`    ${styleText("green", "--verbose, -v")}   Show detailed output for each check`);
  console.log(`    ${styleText("green", "--ci")}            Non-interactive mode (skip port checks)`);
  console.log(`    ${styleText("green", "--help, -h")}      Show this help message`);
  console.log(`    ${styleText("green", "--score")}          Compute and display health score (0-100)`);
  console.log(`    ${styleText("green", "--json")}           Output results as JSON`);
  console.log(`    ${styleText("green", "--quick")}          Skip slow checks (audit, tsc, graph)`);
  console.log();
}

// ============================================================================
// Health Score
// ============================================================================

function computeHealthScore(checks: readonly DiagnosticCheck[]): number {
  let earned = 0;
  let total = 0;
  for (const check of checks) {
    const weight = CHECK_WEIGHTS[check.name] ?? 3;
    total += weight;
    if (check.status === "pass") earned += weight;
    else if (check.status === "warn") earned += weight * 0.5;
  }
  return total > 0 ? Math.round((earned / total) * 100) : 100;
}

function gradeFromScore(score: number): string {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function printHealthScore(checks: readonly DiagnosticCheck[]): void {
  const score = computeHealthScore(checks);
  const grade = gradeFromScore(score);
  const barWidth = 20;
  const filled = Math.round((score / 100) * barWidth);
  const empty = barWidth - filled;
  const barColor = score >= 90 ? "green" : score >= 70 ? "yellow" : "red";
  const bar = styleText(barColor as "green" | "yellow" | "red", "█".repeat(filled)) + styleText("gray", "░".repeat(empty));

  console.log();
  console.log(styleText("gray", "  ╭─────────────────────────────────────────╮"));
  console.log(styleText("gray", "  │") + `  🏥 Health Score: ${styleText("bold", String(score))}/100  Grade: ${styleText("bold", grade)}  ` + styleText("gray", "│"));
  console.log(styleText("gray", "  │") + `  ${bar}  ` + styleText("gray", "│"));
  console.log(styleText("gray", "  ╰─────────────────────────────────────────╯"));
}

// ============================================================================
// Main Entry
// ============================================================================

/**
 * Runs all workspace diagnostic checks and prints the report.
 *
 * @param flags - Parsed CLI flags controlling verbosity and check selection.
 * @returns Process exit code — `0` when no failures, `1` otherwise.
 */
export async function main(flags: Readonly<CliFlags>): Promise<number> {
  if (flags.help) {
    printHelp();
    return 0;
  }

  console.log(styleText(["bold", "green"], "\n╔══════════════════════════════════════════╗"));
  console.log(styleText(["bold", "green"], "║   🩺 arolariu.ro Workspace Doctor        ║"));
  console.log(styleText(["bold", "green"], "║   Health Diagnostics & Validation        ║"));
  console.log(styleText(["bold", "green"], "╚══════════════════════════════════════════╝\n"));

  const checks: DiagnosticCheck[] = [];

  // Toolchain checks
  checks.push(checkNodeVersion());
  checks.push(checkNpmVersion());
  checks.push(checkDotnetVersion());
  checks.push(checkNxInstalled());

  // Workspace checks
  checks.push(checkNodeModules());
  checks.push(checkNpmIntegrity());
  checks.push(checkConfigFiles());

  // Environment checks
  checks.push(checkEnvFiles());
  checks.push(checkGitStatus());

  // System checks
  checks.push(checkDiskSpace());
  if (!flags.ci) {
    checks.push(await checkPorts());
  }

  // Security checks (skip with --quick)
  if (!flags.quick) {
    checks.push(checkNpmAudit());
    checks.push(checkOutdatedPackages());
  }

  // Quality checks (skip with --quick)
  if (!flags.quick) {
    checks.push(checkTypeScript());
  }
  checks.push(checkBundleSize());

  // Graph checks (skip with --quick)
  if (!flags.quick) {
    const graph = loadNxGraph();
    checks.push(checkNxGraph(graph));
    checks.push(checkCircularDeps(graph));
    checks.push(checkWebsiteDependsOnComponents(graph));
  }

  // JSON output mode
  if (flags.json) {
    const score = computeHealthScore(checks);
    const output = {
      score,
      grade: gradeFromScore(score),
      checks: checks.map((c) => ({name: c.name, category: c.category, status: c.status, message: c.message})),
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(output, null, 2));
    return checks.some((c) => c.status === "fail") ? 1 : 0;
  }

  printResults(checks, flags.verbose);
  printSummary(checks);

  if (flags.score) {
    printHealthScore(checks);
  }

  const hasFailures = checks.some((c) => c.status === "fail");
  return hasFailures ? 1 : 0;
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flags: CliFlags = {
    verbose: argv.some((a) => ["--verbose", "-v"].includes(a)),
    ci: argv.some((a) => a === "--ci"),
    help: argv.some((a) => ["--help", "-h"].includes(a)),
    score: argv.some((a) => a === "--score"),
    json: argv.some((a) => a === "--json"),
    quick: argv.some((a) => a === "--quick"),
  };

  main(flags)
    .then((exitCode) => process.exit(exitCode))
    .catch((error) => {
      console.error(styleText("red", "\n❌ Unexpected error:"), error);
      process.exit(1);
    });
}
