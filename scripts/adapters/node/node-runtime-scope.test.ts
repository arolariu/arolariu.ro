// @vitest-environment node
/**
 * @fileoverview Tests for the Node runtime scope: lazy capability composition, per-scope
 * isolation, eager cheap capabilities, and the production command runtime factory.
 * @module scripts/adapters/node/node-runtime-scope.test
 */

import {readFileSync} from "node:fs";
import {describe, expect, it} from "vitest";

import type {CommandExecutionContext} from "../../core/command/command-execution.ts";
import {CommandCancellation} from "../../core/runtime/cancellation.ts";
import type {FileSystem, HttpClient, PromptProvider, RuntimeEnvironment} from "../../core/runtime/runtime-capability.ts";
import type {ProcessRunner} from "../../core/process/process-runner.ts";
import type {RuntimeExecutionContext} from "../../core/runtime/runtime-execution-context.ts";
import {createMemoryFileSystem} from "../../testing/fixtures/memory-filesystem.fixture.ts";
import {buildQueuedHttpClient, createHttpResponse} from "../../testing/fixtures/network.fixture.ts";
import {buildRecordingProcessRunner} from "../../testing/builders/process-result.builder.ts";
import type {NodeRuntimeCapabilityLoaders} from "./node-lazy-capabilities.ts";
import {nodeClock, nodeTaskScheduler} from "./node-platform.ts";
import {createNodeCommandRuntimeFactory, createNodeRuntimeScope} from "./node-runtime-scope.ts";

/** How many times each recording loader ran, across every scope sharing one loader set. */
type LoaderCalls = Readonly<{files: number; http: number; runner: number; prompts: number}>;

interface RecordingLoaders {
  readonly loaders: NodeRuntimeCapabilityLoaders;
  readonly calls: () => LoaderCalls;
  readonly runnerEnvironments: readonly Readonly<RuntimeEnvironment>[];
}

const NOTHING_LOADED: LoaderCalls = {files: 0, http: 0, runner: 0, prompts: 0};

const promptProvider: PromptProvider = {
  confirm: () => Promise.resolve(true),
  select: <TValue extends string>(_message: string, choices: readonly Readonly<{value: TValue; label: string}>[]): Promise<TValue> =>
    choices[0] === undefined ? Promise.reject(new Error("No selection.")) : Promise.resolve(choices[0].value),
  text: () => Promise.resolve("text"),
  secret: () => Promise.resolve("secret"),
};

function buildRecordingLoaders(): RecordingLoaders {
  const counts = {files: 0, http: 0, runner: 0, prompts: 0};
  const runnerEnvironments: Readonly<RuntimeEnvironment>[] = [];
  return {
    loaders: {
      loadFileSystem: (): Promise<FileSystem> => {
        counts.files += 1;
        return Promise.resolve(createMemoryFileSystem({"/scope/file.txt": "value"}));
      },
      loadHttpClient: (): Promise<HttpClient> => {
        counts.http += 1;
        return Promise.resolve(buildQueuedHttpClient([createHttpResponse(200, "ok"), createHttpResponse(200, "ok")]));
      },
      loadProcessRunner: (environment: Readonly<RuntimeEnvironment>): Promise<ProcessRunner> => {
        counts.runner += 1;
        runnerEnvironments.push(environment);
        return Promise.resolve(buildRecordingProcessRunner());
      },
      loadPromptProvider: (): Promise<PromptProvider> => {
        counts.prompts += 1;
        return Promise.resolve(promptProvider);
      },
    },
    calls: () => ({...counts}),
    runnerEnvironments,
  };
}

async function openScope(
  recording: RecordingLoaders,
  overrides: Readonly<{
    commandName?: string;
    presentation?: "human" | "json" | "silent";
    parent?: Readonly<CommandExecutionContext<RuntimeExecutionContext>>;
    signal?: AbortSignal;
  }> = {},
): Promise<RuntimeExecutionContext> {
  return createNodeRuntimeScope({
    commandName: overrides.commandName ?? "sample",
    verbose: false,
    presentation: overrides.presentation ?? "silent",
    registerProcessSignals: false,
    loaders: recording.loaders,
    ...(overrides.parent === undefined ? {} : {parent: overrides.parent}),
    ...(overrides.signal === undefined ? {} : {signal: overrides.signal}),
  });
}

function asParent(runtime: RuntimeExecutionContext): Readonly<CommandExecutionContext<RuntimeExecutionContext>> {
  return {runtime, presentation: "silent"};
}

