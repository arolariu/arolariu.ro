/**
 * @fileoverview Shared setup orchestration contracts.
 * @module scripts.setup.types
 */

import type {ContainerEngine} from "./container-runtime/types.ts";
import type {MonorepositoryLogger} from "./common/logger.ts";
import type {CommandRunner, CommandSpec} from "./common/process.ts";
import type {PromptProvider} from "./common/prompts.ts";
import type {RepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";

/** Terminal status reported by one setup phase. */
export type SetupStatus = "succeeded" | "failed" | "skipped" | "degraded";

/** Command-line options shared by setup phases. */
export interface SetupOptions {
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
  /** Executes the phase with injected setup dependencies. */
  readonly run: (context: SetupContext) => Promise<SetupPhaseResult>;
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
  /** Performs the mutation. */
  readonly execute: () => Promise<void>;
}

/** Proposed installation command and rationale. */
export interface InstallationProposal {
  /** Installation command to run. */
  readonly command: CommandSpec;
  /** Reason the installation is needed. */
  readonly explanation: string;
}

/** Evaluates consent and dry-run policy before setup mutations. */
export interface SetupActionExecutor {
  /** Runs, plans, or declines an action according to setup options. */
  readonly run: (action: Readonly<SetupAction>) => Promise<SetupActionDisposition>;
}

/** Dependencies shared by every setup phase. */
export interface SetupContext {
  /** Parsed setup options. */
  readonly options: SetupOptions;
  /** Canonical repository paths. */
  readonly paths: RepositoryPaths;
  /** Manifest-derived repository requirements. */
  readonly requirements: RepositoryRequirements;
  /** Injected command runner. */
  readonly runner: CommandRunner;
  /** Injected prompt provider. */
  readonly prompts: PromptProvider;
  /** Policy-controlled mutation executor. */
  readonly actions: SetupActionExecutor;
  /** Setup logger. */
  readonly logger: MonorepositoryLogger;
  /** Monotonic time source used for phase durations. */
  readonly now: () => number;
}
