/**
 * @fileoverview Engine-neutral declarative command host for legacy commands.
 * @module scripts/common/commander
 *
 * @remarks
 * This module owns the *shape* of a legacy monorepository command invoked from typed input: how
 * failures are normalized into one typed outcome, and in which order cleanup and presentation run.
 * Argv parsing lives in the effect/cli entrypoint (`scripts/cli.ts`), which reaches these commands
 * only through {@link CommandInvoker.invoke}. This module never touches Node's process,
 * filesystem, network, or timer APIs itself: every capability arrives through an injected
 * {@link CommandRuntimeFactory}. The production factory lives in `runtime.node.ts` and is loaded
 * through a lazy dynamic import only when a command was constructed without one, so module
 * initialization here never depends on the Node adapter.
 */

import type {JsonValue} from "../platform/Output.ts";
import type {MonorepositoryLogger} from "./logger.ts";
import {formatProcessRequest, RunnerError} from "./runner.ts";
import {
  CommandCancellation,
  commandCancellationFromSignal,
  FileSystemError,
  HttpError,
  type CleanupFailure,
  type CommandRuntime,
} from "./runtime.ts";

/** Selects human-oriented, machine-readable, or fully suppressed command presentation. */
export type CommandPresentation = "human" | "json" | "silent";

export {toJsonValue, type JsonValue} from "../platform/Output.ts";

/** Identity of one command. */
export interface CommandMetadata {
  /** Command name used as the logger context and in lifecycle diagnostics. */
  readonly name: string;
}

/** Everything one command execution observes about its own invocation. */
export interface CommandContext {
  /** Capabilities owned by this invocation. */
  readonly runtime: CommandRuntime;
  /** Presentation mode selected for this invocation. */
  readonly presentation: CommandPresentation;
}

/** Deferred final presentation and business exit meaning of one completed command. */
export interface CommandCompletion {
  /** `0` when the business operation succeeded, `1` when it completed but reported failure. */
  readonly exitCode: 0 | 1;
  /** Human presentation, invoked only in human mode. */
  readonly human?: (logger: MonorepositoryLogger) => void | Promise<void>;
  /** Machine-readable document, serialized exactly once in JSON mode. */
  readonly json?: JsonValue;
}

/** Declarative description of one command's identity, business behavior, and completion. */
export interface CommandDefinition<TInput, TOutput> {
  /** Command identity. */
  readonly metadata: CommandMetadata;
  /** Runs business orchestration. */
  readonly execute: (context: Readonly<CommandContext>, input: Readonly<TInput>) => Promise<TOutput>;
  /** Maps completed business output to a deferred presentation and exit code. */
  readonly completion: (
    output: Readonly<TOutput>,
    context: Readonly<CommandContext>,
  ) => CommandCompletion | Promise<CommandCompletion>;
}

/** Classifies why one command invocation did not complete successfully. */
export type CommandFailureKind = "usage" | "operational" | "cleanup" | "cancelled" | "internal";

/** Normalized, secret-free description of one command failure. */
export interface CommandFailure {
  /** Failure classification used for exit mapping and diagnostics. */
  readonly kind: CommandFailureKind;
  /** Human-readable failure message. */
  readonly message: string;
  /** Bounded supporting detail lines, ordered from primary to cleanup evidence. */
  readonly evidence: readonly string[];
  /** Original thrown value, preserved for programmatic classification. */
  readonly cause?: unknown;
}

/** Typed outcome of one command invocation; command boundaries never leak thrown exceptions. */
export type CommandExecution<TOutput> =
  | {readonly status: "completed"; readonly value: TOutput; readonly exitCode: 0 | 1}
  | {readonly status: "failed"; readonly failure: CommandFailure; readonly exitCode: 1 | 2}
  | {readonly status: "cancelled"; readonly failure: CommandFailure; readonly exitCode: 130 | 143}
  | {readonly status: "help"; readonly exitCode: 0};

/** Options accepted by a programmatic or composed command invocation. */
export interface CommandInvocationOptions {
  /** Parent context whose runtime scope owns this nested invocation. */
  readonly parent?: Readonly<CommandContext>;
  /** Presentation override; defaults to `"silent"` for nested composition. */
  readonly presentation?: CommandPresentation;
  /** Caller cancellation signal linked into the created scope. */
  readonly signal?: AbortSignal;
}

