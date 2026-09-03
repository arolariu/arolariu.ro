/**
 * @fileoverview Engine-neutral declarative command host built on Commander.
 * @module scripts/common/commander
 *
 * @remarks
 * This module owns the *shape* of a monorepository command: how a fresh Commander parser is
 * built per invocation, how typed input is decoded, how presentation is selected, how failures
 * are normalized into one typed outcome, and in which order cleanup and presentation run. It
 * never touches Node's process, filesystem, network, or timer APIs itself: every capability
 * arrives through an injected {@link CommandRuntimeFactory}. The production factory lives in
 * `runtime.node.ts` and is loaded through a lazy dynamic import only when a command was
 * constructed without one, so module initialization here never depends on the Node adapter.
 */

import {Command, CommanderError} from "commander";

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

/** Every process exit code a migrated command may request. */
export type CommandExitCode = 0 | 1 | 2 | 130 | 143;

/** Any value that survives a lossless round trip through `JSON.stringify`/`JSON.parse`. */
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | Readonly<{[key: string]: JsonValue}>;

/** Identity, help text, and alias configuration of one command. */
export interface CommandMetadata {
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

/** Declarative description of one command's parser, input, business behavior, and completion. */
export interface CommandDefinition<TInput, TOutput> {
  /** Identity and help configuration. */
  readonly metadata: CommandMetadata;
  /** Declares Commander arguments and options on a fresh parser. */
  readonly configure: (program: Command) => void;
  /** Converts parsed Commander state into one typed input, owning semantic validation. */
  readonly decode: (program: Command) => TInput;
  /** Selects presentation from typed input; defaults to `"human"` when omitted. */
  readonly presentation?: (input: Readonly<TInput>) => CommandPresentation;
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

/** Ambient process facts and effects the command host is allowed to depend on. */
export interface CommandProcessHost {
  /** Immutable invocation argv, excluding the executable and script path. */
  readonly argv: readonly string[];
  /** Reports whether `moduleUrl` is the module the process was started with. */
  readonly isDirectEntry: (moduleUrl: string) => boolean;
  /** Requests the final process exit code. */
  readonly setExitCode: (exitCode: CommandExitCode) => void;
}

/** Creates every runtime scope one command lifecycle needs. */
export interface CommandRuntimeFactory {
  /** Ambient process facts used for default argv, entrypoint detection, and exit codes. */
  readonly processHost: CommandProcessHost;
  /** Creates the human logger used for help and usage output before input exists. */
  readonly createParseLogger: () => MonorepositoryLogger;
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
  /** Runs the command from typed input without argv parsing. */
  readonly invoke: (
    input: Readonly<TInput>,
    options?: Readonly<CommandInvocationOptions>,
  ) => Promise<CommandExecution<TOutput>>;
}

/**
 * Thrown by `decode()` when Commander parsed successfully but the resulting input is not a valid
 * command request. The lifecycle maps it to exit code `2`.
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

/** Default slash-prefixed aliases recognized by every command. */
const DEFAULT_SLASH_ALIASES: Readonly<Record<string, string>> = {
  "/h": "--help",
  "/help": "--help",
};

/** Commander error codes that mean help or version text was displayed rather than a failure. */
const COMMANDER_HELP_CODES: ReadonlySet<string> = new Set([
  "commander.help",
  "commander.helpDisplayed",
  "commander.version",
]);

/**
 * Immutable pre-normalization argv captured for exactly one Commander parser.
 *
 * @remarks
 * Module-private on purpose: `getInvocationArgv()` is the only way a command definition can read
 * it, so no definition can reach ambient process argv or observe another invocation's tokens.
 */
const invocationArgvRegistry = new WeakMap<Command, readonly string[]>();

/**
 * Rewrites argv tokens when an exact slash alias is registered, stopping at the first literal
 * `--` so every pass-through token after the delimiter is copied unchanged.
 *
 * @param argv - Raw argv tokens to normalize.
 * @param aliases - Optional exact-match slash alias map merged over `/h` and `/help`.
 * @returns Normalized argv tokens.
 */
export function normalizeSlashArguments(
  argv: readonly string[],
  aliases?: Readonly<Record<string, string>>,
): readonly string[] {
  const effectiveAliases: Readonly<Record<string, string>> = {...DEFAULT_SLASH_ALIASES, ...(aliases ?? {})};
  const normalized: string[] = [];
  let afterDelimiter = false;

  for (const argument of argv) {
    if (afterDelimiter) {
      normalized.push(argument);
      continue;
    }

    if (argument === "--") {
      afterDelimiter = true;
      normalized.push(argument);
      continue;
    }

    normalized.push(effectiveAliases[argument] ?? argument);
  }

  return normalized;
}

/**
 * Reads the immutable, pre-normalization argv captured for one fresh Commander parser.
 *
 * @param program - The exact program instance handed to `configure()` and `decode()`.
 * @returns The frozen argv tokens of that invocation, including `--` and every suffix token.
 * @throws When `program` was not created by the command host for a live invocation.
 */
export function getInvocationArgv(program: Command): readonly string[] {
  const argv = invocationArgvRegistry.get(program);
  if (argv === undefined) {
    throw new Error("The supplied Commander program was not created by the command host for this invocation.");
  }

  return argv;
}

function isUnknownRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function isPlainJsonObject(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function describeUnsupportedJsonValue(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "number") {
    return "non-finite number";
  }
  if (typeof value === "object" && value !== null) {
    const constructorName: unknown = value.constructor?.name;
    return typeof constructorName === "string" ? `${constructorName} instance` : "non-plain object";
  }

  return typeof value;
}

function convertToJsonValue(value: unknown, ancestors: readonly object[], path: string): JsonValue {
  if (value === null) {
    return null;
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Value at ${path} is not JSON-serializable: non-finite number.`);
    }
    return value;
  }

  if (isUnknownArray(value)) {
    if (ancestors.includes(value)) {
      throw new TypeError(`Value at ${path} contains a circular reference and cannot be serialized.`);
    }

    const nestedAncestors = [...ancestors, value];
    return value.map((entry, index) => convertToJsonValue(entry, nestedAncestors, `${path}[${String(index)}]`));
  }

  if (isPlainJsonObject(value)) {
    if (ancestors.includes(value)) {
      throw new TypeError(`Value at ${path} contains a circular reference and cannot be serialized.`);
    }

    const nestedAncestors = [...ancestors, value];
    const converted: Record<string, JsonValue> = {};
    for (const key of Object.keys(value)) {
      converted[key] = convertToJsonValue(value[key], nestedAncestors, `${path}.${key}`);
    }
    return converted;
  }

  throw new TypeError(`Value at ${path} is not JSON-serializable: ${describeUnsupportedJsonValue(value)}.`);
}

/**
 * Converts a typed command report into a checked {@link JsonValue}, so a command assigns
 * `CommandCompletion.json` without a type assertion and never emits a document containing a
 * value `JSON.stringify` would silently drop or reject.
 *
 * @param value - Plain report data to convert.
 * @returns The equivalent JSON value.
 * @throws {TypeError} When the value contains `undefined`, a non-finite number, a `bigint`, a
 * function, a symbol, a non-plain object, or a circular reference.
 */
export function toJsonValue(value: unknown): JsonValue {
  return convertToJsonValue(value, [], "$");
}

/** Failure outcomes the lifecycle can produce, carrying their own exit meaning. */
type NormalizedFailure =
  | {readonly status: "failed"; readonly failure: CommandFailure; readonly exitCode: 1 | 2}
  | {readonly status: "cancelled"; readonly failure: CommandFailure; readonly exitCode: 130 | 143};

function isAbortError(error: unknown): error is Error {
  return error instanceof Error && error.name === "AbortError";
}

function isCommanderHelpRequest(error: unknown): boolean {
  return error instanceof CommanderError && COMMANDER_HELP_CODES.has(error.code);
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
 * @param error - Value thrown by parsing, decoding, execution, or presentation.
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
 * Owns the shared command lifecycle template: fresh parser construction, alias normalization,
 * presentation selection, runtime scope ownership, failure normalization, and the strict
 * cleanup-before-presentation ordering every migrated command relies on.
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

  /** Identity and help configuration of this command. */
  protected abstract get metadata(): Readonly<CommandMetadata>;

  /** Declares Commander arguments and options on a fresh parser. */
  protected abstract configureParser(program: Command): void;

  /** Converts parsed Commander state into one typed input. */
  protected abstract decodeInput(program: Command): TInput;

  /** Selects the presentation mode for typed input. */
  protected abstract selectPresentation(input: Readonly<TInput>): CommandPresentation;

  /** Runs business orchestration for one invocation. */
  protected abstract executeCommand(context: Readonly<CommandContext>, input: Readonly<TInput>): Promise<TOutput>;

  /** Builds the deferred completion for one completed business output. */
  protected abstract buildCompletion(
    output: Readonly<TOutput>,
    context: Readonly<CommandContext>,
  ): CommandCompletion | Promise<CommandCompletion>;

  /**
   * Runs the command from argv: normalizes aliases, parses a fresh Commander program, decodes
   * typed input, creates an owned root runtime with process-signal handling, executes, drains
   * cleanup, and only then renders the completion.
   *
   * @param argv - Invocation tokens; read from the runtime factory's process host when omitted.
   * @returns The typed execution outcome; the process exit code is never written here.
   */
  public async run(argv?: readonly string[]): Promise<CommandExecution<TOutput>> {
    const bootstrapFactory = await this.#resolveRuntimeFactory(false);
    const parseLogger = bootstrapFactory.createParseLogger();
    const invocationArgv = Object.freeze([...(argv ?? bootstrapFactory.processHost.argv)]);
    const program = this.#createInvocationProgram(parseLogger);
    invocationArgvRegistry.set(program, invocationArgv);

    let input: TInput;
    try {
      await program.parseAsync([...normalizeSlashArguments(invocationArgv, this.metadata.slashAliases)], {from: "user"});
      input = this.decodeInput(program);
    } catch (error: unknown) {
      if (isCommanderHelpRequest(error)) {
        return {status: "help", exitCode: 0};
      }

      return this.#normalizeParseFailure(parseLogger, error);
    }

    let presentation: CommandPresentation;
    let runtime: CommandRuntime;
    try {
      presentation = this.selectPresentation(input);
      const factory = await this.#resolveRuntimeFactory(readVerboseFlag(input));
      runtime = await factory.createRoot({presentation, registerProcessSignals: true});
    } catch (error: unknown) {
      const normalized = normalizeThrownFailure(error);
      parseLogger.fatal(formatFailureDiagnostic(normalized.failure));
      return normalized;
    }

    return this.#runLifecycle({runtime, presentation}, input);
  }

  /**
   * Runs the command from typed input, skipping argv and Commander entirely.
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

  /**
   * Runs the command and assigns its exit code only when `moduleUrl` is the process entrypoint.
   *
   * @param moduleUrl - `import.meta.url` of the module hosting this command.
   */
  public async runIfMain(moduleUrl: string): Promise<void> {
    const factory = await this.#resolveRuntimeFactory(false);
    if (!factory.processHost.isDirectEntry(moduleUrl)) {
      return;
    }

    const execution = await this.run();
    factory.processHost.setExitCode(execution.exitCode);
  }

  async #resolveRuntimeFactory(verbose: boolean): Promise<CommandRuntimeFactory> {
    if (this.#injectedRuntimeFactory !== undefined) {
      return this.#injectedRuntimeFactory;
    }

    const {createNodeCommandRuntimeFactory} = await import("./runtime.node.ts");
    return createNodeCommandRuntimeFactory(this.metadata.name, verbose);
  }

  #createInvocationProgram(parseLogger: MonorepositoryLogger): Command {
    const {name, description, usage, examples} = this.metadata;
    const program = new Command();

    program
      .name(name)
      .description(description)
      .usage(usage ?? "[options]")
      .showHelpAfterError()
      .exitOverride()
      .configureOutput({
        writeOut: (text: string) => {
          parseLogger.write(text, "stdout");
        },
        writeErr: (text: string) => {
          parseLogger.write(text, "stderr");
        },
      });

    if (examples !== undefined && examples.length > 0) {
      program.addHelpText("after", () => ["", "Examples:", ...examples.map((example) => `  ${example}`)].join("\n"));
    }

    this.configureParser(program);
    return program;
  }

  #normalizeParseFailure(parseLogger: MonorepositoryLogger, error: unknown): CommandExecution<TOutput> {
    if (error instanceof CommanderError) {
      // Commander already rendered its own message and usage hint through the parse logger.
      return {
        status: "failed",
        exitCode: 2,
        failure: {kind: "usage", message: error.message, evidence: [], cause: error},
      };
    }

    const normalized = normalizeThrownFailure(error);
    parseLogger.fatal(formatFailureDiagnostic(normalized.failure));
    return normalized;
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
 * The concrete command object every migrated script exports: it delegates command-specific
 * behavior to one typed {@link CommandDefinition} while inheriting the shared lifecycle.
 *
 * @example
 * ```typescript
 * export const doctorCommand = new MonorepoCommand(doctorDefinition);
 * await doctorCommand.runIfMain(import.meta.url);
 * ```
 */
export class MonorepoCommand<TInput, TOutput> extends AbstractMonorepoCommand<TInput, TOutput> {
  readonly #definition: Readonly<CommandDefinition<TInput, TOutput>>;

  /**
   * Creates a command from its declarative definition.
   *
   * @param definition - Typed parser, input, business behavior, and completion description.
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

  /** {@inheritDoc AbstractMonorepoCommand.configureParser} */
  protected override configureParser(program: Command): void {
    this.#definition.configure(program);
  }

  /** {@inheritDoc AbstractMonorepoCommand.decodeInput} */
  protected override decodeInput(program: Command): TInput {
    return this.#definition.decode(program);
  }

  /** {@inheritDoc AbstractMonorepoCommand.selectPresentation} */
  protected override selectPresentation(input: Readonly<TInput>): CommandPresentation {
    return this.#definition.presentation?.(input) ?? "human";
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
