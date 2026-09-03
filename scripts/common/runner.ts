/**
 * @fileoverview Engine-neutral process runner contracts and failure diagnostics.
 * @module scripts.common.runner
 */

import type {MonorepositoryLogger} from "./logger.ts";

/** Runs one request with optional execution options. */
interface Runner<TRequest, TOptions, TOutcome> {
  /** Executes one request. */
  run(request: Readonly<TRequest>, options?: Readonly<TOptions>): Promise<TOutcome>;
}

/** Describes one executable and its argument vector. */
export interface ProcessRequest {
  /** Executable name or path. */
  readonly command: string;
  /** Arguments passed directly to the executable. */
  readonly args: readonly string[];
}

/** Selects captured, tee, or inherited child output behavior. */
type ProcessOutputMode = "capture" | "tee" | "inherit";

/** Defines invocation-specific environment overrides. */
export type ProcessEnvironment = Readonly<Record<string, string | undefined>>;

/** Configures one process invocation. */
export interface ProcessRunOptions {
  /** Working directory for the child process. */
  readonly cwd?: string;
  /** Environment values merged over inherited defaults. */
  readonly env?: ProcessEnvironment;
  /** Child output handling mode. */
  readonly output?: ProcessOutputMode;
  /** Optional payload written once to piped child stdin. */
  readonly input?: string | Uint8Array;
  /** Optional timeout after which the child is terminated. */
  readonly timeoutMs?: number;
  /** Optional cancellation signal. */
  readonly signal?: AbortSignal;
  /** Logger used for tee output and command diagnostics. */
  readonly logger?: MonorepositoryLogger;
  /** Whether the formatted command is echoed before execution. */
  readonly logCommands?: boolean;
}

/** Captured process output and duration metadata. */
export interface ProcessOutput {
  /** Captured standard output. */
  readonly stdout: string;
  /** Captured standard error. */
  readonly stderr: string;
  /** Elapsed wall-clock duration in milliseconds. */
  readonly durationMs: number;
}

/** Describes the complete typed outcome of one process invocation. */
export type ProcessOutcome =
  | (ProcessOutput & {readonly kind: "succeeded"; readonly exitCode: 0})
  | (ProcessOutput & {readonly kind: "exited"; readonly exitCode: number})
  | (ProcessOutput & {readonly kind: "signalled"; readonly signal: NodeJS.Signals})
  | (ProcessOutput & {readonly kind: "spawn-failed"; readonly message: string})
  | (ProcessOutput & {readonly kind: "timed-out"; readonly signal?: NodeJS.Signals})
  | (ProcessOutput & {readonly kind: "cancelled"; readonly signal?: NodeJS.Signals});

/** Narrows successful process outcomes. */
export type SucceededProcessOutcome = Extract<ProcessOutcome, {readonly kind: "succeeded"}>;

/** Engine-neutral process runner contract. */
export interface ProcessRunner extends Runner<ProcessRequest, ProcessRunOptions, ProcessOutcome> {
  /** Executes one process and throws when it does not succeed. */
  expectSuccess(request: Readonly<ProcessRequest>, options?: Readonly<ProcessRunOptions>): Promise<SucceededProcessOutcome>;

  /** Applies reusable default options without mutating the parent runner. */
  scope(defaults: Readonly<ProcessRunOptions>): ProcessRunner;
}

const EMPTY_PROCESS_RUN_OPTIONS = {} satisfies ProcessRunOptions;
const MAX_PROCESS_DIAGNOSTIC_TEXT_LENGTH = 2_000;

/**
 * Formats a request for diagnostics without including stdin or environment values.
 *
 * @param request - Process request to render.
 * @returns Shell-like command text.
 */
export function formatProcessRequest(request: Readonly<ProcessRequest>): string {
  return [request.command, ...request.args].map(formatProcessToken).join(" ");
}

/**
 * Builds bounded failure evidence with stderr/stdout/spawn-message precedence.
 *
 * @param outcome - Failed or interrupted process outcome.
 * @param logger - Optional logger used for secret redaction.
 * @returns Sanitized evidence excerpt.
 */
export function processFailureEvidence(
  outcome: Readonly<Exclude<ProcessOutcome, SucceededProcessOutcome>>,
  logger?: MonorepositoryLogger,
): string {
  const candidate = selectFailureEvidence(outcome);
  return sanitizeDiagnosticText(candidate, logger);
}

