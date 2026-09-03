/**
 * @fileoverview Command execution, completion, failure, and input contracts and helpers shared by
 * every migrated command.
 * @module scripts/core/command/command-execution
 *
 * @remarks
 * Owns the *shape* of one command invocation outcome: presentation mode, exit codes, JSON
 * conversion, execution/completion/context contracts, typed failure classification and its
 * bounded evidence, input validation errors, and argv normalization. Never touches Node's process,
 * filesystem, network, or timer APIs, and never imports an adapter: every capability arrives
 * through the injected {@link CommandRuntime} carried on {@link CommandExecutionContext}.
 */

import type {Command} from "commander";

import type {MonorepositoryLogger} from "../../common/logger.ts";
import {formatProcessRequest, RunnerError} from "../../common/runner.ts";
import {FileSystemError, HttpError, type CommandRuntime} from "../../common/runtime.ts";
import type {CommandInvocationOptions} from "./command-specification.ts";

/** Selects human-oriented, machine-readable, or fully suppressed command presentation. */
export type CommandPresentationMode = "human" | "json" | "silent";

/** Every process exit code a migrated command may request. */
export type CommandExitCode = 0 | 1 | 2 | 130 | 143;

/** Any value that survives a lossless round trip through `JSON.stringify`/`JSON.parse`. */
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | Readonly<{[key: string]: JsonValue}>;

/** Everything one command execution observes about its own invocation. */
export interface CommandExecutionContext<TRuntime extends CommandRuntime = CommandRuntime> {
  /** Capabilities owned by this invocation. */
  readonly runtime: TRuntime;
  /** Presentation mode selected for this invocation. */
  readonly presentation: CommandPresentationMode;
}

/** Deferred final presentation and business exit meaning of one completed command. */
export interface CommandCompletion<TOutput> {
  /** `0` when the business operation succeeded, `1` when it completed but reported failure. */
  readonly exitCode: 0 | 1;
  /** The command's typed output. */
  readonly value: TOutput;
  /** Human presentation, invoked only in human mode. */
  readonly human?: (presenter: MonorepositoryLogger) => void | Promise<void>;
  /** Machine-readable document, serialized exactly once in JSON mode. */
  readonly json?: JsonValue;
}

/** Typed outcome of one command invocation; command boundaries never leak thrown exceptions. */
export type CommandExecution<TOutput> =
  | {readonly status: "completed"; readonly value: TOutput; readonly exitCode: 0 | 1}
  | {readonly status: "failed"; readonly failure: CommandFailure; readonly exitCode: 1 | 2}
  | {readonly status: "cancelled"; readonly failure: CommandFailure; readonly exitCode: 130 | 143}
  | {readonly status: "help"; readonly exitCode: 0};

/** Narrow contract exposing only programmatic composition of one command. */
export interface CommandInvoker<TInput, TOutput> {
  /** Runs the command from typed input without argv parsing. */
  readonly invoke: (input: Readonly<TInput>, options?: Readonly<CommandInvocationOptions>) => Promise<CommandExecution<TOutput>>;
}

/** Classifies why one command invocation did not complete successfully. */
type CommandFailureKind = "usage" | "operational" | "cleanup" | "cancelled" | "internal";

/** Failure kinds a feature presenter may produce: never a usage, cleanup, or cancellation outcome. */
type FeatureCommandFailureKind = Exclude<CommandFailureKind, "usage" | "cleanup" | "cancelled">;

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

/** A failure a feature presenter is permitted to produce. */
export interface FeatureCommandFailure extends CommandFailure {
  readonly kind: FeatureCommandFailureKind;
}

const isUnknownRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null;

function isPlainJsonObject(value: unknown): value is Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

const isUnknownArray = (value: unknown): value is readonly unknown[] => Array.isArray(value);

function describeUnsupportedJsonValue(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "number") {
    return "non-finite number";
  }
  if (typeof value === "object" && value !== null) {
    const constructorName: unknown = isUnknownRecord(value) ? value.constructor?.name : undefined;
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
 * Converts a typed report into a checked {@link JsonValue} so a command assigns
 * `CommandCompletion.json` without a cast and never emits a document `JSON.stringify` would
 * silently drop or reject.
 *
 * @throws {TypeError} For `undefined`, a non-finite number, a `bigint`, a function, a symbol, a
 * non-plain object, or a circular reference.
 */
export function toJsonValue(value: unknown): JsonValue {
  return convertToJsonValue(value, [], "$");
}

/** Describes evidence for a known typed failure without ever including a secret. */
export function describeCommandFailureEvidence(error: unknown): readonly string[] {
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

/** Formats one command failure as a single diagnostic message, appending evidence when present. */
export function formatCommandFailureDiagnostic(failure: Readonly<CommandFailure>): string {
  return failure.evidence.length === 0 ? failure.message : [failure.message, ...failure.evidence].join("\n");
}

/**
 * Thrown by `decode()` when Commander parsed successfully but the resulting input is not a valid
 * command request. The lifecycle maps it to exit code `2`.
 */
export class CommandInputError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CommandInputError";
  }
}

/**
 * Thrown at construction when a command's {@link CommandConstructionOptions} carried neither
 * `host` nor `loadHost` — a state the discriminated union normally makes unrepresentable.
 */
export class CommandConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CommandConfigurationError";
  }
}

/** Default slash-prefixed aliases recognized by every command. */
const DEFAULT_SLASH_ALIASES: Readonly<Record<string, string>> = {"/h": "--help", "/help": "--help"};

/**
 * Rewrites argv tokens when an exact slash alias is registered, stopping at the first literal `--`
 * so every pass-through token after the delimiter is copied unchanged.
 */
export function normalizeSlashArguments(argv: readonly string[], aliases?: Readonly<Record<string, string>>): readonly string[] {
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
 * Immutable pre-normalization argv captured for exactly one Commander parser. Module-private on
 * purpose: `getInvocationArgv()` is the only way a command definition can read it.
 */
const invocationArgvRegistry = new WeakMap<Command, readonly string[]>();

/** Registers the immutable, pre-normalization argv for one fresh Commander parser. */
export function registerInvocationArgv(program: Command, argv: readonly string[]): void {
  invocationArgvRegistry.set(program, argv);
}

/**
 * Reads the immutable, pre-normalization argv captured for one fresh Commander parser.
 *
 * @throws When `program` was not registered by the command lifecycle for a live invocation.
 */
export function getInvocationArgv(program: Command): readonly string[] {
  const argv = invocationArgvRegistry.get(program);
  if (argv === undefined) {
    throw new Error("The supplied Commander program was not created by the command host for this invocation.");
  }
  return argv;
}
