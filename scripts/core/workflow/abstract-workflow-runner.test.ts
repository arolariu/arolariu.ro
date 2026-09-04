/**
 * @fileoverview Contract test for the concrete runtime workflow runner.
 * @module scripts/core/workflow/abstract-workflow-runner.test
 */

import {describe, expect, it} from "vitest";

import {runWorkflowRunnerContract} from "../../testing/contracts/workflow-runner.contract.ts";
import {RuntimeWorkflowRunner} from "./abstract-workflow-runner.ts";
import {
  degradedWorkflowExecution,
  failedWorkflowExecution,
  type WorkflowDegradedDecision,
  type WorkflowExecutionTimingDefinition,
  type WorkflowFailedDecision,
} from "./workflow-execution-result.ts";

interface FixtureContext {
  readonly label: string;
}

interface FixtureFailure {
  readonly reason: string;
}

runWorkflowRunnerContract<FixtureContext, string, FixtureFailure>({
  label: "RuntimeWorkflowRunner",
  createRunner: (support) => new RuntimeWorkflowRunner(support),
  createContext: () => ({label: "fixture"}),
  createSpecification: (decision) => ({
    name: "fixture-workflow",
    execute: async () => (typeof decision === "function" ? decision() : decision),
  }),
});

describe("RuntimeWorkflowRunner", () => {
  const support = {monotonicNow: () => 0, signal: new AbortController().signal, publishEvent: () => undefined};
  const context: FixtureContext = {label: "fixture"};

  it("returns a timed degraded decision produced by the specification's own execute", async () => {
    const decision: WorkflowDegradedDecision<string> = degradedWorkflowExecution("ok", ["degraded evidence"]);
    const result = await new RuntimeWorkflowRunner<FixtureContext, string, never>(support).run(
      {name: "fixture-workflow", execute: async () => decision},
      context,
    );
    const timing: WorkflowExecutionTimingDefinition = result;
    expect(result).toMatchObject({kind: "degraded", output: "ok", evidence: ["degraded evidence"]});
    expect(timing.durationMilliseconds).toBe(0);
  });

  it("returns a failed decision produced by the specification's own execute", async () => {
    const decision: WorkflowFailedDecision<FixtureFailure> = failedWorkflowExecution({reason: "boom"});
    const result = await new RuntimeWorkflowRunner<FixtureContext, string, FixtureFailure>(support).run(
      {name: "fixture-workflow", execute: async () => decision},
      context,
    );
    expect(result).toMatchObject({kind: "failed", failure: {reason: "boom"}});
  });
});
