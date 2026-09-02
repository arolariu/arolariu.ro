/**
 * @fileoverview Shared contracts and types for modular doctor diagnostics.
 * @module scripts/doctor.types
 */

import type {MonorepositoryLogger} from "./common/logger.ts";
import type {RepositoryPaths} from "./common/repository-paths.ts";
import type {RequirementLoadResult} from "./common/requirements.ts";
import type {Clock, ReadOnlyFileSystem, RuntimeEnvironment} from "./common/runtime.ts";
import type {InspectionProbeRunner} from "./inspection/probes.ts";
import type {RepositoryInspectionKey, RepositoryInspectionSession} from "./inspection/repository.ts";

/** One bounded timeout applied to network probes that do not supply one explicitly. */
export const DIAGNOSTIC_DEFAULT_TIMEOUT_MS = 15_000;

/** Describes the outcome classification of one diagnostic check. */
export type DiagnosticStatus = "pass" | "warn" | "fail" | "skipped";

/** Classifies the certainty of an inferred root or contributing cause. */
export type DiagnosticConfidence = "high" | "medium" | "low";

/** Identifies the stable bounded-context owner of one diagnostic row. */
export type DiagnosticModuleId = "workspace" | "dotnet" | "react" | "svelte" | "python" | "infrastructure";

/** One possible contributor to a diagnostic outcome. */
export interface DiagnosticPotentialCause {
  readonly cause: string;
  readonly confidence: DiagnosticConfidence;
}

/** One actionable remediation for a diagnostic outcome. */
export interface DiagnosticFix {
  readonly description: string;
  readonly command?: string;
}

/** One stable doctor result row. */
export interface DiagnosticResult {
  readonly id: string;
  readonly module: DiagnosticModuleId;
  readonly name: string;
  readonly status: DiagnosticStatus;
  readonly summary: string;
  readonly evidence: readonly string[];
  readonly rootCause?: string;
  readonly potentialCauses: readonly DiagnosticPotentialCause[];
  readonly fixes: readonly DiagnosticFix[];
  readonly durationMs: number;
}

/** Typed doctor command input decoded from the CLI or supplied by a programmatic caller. */
export interface DoctorInput {
  readonly quick: boolean;
  readonly verbose: boolean;
}

/**
 * Runtime options consumed by the doctor orchestrator and modules.
 *
 * @deprecated Renamed to {@link DoctorInput}; removed in Task 12 once legacy status adopts
 * `doctorCommand.invoke()`.
 */
export type DoctorRunOptions = DoctorInput;

/** Totals by result status. */
export interface DoctorSummary {
  readonly passed: number;
  readonly warnings: number;
  readonly failed: number;
  readonly skipped: number;
}

/** Typed doctor report payload. */
export interface DoctorReport {
  readonly score: number;
  readonly grade: string;
  readonly summary: DoctorSummary;
  readonly checks: readonly DiagnosticResult[];
  readonly timestamp: string;
}

/** One network reachability probe outcome. */
export interface DiagnosticNetworkResult {
  readonly status: "reachable" | "unavailable" | "error";
  readonly statusCode?: number;
  readonly durationMs: number;
  readonly error?: string;
  readonly body?: string;
}

/** Read-only HTTP probe contract for doctor modules. */
export interface DiagnosticNetworkProbe {
  readonly get: (url: URL, timeoutMs: number) => Promise<DiagnosticNetworkResult>;
}

/**
 * Shared module execution context for one doctor run.
 *
 * @remarks
 * Every member is a narrow, read-only capability: a specialist module can read the repository,
 * probe an allowlisted command, issue a bounded `GET`, and observe time and the environment, but
 * it can never mutate disk state, spawn an arbitrary command, or reach an ambient Node global.
 */
export interface DoctorContext {
  /** Typed input for this run. */
  readonly options: DoctorInput;
  /** Canonical repository paths resolved once for this run. */
  readonly paths: RepositoryPaths;
  /** Manifest-derived repository requirements, including an invalid/drift result. */
  readonly requirements: RequirementLoadResult;
  /** Bounded, `GET`-only network reachability probe. */
  readonly network: DiagnosticNetworkProbe;
  /** Structured, redaction-aware logger for this run. */
  readonly logger: MonorepositoryLogger;
  /** Read-only filesystem view; no module can mutate repository state. */
  readonly files: ReadOnlyFileSystem;
  /** Monotonic and wall-clock time source. */
  readonly clock: Clock;
  /** Immutable snapshot of the ambient environment. */
  readonly environment: RuntimeEnvironment;
  /** Shared repository inspection session for this run. */
  readonly inspection: RepositoryInspectionSession;
  /** Opaque inspection probe runner for allowlisted read-only command probes. */
  readonly probes: InspectionProbeRunner;
}

/** One stable doctor module implementation. */
export interface DiagnosticModule {
  readonly id: DiagnosticModuleId;
  readonly title: string;
  /**
   * Inspection facts this module always requests, declared so the command can start them
   * concurrently through the runtime task scheduler before any module runs.
   *
   * @remarks
   * A module that consumes more than one fact would otherwise have to await them one at a time —
   * a specialist module owns no scheduler and must never reach for an ad-hoc `Promise` combinator
   * — which would serialize independent inspections that previously ran concurrently. Declaring
   * them here keeps the concurrency decision in the command that owns cancellation and ordering,
   * while the module still reads each memoized outcome with an ordinary sequential `await`. A
   * module that consumes at most one fact declares nothing: its single inspection already starts
   * as soon as the module runs, concurrently with every sibling module.
   */
  readonly facts?: readonly RepositoryInspectionKey[];
  readonly run: (context: Readonly<DoctorContext>) => Promise<readonly DiagnosticResult[]>;
}

// Re-export diagnostic helpers from doctor.diagnostics.ts to avoid broad import churn
// in specialist modules that still import from this file.
export {diagnosticResult, skippedDiagnostic} from "./doctor.diagnostics.ts";
