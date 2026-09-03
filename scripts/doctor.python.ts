/**
 * @fileoverview Read-only Python diagnostics sourced exclusively from shared PythonFacts.
 * @module scripts.doctor.python
 *
 * @remarks
 * Every diagnostic row in this module is derived exclusively from the shared `PythonFacts`
 * produced by `context.inspection.inspect("python")`, `context.requirements` for version policy,
 * and `context.network.get()` for PyPI reachability. This module never spawns a command, never
 * reads a file, and never uses an unrestricted runner or `context.probes`. When the shared inspection
 * outcome is `unavailable` or `invalid`, every fact-dependent row is an explicit failure; no
 * diagnostic ever fabricates a healthy value from missing facts.
 */

import {boundEvidence, diagnosticResult, STANDARD_EVIDENCE_LIMIT} from "./doctor.diagnostics.ts";
import {
  DIAGNOSTIC_DEFAULT_TIMEOUT_MS,
  skippedDiagnostic,
  type DiagnosticFix,
  type DiagnosticModule,
  type DiagnosticPotentialCause,
  type DiagnosticResult,
  type DoctorContext,
} from "./doctor.types.ts";
import type {PythonFacts} from "./inspection/python.ts";
import type {InspectionOutcome} from "./inspection/types.ts";

const PYPI_PIP_INDEX_URL = new URL("https://pypi.org/pypi/pip/json");
const SETUP_COMMAND_HINT = "npm run setup";

const PYTHON_INSPECTION_RESOLUTION_FIX = "Resolve the reported Python inspection problem, then rerun doctor.";

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function diagnostic(
  ctx: Readonly<DoctorContext>,
  startedAt: number,
  input: Omit<DiagnosticResult, "durationMs" | "module">,
): DiagnosticResult {
  return diagnosticResult({module: "python", ...input}, startedAt, ctx.clock.monotonicNow);
}

function issueDiagnostic(
  ctx: Readonly<DoctorContext>,
  startedAt: number,
  input: Readonly<{
    id: string;
    name: string;
    status: "warn" | "fail";
    summary: string;
    evidence: readonly string[];
    fixes: readonly DiagnosticFix[];
    rootCause?: string;
    potentialCauses?: readonly DiagnosticPotentialCause[];
  }>,
): DiagnosticResult {
  return diagnostic(ctx, startedAt, {
    id: input.id,
    name: input.name,
    status: input.status,
    summary: input.summary,
    evidence: input.evidence,
    ...(input.rootCause === undefined ? {} : {rootCause: input.rootCause}),
    potentialCauses: input.potentialCauses ?? [],
    fixes: input.fixes,
  });
}

function passDiagnostic(
  ctx: Readonly<DoctorContext>,
  startedAt: number,
  id: string,
  name: string,
  summary: string,
  evidence: readonly string[],
): DiagnosticResult {
  return diagnostic(ctx, startedAt, {id, name, status: "pass", summary, evidence, potentialCauses: [], fixes: []});
}

function boundedIssues(issues: readonly string[]): readonly string[] {
  return boundEvidence(issues, false);
}

function buildIssueDiagnosis(
  issues: readonly string[],
): Readonly<{rootCause?: string; potentialCauses: readonly DiagnosticPotentialCause[]}> {
  const [rootCause] = issues;
  if (issues.length === 1 && rootCause !== undefined) {
    return {rootCause, potentialCauses: []};
  }
  return {
    potentialCauses: issues.slice(0, STANDARD_EVIDENCE_LIMIT).map((cause) => ({cause, confidence: "high" as const})),
  };
}

// ============================================================================
// Individual diagnostic functions
// ============================================================================

function diagnoseRuntime(ctx: Readonly<DoctorContext>, facts: Readonly<PythonFacts>): DiagnosticResult {
  const startedAt = ctx.clock.monotonicNow();

  if (facts.selected === undefined) {
    return issueDiagnostic(ctx, startedAt, {
      id: "python.runtime",
      name: "System Python runtime",
      status: "fail",
      summary: "No compatible system Python interpreter was found.",
      evidence: [
        `${String(facts.interpreters.length)} interpreter candidate${facts.interpreters.length === 1 ? "" : "s"} observed.`,
        ...(facts.interpreters.length === 0 ? [] : facts.interpreters.map((i) => `${i.command}: ${i.version}`)),
      ],
      potentialCauses: [
        {cause: "Python is not installed or is older than the repository minimum.", confidence: "high"},
        {cause: "PATH does not include a compatible Python launcher.", confidence: "medium"},
      ],
      fixes: [{description: "Install a Python interpreter meeting the repository minimum and ensure it is on PATH, then rerun doctor."}],
    });
  }

  return passDiagnostic(ctx, startedAt, "python.runtime", "System Python runtime", "A compatible system Python interpreter is available.", [
    `Selected: ${facts.selected.command} ${facts.selected.version}`,
    `${String(facts.interpreters.length)} interpreter candidate${facts.interpreters.length === 1 ? "" : "s"} observed.`,
  ]);
}

