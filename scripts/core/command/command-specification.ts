/**
 * @fileoverview Every command facet, the injected command host, and the discriminated
 * construction options a lazy command is built from.
 * @module scripts/core/command/command-specification
 *
 * @remarks
 * `CommandSpecification` is the composed shape `defineLazyCommand` accepts: identity, input
 * decoding, lazy workflow loading, and lazy presentation loading. `DirectCommandSpecification` is
 * the simpler, eager shape `defineCommand` accepts for a command with no separate feature module;
 * `defineCommand` adapts it onto the lazy contract. Neither this module nor any other module under
 * `scripts/core/` names a concrete adapter: {@link CommandConstructionOptions} is a discriminated
 * union so a caller either injects a ready {@link CommandHost} or a literal `loadHost` loader it
 * owns.
 */

import type {Command} from "commander";

import type {MonorepositoryLogger} from "../../common/logger.ts";
import type {CommandRuntime} from "../../common/runtime.ts";
import type {WorkflowEvent} from "../presentation/workflow-event.ts";
import type {WorkflowExecutionResult} from "../workflow/workflow-execution-result.ts";
import type {CommandWorkflowModuleDefinition} from "../workflow/workflow-composition.ts";
import type {
  CommandCompletion,
  CommandExecutionContext,
  CommandExitCode,
  CommandPresentationMode,
  FeatureCommandFailure,
} from "./command-execution.ts";

/** Ambient process facts and effects the command host is allowed to depend on. */
export interface CommandProcessHost {
  /** Immutable invocation argv, excluding the executable and script path. */
  readonly argv: readonly string[];
  /** Reports whether `moduleUrl` is the module the process was started with. */
  readonly isDirectEntry: (moduleUrl: string) => boolean;
  /** Requests the final process exit code. */
  readonly setExitCode: (exitCode: CommandExitCode) => void;
}

/** The injected seam through which a command reaches parsing presentation and its runtime factory. */
export interface CommandHost extends CommandProcessHost {
  /** Creates the human presenter used for help and usage output before typed input exists. */
  readonly createParsePresenter: () => MonorepositoryLogger;
  /** Loads the runtime factory used to create root and child scopes for this invocation. */
  readonly loadRuntimeFactory: (verbose: boolean) => Promise<CommandRuntimeFactory>;
}

/**
 * Construction options are a discriminated union: a caller either injects a ready `host` or a
 * literal `loadHost` loader it owns. Core therefore never names a concrete host module, and the
 * only edge from a command into `scripts/adapters/node/node-command-host.ts` belongs to the
 * command module that declares its own loader.
 */
export type CommandConstructionOptions =
  | Readonly<{host: CommandHost; loadHost?: never}>
  | Readonly<{loadHost: () => Promise<CommandHost>; host?: never}>;

/** Options a command lifecycle passes when it asks the factory to create one runtime scope. */
export interface RuntimeCreationOptions {
  /** Presentation mode the created scope's logger must honor. */
  readonly presentation: CommandPresentationMode;
  /** Caller cancellation signal linked into the created scope. */
  readonly signal?: AbortSignal;
  /** Whether the created scope owns SIGINT and SIGTERM registration. */
  readonly registerProcessSignals: boolean;
}

/** Creates every runtime scope one command lifecycle needs. Owns runtime scope creation only. */
export interface CommandRuntimeFactory {
  /** Creates an owned root scope. */
  readonly createRoot: (options: Readonly<RuntimeCreationOptions>) => Promise<CommandRuntime>;
  /** Creates a nested scope derived from an owning parent context. */
  readonly createChild: (
    parent: Readonly<CommandExecutionContext>,
    options: Readonly<RuntimeCreationOptions>,
  ) => Promise<CommandRuntime>;
}

/** Options accepted by a programmatic or composed command invocation. */
export interface CommandInvocationOptions {
  /**
   * Parent scope of a composed child invocation, typed as the *base* execution context. An
   * extended context (for example an inspection-narrowed context) is structurally assignable to
   * it, so no caller needs a cast.
   */
  readonly parent?: Readonly<CommandExecutionContext>;
  /** Presentation override; defaults to `"silent"` for nested composition. */
  readonly presentation?: CommandPresentationMode;
  /** Caller cancellation signal linked into the created scope. */
  readonly signal?: AbortSignal;
}

