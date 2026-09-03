/**
 * @fileoverview Composes a workflow specification and its context derivation into the module a
 * lazy command loads.
 * @module scripts/core/workflow/workflow-composition
 *
 * @remarks
 * `defineWorkflowModule` is the single channel by which a composed command's `parent` scope
 * reaches a feature's `createContext`. The command lifecycle calls `createContext(input, context,
 * parent)` before `runWorkflow`, and this module forwards every argument verbatim into the
 * closure supplied at definition time — it never reads `parent` from anywhere else.
 */

import type {CommandExecutionContext} from "../command/command-execution.ts";
import type {RuntimeCapabilityName} from "../runtime/runtime-capability.ts";
import {RuntimeWorkflowRunner} from "./abstract-workflow-runner.ts";
import type {WorkflowExecutionResult} from "./workflow-execution-result.ts";
import type {WorkflowExecutionSupport, WorkflowSpecification} from "./workflow-specification.ts";

/** The lazily loaded workflow module a `CommandSpecification.loadWorkflow` resolves. */
export interface CommandWorkflowModuleDefinition<TInput, TOutput, TFailure, TContext = unknown> {
  /** Exact capability set this workflow narrows the lazy core runtime to; an undeclared capability is a policy violation. */
  readonly runtimeCapabilities: readonly RuntimeCapabilityName[];
  /**
   * Narrows the full lazy runtime context to this feature's exact context. `parent` is the
   * composed-invocation parent scope, base-typed so an extended parent is structurally assignable
   * with no cast — **the single channel by which a parent reaches a feature or a direct command's
   * `createRuntimeContext`**; it is never carried only by the runtime factory's `createChild`.
   */
  readonly createContext: (
    input: Readonly<TInput>,
    context: Readonly<CommandExecutionContext>,
    parent?: Readonly<CommandExecutionContext>,
  ) => TContext;
  /**
   * Runs the workflow against the already-derived feature context produced by `createContext`.
   *
   * @remarks
   * Method syntax and the unwrapped `TContext` parameter are intentional: the command lifecycle
   * erases `TContext` to its default `unknown` at the `loadWorkflow` boundary, while
   * `defineWorkflowModule` closes over and recovers the concrete feature context. Under
   * `strictFunctionTypes`, changing this member to an arrow property or wrapping the erased
   * parameter in `Readonly<TContext>` makes a concrete feature module unassignable to the erased
   * module contract and makes the lifecycle call fail to type-check.
   */
  runWorkflow(featureContext: TContext, support: Readonly<WorkflowExecutionSupport>): Promise<WorkflowExecutionResult<TOutput, TFailure>>;
}

/** Composes a workflow specification and its context derivation into one lazily loaded module. */
export function defineWorkflowModule<TInput, TOutput, TFailure, TContext>(
  definition: Readonly<{
    readonly specification: WorkflowSpecification<TContext, TOutput, TFailure>;
    readonly runtimeCapabilities: readonly RuntimeCapabilityName[];
    /** Receives the parent scope verbatim; `defineWorkflowModule` forwards it unchanged. */
    readonly createContext: (
      input: Readonly<TInput>,
      context: Readonly<CommandExecutionContext>,
      parent?: Readonly<CommandExecutionContext>,
    ) => TContext;
  }>,
): CommandWorkflowModuleDefinition<TInput, TOutput, TFailure, TContext> {
  const {specification, runtimeCapabilities, createContext} = definition;
  return {
    runtimeCapabilities,
    createContext,
    runWorkflow(featureContext: TContext, support: Readonly<WorkflowExecutionSupport>): Promise<WorkflowExecutionResult<TOutput, TFailure>> {
      return new RuntimeWorkflowRunner<TContext, TOutput, TFailure>(support).run(specification, featureContext);
    },
  };
}
