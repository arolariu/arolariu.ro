/**
 * @fileoverview Shared setup orchestration contracts.
 * @module scripts/commands/setup/types
 *
 * @remarks
 * The Effect kernel runs {@link SetupPhaseDefinition}s: each phase reads the shared
 * {@link SetupContext} and every capability from the {@link SetupRequirements} services, and submits
 * each mutation as a {@link SetupAction} through the consent-gated `SetupActions` service.
 */

import type {Effect, PlatformError} from "effect";

import type {RepositoryPaths} from "../../common/repository-paths.ts";
import type {RepositoryRequirements} from "../../common/requirements.ts";
import type {ContainerEngine} from "../../container-runtime/types.ts";
import type {Inspection} from "../../inspection/Inspection.ts";
import type {RepositoryInspectionSession} from "../../inspection/repository.ts";
import type {PlatformServices} from "../../platform/layers.ts";
import type {ProcessError, ProcessRequest} from "../../platform/Process.ts";
import type {Prompts} from "../../platform/Prompts.ts";
import type {SetupActions} from "./actions.ts";
import type {SetupActionFailed} from "./errors.ts";

/** Terminal status reported by one setup phase. */
export type SetupStatus = "succeeded" | "failed" | "skipped" | "degraded";

/** Typed input accepted by the setup command and shared by every setup phase. */
export interface SetupInput {
  /** Enables diagnostic output. */
  readonly verbose: boolean;
  /** Plans mutations without executing them. */
  readonly dryRun: boolean;
  /** Approves system-scoped mutations without prompting. */
  readonly yes: boolean;
  /** Optional explicitly selected container engine. */
  readonly engine?: ContainerEngine;
}

/** Completed setup phase outcome and supporting evidence. */
export interface SetupPhaseResult {
  /** Stable phase identifier. */
  readonly id: string;
  /** Phase outcome. */
  readonly status: SetupStatus;
  /** Human-readable result summary. */
  readonly summary: string;
  /** Facts supporting the result. */
  readonly evidence: readonly string[];
  /** Recommended follow-up work. */
  readonly nextActions: readonly string[];
  /** Elapsed wall-clock duration. */
  readonly durationMs: number;
}

/** Every service a setup phase or setup action may require. */
export type SetupRequirements = PlatformServices | Prompts | SetupActions | Inspection;

/** The invocation state shared by every setup phase. */
export interface SetupContext {
  /** Typed setup input. */
  readonly options: SetupInput;
  /** Canonical repository paths. */
  readonly paths: RepositoryPaths;
  /** Manifest-derived repository requirements. */
  readonly requirements: RepositoryRequirements;
  /** The one full repository inspection session shared by every setup phase. */
  readonly inspection: RepositoryInspectionSession;
}

/** One dependency-aware setup phase. */
export interface SetupPhaseDefinition {
  /** Stable phase identifier. */
  readonly id: string;
  /** Human-readable phase title. */
  readonly title: string;
  /** Whether failure blocks overall setup success. */
  readonly required: boolean;
  /** Phase identifiers that must be considered first. */
  readonly dependsOn: readonly string[];
  /**
   * Runs the phase. A defect becomes one `failed` result; an interruption cancels the whole
   * setup invocation.
   */
  readonly run: (context: SetupContext) => Effect.Effect<SetupPhaseResult, never, SetupRequirements>;
}

/** Ownership boundary for a setup mutation. */
export type SetupActionScope = "repository" | "user" | "system";

/** Outcome of evaluating one setup mutation. */
export type SetupActionDisposition = "executed" | "planned" | "declined";

/** One explicitly controlled setup mutation. */
export interface SetupAction {
  /** Stable action identifier. */
  readonly id: string;
  /** Mutation ownership boundary. */
  readonly scope: SetupActionScope;
  /** Human-readable non-secret action summary. */
  readonly summary: string;
  /** Performs the mutation; `SetupActions.run` runs it only after the dry-run and consent checks. */
  readonly execute: Effect.Effect<void, SetupActionFailed | ProcessError | PlatformError.PlatformError, SetupRequirements>;
}

/** Proposed installation command and rationale. */
export interface InstallationProposal {
  /** Installation command to run. */
  readonly command: ProcessRequest;
  /** Reason the installation is needed. */
  readonly explanation: string;
}
