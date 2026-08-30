/**
 * @fileoverview Modular workspace health diagnostics orchestrator for the arolariu.ro monorepo.
 * @module scripts/doctor
 *
 * @remarks
 * Resolves the shared read-only diagnostic context once, then runs every
 * bounded-context doctor module — `workspace`, `dotnet`, `react`, `svelte`,
 * `python`, and `infrastructure` — independently and concurrently. Module
 * results are flattened back into that fixed order regardless of which
 * module finishes first, an unhandled module exception is normalized into a
 * single failed `<module>.module-error` row without stopping its siblings,
 * and the collected checks are validated and scored by
 * {@link createDoctorReport}.
 *
 * The script never mutates the repository, never inherits child process
 * output, and never writes directly to the console: every human or
 * machine-readable line is produced by {@link MonorepositoryLogger} or
 * {@link renderDoctorReport}. It exits `0` when the report has no failed
 * checks and `1` otherwise.
 *
 * @example
 * ```bash
 * node --experimental-strip-types scripts/doctor.ts
 * node --experimental-strip-types scripts/doctor.ts --verbose --score
 * node --experimental-strip-types scripts/doctor.ts --ci --json
 * ```
 */

import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {stripVTControlCharacters} from "node:util";

import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "./common/logger.ts";
import {loadRepositoryRequirements, type RequirementLoadResult} from "./common/requirements.ts";
import {resolveRepositoryPaths, type RepositoryPaths} from "./common/repository-paths.ts";
import {renderDoctorReport, createDoctorReport} from "./doctor.reporter.ts";
import {defaultDiagnosticRunner, diagnosticResult} from "./doctor.types.ts";
import {dotnetDoctorModule} from "./doctor.dotnet.ts";
import {infrastructureDoctorModule} from "./doctor.infrastructure.ts";
import {pythonDoctorModule} from "./doctor.python.ts";
import {reactDoctorModule} from "./doctor.react.ts";
import {svelteDoctorModule} from "./doctor.svelte.ts";
import {workspaceDoctorModule} from "./doctor.workspace.ts";
import type {
  DiagnosticCommandRunner,
  DiagnosticModule,
  DiagnosticNetworkProbe,
  DiagnosticNetworkResult,
  DiagnosticResult,
  DoctorContext,
  DoctorOptions,
  DoctorReportV1,
} from "./doctor.types.ts";

/** Every doctor diagnostic module in the exact order `runDoctor` executes and reports them. */
export const doctorModules: readonly DiagnosticModule[] = [
  workspaceDoctorModule,
  dotnetDoctorModule,
  reactDoctorModule,
  svelteDoctorModule,
  pythonDoctorModule,
  infrastructureDoctorModule,
];

/**
 * Boundary values {@link runDoctor} needs to resolve repository context and
 * execute every module.
 *
 * @remarks
 * Exported so tests can inject fake modules and deterministic boundaries
 * without replacing the repository modules that own path discovery,
 * manifest loading, command execution, network probing, or logging.
 */
export interface DoctorDependencies {
  /** Ordered modules to execute; defaults to {@link doctorModules}. */
  readonly modules: readonly DiagnosticModule[];
  /** Resolves canonical repository paths. */
  readonly resolveRepositoryPaths: () => RepositoryPaths;
  /** Loads manifest-derived repository requirements, including an invalid/drift result. */
  readonly loadRepositoryRequirements: (paths: RepositoryPaths) => Promise<RequirementLoadResult>;
  /** Executes read-only diagnostic commands. */
  readonly runner: DiagnosticCommandRunner;
  /** Executes bounded read-only network reachability probes. */
  readonly network: DiagnosticNetworkProbe;
  /** Receives doctor presentation and semantic output. */
  readonly logger: MonorepositoryLogger;
  /**
   * Receives exactly one fatal error when context assembly or report
   * validation prevents any report from being produced.
   *
   * @remarks
   * In JSON mode the primary {@link logger}'s semantic methods (including
   * `error`) are intentionally suppressed so only {@link MonorepositoryLogger.json}
   * reaches stdout; this dependency is the only sink guaranteed to still
   * surface a fatal failure. It defaults to a fresh human-mode
   * {@link MonorepositoryConsoleLogger} in JSON mode, and to the primary
   * `logger` itself in human mode, where semantic output already reaches
   * stderr.
   */
  readonly errorLogger: MonorepositoryLogger;
  /** Target runtime platform. */
  readonly platform: NodeJS.Platform;
  /** Target runtime architecture. */
  readonly arch: string;
  /** Process environment made available to modules. */
  readonly env: Readonly<NodeJS.ProcessEnv>;
  /** Monotonic time source used for module and check durations. */
  readonly now: () => number;
  /** Produces the ISO-8601 timestamp recorded on the completed report. */
  readonly timestamp: () => string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Extracts a raw, unnormalized message from an arbitrary thrown value.
 *
 * @remarks
 * Understands a native {@link Error} and a safe error-shaped object (a
 * non-array object exposing a string `message` property) through the
 * repository's established {@link isRecord} narrowing convention, without an
 * unsafe type cast. Every other thrown value — a string, a number, `null`,
 * `undefined`, or a plain object without a string `message` — falls back to
 * its string coercion.
 *
 * @param error - The unknown thrown value.
 * @returns The best-effort raw message before ANSI stripping and trimming.
 */
function extractThrownMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (isRecord(error) && typeof error["message"] === "string") {
    return error["message"];
  }
  return String(error);
}

