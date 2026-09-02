/**
 * @fileoverview Modular workspace health diagnostics command for the arolariu.ro monorepo.
 * @module scripts/doctor
 *
 * @remarks
 * Doctor is a read-only command: it resolves canonical repository paths and manifest
 * requirements through injected runtime capabilities, obtains exactly one shared repository
 * inspection session from the runtime-owned inspection registry, and then runs every
 * bounded-context module — `workspace`, `dotnet`, `react`, `svelte`, `python`, and
 * `infrastructure` — concurrently through {@link CommandRuntime.tasks}. Module results are
 * flattened back into the fixed {@link doctorModules} order regardless of which module finishes
 * first, an unhandled module exception is normalized into a single failed `<module>.module-error`
 * row without stopping its siblings, and the collected checks are validated and scored by
 * {@link createDoctorReport}.
 *
 * Specialist modules never receive a mutable filesystem, an unrestricted process runner, or an
 * ambient Node global: they observe a {@link ReadOnlyFileSystem}, a `GET`-only bounded network
 * probe, the runtime clock, an immutable environment snapshot, the shared inspection session, and
 * opaque allowlisted probes. The command never mutates the repository, never inherits child
 * process output, and never writes directly to the console: every human line is produced by the
 * runtime logger or {@link renderDoctorReport}. It completes with exit `0` when the report has no
 * failed checks and `1` otherwise.
 *
 * @example
 * ```bash
 * node --experimental-strip-types scripts/doctor.ts
 * node --experimental-strip-types scripts/doctor.ts --verbose
 * node --experimental-strip-types scripts/doctor.ts --quick
 * node --experimental-strip-types scripts/doctor.ts --help
 * ```
 */

import {MonorepoCommand, toJsonValue, type CommandContext, type CommandRuntimeFactory} from "./common/commander.ts";
import {loadRepositoryRequirements} from "./common/requirements.ts";
import {resolveRepositoryPaths, type RepositoryPaths} from "./common/repository-paths.ts";
import {
  asGetOnlyHttpClient,
  asReadOnlyFileSystem,
  HttpError,
  type Clock,
  type CommandRuntime,
  type GetOnlyHttpClient,
  type RepositoryInspectionRequest,
} from "./common/runtime.ts";
import {createNodeRuntimeScope} from "./common/runtime.node.ts";
import {normalizeErrorForReport, diagnosticResult} from "./doctor.diagnostics.ts";
import {renderDoctorReport, createDoctorReport} from "./doctor.reporter.ts";
import {createInspectionProbeRunner, type InspectionProbeRunner} from "./inspection/probes.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
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
  DoctorInput,
  DoctorReport,
} from "./doctor.types.ts";

export type {DoctorInput} from "./doctor.types.ts";

/** Every doctor diagnostic module in the exact order the command executes and reports them. */
export const doctorModules: readonly DiagnosticModule[] = [
  workspaceDoctorModule,
  dotnetDoctorModule,
  reactDoctorModule,
  svelteDoctorModule,
  pythonDoctorModule,
  infrastructureDoctorModule,
];

/** Construction seams {@link createDoctorCommand} accepts. */
export interface DoctorCommandDependencies {
  /** Runtime factory used for every scope; tests inject a fake instead of the Node adapter. */
  readonly runtimeFactory?: CommandRuntimeFactory;
  /** Ordered modules to execute; defaults to {@link doctorModules}. */
  readonly modules?: readonly DiagnosticModule[];
}

/**
 * Boundary replacements the deprecated {@link runDoctor} adapter accepts.
 *
 * @deprecated Removed in Task 12 together with {@link runDoctor}.
 */
