/**
 * @fileoverview Shared contracts and types for modular doctor diagnostics.
 * @module scripts/commands/doctor/types
 *
 * @remarks
 * {@link DoctorRequirements} is the compile-time read-only capability profile of every doctor
 * module: the read-only filesystem view, the bounded `GET`-only {@link NetworkProbe}, the process
 * service (reached only through opaque allowlisted inspection probes), the environment snapshot, and
 * the presenter. It deliberately excludes the mutating `FileSystem`, the unrestricted `HttpClient`,
 * and `Prompts`.
 */

import type {Effect} from "effect";

import type {RepositoryPaths} from "../../common/repository-paths.ts";
import type {RequirementLoadResult} from "../../common/requirements.ts";
import type {InspectionProbeRunner} from "../../inspection/probes.ts";
import type {RepositoryInspectionKey, RepositoryInspectionSession} from "../../inspection/repository.ts";
import type {Environment} from "../../platform/Environment.ts";
import type {ReadOnlyFiles} from "../../platform/Files.ts";
import type {Presenter} from "../../platform/Output.ts";
import type {Process} from "../../platform/Process.ts";
import type {NetworkProbe} from "./NetworkProbe.ts";

export {NetworkProbe} from "./NetworkProbe.ts";

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

/** Every service a doctor module (and the doctor run) may require: a read-only capability profile. */
export type DoctorRequirements = ReadOnlyFiles | NetworkProbe | Process | Environment | Presenter;

/**
 * Shared module execution context for one doctor run.
 *
 * @remarks
 * Every member is plain data or a read-only handle: a specialist module reads the repository through
 * `ReadOnlyFiles`, probes allowlisted commands through {@link DoctorContext.probes}, issues a bounded
 * `GET` through {@link NetworkProbe}, and observes the environment through `Environment`; it can never
 * mutate disk state, spawn an arbitrary command, or reach an ambient Node global.
 */
export interface DoctorContext {
  /** Typed input for this run. */
  readonly options: DoctorInput;
  /** Canonical repository paths resolved once for this run. */
  readonly paths: RepositoryPaths;
  /** Manifest-derived repository requirements, including an invalid/drift result. */
  readonly requirements: RequirementLoadResult;
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
   * Inspection facts this module always requests, declared so the doctor run can start them
   * concurrently before any module runs.
   *
   * @remarks
   * A module that consumes more than one fact reads each memoized outcome sequentially; declaring
   * the facts here lets the run start them together, so independent inspections stay concurrent.
   * A module that consumes at most one fact declares nothing: its single inspection already starts
   * as soon as the module runs, concurrently with every sibling module.
   */
  readonly facts?: readonly RepositoryInspectionKey[];
  readonly run: (context: DoctorContext) => Effect.Effect<readonly DiagnosticResult[], never, DoctorRequirements>;
}

// Re-export diagnostic helpers from diagnostics.ts to avoid broad import churn
// in specialist modules that still import from this file.
export {diagnosticResult, skippedDiagnostic} from "./diagnostics.ts";