/**
 * Reports whether an already-normalized message is usable as report text.
 *
 * @param value - A message already stripped of ANSI/VT sequences and trimmed.
 * @returns Whether the value is non-empty and not a stringification artifact.
 */
function isUsableErrorText(value: string): boolean {
  return value.length > 0 && value !== "[object Object]" && value !== "null" && value !== "undefined";
}

/**
 * Normalizes an arbitrary thrown value into non-empty, report-safe text.
 *
 * @remarks
 * The doctor reporter rejects an empty, whitespace-only, or ANSI-bearing
 * string in evidence and fatal error text, so an unnormalized module crash
 * or fatal failure message would otherwise abort the entire report instead
 * of producing the single failed row or fatal error it is meant to
 * describe. ANSI/VT control sequences are stripped with the Node.js
 * built-in {@link stripVTControlCharacters}, then the result is trimmed; an
 * empty, whitespace-only, or otherwise unhelpful message falls back to
 * `fallbackMessage`, which callers supply as a stable, non-empty,
 * context-specific default.
 *
 * @param error - The unknown thrown value.
 * @param fallbackMessage - A stable, non-empty fallback for an unhelpful message.
 * @returns Non-empty, ANSI-free, report-safe text.
 */
function normalizeErrorText(error: unknown, fallbackMessage: string): string {
  const normalized = stripVTControlCharacters(extractThrownMessage(error)).trim();
  return isUsableErrorText(normalized) ? normalized : fallbackMessage;
}

/**
 * Classifies one bounded network probe failure.
 *
 * @remarks
 * A request that is cancelled by {@link AbortSignal.timeout} surfaces as a
 * `DOMException` named `TimeoutError`; a request that never reaches a server
 * (DNS failure, refused connection, TLS failure) surfaces as a `TypeError`
 * from the underlying `fetch` implementation. Both are classified as
 * `unavailable` — a network condition the caller can recover from — while
 * every other failure is classified as `error` so it is never mistaken for
 * an ordinary connectivity gap.
 *
 * @param error - The error thrown by `fetch`.
 * @param timeoutMs - The bounded timeout applied to the request.
 * @returns The classified status and human-readable error detail.
 */
function classifyNetworkFailure(error: unknown, timeoutMs: number): Pick<DiagnosticNetworkResult, "status" | "error"> {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return {status: "unavailable", error: `Network probe timed out after ${String(timeoutMs)}ms.`};
  }

  if (error instanceof TypeError) {
    return {status: "unavailable", error: `Network probe could not reach the target: ${errorMessage(error)}`};
  }

  return {status: "error", error: `Network probe failed unexpectedly: ${errorMessage(error)}`};
}

/**
 * Creates the production bounded read-only network reachability probe.
 *
 * @remarks
 * Every request is bounded by {@link AbortSignal.timeout}, never follows a
 * caller-supplied body, and captures the response body only for a reachable
 * response so callers can validate its shape. This probe never throws: every
 * outcome — reachable, unavailable, or an unexpected error — is returned as
 * a classified {@link DiagnosticNetworkResult}.
 *
 * @param now - Monotonic time source used to capture probe duration.
 * @returns A bounded, read-only network probe.
 */
export function createBoundedNetworkProbe(now: () => number): DiagnosticNetworkProbe {
  return {
    async get(url: URL, timeoutMs: number): Promise<DiagnosticNetworkResult> {
      const startedAt = now();
      try {
        const response = await fetch(url, {signal: AbortSignal.timeout(timeoutMs)});
        const body = await response.text();
        return {
          status: "reachable",
          statusCode: response.status,
          durationMs: Math.max(0, now() - startedAt),
          body,
        };
      } catch (error: unknown) {
        return {
          ...classifyNetworkFailure(error, timeoutMs),
          durationMs: Math.max(0, now() - startedAt),
        };
      }
    },
  };
}

