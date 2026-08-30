/**
 * @fileoverview Stable scoring, schema validation, and rendering for doctor diagnostics.
 * @module scripts.doctor.reporter
 */

import type {DiagnosticFix, DiagnosticModuleId, DiagnosticPotentialCause, DiagnosticResult, DoctorOptions, DoctorReportV1, DoctorSummary} from "./doctor.types.ts";
import type {MonorepositoryLogger} from "./common/logger.ts";

type UnknownRecord = Readonly<Record<string, unknown>>;

const ansiEscapePattern = /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/u;
const moduleLabels = {
  workspace: "Workspace",
  dotnet: ".NET",
  react: "React",
  svelte: "Svelte",
  python: "Python",
  infrastructure: "Infrastructure",
} as const satisfies Readonly<Record<DiagnosticModuleId, string>>;
const moduleOrder = ["workspace", "dotnet", "react", "svelte", "python", "infrastructure"] as const satisfies readonly DiagnosticModuleId[];
const confidenceRank = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

/** Stable scoring weights for every planned doctor diagnostic result ID. */
export const diagnosticWeights: Readonly<Record<string, number>> = Object.freeze({
  "workspace.repository-root": 12,
  "workspace.git": 9,
  "workspace.node-sources": 11,
  "workspace.node-runtime": 12,
  "workspace.npm-runtime": 11,
  "workspace.root-dependencies": 12,
  "workspace.github-scripts-dependencies": 10,
  "workspace.npm-cache": 7,
  "workspace.nx-projects": 9,
  "workspace.nx-graph": 8,
  "workspace.config-files": 10,
  "workspace.generated-artifacts": 9,
  "workspace.host-capacity": 8,
  "workspace.npm-audit": 4,
  "workspace.npm-outdated": 3,

  "dotnet.executable": 12,
  "dotnet.sdk-inventory": 10,
  "dotnet.host": 10,
  "dotnet.workloads": 7,
  "dotnet.nuget-state": 10,
  "dotnet.solution": 11,
  "dotnet.local-tools": 9,
  "dotnet.https-certificate": 10,
  "dotnet.apphost": 9,
  "dotnet.nuget-feed": 4,

  "react.packages": 11,
  "react.workspace-link": 10,
  "react.environment": 10,
  "react.i18n": 8,
  "react.taxonomy-and-licenses": 7,
  "react.playwright": 9,
  "react.framework-config": 9,

  "svelte.cv.packages": 9,
  "svelte.cv.node-engine": 10,
  "svelte.cv.scripts": 8,
  "svelte.cv.generated-state": 7,
  "svelte.cv.adapter": 8,
  "svelte.status.packages": 9,
  "svelte.status.node-engine": 10,
  "svelte.status.scripts": 8,
  "svelte.status.generated-state": 7,
  "svelte.status.adapter": 8,

  "python.runtime": 12,
  "python.virtual-environment": 11,
  "python.pip": 10,
  "python.requirements": 11,
  "python.conflicts": 9,
  "python.configuration": 10,
  "python.pypi": 3,

  "infrastructure.selection": 12,
  "infrastructure.cli": 11,
  "infrastructure.backend": 10,
  "infrastructure.compose": 9,
  "infrastructure.docker-conflict": 8,
  "infrastructure.socket-context": 9,
  "infrastructure.ports": 10,
  "infrastructure.certificates": 9,
  "infrastructure.manifests": 8,
  "infrastructure.containers": 4,

  // Module-crash normalization rows. Each is weighted as the sum of its module's ordinary
  // weights above so that a crashed module is scored as a complete module loss rather than
  // shrinking the denominator used to compute the overall health score.
  "workspace.module-error": 135,
  "dotnet.module-error": 92,
  "react.module-error": 64,
  "svelte.module-error": 84,
  "python.module-error": 66,
  "infrastructure.module-error": 90,
});

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureAnsiFreeString(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Doctor report strings must be non-empty.");
  }
  if (ansiEscapePattern.test(value)) {
    throw new Error("Doctor report strings must not contain ANSI escape sequences.");
  }
  return value;
}

function parseFiniteNumber(value: unknown, label: string, minimum = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) {
    throw new Error(`${label} must be a finite number${minimum === 0 ? "" : ` greater than or equal to ${String(minimum)}`}.`);
  }
  return value;
}

function parseFiniteInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a finite non-negative integer.`);
  }
  return value;
}

function parseScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("Doctor report score must be a finite number between 0 and 100.");
  }
  return value;
}

function parseDiagnosticStatus(value: unknown): DiagnosticResult["status"] {
  switch (value) {
    case "pass":
    case "warn":
    case "fail":
    case "skipped":
      return value;
    default:
      throw new Error("Doctor diagnostic status must be one of: pass, warn, fail, skipped.");
  }
}

function parseDiagnosticConfidence(value: unknown): DiagnosticPotentialCause["confidence"] {
  switch (value) {
    case "high":
    case "medium":
    case "low":
      return value;
    default:
      throw new Error("Doctor diagnostic confidence must be one of: high, medium, low.");
  }
}

function parseDiagnosticModule(value: unknown): DiagnosticModuleId {
  switch (value) {
    case "workspace":
    case "dotnet":
    case "react":
    case "svelte":
    case "python":
    case "infrastructure":
      return value;
    default:
      throw new Error("Doctor diagnostic module must be one of: workspace, dotnet, react, svelte, python, infrastructure.");
  }
}

function parseGrade(value: unknown): string {
  const grade = ensureAnsiFreeString(value);
  switch (grade) {
    case "A+":
    case "A":
    case "B":
    case "C":
    case "D":
    case "F":
      return grade;
    default:
      throw new Error("Doctor report grade must be one of: A+, A, B, C, D, F.");
  }
}

function parseTimestamp(value: unknown): string {
  const timestamp = ensureAnsiFreeString(value);
  if (Number.isNaN(Date.parse(timestamp))) {
    throw new Error("Doctor report timestamp must be a valid ISO-8601 string.");
  }
  return timestamp;
}

function parseStringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }

  return value.map((entry) => ensureAnsiFreeString(entry));
}

function parsePotentialCauses(value: unknown): readonly DiagnosticPotentialCause[] {
  if (!Array.isArray(value)) {
    throw new Error("Doctor diagnostic potentialCauses must be an array.");
  }

  return value.map((entry) => {
    if (!isRecord(entry)) {
      throw new Error("Doctor diagnostic potential cause entries must be objects.");
    }

    return {
      cause: ensureAnsiFreeString(entry["cause"]),
      confidence: parseDiagnosticConfidence(entry["confidence"]),
    };
  });
}

function parseFixes(value: unknown): readonly DiagnosticFix[] {
  if (!Array.isArray(value)) {
    throw new Error("Doctor diagnostic fixes must be an array.");
  }

  return value.map((entry) => {
    if (!isRecord(entry)) {
      throw new Error("Doctor diagnostic fix entries must be objects.");
    }

    const description = ensureAnsiFreeString(entry["description"]);
    const commandValue = entry["command"];
    return {
      description,
      ...(commandValue === undefined ? {} : {command: ensureAnsiFreeString(commandValue)}),
    };
  });
}

function parseDiagnostic(value: unknown): DiagnosticResult {
  if (!isRecord(value)) {
    throw new Error("Doctor diagnostic entries must be objects.");
  }

  const id = ensureAnsiFreeString(value["id"]);
  const module = parseDiagnosticModule(value["module"]);
  if (!id.startsWith(`${module}.`)) {
    throw new Error(`Doctor diagnostic id '${id}' must belong to module '${module}'.`);
  }

  return {
    id,
    module,
    name: ensureAnsiFreeString(value["name"]),
    status: parseDiagnosticStatus(value["status"]),
    summary: ensureAnsiFreeString(value["summary"]),
    evidence: parseStringArray(value["evidence"], "Doctor diagnostic evidence"),
    ...(value["rootCause"] === undefined ? {} : {rootCause: ensureAnsiFreeString(value["rootCause"])}),
    potentialCauses: parsePotentialCauses(value["potentialCauses"]),
    fixes: parseFixes(value["fixes"]),
    durationMs: parseFiniteNumber(value["durationMs"], "Doctor diagnostic durationMs"),
  };
}

function parseSummary(value: unknown): DoctorSummary {
  if (!isRecord(value)) {
    throw new Error("Doctor report summary must be an object.");
  }

  return {
    passed: parseFiniteInteger(value["passed"], "Doctor report summary.passed"),
    warnings: parseFiniteInteger(value["warnings"], "Doctor report summary.warnings"),
    failed: parseFiniteInteger(value["failed"], "Doctor report summary.failed"),
    skipped: parseFiniteInteger(value["skipped"], "Doctor report summary.skipped"),
  };
}

function parseChecks(value: unknown): readonly DiagnosticResult[] {
  if (!Array.isArray(value)) {
    throw new Error("Doctor report checks must be an array.");
  }

  return value.map((entry) => parseDiagnostic(entry));
}

function sortPotentialCauses(potentialCauses: readonly DiagnosticPotentialCause[]): readonly DiagnosticPotentialCause[] {
  return [...potentialCauses].sort((left, right) => {
    const rankDifference = confidenceRank[left.confidence] - confidenceRank[right.confidence];
    if (rankDifference !== 0) {
      return rankDifference;
    }

    return left.cause.localeCompare(right.cause);
  });
}

function validateDiagnosticIds(checks: readonly DiagnosticResult[]): void {
  const seen = new Set<string>();
  for (const check of checks) {
    if (!(check.id in diagnosticWeights)) {
      throw new Error(`Unknown diagnostic id '${check.id}'.`);
    }

    if (seen.has(check.id)) {
      throw new Error(`Duplicate diagnostic id '${check.id}'.`);
    }

    seen.add(check.id);
  }
}

function validateDiagnosticSemantics(checks: readonly DiagnosticResult[]): void {
  for (const check of checks) {
    if (check.status !== "warn" && check.status !== "fail") {
      continue;
    }

    if (check.evidence.length === 0) {
      throw new Error(`Doctor diagnostic '${check.id}' with status '${check.status}' must include at least one evidence entry.`);
    }

    if (check.fixes.length === 0) {
      throw new Error(`Doctor diagnostic '${check.id}' with status '${check.status}' must include at least one suggested fix.`);
    }

    const hasRootCause = check.rootCause !== undefined;
    const hasPotentialCauses = check.potentialCauses.length > 0;
    if (hasRootCause === hasPotentialCauses) {
      throw new Error(`Doctor diagnostic '${check.id}' with status '${check.status}' must include exactly one diagnosis form: rootCause or potentialCauses.`);
    }
  }
}

function renderSummary(summary: Readonly<DoctorSummary>): string {
  return `Summary: ${summary.passed} passed, ${summary.warnings} warning${summary.warnings === 1 ? "" : "s"}, ${summary.failed} failure${summary.failed === 1 ? "" : "s"}, ${summary.skipped} skipped`;
}

function renderStatusIcon(status: DiagnosticResult["status"]): string {
  switch (status) {
    case "pass":
      return "✅";
    case "warn":
      return "⚠️";
    case "fail":
      return "⛔";
    case "skipped":
      return "⏭️";
  }
}

function cloneDiagnostic(check: Readonly<DiagnosticResult>): DiagnosticResult {
  return {
    ...check,
    evidence: [...check.evidence],
    potentialCauses: check.potentialCauses.map((potentialCause) => ({...potentialCause})),
    fixes: check.fixes.map((fix) => ({...fix})),
  };
}

function sameSummary(left: Readonly<DoctorSummary>, right: Readonly<DoctorSummary>): boolean {
  return left.passed === right.passed
    && left.warnings === right.warnings
    && left.failed === right.failed
    && left.skipped === right.skipped;
}

/**
 * Counts doctor diagnostics by status.
 *
 * @param checks - Diagnostic rows to summarize.
 * @returns Totals by status.
 */
export function summarizeDiagnostics(checks: readonly DiagnosticResult[]): DoctorSummary {
  let passed = 0;
  let warnings = 0;
  let failed = 0;
  let skipped = 0;

  for (const check of checks) {
    switch (check.status) {
      case "pass":
        passed += 1;
        break;
      case "warn":
        warnings += 1;
        break;
      case "fail":
        failed += 1;
        break;
      case "skipped":
        skipped += 1;
        break;
    }
  }

  return {passed, warnings, failed, skipped};
}

/**
 * Computes the weighted doctor health score.
 *
 * @param checks - Diagnostic rows to score.
 * @returns Rounded health score from 0 to 100.
 */
export function computeHealthScore(checks: readonly DiagnosticResult[]): number {
  validateDiagnosticIds(checks);

  let earned = 0;
  let total = 0;

  for (const check of checks) {
    if (check.status === "skipped") {
      continue;
    }

    const weight = diagnosticWeights[check.id];
    if (weight === undefined) {
      throw new Error(`Unknown diagnostic id '${check.id}'.`);
    }

    total += weight;
    if (check.status === "pass") {
      earned += weight;
      continue;
    }
    if (check.status === "warn") {
      earned += weight * 0.5;
    }
  }

  return total === 0 ? 100 : Math.round((earned / total) * 100);
}

/**
 * Maps a score to the legacy doctor letter grade.
 *
 * @param score - Rounded health score.
 * @returns Letter grade matching the legacy thresholds.
 */
export function gradeFromScore(score: number): string {
  if (score >= 95) {
    return "A+";
  }
  if (score >= 90) {
    return "A";
  }
  if (score >= 80) {
    return "B";
  }
  if (score >= 70) {
    return "C";
  }
  if (score >= 60) {
    return "D";
  }
  return "F";
}

/**
 * Creates a validated version 1 doctor report payload.
 *
 * @param checks - Diagnostic rows for one doctor run.
 * @param timestamp - ISO timestamp representing report creation time.
 * @returns Validated report payload.
 */
export function createDoctorReport(checks: readonly DiagnosticResult[], timestamp: string): DoctorReportV1 {
  const clonedChecks = checks.map((check) => cloneDiagnostic(check));
  validateDiagnosticSemantics(clonedChecks);
  const score = computeHealthScore(clonedChecks);
  const report: DoctorReportV1 = {
    schemaVersion: 1,
    score,
    grade: gradeFromScore(score),
    summary: summarizeDiagnostics(clonedChecks),
    checks: clonedChecks,
    timestamp,
  };

  return parseDoctorReport(report);
}

/**
 * Parses an untrusted persisted doctor report payload.
 *
 * @param value - Unknown JSON-compatible value.
 * @returns Validated version 1 report.
 */
export function parseDoctorReport(value: unknown): DoctorReportV1 {
  if (!isRecord(value)) {
    throw new Error("Doctor report must be an object.");
  }

  if (value["schemaVersion"] !== 1) {
    throw new Error(`Unsupported doctor report schemaVersion '${String(value["schemaVersion"])}'. Expected version 1.`);
  }

  const checks = parseChecks(value["checks"]);
  validateDiagnosticSemantics(checks);
  const summary = parseSummary(value["summary"]);
  const score = parseScore(value["score"]);
  const grade = parseGrade(value["grade"]);
  const timestamp = parseTimestamp(value["timestamp"]);

  const computedSummary = summarizeDiagnostics(checks);
  if (!sameSummary(summary, computedSummary)) {
    throw new Error("Doctor report summary does not match diagnostic statuses.");
  }

  const computedScore = computeHealthScore(checks);
  if (score !== computedScore) {
    throw new Error(`Doctor report score ${String(score)} does not match computed score ${String(computedScore)}.`);
  }

  const computedGrade = gradeFromScore(score);
  if (grade !== computedGrade) {
    throw new Error(`Doctor report grade '${grade}' does not match score ${String(score)}.`);
  }

  return {
    schemaVersion: 1,
    score,
    grade,
    summary,
    checks,
    timestamp,
  };
}

/**
 * Renders one doctor report as human output or a single JSON document.
 *
 * @param report - Validated doctor report to render.
 * @param options - CLI rendering options.
 * @param logger - Repository logger abstraction.
 */
export function renderDoctorReport(
  report: Readonly<DoctorReportV1>,
  options: Readonly<DoctorOptions>,
  logger: MonorepositoryLogger,
): void {
  if (options.json) {
    logger.json(report);
    return;
  }

  logger.banner(["🩺 arolariu.ro Workspace Doctor"], "green");
  logger.line(renderSummary(report.summary));

  if (options.score) {
    logger.line();
    logger.line("╭─────────────────────────────────────────╮");
    logger.line(`│  🏥 Health Score: ${String(report.score)}/100  Grade: ${report.grade}  │`);
    logger.line("╰─────────────────────────────────────────╯");
  }

  for (const moduleId of moduleOrder) {
    const groupedChecks = report.checks.filter((check) => check.module === moduleId);
    if (groupedChecks.length === 0) {
      continue;
    }

    logger.section(moduleLabels[moduleId]);
    for (const check of groupedChecks) {
      logger.line(`${renderStatusIcon(check.status)} ${check.name} — ${check.summary}`);

      const shouldRenderEvidence = options.verbose || check.status === "warn" || check.status === "fail";
      if (shouldRenderEvidence && check.evidence.length > 0) {
        logger.line("    Evidence:");
        for (const evidence of check.evidence) {
          logger.line(`      - ${evidence}`);
        }
      }

      if (check.status === "warn" || check.status === "fail") {
        if (check.rootCause !== undefined) {
          logger.line(`    Root cause: ${check.rootCause}`);
        } else if (check.potentialCauses.length > 0) {
          logger.line("    Potential causes:");
          for (const potentialCause of sortPotentialCauses(check.potentialCauses)) {
            logger.line(`      - [${potentialCause.confidence}] ${potentialCause.cause}`);
          }
        }

        if (check.fixes.length > 0) {
          logger.line("    Suggested fixes:");
          check.fixes.forEach((fix, index) => {
            logger.line(`      ${String(index + 1)}. ${fix.description}`);
            if (fix.command !== undefined) {
              logger.command(fix.command);
            }
          });
        }
      }
    }
  }
}