/** Identity and help configuration of one command. */
interface CommandIdentityDefinition {
  /** Program name shown in help output. */
  readonly name: string;
  /** One-line description shown in help output. */
  readonly description: string;
  /** Optional usage line; defaults to `"[options]"`. */
  readonly usage?: string;
  /** Optional example invocations appended to help output. */
  readonly examples?: readonly string[];
  /** Optional exact-match slash aliases in addition to `/h` and `/help`. */
  readonly slashAliases?: Readonly<Record<string, string>>;
}

/** Parser configuration, decoding, and presentation selection for one command's typed input. */
interface CommandInputDefinition<TInput> {
  /** Declares Commander arguments and options on a fresh parser. */
  readonly configure: (program: Command) => void;
  /** Converts parsed Commander state into one typed input, owning semantic validation. */
  readonly decode: (program: Command) => TInput;
  /** Selects presentation from typed input; defaults to `"human"` when omitted. */
  readonly presentation?: (input: Readonly<TInput>) => CommandPresentationMode;
}

/** Lazy loading of the feature workflow module a command's business behavior lives in. */
interface CommandWorkflowLoadingDefinition<TInput, TOutput, TFailure> {
  /** Literal dynamic import of the feature workflow module. Never called on a help, version, or usage path. */
  readonly loadWorkflow: () => Promise<CommandWorkflowModuleDefinition<TInput, TOutput, TFailure>>;
}

/** Workflow results a feature presenter may receive: an `interrupted` result never reaches it. */
export type PresentableWorkflowExecutionResult<TOutput, TFailure> = Exclude<
  WorkflowExecutionResult<TOutput, TFailure>,
  {readonly kind: "interrupted"}
>;

/** The presentation decision a feature reporter returns for one presentable workflow result. */
type CommandPresentationDecision<TOutput> =
  | {readonly kind: "complete"; readonly completion: CommandCompletion<TOutput>}
  | {readonly kind: "fail"; readonly failure: FeatureCommandFailure};

/** The lazily loaded presentation module: the reporter owns `present` and optional `reportEvent`. */
export interface CommandResultPresenterDefinition<TOutput, TFailure> {
  /** Maps one presentable workflow result to a presentation decision. */
  readonly present: (
    result: PresentableWorkflowExecutionResult<TOutput, TFailure>,
    context: Readonly<CommandExecutionContext>,
  ) => CommandPresentationDecision<TOutput> | Promise<CommandPresentationDecision<TOutput>>;
  /** Optional observer for lifecycle events published while the workflow ran. */
  readonly reportEvent?: (event: WorkflowEvent, context: Readonly<CommandExecutionContext>) => void;
}

/** Lazy loading of the feature reporter a command's presentation behavior lives in. */
interface CommandPresentationDefinition<TOutput, TFailure> {
  /** Literal dynamic import of the feature reporter module. Never called on a help, version, or usage path. */
  readonly loadPresentation: () => Promise<CommandResultPresenterDefinition<TOutput, TFailure>>;
}

/** Declarative description of one composed command's parser, workflow loading, and presentation loading. */
export type CommandSpecification<TInput, TOutput, TFailure> = Readonly<
  CommandIdentityDefinition
  & CommandInputDefinition<TInput>
  & CommandWorkflowLoadingDefinition<TInput, TOutput, TFailure>
  & CommandPresentationDefinition<TOutput, TFailure>
>;

/** Declarative description of one direct (non-composed) command's parser and eager business behavior. */
export type DirectCommandSpecification<TInput, TOutput, TRuntime extends CommandRuntime = CommandRuntime> = Readonly<
  CommandIdentityDefinition
  & CommandInputDefinition<TInput>
  & {
    /**
     * Optional runtime-context extension applied before `execute` (Doctor/Setup/Status supply the
     * inspection extension in Task 3). `parent` is the *base* execution context, structurally
     * assignable from an extended one, and arrives only through the workflow-module channel:
     * `defineCommand`'s generated `createContext(input, context, parent)` forwards the same
     * `parent` `invoke({parent})` received — never read from the runtime factory or `createChild`.
     */
    readonly createRuntimeContext?: (baseRuntime: CommandRuntime, parent?: Readonly<CommandExecutionContext>) => TRuntime;
    /** Runs business orchestration for one invocation. */
    readonly execute: (context: Readonly<CommandExecutionContext<TRuntime>>, input: Readonly<TInput>) => Promise<TOutput>;
    /** Builds the deferred completion for one completed business output. */
    readonly complete: (
      output: Readonly<TOutput>,
      context: Readonly<CommandExecutionContext<TRuntime>>,
    ) => CommandCompletion<TOutput> | Promise<CommandCompletion<TOutput>>;
  }
>;
