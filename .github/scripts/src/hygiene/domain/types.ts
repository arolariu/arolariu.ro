/**
 * @fileoverview Pure domain types for the hygiene check v3 system.
 * @module github/scripts/src/hygiene/domain/types
 *
 * @remarks
 * Zero I/O, zero behavior. Just types and pure functions over those types.
 * This is the contract every provider and projection composes against.
 */

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
    case "info": return 0;
    case "notice": return 1;
    case "warning": return 2;
    case "error": return 3;
    case "critical": return 4;
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

export type Finding =
  | LineFinding
  | FileFinding
  | MetricFinding
  | ComparisonFinding
  | TabularFinding;

// Type guards
export function isLineFinding(f: Finding): f is LineFinding { return f.kind === "line"; }
export function isFileFinding(f: Finding): f is FileFinding { return f.kind === "file"; }
export function isMetricFinding(f: Finding): f is MetricFinding { return f.kind === "metric"; }
export function isComparisonFinding(f: Finding): f is ComparisonFinding { return f.kind === "comparison"; }
export function isTabularFinding(f: Finding): f is TabularFinding { return f.kind === "tabular"; }

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

/** Structured error captured when a providers run() throws. */
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
  readonly startedAt: string;  // ISO 8601
  readonly finishedAt: string; // ISO 8601
  readonly payload: P;
  readonly findings: readonly Finding[];
  readonly error: ProviderError | null;
}

// =============================================================================
// AGGREGATED HYGIENE REPORT
// =============================================================================

export interface HygieneReport {
  readonly schemaVersion: "3";
  readonly commitSha: string;
  readonly prNumber: number | null;
  readonly workflowRunId: string;
  readonly workflowRunUrl: string;
  readonly generatedAt: string;
  readonly overallResult: GateResult;
  readonly outcomes: readonly ProviderOutcome<unknown>[];
}
