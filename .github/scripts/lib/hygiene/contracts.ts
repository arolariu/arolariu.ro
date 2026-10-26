/**
 * @fileoverview Canonical hygiene finding, provider, gate, and report contracts.
 * @module github/scripts/lib/hygiene/contracts
 *
 * @remarks
 * Contains no SDK or resource imports. Providers return payloads and findings;
 * orchestration owns evidence persistence, reporting, and action exit status.
 */
import {array, count, record, text} from "../../helpers/reports/validation.ts";
import type {HygienePlan} from "../planning/types.ts";
import type {TypeScriptSuiteName} from "./registry.ts";

// =============================================================================
// SEVERITY (5 levels)
// =============================================================================

/**
 * Severity of an individual finding. Independent of the providers gate.
 */
export type Severity = "info" | "notice" | "warning" | "error" | "critical";

/**
 * Maps severity to a numeric rank for comparison.
 */
export function severityRank(s: Severity): number {
  switch (s) {
    case "info":
      return 0;
    case "notice":
      return 1;
    case "warning":
      return 2;
    case "error":
      return 3;
    case "critical":
      return 4;
  }
}

// =============================================================================
// FINDING (closed discriminated union, 5 kinds)
// =============================================================================

/** Line-level finding (file + line + column + rule). Maps to Checks API annotations. */
export interface LineFinding {
  readonly kind: "line";
  readonly severity: Severity;
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly endLine?: number;
  readonly endColumn?: number;
  readonly message: string;
  readonly ruleId?: string;
  /**
   * Optional logical grouping for multi-suite providers (e.g. test-frontend
   * runs Vitest across `website`, `components`, `cv`, `status` projects and
   * tags each finding with the project name). When set, the stepSummary
   * projection groups findings by this value within the provider's section.
   */
  readonly suite?: string;
}

/** File-level finding (whole-file issue, no specific line). */
export interface FileFinding {
  readonly kind: "file";
  readonly severity: Severity;
  readonly file: string;
  readonly message: string;
  readonly ruleId?: string;
}

/** Single numeric metric vs threshold. */
export interface MetricFinding {
  readonly kind: "metric";
  readonly severity: Severity;
  readonly name: string;
  readonly value: number;
  readonly threshold?: number;
  readonly unit?: string;
  readonly message: string;
}

/** Comparison between two values (e.g., base vs head). */
export interface ComparisonFinding {
  readonly kind: "comparison";
  readonly severity: Severity;
  readonly name: string;
  readonly baseValue: number;
  readonly headValue: number;
  readonly diff: number;
  readonly unit?: string;
  readonly message: string;
}

/** Escape-hatch tabular data (CVEs, i18n matrices, etc.). */
export interface TabularFinding {
  readonly kind: "tabular";
  readonly severity: Severity;
  readonly name: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly (string | number)[])[];
  readonly message: string;
}

export type Finding = LineFinding | FileFinding | MetricFinding | ComparisonFinding | TabularFinding;

function findingNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`Invalid finding ${field}`);
  return value;
}

function findingSeverity(value: unknown): Severity {
  switch (value) {
    case "info":
    case "notice":
    case "warning":
    case "error":
    case "critical":
      return value;
    default:
      throw new TypeError("Invalid finding severity");
  }
}

/**
 * Validates a serialized finding without trusting its discriminant or numbers.
 * @param value - Untrusted provider evidence.
 * @returns A decoded member of the canonical finding union.
 * @throws TypeError for unsupported kinds, invalid locations, or nonfinite data.
 */