export interface DoctorDependencies {
  /** Ordered modules to execute; defaults to {@link doctorModules}. */
  readonly modules: readonly DiagnosticModule[];
  /** Pre-created inspection session reused instead of one obtained from the runtime registry. */
  readonly inspection: RepositoryInspectionSession;
  /** Resolves canonical repository paths; may be synchronous or asynchronous. */
  readonly resolveRepositoryPaths: () => RepositoryPaths | Promise<RepositoryPaths>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isTimeoutFailure(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}

function isUnreachableFailure(error: unknown): boolean {
  return error instanceof TypeError;
}

/**
 * Classifies one bounded network probe failure.
 *
 * @remarks
 * A request cancelled by its own deadline surfaces as a `DOMException` named `TimeoutError`, and
 * a request that never reaches a server (DNS failure, refused connection, TLS failure) surfaces
 * as a `TypeError`. Both are classified as `unavailable` — a network condition the caller can
 * recover from — while every other failure is classified as `error` so it is never mistaken for
 * an ordinary connectivity gap. The {@link GetOnlyHttpClient} normalizes both into a bounded
 * {@link HttpError} that preserves the original failure as its `cause`, so the same
 * classification is applied to the wrapped cause as to a directly thrown platform error.
 *
 * @param error - The error thrown by the `GET`-only HTTP capability.
 * @param timeoutMs - The bounded timeout applied to the request.
 * @returns The classified status and human-readable error detail.
 */
function classifyNetworkFailure(error: unknown, timeoutMs: number): Pick<DiagnosticNetworkResult, "status" | "error"> {
  const cause: unknown = error instanceof HttpError ? error.cause : undefined;

  if (isTimeoutFailure(error) || isTimeoutFailure(cause)) {
    return {status: "unavailable", error: `Network probe timed out after ${String(timeoutMs)}ms.`};
  }

  if (isUnreachableFailure(error) || isUnreachableFailure(cause)) {
    return {status: "unavailable", error: `Network probe could not reach the target: ${errorMessage(error)}`};
  }

  return {status: "error", error: `Network probe failed unexpectedly: ${errorMessage(error)}`};
}

/**
 * Creates the bounded read-only network reachability probe doctor modules observe.
 *
 * @remarks
 * Every request is a `GET` bounded by the caller's timeout, never carries a body, and captures
 * the response text only for a reachable response so callers can validate its shape. This probe
 * never throws: every outcome — reachable, unavailable, or an unexpected error — is returned as a
 * classified {@link DiagnosticNetworkResult}.
 *
 * @param http - `GET`-only HTTP capability owned by the invocation.
 * @param clock - Time source used to capture probe duration.
 * @param signal - Optional invocation cancellation signal linked into every request.
 * @returns A bounded, read-only network probe.
 */
export function createBoundedNetworkProbe(
  http: Readonly<GetOnlyHttpClient>,
  clock: Readonly<Clock>,
  signal?: AbortSignal,
): DiagnosticNetworkProbe {
  return {
    async get(url: URL, timeoutMs: number): Promise<DiagnosticNetworkResult> {
      const startedAt = clock.monotonicNow();
      try {
        const response = await http.get({url, timeoutMs, ...(signal === undefined ? {} : {signal})});
        return {
          status: "reachable",
          statusCode: response.status,
          durationMs: Math.max(0, clock.monotonicNow() - startedAt),
          body: response.text,
        };
      } catch (error: unknown) {
        return {
          ...classifyNetworkFailure(error, timeoutMs),
          durationMs: Math.max(0, clock.monotonicNow() - startedAt),
        };
      }
    },
  };
}

/**
 * Wraps the opaque probe runner so every module probe is linked to invocation cancellation
 * without a specialist module ever handling a signal itself.
 *
 * @param runtime - The invocation's runtime capabilities.
 * @returns A probe runner whose runs abort with the invocation.
 */
function createCancellableProbeRunner(runtime: Readonly<CommandRuntime>): InspectionProbeRunner {
  const probes = createInspectionProbeRunner(runtime.runner);
  return {
    run: (probe, options = {}) => probes.run(probe, {signal: runtime.signal, ...options}),
  };
}

/**
 * Runs one doctor module and normalizes an unhandled exception.
 *
 * @remarks
 * A module exception never becomes a passing or skipped result: it is replaced with exactly one
 * failed `<module>.module-error` row. The thrown value is normalized through
 * {@link normalizeErrorForReport} before it becomes evidence — an empty, whitespace-only, or
 * ANSI-bearing message would otherwise be rejected by the doctor reporter's semantic validation
 * and abort the entire report (siblings included) instead of degrading to one failed row, so a
 * crashed module is scored as a complete module loss rather than silently shrinking the report.
 *
 * @param module - The diagnostic module to execute.
 * @param context - The shared read-only diagnostic context.
 * @returns The module's own results, or one normalized failure row.
 */
async function runDoctorModule(module: Readonly<DiagnosticModule>, context: Readonly<DoctorContext>): Promise<readonly DiagnosticResult[]> {
  const startedAt = context.clock.monotonicNow();
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
        context.clock.monotonicNow,
      ),
    ];
  }
}

/**
 * Identity registry of the exact typed input that produced each report.
 *
 * @remarks
 * Module-private on purpose: it lets the deferred human completion render with the same
 * `--verbose` decision the run used, without widening the published `DoctorReport` contract with
 * presentation state or re-reading argv after parsing.
 */
const reportInputs = new WeakMap<DoctorReport, DoctorInput>();

/** Optional seams the shared doctor business function accepts. */
interface DoctorExecutionSeams {
  /** Ordered modules to execute; defaults to {@link doctorModules}. */
  readonly modules?: readonly DiagnosticModule[];
  /** Repository path resolution override used only by the deprecated compatibility adapter. */
  readonly resolveRepositoryPaths?: () => RepositoryPaths | Promise<RepositoryPaths>;
  /** Pre-created inspection session used only by the deprecated compatibility adapter. */
  readonly inspection?: RepositoryInspectionSession;
}

/**
 * Runs every doctor module against one shared read-only diagnostic context and returns the
 * validated, scored report.
 *
 * @remarks
 * This is the single doctor business function: both the command definition and the deprecated
 * {@link runDoctor} adapter call it, so neither owns an independent orchestration path. Modules
 * always receive the full typed input and are responsible for emitting their own explicit
 * skipped diagnostics. Modules run concurrently through {@link CommandRuntime.tasks}, which
 * preserves the declared module order in the flattened result regardless of which module settles
 * first and cancels with the invocation. Duplicate or malformed diagnostic ids are rejected by
 * {@link createDoctorReport}, the sole authority for report schema and semantic validation.
 *
 * @param context - The invocation context owning every capability this run may use.
 * @param input - Typed doctor input.
 * @param seams - Optional module, path, and session replacements.
 * @returns The validated, scored doctor report.
 */