function diagnoseVirtualEnvironment(ctx: Readonly<DoctorContext>, facts: Readonly<PythonFacts>): DiagnosticResult {
  const startedAt = ctx.clock.monotonicNow();

  if (!facts.virtualEnvironment.exists) {
    return issueDiagnostic(ctx, startedAt, {
      id: "python.virtual-environment",
      name: "Virtual environment",
      status: "fail",
      summary: "The exp.arolariu.ro virtual environment was not found.",
      evidence: ["Virtual environment does not exist."],
      potentialCauses: [{cause: "The isolated virtual environment has not been created yet.", confidence: "high"}],
      fixes: [{description: "Create the isolated exp.arolariu.ro virtual environment, then rerun doctor.", command: SETUP_COMMAND_HINT}],
    });
  }

  if (!facts.virtualEnvironment.compatible) {
    return issueDiagnostic(ctx, startedAt, {
      id: "python.virtual-environment",
      name: "Virtual environment",
      status: "fail",
      summary: "The exp.arolariu.ro virtual environment is incompatible.",
      evidence: [
        ...(facts.virtualEnvironment.version === undefined ? [] : [`Version: ${facts.virtualEnvironment.version}`]),
        "The virtual environment interpreter is incompatible with repository requirements.",
      ],
      rootCause: "The virtual environment interpreter is incompatible or not canonical.",
      fixes: [
        {
          description: "Recreate the isolated exp.arolariu.ro virtual environment with a compatible interpreter, then rerun doctor.",
          command: SETUP_COMMAND_HINT,
        },
      ],
    });
  }

  return passDiagnostic(
    ctx,
    startedAt,
    "python.virtual-environment",
    "Virtual environment",
    "The exp.arolariu.ro virtual environment is healthy and isolated.",
    [
      ...(facts.virtualEnvironment.version === undefined ? [] : [`Version: ${facts.virtualEnvironment.version}`]),
      "Virtual environment exists and is compatible.",
    ],
  );
}

function diagnosePip(ctx: Readonly<DoctorContext>, facts: Readonly<PythonFacts>, blocked: boolean): DiagnosticResult {
  if (blocked) {
    return skippedDiagnostic({
      id: "python.pip",
      module: "python",
      name: "pip availability",
      summary: "pip availability was skipped because the virtual environment could not be verified.",
      evidence: ["Blocked by python.virtual-environment."],
    });
  }

  const startedAt = ctx.clock.monotonicNow();
  if (!facts.pip.available) {
    return issueDiagnostic(ctx, startedAt, {
      id: "python.pip",
      name: "pip availability",
      status: "fail",
      summary: "pip is not available in the virtual environment.",
      evidence: ["pip could not be executed in the virtual environment."],
      rootCause: "The virtual environment interpreter could not run pip.",
      fixes: [{description: "Recreate the isolated exp.arolariu.ro virtual environment, then rerun doctor.", command: SETUP_COMMAND_HINT}],
    });
  }

  return passDiagnostic(
    ctx,
    startedAt,
    "python.pip",
    "pip availability",
    "pip is available in the virtual environment.",
    facts.pip.version === undefined ? ["pip is available."] : [`pip ${facts.pip.version}`],
  );
}

