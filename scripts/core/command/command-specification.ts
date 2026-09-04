/**
 * @fileoverview Every command facet, the injected command host, and the discriminated
 * construction options a lazy command is built from.
 * @module scripts/core/command/command-specification
 *
 * @remarks
 * `CommandSpecification` is the composed shape `defineLazyCommand` accepts: identity, input
 * decoding, lazy workflow loading, and lazy presentation loading. `DirectCommandSpecification` is
 * the simpler, eager shape `defineCommand` accepts for a command with no separate feature module.
 * Neither this module nor any other module under `scripts/core/` names a concrete infrastructure
 * implementation: {@link CommandConstructionOptions} is a discriminated union, so a caller either
 * injects a ready {@link CommandHost} or supplies a literal `loadHost` loader it owns.
 */

import type {Command} from "commander";

import type {TerminalPresenter} from "../presentation/terminal-presenter.ts";
import type {RuntimeExecutionContext} from "../runtime/runtime-execution-context.ts";
import type {WorkflowEvent} from "../presentation/workflow-event.ts";
import type {CommandWorkflowModuleDefinition} from "../workflow/workflow-composition.ts";
import type {WorkflowExecutionResult} from "../workflow/workflow-execution-result.ts";
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

/** The injected seam through which a command reaches parse presentation and its runtime factory. */
export interface CommandHost extends CommandProcessHost {
  /** Creates the human presenter used for help and usage output before typed input exists. */
  readonly createParsePresenter: () => TerminalPresenter;
  /** Loads the runtime factory used to create root and child scopes for this invocation. */
  readonly loadRuntimeFactory: (verbose: boolean) => Promise<CommandRuntimeFactory>;
}

/**
 * A caller either injects a ready `host` or a literal `loadHost` loader it owns. Core therefore
 * never names a concrete host module: the only edge from a command into the Node-backed host
 * belongs to the entrypoint module that declares its own loader.
 */
export type CommandConstructionOptions =
  Readonly<{host: CommandHost; loadHost?: never}> | Readonly<{loadHost: () => Promise<CommandHost>; host?: never}>;

/** Options a command lifecycle passes when it asks the factory to create one runtime scope. */
export interface RuntimeCreationOptions {
  readonly presentation: CommandPresentationMode;
  readonly signal?: AbortSignal;
  /** Whether the created scope owns SIGINT and SIGTERM registration. */
  readonly registerProcessSignals: boolean;
}

/** Creates every runtime scope one command lifecycle needs. Owns runtime scope creation only. */
export interface CommandRuntimeFactory {
  readonly createRoot: (options: Readonly<RuntimeCreationOptions>) => Promise<RuntimeExecutionContext>;
  readonly createChild: (
    parent: Readonly<CommandExecutionContext>,
    options: Readonly<RuntimeCreationOptions>,
  ) => Promise<RuntimeExecutionContext>;
}

/** Options accepted by a programmatic or composed command invocation. */
export interface CommandInvocationOptions {
  /**
   * Parent scope of a composed child invocation, typed as the *base* execution context. An
   * extended context is structurally assignable to it, so no caller needs a cast.
   */
  readonly parent?: Readonly<CommandExecutionContext>;
  /** Presentation override; defaults to `"silent"` for nested composition. */
  readonly presentation?: CommandPresentationMode;
  readonly signal?: AbortSignal;
}

/** Identity and help configuration of one command; `usage` defaults to `"[options]"`. */
export interface CommandIdentityDefinition {
  readonly name: string;
  readonly description: string;
  readonly usage?: string;
  readonly examples?: readonly string[];
  /** Exact-match slash aliases in addition to the always-registered `/h` and `/help`. */
  readonly slashAliases?: Readonly<Record<string, string>>;
}

/** Parser configuration, decoding, and presentation selection for one command's typed input. */
export interface CommandInputDefinition<TInput> {
  readonly configure: (program: Command) => void;
  /** Converts parsed Commander state into one typed input, owning semantic validation. */
  readonly decode: (program: Command) => TInput;
  /** Selects presentation from typed input; defaults to `"human"` when omitted. */
  readonly presentation?: (input: Readonly<TInput>) => CommandPresentationMode;
}

/** Lazy loading of the feature workflow module a command's business behavior lives in. */
export interface CommandWorkflowLoadingDefinition<TInput, TOutput, TFailure> {
  /** Literal dynamic import of the feature workflow module. Never called on a help, version, or usage path. */
  readonly loadWorkflow: () => Promise<CommandWorkflowModuleDefinition<TInput, TOutput, TFailure>>;
}

/** Workflow results a feature presenter may receive: an `interrupted` result never reaches it. */
export type PresentableWorkflowExecutionResult<TOutput, TFailure> = Exclude<
  WorkflowExecutionResult<TOutput, TFailure>,
  {readonly kind: "interrupted"}
>;

/** The presentation decision a feature reporter returns for one presentable workflow result. */
export type CommandPresentationDecision<TOutput> =
  | {readonly kind: "complete"; readonly completion: CommandCompletion<TOutput>}
  | {readonly kind: "fail"; readonly failure: FeatureCommandFailure};

/** The lazily loaded presentation module: the reporter owns `present` and optional `reportEvent`. */
export interface CommandResultPresenterDefinition<TOutput, TFailure> {
  readonly present: (
    result: PresentableWorkflowExecutionResult<TOutput, TFailure>,
    context: Readonly<CommandExecutionContext>,
  ) => CommandPresentationDecision<TOutput> | Promise<CommandPresentationDecision<TOutput>>;
  /** Optional observer for lifecycle events published while the workflow ran. */
  readonly reportEvent?: (event: WorkflowEvent, context: Readonly<CommandExecutionContext>) => void;
}

/** Lazy loading of the feature reporter a command's presentation behavior lives in. */
export interface CommandPresentationDefinition<TOutput, TFailure> {
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
export type DirectCommandSpecification<TInput, TOutput, TRuntime extends RuntimeExecutionContext = RuntimeExecutionContext> = Readonly<
  CommandIdentityDefinition
    & CommandInputDefinition<TInput> & {
      /**
       * Optional runtime-context extension applied before `execute`; Task 4 gave Doctor, Setup,
       * and Status their repository-analysis extension through it. `parent` is the *base*
       * execution context, structurally assignable from an extended one, and arrives only through
       * the workflow-module channel: `defineCommand`'s generated
       * `createContext(input, context, parent)` forwards the same `parent` `invoke({parent})`
       * received — never the runtime factory's `createChild`.
       */
      readonly createRuntimeContext?: (baseRuntime: RuntimeExecutionContext, parent?: Readonly<CommandExecutionContext>) => TRuntime;
      /** Runs business orchestration for one invocation. */
      readonly execute: (context: Readonly<CommandExecutionContext<TRuntime>>, input: Readonly<TInput>) => Promise<TOutput>;
      /** Builds the deferred completion for one completed business output. */
      readonly complete: (
        output: Readonly<TOutput>,
        context: Readonly<CommandExecutionContext<TRuntime>>,
      ) => CommandCompletion<TOutput> | Promise<CommandCompletion<TOutput>>;
    }
>;