/**
 * Runs one doctor module and normalizes an unhandled exception.
 *
 * @remarks
 * A module exception never becomes a passing or skipped result: it is
 * replaced with exactly one failed `<module>.module-error` row. The thrown
 * value is normalized through {@link normalizeErrorText} before it becomes
 * evidence — an empty, whitespace-only, or ANSI-bearing message would
 * otherwise be rejected by the doctor reporter's semantic validation and
 * abort the entire report (siblings included) instead of degrading to one
 * failed row, so a crashed module is scored as a complete module loss
 * rather than silently shrinking the report.
 *
 * @param module - The diagnostic module to execute.
 * @param context - The shared read-only diagnostic context.
 * @returns The module's own results, or one normalized failure row.
 */
async function runDoctorModule(
  module: Readonly<DiagnosticModule>,
  context: Readonly<DoctorContext>,
): Promise<readonly DiagnosticResult[]> {
  const startedAt = context.now();
  try {
    return await module.run(context);
  } catch (error: unknown) {
    const evidence = normalizeErrorText(error, `The ${module.title} diagnostic module threw an error without a usable message.`);
    return [
      diagnosticResult(
        {
          id: `${module.id}.module-error`,
          module: module.id,
          name: `${module.title} module error`,
          status: "fail",
          summary: `The ${module.title} diagnostic module failed unexpectedly and could not complete its checks.`,
          evidence: [evidence],
          rootCause: `An unhandled exception was thrown while running the ${module.title} diagnostic module.`,
          potentialCauses: [],
          fixes: [{description: `Investigate the ${module.title} module failure captured in evidence, then rerun doctor.`}],
        },
        startedAt,
        context.now,
      ),
    ];
  }
}

/**
 * Parses doctor command-line options.
 *
 * @param argv - Arguments following the doctor entrypoint.
 * @returns Strict doctor options consumed by the orchestrator.
 * @throws When an argument is not a supported doctor option.
 */
export function parseDoctorOptions(argv: readonly string[]): DoctorOptions {
  let verbose = false;
  let ci = false;
  let score = false;
  let json = false;
  let quick = false;
  let help = false;

  for (const argument of argv) {
    switch (argument) {
      case "--verbose":
      case "-v":
        verbose = true;
        break;
      case "--ci":
        ci = true;
        break;
      case "--score":
        score = true;
        break;
      case "--json":
        json = true;
        break;
      case "--quick":
        quick = true;
        break;
      case "--help":
      case "-h":
        help = true;
        break;
      default:
        throw new Error(`Unknown doctor option '${String(argument)}'.`);
    }
  }

  return {verbose, ci, score, json, quick, help};
}

/**
 * Runs every doctor module against a shared read-only diagnostic context and
 * returns the validated, scored report.
 *
 * @remarks
 * `--quick`, `--ci`, and `--json` never suppress module invocation here:
 * every module always receives the full parsed options and is responsible
 * for emitting its own explicit skipped diagnostics. Modules run
 * independently and concurrently; `Promise.all` preserves the fixed
 * `doctorModules` order in the flattened result regardless of which module
 * settles first. Duplicate or malformed diagnostic ids are rejected by
 * {@link createDoctorReport}, the sole authority for report schema and
 * semantic validation.
 *
 * @param options - Parsed doctor CLI options.
 * @param dependencies - Optional boundary replacements, primarily for tests
 * that must inject deterministic modules, repository context, or a fixed
 * timestamp without reading the live checkout or a real network.
 * @returns The validated, scored doctor report.
 */
export async function runDoctor(
  options: Readonly<DoctorOptions>,
  dependencies: Readonly<Partial<DoctorDependencies>> = {},
): Promise<DoctorReportV1> {
  const now = dependencies.now ?? ((): number => performance.now());
  const timestamp = dependencies.timestamp ?? ((): string => new Date().toISOString());
  const resolvePaths = dependencies.resolveRepositoryPaths ?? ((): RepositoryPaths => resolveRepositoryPaths());
  const loadRequirements = dependencies.loadRepositoryRequirements ?? loadRepositoryRequirements;
  const runner = dependencies.runner ?? defaultDiagnosticRunner;
  const network = dependencies.network ?? createBoundedNetworkProbe(now);
  const logger =
    dependencies.logger ?? new MonorepositoryConsoleLogger("doctor", {mode: options.json ? "json" : "human", verbose: options.verbose});
  const modules = dependencies.modules ?? doctorModules;
  const platform = dependencies.platform ?? process.platform;
  const arch = dependencies.arch ?? process.arch;
  const env = dependencies.env ?? process.env;

  const paths = resolvePaths();
  const requirements = await loadRequirements(paths);

  const context: DoctorContext = {
    options,
    paths,
    requirements,
    runner,
    network,
    logger,
    platform,
    arch,
    env,
    now,
  };

  const settledResults = await Promise.all(modules.map((module) => runDoctorModule(module, context)));
  const checks = settledResults.flat();

  return createDoctorReport(checks, timestamp());
}

