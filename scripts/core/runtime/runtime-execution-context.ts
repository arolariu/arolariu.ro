/**
 * @fileoverview The complete engine-neutral execution context one command scope carries: exactly
 * the intersection of the declared capability facets, so a scope can never carry a capability that
 * has no declared name, and a narrower workflow can accept any subset it uses without a cast.
 * @module scripts/core/runtime/runtime-execution-context
 */

import type {
  BaseWorkflowRuntimeExecutionContext,
  EnvironmentRuntimeCapability,
  FilesystemRuntimeCapability,
  NetworkRuntimeCapability,
  ProcessRuntimeCapability,
  PromptRuntimeCapability,
  TaskRuntimeCapability,
  TimeRuntimeCapability,
} from "./runtime-capability.ts";

/** Complete engine-neutral execution context for one command scope. */
export type RuntimeExecutionContext = Readonly<
  BaseWorkflowRuntimeExecutionContext
    & EnvironmentRuntimeCapability
    & FilesystemRuntimeCapability
    & NetworkRuntimeCapability
    & ProcessRuntimeCapability
    & TimeRuntimeCapability
    & TaskRuntimeCapability
    & PromptRuntimeCapability
>;
