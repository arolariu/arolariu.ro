// @vitest-environment node
/**
 * @fileoverview Composition and lifecycle contract tests for the generate orchestrator.
 * @module scripts/generate.test
 */

import {describe, expect, it} from "vitest";

import type {CommandExecution, CommandInvoker, CommandPresentation} from "./common/commander.ts";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import {createTestRuntimeFactory} from "./common/runtime.testing.ts";
import type {ArtifactGenerationResult, GenerateArtifactsInput} from "./generate.artifacts.ts";
import type {GenerateLeafInput, GenerateLeafResult} from "./generate.env.ts";
import {createGenerateCommand, type GenerateCommandDependencies, type GenerateTaskName} from "./generate.ts";

/** One recorded nested generator invocation. */
interface RecordedGeneratorCall {
  /** Selected generator that was invoked. */
  readonly name: GenerateTaskName;
  /** Verbosity the aggregate propagated into the child input. */
  readonly verbose: boolean;
  /** Presentation the aggregate selected for the child invocation. */
  readonly presentation: CommandPresentation | undefined;
  /** Whether the child invocation was scoped to the aggregate's own context. */
  readonly parented: boolean;
}

/** Overridable child executions used by one aggregate composition test. */
interface DependencyOverrides {
  readonly env?: CommandExecution<GenerateLeafResult>;
  readonly i18n?: CommandExecution<GenerateLeafResult>;
  readonly gql?: CommandExecution<GenerateLeafResult>;
  readonly artifacts?: CommandExecution<ArtifactGenerationResult>;
}

function completedLeaf(summary: string, exitCode: 0 | 1 = 0): CommandExecution<GenerateLeafResult> {
  return {status: "completed", value: {summary, changedFiles: []}, exitCode};
}

function completedArtifacts(exitCode: 0 | 1 = 0): CommandExecution<ArtifactGenerationResult> {
  return {status: "completed", value: {summary: "Generated 7 artifact file(s).", generatedFiles: []}, exitCode};
}

function failedLeaf(message: string): CommandExecution<GenerateLeafResult> {
  return {status: "failed", failure: {kind: "operational", message, evidence: []}, exitCode: 1};
}

function cancelledLeaf(message: string): CommandExecution<GenerateLeafResult> {
  return {status: "cancelled", failure: {kind: "cancelled", message, evidence: []}, exitCode: 130};
}

/**
 * Builds recording fakes for every child generator without spawning a process or touching disk.
 *
 * @param overrides - Executions returned by individual children.
 * @returns The recorded call log and the typed dependency bundle.
 */
function createRecordingDependencies(
  overrides: Readonly<DependencyOverrides> = {},
): Readonly<{calls: RecordedGeneratorCall[]; dependencies: GenerateCommandDependencies}> {
  const calls: RecordedGeneratorCall[] = [];

  const leaf = (name: GenerateTaskName, execution: CommandExecution<GenerateLeafResult>): CommandInvoker<GenerateLeafInput, GenerateLeafResult> => ({
    invoke: async (input, options) => {
      calls.push({
        name,
        verbose: input.verbose,
        presentation: options?.presentation,
        parented: options?.parent !== undefined,
      });
      return execution;
    },
  });

  const artifacts: CommandInvoker<GenerateArtifactsInput, ArtifactGenerationResult> = {
    invoke: async (input, options) => {
      calls.push({
        name: "artifacts",
        verbose: input.verbose,
        presentation: options?.presentation,
        parented: options?.parent !== undefined,
      });
      return overrides.artifacts ?? completedArtifacts();
    },
  };

  return {
    calls,
    dependencies: {
      env: leaf("env", overrides.env ?? completedLeaf("env")),
      i18n: leaf("i18n", overrides.i18n ?? completedLeaf("i18n")),
      gql: leaf("gql", overrides.gql ?? completedLeaf("gql")),
      artifacts,
    },
  };
}