const HELP_LINES: readonly string[] = [
  "Usage: node scripts/doctor.ts [options]",
  "",
  "Options:",
  "  --verbose, -v   Show diagnostic evidence for every check.",
  "  --ci            Run in continuous-integration mode.",
  "  --score         Render the aggregate health score.",
  "  --json          Emit a single machine-readable JSON report.",
  "  --quick         Skip slower and network-dependent checks.",
  "  --help, -h      Show this help message.",
];

/**
 * Runs the doctor CLI entrypoint.
 *
 * @remarks
 * `--help`/`-h` is detected before options are parsed or any repository or
 * module work runs, so an unsupported flag combined with `--help` never
 * surfaces a parse error. An option-parsing failure renders through the
 * logger and returns `1` without touching repository context. On a
 * successful run, JSON mode emits exactly one document through
 * {@link MonorepositoryLogger.json} and never calls
 * {@link renderDoctorReport}; human mode calls {@link renderDoctorReport}
 * exactly once. The process exits `0` when the report has no failed checks
 * and `1` otherwise.
 *
 * When context assembly (repository paths, requirements) or report
 * validation (schema/semantic checks in {@link createDoctorReport}) throws
 * after options are parsed, no partial or success-shaped report is ever
 * synthesized: the run returns `1`, no document reaches
 * {@link MonorepositoryLogger.json}, and exactly one normalized, non-empty
 * fatal error is written through {@link DoctorDependencies.errorLogger} —
 * never through the primary `logger`, whose semantic methods (including
 * `error`) are silently suppressed in JSON mode.
 *
 * @param argv - Arguments following the doctor entrypoint.
 * @param dependencies - Optional boundary replacements, primarily for tests
 * that must inject a deterministic logger, modules, or repository seam
 * without reading the live checkout.
 * @returns Process exit code.
 */
export async function main(
  argv: readonly string[] = process.argv.slice(2),
  dependencies: Readonly<Partial<DoctorDependencies>> = {},
): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    const logger = dependencies.logger ?? new MonorepositoryConsoleLogger("doctor", {verbose: false});
    logger.banner(["arolariu.ro workspace doctor"]);
    for (const line of HELP_LINES) {
      logger.line(line);
    }
    return 0;
  }

  let options: DoctorOptions;
  try {
    options = parseDoctorOptions(argv);
  } catch (error: unknown) {
    const logger = dependencies.logger ?? new MonorepositoryConsoleLogger("doctor", {verbose: false});
    logger.error(errorMessage(error));
    return 1;
  }

  const logger =
    dependencies.logger ?? new MonorepositoryConsoleLogger("doctor", {mode: options.json ? "json" : "human", verbose: options.verbose});

  // In JSON mode the primary `logger`'s semantic `error` is a no-op, so a fatal
  // failure here must be routed through a logger that always reaches stderr.
  // Human mode's primary logger already reaches stderr, so it may serve both roles.
  const errorLogger = dependencies.errorLogger ?? (options.json ? new MonorepositoryConsoleLogger("doctor", {verbose: false}) : logger);

  let report: DoctorReportV1;
  try {
    report = await runDoctor(options, {...dependencies, logger});
  } catch (error: unknown) {
    errorLogger.error(
      normalizeErrorText(error, "Doctor failed to produce a report because context assembly or report validation failed unexpectedly."),
    );
    return 1;
  }

  if (options.json) {
    logger.json(report);
  } else {
    renderDoctorReport(report, options, logger);
  }

  return report.summary.failed > 0 ? 1 : 0;
}

const doctorEntrypointPath = process.argv[1];
if (doctorEntrypointPath !== undefined && fileURLToPath(import.meta.url) === resolve(doctorEntrypointPath)) {
  main()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      new MonorepositoryConsoleLogger("doctor", {verbose: false}).error(errorMessage(error));
      process.exitCode = 1;
    });
}
