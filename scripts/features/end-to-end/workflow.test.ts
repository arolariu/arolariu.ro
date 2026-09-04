// @vitest-environment node
/**
 * @fileoverview Target expansion, sequential execution, the three auth policies, cancellation
 * classification, Newman argument assembly, cleanup precedence, and the four typed
 * `EndToEndFailure` paths. Every process interaction is served by
 * {@link buildProgrammableProcessRunner}: no case here spawns Newman, reaches a service, or
 * transports a real credential.
 * @module scripts/features/end-to-end/workflow.test
 */

import {join} from "node:path";
import {describe, expect, it} from "vitest";

import type {CommandExecutionContext} from "../../core/command/command-execution.ts";
import type {PresentableWorkflowExecutionResult} from "../../core/command/command-specification.ts";
import {ProcessRunnerError} from "../../core/process/process-runner.ts";
import {CommandCancellation} from "../../core/runtime/cancellation.ts";
import type {FileSystem} from "../../core/runtime/runtime-capability.ts";
import type {RuntimeExecutionContext} from "../../core/runtime/runtime-execution-context.ts";
import type {WorkflowExecutionResult} from "../../core/workflow/workflow-execution-result.ts";
import {buildCommandHost} from "../../testing/builders/command-host.builder.ts";
import {buildRuntimeEnvironment} from "../../testing/builders/environment.builder.ts";
import {
  buildCancelledProcessExecutionResult,
  buildExitedProcessExecutionResult,
  buildProgrammableProcessRunner,
  buildSpawnFailedProcessExecutionResult,
  buildSucceededProcessExecutionResult,
  buildTimedOutProcessExecutionResult,
} from "../../testing/builders/process-result.builder.ts";
import {buildRuntimeExecutionContext} from "../../testing/builders/runtime-context.builder.ts";
import {createMemoryFileSystem} from "../../testing/fixtures/memory-filesystem.fixture.ts";
import {repositoryFixtureRoot} from "../../testing/fixtures/repository.fixture.ts";
import {buildRecordingPresenter} from "../../testing/fixtures/terminal.fixture.ts";
import {createEndToEndCommand} from "./command.ts";
import type {EndToEndInput} from "./input.ts";
import {endToEndPresenter} from "./reporter.ts";
import {endToEndExecutionOrder, type RunnableEndToEndTarget} from "./targets.ts";
import {endToEndWorkflowModule, type EndToEndFailure, type EndToEndResult} from "./workflow.ts";

/** Deliberately non-JWT-shaped fake secret used for `--env-var` transport proofs. */
const FAKE_TOKEN = "e2e-test-secret-value";

/** Every runnable target's fixture directory, matching the production target configuration. */
const TARGET_DIRECTORIES = {backend: "sites/api.arolariu.ro", frontend: "sites/arolariu.ro", cv: "sites/cv.arolariu.ro"} as const;

const reportDirectory = join(repositoryFixtureRoot, "e2e-logs");
const collectionPathFor = (target: RunnableEndToEndTarget): string =>
  join(repositoryFixtureRoot, TARGET_DIRECTORIES[target], "postman-collection.json");
const environmentPathFor = (target: RunnableEndToEndTarget, profile = "production"): string =>
  join(repositoryFixtureRoot, TARGET_DIRECTORIES[target], `postman-environment.${profile}.json`);

/** Builds an in-memory filesystem seeded with every target's collection and environment file. */
function fixtureFiles(overrides: Readonly<Record<string, string>> = {}): FileSystem {
  const seeded: Record<string, string> = {};
  for (const target of endToEndExecutionOrder) {
    seeded[collectionPathFor(target)] = JSON.stringify({info: {name: "test"}, item: []});
    seeded[environmentPathFor(target)] = JSON.stringify({name: "env", values: []});
  }
  return createMemoryFileSystem({...seeded, ...overrides});
}

/** Builds a runtime whose environment carries only the supplied variables. */
const fixtureRuntime = (
  runner: ReturnType<typeof buildProgrammableProcessRunner>,
  variables: Readonly<Record<string, string>> = {},
  overrides: Readonly<Partial<RuntimeExecutionContext>> = {},
): Readonly<Partial<RuntimeExecutionContext>> => ({
  files: fixtureFiles(),
  runner,
  environment: buildRuntimeEnvironment({variables}),
  ...overrides,
});

/** Runs the real command against fixture capabilities, without any Commander parsing. */
const invokeEndToEnd = async (runtime: Readonly<Partial<RuntimeExecutionContext>>, input: Readonly<EndToEndInput>, signal?: AbortSignal) =>
  createEndToEndCommand({host: buildCommandHost({runtime})}).invoke(input, signal === undefined ? {} : {signal});

