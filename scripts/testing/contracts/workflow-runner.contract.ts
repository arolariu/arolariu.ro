/**
 * @fileoverview Shared workflow runner contract: every timing, event, and fault-classification
 * behavior an `AbstractWorkflowRunner` implementation must exhibit.
 * @module scripts/testing/contracts/workflow-runner.contract
 */

import {describe, expect, it} from "vitest";

import {CommandCancellation} from "../../common/runtime.ts";
import type {AbstractWorkflowRunner} from "../../core/workflow/abstract-workflow-runner.ts";
import {succeededWorkflowExecution} from "../../core/workflow/workflow-execution-result.ts";
import type {WorkflowExecutionDecision, WorkflowExecutionResult} from "../../core/workflow/workflow-execution-result.ts";
import type {WorkflowExecutionSupport, WorkflowSpecification} from "../../core/workflow/workflow-specification.ts";
import type {WorkflowEvent} from "../../core/presentation/workflow-event.ts";

/**
 * Runs the shared workflow runner contract.
 *
 * @param definition - The concrete runner under test, its feature context, and a specification
 * factory the test drives with a chosen decision (or a thrown-error thunk).
 */
export function runWorkflowRunnerContract<TContext, TOutput, TFailure>(
  definition: Readonly<{
    readonly label: string;
    readonly createRunner: (support: Readonly<WorkflowExecutionSupport>) => AbstractWorkflowRunner<TContext, TOutput, TFailure>;
    readonly createContext: () => Readonly<TContext>;
    readonly createSpecification: (
      decision: WorkflowExecutionDecision<TOutput, TFailure> | (() => never),
    ) => WorkflowSpecification<TContext, TOutput, TFailure>;
  }>,
): void {
  const {label, createRunner, createContext, createSpecification} = definition;

  function buildSupport(
    overrides: Readonly<Partial<WorkflowExecutionSupport>> = {},
  ): Readonly<{support: WorkflowExecutionSupport; events: readonly WorkflowEvent[]}> {
    const events: WorkflowEvent[] = [];
    const support: WorkflowExecutionSupport = {
      monotonicNow: () => 0,
      signal: new AbortController().signal,
      publishEvent: (event) => events.push(event),
      ...overrides,
    };
    return {support, get events(): readonly WorkflowEvent[] { return events; }} as const;
  }

  describe(`workflow runner contract: ${label}`, () => {
    it("adds durationMilliseconds computed from the injected monotonic clock", async () => {
      let calls = 0;
      const clockValues = [10, 35];
      const support: WorkflowExecutionSupport = {
        monotonicNow: () => clockValues[calls++] ?? 0,
        signal: new AbortController().signal,
        publishEvent: () => undefined,
      };
      const result = await createRunner(support).run(createSpecification(succeededWorkflowExecution({} as TOutput)), createContext());
      expect(result.durationMilliseconds).toBe(25);
    });

    it("publishes exactly one workflow-started and one workflow-completed event, in that order", async () => {
      const {support, events} = buildSupport();
      await createRunner(support).run(createSpecification(succeededWorkflowExecution({} as TOutput)), createContext());
      expect(events.map((event) => event.kind)).toEqual(["workflow-started", "workflow-completed"]);
    });

    it("forwards the exact feature context and support object to execute", async () => {
      const {support} = buildSupport();
      const context = createContext();
      let observedContext: unknown;
      let observedSupport: unknown;
      const specification: WorkflowSpecification<TContext, TOutput, TFailure> = {
        name: "fixture",
        execute: async (executeContext, executeSupport) => {
          observedContext = executeContext;
          observedSupport = executeSupport;
          return succeededWorkflowExecution({} as TOutput);
        },
      };
      await createRunner(support).run(specification, context);
      expect(observedContext).toBe(context);
      expect(observedSupport).toBe(support);
    });

    it("converts a thrown CommandCancellation into an interrupted decision carrying its exit code", async () => {
      const {support} = buildSupport();
      const cancellation = new CommandCancellation("Terminated by SIGTERM.", 143);
      const specification: WorkflowSpecification<TContext, TOutput, TFailure> = {
        name: "fixture",
        execute: async () => {
          throw cancellation;
        },
      };
      const result = await createRunner(support).run(specification, createContext());
      expect(result).toMatchObject({kind: "interrupted", exitCode: 143, message: "Terminated by SIGTERM."});
    });

    it("consults classifyUnexpectedFault before rethrowing an unexpected error", async () => {
      const {support} = buildSupport();
      const thrown = new Error("unexpected");
      const classified: WorkflowExecutionDecision<TOutput, TFailure> = succeededWorkflowExecution({} as TOutput);
      const specification: WorkflowSpecification<TContext, TOutput, TFailure> = {
        name: "fixture",
        execute: async () => {
          throw thrown;
        },
        classifyUnexpectedFault: (error) => (error === thrown ? classified : undefined),
      };
      const result: WorkflowExecutionResult<TOutput, TFailure> = await createRunner(support).run(specification, createContext());
      expect(result.kind).toBe(classified.kind);
    });

    it("rethrows an unclassified unexpected error unchanged", async () => {
      const {support} = buildSupport();
      const thrown = new Error("unclassified");
      const specification: WorkflowSpecification<TContext, TOutput, TFailure> = {
        name: "fixture",
        execute: async () => {
          throw thrown;
        },
      };
      await expect(createRunner(support).run(specification, createContext())).rejects.toBe(thrown);
    });
  });
}
