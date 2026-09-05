/**
 * @fileoverview Engine-neutral process runner contract, shared execution policy, and typed failure.
 * @module scripts/core/process/process-runner
 *
 * @remarks
 * {@link AbstractProcessRunner} owns every behavior that does not depend on a process engine:
 * request validation, command echo, scoped defaults, environment merge order, and the
 * required-success policy. A process adapter supplies `execute` and nothing else.
 */

import {
  formatProcessExecutionRequest,
  type ProcessEnvironment,
  type ProcessExecutionOptions,
  type ProcessExecutionRequest,
} from "./process-execution-request.ts";
import {
  describeProcessExecutionFailure,
  processExecutionFailureEvidence,
  sanitizeFailedProcessExecutionResult,
  sanitizeProcessDiagnosticText,
  type FailedProcessExecutionResult,
  type ProcessExecutionResult,
  type SucceededProcessExecutionResult,
} from "./process-execution-result.ts";
import type {TerminalPresenter} from "../presentation/terminal-presenter.ts";

const EMPTY_PROCESS_EXECUTION_OPTIONS = {} satisfies ProcessExecutionOptions;

/** Engine-neutral process runner contract. */
export interface ProcessRunner {
  /** Executes one process and resolves its typed result. */
  run(request: Readonly<ProcessExecutionRequest>, options?: Readonly<ProcessExecutionOptions>): Promise<ProcessExecutionResult>;

  /** Executes one process and throws when it does not succeed. */
  expectSuccess(
    request: Readonly<ProcessExecutionRequest>,
    options?: Readonly<ProcessExecutionOptions>,
  ): Promise<SucceededProcessExecutionResult>;

  /** Applies reusable default options without mutating the parent runner. */
  scope(defaults: Readonly<ProcessExecutionOptions>): ProcessRunner;
}

/**
 * Typed process-runner failure thrown by `expectSuccess`.
 */
export class ProcessRunnerError extends Error {
  /** Retained request, redacted when the caller supplied a presenter. */
  public readonly request: Readonly<ProcessExecutionRequest>;

  /** Retained failed result, redacted when the caller supplied a presenter. */
  public readonly result: Readonly<FailedProcessExecutionResult>;

  /**
   * Creates a typed process-runner error with sanitized, bounded diagnostics.
   *
   * @param request - Original request.
   * @param result - Failed or interrupted process execution result.
   * @param presenter - Optional presenter used for secret redaction.
   */
  public constructor(
    request: Readonly<ProcessExecutionRequest>,
    result: Readonly<FailedProcessExecutionResult>,
    presenter?: TerminalPresenter,
  ) {
    const retainedRequest = presenter === undefined ? request : sanitizeProcessExecutionRequest(request, presenter);
    const retainedResult = presenter === undefined ? result : sanitizeFailedProcessExecutionResult(result, presenter);
    const failureSummary = describeProcessExecutionFailure(retainedResult);
    const command = sanitizeProcessDiagnosticText(formatProcessExecutionRequest(retainedRequest), presenter);
    const evidence = processExecutionFailureEvidence(retainedResult, presenter);

    super(evidence === "" ? `${failureSummary}: ${command}` : `${failureSummary}: ${command}\n${evidence}`);

    this.name = "ProcessRunnerError";
    this.request = retainedRequest;
    this.result = retainedResult;
  }
}

/**
 * Provides engine-neutral validation, command echo, scoping, and typed success policy.
 */
export abstract class AbstractProcessRunner implements ProcessRunner {
  /** {@inheritDoc ProcessRunner.run} */
  public run(
    request: Readonly<ProcessExecutionRequest>,
    options: Readonly<ProcessExecutionOptions> = EMPTY_PROCESS_EXECUTION_OPTIONS,
  ): Promise<ProcessExecutionResult> {
    const normalizedOptions = cloneProcessExecutionOptions(options);
    validateProcessExecutionRequest(request, normalizedOptions);

    if (normalizedOptions.logCommands === true) {
      normalizedOptions.presenter?.command(formatProcessExecutionRequest(request));
    }

    return this.execute(request, normalizedOptions);
  }

