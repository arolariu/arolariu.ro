/**
 * @fileoverview Modular workspace health diagnostics for the arolariu.ro monorepo, as an Effect program.
 * @module scripts/commands/doctor/index
 *
 * @remarks
 * Doctor is read-only by construction: {@link runDoctor} requires only the
 * {@link DoctorRequirements} capability profile plus the shared `Inspection` service. It resolves
 * canonical repository paths and manifest requirements through the bridge's legacy read-only views,
 * obtains exactly one shared repository inspection session (`quick` or `full` profile), starts every
 * fact the modules declare (plus `aggregate` in full mode) in the background, and runs every
 * bounded-context module — `workspace`, `dotnet`, `react`, `svelte`, `python`, and
 * `infrastructure` — concurrently. Results are flattened back into the fixed {@link doctorModules}
 * order regardless of which module finishes first; a module defect becomes a single failed
 * `<module>.module-error` row without stopping its siblings, and the collected checks are validated
 * and scored by {@link createDoctorReport}.
 *
 * `status` composes {@link runDoctor} directly as a plain effect over the same `Inspection`
 * service, so both programs of one invocation share every memoized inspection session.
 *
 * @example
 * ```bash
 * node scripts/cli.ts doctor
 * node scripts/cli.ts doctor --verbose
 * node scripts/cli.ts doctor --quick
 * node scripts/cli.ts doctor --json
 * ```
 */

import {DateTime, Effect} from "effect";

import {resolveRepositoryPaths} from "../../common/repository-paths.ts";
import {loadRepositoryRequirements} from "../../common/requirements.ts";
import {Inspection} from "../../inspection/Inspection.ts";
import {inspectionProbeRunner} from "../../inspection/probes.ts";
import type {RepositoryInspectionKey, RepositoryInspectionSession} from "../../inspection/repository.ts";
import {legacyReadOnlyFiles, legacyTaskScheduler} from "../../platform/bridge.ts";
import {diagnosticResult, monotonicNow, normalizeErrorForReport} from "./diagnostics.ts";
import {dotnetDoctorModule} from "./modules/dotnet.ts";
import {infrastructureDoctorModule} from "./modules/infrastructure.ts";
import {pythonDoctorModule} from "./modules/python.ts";
import {reactDoctorModule} from "./modules/react.ts";
import {svelteDoctorModule} from "./modules/svelte.ts";
import {workspaceDoctorModule} from "./modules/workspace.ts";
import {createDoctorReport} from "./reporter.ts";
import type {DiagnosticModule, DiagnosticResult, DoctorContext, DoctorInput, DoctorReport, DoctorRequirements} from "./types.ts";

export type {DoctorInput} from "./types.ts";

/** Every doctor diagnostic module in the exact order the command executes and reports them. */
export const doctorModules: readonly DiagnosticModule[] = [
  workspaceDoctorModule,
  dotnetDoctorModule,
  reactDoctorModule,
  svelteDoctorModule,
  pythonDoctorModule,
  infrastructureDoctorModule,
];

/**
 * Builds the single failed `<module>.module-error` row a module defect is normalized into.
 *
 * @remarks
 * The defect is normalized through {@link normalizeErrorForReport} before it becomes evidence: an
 * empty, whitespace-only, or ANSI-bearing message would otherwise be rejected by the reporter's
 * semantic validation and abort the entire report (siblings included).
 *
 * @param module - The module that died.
 * @param defect - The defect value.
 * @param startedAt - Monotonic start of the module run.
 * @param now - Monotonic time source.
 * @returns One failed row scored as a complete module loss.
 */
function moduleErrorRow(module: Readonly<DiagnosticModule>, defect: unknown, startedAt: number, now: () => number): DiagnosticResult {
  const evidence = normalizeErrorForReport(defect, `The ${module.title} diagnostic module threw an error without a usable message.`);
  return diagnosticResult(
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
    now,
  );
}