/** Options a command lifecycle passes when it asks the factory to create one runtime scope. */
export interface RuntimeCreationOptions {
  /** Presentation mode the created scope's logger must honor. */
  readonly presentation: CommandPresentation;
  /** Caller cancellation signal linked into the created scope. */
  readonly signal?: AbortSignal;
  /** Whether the created scope owns SIGINT and SIGTERM registration. */
  readonly registerProcessSignals: boolean;
}

/** Creates every runtime scope one command lifecycle needs. */
export interface CommandRuntimeFactory {
  /** Creates an owned root scope. */
  readonly createRoot: (options: Readonly<RuntimeCreationOptions>) => Promise<CommandRuntime>;
  /** Creates a nested scope derived from an owning parent context. */
  readonly createChild: (
    parent: Readonly<CommandContext>,
    options: Readonly<RuntimeCreationOptions>,
  ) => Promise<CommandRuntime>;
}

/** Narrow contract exposing only programmatic composition of one command. */
export interface CommandInvoker<TInput, TOutput> {
  /** Runs the command from typed input. */
  readonly invoke: (
    input: Readonly<TInput>,
    options?: Readonly<CommandInvocationOptions>,
  ) => Promise<CommandExecution<TOutput>>;
}

/**
 * Thrown by an input decoder or by business execution when the typed input is not a valid command
 * request. The lifecycle maps it to exit code `2`.
 */
export class CommandInputError extends Error {
  /**
   * Creates a command input validation error.
   *
   * @param message - Human-readable, secret-free explanation of the invalid input.
   */
  public constructor(message: string) {
    super(message);
    this.name = "CommandInputError";
  }
}

function isUnknownRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

/** Failure outcomes the lifecycle can produce, carrying their own exit meaning. */
type NormalizedFailure =
  | {readonly status: "failed"; readonly failure: CommandFailure; readonly exitCode: 1 | 2}
  | {readonly status: "cancelled"; readonly failure: CommandFailure; readonly exitCode: 130 | 143};

function isAbortError(error: unknown): error is Error {
  return error instanceof Error && error.name === "AbortError";
}

function describeFailureEvidence(error: unknown): readonly string[] {
  if (error instanceof RunnerError) {
    return [`command: ${formatProcessRequest(error.request)}`, `outcome: ${error.outcome.kind}`];
  }

  if (error instanceof HttpError) {
    const request = `request: ${error.request.method ?? "GET"} ${error.request.url.href}`;
    return error.status === undefined ? [request] : [request, `status: ${String(error.status)}`];
  }

  if (error instanceof FileSystemError) {
    return [`operation: ${error.operation}`, `path: ${error.path}`];
  }

  return [];
}

/**
 * Classifies one thrown value into a normalized failure outcome without ever converting it into
 * a success-shaped default.
 *
 * @param error - Value thrown by runtime creation, execution, or presentation.
 * @param signal - Invocation signal consulted so an abort raised while the scope was cancelled
 * preserves the cancellation reason's own exit code.
 * @returns The normalized failure and the exit code the caller should surface.
 */
function normalizeThrownFailure(error: unknown, signal?: AbortSignal): NormalizedFailure {
  if (error instanceof CommandInputError) {
    return {status: "failed", exitCode: 2, failure: {kind: "usage", message: error.message, evidence: [], cause: error}};
  }

  if (error instanceof CommandCancellation) {
    return {
      status: "cancelled",
      exitCode: error.exitCode,
      failure: {kind: "cancelled", message: error.message, evidence: [], cause: error},
    };
  }

  if (isAbortError(error)) {
    const cancellation =
      signal?.aborted === true ? commandCancellationFromSignal(signal) : new CommandCancellation(error.message, 130);
    return {
      status: "cancelled",
      exitCode: cancellation.exitCode,
      failure: {kind: "cancelled", message: cancellation.message, evidence: [], cause: error},
    };
  }

  if (error instanceof Error) {
    return {
      status: "failed",
      exitCode: 1,
      failure: {kind: "operational", message: error.message, evidence: describeFailureEvidence(error), cause: error},
    };
  }

  return {
    status: "failed",
    exitCode: 1,
    failure: {
      kind: "internal",
      message: `Command failed with a non-error value: ${String(error)}`,
      evidence: [],
      cause: error,
    },
  };
}

