/**
 * @fileoverview The typed events a composed workflow publishes while it runs.
 * @module scripts/core/presentation/workflow-event
 *
 * @remarks
 * A feature reporter observes these events through the optional
 * `CommandResultPresenterDefinition.reportEvent` hook. `AbstractWorkflowRunner` is the sole
 * publisher of the `workflow-started`/`workflow-completed` pair; a feature's own
 * `WorkflowExecutionDefinition.execute` may publish `workflow-step-started`/
 * `workflow-step-completed` through the `WorkflowExecutionSupport` it receives.
 */

/** One typed lifecycle event published while a workflow runs. */
export type WorkflowEvent =
  | {readonly kind: "workflow-started"; readonly workflowName: string}
  | {readonly kind: "workflow-step-started"; readonly stepName: string}
  | {readonly kind: "workflow-step-completed"; readonly stepName: string; readonly durationMilliseconds: number}
  | {readonly kind: "workflow-completed"; readonly workflowName: string; readonly durationMilliseconds: number};
