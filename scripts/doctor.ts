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
import {existsSync, statSync} from "node:fs";
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
type CheckCategory = "toolchain" | "workspace" | "environment" | "system";

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
// Output Formatting
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
};

/**
 * Renders all diagnostic results to the console, grouped by category.
 *
 * @param checks - Array of completed diagnostic checks.
 * @param verbose - Whether to show detail lines for each check.
 */
function printResults(checks: readonly DiagnosticCheck[], verbose: boolean): void {
  const categories: CheckCategory[] = ["toolchain", "workspace", "environment", "system"];

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
  console.log();
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

  printResults(checks, flags.verbose);
  printSummary(checks);

  const hasFailures = checks.some((c) => c.status === "fail");
  return hasFailures ? 1 : 0;
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flags: CliFlags = {
    verbose: argv.some((a) => ["--verbose", "-v"].includes(a)),
    ci: argv.some((a) => a === "--ci"),
    help: argv.some((a) => ["--help", "-h"].includes(a)),
  };

  main(flags)
    .then((exitCode) => process.exit(exitCode))
    .catch((error) => {
      console.error(styleText("red", "\n❌ Unexpected error:"), error);
      process.exit(1);
    });
}
