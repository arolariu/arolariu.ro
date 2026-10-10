/**
 * @fileoverview Read-only SvelteKit diagnostics for the standalone CV and status sites.
 * @module scripts/commands/doctor/modules/svelte
 *
 * @remarks
 * Every diagnostic row in this module is derived exclusively from the shared `SvelteFacts`
 * produced by `context.inspection.inspect("svelte.cv")` and `context.inspection.inspect("svelte.status")`.
 * This module never spawns a command, never reads a package manifest, config file, or lockfile,
 * and never uses an unrestricted runner. When a shared Svelte inspection outcome itself is `unavailable`
 * or `invalid`, every row for that project is an explicit failure describing the degraded outcome;
 * no diagnostic ever fabricates a healthy value from missing facts.
 */

import {Effect} from "effect";

import {
  boundEvidence,
  diagnosticResult,
  skippedDiagnostic,
  STANDARD_EVIDENCE_LIMIT,
  moduleRunContext,
  type ModuleRunContext,
} from "../diagnostics.ts";
import {formatVersionRequirement, parseNodeRequirement, requirementSatisfies} from "../../../common/requirements.ts";
import type {DiagnosticFix, DiagnosticModule, DiagnosticPotentialCause, DiagnosticResult} from "../types.ts";
import type {SvelteFacts, SvelteProjectId} from "../../../inspection/frontend.ts";
import type {InspectionOutcome} from "../../../inspection/types.ts";

const SVELTE_INSPECTION_RESOLUTION_FIX = "Resolve the reported Svelte inspection problem, then rerun doctor.";

const SVELTE_PROJECT_PACKAGE_NAMES = {
  cv: "@arolariu/cv",
  status: "@arolariu/status",
} as const satisfies Readonly<Record<SvelteProjectId, string>>;

function qualifyProjectDiagnosticNames(projectId: SvelteProjectId, results: readonly DiagnosticResult[]): readonly DiagnosticResult[] {
  const packageName = SVELTE_PROJECT_PACKAGE_NAMES[projectId];
  return results.map((result) => ({...result, name: `${packageName}: ${result.name}`}));
}

function diagnostic(
  context: Readonly<ModuleRunContext>,
  startedAt: number,
  input: Omit<DiagnosticResult, "durationMs" | "module">,
): DiagnosticResult {
  return diagnosticResult(
    {
      module: "svelte",
      ...input,
    },
    startedAt,
    context.monotonicNow,
  );
}

