/**
 * @fileoverview Context compatibility names backed only by canonical validated lib contracts.
 * @module github/scripts/src/hygiene/pipeline/context
 */
export {buildWorkflowContext as buildContextFromEnv, captureWorkflowContext, systemClock} from "../../../lib/context.ts";
export type {WorkflowContext as PipelineContext} from "../../../lib/context.ts";
