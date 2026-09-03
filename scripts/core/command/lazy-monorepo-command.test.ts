/**
 * @fileoverview Consumer test for the shared command lifecycle contract, plus lazy-loading
 * ordering assertions and the strict-TypeScript context-erasure proof unique to this module.
 * @module scripts/core/command/lazy-monorepo-command.test
 */

import {describe, expect, it} from "vitest";

import {runCommandLifecycleContract} from "../../testing/contracts/command-lifecycle.contract.ts";
import {buildCommandHost} from "../../testing/builders/command-host.builder.ts";
import type {CommandHost} from "./command-specification.ts";
import {defineLazyCommand, defineCommand, type LazyMonorepoCommand} from "./lazy-monorepo-command.ts";
import {defineWorkflowModule, type CommandWorkflowModuleDefinition} from "../workflow/workflow-composition.ts";
import {succeededWorkflowExecution} from "../workflow/workflow-execution-result.ts";

interface FixtureInput {
  readonly verbose?: boolean;
}

/** Concrete feature context recovered by a composed workflow module's closure. */
interface FixtureRuntimeContext {
  readonly verbose: boolean;
}

function createComposedFixtureCommand(host: CommandHost): LazyMonorepoCommand<FixtureInput, string, never> {
  return defineLazyCommand<FixtureInput, string, never>(
    {
      name: "fixture-composed",
      description: "Composed fixture command.",
      configure: (program) => {
        program.option("--verbose");
      },
      decode: (program) => program.opts<FixtureInput>(),
      loadWorkflow: async () =>
        defineWorkflowModule<FixtureInput, string, never, FixtureRuntimeContext>({
          specification: {name: "fixture-composed", execute: async () => succeededWorkflowExecution("ok")},
          runtimeCapabilities: ["presenter"],
          createContext: (input) => ({verbose: input.verbose === true}),
        }),
      loadPresentation: async () => ({
        present: (result) =>
          result.kind === "failed"
            ? {kind: "fail" as const, failure: {kind: "operational" as const, message: "unreachable", evidence: []}}
            : {kind: "complete" as const, completion: {exitCode: 0 as const, value: result.output}},
      }),
    },
    {host},
  );
}

runCommandLifecycleContract({
  label: "composed fixture command",
  createCommand: createComposedFixtureCommand,
  createInput: () => ({verbose: true}),
  successArguments: ["--verbose"],
});

describe("LazyMonorepoCommand", () => {
  it("loads neither the workflow nor the presentation module on a help path", async () => {
    let workflowLoadCount = 0;
    let presentationLoadCount = 0;
    const command = defineLazyCommand<Record<never, never>, string, never>(
      {
        name: "fixture",
        description: "Fixture command.",
        configure: (program) => program.allowExcessArguments(false),
        decode: () => ({}),
        loadWorkflow: async () => {
          workflowLoadCount += 1;
          return {
            runtimeCapabilities: ["presenter", "signal", "cleanup"],
            createContext: (_input, context) => context.runtime,
            runWorkflow: () => Promise.resolve({kind: "succeeded", output: "ok", evidence: [], durationMilliseconds: 0} as const),
          };
        },
        loadPresentation: async () => {
          presentationLoadCount += 1;
          return {present: (result) => ({kind: "complete", completion: {exitCode: 0, value: result.kind === "failed" ? "" : result.output}})};
        },
      },
      {host: buildCommandHost()},
    );

    await expect(command.run(["--help"])).resolves.toEqual({status: "help", exitCode: 0});
    expect(workflowLoadCount).toBe(0);
    expect(presentationLoadCount).toBe(0);
  });

  it("decides presentation before cleanup and emits completion output only after it", async () => {
    const order: string[] = [];
    const command = defineCommand<Record<never, never>, undefined>(
      {
        name: "fixture",
        description: "Fixture command.",
        configure: () => undefined,
        decode: () => ({}),
        execute: async (context) => {
          context.runtime.cleanup.register("resource", () => order.push("cleanup"));
          order.push("present");
          return undefined;
        },
        complete: () => ({
          exitCode: 0,
          value: undefined,
          human: () => {
            order.push("emit");
          },
        }),
      },
      {host: buildCommandHost()},
    );

    await command.run([]);
    expect(order).toEqual(["present", "cleanup", "emit"]);
  });

  it("assigns a concrete workflow module to the erased contract and executes it through the lifecycle", async () => {
    const concreteModule = defineWorkflowModule<FixtureInput, string, never, FixtureRuntimeContext>({
      specification: {name: "erasure-fixture", execute: async () => succeededWorkflowExecution("erased-ok")},
      runtimeCapabilities: ["presenter"],
      createContext: (input) => ({verbose: input.verbose === true}),
    });

    // Compile-time proof: a concrete `CommandWorkflowModuleDefinition<..., FixtureRuntimeContext>`
    // is assignable to the erased `TContext = unknown` contract under `strictFunctionTypes` and
    // `exactOptionalPropertyTypes`, with no cast.
    const erasedModule: CommandWorkflowModuleDefinition<FixtureInput, string, never> = concreteModule;

    const command = defineLazyCommand<FixtureInput, string, never>(
      {
        name: "erasure-fixture",
        description: "Fixture command.",
        configure: () => undefined,
        decode: () => ({}),
        loadWorkflow: async () => erasedModule,
        loadPresentation: async () => ({
          present: (result) =>
            result.kind === "failed"
              ? {kind: "fail" as const, failure: {kind: "operational" as const, message: "unreachable", evidence: []}}
              : {kind: "complete" as const, completion: {exitCode: 0 as const, value: result.output}},
        }),
      },
      {host: buildCommandHost()},
    );

    await expect(command.run([])).resolves.toEqual({status: "completed", value: "erased-ok", exitCode: 0});
  });
});