/** A runner that always simulates a completed Newman run. */
const succeedingRunner = () => buildProgrammableProcessRunner(() => buildSucceededProcessExecutionResult());

/** Runs the workflow module directly, so its typed decision is observable without the lifecycle. */
function runWorkflowDirectly(input: Readonly<EndToEndInput>, runtime: Readonly<Partial<RuntimeExecutionContext>>) {
  const context: CommandExecutionContext = {runtime: buildRuntimeExecutionContext(runtime), presentation: "silent"};
  const result: Promise<WorkflowExecutionResult<EndToEndResult, EndToEndFailure>> = endToEndWorkflowModule.runWorkflow(
    endToEndWorkflowModule.createContext(input, context),
    {monotonicNow: () => 0, signal: context.runtime.signal, publishEvent: () => undefined},
  );
  return {context, result};
}

/** Presents one typed failure decision exactly as the lifecycle would. */
async function presentFailure(decision: WorkflowExecutionResult<EndToEndResult, EndToEndFailure>, context: CommandExecutionContext) {
  if (decision.kind === "interrupted") throw new Error(`Unexpected interrupted workflow result: ${decision.message}`);
  const presentable: PresentableWorkflowExecutionResult<EndToEndResult, EndToEndFailure> = decision;
  const presentation = await endToEndPresenter.present(presentable, context);
  if (presentation.kind !== "fail") throw new Error("The reporter must fail a typed end-to-end failure.");
  return presentation.failure;
}

/** Builds a runner that writes a Newman JSON reporter artifact through `base`, plus a filesystem
 * view whose backend JSON write always fails, so that target's report cleanup fails. */
function failingJsonCleanupFixture() {
  const base = fixtureFiles();
  const writeArtifact = async (request: Readonly<{args: readonly string[]}>): Promise<void> => {
    const path = request.args[request.args.indexOf("--reporter-json-export") + 1] ?? "";
    await base.createDirectory(reportDirectory, {recursive: true});
    await base.writeText(path, JSON.stringify({run: {failures: []}}));
  };
  const files: FileSystem = {
    ...base,
    writeText: async (path, contents, options) => {
      if (path.endsWith("newman-backend.json")) throw new Error("disk full");
      return base.writeText(path, contents, options);
    },
  };
  return {files, writeArtifact};
}

/** The only environment variable most cases need: a present, redactable auth token. */
const withToken = {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN} as const;

/** Matches the aggregated cleanup evidence line the backend report cleanup contributes. */
const isBackendCleanupEvidence = (line: string): boolean => line.startsWith("e2e report cleanup (backend):") && line.includes("disk full");

/** Reads one flag value out of a recorded Newman argument list. */
const argumentAfter = (args: readonly string[], flag: string): string | undefined => args[args.indexOf(flag) + 1];

/** The three auth policies, table-driven exactly as the production target table declares them. */
const authPolicyTable = [
  ["backend", "required"],
  ["frontend", "optional"],
  ["cv", "ignored"],
] as const;

describe("end-to-end target expansion and sequential execution", () => {
  it("expands 'all' into frontend, backend, cv, completes them in that order, and returns a fresh list", async () => {
    const runner = succeedingRunner();
    const runtime = fixtureRuntime(runner, withToken);
    const execution = await invokeEndToEnd(runtime, {target: "all"});
    const second = await invokeEndToEnd(runtime, {target: "all"});
    expect(endToEndExecutionOrder).toEqual(["frontend", "backend", "cv"]);
    expect(execution).toMatchObject({
      status: "completed",
      exitCode: 0,
      value: {targets: ["frontend", "backend", "cv"], completed: ["frontend", "backend", "cv"]},
    });
    expect(runner.calls.map(({request}) => request.args.find((argument) => argument.endsWith("postman-collection.json")))).toEqual([
      ...(["frontend", "backend", "cv"] as const).map(collectionPathFor),
      ...(["frontend", "backend", "cv"] as const).map(collectionPathFor),
    ]);
    if (execution.status !== "completed" || second.status !== "completed") return;
    expect(second.value.targets).toEqual(execution.value.targets);
    expect(second.value.targets).not.toBe(execution.value.targets);
  });

  it("stops at the first failing target and never starts an unreached one", async () => {
    const runner = buildProgrammableProcessRunner((request) =>
      request.args.includes(collectionPathFor("backend")) ? buildExitedProcessExecutionResult(1) : buildSucceededProcessExecutionResult(),
    );
    const execution = await invokeEndToEnd(fixtureRuntime(runner, withToken), {target: "all"});
    expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "operational"}});
    // Only frontend and backend were attempted; cv was never reached.
    expect(runner.calls).toHaveLength(2);
  });
});