function cleanupEvidence(failures: readonly CleanupFailure[]): readonly string[] {
  return failures.map((failure) => `${failure.label}: ${failure.message}`);
}

/**
 * Drains one invocation's cleanup registry without letting a failing registry itself escape the
 * command boundary.
 *
 * @param runtime - Runtime whose cleanup registry is drained.
 * @returns Every cleanup failure, including a synthetic entry when the registry itself rejected.
 */
async function drainCleanup(runtime: CommandRuntime): Promise<readonly CleanupFailure[]> {
  try {
    return await runtime.cleanup.drain();
  } catch (error: unknown) {
    return [
      {
        label: "cleanup registry",
        message: error instanceof Error ? error.message : String(error),
        cause: error,
      },
    ];
  }
}

function mergeCleanupEvidence(base: NormalizedFailure, failures: readonly CleanupFailure[]): NormalizedFailure {
  if (failures.length === 0) {
    return base;
  }

  return {
    ...base,
    failure: {...base.failure, evidence: [...base.failure.evidence, ...cleanupEvidence(failures)]},
  };
}

function cleanupOnlyFailure(failures: readonly CleanupFailure[]): NormalizedFailure | undefined {
  if (failures.length === 0) {
    return undefined;
  }

  return {
    status: "failed",
    exitCode: 1,
    failure: {kind: "cleanup", message: "Command cleanup failed.", evidence: cleanupEvidence(failures)},
  };
}

function formatFailureDiagnostic(failure: CommandFailure): string {
  return failure.evidence.length === 0 ? failure.message : [failure.message, ...failure.evidence].join("\n");
}

function readVerboseFlag(input: unknown): boolean {
  return isUnknownRecord(input) && input["verbose"] === true;
}

/** Outcome of one business execution attempt, before cleanup and presentation run. */
type ExecutionAttempt<TOutput> =
  | {readonly kind: "produced"; readonly output: TOutput; readonly completion: CommandCompletion}
  | {readonly kind: "failed"; readonly failure: NormalizedFailure};

/**
 * Owns the shared command lifecycle template: runtime scope ownership, failure normalization, and
 * the strict cleanup-before-presentation ordering every legacy command relies on.
 */
export abstract class AbstractMonorepoCommand<TInput, TOutput> implements CommandInvoker<TInput, TOutput> {
  readonly #injectedRuntimeFactory: CommandRuntimeFactory | undefined;

  /**
   * Creates the lifecycle host.
   *
   * @param runtimeFactory - Runtime factory used for every scope; when omitted, the production
   * Node factory is loaded lazily so this module never depends on the Node adapter at import
   * time.
   */
  protected constructor(runtimeFactory?: CommandRuntimeFactory) {
    this.#injectedRuntimeFactory = runtimeFactory;
  }

  /** Identity of this command. */
  protected abstract get metadata(): Readonly<CommandMetadata>;

  /** Runs business orchestration for one invocation. */
  protected abstract executeCommand(context: Readonly<CommandContext>, input: Readonly<TInput>): Promise<TOutput>;

  /** Builds the deferred completion for one completed business output. */
  protected abstract buildCompletion(
    output: Readonly<TOutput>,
    context: Readonly<CommandContext>,
  ): CommandCompletion | Promise<CommandCompletion>;

  /**
   * Runs the command from typed input.
   *
   * @param input - Typed command input.
   * @param options - Optional parent context, presentation override, and caller signal.
   * @returns The typed execution outcome; no OS signal handler and no exit code is ever written.
   */
  public async invoke(
    input: Readonly<TInput>,
    options: Readonly<CommandInvocationOptions> = {},
  ): Promise<CommandExecution<TOutput>> {
    const presentation = options.presentation ?? "silent";
    let runtime: CommandRuntime;
    try {
      const factory = await this.#resolveRuntimeFactory(readVerboseFlag(input));
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
      // No invocation logger exists yet, so the caller receives the normalized outcome only.
      return normalizeThrownFailure(error);
    }

    return this.#runLifecycle({runtime, presentation}, input);
  }

  async #resolveRuntimeFactory(verbose: boolean): Promise<CommandRuntimeFactory> {
    if (this.#injectedRuntimeFactory !== undefined) {
      return this.#injectedRuntimeFactory;
    }

