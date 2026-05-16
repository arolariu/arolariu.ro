/**
 * @fileoverview Lint worker thread for parallel per-target lint execution.
 * @module scripts/workers/lint.worker
 *
 * @remarks
 * This worker is spawned by Piscina to run lint analysis for a target in a
 * separate thread. Each target composes 1 or 2 sequential steps (see
 * stepsForTarget) and the worker runs them fail-fast, returning a serializable
 * result to the main thread.
 *
 * Supported tools (per target):
 * - packages, website         → ESLint Node API
 * - cv, status                → svelte-check + ESLint
 * - api                       → dotnet format --verify-no-changes + dotnet build
 * - exp                       → ruff check (probes `ruff` then falls back to `python -m ruff`)
 */

import {spawn} from "node:child_process";
import {threadId} from "node:worker_threads";
import {ESLint} from "eslint";
import type {ESLintFileStats, LintTarget, LintWorkerInput, LintWorkerResult} from "../types/lint.ts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of slowest files to track */
const TOP_SLOWEST_FILES = 5;

/** Cache directory for build artifacts */
const CACHE_DIR = "artifacts";

// ---------------------------------------------------------------------------
// Child-process helpers (mirrors format.worker.ts from Phase 1)
// ---------------------------------------------------------------------------

/**
 * Runs a command and captures output (stdout + stderr merged).
 * @param command The command to run
 * @param args Command arguments
 * @param opts Optional options (cwd)
 * @returns Promise with exit code and merged output
 */
async function runCommand(command: string, args: readonly string[], opts?: {cwd?: string}): Promise<{code: number; output: string}> {
  return new Promise((resolve) => {
    const child = spawn(command, args as string[], {
      stdio: "pipe",
      windowsHide: true,
      cwd: opts?.cwd,
      // On Windows, `npx` is a .cmd shim (not a real binary) — spawn() can't resolve it
      // without going through the shell. Real binaries (node, dotnet, ruff, python) work
      // either way, so enabling shell on Windows is a strict superset.
      shell: process.platform === "win32",
    });

    let output = "";
    let errorOutput = "";

    child.stdout?.on("data", (data: Buffer) => {
      output += data.toString();
    });

    child.stderr?.on("data", (data: Buffer) => {
      errorOutput += data.toString();
    });

    child.on("close", (code) => {
      resolve({code: code ?? 1, output: output + errorOutput});
    });

    child.on("error", (error) => {
      resolve({code: 1, output: error.message});
    });
  });
}

/**
 * Checks whether a CLI tool exists on PATH by attempting `<tool> --version`.
 * @param cmd The tool name (e.g. "ruff", "dotnet")
 * @returns true if the tool exited with code 0
 */
async function isToolAvailable(cmd: string): Promise<boolean> {
  const result = await runCommand(cmd, ["--version"]);
  return result.code === 0;
}

/**
 * Resolves how to invoke ruff. Returns the command + args prefix, or `null`
 * if ruff is not available at all.
 *
 * Probe order:
 *   1. `ruff` on PATH (standard install via pipx, system pip, or PATH-aware install).
 *   2. `python -m ruff` (fallback for Microsoft Store Python or other sandboxed installs
 *      where pip places ruff outside PATH but Python itself is reachable).
 *
 * Cached at module scope; valid for the lifetime of this worker process.
 * Mirrors format.worker.ts (Phase 1).
 */
let cachedRuffInvocation: readonly string[] | null | undefined;

async function resolveRuff(): Promise<readonly string[] | null> {
  if (cachedRuffInvocation !== undefined) return cachedRuffInvocation;

  if (await isToolAvailable("ruff")) {
    cachedRuffInvocation = ["ruff"];
    return cachedRuffInvocation;
  }

  if (await isToolAvailable("python")) {
    const r = await runCommand("python", ["-m", "ruff", "--version"]);
    if (r.code === 0) {
      cachedRuffInvocation = ["python", "-m", "ruff"];
      return cachedRuffInvocation;
    }
  }

  cachedRuffInvocation = null;
  return cachedRuffInvocation;
}

// ---------------------------------------------------------------------------
// ESLint helper
// ---------------------------------------------------------------------------

interface ESLintData {
  readonly errorCount: number;
  readonly warningCount: number;
  readonly fileCount: number;
  readonly slowestFiles: ESLintFileStats[];
}

/**
 * Sanitizes a config name for use as a cache filename.
 * @param configName - The ESLint config name (e.g., "[@arolariu/packages]")
 * @returns Sanitized name safe for filesystem (e.g., "arolariu-packages")
 */
function sanitizeConfigName(configName: string): string {
  return configName
    .replace(/^\[@/, "")
    .replace(/\]$/, "")
    .replaceAll("/", "-")
    .replaceAll(/[^a-zA-Z0-9-]/g, "");
}

/**
 * Runs ESLint via the Node API for the given target's config.
 * Reuses the existing per-config cache strategy.
 */