function makeLoggerFixture(): Readonly<{logger: MonorepositoryConsoleLogger; sink: InMemoryLoggerSink}> {
  const sink = new InMemoryLoggerSink();
  return {logger: new MonorepositoryConsoleLogger("test::generate", {color: false, sink}), sink};
}

describe("generate composition", () => {
  it("invokes selected generators in fixed order and stops on first nonzero completion", async () => {
    const {calls, dependencies} = createRecordingDependencies({i18n: completedLeaf("i18n", 1)});
    const command = createGenerateCommand(dependencies, createTestRuntimeFactory());

    const execution = await command.invoke({verbose: false, env: true, i18n: true, gql: true, artifacts: true});

    expect(calls.map((call) => call.name)).toEqual(["env", "i18n"]);
    expect(execution).toMatchObject({status: "completed", exitCode: 1});
  });

  it("logs the completed child's typed summary before stopping on a nonzero exit", async () => {
    const {calls, dependencies} = createRecordingDependencies({i18n: completedLeaf("Added 3 missing translation keys.", 1)});
    const {logger, sink} = makeLoggerFixture();
    const command = createGenerateCommand(dependencies, createTestRuntimeFactory({logger}));

    const execution = await command.invoke(
      {verbose: false, env: true, i18n: true, gql: true, artifacts: true},
      {presentation: "human"},
    );

    expect(calls.map((call) => call.name)).toEqual(["env", "i18n"]);
    expect(execution).toMatchObject({status: "completed", exitCode: 1});
    expect(sink.records.some((record) => record.text.includes("Added 3 missing translation keys."))).toBe(true);
  });

  it("reports the failing generator and the generators that already completed", async () => {
    const {calls, dependencies} = createRecordingDependencies({gql: failedLeaf("GraphQL codegen exploded.")});
    const command = createGenerateCommand(dependencies, createTestRuntimeFactory());

    const execution = await command.invoke({verbose: false, env: true, i18n: true, gql: true, artifacts: true});

    expect(calls.map((call) => call.name)).toEqual(["env", "i18n", "gql"]);
    expect(execution).toMatchObject({
      status: "completed",
      exitCode: 1,
      value: {selected: ["env", "i18n", "gql", "artifacts"], completed: ["env", "i18n"], failed: "gql"},
    });
  });

  it("propagates a cancelled child as a cancelled aggregate invocation", async () => {
    const {calls, dependencies} = createRecordingDependencies({env: cancelledLeaf("Command interrupted by SIGINT.")});
    const command = createGenerateCommand(dependencies, createTestRuntimeFactory());

    const execution = await command.invoke({verbose: false, env: true, i18n: true, gql: false, artifacts: false});

    expect(calls.map((call) => call.name)).toEqual(["env"]);
    expect(execution).toMatchObject({status: "cancelled", exitCode: 130});
  });

  it("runs every selected generator in the fixed env, i18n, gql, artifacts order", async () => {
    const {calls, dependencies} = createRecordingDependencies();
    const command = createGenerateCommand(dependencies, createTestRuntimeFactory());

    const execution = await command.invoke({verbose: false, env: true, i18n: true, gql: true, artifacts: true});

    expect(calls.map((call) => call.name)).toEqual(["env", "i18n", "gql", "artifacts"]);
    expect(execution).toMatchObject({
      status: "completed",
      exitCode: 0,
      value: {selected: ["env", "i18n", "gql", "artifacts"], completed: ["env", "i18n", "gql", "artifacts"]},
    });
  });

  it("invokes every child in the aggregate's own runtime scope without rendering child output", async () => {
    const {calls, dependencies} = createRecordingDependencies();
    const command = createGenerateCommand(dependencies, createTestRuntimeFactory());

    await command.invoke({verbose: false, env: true, i18n: false, gql: false, artifacts: true}, {presentation: "human"});

    expect(calls).toEqual([
      {name: "env", verbose: false, presentation: "silent", parented: true},
      {name: "artifacts", verbose: false, presentation: "silent", parented: true},
    ]);
  });

  it("executes no generator and completes successfully when no task is selected", async () => {
    const {calls, dependencies} = createRecordingDependencies();
    const {logger, sink} = makeLoggerFixture();
    const command = createGenerateCommand(dependencies, createTestRuntimeFactory({logger}));

    const execution = await command.invoke(
      {verbose: false, env: false, i18n: false, gql: false, artifacts: false},
      {presentation: "human"},
    );

    expect(calls).toEqual([]);
    expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {selected: [], completed: []}});
    expect(sink.records.some((record) => record.text.includes("No generation tasks selected"))).toBe(true);
    expect(
      sink.records.some((record) => record.text.includes("Tip: Pass one or more tasks (e.g. npm run generate -- env i18n gql artifacts).")),
    ).toBe(true);
    expect(sink.records.some((record) => record.text.includes("/env"))).toBe(false);
  });

  it("characterizes the exact no-task human tail: one warning, one tip, and no completion line", async () => {
    // Arrange
    const {dependencies} = createRecordingDependencies();
    const {logger, sink} = makeLoggerFixture();
    const command = createGenerateCommand(dependencies, createTestRuntimeFactory({logger}));

    // Act
    const execution = await command.invoke(
      {verbose: false, env: false, i18n: false, gql: false, artifacts: false},
      {presentation: "human"},
    );

    // Assert
    expect(execution).toEqual({status: "completed", value: {selected: [], completed: []}, exitCode: 0});
    expect(sink.records.slice(-3).map(({stream, text}) => ({stream, text}))).toEqual([
      {stream: "stdout", text: ""},
      {stream: "stderr", text: "[arolariu::test::generate] ⚠️ No generation tasks selected. Nothing to do."},
      {stream: "stdout", text: "   Tip: Pass one or more tasks (e.g. npm run generate -- env i18n gql artifacts)."},
    ]);
  });

  it("characterizes the exact success lines when every selected task completes", async () => {
    // Arrange
    const {dependencies} = createRecordingDependencies();
    const {logger, sink} = makeLoggerFixture();
    const command = createGenerateCommand(dependencies, createTestRuntimeFactory({logger}));

    // Act
    const execution = await command.invoke(
      {verbose: false, env: true, i18n: true, gql: true, artifacts: true},
      {presentation: "human"},
    );

    // Assert
    expect(execution).toMatchObject({status: "completed", exitCode: 0});
    expect(sink.records.slice(-11).map(({stream, text}) => ({stream, text}))).toEqual([
      {stream: "stdout", text: "[arolariu::test::generate] ℹ️ Running environment configuration generator..."},
      {stream: "stdout", text: "[arolariu::test::generate] ✅ env"},
      {stream: "stdout", text: "[arolariu::test::generate] ℹ️ Running internationalization (i18n) generator..."},
      {stream: "stdout", text: "[arolariu::test::generate] ✅ i18n"},
      {stream: "stdout", text: "[arolariu::test::generate] ℹ️ Running GraphQL types generator..."},
      {stream: "stdout", text: "[arolariu::test::generate] ✅ gql"},
      {stream: "stdout", text: "[arolariu::test::generate] ℹ️ Running taxonomy and license artifact generator..."},
      {stream: "stdout", text: "[arolariu::test::generate] ✅ Generated 7 artifact file(s)."},
      {stream: "stdout", text: ""},
      {stream: "stdout", text: "[arolariu::test::generate] ✅ All requested generation tasks completed."},
      {stream: "stdout", text: "   Executed 4 task(s)."},
    ]);
  });

  it("propagates verbose into every child", async () => {
    const {calls, dependencies} = createRecordingDependencies();
    const command = createGenerateCommand(dependencies, createTestRuntimeFactory());

    await command.invoke({verbose: true, env: true, i18n: false, gql: false, artifacts: true});

    expect(calls).toEqual([
      {name: "env", verbose: true, presentation: "silent", parented: true},
      {name: "artifacts", verbose: true, presentation: "silent", parented: true},
    ]);
  });
});
