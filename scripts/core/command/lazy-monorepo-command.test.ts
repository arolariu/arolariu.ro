/**
 * @fileoverview Consumer test for the shared command lifecycle contract, plus the lazy-loading,
 * feature-failure, interruption, and strict-TypeScript context-erasure assertions unique to the
 * composed (non-direct) command shape.
 * @module scripts/core/command/lazy-monorepo-command.test
 */

import {describe, expect, it} from "vitest";

import {buildCommandHost} from "../../testing/builders/command-host.builder.ts";
import {runCommandLifecycleContract} from "../../testing/contracts/command-lifecycle.contract.ts";
import {defineWorkflowModule, type CommandWorkflowModuleDefinition} from "../workflow/workflow-composition.ts";
import {succeededWorkflowExecution, type WorkflowInterruptedDecision} from "../workflow/workflow-execution-result.ts";
import type {FeatureCommandFailure, FeatureCommandFailureKind} from "./command-execution.ts";
import type {
  CommandHost,
  CommandIdentityDefinition,
  CommandInputDefinition,
  CommandPresentationDecision,
  CommandPresentationDefinition,
  CommandSpecification,
  CommandWorkflowLoadingDefinition,
} from "./command-specification.ts";
import {defineLazyCommand, type LazyMonorepoCommand} from "./lazy-monorepo-command.ts";

interface FixtureInput {
  readonly verbose?: boolean;
}

/** Concrete feature context recovered by a composed workflow module's closure. */
interface FixtureRuntimeContext {
  readonly verbose: boolean;
}

type FixtureCommand = LazyMonorepoCommand<FixtureInput, string, FeatureCommandFailure>;

const identity: CommandIdentityDefinition = {name: "fixture-composed", description: "Composed fixture command."};

const input: CommandInputDefinition<FixtureInput> = {
  configure: (program) => {
    program.option("--verbose");
  },
  decode: (program) => program.opts<FixtureInput>(),
};

const workflowLoading: CommandWorkflowLoadingDefinition<FixtureInput, string, FeatureCommandFailure> = {
  loadWorkflow: async () =>
    defineWorkflowModule<FixtureInput, string, FeatureCommandFailure, FixtureRuntimeContext>({
      specification: {name: "fixture-composed", execute: async () => succeededWorkflowExecution("ok")},
      runtimeCapabilities: ["presenter"],
      createContext: (decoded) => ({verbose: decoded.verbose === true}),
    }),
};

/** Completes with the workflow output, optionally recording that the deferred output was emitted. */
const completeWith = (output: string, onEmit?: () => void): CommandPresentationDecision<string> => ({
  kind: "complete",
  completion: {exitCode: 0, value: output, ...(onEmit === undefined ? {} : {human: onEmit})},
});

const presentation: CommandPresentationDefinition<string, FeatureCommandFailure> = {
  loadPresentation: async () => ({
    present: (result) => (result.kind === "failed" ? {kind: "fail", failure: result.failure} : completeWith(result.output)),
  }),
};

const composedSpecification: CommandSpecification<FixtureInput, string, FeatureCommandFailure> = {
  ...identity,
  ...input,
  ...workflowLoading,
  ...presentation,
};