/**
 * Typed process-runner failure thrown by `expectSuccess`.
 */
export class RunnerError extends Error {
  /** Retained request, redacted when the caller supplied a logger. */
  public readonly request: Readonly<ProcessRequest>;

  /** Retained failed outcome, redacted when the caller supplied a logger. */
  public readonly outcome: Readonly<Exclude<ProcessOutcome, SucceededProcessOutcome>>;

  /**
   * Creates a typed process-runner error with sanitized, bounded diagnostics.
   *
   * @param request - Original request.
   * @param outcome - Failed or interrupted process outcome.
   * @param logger - Optional logger used for secret redaction.
   */
  public constructor(
    request: Readonly<ProcessRequest>,
    outcome: Readonly<Exclude<ProcessOutcome, SucceededProcessOutcome>>,
    logger?: MonorepositoryLogger,
  ) {
    const retainedRequest = logger === undefined ? request : sanitizeProcessRequest(request, logger);
    const retainedOutcome = logger === undefined ? outcome : sanitizeFailedProcessOutcome(outcome, logger);
    const failureSummary = describeFailure(retainedOutcome);
    const command = sanitizeDiagnosticText(formatProcessRequest(retainedRequest), logger);
    const evidence = processFailureEvidence(retainedOutcome, logger);

    super(evidence === "" ? `${failureSummary}: ${command}` : `${failureSummary}: ${command}\n${evidence}`);

    this.name = "RunnerError";
    this.request = retainedRequest;
    this.outcome = retainedOutcome;
  }
}

/**
 * Provides engine-neutral validation, command logging, and typed success policy.
 */
export abstract class AbstractProcessRunner implements ProcessRunner {
  /** {@inheritDoc ProcessRunner.run} */
  public run(request: Readonly<ProcessRequest>, options: Readonly<ProcessRunOptions> = EMPTY_PROCESS_RUN_OPTIONS): Promise<ProcessOutcome> {
    const normalizedOptions = cloneProcessRunOptions(options);
    validateProcessRequest(request, normalizedOptions);

    if (normalizedOptions.logCommands === true) {
      normalizedOptions.logger?.command(formatProcessRequest(request));
    }

    return this.execute(request, normalizedOptions);
  }

  /** {@inheritDoc ProcessRunner.expectSuccess} */
  public async expectSuccess(
    request: Readonly<ProcessRequest>,
    options: Readonly<ProcessRunOptions> = EMPTY_PROCESS_RUN_OPTIONS,
  ): Promise<SucceededProcessOutcome> {
    const outcome = await this.run(request, options);
    if (isSucceededOutcome(outcome)) {
      return outcome;
    }

    throw new RunnerError(request, outcome, options.logger);
  }

  /** {@inheritDoc ProcessRunner.scope} */
  public scope(defaults: Readonly<ProcessRunOptions>): ProcessRunner {
    return new ScopedProcessRunner(this, defaults);
  }

  /**
   * Executes the engine-specific child-process work.
   *
   * @param request - Request to execute.
   * @param options - Validated execution options.
   * @returns Typed process outcome.
   */
  protected abstract execute(request: Readonly<ProcessRequest>, options: Readonly<ProcessRunOptions>): Promise<ProcessOutcome>;
}

class ScopedProcessRunner implements ProcessRunner {
  readonly #runner: ProcessRunner;
  readonly #defaults: ProcessRunOptions;

  public constructor(runner: ProcessRunner, defaults: Readonly<ProcessRunOptions>) {
    this.#runner = runner;
    this.#defaults = cloneProcessRunOptions(defaults);
  }

  public run(request: Readonly<ProcessRequest>, options: Readonly<ProcessRunOptions> = EMPTY_PROCESS_RUN_OPTIONS): Promise<ProcessOutcome> {
    return this.#runner.run(request, mergeProcessRunOptions(this.#defaults, options));
  }

  public expectSuccess(
    request: Readonly<ProcessRequest>,
    options: Readonly<ProcessRunOptions> = EMPTY_PROCESS_RUN_OPTIONS,
  ): Promise<SucceededProcessOutcome> {
    return this.#runner.expectSuccess(request, mergeProcessRunOptions(this.#defaults, options));
  }