async function runESLint(input: LintWorkerInput): Promise<{code: number; output: string; data: ESLintData}> {
  const {configName, filePatterns: inputPatterns} = input;

  // Dynamically import the eslint config in this worker thread
  const {default: eslintConfig} = await import("../../eslint.config.ts");

  // Find the config by name
  const config = eslintConfig.find((cfg: {name?: string}) => cfg.name === configName);

  if (!config) {
    return {
      code: 1,
      output: `Config not found: ${configName}`,
      data: {errorCount: 1, warningCount: 0, fileCount: 0, slowestFiles: []},
    };
  }

  // Create per-config cache filename to prevent race conditions
  const sanitizedName = sanitizeConfigName(configName);
  const cacheLocation = `${CACHE_DIR}/.eslintcache-${sanitizedName}`;

  // Create ESLint instance with the config
  const eslint = new ESLint({
    baseConfig: config,
    cache: true,
    cacheLocation,
    cacheStrategy: "content",
    errorOnUnmatchedPattern: false,
    stats: true,
  });

  // Use input patterns if provided (selective targeting), otherwise use config patterns
  let filePatterns: string[];
  if (inputPatterns && inputPatterns.length > 0) {
    filePatterns = [...inputPatterns];
  } else {
    const rawPatterns = Array.isArray(config.files) ? config.files : [config.files];
    filePatterns = rawPatterns.filter((p: unknown): p is string => typeof p === "string");
  }

  // Run ESLint analysis
  const results = await eslint.lintFiles(filePatterns);

  // Extract per-file timing from stats (if available)
  const fileStats: ESLintFileStats[] = [];
  for (const result of results) {
    const stats = result.stats as {fixPasses?: number; times?: {passes: Array<{total: number}>}} | undefined;
    const lintTimeMs = stats?.times?.passes?.[0]?.total ?? 0;
    fileStats.push({filePath: result.filePath, lintTimeMs});
  }

  // Sort by lint time descending and take top N slowest
  const slowestFiles = fileStats.sort((a, b) => b.lintTimeMs - a.lintTimeMs).slice(0, TOP_SLOWEST_FILES);

  // Load formatter and format results
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = await formatter.format(results);

  // Aggregate counts
  const errorCount = results.reduce((sum, res) => sum + res.errorCount, 0);
  const warningCount = results.reduce((sum, res) => sum + res.warningCount, 0);

  return {
    code: errorCount > 0 ? 1 : 0,
    output: resultText || "",
    data: {errorCount, warningCount, fileCount: results.length, slowestFiles},
  };
}

// ---------------------------------------------------------------------------
// Symmetric step abstraction
// ---------------------------------------------------------------------------

interface LintStep {
  readonly label: string;
  readonly run: () => Promise<{code: number; output: string; data?: ESLintData}>;
}

interface LintStepResult {
  readonly label: string;
  readonly code: number;
  readonly output: string;
  readonly durationMs: number;
  readonly data?: ESLintData;
}

async function runStep(step: LintStep): Promise<LintStepResult> {
  const start = performance.now();
  const {code, output, data} = await step.run();
  return {label: step.label, code, output, durationMs: Math.round(performance.now() - start), data};
}

/** Maps each target to its working directory for child-process spawns. */
function dirFor(target: LintTarget): string {
  switch (target) {
    case "cv": return "sites/cv.arolariu.ro";
    case "status": return "sites/status.arolariu.ro";
    default: return ".";
  }
}

/**
 * Returns the ordered list of steps for a given lint target.
 * Single-tool targets get 1 step; dual-tool targets (cv/status/api) get 2 steps.
 */
export function stepsForTarget(input: LintWorkerInput): readonly LintStep[] {
  const {target} = input;

  switch (target) {
    case "packages":
    case "website":
      return [
        {label: "eslint", run: () => runESLint(input)},
      ];

    case "cv":
    case "status":
      return [
        {
          label: "svelte-check",
          run: async () => {
            // SvelteKit type generation must run first or svelte-check flags every $app/* import.
            const sync = await runCommand("npx", ["svelte-kit", "sync"], {cwd: dirFor(target)});
            if (sync.code !== 0) return sync;
            return runCommand("npx", ["svelte-check", "--tsconfig", "./tsconfig.json"], {cwd: dirFor(target)});
          },
        },
        {label: "eslint", run: () => runESLint(input)},
      ];

    case "api":
      return [
        {label: "dotnet format", run: () => runCommand("dotnet", ["format", "arolariu.slnx", "--verify-no-changes", "--verbosity", "quiet"])},
        // --no-restore: dotnet format (step 1) already restored packages; skipping the redundant restore saves ~15-30s.
        {label: "dotnet build", run: () => runCommand("dotnet", ["build", "arolariu.slnx", "--no-restore", "--verbosity", "quiet"])},
      ];

    case "exp":
      return [
        {
          label: "ruff check",
          run: async () => {
            const ruff = await resolveRuff();
            if (!ruff) return {code: 1, output: "Ruff not found (tried 'ruff' and 'python -m ruff')"};
            const [cmd, ...prefix] = ruff as string[];
            return runCommand(cmd!, [...prefix, "check", "sites/exp.arolariu.ro"]);
          },
        },
      ];
  }
}

