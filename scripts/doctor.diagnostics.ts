/**
 * @fileoverview Central diagnostic helpers for bounded evidence, error normalization, and diagnostic factories.
 * @module scripts/doctor.diagnostics
 *
 * @remarks
 * Reusable diagnostic mechanics consumed by the doctor reporter, orchestrator, and specialist
 * modules. Uses type-only imports from `doctor.types.ts` to avoid runtime cycles.
 */

import {stripVTControlCharacters} from "node:util";

import type {DiagnosticFix, DiagnosticModuleId, DiagnosticPotentialCause, DiagnosticResult, DiagnosticStatus} from "./doctor.types.ts";

// ============================================================================
// Evidence bounding constants
// ============================================================================

/** Maximum evidence entries retained in a normal (non-verbose) report. */
export const STANDARD_EVIDENCE_LIMIT = 5;

/** Maximum evidence entries retained in a verbose report. */
export const VERBOSE_EVIDENCE_LIMIT = 20;

/** Maximum characters per individual evidence entry. */
export const EVIDENCE_ENTRY_MAX_CHARS = 500;

/** Maximum characters for a command excerpt before evidence bounding. */
export const COMMAND_EXCERPT_MAX_CHARS = 2_000;

// ============================================================================
// Evidence bounding
// ============================================================================

/**
 * Truncates a single evidence entry to {@link EVIDENCE_ENTRY_MAX_CHARS}.
 *
 * @param entry - Raw evidence string.
 * @returns The entry, truncated with an ellipsis marker if it exceeded the limit.
 */
function truncateEntry(entry: string): string {
  if (entry.length <= EVIDENCE_ENTRY_MAX_CHARS) {
    return entry;
  }
  const suffix = "… (truncated)";
  return entry.slice(0, EVIDENCE_ENTRY_MAX_CHARS - suffix.length) + suffix;
}

/**
 * Bounds evidence entries to the configured limit for the run mode.
 *
 * @remarks
 * In normal mode, at most {@link STANDARD_EVIDENCE_LIMIT} entries are retained.
 * In verbose mode, at most {@link VERBOSE_EVIDENCE_LIMIT} entries are retained.
 * Each retained entry is at most {@link EVIDENCE_ENTRY_MAX_CHARS} characters.
 * When entries are omitted, a deterministic omitted-count summary is appended
 * as the final entry (within the limit).
 *
 * @param entries - Raw evidence entries.
 * @param verbose - Whether verbose mode is active.
 * @returns Bounded evidence entries.
 */
export function boundEvidence(entries: readonly string[], verbose: boolean): readonly string[] {
  if (entries.length === 0) {
    return [];
  }

  const limit = verbose ? VERBOSE_EVIDENCE_LIMIT : STANDARD_EVIDENCE_LIMIT;

  if (entries.length <= limit) {
    return entries.map(truncateEntry);
  }

  const omittedCount = entries.length - (limit - 1);
  const retained = entries.slice(0, limit - 1).map(truncateEntry);
  retained.push(`${String(omittedCount)} additional evidence entries omitted.`);
  return retained;
}

/**
 * Bounds a command output excerpt to {@link COMMAND_EXCERPT_MAX_CHARS}.
 *
 * @param output - Raw command output.
 * @returns The excerpt, truncated if it exceeded the limit.
 */
export function boundCommandExcerpt(output: string): string {
  if (output.length <= COMMAND_EXCERPT_MAX_CHARS) {
    return output;
  }
  return output.slice(0, COMMAND_EXCERPT_MAX_CHARS - 14) + "… (truncated)";
}

// ============================================================================
// Error normalization
// ============================================================================

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractThrownMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (isRecord(error) && typeof error["message"] === "string") {
    return error["message"];
  }
  return String(error);
}

function isUsableErrorText(value: string): boolean {
  return value.length > 0 && value !== "[object Object]" && value !== "null" && value !== "undefined";
}