export function decodeFinding(value: unknown): Finding {
  const raw = record(value, "finding");
  const common = {severity: findingSeverity(raw["severity"]), message: text(raw["message"], "finding message")};
  const ruleId = raw["ruleId"] === undefined ? {} : {ruleId: text(raw["ruleId"], "finding ruleId")};
  const number = (field: string): number => findingNumber(raw[field], field);
  const optionalNumber = (field: string): number | undefined => (raw[field] === undefined ? undefined : number(field));
  const optionalText = (field: string): string | undefined => (raw[field] === undefined ? undefined : text(raw[field], `finding ${field}`));
  const location = (field: string): number => {
    const result = count(raw[field], `finding ${field}`);
    if (result < 1) throw new TypeError(`Invalid finding ${field}`);
    return result;
  };
  const unit = optionalText("unit");
  switch (raw["kind"]) {
    case "line": {
      const suite = optionalText("suite");
      return {
        kind: "line",
        ...common,
        ...ruleId,
        file: text(raw["file"], "finding file"),
        line: location("line"),
        column: location("column"),
        ...(raw["endLine"] === undefined ? {} : {endLine: location("endLine")}),
        ...(raw["endColumn"] === undefined ? {} : {endColumn: location("endColumn")}),
        ...(suite === undefined ? {} : {suite}),
      };
    }
    case "file":
      return {kind: "file", ...common, ...ruleId, file: text(raw["file"], "finding file")};
    case "metric": {
      const threshold = optionalNumber("threshold");
      return {
        kind: "metric",
        ...common,
        name: text(raw["name"], "finding name"),
        value: number("value"),
        ...(threshold === undefined ? {} : {threshold}),
        ...(unit === undefined ? {} : {unit}),
      };
    }
    case "comparison":
      return {
        kind: "comparison",
        ...common,
        name: text(raw["name"], "finding name"),
        baseValue: number("baseValue"),
        headValue: number("headValue"),
        diff: number("diff"),
        ...(unit === undefined ? {} : {unit}),
      };
    case "tabular":
      return {
        kind: "tabular",
        ...common,
        name: text(raw["name"], "finding name"),
        columns: array(raw["columns"], "finding columns").map((value) => text(value, "finding column")),
        rows: array(raw["rows"], "finding rows").map((row) =>
          array(row, "finding row").map((cell) => (typeof cell === "string" ? cell : findingNumber(cell, "cell"))),
        ),
      };
    default:
      throw new TypeError("Invalid finding kind");
  }
}

// Type guards
export function isLineFinding(f: Finding): f is LineFinding {
  return f.kind === "line";
}
export function isFileFinding(f: Finding): f is FileFinding {
  return f.kind === "file";
}
export function isMetricFinding(f: Finding): f is MetricFinding {
  return f.kind === "metric";
}
export function isComparisonFinding(f: Finding): f is ComparisonFinding {
  return f.kind === "comparison";
}
export function isTabularFinding(f: Finding): f is TabularFinding {
  return f.kind === "tabular";
}

// =============================================================================
// GATE (3 kinds) -- independent from severity
// =============================================================================

/** A blocking gate fails the workflow when any finding has severity >= blockOn. */
export interface BlockingGate {
  readonly kind: "blocking";
  readonly blockOn: Severity;
}

/** An advisory gate never fails but surfaces the highest severity. */
export interface AdvisoryGate {
  readonly kind: "advisory";
}

/** An informational gate is always passed; findings are pure FYI. */
export interface InformationalGate {
  readonly kind: "informational";
}

export type Gate = BlockingGate | AdvisoryGate | InformationalGate;

/** Result of evaluating a gate against findings. */
export type GateResult = "passed" | "failed" | "advisory" | "errored";

/**
 * Pure evaluation of a gate against findings.
 * Does NOT handle errored state -- that is set by the runner when the provider throws.
 */
export function evaluateGate(gate: Gate, findings: readonly Finding[]): GateResult {
  switch (gate.kind) {
    case "informational":
      return "passed";
    case "advisory":
      return findings.length === 0 ? "passed" : "advisory";
    case "blocking": {
      const threshold = severityRank(gate.blockOn);
      const blocked = findings.some((f) => severityRank(f.severity) >= threshold);
      return blocked ? "failed" : "passed";
    }
  }
}

// =============================================================================
// PROVIDER OUTCOME (one file per provider)
// =============================================================================

/** Maximum characters per persisted operational-error field, after redaction. */
export const PROVIDER_ERROR_MESSAGE_LIMIT = 4096;

/** Redacted, bounded operational error suitable for artifacts and public reports. */
export interface ProviderError {
  readonly message: string;
  readonly stack?: string;
}

/**
 * The full artifact a provider emits to `artifacts/hygiene/outcome-{id}.json`.
 * Generic in `P` so each providers payload is strongly typed.
 */
