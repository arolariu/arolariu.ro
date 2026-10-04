/**
 * @fileoverview Shared setup orchestration contracts.
 * @module scripts/commands/setup/types
 *
 * @remarks
 * The Effect kernel runs {@link SetupPhaseDefinition}s: each phase reads the shared
 * {@link SetupContext} and every capability from the {@link SetupRequirements} services, and submits
 * each mutation as a {@link SetupAction} through the consent-gated `SetupActions` service. The
 * `Legacy*` contracts are the Promise phase model the unmigrated phases still implement; the
 * temporary `legacyPhase` adapter (`./legacy-phase.ts`) runs them under the Effect kernel. They are
 * deleted in Task 5.5.
 */

import type {Effect, PlatformError} from "effect";

import type {CommandContext, CommandExecution} from "../../common/commander.ts";
import type {MonorepositoryLogger} from "../../common/logger.ts";
import type {PromptProvider} from "../../common/prompts.ts";
import type {RepositoryPaths} from "../../common/repository-paths.ts";
import type {RepositoryRequirements} from "../../common/requirements.ts";
import type {ProcessRunner} from "../../common/runner.ts";
import type {Clock, FileSystem, HttpClient, RuntimeEnvironment, TaskScheduler} from "../../common/runtime.ts";
import type {ContainerEngine} from "../../container-runtime/types.ts";
import type {Inspection} from "../../inspection/Inspection.ts";
import type {RepositoryInspectionSession} from "../../inspection/repository.ts";
import type {LegacyRepositoryInspectionSession} from "../../platform/bridge.ts";
import type {PlatformServices} from "../../platform/layers.ts";
import type {ProcessError, ProcessRequest} from "../../platform/Process.ts";
import type {Prompts} from "../../platform/Prompts.ts";
import type {GenerateInput, GenerateResult} from "../generate/index.ts";
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

/**
 * Command-line options shared by setup phases.
 *
 * @deprecated Use {@link SetupInput}; this alias exists only until every specialist phase and its
 * tests have migrated to the command runtime.
 */
export type SetupOptions = SetupInput;

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

/**
 * One dependency-aware legacy Promise setup phase, run under the Effect kernel by `legacyPhase`.
 *
 * @remarks Deleted in Task 5.5.
 */
export interface LegacySetupPhaseDefinition {
  /** Stable phase identifier. */
  readonly id: string;
  /** Human-readable phase title. */
  readonly title: string;
  /** Whether failure blocks overall setup success. */
  readonly required: boolean;
  /** Phase identifiers that must be considered first. */
  readonly dependsOn: readonly string[];
  /** Executes the phase with injected setup dependencies. */
  readonly run: (context: LegacySetupContext) => Promise<SetupPhaseResult>;
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

/**
 * One explicitly controlled legacy Promise setup mutation.
 *
 * @remarks Deleted in Task 5.5.
 */
export interface LegacySetupAction {
  /** Stable action identifier. */
  readonly id: string;
  /** Mutation ownership boundary. */
  readonly scope: SetupActionScope;
  /** Human-readable non-secret action summary. */
  readonly summary: string;
  /** Performs the mutation. */
  readonly execute: () => Promise<void>;
}

/**
 * Evaluates consent and dry-run policy before legacy setup mutations.
 *
 * @remarks Deleted in Task 5.5.
 */
export interface LegacySetupActionExecutor {
  /** Runs, plans, or declines an action according to setup options. */
  readonly run: (action: Readonly<LegacySetupAction>) => Promise<SetupActionDisposition>;
}

/**
 * Invocation-scoped capabilities a legacy setup phase observes instead of ambient Node state.
 *
 * @remarks
 * The bundle is assembled once per phase run. Its {@link LegacySetupPhaseRuntime.runner} is
 * already scoped to the repository root, the phase cancellation signal, and the bounded default
 * timeout. Deleted in Task 5.5.
 */
export interface LegacySetupPhaseRuntime {
  /** The owning legacy command invocation context; absent when the Effect kernel runs the phase. */
  readonly command?: CommandContext;
  /** Phase-scoped child-process runner. */
  readonly runner: ProcessRunner;
  /** Filesystem capability. */
  readonly files: FileSystem;
  /** HTTP capability. */
  readonly http: HttpClient;
  /** Time capability used for every phase duration. */
  readonly clock: Clock;
  /** Task orchestration capability used instead of raw `Promise` combinators. */
  readonly tasks: TaskScheduler;
  /** Immutable snapshot of the ambient environment. */
  readonly environment: RuntimeEnvironment;
  /** Formerly the nested generation invocation; under the Effect kernel it throws, because no legacy phase may compose generation. */
  readonly invokeGenerate: (input: Readonly<GenerateInput>) => Promise<CommandExecution<GenerateResult>>;
}

/**
 * Dependencies shared by every legacy setup phase.
 *
 * @remarks Deleted in Task 5.5.
 */
export interface LegacySetupContext {
  /** Typed setup input. */
  readonly options: SetupInput;
  /** Canonical repository paths. */
  readonly paths: RepositoryPaths;
  /** Manifest-derived repository requirements. */
  readonly requirements: RepositoryRequirements;
  /** One full repository inspection session shared by every setup phase. */
  readonly inspection: LegacyRepositoryInspectionSession;
  /** Invocation-scoped capabilities every legacy phase reads. */
  readonly runtime: LegacySetupPhaseRuntime;
  /** Injected prompt provider. */
  readonly prompts: PromptProvider;
  /** Policy-controlled mutation executor. */
  readonly actions: LegacySetupActionExecutor;
  /** Setup logger. */
  readonly logger: MonorepositoryLogger;
}

/**
 * Reads the invocation-scoped capability bundle a legacy setup phase requires.
 *
 * @remarks Deleted in Task 5.5.
 *
 * @param context - The setup context handed to the phase.
 * @returns The phase runtime capabilities.
 * @throws When the context carries no phase runtime, which can only mean the phase ran outside the
 * setup command that owns the invocation.
 */
export function requireLegacySetupPhaseRuntime(context: Readonly<LegacySetupContext>): LegacySetupPhaseRuntime {
  const {runtime} = context;
  if (runtime === undefined) {
    throw new Error("This setup phase requires an invocation-scoped setup phase runtime, but the setup context carries none.");
  }

  return runtime;
}
