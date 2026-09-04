/**
 * @fileoverview Shared command lifecycle template: parsing, lazy loading, execution, ordered
 * presentation and cleanup, and failure classification, common to every composed command.
 * @module scripts/core/command/abstract-monorepo-command
 *
 * @remarks
 * `AbstractMonorepoCommand` resolves its host from exactly one place: the `host` supplied at
 * construction, or one memoized call of the supplied `loadHost()`. It names no concrete
 * infrastructure module in an import specifier, a dynamic import, or a type position, and it has
 * no default host — every capability arrives through the injected {@link CommandHost}.
 * `loadWorkflow()`/`loadPresentation()` are awaited concurrently only after a root or child scope
 * exists; the presentation decision is computed before cleanup drains, and
 * `CommandCompletion.human`/`.json` are emitted only after cleanup has drained.
 */

import {Command, CommanderError} from "commander";

import type {MonorepositoryLogger} from "../../common/logger.ts";
import {CommandCancellation, commandCancellationFromSignal, type CleanupFailure, type CommandRuntime} from "../../common/runtime.ts";
import {
  CommandConfigurationError,
  CommandInputError,
  describeCommandFailureEvidence,
  formatCommandFailureDiagnostic,
  normalizeSlashArguments,
  registerInvocationArgv,
  type CommandCompletion,
  type CommandExecution,
  type CommandExecutionContext,
  type CommandFailure,
  type CommandFailureKind,
  type CommandInvoker,
  type CommandPresentationMode,
} from "./command-execution.ts";
import type {
  CommandConstructionOptions,
  CommandHost,
  CommandInvocationOptions,
  CommandResultPresenterDefinition,
  CommandSpecification,
  PresentableWorkflowExecutionResult,
  RuntimeCreationOptions,
} from "./command-specification.ts";
import type {CommandWorkflowModuleDefinition} from "../workflow/workflow-composition.ts";

/** Commander codes meaning help/version text was displayed rather than a failure. */
const COMMANDER_HELP_CODES: ReadonlySet<string> = new Set(["commander.help", "commander.helpDisplayed", "commander.version"]);

const isAbortError = (error: unknown): error is Error => error instanceof Error && error.name === "AbortError";
const isCommanderHelpRequest = (error: unknown): boolean => error instanceof CommanderError && COMMANDER_HELP_CODES.has(error.code);
const readVerboseFlag = (input: unknown): boolean =>
  typeof input === "object" && input !== null && (input as Readonly<Record<string, unknown>>)["verbose"] === true;

/** Failure outcomes the lifecycle can produce, carrying their own exit meaning. */
type NormalizedFailure =
  | {readonly status: "failed"; readonly failure: CommandFailure; readonly exitCode: 1 | 2}
  | {readonly status: "cancelled"; readonly failure: CommandFailure; readonly exitCode: 130 | 143};

const failedWith = (
  kind: Exclude<CommandFailureKind, "cancelled">,
  exitCode: 1 | 2,
  message: string,
  evidence: readonly string[] = [],
  cause?: unknown,
): NormalizedFailure => ({status: "failed", exitCode, failure: {kind, message, evidence, ...(cause === undefined ? {} : {cause})}});

const cancelledWith = (exitCode: 130 | 143, message: string, evidence: readonly string[] = [], cause?: unknown): NormalizedFailure => ({
  status: "cancelled",
  exitCode,
  failure: {kind: "cancelled", message, evidence, ...(cause === undefined ? {} : {cause})},
});

/** Classifies one thrown value into a normalized failure, never a success-shaped default. */
function normalizeThrownFailure(error: unknown, signal?: AbortSignal): NormalizedFailure {
  if (error instanceof CommandInputError) {
    return failedWith("usage", 2, error.message, [], error);
  }
  if (error instanceof CommandCancellation) {
    return cancelledWith(error.exitCode, error.message, [], error);
  }
  if (isAbortError(error)) {
    const cancellation = signal?.aborted === true ? commandCancellationFromSignal(signal) : new CommandCancellation(error.message, 130);
    return cancelledWith(cancellation.exitCode, cancellation.message, [], error);
  }
  if (error instanceof Error) {
    return failedWith("operational", 1, error.message, describeCommandFailureEvidence(error), error);
  }
  return failedWith("internal", 1, `Command failed with a non-error value: ${String(error)}`, [], error);
}

const cleanupEvidence = (failures: readonly CleanupFailure[]): readonly string[] =>
  failures.map((failure) => `${failure.label}: ${failure.message}`);

/** Drains cleanup without letting a failing registry itself escape the command boundary. */
async function drainCleanup(runtime: Readonly<CommandRuntime>): Promise<readonly CleanupFailure[]> {
  try {
    return await runtime.cleanup.drain();
  } catch (error: unknown) {
    return [{label: "cleanup registry", message: error instanceof Error ? error.message : String(error), cause: error}];
  }
}

function mergeCleanupEvidence(base: NormalizedFailure, failures: readonly CleanupFailure[]): NormalizedFailure {
  if (failures.length === 0) {
    return base;
  }
  return {...base, failure: {...base.failure, evidence: [...base.failure.evidence, ...cleanupEvidence(failures)]}};
}