async function executeDoctor(
  context: Readonly<CommandContext>,
  input: Readonly<DoctorInput>,
  seams: Readonly<DoctorExecutionSeams> = {},
): Promise<DoctorReport> {
  const {runtime} = context;
  const files = asReadOnlyFileSystem(runtime.files);
  const modules = seams.modules ?? doctorModules;

  const paths = await (seams.resolveRepositoryPaths ?? ((): Promise<RepositoryPaths> => resolveRepositoryPaths(import.meta.url, files)))();
  const requirements = await loadRepositoryRequirements(paths, {files, tasks: runtime.tasks});

  const request: RepositoryInspectionRequest = {profile: input.quick ? "quick" : "full", paths};
  const inspection = seams.inspection ?? runtime.inspection.getRepositorySession(request);

  if (!input.quick) {
    // Prewarm aggregate collection in full mode only: starting the isolated worker once here means
    // its memoized result is ready by the time the infrastructure module consumes it, without
    // blocking module startup. Quick mode never starts the worker. The prewarm is deliberately not
    // awaited, so its rejection (for example when the invocation is cancelled) is claimed here and
    // ignored; the real consumer still awaits the same memoized promise and classifies its failure.
    void inspection.inspect("aggregate").catch(() => undefined);
  }

  const doctorContext: DoctorContext = {
    options: input,
    paths,
    requirements,
    network: createBoundedNetworkProbe(asGetOnlyHttpClient(runtime.http), runtime.clock, runtime.signal),
    logger: runtime.logger,
    files,
    clock: runtime.clock,
    environment: runtime.environment,
    inspection,
    probes: createCancellableProbeRunner(runtime),
  };

  const settledResults = await runtime.tasks.parallel(
    modules.map((module) => () => runDoctorModule(module, doctorContext)),
    runtime.signal,
  );

  const report = createDoctorReport(settledResults.flat(), runtime.clock.isoTimestamp(), {verbose: input.verbose});
  reportInputs.set(report, input);
  return report;
}

/**
 * Creates the doctor command.
 *
 * @param dependencies - Optional runtime factory and module list; tests inject deterministic
 * fakes instead of replacing command business code.
 * @returns The typed `doctor` command object.
 */
export function createDoctorCommand(dependencies: Readonly<DoctorCommandDependencies> = {}): MonorepoCommand<DoctorInput, DoctorReport> {
  const {modules} = dependencies;

  return new MonorepoCommand<DoctorInput, DoctorReport>(
    {
      metadata: {
        name: "doctor",
        description: "Runs read-only workspace health diagnostics across every bounded context.",
        slashAliases: {"/v": "--verbose", "/q": "--quick", "/?": "--help"},
        examples: ["npm run doctor", "npm run doctor -- --verbose", "npm run doctor -- --quick"],
      },
      configure: (program) => {
        program
          .option("-v, --verbose", "Show diagnostic evidence for every check.", false)
          .option("--quick", "Skip slower and network-dependent checks.", false);
      },
      decode: (program) => {
        const options = program.opts<{verbose?: boolean; quick?: boolean}>();
        return {verbose: options.verbose === true, quick: options.quick === true};
      },
      execute: (context, input) => executeDoctor(context, input, modules === undefined ? {} : {modules}),
      completion: (report) => ({
        exitCode: report.summary.failed > 0 ? 1 : 0,
        human: (logger) => {
          renderDoctorReport(report, reportInputs.get(report) ?? {quick: false, verbose: false}, logger);
        },
        json: toJsonValue(report),
      }),
    },
    dependencies.runtimeFactory,
  );
}

/** Production singleton used by the aggregate CLI and this module's direct entrypoint. */
export const doctorCommand: MonorepoCommand<DoctorInput, DoctorReport> = createDoctorCommand();

/**
 * Runs doctor from typed options and returns the validated report.
 *
 * @deprecated Removed in Task 12. This thin compatibility adapter exists only because legacy
 * `status.ts` still consumes a typed doctor report directly; it owns no business logic of its
 * own and simply runs {@link executeDoctor} inside one Node runtime scope. Every other caller
 * must use `doctorCommand.invoke()`.
 *
 * @param options - Typed doctor input.
 * @param dependencies - Optional module, repository path, and inspection session replacements.
 * @returns The validated, scored doctor report.
 */
export async function runDoctor(
  options: Readonly<DoctorInput>,
  dependencies: Readonly<Partial<DoctorDependencies>> = {},
): Promise<DoctorReport> {
  const runtime = await createNodeRuntimeScope({
    commandName: "doctor",
    verbose: options.verbose,
    presentation: "silent",
    registerProcessSignals: false,
  });

  try {
    return await executeDoctor({runtime, presentation: "silent"}, options, dependencies);
  } finally {
    await runtime.cleanup.drain();
  }
}

await doctorCommand.runIfMain(import.meta.url);
