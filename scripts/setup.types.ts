/**
 * @fileoverview Shared setup orchestration contracts.
 * @module scripts.setup.types
 *
 * @remarks
 * A migrated setup phase never reaches for an ambient capability: it reads everything it needs
 * from {@link SetupPhaseRuntime}, the invocation-scoped capability bundle the setup command
 * populates on every {@link SetupContext}. The deprecated {@link SetupContext.runner} and
 * {@link SetupContext.now} members exist only while the .NET, React, Svelte, Python, and
 * infrastructure phases are still being migrated; they are removed with the last of them.
 */

import type {CommandContext, CommandExecution} from "./common/commander.ts";
import type {MonorepositoryLogger} from "./common/logger.ts";
import type {CommandRunner} from "./common/process.ts";
import type {PromptProvider} from "./common/prompts.ts";
import type {RepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import type {ProcessRequest, ProcessRunner} from "./common/runner.ts";
import type {Clock, FileSystem, HttpClient, RuntimeEnvironment, TaskScheduler} from "./common/runtime.ts";
import type {ContainerEngine} from "./container-runtime/types.ts";
import type {GenerateInput, GenerateResult} from "./generate.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";

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
  readonly command: ProcessRequest;
  /** Reason the installation is needed. */
  readonly explanation: string;
}

/** Evaluates consent and dry-run policy before setup mutations. */
export interface SetupActionExecutor {
  /** Runs, plans, or declines an action according to setup options. */
  readonly run: (action: Readonly<SetupAction>) => Promise<SetupActionDisposition>;
}

/**
 * Invocation-scoped capabilities a migrated setup phase observes instead of ambient Node state.
 *
 * @remarks
 * The bundle is assembled once per setup invocation. Its {@link SetupPhaseRuntime.runner} is
 * already scoped to the repository root, the invocation cancellation signal, the phase logger, and
 * the bounded default timeout, and {@link SetupPhaseRuntime.invokeGenerate} is a typed nested
 * invocation of the generation command inside this invocation's own runtime scope — never a
 * spawned sibling script.
 */
export interface SetupPhaseRuntime {
  /** The owning command invocation context, used to scope nested command invocations. */
  readonly command: CommandContext;
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
  /** Runs the generation command as a nested invocation of this setup invocation. */
  readonly invokeGenerate: (input: Readonly<GenerateInput>) => Promise<CommandExecution<GenerateResult>>;
}

/** Dependencies shared by every setup phase. */
export interface SetupContext {
  /** Typed setup input. */
  readonly options: SetupInput;
  /** Canonical repository paths. */
  readonly paths: RepositoryPaths;
  /** Manifest-derived repository requirements. */
  readonly requirements: RepositoryRequirements;
  /** One full repository inspection session shared by every setup phase. */
  readonly inspection: RepositoryInspectionSession;
  /**
   * Injected command runner.
   *
   * @deprecated Read {@link SetupPhaseRuntime.runner} instead; specialist phases remove this by
   * Task 17.
   */
  readonly runner: CommandRunner;
  /**
   * Monotonic time source used for phase durations.
   *
   * @deprecated Read {@link SetupPhaseRuntime.clock} instead; specialist phases remove this by
   * Task 17.
   */
  readonly now: () => number;
  /**
   * Invocation-scoped capabilities every migrated phase reads.
   *
   * @remarks
   * Production always supplies this. It is optional only while unmigrated specialist phase tests
   * still construct a setup context without it; {@link requireSetupPhaseRuntime} converts a
   * missing bundle into an explicit internal contract failure rather than a silent fallback.
   */
  readonly runtime?: SetupPhaseRuntime;
  /** Injected prompt provider. */
  readonly prompts: PromptProvider;
  /** Policy-controlled mutation executor. */
  readonly actions: SetupActionExecutor;
  /** Setup logger. */
  readonly logger: MonorepositoryLogger;
}

/**
 * Reads the invocation-scoped capability bundle a migrated setup phase requires.
 *
 * @param context - The setup context handed to the phase.
 * @returns The phase runtime capabilities.
 * @throws When the context carries no phase runtime, which can only mean the phase ran outside the
 * setup command that owns the invocation.
 */
export function requireSetupPhaseRuntime(context: Readonly<SetupContext>): SetupPhaseRuntime {
  const {runtime} = context;
  if (runtime === undefined) {
    throw new Error("This setup phase requires an invocation-scoped setup phase runtime, but the setup context carries none.");
  }

  return runtime;
}