/** Outcome of one business execution attempt, before cleanup and presentation output run. */
type ExecutionAttempt<TOutput> =
  | {readonly kind: "produced"; readonly completion: CommandCompletion<TOutput>}
  | {readonly kind: "failed"; readonly failure: NormalizedFailure};

/**
 * Owns the shared command lifecycle template every composed command relies on: fresh parser
 * construction, alias normalization, presentation selection, injected host resolution, lazy
 * workflow/presentation loading, failure normalization, and cleanup-before-presentation ordering.
 */
export abstract class AbstractMonorepoCommand<TInput, TOutput, TFailure> implements CommandInvoker<TInput, TOutput> {
  readonly #specification: CommandSpecification<TInput, TOutput, TFailure>;
  readonly #options: Readonly<CommandConstructionOptions>;
  #hostPromise: Promise<CommandHost> | undefined;

  /**
   * @param specification - The command's identity, input, workflow-loading, and presentation facets.
   * @param options - The injected `host` or a literal `loadHost` loader this command owns.
   * @throws {CommandConfigurationError} When `options` carries neither `host` nor `loadHost`.
   */
  public constructor(specification: CommandSpecification<TInput, TOutput, TFailure>, options: Readonly<CommandConstructionOptions>) {
    if (options.host === undefined && options.loadHost === undefined) {
      throw new CommandConfigurationError(`Command "${specification.name}" was constructed without a command host or host loader.`);
    }
    this.#specification = specification;
    this.#options = options;
  }

  /**
   * Runs the command from argv, decoding, executing, draining cleanup, then rendering completion.
   *
   * @param argv - Invocation tokens; read from the command host when omitted.
   */
  public async run(argv?: readonly string[]): Promise<CommandExecution<TOutput>> {
    const host = await this.#resolveHost();
    const parsePresenter = host.createParsePresenter();
    const invocationArgv = Object.freeze([...(argv ?? host.argv)]);
    const program = this.#createInvocationProgram(parsePresenter);
    registerInvocationArgv(program, invocationArgv);

    let input: TInput;
    try {
      await program.parseAsync([...normalizeSlashArguments(invocationArgv, this.#specification.slashAliases)], {from: "user"});
      input = this.#specification.decode(program);
    } catch (error: unknown) {
      if (isCommanderHelpRequest(error)) {
        return {status: "help", exitCode: 0};
      }
      if (error instanceof CommanderError) {
        // Commander already rendered its own message and usage hint through the parse presenter.
        return failedWith("usage", 2, error.message, [], error);
      }
      return this.#reportToParsePresenter(parsePresenter, normalizeThrownFailure(error));
    }

    let presentation: CommandPresentationMode;
    let runtime: CommandRuntime;
    try {
      presentation = this.#specification.presentation?.(input) ?? "human";
      const factory = await host.loadRuntimeFactory(readVerboseFlag(input));
      runtime = await factory.createRoot({presentation, registerProcessSignals: true});
    } catch (error: unknown) {
      return this.#reportToParsePresenter(parsePresenter, normalizeThrownFailure(error));
    }

    return this.#runLifecycle({runtime, presentation}, input);
  }

  /**
   * Runs the command from typed input, skipping argv and Commander; no OS signal handler or exit
   * code is ever written.
   *
   * @param input - Typed command input.
   * @param options - Optional parent context, presentation override, and caller signal.
   */
  public async invoke(input: Readonly<TInput>, options: Readonly<CommandInvocationOptions> = {}): Promise<CommandExecution<TOutput>> {
    const presentation = options.presentation ?? "silent";
    let runtime: CommandRuntime;
    try {
      const host = await this.#resolveHost();
      const factory = await host.loadRuntimeFactory(readVerboseFlag(input));
      const creationOptions: RuntimeCreationOptions = {
        presentation,
        registerProcessSignals: false,
        ...(options.signal === undefined ? {} : {signal: options.signal}),
      };
      runtime =
        options.parent === undefined
          ? await factory.createRoot(creationOptions)
          : await factory.createChild(options.parent, creationOptions);
    } catch (error: unknown) {
      // No parse presenter exists on this path, so the caller receives the normalized outcome only.
      return normalizeThrownFailure(error);
    }

    return this.#runLifecycle({runtime, presentation}, input, options.parent);
  }

  /** Runs the command and assigns its exit code only when `moduleUrl` is the process entrypoint. */
  public async runIfMain(moduleUrl: string): Promise<void> {
    const host = await this.#resolveHost();
    if (!host.isDirectEntry(moduleUrl)) {
      return;
    }
    const execution = await this.run();
    host.setExitCode(execution.exitCode);
  }

  async #resolveHost(): Promise<CommandHost> {
    this.#hostPromise ??= this.#options.host !== undefined ? Promise.resolve(this.#options.host) : this.#options.loadHost();
    return this.#hostPromise;
  }

  #createInvocationProgram(parsePresenter: MonorepositoryLogger): Command {
    const {name, description, usage, examples} = this.#specification;
    const program = new Command()
      .name(name)
      .description(description)
      .usage(usage ?? "[options]")
      .showHelpAfterError()
      .exitOverride()
      .configureOutput({
        writeOut: (text: string) => parsePresenter.write(text, "stdout"),
        writeErr: (text: string) => parsePresenter.write(text, "stderr"),
      });

    if (examples !== undefined && examples.length > 0) {
      program.addHelpText("after", () => ["", "Examples:", ...examples.map((example) => `  ${example}`)].join("\n"));
    }
    this.#specification.configure(program);
    return program;
  }

  #reportToParsePresenter(parsePresenter: MonorepositoryLogger, failure: NormalizedFailure): NormalizedFailure {
    parsePresenter.fatal(formatCommandFailureDiagnostic(failure.failure));
    return failure;
  }

