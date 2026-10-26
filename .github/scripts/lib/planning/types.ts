/**
 * @fileoverview Serializable hygiene planning contracts; no root runtime imports.
 * @module github/scripts/lib/planning/types
 */
import type {GitChangeSet} from "../../helpers/git/index.ts";
import type {ProviderId, ProviderSetup, TypeScriptSuiteName} from "../hygiene/registry.ts";

/** Canonical repository project from the validated Nx facts boundary. */
export interface WorkspaceProject {
  readonly name: string;
  readonly root: string;
  readonly targets: readonly string[];
}
/** Depending project -> depended-on project. */
export interface WorkspaceDependency {
  readonly source: string;
  readonly target: string;
}
/** Dependency-neutral wire projection, not an Nx-owned runtime model. */
export interface WorkspaceFacts {
  readonly projects: readonly WorkspaceProject[];
  readonly dependencies: readonly WorkspaceDependency[];
  readonly cycles: readonly (readonly string[])[];
}
/** Inspection failure is explicit data; exceptional defects are not available graphs. */
export type WorkspaceInspection =
  | Readonly<{kind: "available"; value: WorkspaceFacts; durationMs: number}>
  | Readonly<{kind: "unavailable"; reason: string; durationMs: number}>
  | Readonly<{kind: "invalid"; issues: readonly string[]; durationMs: number}>;
/** Stable reason code and human-readable scope explanation. */
export interface PlanningDiagnostic {
  readonly code: string;
  readonly message: string;
}
/** Every provider requires evidence, including an explicitly skipped record. */
export interface PlannedProvider {
  readonly id: ProviderId;
  readonly selected: boolean;
  readonly reason: string;
  readonly requiredOutcome: true;
  readonly setup: ProviderSetup;
}
/** Immutable selection and identity shared by all jobs in one workflow run. */
export interface HygienePlan {
  readonly schemaVersion: "1";
  readonly id: string;
  readonly mode: "affected" | "full";
  readonly commitSha: string;
  readonly workflowRunId: string;
  readonly changes: GitChangeSet;
  readonly affectedProjects: readonly string[];
  readonly suites: readonly TypeScriptSuiteName[];
  readonly providers: readonly PlannedProvider[];
  readonly diagnostics: readonly PlanningDiagnostic[];
}
/** Existing matrix shape with plan-owned work/setup decisions. */
export interface ProviderMatrixEntry {
  readonly id: ProviderId;
  readonly label: string;
  readonly selected: boolean;
  readonly "root-node-deps": boolean;
  readonly "needs-dotnet": boolean;
  readonly "needs-python": boolean;
  readonly "build-components": boolean;
  readonly "generate-artifacts": boolean;
}