    const {createNodeCommandRuntimeFactory} = await import("./runtime.node.ts");
    return createNodeCommandRuntimeFactory(this.metadata.name, verbose);
  }

  async #runLifecycle(context: Readonly<CommandContext>, input: Readonly<TInput>): Promise<CommandExecution<TOutput>> {
    const {runtime} = context;
    let attempt: ExecutionAttempt<TOutput>;

    try {
      const output = await this.executeCommand(context, input);
      attempt = {kind: "produced", output, completion: await this.buildCompletion(output, context)};
    } catch (error: unknown) {
      attempt = {kind: "failed", failure: normalizeThrownFailure(error, runtime.signal)};
    }

    const cleanupFailures = await drainCleanup(runtime);

    if (attempt.kind === "failed") {
      return this.#reportFailure(context, mergeCleanupEvidence(attempt.failure, cleanupFailures));
    }

    const cleanupFailure = cleanupOnlyFailure(cleanupFailures);
    if (cleanupFailure !== undefined) {
      return this.#reportFailure(context, cleanupFailure);
    }

    const presentationFailure = await this.#renderCompletion(attempt.completion, context);
    if (presentationFailure !== undefined) {
      return this.#reportFailure(context, presentationFailure);
    }

    return {status: "completed", value: attempt.output, exitCode: attempt.completion.exitCode};
  }

  async #renderCompletion(
    completion: Readonly<CommandCompletion>,
    context: Readonly<CommandContext>,
  ): Promise<NormalizedFailure | undefined> {
    const {presentation, runtime} = context;
    if (presentation === "silent") {
      return undefined;
    }

    try {
      if (presentation === "json") {
        const {json} = completion;
        if (json === undefined) {
          return {
            status: "failed",
            exitCode: 1,
            failure: {
              kind: "internal",
              message: `Command "${this.metadata.name}" selected JSON presentation without a JSON document.`,
              evidence: [],
            },
          };
        }

        runtime.logger.json(json);
        return undefined;
      }

      await completion.human?.(runtime.logger);
      return undefined;
    } catch (error: unknown) {
      return normalizeThrownFailure(error, runtime.signal);
    }
  }

  #reportFailure(context: Readonly<CommandContext>, failure: NormalizedFailure): NormalizedFailure {
    if (context.presentation !== "silent") {
      context.runtime.logger.fatal(formatFailureDiagnostic(failure.failure));
    }

    return failure;
  }
}

/**
 * The concrete command object every legacy script exports: it delegates command-specific
 * behavior to one typed {@link CommandDefinition} while inheriting the shared lifecycle.
 *
 * @example
 * ```typescript
 * export const doctorCommand = new MonorepoCommand(doctorDefinition);
 * const execution = await doctorCommand.invoke(input, {presentation: "human"});
 * ```
 */
export class MonorepoCommand<TInput, TOutput> extends AbstractMonorepoCommand<TInput, TOutput> {
  readonly #definition: Readonly<CommandDefinition<TInput, TOutput>>;

  /**
   * Creates a command from its declarative definition.
   *
   * @param definition - Typed identity, business behavior, and completion description.
   * @param runtimeFactory - Optional runtime factory; tests inject one instead of replacing
   * command business code.
   */
  public constructor(definition: Readonly<CommandDefinition<TInput, TOutput>>, runtimeFactory?: CommandRuntimeFactory) {
    super(runtimeFactory);
    this.#definition = definition;
  }

  /** {@inheritDoc AbstractMonorepoCommand.metadata} */
  protected override get metadata(): Readonly<CommandMetadata> {
    return this.#definition.metadata;
  }

  /** {@inheritDoc AbstractMonorepoCommand.executeCommand} */
  protected override executeCommand(context: Readonly<CommandContext>, input: Readonly<TInput>): Promise<TOutput> {
    return this.#definition.execute(context, input);
  }

  /** {@inheritDoc AbstractMonorepoCommand.buildCompletion} */
  protected override buildCompletion(
    output: Readonly<TOutput>,
    context: Readonly<CommandContext>,
  ): CommandCompletion | Promise<CommandCompletion> {
    return this.#definition.completion(output, context);
  }
}