function issueDiagnostic(
  context: Readonly<ModuleRunContext>,
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
  return diagnostic(context, startedAt, {
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
  context: Readonly<ModuleRunContext>,
  startedAt: number,
  id: string,
  name: string,
  summary: string,
  evidence: readonly string[],
): DiagnosticResult {
  return diagnostic(context, startedAt, {
    id,
    name,
    status: "pass",
    summary,
    evidence,
    potentialCauses: [],
    fixes: [],
  });
}

/**
 * Bounds a raw issue list to {@link STANDARD_EVIDENCE_LIMIT} entries, appending a deterministic
 * omitted-count summary when entries were truncated.
 *
 * @param issues - Raw, unbounded issue strings sourced from shared inspection facts.
 * @returns At most {@link STANDARD_EVIDENCE_LIMIT} entries, never a full unbounded copy.
 */
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

function skippedNodeEngineForInvalidRequirements(projectId: SvelteProjectId): DiagnosticResult {
  return skippedDiagnostic({
    id: `svelte.${projectId}.node-engine`,
    module: "svelte",
    name: "SvelteKit Node.js engine compatibility",
    summary: "Node engine compatibility was skipped because root requirement sources are invalid.",
    evidence: ["Blocked by invalid runtime requirement sources."],
  });
}

function diagnosePackages(context: Readonly<ModuleRunContext>, projectId: SvelteProjectId, facts: Readonly<SvelteFacts>): DiagnosticResult {
  const startedAt = context.monotonicNow();
  const id = `svelte.${projectId}.packages`;
  const issues = facts.packageIssues;

  if (issues.length === 0) {
    return passDiagnostic(
      context,
      startedAt,
      id,
      "SvelteKit ecosystem packages",
      "Installed SvelteKit ecosystem packages match locked requirements.",
      ["No SvelteKit ecosystem package issues were detected."],
    );
  }

  const evidence = boundedIssues(issues);
  return issueDiagnostic(context, startedAt, {
    id,
    name: "SvelteKit ecosystem packages",
    status: "fail",
    summary: `${String(issues.length)} SvelteKit ecosystem package check${issues.length === 1 ? "" : "s"} failed.`,
    evidence,
    ...buildIssueDiagnosis(issues),
    fixes: [{description: "Install the site's dependencies and rerun doctor.", command: "npm install"}],
  });
}

function diagnoseNodeEngine(
  context: Readonly<ModuleRunContext>,
  projectId: SvelteProjectId,
  facts: Readonly<SvelteFacts>,
): DiagnosticResult {
  const startedAt = context.monotonicNow();
  const id = `svelte.${projectId}.node-engine`;

  if (context.requirements.status === "invalid") {
    return skippedNodeEngineForInvalidRequirements(projectId);
  }

  const nodeEngine = facts.nodeEngine;
  if (nodeEngine === undefined) {
    return issueDiagnostic(context, startedAt, {
      id,
      name: "SvelteKit Node.js engine compatibility",
      status: "fail",
      summary: "The site's package.json does not declare a valid Node.js engine requirement.",
      evidence: ["package.json#engines.node is missing or uses an unsupported range."],
      rootCause: "package.json#engines.node is missing or uses an unsupported range.",
      fixes: [{description: "Declare a supported minimum version or LTS/current-branch Node engine range."}],
    });
  }

  const siteMinimum = parseNodeRequirement(nodeEngine);
  if (siteMinimum === null) {
    return issueDiagnostic(context, startedAt, {
      id,
      name: "SvelteKit Node.js engine compatibility",
      status: "fail",
      summary: "The site's package.json#engines.node uses an unsupported or malformed range.",
      evidence: [`package.json#engines.node must declare a supported minimum or LTS/current-branch range; received '${nodeEngine}'.`],
      rootCause: "package.json#engines.node uses an unsupported runtime constraint.",
      fixes: [{description: "Correct package.json#engines.node to a supported minimum or LTS/current-branch range."}],
    });
  }

  const rootMinimum = context.requirements.requirements.node;

  if (!requirementSatisfies(rootMinimum, siteMinimum)) {
    const rootLabel = formatVersionRequirement(rootMinimum);
    return issueDiagnostic(context, startedAt, {
      id,
      name: "SvelteKit Node.js engine compatibility",
      status: "fail",
      summary: "The root Node.js runtime requirement does not satisfy this site's declared engine range.",
      evidence: [`package.json#engines.node requires ${nodeEngine}; root requirement is ${rootLabel}.`],
      rootCause: `Root Node.js requirement ${rootLabel} does not satisfy this site's package.json#engines.node requirement ${nodeEngine}.`,
      fixes: [{description: "Align the root and site Node.js engine requirements."}],
    });
  }

  const rootLabel = formatVersionRequirement(rootMinimum);
  return passDiagnostic(
    context,
    startedAt,
    id,
    "SvelteKit Node.js engine compatibility",
    "The root Node.js runtime requirement satisfies this site's declared engine range.",
    [`package.json#engines.node ${nodeEngine} is satisfied by the root Node.js requirement ${rootLabel}.`],
  );
}

function diagnoseScripts(context: Readonly<ModuleRunContext>, projectId: SvelteProjectId, facts: Readonly<SvelteFacts>): DiagnosticResult {
  const startedAt = context.monotonicNow();
  const id = `svelte.${projectId}.scripts`;
  const issues = facts.scriptIssues;

  if (issues.length === 0) {
    return passDiagnostic(
      context,
      startedAt,
      id,
      "SvelteKit lifecycle scripts",
      "Required prepare, check, test, and build scripts are wired correctly.",
      [
        "package.json declares prepare, check, test, and build scripts with the expected intent.",
        "project.json wires matching Nx targets.",
        "vite.config wires the SvelteKit Vite plugin.",
      ],
    );
  }

  const evidence = boundedIssues(issues);
  return issueDiagnostic(context, startedAt, {
    id,
    name: "SvelteKit lifecycle scripts",
    status: "fail",
    summary: "Required SvelteKit lifecycle scripts are missing, misconfigured, or incorrectly wired.",
    evidence,
    ...buildIssueDiagnosis(issues),
    fixes: [{description: "Restore the required package.json scripts, project.json targets, and Vite plugin wiring."}],
  });
}

function diagnoseGeneratedState(
  context: Readonly<ModuleRunContext>,
  projectId: SvelteProjectId,
  facts: Readonly<SvelteFacts>,
): DiagnosticResult {
  const startedAt = context.monotonicNow();
  const id = `svelte.${projectId}.generated-state`;

  if (!facts.generatedConfigExists) {
    return issueDiagnostic(context, startedAt, {
      id,
      name: "SvelteKit generated local state",
      status: "fail",
      summary: "The generated .svelte-kit/tsconfig.json is missing.",
      evidence: ["The generated .svelte-kit/tsconfig.json does not exist as a regular file."],
      rootCause: "The generated .svelte-kit/tsconfig.json does not exist as a regular file.",
      fixes: [{description: "Generate the local SvelteKit types.", command: "npm run setup"}],
    });
  }

  return passDiagnostic(context, startedAt, id, "SvelteKit generated local state", "The generated .svelte-kit/tsconfig.json is present.", [
    "The generated .svelte-kit/tsconfig.json exists as a regular file.",
  ]);
}

function diagnoseAdapter(context: Readonly<ModuleRunContext>, projectId: SvelteProjectId, facts: Readonly<SvelteFacts>): DiagnosticResult {
  const startedAt = context.monotonicNow();
  const id = `svelte.${projectId}.adapter`;
  const issues = facts.adapterIssues;

  if (issues.length > 0) {
    const evidence = boundedIssues(issues);
    return issueDiagnostic(context, startedAt, {
      id,
      name: "SvelteKit adapter configuration",
      status: "fail",
      summary: "The configured SvelteKit adapter is missing, undeclared, or not installed.",
      evidence,
      ...buildIssueDiagnosis(issues),
      fixes: [{description: "Import a declared, installed adapter and set kit.adapter to its invocation in svelte.config."}],
    });
  }

  if (facts.adapterSpecifier === undefined) {
    return issueDiagnostic(context, startedAt, {
      id,
      name: "SvelteKit adapter configuration",
      status: "fail",
      summary: "The site's svelte.config does not configure a recognizable kit.adapter.",
      evidence: ["No adapter package specifier was resolved from svelte.config."],
      rootCause: "No adapter package specifier was resolved from svelte.config.",
      fixes: [{description: "Import an adapter and set kit.adapter to its invocation in svelte.config."}],
    });
  }

  return passDiagnostic(
    context,
    startedAt,
    id,
    "SvelteKit adapter configuration",
    "svelte.config configures a declared and installed adapter.",
    [`svelte.config configures kit.adapter using the '${facts.adapterSpecifier}' package.`],
  );
}

/**
 * Produces the five explicit degraded diagnostic rows for one project when its shared Svelte
 * inspection outcome was `unavailable` or `invalid`.
 *
 * @remarks
 * `svelte.<project>.node-engine` preserves its independent requirement-based skip policy even
 * when the shared Svelte facts could not be produced, exactly as it does when facts are
 * available. Every other row is an explicit failure describing the degraded outcome; none is
 * ever reported as a pass.
 *
 * @param context - Shared doctor execution context.
 * @param projectId - Identity of the standalone project (`"cv"` or `"status"`) being degraded.
 * @param issues - Raw, non-empty issues describing the degraded outcome.
 * @returns The five `svelte.<project>.*` diagnostic rows, in required order.
 */
function degradedResults(
  context: Readonly<ModuleRunContext>,
  projectId: SvelteProjectId,
  issues: readonly string[],
): readonly DiagnosticResult[] {
  const startedAt = context.monotonicNow();
  const summary = "The shared Svelte inspection facts could not be produced.";
  const evidence = boundedIssues(issues);
  const diagnosis = buildIssueDiagnosis(issues);

  const genericFail = (id: string, name: string): DiagnosticResult =>
    issueDiagnostic(context, startedAt, {
      id,
      name,
      status: "fail",
      summary,
      evidence,
      ...diagnosis,
      fixes: [{description: SVELTE_INSPECTION_RESOLUTION_FIX}],
    });

  const nodeEngineResult =
    context.requirements.status === "invalid"
      ? skippedNodeEngineForInvalidRequirements(projectId)
      : genericFail(`svelte.${projectId}.node-engine`, "SvelteKit Node.js engine compatibility");

  return [
    genericFail(`svelte.${projectId}.packages`, "SvelteKit ecosystem packages"),
    nodeEngineResult,
    genericFail(`svelte.${projectId}.scripts`, "SvelteKit lifecycle scripts"),
    genericFail(`svelte.${projectId}.generated-state`, "SvelteKit generated local state"),
    genericFail(`svelte.${projectId}.adapter`, "SvelteKit adapter configuration"),
  ];
}

/**
 * Runs every stable read-only SvelteKit diagnostic for one standalone project from its shared
 * inspection outcome.
 *
 * @param context - Shared doctor execution context.
 * @param projectId - Identity of the standalone project (`"cv"` or `"status"`) being inspected.
 * @param outcome - The shared `SvelteFacts` inspection outcome for this project.
 * @returns The five stable diagnostic results for this project, in fixed order.
 */
export function inspectSvelteProject(
  context: Readonly<ModuleRunContext>,
  projectId: SvelteProjectId,
  outcome: InspectionOutcome<SvelteFacts>,
): readonly DiagnosticResult[] {
  if (outcome.kind === "unavailable") {
    return qualifyProjectDiagnosticNames(projectId, degradedResults(context, projectId, [outcome.reason]));
  }
  if (outcome.kind === "invalid") {
    return qualifyProjectDiagnosticNames(projectId, degradedResults(context, projectId, outcome.issues));
  }

  const facts = outcome.value;
  return qualifyProjectDiagnosticNames(projectId, [
    diagnosePackages(context, projectId, facts),
    diagnoseNodeEngine(context, projectId, facts),
    diagnoseScripts(context, projectId, facts),
    diagnoseGeneratedState(context, projectId, facts),
    diagnoseAdapter(context, projectId, facts),
  ]);
}

/** Read-only SvelteKit diagnostic module covering the CV and status sites, sourced exclusively from shared `SvelteFacts`. */
export const svelteDoctorModule: DiagnosticModule = {
  id: "svelte",
  title: "Svelte",
  facts: ["svelte.cv", "svelte.status"],
  run: (doctorContext) =>
    Effect.gen(function* () {
      const context = yield* moduleRunContext(doctorContext);
      // Sequential by design, concurrent in effect: both project fact sets are declared above, so
      // the doctor run already started them together and each read below resolves the memoized
      // outcome of an inspection that is already in flight.
      const cvOutcome = yield* context.inspection.inspect("svelte.cv");
      const statusOutcome = yield* context.inspection.inspect("svelte.status");
      return [...inspectSvelteProject(context, "cv", cvOutcome), ...inspectSvelteProject(context, "status", statusOutcome)];
    }),
};
