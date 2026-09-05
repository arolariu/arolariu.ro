/**
 * @fileoverview Per-variant process execution result builders and in-memory runner fixtures.
 * @module scripts/testing/builders/process-result
 *
 * @remarks
 * One builder per {@link ProcessExecutionResult} variant, so no test constructs a result through
 * `Partial<ProcessExecutionResult>` or a type assertion. Two runner fixtures exist because they
 * answer different questions: {@link buildRecordingProcessRunner} replays a fixed queue, while
 * {@link buildProgrammableProcessRunner} decides per call, which is the only way to observe the
 * effective merged options of a scoped call, fail exactly one invocation, or reject from inside
 * the engine seam.
 */

import type {ProcessExecutionOptions, ProcessExecutionRequest} from "../../core/process/process-execution-request.ts";
import type {
  ProcessExecutionOutput,
  ProcessExecutionResult,
  ProcessTerminationSignal,
  SucceededProcessExecutionResult,
} from "../../core/process/process-execution-result.ts";
import {AbstractProcessRunner, type ProcessRunner} from "../../core/process/process-runner.ts";

/** Recorded invocation exposed by both runner fixtures. */
type RecordedProcessInvocation = Readonly<{request: ProcessExecutionRequest; options: ProcessExecutionOptions}>;

/** Runner fixture that also exposes every invocation it observed, in call order. */
type RecordingProcessRunner = ProcessRunner & Readonly<{calls: readonly RecordedProcessInvocation[]}>;

/** Per-call decision taken by a {@link buildProgrammableProcessRunner} fixture. */
type ProcessRunnerResponder = (
  request: Readonly<ProcessExecutionRequest>,
  options: Readonly<ProcessExecutionOptions>,
  callIndex: number,
) => ProcessExecutionResult | Promise<ProcessExecutionResult>;

/** Neutral captured output every builder starts from. */
const emptyProcessExecutionOutput = {stdout: "", stderr: "", durationMs: 0} as const satisfies ProcessExecutionOutput;

function withOutput(output?: Readonly<Partial<ProcessExecutionOutput>>): ProcessExecutionOutput {
  return {...emptyProcessExecutionOutput, ...output};
}

/**
 * Builds a succeeded result.
 *
 * @param output - Captured output overrides.
 * @returns A `succeeded` result whose exit code is narrowed to zero.
 */
export function buildSucceededProcessExecutionResult(output?: Readonly<Partial<ProcessExecutionOutput>>): SucceededProcessExecutionResult {
  return {kind: "succeeded", exitCode: 0, ...withOutput(output)};
}

/**
 * Builds a result for a process that exited with a nonzero code.
 *
 * @param exitCode - Exit code reported by the child.
 * @param output - Captured output overrides.
 * @returns An `exited` result.
 */
export function buildExitedProcessExecutionResult(
  exitCode: number,
  output?: Readonly<Partial<ProcessExecutionOutput>>,
): Extract<ProcessExecutionResult, {readonly kind: "exited"}> {
  return {kind: "exited", exitCode, ...withOutput(output)};
}

/**
 * Builds a result for a process terminated by a signal.
 *
 * @param signal - Termination signal reported by the host.
 * @param output - Captured output overrides.
 * @returns A `signalled` result.
 */
export function buildSignalledProcessExecutionResult(
  signal: ProcessTerminationSignal,
  output?: Readonly<Partial<ProcessExecutionOutput>>,
): Extract<ProcessExecutionResult, {readonly kind: "signalled"}> {
  return {kind: "signalled", signal, ...withOutput(output)};
}

/**
 * Builds a result for a process that never started.
 *
 * @param message - Underlying spawn failure message.
 * @param output - Captured output overrides.
 * @returns A `spawn-failed` result.
 */
export function buildSpawnFailedProcessExecutionResult(
  message: string,
  output?: Readonly<Partial<ProcessExecutionOutput>>,
): Extract<ProcessExecutionResult, {readonly kind: "spawn-failed"}> {
  return {kind: "spawn-failed", message, ...withOutput(output)};
}

/**
 * Builds a result for a process terminated by its timeout.
 *
 * @param options - Captured output overrides plus the optional reported signal.
 * @returns A `timed-out` result.
 */
export function buildTimedOutProcessExecutionResult(
  options?: Readonly<Partial<ProcessExecutionOutput> & {signal?: ProcessTerminationSignal}>,
): Extract<ProcessExecutionResult, {readonly kind: "timed-out"}> {
  const {signal, ...output} = options ?? {};
  return {kind: "timed-out", ...withOutput(output), ...(signal === undefined ? {} : {signal})};
}

/**
 * Builds a result for a cancelled process.
 *
 * @param options - Captured output overrides plus the optional reported signal.
 * @returns A `cancelled` result.
 */
export function buildCancelledProcessExecutionResult(
  options?: Readonly<Partial<ProcessExecutionOutput> & {signal?: ProcessTerminationSignal}>,
): Extract<ProcessExecutionResult, {readonly kind: "cancelled"}> {
  const {signal, ...output} = options ?? {};
  return {kind: "cancelled", ...withOutput(output), ...(signal === undefined ? {} : {signal})};
}

class ProgrammableProcessRunner extends AbstractProcessRunner {
  readonly #respond: ProcessRunnerResponder;
  readonly #calls: RecordedProcessInvocation[] = [];

  public constructor(respond: ProcessRunnerResponder) {
    super();
    this.#respond = respond;
  }

  /** Every recorded invocation, in call order. */
  public get calls(): readonly RecordedProcessInvocation[] {
    return this.#calls;
  }

  /** {@inheritDoc AbstractProcessRunner.execute} */
  protected override execute(
    request: Readonly<ProcessExecutionRequest>,
    options: Readonly<ProcessExecutionOptions>,
  ): Promise<ProcessExecutionResult> {
    const callIndex = this.#calls.length;
    this.#calls.push({request, options});
    return Promise.resolve(this.#respond(request, options, callIndex));
  }
}

/**
 * Builds a runner that replays a fixed result queue and records every invocation.
 *
 * @param results - Results returned in order; a succeeded result is returned once exhausted.
 * @returns A runner exposing its recorded calls.
 */
export function buildRecordingProcessRunner(results: readonly ProcessExecutionResult[] = []): RecordingProcessRunner {
  const queue = [...results];
  return new ProgrammableProcessRunner(() => queue.shift() ?? buildSucceededProcessExecutionResult());
}

/**
 * Builds a runner that decides each call from the request, its effective options, and its index.
 *
 * @param respond - Per-call decision function; may reject to prove engine-fault propagation.
 * @returns A runner exposing its recorded calls.
 */
export function buildProgrammableProcessRunner(respond: ProcessRunnerResponder): RecordingProcessRunner {
  return new ProgrammableProcessRunner(respond);
}
