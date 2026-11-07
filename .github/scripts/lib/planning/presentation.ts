/**
 * @fileoverview Concise selection explanations shared by workflow logs and reports.
 * @module github/scripts/lib/planning/presentation
 */
import type {HygienePlan} from "./types.ts";

/** Human-readable scope explanation; expected full-scope selection is not a warning. */
export interface PlanSelectionSummary {
  readonly message: string;
  readonly level: "info" | "warning";
}

/**
 * Describes the selection without exposing raw per-file diagnostic lists.
 * @param plan - Validated plan; its complete diagnostics remain in the artifact.
 * @returns One bounded explanation, prioritizing actual inspection failures.
 */
export function summarizePlanSelection(plan: HygienePlan): PlanSelectionSummary {
  const codes = new Set(plan.diagnostics.map((diagnostic) => diagnostic.code));
  const warnings: readonly (readonly [string, string])[] = [
    ["workspace-unavailable", "Workspace inspection was unavailable; full validation selected."],
    ["workspace-invalid", "Workspace inspection returned invalid data; full validation selected."],
    ["change-scope-unknown", "Changed files could not be determined reliably; full validation selected."],
    ["unmerged-change", "Unmerged files require full validation."],
    ["unmapped-test-project", "Some affected projects have no configured test suite; full validation selected."],
  ];
  const warning = warnings.find(([code]) => codes.has(code));
  if (warning) return {message: warning[1], level: "warning"};
  const expected = new Set(["full-requested", "shared-input", "unmapped-change"]);
  if ([...codes].some((code) => !expected.has(code)))
    return {message: "The affected scope could not be determined reliably; full validation selected.", level: "warning"};
  if (codes.has("full-requested")) return {message: "Full validation was explicitly requested.", level: "info"};
  if (codes.has("shared-input")) return {message: "Full validation selected because shared configuration changed.", level: "info"};
  if (codes.has("unmapped-change")) return {message: "Full validation selected because repository-wide files changed.", level: "info"};
  if (plan.mode === "full") return {message: "Full validation selected.", level: "info"};
  if (!plan.providers.some((provider) => provider.selected)) return {message: "No changed files require validation.", level: "info"};
  return {message: "Validation selected for changed files and affected projects.", level: "info"};
}