function diagnoseRequirements(ctx: Readonly<DoctorContext>, facts: Readonly<PythonFacts>, blocked: boolean): DiagnosticResult {
  if (blocked) {
    return skippedDiagnostic({
      id: "python.requirements",
      module: "python",
      name: "Installed requirements",
      summary: "Installed requirements were skipped because the virtual environment could not be verified.",
      evidence: ["Blocked by python.virtual-environment."],
    });
  }

  const startedAt = ctx.clock.monotonicNow();

  if (facts.requirements.mismatches.length > 0) {
    const evidence = boundedIssues([...facts.requirements.mismatches, ...facts.requirements.unverifiable]);
    return issueDiagnostic(ctx, startedAt, {
      id: "python.requirements",
      name: "Installed requirements",
      status: "fail",
      summary: "One or more pinned requirements are not satisfied in the virtual environment.",
      evidence,
      potentialCauses: facts.requirements.mismatches
        .slice(0, STANDARD_EVIDENCE_LIMIT)
        .map((m) => ({cause: m, confidence: "high" as const})),
      fixes: [
        {description: "Install the pinned requirements into the virtual environment, then rerun doctor.", command: SETUP_COMMAND_HINT},
      ],
    });
  }

  if (facts.requirements.unverifiable.length > 0) {
    return issueDiagnostic(ctx, startedAt, {
      id: "python.requirements",
      name: "Installed requirements",
      status: "warn",
      summary: "Every exact pinned requirement is satisfied, but some requirement entries could not be exactly verified.",
      evidence: [`${String(facts.requirements.declared.length)} exact pinned requirements verified.`, ...facts.requirements.unverifiable],
      rootCause:
        "One or more requirement entries use extras, environment markers, non-exact version specifiers, or pip options that are not evaluated by this doctor's exact-pin comparator.",
      fixes: facts.requirements.unverifiable.map((entry) => ({
        description: `Review '${entry}' manually, or replace it with an exact '==' pin if precise doctor verification is desired.`,
      })),
    });
  }

  return passDiagnostic(
    ctx,
    startedAt,
    "python.requirements",
    "Installed requirements",
    facts.requirements.declared.length === 0
      ? "No requirements are declared."
      : "Installed distributions satisfy every pinned requirement.",
    [`${String(facts.requirements.declared.length)} pinned requirements verified.`],
  );
}

function diagnoseConflicts(ctx: Readonly<DoctorContext>, facts: Readonly<PythonFacts>, blocked: boolean): DiagnosticResult {
  if (blocked) {
    return skippedDiagnostic({
      id: "python.conflicts",
      module: "python",
      name: "Dependency conflicts",
      summary: "Dependency conflicts were skipped because the virtual environment could not be verified.",
      evidence: ["Blocked by python.virtual-environment."],
    });
  }

  const startedAt = ctx.clock.monotonicNow();
  if (facts.pip.conflicts.length > 0) {
    return issueDiagnostic(ctx, startedAt, {
      id: "python.conflicts",
      name: "Dependency conflicts",
      status: "warn",
      summary: "pip reported dependency conflicts.",
      evidence: boundedIssues(facts.pip.conflicts),
      rootCause: "pip check reported one or more broken requirement sets.",
      fixes: [{description: "Resolve the reported dependency conflicts, then rerun doctor."}],
    });
  }

  return passDiagnostic(ctx, startedAt, "python.conflicts", "Dependency conflicts", "No dependency conflicts were found.", [
    "pip check reported no conflicts.",
  ]);
}

function diagnoseConfiguration(ctx: Readonly<DoctorContext>, facts: Readonly<PythonFacts>): DiagnosticResult {
  const startedAt = ctx.clock.monotonicNow();
  if (facts.configurationIssues.length > 0) {
    const evidence = boundedIssues(facts.configurationIssues);
    const diagnosis = buildIssueDiagnosis(facts.configurationIssues);
    return issueDiagnostic(ctx, startedAt, {
      id: "python.configuration",
      name: "Configuration parity",
      status: "fail",
      summary: "Configuration parity issues detected.",
      evidence,
      ...diagnosis,
      fixes: [{description: "Fix the reported configuration issues, then rerun doctor."}],
    });
  }

  return passDiagnostic(
    ctx,
    startedAt,
    "python.configuration",
    "Configuration parity",
    "config.docker.json satisfies every key required by config.template.json.",
    ["No configuration issues detected."],
  );
}

function isValidPyPiPackageIndex(body: string | undefined): boolean {
  if (body === undefined || body.trim() === "") {
    return false;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return false;
  }
  if (!isRecord(parsed)) {
    return false;
  }
  const info = parsed["info"];
  return isRecord(info) && typeof info["name"] === "string" && info["name"].toLowerCase() === "pip";
}

