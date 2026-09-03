/**
 * @fileoverview Contract test for the concrete runtime workflow runner.
 * @module scripts/core/workflow/abstract-workflow-runner.test
 */

import {describe, expect, it} from "vitest";

import {runWorkflowRunnerContract} from "../../testing/contracts/workflow-runner.contract.ts";
import {RuntimeWorkflowRunner} from "./abstract-workflow-runner.ts";
import {degradedWorkflowExecution, failedWorkflowExecution} from "./workflow-execution-result.ts";

interface FixtureContext {
  readonly label: string;
}

runWorkflowRunnerContract<FixtureContext, string, Readonly<{reason: string}>>({
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

  it("returns a degraded decision produced by the specification's own execute", async () => {
    const specification = {name: "fixture-workflow", execute: async () => degradedWorkflowExecution("ok", ["degraded evidence"])};
    const result = await new RuntimeWorkflowRunner<FixtureContext, string, never>(support).run(specification, {label: "fixture"});
    expect(result).toMatchObject({kind: "degraded", output: "ok", evidence: ["degraded evidence"]});
  });

  it("returns a failed decision produced by the specification's own execute", async () => {
    const specification = {
      name: "fixture-workflow",
      execute: async () => failedWorkflowExecution<Readonly<{reason: string}>>({reason: "boom"}),
    };
    const result = await new RuntimeWorkflowRunner<FixtureContext, string, Readonly<{reason: string}>>(support).run(specification, {
      label: "fixture",
    });
    expect(result).toMatchObject({kind: "failed", failure: {reason: "boom"}});
  });
});
