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
 * node --experimental-strip-types scripts/doctor.ts --verbose
 * node --experimental-strip-types scripts/doctor.ts --quick
 * node --experimental-strip-types scripts/doctor.ts --help
 * ```
 */

import {resolve} from "node:path";
import {fileURLToPath} from "node:url";

import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "./common/logger.ts";
import {loadRepositoryRequirements, type RequirementLoadResult} from "./common/requirements.ts";
import {defaultCommandRunner} from "./common/process.ts";
import {resolveRepositoryPaths, type RepositoryPaths} from "./common/repository-paths.ts";
import {normalizeErrorForReport, diagnosticResult} from "./doctor.diagnostics.ts";
import {renderDoctorReport, createDoctorReport} from "./doctor.reporter.ts";
import {createInspectionProbeRunner, type InspectionProbeRunner} from "./inspection/probes.ts";
import {createRepositoryInspectionSession, type RepositoryInspectionSession} from "./inspection/repository.ts";
import {dotnetDoctorModule} from "./doctor.dotnet.ts";
import {infrastructureDoctorModule} from "./doctor.infrastructure.ts";
import {pythonDoctorModule} from "./doctor.python.ts";
import {reactDoctorModule} from "./doctor.react.ts";
import {svelteDoctorModule} from "./doctor.svelte.ts";
import {workspaceDoctorModule} from "./doctor.workspace.ts";
import type {
  DiagnosticModule,
  DiagnosticNetworkProbe,
  DiagnosticNetworkResult,
  DiagnosticResult,
  DoctorContext,
  DoctorReport,
  DoctorRunOptions,
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
  /** Executes bounded read-only network reachability probes. */
  readonly network: DiagnosticNetworkProbe;
  /** Receives doctor presentation and semantic output. */
  readonly logger: MonorepositoryLogger;
  /**
   * Receives exactly one fatal error when context assembly or report
   * validation prevents any report from being produced.
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
  /** Pre-created inspection session; when supplied, doctor reuses it instead of creating one. */
  readonly inspection: RepositoryInspectionSession;
  /** Factory for creating an inspection session; defaults to {@link createRepositoryInspectionSession}. */
  readonly createInspectionSession: typeof createRepositoryInspectionSession;
  /** Opaque inspection probe runner; defaults to one created from {@link defaultCommandRunner}. */
  readonly probes: InspectionProbeRunner;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
 * value is normalized through {@link normalizeErrorForReport} before it becomes
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
async function runDoctorModule(module: Readonly<DiagnosticModule>, context: Readonly<DoctorContext>): Promise<readonly DiagnosticResult[]> {
  const startedAt = context.now();
  try {
    return await module.run(context);
  } catch (error: unknown) {
    const evidence = normalizeErrorForReport(error, `The ${module.title} diagnostic module threw an error without a usable message.`);
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
export function parseDoctorOptions(argv: readonly string[]): DoctorRunOptions {
  let verbose = false;
  let quick = false;

  for (const argument of argv) {
    switch (argument) {
      case "--verbose":
      case "-v":
      case "/v":
        verbose = true;
        break;
      case "--quick":
      case "/q":
        quick = true;
        break;
      default:
        throw new Error(`Unknown doctor option '${String(argument)}'.`);
    }
  }

  return {verbose, quick};
}

/**
 * Runs every doctor module against a shared read-only diagnostic context and
 * returns the validated, scored report.
 *
 * @remarks
 * Every module always receives the full parsed options and is responsible
 * for emitting its own explicit skipped diagnostics. Modules run
 * independently and concurrently; `Promise.all` preserves the fixed
 * `doctorModules` order in the flattened result regardless of which module
 * settles first. Duplicate or malformed diagnostic ids are rejected by
 * {@link createDoctorReport}, the sole authority for report schema and
 * semantic validation.
 *
 * When `dependencies.inspection` is supplied, that exact session is reused
 * instead of creating a new one; this is the integration path for status.
 *
 * @param options - Parsed doctor run options.
 * @param dependencies - Optional boundary replacements, primarily for tests
 * that must inject deterministic modules, repository context, or a fixed
 * timestamp without reading the live checkout or a real network.
 * @returns The validated, scored doctor report.
 */
export async function runDoctor(
  options: Readonly<DoctorRunOptions>,
  dependencies: Readonly<Partial<DoctorDependencies>> = {},
): Promise<DoctorReport> {
  const now = dependencies.now ?? ((): number => performance.now());
  const timestamp = dependencies.timestamp ?? ((): string => new Date().toISOString());
  const resolvePaths = dependencies.resolveRepositoryPaths ?? ((): RepositoryPaths => resolveRepositoryPaths());
  const loadRequirements = dependencies.loadRepositoryRequirements ?? loadRepositoryRequirements;
  const network = dependencies.network ?? createBoundedNetworkProbe(now);
  const logger = dependencies.logger ?? new MonorepositoryConsoleLogger("doctor", {verbose: options.verbose});
  const modules = dependencies.modules ?? doctorModules;
  const platform = dependencies.platform ?? process.platform;
  const arch = dependencies.arch ?? process.arch;
  const env = dependencies.env ?? process.env;

  const paths = resolvePaths();
  const requirements = await loadRequirements(paths);

  const inspection =
    dependencies.inspection
    ?? (dependencies.createInspectionSession ?? createRepositoryInspectionSession)({
      profile: options.quick ? "quick" : "full",
      paths,
      runner: defaultCommandRunner,
      env,
      platform,
      now,
    });

  const probes = dependencies.probes ?? createInspectionProbeRunner(defaultCommandRunner);

  // Prewarm aggregate collection in full mode only: firing-and-forgetting starts the isolated
  // worker process once so its memoized result is ready by the time the infrastructure module
  // consumes it, without blocking module startup. Quick mode never starts the worker.
  if (!options.quick) {
    void inspection.inspect("aggregate");
  }

  const context: DoctorContext = {
    options,
    paths,
    requirements,
    network,
    logger,
    platform,
    arch,
    env,
    now,
    inspection,
    probes,
  };

  const settledResults = await Promise.all(modules.map((module) => runDoctorModule(module, context)));
  const checks = settledResults.flat();

  return createDoctorReport(checks, timestamp(), {verbose: options.verbose});
}

const HELP_LINES: readonly string[] = [
  "Usage: node --experimental-strip-types scripts/doctor.ts [options]",
  "",
  "Options:",
  "  --verbose, -v, /v   Show diagnostic evidence for every check.",
  "  --quick, /q         Skip slower and network-dependent checks.",
  "  --help, -h, /h, /?  Show this help message.",
];

/**
 * Runs the doctor CLI entrypoint.
 *
 * @remarks
 * Help aliases (`--help`, `-h`, `/h`, `/?`) are detected before options are
 * parsed or any repository or module work runs, so an unsupported flag
 * combined with help never surfaces a parse error. Removed flags (`--ci`,
 * `--json`, `--score`) are hard errors routed through normal CLI error
 * presentation, each returning 1.
 *
 * Score and grade are always rendered. Doctor has no machine JSON output
 * after this task.
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
  if (argv.includes("--help") || argv.includes("-h") || argv.includes("/h") || argv.includes("/?")) {
    const logger = dependencies.logger ?? new MonorepositoryConsoleLogger("doctor", {verbose: false});
    logger.banner(["arolariu.ro workspace doctor"]);
    for (const line of HELP_LINES) {
      logger.line(line);
    }
    return 0;
  }

  let options: DoctorRunOptions;
  try {
    options = parseDoctorOptions(argv);
  } catch (error: unknown) {
    const logger = dependencies.logger ?? new MonorepositoryConsoleLogger("doctor", {verbose: false});
    logger.error(errorMessage(error));
    return 1;
  }

  const logger = dependencies.logger ?? new MonorepositoryConsoleLogger("doctor", {verbose: options.verbose});
  const errorLogger = dependencies.errorLogger ?? logger;

  let report: DoctorReport;
  try {
    report = await runDoctor(options, {...dependencies, logger});
  } catch (error: unknown) {
    errorLogger.error(
      normalizeErrorForReport(
        error,
        "Doctor failed to produce a report because context assembly or report validation failed unexpectedly.",
      ),
    );
    return 1;
  }

  renderDoctorReport(report, options, logger);
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