// ---------------------------------------------------------------------------
// Result builders
// ---------------------------------------------------------------------------

function buildSkippedResult(args: {
  target: LintTarget;
  configName: string;
  workerId: number;
  startTime: number;
  peakMemoryBytes: number;
  reason: string;
}): LintWorkerResult {
  return {
    configName: args.configName,
    errorCount: 0,
    warningCount: 0,
    resultText: `  ⊘ ${args.target} skipped: ${args.reason}\n`,
    skipped: true,
    skipReason: args.reason,
    workerId: args.workerId,
    durationMs: Math.round(performance.now() - args.startTime),
    workTimeMs: 0,
    initTimeMs: 0,
    fileCount: 0,
    peakMemoryBytes: args.peakMemoryBytes,
    slowestFiles: [],
  };
}

function aggregateResults(args: {
  target: LintTarget;
  configName: string;
  workerId: number;
  startTime: number;
  peakMemoryBytes: number;
  results: LintStepResult[];
}): LintWorkerResult {
  const {configName, workerId, startTime, peakMemoryBytes, results} = args;
  const failed = results.find((r) => r.code !== 0);

  // Prefer ESLint's structured counts when present in any step's data.
  const eslintData = results.find((r) => r.data !== undefined)?.data;
  const errorCount = failed ? Math.max(1, eslintData?.errorCount ?? 0) : (eslintData?.errorCount ?? 0);
  const warningCount = eslintData?.warningCount ?? 0;
  const fileCount = eslintData?.fileCount ?? 0;
  const slowestFiles = eslintData?.slowestFiles ?? [];

  const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0);
  const resultText = results
    .map((r) => `▸ ${r.label} (${r.durationMs}ms)${r.code !== 0 ? " — FAILED" : ""}\n${r.output}`)
    .join("\n");

  return {
    configName,
    errorCount,
    warningCount,
    resultText,
    workerId,
    durationMs: Math.round(performance.now() - startTime),
    workTimeMs: totalDurationMs,
    initTimeMs: 0,
    fileCount,
    peakMemoryBytes,
    slowestFiles,
    failedStep: failed?.label,
  };
}

// ---------------------------------------------------------------------------
// Worker entrypoint
// ---------------------------------------------------------------------------

/**
 * Lint worker entry point for Piscina.
 *
 * @remarks
 * Dispatches per-target steps, runs them fail-fast, and returns a serializable
 * result with aggregated counts, timing, and memory data.
 *
 * @param input - The worker input containing the target to lint
 * @returns The worker result with buffered output
 */
export default async function lintWorker(input: LintWorkerInput): Promise<LintWorkerResult> {
  const {target, configName} = input;
  const startTime = performance.now();
  const workerId = threadId;

  // Track peak memory usage
  let peakMemoryBytes = process.memoryUsage().heapUsed;
  const trackMemory = (): void => {
    const current = process.memoryUsage().heapUsed;
    if (current > peakMemoryBytes) peakMemoryBytes = current;
  };

  // Tool-availability gate for external-tool targets.
  if (target === "api") {
    if (!(await isToolAvailable("dotnet"))) {
      return buildSkippedResult({
        target,
        configName,
        workerId,
        startTime,
        peakMemoryBytes,
        reason: "dotnet CLI not installed. Install the .NET SDK from https://dot.net/.",
      });
    }
  }

  if (target === "exp") {
    const ruff = await resolveRuff();
    if (!ruff) {
      return buildSkippedResult({
        target,
        configName,
        workerId,
        startTime,
        peakMemoryBytes,
        reason: "Ruff not installed. Install via 'pipx install ruff' (recommended), or 'pip install ruff' if Python+pip is configured for PATH access.",
      });
    }
  }

  try {
    const steps = stepsForTarget(input);
    const results: LintStepResult[] = [];

    for (const step of steps) {
      const r = await runStep(step);
      trackMemory();
      results.push(r);
      if (r.code !== 0) break; // fail-fast
    }

    return aggregateResults({
      target,
      configName,
      workerId,
      startTime,
      peakMemoryBytes,
      results,
    });
  } catch (error) {
    trackMemory();
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      configName,
      errorCount: 1,
      warningCount: 0,
      resultText: "",
      error: errorMessage,
      workerId,
      durationMs: Math.round(performance.now() - startTime),
      workTimeMs: 0,
      initTimeMs: 0,
      fileCount: 0,
      peakMemoryBytes,
      slowestFiles: [],
    };
  }
}