const createComposedFixtureCommand = (host: CommandHost): FixtureCommand => defineLazyCommand(composedSpecification, {host});

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
    const command = defineLazyCommand<FixtureInput, string, FeatureCommandFailure>(
      {
        ...composedSpecification,
        loadWorkflow: async () => {
          workflowLoadCount += 1;
          return workflowLoading.loadWorkflow();
        },
        loadPresentation: async () => {
          presentationLoadCount += 1;
          return presentation.loadPresentation();
        },
      },
      {host: buildCommandHost()},
    );

    await expect(command.run(["--help"])).resolves.toEqual({status: "help", exitCode: 0});
    expect(workflowLoadCount).toBe(0);
    expect(presentationLoadCount).toBe(0);
  });

  it("runs the loaded presentation module before cleanup and emits its completion output only after", async () => {
    const order: string[] = [];
    const command = defineLazyCommand<FixtureInput, string, FeatureCommandFailure>(
      {
        ...composedSpecification,
        loadWorkflow: async () =>
          defineWorkflowModule<FixtureInput, string, FeatureCommandFailure, FixtureRuntimeContext>({
            specification: {name: "ordered", execute: async () => succeededWorkflowExecution("ok")},
            runtimeCapabilities: ["presenter", "cleanup"],
            createContext: (_decoded, context) => {
              context.runtime.cleanup.register("resource", () => order.push("cleanup"));
              return {verbose: false};
            },
          }),
        loadPresentation: async () => ({
          present: (result) => {
            order.push("present");
            return result.kind === "failed"
              ? {kind: "fail", failure: result.failure}
              : completeWith(result.output, () => {
                  order.push("emit");
                });
          },
        }),
      },
      {host: buildCommandHost()},
    );

    await expect(command.run([])).resolves.toMatchObject({status: "completed"});
    expect(order).toEqual(["present", "cleanup", "emit"]);
  });

  it.each<FeatureCommandFailureKind>(["operational", "internal"])(
    "maps a feature presenter's %s fail decision to exit code one, keeping the feature's own kind",
    async (kind) => {
      const failure: FeatureCommandFailure = {kind, message: "documentation tier missing", evidence: ["tier: reference"]};
      const command = defineLazyCommand<FixtureInput, string, FeatureCommandFailure>(
        {...composedSpecification, loadPresentation: async () => ({present: () => ({kind: "fail", failure})})},
        {host: buildCommandHost()},
      );

      await expect(command.run([])).resolves.toEqual({status: "failed", exitCode: 1, failure});
    },
  );

  it("maps an interrupted workflow result to a cancelled execution without consulting the presenter", async () => {
    const interrupted: WorkflowInterruptedDecision = {
      kind: "interrupted",
      exitCode: 143,
      message: "Terminated by SIGTERM.",
      evidence: ["signal: SIGTERM"],
    };
    let presentCallCount = 0;
    const command = defineLazyCommand<FixtureInput, string, FeatureCommandFailure>(
      {
        ...composedSpecification,
        loadWorkflow: async () => ({
          runtimeCapabilities: ["presenter"],
          createContext: () => undefined,
          runWorkflow: async () => ({...interrupted, durationMilliseconds: 4}),
        }),
        loadPresentation: async () => ({
          present: (result) => {
            presentCallCount += 1;
            return completeWith(result.kind === "failed" ? "" : result.output);
          },
        }),
      },
      {host: buildCommandHost()},
    );

    await expect(command.run([])).resolves.toEqual({
      status: "cancelled",
      exitCode: 143,
      failure: {kind: "cancelled", message: "Terminated by SIGTERM.", evidence: ["signal: SIGTERM"]},
    });
    expect(presentCallCount).toBe(0);
  });

  it("assigns a concrete workflow module to the erased contract and executes it through the lifecycle", async () => {
    const concreteModule = defineWorkflowModule<FixtureInput, string, never, FixtureRuntimeContext>({
      specification: {name: "erasure-fixture", execute: async () => succeededWorkflowExecution("erased-ok")},
      runtimeCapabilities: ["presenter"],
      createContext: (decoded) => ({verbose: decoded.verbose === true}),
    });

    // Compile-time proof: a concrete `CommandWorkflowModuleDefinition<..., FixtureRuntimeContext>`
    // is assignable to the erased `TContext = unknown` contract under `strictFunctionTypes` and
    // `exactOptionalPropertyTypes`, with no cast.
    const erasedModule: CommandWorkflowModuleDefinition<FixtureInput, string, never> = concreteModule;

    const command = defineLazyCommand<FixtureInput, string, never>(
      {
        ...identity,
        ...input,
        loadWorkflow: async () => erasedModule,
        loadPresentation: async () => ({present: (result) => completeWith(result.kind === "failed" ? "" : result.output)}),
      },
      {host: buildCommandHost()},
    );

    await expect(command.run([])).resolves.toEqual({status: "completed", value: "erased-ok", exitCode: 0});
  });
});