  async #runLifecycle(
    context: Readonly<CommandExecutionContext>,
    input: Readonly<TInput>,
    parent?: Readonly<CommandExecutionContext>,
  ): Promise<CommandExecution<TOutput>> {
    const {runtime} = context;
    let attempt: ExecutionAttempt<TOutput>;

    try {
      attempt = await this.#executeAndDecide(context, input, parent);
    } catch (error: unknown) {
      attempt = {kind: "failed", failure: normalizeThrownFailure(error, runtime.signal)};
    }

    const cleanupFailures = await drainCleanup(runtime);

    if (attempt.kind === "failed") {
      return this.#reportFailure(context, mergeCleanupEvidence(attempt.failure, cleanupFailures));
    }
    if (cleanupFailures.length > 0) {
      return this.#reportFailure(context, failedWith("cleanup", 1, "Command cleanup failed.", cleanupEvidence(cleanupFailures)));
    }

    const presentationFailure = await this.#renderCompletion(attempt.completion, context);
    if (presentationFailure !== undefined) {
      return this.#reportFailure(context, presentationFailure);
    }

    return {status: "completed", value: attempt.completion.value, exitCode: attempt.completion.exitCode};
  }

  /** Loads the workflow and presentation modules, runs the workflow, then computes the decision. */
  async #executeAndDecide(
    context: Readonly<CommandExecutionContext>,
    input: Readonly<TInput>,
    parent?: Readonly<CommandExecutionContext>,
  ): Promise<ExecutionAttempt<TOutput>> {
    const {runtime} = context;
    // No signal here: a caller signal already aborted before this invocation began must still let
    // module loading and execution start normally; cancellation is observed once execution itself
    // reaches the signal (through the workflow runner or the business runner).
    const loaded = await runtime.tasks.parallel<
      CommandWorkflowModuleDefinition<TInput, TOutput, TFailure> | CommandResultPresenterDefinition<TOutput, TFailure>
    >([() => this.#specification.loadWorkflow(), () => this.#specification.loadPresentation()]);
    // `TaskScheduler.parallel` is homogeneous over one `T`; these positional casts recover the
    // exact type each task was authored to load.
    const module = loaded[0] as CommandWorkflowModuleDefinition<TInput, TOutput, TFailure>;
    const presentationModule = loaded[1] as CommandResultPresenterDefinition<TOutput, TFailure>;
    const featureContext = module.createContext(input, context, parent);
    const workflowResult = await module.runWorkflow(featureContext, {
      monotonicNow: runtime.clock.monotonicNow,
      signal: runtime.signal,
      publishEvent: (event) => presentationModule.reportEvent?.(event, context),
    });

    if (workflowResult.kind === "interrupted") {
      const {exitCode, message, evidence} = workflowResult;
      return {kind: "failed", failure: cancelledWith(exitCode, message, evidence)};
    }

    const presentable: PresentableWorkflowExecutionResult<TOutput, TFailure> = workflowResult;
    const decision = await presentationModule.present(presentable, context);
    return decision.kind === "complete"
      ? {kind: "produced", completion: decision.completion}
      : {kind: "failed", failure: {status: "failed", exitCode: 1, failure: decision.failure}};
  }

  async #renderCompletion(
    completion: Readonly<CommandCompletion<TOutput>>,
    context: Readonly<CommandExecutionContext>,
  ): Promise<NormalizedFailure | undefined> {
    const {presentation, runtime} = context;
    if (presentation === "silent") {
      return undefined;
    }

    try {
      if (presentation !== "json") {
        await completion.human?.(runtime.logger);
        return undefined;
      }
      const {json} = completion;
      if (json === undefined) {
        const name = this.#specification.name;
        return failedWith("internal", 1, `Command "${name}" selected JSON presentation without a JSON document.`);
      }
      runtime.logger.json(json);
      return undefined;
    } catch (error: unknown) {
      return normalizeThrownFailure(error, runtime.signal);
    }
  }

  #reportFailure(context: Readonly<CommandExecutionContext>, failure: NormalizedFailure): NormalizedFailure {
    if (context.presentation !== "silent") {
      context.runtime.logger.fatal(formatCommandFailureDiagnostic(failure.failure));
    }
    return failure;
  }
}