describe("createNodeRuntimeScope lazy capability loading", () => {
  it("loads no concrete adapter when a scope opens, establishes cheap capabilities, and registers no signal handler", async () => {
    const recording = buildRecordingLoaders();
    const interruptsBefore = process.listeners("SIGINT").length;
    const terminationsBefore = process.listeners("SIGTERM").length;
    const runtime = await openScope(recording);
    expect(recording.calls()).toEqual(NOTHING_LOADED);
    expect(runtime.clock).toBe(nodeClock);
    expect(runtime.tasks).toBe(nodeTaskScheduler);
    expect(runtime.environment.platform).toBe(process.platform);
    expect(typeof runtime.presenter.fork).toBe("function");
    expect(runtime.signal.aborted).toBe(false);
    expect(process.listeners("SIGINT")).toHaveLength(interruptsBefore);
    expect(process.listeners("SIGTERM")).toHaveLength(terminationsBefore);
    await runtime.cleanup.drain();
  });

  it("loads each capability at most once no matter how often it is used", async () => {
    const recording = buildRecordingLoaders();
    const runtime = await openScope(recording);
    await runtime.files.readText("/scope/file.txt");
    await runtime.files.exists("/scope/file.txt");
    await runtime.http.request({url: new URL("https://scope.test/first")});
    await runtime.http.request({url: new URL("https://scope.test/second")});
    await runtime.runner.run({command: "tool", args: ["a"]});
    await runtime.runner.run({command: "tool", args: ["b"]});
    await runtime.prompts.text("first");
    await runtime.prompts.text("second");
    expect(recording.calls()).toEqual({files: 1, http: 1, runner: 1, prompts: 1});
    await runtime.cleanup.drain();
  });

  it("never loads a capability the command does not touch", async () => {
    const recording = buildRecordingLoaders();
    const runtime = await openScope(recording);
    await runtime.files.readText("/scope/file.txt");
    await runtime.http.request({url: new URL("https://scope.test/first")});
    expect(recording.calls()).toEqual({files: 1, http: 1, runner: 0, prompts: 0});
    await runtime.cleanup.drain();
  });

  it("delegates every facade method to the capability the loader resolved", async () => {
    const recording = buildRecordingLoaders();
    const {files, http, runner, prompts} = await openScope(recording);
    await files.createDirectory("/scope/nested", {recursive: true});
    await files.writeText("/scope/nested/a.txt", "value");
    await files.writeBytes("/scope/nested/b.bin", Uint8Array.from([1, 2]));
    await files.writeTextAtomic("/scope/nested/c.json", "{}");
    await files.copy("/scope/nested/a.txt", "/scope/nested/copied.txt");
    await files.move("/scope/nested/copied.txt", "/scope/nested/moved.txt");
    await files.setMode("/scope/nested/a.txt", 0o600);
    const temporary = await files.createTemporaryDirectory("scope-");
    await temporary.remove();
    await files.remove("/scope/nested/b.bin");
    await expect(files.assertAccessible("/scope/nested/a.txt")).resolves.toBeUndefined();
    expect(await files.readText("/scope/nested/a.txt")).toBe("value");
    expect([...(await files.readBytes("/scope/nested/a.txt"))]).toHaveLength(5);
    expect(await files.exists("/scope/nested/moved.txt")).toBe(true);
    expect(await files.realPath("/scope/nested/a.txt")).toBe("/scope/nested/a.txt");
    expect(await files.inspect("/scope/nested/a.txt")).toMatchObject({kind: "file", mode: 0o600});
    expect(await files.readDirectory("/scope/nested")).toHaveLength(3);
    expect(await files.glob("*.txt", {cwd: "/scope/nested"})).toHaveLength(2);
    expect(await http.request({url: new URL("https://scope.test/first")})).toMatchObject({status: 200});
    expect(await runner.run({command: "tool", args: []})).toMatchObject({kind: "succeeded"});
    expect(await runner.scope({timeoutMs: 1_000}).expectSuccess({command: "tool", args: []})).toMatchObject({kind: "succeeded"});
    expect(await prompts.confirm("ok")).toBe(true);
    expect(await prompts.select("pick", [{value: "a", label: "A"}])).toBe("a");
    expect(await prompts.text("name")).toBe("text");
    expect(await prompts.secret("token")).toBe("secret");
    expect(recording.calls()).toEqual({files: 1, http: 1, runner: 1, prompts: 1});
  });

  it("gives a child scope its own lazy facades built from the shared environment snapshot", async () => {
    const recording = buildRecordingLoaders();
    const parentRuntime = await openScope(recording);
    const childRuntime = await openScope(recording, {commandName: "child", parent: asParent(parentRuntime)});
    expect(childRuntime.files).not.toBe(parentRuntime.files);
    expect(childRuntime.http).not.toBe(parentRuntime.http);
    expect(childRuntime.runner).not.toBe(parentRuntime.runner);
    expect(childRuntime.prompts).not.toBe(parentRuntime.prompts);
    expect(childRuntime.environment).toBe(parentRuntime.environment);
    await parentRuntime.files.readText("/scope/file.txt");
    expect(recording.calls()).toEqual({files: 1, http: 0, runner: 0, prompts: 0});
    await childRuntime.files.readText("/scope/file.txt");
    await childRuntime.runner.run({command: "tool", args: []});
    expect(recording.calls()).toEqual({files: 2, http: 0, runner: 1, prompts: 0});
    expect(recording.runnerEnvironments[0]).toBe(parentRuntime.environment);
    await childRuntime.cleanup.drain();
    await parentRuntime.cleanup.drain();
  });

  it("gives every child scope its own cancellation controller and cleanup registry", async () => {
    const recording = buildRecordingLoaders();
    const parentRuntime = await openScope(recording);
    const childController = new AbortController();
    const childRuntime = await openScope(recording, {parent: asParent(parentRuntime), signal: childController.signal});
    let parentCleanupRan = false;
    parentRuntime.cleanup.register("parent", () => {
      parentCleanupRan = true;
    });
    childController.abort(new CommandCancellation("Child cancelled.", 130));
    await childRuntime.cleanup.drain();
    expect(childRuntime.signal.aborted).toBe(true);
    expect(childRuntime.cleanup).not.toBe(parentRuntime.cleanup);
    expect(parentRuntime.signal.aborted).toBe(false);
    expect(parentCleanupRan).toBe(false);
    await parentRuntime.cleanup.drain();
    expect(parentCleanupRan).toBe(true);
  });

  it("propagates cancellation from parent to child, including an already-aborted caller signal", async () => {
    const recording = buildRecordingLoaders();
    const parentController = new AbortController();
    const parentRuntime = await openScope(recording, {signal: parentController.signal});
    const childRuntime = await openScope(recording, {parent: asParent(parentRuntime)});
    const preAborted = new AbortController();
    preAborted.abort(new CommandCancellation("Cancelled before start.", 143));
    const lateRuntime = await openScope(recording, {signal: preAborted.signal});
    parentController.abort();
    expect(childRuntime.signal.aborted).toBe(true);
    expect(lateRuntime.signal.aborted).toBe(true);
    await lateRuntime.cleanup.drain();
    await childRuntime.cleanup.drain();
    await parentRuntime.cleanup.drain();
  });

  it("forks the parent presenter so shared redactions survive into the child", async () => {
    const recording = buildRecordingLoaders();
    const parentRuntime = await openScope(recording, {presentation: "human"});
    const childRuntime = await openScope(recording, {commandName: "child", parent: asParent(parentRuntime)});
    parentRuntime.presenter.redact("parent-secret");
    expect(childRuntime.presenter).not.toBe(parentRuntime.presenter);
    expect(childRuntime.presenter.sanitize("parent-secret")).toBe("[REDACTED]");
    await childRuntime.cleanup.drain();
    await parentRuntime.cleanup.drain();
  });

  it.each<readonly [NodeJS.Signals, 130 | 143]>([
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ])("registers %s, aborts the scope, and unregisters it during cleanup", async (signalName, exitCode) => {
    const listenersBefore = process.listeners(signalName);
    const runtime = await createNodeRuntimeScope({
      commandName: "sample",
      verbose: false,
      presentation: "human",
      registerProcessSignals: true,
      loaders: buildRecordingLoaders().loaders,
    });
    const added = process.listeners(signalName).filter((listener) => !listenersBefore.includes(listener));
    added.forEach((listener) => {
      listener(signalName);
    });
    const reason: unknown = runtime.signal.reason;
    expect(added).toHaveLength(1);
    expect(runtime.signal.aborted).toBe(true);
    expect(reason).toBeInstanceOf(CommandCancellation);
    expect(reason instanceof CommandCancellation ? reason.exitCode : 0).toBe(exitCode);
    await runtime.cleanup.drain();
    expect(process.listeners(signalName)).toEqual(listenersBefore);
  });

  it("registers no operating-system signal handler when the scope does not own them", async () => {
    const runtime = await openScope(buildRecordingLoaders());
    expect(runtime.signal.aborted).toBe(false);
    await runtime.cleanup.drain();
  });
});

