/**
 * @fileoverview Typed outcome of one workflow execution attempt, before command-lifecycle timing
 * and presentation are applied.
 * @module scripts/core/workflow/workflow-execution-result
 *
 * @remarks
 * A {@link WorkflowExecutionDecision} is what `WorkflowSpecification.execute` returns: the pure,
 * duration-free business decision. `AbstractWorkflowRunner.run` owns timing and returns the
 * corresponding {@link WorkflowExecutionResult}, which carries the same decision plus
 * `durationMilliseconds`, keeping a feature's `execute` free of clock bookkeeping.
 */

/** Timing every completed workflow execution carries, regardless of its outcome. */
interface WorkflowExecutionTimingDefinition {
  /** Wall-clock duration, measured by the runner's injected clock. */
  readonly durationMilliseconds: number;
}

/** The workflow produced its output with no degradation. */
export interface WorkflowSucceededDecision<TOutput> {
  readonly kind: "succeeded";
  readonly output: TOutput;
  /** Bounded supporting detail lines describing how the output was produced. */
  readonly evidence: readonly string[];
}

/** The workflow produced usable output, but under a known, reported degradation. */
interface WorkflowDegradedDecision<TOutput> {
  readonly kind: "degraded";
  readonly output: TOutput;
  /** Bounded supporting detail lines describing the degradation; never empty. */
  readonly evidence: readonly string[];
}

/** The workflow could not produce output and reports a typed feature failure. */
interface WorkflowFailedDecision<TFailure> {
  readonly kind: "failed";
  readonly failure: TFailure;
  readonly evidence: readonly string[];
}

/** The workflow was interrupted by cancellation before it could produce a decision. */
interface WorkflowInterruptedDecision {
  readonly kind: "interrupted";
  /** `130` for `SIGINT`, `143` for `SIGTERM`. */
  readonly exitCode: 130 | 143;
  readonly message: string;
  readonly evidence: readonly string[];
}

/** The pure, duration-free decision a workflow's own execution produces. */
export type WorkflowExecutionDecision<TOutput, TFailure> =
  | WorkflowSucceededDecision<TOutput>
  | WorkflowDegradedDecision<TOutput>
  | WorkflowFailedDecision<TFailure>
  | WorkflowInterruptedDecision;

/** The timed result `AbstractWorkflowRunner.run` returns for one workflow execution. */
export type WorkflowExecutionResult<TOutput, TFailure> =
  | Readonly<WorkflowSucceededDecision<TOutput> & WorkflowExecutionTimingDefinition>
  | Readonly<WorkflowDegradedDecision<TOutput> & WorkflowExecutionTimingDefinition>
  | Readonly<WorkflowFailedDecision<TFailure> & WorkflowExecutionTimingDefinition>
  | Readonly<WorkflowInterruptedDecision & WorkflowExecutionTimingDefinition>;

/** Builds a succeeded workflow decision. `evidence` defaults to an empty list. */
export function succeededWorkflowExecution<TOutput>(output: TOutput, evidence: readonly string[] = []): WorkflowSucceededDecision<TOutput> {
  return {kind: "succeeded", output, evidence};
}

/** Builds a degraded workflow decision; `evidence` is required (a degradation without it is an ordinary success). */
export function degradedWorkflowExecution<TOutput>(output: TOutput, evidence: readonly string[]): WorkflowDegradedDecision<TOutput> {
  return {kind: "degraded", output, evidence};
}

/** Builds a failed workflow decision. `evidence` defaults to an empty list. */
export function failedWorkflowExecution<TFailure>(failure: TFailure, evidence: readonly string[] = []): WorkflowFailedDecision<TFailure> {
  return {kind: "failed", failure, evidence};
}