/**
 * Normalizes an arbitrary thrown value into non-empty, report-safe, ANSI-free text.
 *
 * @param error - The unknown thrown value.
 * @param fallbackMessage - A stable, non-empty fallback for an unhelpful message.
 * @returns Non-empty, ANSI-free, report-safe text.
 */
export function normalizeErrorForReport(error: unknown, fallbackMessage: string): string {
  const normalized = stripVTControlCharacters(extractThrownMessage(error)).trim();
  return isUsableErrorText(normalized) ? normalized : fallbackMessage;
}

// ============================================================================
// Diagnostic factories
// ============================================================================

/**
 * Creates a passing diagnostic result.
 *
 * @param input - Diagnostic metadata.
 * @returns A completed pass result.
 */
export function passDiagnostic(
  input: Readonly<{
    id: string;
    module: DiagnosticModuleId;
    name: string;
    summary: string;
    evidence?: readonly string[];
  }>,
): DiagnosticResult {
  return {
    id: input.id,
    module: input.module,
    name: input.name,
    status: "pass" as DiagnosticStatus,
    summary: input.summary,
    evidence: input.evidence ?? [],
    potentialCauses: [],
    fixes: [],
    durationMs: 0,
  };
}

/**
 * Creates a warning diagnostic result.
 *
 * @param input - Diagnostic metadata with required evidence and fixes.
 * @returns A completed warn result.
 */
export function warnDiagnostic(
  input: Readonly<{
    id: string;
    module: DiagnosticModuleId;
    name: string;
    summary: string;
    evidence: readonly string[];
    rootCause?: string;
    potentialCauses?: readonly DiagnosticPotentialCause[];
    fixes: readonly DiagnosticFix[];
  }>,
): DiagnosticResult {
  return {
    id: input.id,
    module: input.module,
    name: input.name,
    status: "warn" as DiagnosticStatus,
    summary: input.summary,
    evidence: input.evidence,
    ...(input.rootCause !== undefined ? {rootCause: input.rootCause} : {}),
    potentialCauses: input.potentialCauses ?? [],
    fixes: input.fixes,
    durationMs: 0,
  };
}

/**
 * Creates a failing diagnostic result.
 *
 * @param input - Diagnostic metadata with required evidence and fixes.
 * @returns A completed fail result.
 */
export function failDiagnostic(
  input: Readonly<{
    id: string;
    module: DiagnosticModuleId;
    name: string;
    summary: string;
    evidence: readonly string[];
    rootCause?: string;
    potentialCauses?: readonly DiagnosticPotentialCause[];
    fixes: readonly DiagnosticFix[];
  }>,
): DiagnosticResult {
  return {
    id: input.id,
    module: input.module,
    name: input.name,
    status: "fail" as DiagnosticStatus,
    summary: input.summary,
    evidence: input.evidence,
    ...(input.rootCause !== undefined ? {rootCause: input.rootCause} : {}),
    potentialCauses: input.potentialCauses ?? [],
    fixes: input.fixes,
    durationMs: 0,
  };
}

/**
 * Creates a skipped diagnostic result.
 *
 * @param input - Skipped diagnostic metadata.
 * @returns A completed skipped result.
 */
export function skippedDiagnostic(
  input: Readonly<{
    id: string;
    module: DiagnosticModuleId;
    name: string;
    summary: string;
    evidence?: readonly string[];
  }>,
): DiagnosticResult {
  return {
    id: input.id,
    module: input.module,
    name: input.name,
    status: "skipped" as DiagnosticStatus,
    summary: input.summary,
    evidence: input.evidence ?? [],
    potentialCauses: [],
    fixes: [],
    durationMs: 0,
  };
}

/**
 * Finalizes a diagnostic row with elapsed timing metadata.
 *
 * @param result - Diagnostic fields excluding elapsed duration.
 * @param startedAt - Monotonic start timestamp.
 * @param now - Monotonic clock for duration capture.
 * @returns The completed diagnostic result.
 */
export function diagnosticResult(result: Omit<DiagnosticResult, "durationMs">, startedAt: number, now: () => number): DiagnosticResult {
  return {
    ...result,
    durationMs: Math.max(0, now() - startedAt),
  };
}
