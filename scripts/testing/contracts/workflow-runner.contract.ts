/**
 * @fileoverview Shared workflow runner contract: every timing, event, and fault-classification
 * behavior an `AbstractWorkflowRunner` implementation must exhibit.
 * @module scripts/testing/contracts/workflow-runner.contract
 */

import {describe, expect, it} from "vitest";

import {CommandCancellation} from "../../core/runtime/cancellation.ts";
import type {WorkflowEvent} from "../../core/presentation/workflow-event.ts";
import type {AbstractWorkflowRunner} from "../../core/workflow/abstract-workflow-runner.ts";
import {succeededWorkflowExecution, type WorkflowExecutionDecision} from "../../core/workflow/workflow-execution-result.ts";
import type {
  WorkflowExecutionDefinition,
  WorkflowExecutionSupport,
  WorkflowIdentityDefinition,
  WorkflowPolicyDefinition,
  WorkflowSpecification,
} from "../../core/workflow/workflow-specification.ts";

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
  const identity: WorkflowIdentityDefinition = {name: "fixture"};
  const succeeded = (): WorkflowExecutionDecision<TOutput, TFailure> => succeededWorkflowExecution({} as TOutput);

  /** Collects every published event while supplying a deterministic clock and signal. */
  function buildSupport(monotonicNow: () => number = () => 0): Readonly<{
    support: WorkflowExecutionSupport;
    events: readonly WorkflowEvent[];
  }> {
    const events: WorkflowEvent[] = [];
    return {support: {monotonicNow, signal: new AbortController().signal, publishEvent: (event) => events.push(event)}, events};
  }

  /** Builds a specification whose `execute` always throws, optionally under a classification policy. */
  function buildThrowingSpecification(
    thrown: unknown,
    policy: WorkflowPolicyDefinition<TContext, TOutput, TFailure> = {},
  ): WorkflowSpecification<TContext, TOutput, TFailure> {
    const execution: WorkflowExecutionDefinition<TContext, TOutput, TFailure> = {
      execute: async () => {
        throw thrown;
      },
    };
    return {...identity, ...execution, ...policy};
  }

  describe(`workflow runner contract: ${label}`, () => {
    it("adds durationMilliseconds computed from the injected monotonic clock", async () => {
      const clockValues = [10, 35];
      let calls = 0;
      const {support} = buildSupport(() => clockValues[calls++] ?? 0);
      const result = await createRunner(support).run(createSpecification(succeeded()), createContext());
      expect(result.durationMilliseconds).toBe(25);
    });

    it("publishes exactly one workflow-started and one workflow-completed event, in that order", async () => {
      const {support, events} = buildSupport();
      await createRunner(support).run(createSpecification(succeeded()), createContext());
      expect(events.map((event) => event.kind)).toEqual(["workflow-started", "workflow-completed"]);
    });

    it("forwards the exact feature context and support object to execute", async () => {
      const {support} = buildSupport();
      const context = createContext();
      let observedContext: unknown;
      let observedSupport: unknown;
      await createRunner(support).run(
        {
          ...identity,
          execute: async (executeContext, executeSupport) => {
            observedContext = executeContext;
            observedSupport = executeSupport;
            return succeeded();
          },
        },
        context,
      );
      expect(observedContext).toBe(context);
      expect(observedSupport).toBe(support);
    });

    it("converts a thrown CommandCancellation into an interrupted decision carrying its exit code", async () => {
      const {support} = buildSupport();
      const specification = buildThrowingSpecification(new CommandCancellation("Terminated by SIGTERM.", 143));
      const result = await createRunner(support).run(specification, createContext());
      expect(result).toMatchObject({kind: "interrupted", exitCode: 143, message: "Terminated by SIGTERM."});
    });

    it("consults classifyUnexpectedFault before rethrowing an unexpected error", async () => {
      const {support} = buildSupport();
      const thrown = new Error("unexpected");
      const specification = buildThrowingSpecification(thrown, {
        classifyUnexpectedFault: (error) => (error === thrown ? succeeded() : undefined),
      });
      const result = await createRunner(support).run(specification, createContext());
      expect(result.kind).toBe("succeeded");
    });

    it("rethrows an unclassified unexpected error unchanged", async () => {
      const {support} = buildSupport();
      const thrown = new Error("unclassified");
      await expect(createRunner(support).run(buildThrowingSpecification(thrown), createContext())).rejects.toBe(thrown);
    });
  });
}