export interface ProviderOutcome<P> {
  readonly providerId: string;
  readonly providerName: string;
  readonly providerIcon: string;
  readonly gate: Gate;
  readonly gateResult: GateResult;
  readonly durationMs: number;
  readonly startedAt: string; // ISO 8601
  readonly finishedAt: string; // ISO 8601
  readonly payload: P;
  readonly findings: readonly Finding[];
  readonly error: ProviderError | null;
}

/** Actual execution state, independent of whether a gate blocks the workflow. */
export type ExecutionStatus = "passed" | "failed" | "errored" | "skipped" | "cancelled";
/** Completeness of evidence, not a claim about command success. */
export type EvidenceStatus = "complete" | "missing" | "invalid" | "partial";

/** Versioned evidence identity used across matrix jobs and same-run reruns. */
export interface VersionedProviderOutcome<P> extends ProviderOutcome<P> {
  readonly schemaVersion: "1";
  readonly commitSha: string;
  readonly workflowRunId: string;
  readonly workflowRunAttempt: number;
  readonly planId: string;
  readonly executionStatus: ExecutionStatus;
  readonly evidenceStatus: EvidenceStatus;
  readonly skipReason?: string;
}

/** Diagnostic retained alongside all valid available evidence. */
export interface EvidenceIssue {
  readonly code: string;
  readonly message: string;
  readonly providerId?: string;
  readonly sourcePath?: string;
}

// =============================================================================
// AGGREGATED HYGIENE REPORT
// =============================================================================

export interface HygieneReport {
  readonly schemaVersion: "3";
  readonly commitSha: string;
  readonly prNumber: number | null;
  readonly workflowRunId: string;
  readonly workflowRunAttempt?: number;
  readonly workflowRunUrl: string;
  readonly generatedAt: string;
  readonly overallResult: GateResult;
  readonly outcomes: readonly ProviderOutcome<unknown>[];
  /** Additive validated selection/provenance without changing report version 3. */
  readonly plan?: HygienePlan;
  /** Missing, malformed, conflicting, or incompatible evidence prevents success. */
  readonly evidenceIssues?: readonly EvidenceIssue[];
}

/** Describes whether a diff is known; an unavailable diff is never an empty one. */
export type ChangeScope = "known" | "unknown";

/** Immutable check inputs; environment values are execution inputs, not report data. */
export interface ProviderRunInput {
  readonly workspaceRoot: string;
  readonly baseRef: string;
  readonly headRef: string;
  readonly changeScope: ChangeScope;
  readonly changedFiles: readonly string[];
  readonly env: NodeJS.ProcessEnv;
  /** Versioned planning supplies dependency-aware suites; legacy callers may omit it. */
  readonly selectedSuites?: readonly TypeScriptSuiteName[];
}

/** A check's payload and findings before the runner attaches execution evidence. */
export interface ProviderRunOutput<P> {
  readonly payload: P;
  readonly findings: readonly Finding[];
  /** Actual tool execution, independent of passing assertion/metric totals. */
  readonly executionStatus?: "passed" | "failed" | "errored";
  /** Incomplete runner evidence remains explicit even when partial results exist. */
  readonly evidenceStatus?: EvidenceStatus;
}

/** A dependency-neutral decoder for untrusted provider payloads. */
export interface Schema<P> {
  /**
   * Validates and decodes a payload without changing workflow state.
   * @param data - Untrusted parsed JSON or provider output.
   * @returns A validated payload.
   * @throws When the input violates the decoder's contract.
   */
  parse(data: unknown): P;
}

/** A check implementation independent of its persistence and publication lifecycle. */
export interface CheckProvider<P> {
  readonly id: string;
  readonly name: string;
  readonly icon: string;
  readonly defaultGate: Gate;
  readonly payloadSchema: Schema<P>;
  /**
   * Determines whether the check applies to the supplied scope.
   * @param input - Resolved workspace and change inputs.
   * @returns Whether to execute the check rather than record a planned skip.
   */
  applicableTo(input: ProviderRunInput): boolean;
  /**
   * Executes check-specific work through helpers and returns data/findings.
   * @param input - Resolved workspace and change inputs.
   * @returns Check results without artifact writes or action-status commands.
   */
  run(input: ProviderRunInput): Promise<ProviderRunOutput<P>>;
}