/**
 * Runs one doctor module and normalizes a defect into one failed row.
 *
 * @param module - The diagnostic module to execute.
 * @param context - The shared read-only diagnostic context.
 * @returns The module's own results, or one `<module>.module-error` row; interruption propagates.
 */
function runDoctorModule(
  module: Readonly<DiagnosticModule>,
  context: DoctorContext,
): Effect.Effect<readonly DiagnosticResult[], never, DoctorRequirements> {
  return Effect.gen(function* () {
    const now = yield* monotonicNow;
    const startedAt = now();
    return yield* module
      .run(context)
      .pipe(Effect.catchDefect((defect) => Effect.succeed([moduleErrorRow(module, defect, startedAt, now)])));
  });
}

/**
 * Starts the given facts in the background without awaiting them.
 *
 * @remarks
 * Each fact starts immediately in a child fiber of the doctor run, so independent inspections a
 * module reads sequentially are already in flight before the first module runs. The outcome (or defect) is ignored here: the module that
 * consumes the fact reads the identical memoized outcome and classifies it.
 *
 * @param inspection - The shared repository inspection session of the run.
 * @param facts - Facts to start; duplicates are collapsed.
 * @returns An effect that forks one fiber per distinct fact.
 */
function prewarmInspections(inspection: RepositoryInspectionSession, facts: readonly RepositoryInspectionKey[]): Effect.Effect<void> {
  return Effect.forEach([...new Set(facts)], (fact) => Effect.forkChild(Effect.exit(inspection.inspect(fact)), {startImmediately: true}), {
    discard: true,
  });
}

/**
 * Runs the given modules against one shared read-only context and returns the validated report.
 *
 * @remarks
 * Exported for tests that inject modules; production code calls {@link runDoctor}.
 *
 * @param modules - Ordered modules to execute.
 * @returns The doctor program over `modules`.
 */
export function runDoctorWith(
  modules: readonly DiagnosticModule[],
): (input: Readonly<DoctorInput>) => Effect.Effect<DoctorReport, never, DoctorRequirements | Inspection> {
  return Effect.fn("doctor.run")(function* (input: Readonly<DoctorInput>) {
    const files = yield* legacyReadOnlyFiles;
    const paths = yield* Effect.promise(() => resolveRepositoryPaths(import.meta.url, files));
    const requirements = yield* Effect.promise(() => loadRepositoryRequirements(paths, {files, tasks: legacyTaskScheduler}));
    const inspection = yield* (yield* Inspection).session({profile: input.quick ? "quick" : "full", paths});

    // Full mode only: the aggregate worker starts once here, so its memoized result is ready by the
    // time the workspace and infrastructure modules consume it. Quick mode never starts it.
    yield* prewarmInspections(inspection, [
      ...(input.quick ? [] : ["aggregate" as const]),
      ...modules.flatMap((module) => module.facts ?? []),
    ]);

    const context: DoctorContext = {options: input, paths, requirements, inspection, probes: inspectionProbeRunner};
    const results = yield* Effect.forEach(modules, (module) => runDoctorModule(module, context), {concurrency: "unbounded"});
    const timestamp = DateTime.formatIso(yield* DateTime.now);
    return yield* Effect.sync(() => createDoctorReport(results.flat(), timestamp, {verbose: input.verbose}));
  });
}

/**
 * Runs every doctor module and returns the validated, scored report.
 *
 * @param input - Typed doctor input.
 * @returns The report; a duplicate or unknown diagnostic id is a defect.
 */
export const runDoctor: (input: Readonly<DoctorInput>) => Effect.Effect<DoctorReport, never, DoctorRequirements | Inspection> =
  runDoctorWith(doctorModules);

/**
 * Whether a report contains a failed diagnostic: the business-negative doctor result.
 *
 * @param report - The doctor report.
 * @returns `true` when any check failed.
 */
export function hasFailedDiagnostics(report: Readonly<DoctorReport>): boolean {
  return report.checks.some((check) => check.status === "fail");
}