  public scope(defaults: Readonly<ProcessRunOptions>): ProcessRunner {
    return new ScopedProcessRunner(this, defaults);
  }
}

function isSucceededOutcome(outcome: ProcessOutcome): outcome is SucceededProcessOutcome {
  return outcome.kind === "succeeded";
}

function validateProcessRequest(request: Readonly<ProcessRequest>, options: Readonly<ProcessRunOptions>): void {
  if (request.command.trim().length === 0) {
    throw new Error("Command cannot be empty");
  }

  if (options.output === "inherit" && options.input !== undefined) {
    throw new Error("Cannot supply input when output is inherited");
  }
}

function formatProcessToken(token: string): string {
  if (token.length === 0 || /\s/u.test(token) || token.includes('"')) {
    return `"${token.replaceAll('"', '\\"')}"`;
  }

  return token;
}

function selectFailureEvidence(outcome: Readonly<Exclude<ProcessOutcome, SucceededProcessOutcome>>): string {
  if (outcome.stderr.length > 0) {
    return outcome.stderr;
  }

  if (outcome.stdout.length > 0) {
    return outcome.stdout;
  }

  if (outcome.kind === "spawn-failed") {
    return outcome.message;
  }

  return "";
}

function sanitizeDiagnosticText(text: string, logger?: MonorepositoryLogger): string {
  const sanitized = logger?.sanitize(text) ?? text;
  return sanitized.slice(0, MAX_PROCESS_DIAGNOSTIC_TEXT_LENGTH);
}

function sanitizeProcessRequest(request: Readonly<ProcessRequest>, logger: MonorepositoryLogger): ProcessRequest {
  return {
    command: logger.sanitize(request.command),
    args: request.args.map((argument) => logger.sanitize(argument)),
  };
}

function sanitizeFailedProcessOutcome(
  outcome: Readonly<Exclude<ProcessOutcome, SucceededProcessOutcome>>,
  logger: MonorepositoryLogger,
): Exclude<ProcessOutcome, SucceededProcessOutcome> {
  const stdout = logger.sanitize(outcome.stdout);
  const stderr = logger.sanitize(outcome.stderr);

  switch (outcome.kind) {
    case "cancelled":
    case "exited":
    case "signalled":
    case "timed-out":
      return {...outcome, stdout, stderr};
    case "spawn-failed":
      return {...outcome, message: logger.sanitize(outcome.message), stdout, stderr};
  }
}

function describeFailure(outcome: Readonly<Exclude<ProcessOutcome, SucceededProcessOutcome>>): string {
  switch (outcome.kind) {
    case "cancelled":
      return outcome.signal === undefined ? "Process cancelled" : `Process cancelled by ${outcome.signal}`;
    case "exited":
      return `Process exited with code ${outcome.exitCode}`;
    case "signalled":
      return `Process terminated by ${outcome.signal}`;
    case "spawn-failed":
      return "Process failed to start";
    case "timed-out":
      return outcome.signal === undefined ? "Process timed out" : `Process timed out with ${outcome.signal}`;
  }
}

function cloneProcessRunOptions(options: Readonly<ProcessRunOptions>): ProcessRunOptions {
  return mergeProcessRunOptions(EMPTY_PROCESS_RUN_OPTIONS, options);
}

function mergeProcessRunOptions(defaults: Readonly<ProcessRunOptions>, overrides: Readonly<ProcessRunOptions>): ProcessRunOptions {
  const {env: _defaultEnvironment, ...defaultRest} = defaults;
  const {env: _overrideEnvironment, ...overrideRest} = overrides;
  const mergedEnvironment = mergeProcessEnvironment(defaults.env, overrides.env);

  return {
    ...defaultRest,
    ...overrideRest,
    ...(mergedEnvironment === undefined ? {} : {env: mergedEnvironment}),
  } satisfies ProcessRunOptions;
}

function mergeProcessEnvironment(defaults?: ProcessEnvironment, overrides?: ProcessEnvironment): ProcessEnvironment | undefined {
  if (defaults === undefined && overrides === undefined) {
    return undefined;
  }

  return {
    ...(defaults ?? {}),
    ...(overrides ?? {}),
  } satisfies Record<string, string | undefined>;
}