async function diagnosePyPi(ctx: Readonly<DoctorContext>): Promise<DiagnosticResult> {
  if (ctx.options.quick) {
    return skippedDiagnostic({
      id: "python.pypi",
      module: "python",
      name: "PyPI reachability",
      summary: "PyPI reachability was skipped in quick mode.",
      evidence: ["--quick intentionally skips network reachability probes."],
    });
  }

  const startedAt = ctx.clock.monotonicNow();
  const probe = await ctx.network.get(PYPI_PIP_INDEX_URL, DIAGNOSTIC_DEFAULT_TIMEOUT_MS);
  if (probe.status !== "reachable") {
    return skippedDiagnostic({
      id: "python.pypi",
      module: "python",
      name: "PyPI reachability",
      summary: "PyPI reachability could not be determined.",
      evidence: [probe.error ?? `Network probe reported status '${probe.status}'.`],
    });
  }

  if (probe.statusCode !== 200) {
    return issueDiagnostic(ctx, startedAt, {
      id: "python.pypi",
      name: "PyPI reachability",
      status: "warn",
      summary: "PyPI returned an unexpected response.",
      evidence: [`HTTP status: ${String(probe.statusCode)}`],
      rootCause: "The public PyPI JSON API responded without a successful status.",
      fixes: [{description: "Verify PyPI availability, then rerun doctor."}],
    });
  }

  if (!isValidPyPiPackageIndex(probe.body)) {
    return issueDiagnostic(ctx, startedAt, {
      id: "python.pypi",
      name: "PyPI reachability",
      status: "warn",
      summary: "PyPI returned a malformed package index response.",
      evidence: [
        `HTTP status: ${String(probe.statusCode)}`,
        probe.body === undefined || probe.body.trim() === "" ? "No response body was captured." : "Response body is malformed.",
      ],
      rootCause: "The PyPI JSON response did not contain the expected pip package info.",
      fixes: [{description: "Verify PyPI availability, then rerun doctor."}],
    });
  }

  return passDiagnostic(ctx, startedAt, "python.pypi", "PyPI reachability", "PyPI is reachable.", [
    `HTTP status: ${String(probe.statusCode)}`,
  ]);
}

// ============================================================================
// Degraded outcome handling
// ============================================================================

function degradedResults(ctx: Readonly<DoctorContext>, issues: readonly string[]): readonly DiagnosticResult[] {
  const startedAt = ctx.clock.monotonicNow();
  const summary = "The shared Python inspection facts could not be produced.";
  const evidence = boundedIssues(issues);
  const diagnosis = buildIssueDiagnosis(issues);

  const genericFail = (id: string, name: string): DiagnosticResult =>
    issueDiagnostic(ctx, startedAt, {
      id,
      name,
      status: "fail",
      summary,
      evidence,
      ...diagnosis,
      fixes: [{description: PYTHON_INSPECTION_RESOLUTION_FIX}],
    });

  return [
    genericFail("python.runtime", "System Python runtime"),
    genericFail("python.virtual-environment", "Virtual environment"),
    genericFail("python.pip", "pip availability"),
    genericFail("python.requirements", "Installed requirements"),
    genericFail("python.conflicts", "Dependency conflicts"),
    genericFail("python.configuration", "Configuration parity"),
  ];
}

/** Read-only Python diagnostic module, sourced exclusively from shared `PythonFacts`. */
export const pythonDoctorModule: DiagnosticModule = {
  id: "python",
  title: "Python",
  async run(context): Promise<readonly DiagnosticResult[]> {
    const outcome: InspectionOutcome<PythonFacts> = await context.inspection.inspect("python");

    let factResults: readonly DiagnosticResult[];

    if (outcome.kind === "unavailable") {
      factResults = degradedResults(context, [outcome.reason]);
    } else if (outcome.kind === "invalid") {
      factResults = degradedResults(context, outcome.issues);
    } else {
      const facts = outcome.value;
      const blocked = !facts.virtualEnvironment.exists || !facts.virtualEnvironment.compatible;
      factResults = [
        diagnoseRuntime(context, facts),
        diagnoseVirtualEnvironment(context, facts),
        diagnosePip(context, facts, blocked),
        diagnoseRequirements(context, facts, blocked),
        diagnoseConflicts(context, facts, blocked),
        diagnoseConfiguration(context, facts),
      ];
    }

    const pypi = await diagnosePyPi(context);
    return [...factResults, pypi];
  },
};