describe("end-to-end auth policy", () => {
  it.each(authPolicyTable)(
    "transports a present token for %s under its %s policy, never mutating the collection",
    async (target, policy) => {
      const runner = succeedingRunner();
      const files = fixtureFiles();
      const {presenter, sink} = buildRecordingPresenter();
      const originalCollection = await files.readText(collectionPathFor(target));
      const execution = await invokeEndToEnd(fixtureRuntime(runner, withToken, {files, presenter}), {target});
      expect(execution).toMatchObject({status: "completed", exitCode: 0, value: {targets: [target], completed: [target]}});
      const args = runner.calls[0]?.request.args ?? [];
      expect(args.filter((argument) => argument === "--env-var")).toHaveLength(policy === "ignored" ? 0 : 1);
      if (policy !== "ignored") expect(argumentAfter(args, "--env-var")).toBe(`authToken=${FAKE_TOKEN}`);
      // A tracked collection file is never mutated: the token travels only as a Newman argument.
      expect(await files.readText(collectionPathFor(target))).toBe(originalCollection);
      expect(sink.records.some(({text}) => text.includes(`${target} does not require auth token; skipping auth injection.`))).toBe(
        policy === "ignored",
      );
    },
  );

  it.each(authPolicyTable)("applies the absent-token rule for %s under its %s policy", async (target, policy) => {
    const runner = succeedingRunner();
    const {presenter, sink} = buildRecordingPresenter();
    const execution = await invokeEndToEnd(fixtureRuntime(runner, {E2E_TEST_AUTH_TOKEN: ""}, {presenter}), {target});
    const transcript = sink.records.map(({text}) => text).join("\n");
    if (policy === "required") {
      expect(execution).toMatchObject({
        status: "failed",
        exitCode: 1,
        failure: {kind: "operational", message: "E2E_TEST_AUTH_TOKEN environment variable is required for backend."},
      });
      expect(runner.calls).toEqual([]);
      return;
    }
    expect(execution).toMatchObject({status: "completed", exitCode: 0});
    expect(runner.calls[0]?.request.args).not.toContain("--env-var");
    expect(transcript.includes(`Continuing ${target} run without auth token injection.`)).toBe(policy === "optional");
  });
});

describe("end-to-end typed failures", () => {
  it.each([
    ["collection-missing", "cv", {}, `Collection file not found: ${collectionPathFor("cv")}`, {path: collectionPathFor("cv")}],
    [
      "environment-missing",
      "cv",
      {[collectionPathFor("cv")]: "{}"},
      `Environment file not found: ${environmentPathFor("cv")}`,
      {path: environmentPathFor("cv")},
    ],
    ["auth-token-missing", "backend", undefined, "E2E_TEST_AUTH_TOKEN environment variable is required for backend.", {}],
  ] as const)(
    "fails with %s before invoking Newman, keeping the thrown message and exit code",
    async (kind, target, seed, message, extra) => {
      const runner = succeedingRunner();
      const runtime = fixtureRuntime(runner, {}, seed === undefined ? {} : {files: createMemoryFileSystem({...seed})});
      const {context, result} = runWorkflowDirectly({target}, runtime);
      const decision = await result;
      expect(decision).toMatchObject({kind: "failed", failure: {kind, target, ...extra}});
      expect(await presentFailure(decision, context)).toMatchObject({kind: "operational", message, evidence: []});
      expect(await invokeEndToEnd(runtime, {target})).toMatchObject({
        status: "failed",
        exitCode: 1,
        failure: {kind: "operational", message},
      });
      expect(runner.calls).toEqual([]);
    },
  );

  it.each([
    ["nonzero exit", () => buildExitedProcessExecutionResult(1)],
    ["timeout", () => buildTimedOutProcessExecutionResult()],
    ["spawn failure", () => buildSpawnFailedProcessExecutionResult("ENOENT")],
    ["standalone cancellation", () => buildCancelledProcessExecutionResult()],
  ] as const)("fails with newman-failed on %s, keeping the process error as the primary cause", async (_label, outcome) => {
    const runner = buildProgrammableProcessRunner(outcome);
    const runtime = fixtureRuntime(runner, withToken);
    const {context, result} = runWorkflowDirectly({target: "backend"}, runtime);
    const decision = await result;
    const failure = await presentFailure(decision, context);
    const execution = await invokeEndToEnd(runtime, {target: "backend"});
    expect(decision).toMatchObject({kind: "failed", failure: {kind: "newman-failed", target: "backend"}});
    expect(failure).toMatchObject({
      kind: "operational",
      evidence: [expect.stringContaining("command: npx newman run"), expect.stringMatching(/^outcome: /u)],
    });
    expect(failure.cause).toBeInstanceOf(ProcessRunnerError);
    // A standalone typed process cancellation with no aborted signal stays an operational failure.
    expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "operational", message: failure.message}});
    if (execution.status !== "failed") return;
    expect(execution.failure.cause).toBeInstanceOf(ProcessRunnerError);
  });

  it("turns a cancelled Newman process with an aborted invocation signal into the signal's cancellation", async () => {
    const controller = new AbortController();
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolveStarted) => {
      markStarted = resolveStarted;
    });
    const runner = buildProgrammableProcessRunner(async (_request, options) => {
      markStarted?.();
      await new Promise<void>((resolveCancelled) => {
        if (options.signal?.aborted === true) resolveCancelled();
        else options.signal?.addEventListener("abort", () => resolveCancelled(), {once: true});
      });
      return buildCancelledProcessExecutionResult();
    });
    const pending = invokeEndToEnd(fixtureRuntime(runner, withToken), {target: "backend"}, controller.signal);
    await started;
    controller.abort(new CommandCancellation("Terminated by test signal.", 143));
    expect(await pending).toMatchObject({
      status: "cancelled",
      exitCode: 143,
      failure: {kind: "cancelled", message: "Terminated by test signal."},
    });
  });

  it("rejects an invalid programmatic target as a usage failure before any Newman invocation", async () => {
    const runner = succeedingRunner();
    expect(await invokeEndToEnd(fixtureRuntime(runner), {target: "nope" as never})).toMatchObject({
      status: "failed",
      exitCode: 2,
      failure: {kind: "usage"},
    });
    expect(runner.calls).toEqual([]);
  });
});