  /** {@inheritDoc ProcessRunner.expectSuccess} */
  public async expectSuccess(
    request: Readonly<ProcessExecutionRequest>,
    options: Readonly<ProcessExecutionOptions> = EMPTY_PROCESS_EXECUTION_OPTIONS,
  ): Promise<SucceededProcessExecutionResult> {
    const result = await this.run(request, options);
    if (isSucceededProcessExecutionResult(result)) {
      return result;
    }

    throw new ProcessRunnerError(request, result, options.presenter);
  }

  /** {@inheritDoc ProcessRunner.scope} */
  public scope(defaults: Readonly<ProcessExecutionOptions>): ProcessRunner {
    return new ScopedProcessRunner(this, defaults);
  }

  /**
   * Executes the engine-specific child-process work.
   *
   * @param request - Request to execute.
   * @param options - Validated execution options.
   * @returns Typed process execution result.
   */
  protected abstract execute(
    request: Readonly<ProcessExecutionRequest>,
    options: Readonly<ProcessExecutionOptions>,
  ): Promise<ProcessExecutionResult>;
}

class ScopedProcessRunner implements ProcessRunner {
  readonly #runner: ProcessRunner;
  readonly #defaults: ProcessExecutionOptions;

  public constructor(runner: ProcessRunner, defaults: Readonly<ProcessExecutionOptions>) {
    this.#runner = runner;
    this.#defaults = cloneProcessExecutionOptions(defaults);
  }

  public run(
    request: Readonly<ProcessExecutionRequest>,
    options: Readonly<ProcessExecutionOptions> = EMPTY_PROCESS_EXECUTION_OPTIONS,
  ): Promise<ProcessExecutionResult> {
    return this.#runner.run(request, mergeProcessExecutionOptions(this.#defaults, options));
  }

  public expectSuccess(
    request: Readonly<ProcessExecutionRequest>,
    options: Readonly<ProcessExecutionOptions> = EMPTY_PROCESS_EXECUTION_OPTIONS,
  ): Promise<SucceededProcessExecutionResult> {
    return this.#runner.expectSuccess(request, mergeProcessExecutionOptions(this.#defaults, options));
  }

  public scope(defaults: Readonly<ProcessExecutionOptions>): ProcessRunner {
    return new ScopedProcessRunner(this, defaults);
  }
}

function isSucceededProcessExecutionResult(result: ProcessExecutionResult): result is SucceededProcessExecutionResult {
  return result.kind === "succeeded";
}

function validateProcessExecutionRequest(request: Readonly<ProcessExecutionRequest>, options: Readonly<ProcessExecutionOptions>): void {
  if (request.command.trim().length === 0) {
    throw new Error("Command cannot be empty");
  }

  if (options.output === "inherit" && options.input !== undefined) {
    throw new Error("Cannot supply input when output is inherited");
  }
}

function sanitizeProcessExecutionRequest(
  request: Readonly<ProcessExecutionRequest>,
  presenter: TerminalPresenter,
): ProcessExecutionRequest {
  return {
    command: presenter.sanitize(request.command),
    args: request.args.map((argument) => presenter.sanitize(argument)),
  };
}

function cloneProcessExecutionOptions(options: Readonly<ProcessExecutionOptions>): ProcessExecutionOptions {
  return mergeProcessExecutionOptions(EMPTY_PROCESS_EXECUTION_OPTIONS, options);
}

function mergeProcessExecutionOptions(
  defaults: Readonly<ProcessExecutionOptions>,
  overrides: Readonly<ProcessExecutionOptions>,
): ProcessExecutionOptions {
  const {env: _defaultEnvironment, ...defaultRest} = defaults;
  const {env: _overrideEnvironment, ...overrideRest} = overrides;
  const mergedEnvironment = mergeProcessEnvironment(defaults.env, overrides.env);

  return {
    ...defaultRest,
    ...overrideRest,
    ...(mergedEnvironment === undefined ? {} : {env: mergedEnvironment}),
  } satisfies ProcessExecutionOptions;
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
