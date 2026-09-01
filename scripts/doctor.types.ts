/**
 * @fileoverview Shared contracts and types for modular doctor diagnostics.
 * @module scripts/doctor.types
 */

import type {MonorepositoryLogger} from "./common/logger.ts";
import type {RepositoryPaths} from "./common/repository-paths.ts";
import type {RequirementLoadResult} from "./common/requirements.ts";
import type {InspectionProbeRunner} from "./inspection/probes.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";

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

/** Runtime options consumed by the doctor orchestrator and modules. */
export interface DoctorRunOptions {
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

/** Read-only HTTP probe contract for doctor modules. */
export interface DiagnosticNetworkProbe {
  readonly get: (url: URL, timeoutMs: number) => Promise<DiagnosticNetworkResult>;
}

/** Shared module execution context for one doctor run. */
export interface DoctorContext {
  readonly options: DoctorRunOptions;
  readonly paths: RepositoryPaths;
  readonly requirements: RequirementLoadResult;
  readonly network: DiagnosticNetworkProbe;
  readonly logger: MonorepositoryLogger;
  readonly platform: NodeJS.Platform;
  readonly arch: string;
  readonly env: Readonly<NodeJS.ProcessEnv>;
  readonly now: () => number;
  /** Shared repository inspection session for this run. */
  readonly inspection: RepositoryInspectionSession;
  /** Opaque inspection probe runner for allowlisted read-only command probes. */
  readonly probes: InspectionProbeRunner;
}

/** One stable doctor module implementation. */
export interface DiagnosticModule {
  readonly id: DiagnosticModuleId;
  readonly title: string;
  readonly run: (context: Readonly<DoctorContext>) => Promise<readonly DiagnosticResult[]>;
}

// Re-export diagnostic helpers from doctor.diagnostics.ts to avoid broad import churn
// in specialist modules that still import from this file.
export {diagnosticResult, skippedDiagnostic} from "./doctor.diagnostics.ts";