describe("end-to-end cleanup precedence", () => {
  it("fails the command with a cleanup failure when Newman succeeds but a report step fails", async () => {
    const {files, writeArtifact} = failingJsonCleanupFixture();
    const runner = buildProgrammableProcessRunner(async (request) => {
      await writeArtifact(request);
      return buildSucceededProcessExecutionResult();
    });
    const execution = await invokeEndToEnd(fixtureRuntime(runner, withToken, {files}), {target: "backend"});
    expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "cleanup"}});
    if (execution.status !== "failed") return;
    expect(execution.failure.evidence.some((line) => line.startsWith("e2e report cleanup (backend):") && line.includes("disk full"))).toBe(
      true,
    );
  });

  it("keeps the Newman process failure primary and appends the cleanup failure as evidence", async () => {
    const {files, writeArtifact} = failingJsonCleanupFixture();
    const runner = buildProgrammableProcessRunner(async (request) => {
      await writeArtifact(request);
      return buildExitedProcessExecutionResult(1);
    });
    const execution = await invokeEndToEnd(fixtureRuntime(runner, withToken, {files}), {target: "backend"});
    expect(execution).toMatchObject({status: "failed", exitCode: 1, failure: {kind: "operational"}});
    if (execution.status !== "failed") return;
    expect(execution.failure.message).toMatch(/exited with code 1/u);
    expect(execution.failure.evidence.some((line) => line.startsWith("e2e report cleanup (backend):") && line.includes("disk full"))).toBe(
      true,
    );
  });
});

