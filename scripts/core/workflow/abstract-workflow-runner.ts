/**
 * @fileoverview Shared workflow execution template: timing, lifecycle events, and cancellation
 * and fault classification, common to every workflow runner implementation.
 * @module scripts/core/workflow/abstract-workflow-runner
 *
 * @remarks
 * `AbstractWorkflowRunner` owns exactly what every workflow execution needs regardless of engine:
 * measuring `durationMilliseconds` from the injected clock, publishing `workflow-started` before
 * and `workflow-completed` after, converting a thrown {@link CommandCancellation} into an
 * `interrupted` decision, and consulting `classifyUnexpectedFault` before an unexpected error is
 * rethrown unchanged. `RuntimeWorkflowRunner` is the concrete implementation every composed
 * workflow module uses; only its `executeWorkflow` differs from a fake runner used in a test.
 */

import {CommandCancellation} from "../../common/runtime.ts";
import type {WorkflowExecutionDecision, WorkflowExecutionResult} from "./workflow-execution-result.ts";
import type {WorkflowExecutionSupport, WorkflowSpecification} from "./workflow-specification.ts";

/** Owns the shared workflow execution template every concrete runner relies on. */
export abstract class AbstractWorkflowRunner<TContext, TOutput, TFailure> {
  readonly #support: Readonly<WorkflowExecutionSupport>;

  /** @param support - Timing, cancellation, and event-publishing capabilities injected into every execution. */
  protected constructor(support: Readonly<WorkflowExecutionSupport>) {
    this.#support = support;
  }

  /**
   * Runs one workflow specification against its already-derived feature context.
   *
   * @throws The original unexpected error when it is neither a {@link CommandCancellation} nor
   * classified by `specification.classifyUnexpectedFault`.
   */
  public async run(
    specification: WorkflowSpecification<TContext, TOutput, TFailure>,
    context: Readonly<TContext>,
  ): Promise<WorkflowExecutionResult<TOutput, TFailure>> {
    const startedAt = this.#support.monotonicNow();
    this.#support.publishEvent({kind: "workflow-started", workflowName: specification.name});

    let decision: WorkflowExecutionDecision<TOutput, TFailure>;
    try {
      decision = await this.executeWorkflow(specification, context);
    } catch (error: unknown) {
      if (error instanceof CommandCancellation) {
        decision = {kind: "interrupted", exitCode: error.exitCode, message: error.message, evidence: []};
      } else {
        const classified = specification.classifyUnexpectedFault?.(error, context);
        if (classified === undefined) {
          throw error;
        }
        decision = classified;
      }
    }

    const durationMilliseconds = Math.max(0, this.#support.monotonicNow() - startedAt);
    this.#support.publishEvent({kind: "workflow-completed", workflowName: specification.name, durationMilliseconds});
    return {...decision, durationMilliseconds} as WorkflowExecutionResult<TOutput, TFailure>;
  }

  /** Runs the specification's own execution behavior. Implemented by every concrete runner. */
  protected abstract executeWorkflow(
    specification: WorkflowSpecification<TContext, TOutput, TFailure>,
    context: Readonly<TContext>,
  ): Promise<WorkflowExecutionDecision<TOutput, TFailure>>;
}

/**
 * The concrete workflow runner every composed workflow module uses: `executeWorkflow` simply
 * forwards to `specification.execute` with the runner's own injected support object.
 */
export class RuntimeWorkflowRunner<TContext, TOutput, TFailure> extends AbstractWorkflowRunner<TContext, TOutput, TFailure> {
  readonly #support: Readonly<WorkflowExecutionSupport>;

  public constructor(support: Readonly<WorkflowExecutionSupport>) {
    super(support);
    this.#support = support;
  }

  /** {@inheritDoc AbstractWorkflowRunner.executeWorkflow} */
  protected override executeWorkflow(
    specification: WorkflowSpecification<TContext, TOutput, TFailure>,
    context: Readonly<TContext>,
  ): Promise<WorkflowExecutionDecision<TOutput, TFailure>> {
    return specification.execute(context, this.#support);
  }
}