describe("createNodeCommandRuntimeFactory", () => {
  it("creates root and child scopes carrying the command name and verbosity", async () => {
    const factory = createNodeCommandRuntimeFactory("sample", true);
    const rootRuntime = await factory.createRoot({presentation: "human", registerProcessSignals: false});
    const childRuntime = await factory.createChild(
      {runtime: rootRuntime, presentation: "human"},
      {presentation: "silent", registerProcessSignals: false},
    );
    expect(rootRuntime.environment.platform).toBe(process.platform);
    expect(childRuntime.environment).toBe(rootRuntime.environment);
    expect(childRuntime.signal).not.toBe(rootRuntime.signal);
    await childRuntime.cleanup.drain();
    await rootRuntime.cleanup.drain();
  });
});

describe("lazy capability module boundaries", () => {
  it.each([["scripts/adapters/node/node-runtime-scope.ts"], ["scripts/adapters/node/node-lazy-capabilities.ts"]])(
    "keeps %s free of a static concrete capability import",
    (sourcePath) => {
      const staticImports = readFileSync(sourcePath, "utf8")
        .split("\n")
        .filter((line) => /^import\s/u.test(line) || /^\s*\}\s*from\s+["']/u.test(line))
        .filter((line) => /node-filesystem|node-http-client|node-process-runner|node-prompt-provider|execa/u.test(line));
      expect(staticImports).toEqual([]);
    },
  );
});