describe("end-to-end Newman invocation shape", () => {
  it("assembles the unchanged default argument list, cwd, inherited output, signal, and child presenter", async () => {
    const runner = succeedingRunner();
    const execution = await invokeEndToEnd(fixtureRuntime(runner, withToken), {target: "backend"});
    expect(execution.status).toBe("completed");
    const call = runner.calls[0];
    expect(call?.request.command).toBe("npx");
    expect(call?.request.args).toEqual([
      ...["newman", "run", collectionPathFor("backend"), "--environment", environmentPathFor("backend")],
      ...["--env-var", `authToken=${FAKE_TOKEN}`, "--reporters", "cli,json,junit"],
      ...["--reporter-json-export", join(reportDirectory, "newman-backend.json")],
      ...["--reporter-junit-export", join(reportDirectory, "newman-backend.xml")],
      ...["--timeout", "600000", "--timeout-request", "30000", "--timeout-script", "10000"],
    ]);
    expect(call?.options).toMatchObject({cwd: repositoryFixtureRoot, output: "inherit"});
    expect(call?.options.signal).toBeInstanceOf(AbortSignal);
    expect(call?.options.presenter).toBeDefined();
  });

  it("resolves the local environment profile and an explicit NEWMAN_REPORT_DIR", async () => {
    const runner = succeedingRunner();
    const customDirectory = join(repositoryFixtureRoot, "custom-e2e-logs");
    const files = fixtureFiles({[environmentPathFor("backend", "local")]: JSON.stringify({name: "local", values: []})});
    const variables = {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN, E2E_TEST_ENVIRONMENT: "local", NEWMAN_REPORT_DIR: customDirectory};
    const execution = await invokeEndToEnd(fixtureRuntime(runner, variables, {files}), {target: "backend"});
    expect(execution.status).toBe("completed");
    const args = runner.calls[0]?.request.args ?? [];
    expect(argumentAfter(args, "--environment")).toBe(environmentPathFor("backend", "local"));
    expect(argumentAfter(args, "--reporter-json-export")).toBe(join(customDirectory, "newman-backend.json"));
    expect(argumentAfter(args, "--reporter-junit-export")).toBe(join(customDirectory, "newman-backend.xml"));
  });

  it("reflects every Newman timeout and the strict-mode flag from the injected environment", async () => {
    const runner = succeedingRunner();
    const variables = {
      E2E_TEST_AUTH_TOKEN: FAKE_TOKEN,
      NEWMAN_TIMEOUT: "42000",
      NEWMAN_TIMEOUT_REQUEST: "5000",
      NEWMAN_TIMEOUT_SCRIPT: "1000",
      NEWMAN_STRICT_MODE: "true",
    };
    await invokeEndToEnd(fixtureRuntime(runner, variables), {target: "backend"});
    const args = runner.calls[0]?.request.args ?? [];
    expect([argumentAfter(args, "--timeout"), argumentAfter(args, "--timeout-request"), argumentAfter(args, "--timeout-script")]).toEqual([
      "42000",
      "5000",
      "1000",
    ]);
    expect(args).toContain("--bail");
  });

  it("falls back to defaults and warns on an invalid timeout and an invalid strict-mode flag", async () => {
    const runner = succeedingRunner();
    const {presenter, sink} = buildRecordingPresenter();
    const variables = {E2E_TEST_AUTH_TOKEN: FAKE_TOKEN, NEWMAN_TIMEOUT: "not-a-number", NEWMAN_STRICT_MODE: "maybe"};
    await invokeEndToEnd(fixtureRuntime(runner, variables, {presenter}), {target: "backend"});
    const transcript = sink.records.map(({text}) => text).join("\n");
    expect(argumentAfter(runner.calls[0]?.request.args ?? [], "--timeout")).toBe("600000");
    expect(runner.calls[0]?.request.args).not.toContain("--bail");
    expect(transcript).toContain('Invalid NEWMAN_TIMEOUT="not-a-number", using default 600000.');
    expect(transcript).toContain('Invalid NEWMAN_STRICT_MODE="maybe", using default false.');
  });

  it("emits the unchanged per-target section, diagnostic, and completion lines", async () => {
    const {presenter, sink} = buildRecordingPresenter();
    const runtime = fixtureRuntime(succeedingRunner(), withToken, {presenter});
    await createEndToEndCommand({host: buildCommandHost({runtime})}).invoke({target: "backend"}, {presentation: "human"});
    const transcript = sink.records.map(({text}) => text).join("\n");
    for (const line of [
      "arolariu.ro E2E Test Runner",
      "E2E Testing: backend",
      `Collection: ${collectionPathFor("backend")}`,
      `Environment: ${environmentPathFor("backend")} (production)`,
      `JSON report: ${join(reportDirectory, "newman-backend.json")}`,
      `JUnit report: ${join(reportDirectory, "newman-backend.xml")}`,
      "Timeout: 600000ms (request: 30000ms, script: 10000ms)",
      "Strict mode (--bail): false",
      "Completed Newman tests for: backend",
      "Completed 1 of 1 E2E target(s): backend.",
    ]) {
      expect(transcript).toContain(line);
    }
  });

  it("warns instead of failing when the report directory cannot be created", async () => {
    const files: FileSystem = {...fixtureFiles(), createDirectory: () => Promise.reject(new Error("read-only volume"))};
    const {presenter, sink} = buildRecordingPresenter();
    const runtime = fixtureRuntime(succeedingRunner(), withToken, {files, presenter});
    expect((await invokeEndToEnd(runtime, {target: "backend"})).status).toBe("completed");
    expect(sink.records.map(({text}) => text).join("\n")).toContain("Failed to create report directory:");
  });

  it("declares the exact six-capability subset its feature context uses", () => {
    expect(endToEndWorkflowModule.runtimeCapabilities).toEqual(["presenter", "signal", "cleanup", "files", "runner", "environment"]);
  });
});
