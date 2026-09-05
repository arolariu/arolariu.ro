/**
 * @fileoverview Declarative description of one workflow's execution behavior and policy.
 * @module scripts/core/workflow/workflow-specification
 *
 * @remarks
 * A {@link WorkflowSpecification} is engine-neutral: it never touches a runner, an infrastructure
 * implementation, or a concrete context type by name. `AbstractWorkflowRunner` is the only thing
 * that executes one, and it supplies the {@link WorkflowExecutionSupport} every specification's
 * `execute` observes.
 */

import type {WorkflowEvent} from "../presentation/workflow-event.ts";
import type {WorkflowExecutionDecision} from "./workflow-execution-result.ts";

/** Capabilities `AbstractWorkflowRunner` injects into one workflow execution. */
export interface WorkflowExecutionSupport {
  /** Monotonically increasing time in milliseconds, used only to measure duration. */
  readonly monotonicNow: () => number;
  /** Cancellation signal for the whole invocation. */
  readonly signal: AbortSignal;
  /** Publishes one typed lifecycle event to the feature reporter, when one is attached. */
  readonly publishEvent: (event: WorkflowEvent) => void;
}

/** Logical workflow name, published with `workflow-started`/`workflow-completed`. */
export interface WorkflowIdentityDefinition {
  readonly name: string;
}

/** The workflow's own execution behavior, returning a pure, duration-free decision. */
export interface WorkflowExecutionDefinition<TContext, TOutput, TFailure> {
  readonly execute: (
    context: Readonly<TContext>,
    support: Readonly<WorkflowExecutionSupport>,
  ) => Promise<WorkflowExecutionDecision<TOutput, TFailure>>;
}

/** Optional policy a workflow specification may declare. */
export interface WorkflowPolicyDefinition<TContext, TOutput, TFailure> {
  /** Classifies one unexpected thrown value into a typed decision, or `undefined` to rethrow it unchanged. */
  readonly classifyUnexpectedFault?: (
    error: unknown,
    context: Readonly<TContext>,
  ) => WorkflowExecutionDecision<TOutput, TFailure> | undefined;
}

/** Declarative description of one workflow's identity, execution, and policy. */
export type WorkflowSpecification<TContext, TOutput, TFailure> = Readonly<
  WorkflowIdentityDefinition
    & WorkflowExecutionDefinition<TContext, TOutput, TFailure>
    & WorkflowPolicyDefinition<TContext, TOutput, TFailure>
>;
