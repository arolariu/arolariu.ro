/**
 * @fileoverview Vitest helpers for running Effect programs in scripts test suites.
 * @module scripts/platform/testing
 *
 * @remarks
 * The repository stays on Vitest 4 (required by `@storybook/addon-vitest`), so `@effect/vitest` is
 * not available. These helpers fill that gap: {@link runScoped} runs an effect inside a fresh scope
 * with a test layer provided and surfaces typed failures as the original error value, and
 * {@link effectTest} registers a Vitest case whose body is an effect. {@link makeTestLayer} builds
 * the in-memory counterpart of `makeNodeLayer`: a map-backed filesystem, glob, and temporary
 * directories (`./testing.fs.ts`, under `<cwd>/.tmp/<prefix><n>`), scripted processes and HTTP
 * responses, a recording sink, a fixed environment, and the test clock. With `fileSystem: "node"`
 * the filesystem, glob, and temporary directories are the real ones instead, for fixtures a test
 * writes to a real temporary directory; {@link scriptedOutcomes} scripts processes from
 * `ProbeOutcome`-shaped responses.
 * The scripted `Process` reproduces `ProcessLive`'s request invariants, command echo, output tee, and
 * timeout around each scripted response. The harness also sets `ProcessLayerFactory` to that
 * scripted layer, so `commandLayer` rebuilds it over each CLI invocation's own output settings, and
 * `InspectionLayerFactory` to its `Inspection` layer: scripted sessions when `inspection` is set,
 * otherwise `InspectionLive` over the harness services.
 * Scripted prompts mirror `PromptsLive`'s TTY guard, and `httpCalls` records every HTTP request.
 * Unscripted processes, HTTP requests, prompts, inspection keys, child-process spawns,
 * terminal reads, and unimplemented `FileSystem` members die, so a test never reaches a real external
 * boundary or a silent no-op by accident.
 */

import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

import {NodeFileSystem, NodePath} from "@effect/platform-node";
import {Cause, Clock, Duration, Effect, Exit, FileSystem, Layer, Option, Redacted, Terminal, type Scope} from "effect";
import {HttpClient, HttpClientResponse, type HttpClientRequest} from "effect/http";
import {ChildProcessSpawner} from "effect/process";
import {TestClock} from "effect/testing";
import {it} from "vitest";

import {layerEnvironment, type EnvironmentSnapshot} from "./Environment.ts";
import {Inspection, InspectionLayerFactory, InspectionLive, type InspectionLayer} from "../inspection/Inspection.ts";
import type {RepositoryInspectionFacts, RepositoryInspectionKey, RepositoryInspectionSession} from "../inspection/repository.ts";
import type {ProbeOutcome} from "../inspection/probes.ts";
import type {InspectionOutcome} from "../inspection/types.ts";
import {GetOnlyHttpLive, Glob, GlobLive, ReadOnlyFilesLive, TemporaryDirectoriesLive} from "./Files.ts";
import type {PlatformServices} from "./layers.ts";
import {memorySink, OutputSettings, outputLayer, Presenter, Sink, type OutputMode, type SinkRecord} from "./Output.ts";
import {
  echoProcessCommand,
  formatProcessRequest,
  Process,
  ProcessExited,
  ProcessLayerFactory,
  ProcessSignalled,
  ProcessSpawnFailed,
  ProcessTimedOut,
  processTimedOut,
  teeProcessOutput,
  validateProcessRequest,
  type ProcessError,
  type ProcessOptions,
  type ProcessRequest,
  type ProcessResult,
} from "./Process.ts";
import {memoryFileSystem, memoryGlob, type FixtureStore} from "./testing.fs.ts";
import {promptUnavailable, Prompts, requireChoices, type PromptKind, type PromptsShape, type PromptUnavailable} from "./Prompts.ts";

/**
 * Builds the scripted {@link Prompts} of a harness.
 *
 * @remarks
 * Mirrors `PromptsLive`: without a TTY, a `confirm` or `select` with a default returns it and any
 * other prompt fails with the legacy {@link promptUnavailable} message. With a TTY, each prompt
 * consumes the next scripted answer; an exhausted queue, a wrong answer type, or a `select` answer
 * that is not one of its choices dies.
 *
 * @param stdinIsTTY - The harness environment TTY flag.
 * @param answers - Scripted answers, consumed in order.
 * @returns The scripted prompt operations.
 */
function scriptedPrompts(stdinIsTTY: boolean, answers: readonly (boolean | string)[]): PromptsShape {
  const queue = [...answers];
  const next = <T>(
    kind: PromptKind,
    message: string,
    defaultValue: T | undefined,
    accept: (answer: boolean | string) => T | undefined,
    expected: string,
  ): Effect.Effect<T, PromptUnavailable> =>
    Effect.suspend(() => {
      if (!stdinIsTTY) {
        return defaultValue === undefined ? Effect.fail(promptUnavailable(kind)) : Effect.succeed(defaultValue);
      }
      if (queue.length === 0) {
        return Effect.die(new Error(`unscripted prompt: ${message}`));
      }
      const answer = queue.shift() as boolean | string;
      const accepted = accept(answer);
      return accepted === undefined
        ? Effect.die(new Error(`scripted prompt answer for ${message} is not ${expected}`))
        : Effect.succeed(accepted);
    });
  const text = (answer: boolean | string): string | undefined => (typeof answer === "string" ? answer : undefined);
  return Prompts.of({
    confirm: (message, defaultValue) =>
      next("confirm", message, defaultValue, (answer) => (typeof answer === "boolean" ? answer : undefined), "a boolean"),
    select: (message, choices, defaultValue) =>
      Effect.andThen(
        requireChoices(choices),
        next("select", message, defaultValue, (answer) => choices.find((choice) => choice.value === answer)?.value, "one of its choices"),
      ),
    text: (message) => next("text", message, undefined, text, "a string"),
    secret: (message) => Effect.map(next("secret", message, undefined, text, "a string"), (value) => Redacted.make(value)),
  });
}

/**
 * Runs an effect inside a fresh scope with the given layer provided.
 *
 * @param effect - The effect under test; it may require a {@link Scope.Scope} and the services of `layer`.
 * @param layer - The layer that provides every service the effect requires.
 * @returns A promise that resolves with the effect value after all scope finalizers have run.
 * @throws The squashed failure cause (`Cause.squash`), so a typed failure rejects with the original
 * error value and Vitest prints the real error.
 */
export async function runScoped<A, E, R>(effect: Effect.Effect<A, E, R | Scope.Scope>, layer: Layer.Layer<R>): Promise<A> {
  const exit = await Effect.runPromiseExit(effect.pipe(Effect.scoped, Effect.provide(layer)));
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }
  throw Cause.squash(exit.cause);
}

/**
 * Registers a Vitest case whose body is an effect run through {@link runScoped}.
 *
 * @param name - The test name.
 * @param body - Builds the effect to run; it may require a {@link Scope.Scope} and the services of `layer`.
 * @param layer - The layer that provides every service the body requires.
 * @param timeoutMs - Optional per-test timeout in milliseconds; defaults to the Vitest configuration.
 */
export function effectTest<E, R>(
  name: string,
  body: () => Effect.Effect<void, E, R | Scope.Scope>,
  layer: Layer.Layer<R>,
  timeoutMs?: number,
): void {
  it(name, () => runScoped(body(), layer), timeoutMs);
}

/** Repository root every fixture path is anchored to; also the default harness working directory. */
export const repositoryFixtureRoot: string = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** A canned response for process requests accepted by `match`; the first matching script wins. */
export interface ScriptedProcess {
  /** Decides whether this script answers the request. */
  readonly match: (request: ProcessRequest, options: ProcessOptions) => boolean;
  /** The result to succeed with, the error to fail with, or an effect computing either. */
  readonly respond:
    ProcessResult | ProcessError | ((request: ProcessRequest, options: ProcessOptions) => Effect.Effect<ProcessResult, ProcessError>);
}

/** A canned response for HTTP requests accepted by `match`; the first matching script wins. */
export interface ScriptedHttp {
  /** Decides whether this script answers the request. */
  readonly match: (request: HttpClientRequest.HttpClientRequest) => boolean;
  /** The response status, body, and optional headers. */
  readonly respond: {readonly status: number; readonly body: string; readonly headers?: Readonly<Record<string, string>>};
}

/** One `Process.run` call observed by the harness. */
export interface RecordedProcessCall {
  /** The requested command. */
  readonly request: ProcessRequest;
  /** The options passed to `Process.run` (`{}` when omitted). */
  readonly options: ProcessOptions;
}

/** Configures {@link makeTestLayer}. */
export interface TestLayerOptions {
  /** Seeded files; relative keys resolve against the harness working directory. */
  readonly files?: Readonly<Record<string, string | Uint8Array>>;
  /**
   * `"memory"` (default) serves the filesystem, glob, and temporary directories from the seeded
   * in-memory store; `"node"` serves them from the real filesystem, for fixtures a test writes to a
   * real temporary directory (for example symbolic links). `files` and the `files()` accessor apply
   * to the in-memory store only.
   */
  readonly fileSystem?: "memory" | "node";
  /** Scripted process responses. */
  readonly processes?: readonly ScriptedProcess[];
  /** Scripted HTTP responses. */
  readonly http?: readonly ScriptedHttp[];
  /** Overrides of the default environment snapshot. */
  readonly environment?: Partial<EnvironmentSnapshot>;
  /** Output mode; defaults to `"human"`. */
  readonly mode?: OutputMode;
  /** Whether debug logs are emitted; defaults to `false`. */
  readonly verbose?: boolean;
  /** Default log prefix context; defaults to `"test"`. */
  readonly context?: string;
  /** `"test"` (default) provides `TestClock`; `"live"` keeps real time. */
  readonly clock?: "test" | "live";
  /**
   * Scripted prompt answers consumed in order when `environment.stdinIsTTY` is `true`: a boolean
   * for `confirm`, a choice value for `select`, and a string for `text` and `secret`.
   */
  readonly prompts?: readonly (boolean | string)[];
  /**
   * Scripted inspection outcomes. When set, every `Inspection.session` returns one scripted session
   * that answers each key with its outcome and dies with `unscripted inspection: <key>` for any
   * other key; otherwise `InspectionLive` runs over the harness services.
   */
  readonly inspection?: ScriptedInspection;
}

/** The legacy-shaped options a {@link ProbeOutcomeResponder} receives. */
export interface ScriptedOutcomeOptions {
  /** The requested working directory, when supplied. */
  readonly cwd?: string;
  /** The requested environment overrides, when supplied. */
  readonly env?: Readonly<Record<string, string | undefined>>;
  /** The requested time limit in milliseconds, when supplied. */
  readonly timeoutMs?: number;
  /** The requested output mode, when supplied. */
  readonly output?: ProcessOptions["output"];
}

/** Answers one process request with a probe-shaped outcome. */
export type ProbeOutcomeResponder = (request: ProcessRequest, options: ScriptedOutcomeOptions) => ProbeOutcome | Promise<ProbeOutcome>;

/**
 * Converts a probe-shaped outcome into the `Process.run` result or failure it stands for.
 *
 * @param request - The answered request (named in the failure).
 * @param outcome - The outcome: `succeeded` → a result, `exited` → {@link ProcessExited},
 * `signalled` → {@link ProcessSignalled}, `spawn-failed` → {@link ProcessSpawnFailed} (its
 * `message` becomes the failure `reason`), `timed-out` → {@link ProcessTimedOut}.
 * @returns The equivalent process effect.
 */
export function processOutcomeEffect(request: ProcessRequest, outcome: ProbeOutcome): Effect.Effect<ProcessResult, ProcessError> {
  const command = formatProcessRequest(request);
  const base = {command, stdout: outcome.stdout, stderr: outcome.stderr, durationMs: outcome.durationMs};
  switch (outcome.kind) {
    case "succeeded":
      return Effect.succeed({stdout: outcome.stdout, stderr: outcome.stderr, durationMs: outcome.durationMs});
    case "exited":
      return Effect.fail(
        new ProcessExited({...base, exitCode: outcome.exitCode, message: `${command} exited with code ${String(outcome.exitCode)}`}),
      );
    case "signalled":
      return Effect.fail(
        new ProcessSignalled({...base, signal: outcome.signal, message: `${command} was terminated by ${outcome.signal}`}),
      );
    case "spawn-failed":
      return Effect.fail(
        new ProcessSpawnFailed({...base, reason: outcome.message, message: `${command} failed to start: ${outcome.message}`}),
      );
    case "timed-out":
      return Effect.fail(new ProcessTimedOut({...base, timeoutMs: 0, message: `${command} timed out`}));
  }
}

/**
 * Builds a script that answers every process request through an outcome-returning responder.
 *
 * @remarks
 * The responder sees the request and the `cwd`, `env`, `timeoutMs`, and `output` options that were
 * supplied (the `Process` options minus `failureOutput`), so a test can keep asserting probe
 * invocations in that vocabulary; see {@link processOutcomeEffect} for the outcome mapping.
 *
 * @param respond - The responder; it may be a `vi.fn` the test inspects.
 * @returns A catch-all {@link ScriptedProcess}.
 */
export function scriptedOutcomes(respond: ProbeOutcomeResponder): ScriptedProcess {
  return {
    match: () => true,
    respond: (request, options) =>
      Effect.flatMap(
        Effect.promise(async () =>
          respond(request, {
            ...(options.cwd === undefined ? {} : {cwd: options.cwd}),
            ...(options.env === undefined ? {} : {env: options.env}),
            ...(options.timeout === undefined ? {} : {timeoutMs: Duration.toMillis(options.timeout)}),
            ...(options.output === undefined ? {} : {output: options.output}),
          }),
        ),
        (outcome) => processOutcomeEffect(request, outcome),
      ),
  };
}

/** Scripted outcome per repository inspection key. */
export type ScriptedInspection = Partial<{
  readonly [K in RepositoryInspectionKey]: InspectionOutcome<RepositoryInspectionFacts[K]>;
}>;

/**
 * Builds the scripted {@link Inspection} layer of a harness.
 *
 * @param outcomes - Scripted outcome per key.
 * @returns A layer whose sessions answer from `outcomes`; `invalidate` and
 * `updateInfrastructureEngine` are no-ops.
 */
function scriptedInspection(outcomes: ScriptedInspection): InspectionLayer {
  const session: RepositoryInspectionSession = {
    inspect: <K extends RepositoryInspectionKey>(key: K) => {
      const outcome = outcomes[key] as InspectionOutcome<RepositoryInspectionFacts[K]> | undefined;
      return outcome === undefined ? Effect.die(new Error(`unscripted inspection: ${key}`)) : Effect.succeed(outcome);
    },
    invalidate: () => Effect.void,
    updateInfrastructureEngine: () => Effect.void,
  };
  return Layer.succeed(Inspection, Inspection.of({session: () => Effect.succeed(session)}));
}

/** An in-memory platform layer and accessors over what the code under test did with it. */
export interface TestHarness<Provided = PlatformServices | TestClock.TestClock> {
  /** Provides every platform service (and the test clock unless `clock: "live"`). */
  readonly layer: Layer.Layer<Provided>;
  /** Every record written to the sink, in order. */
  readonly output: () => readonly SinkRecord[];
  /** Every `Process.run` call, in order. */
  readonly processCalls: () => readonly RecordedProcessCall[];
  /** Every HTTP request sent through the harness `HttpClient`, scripted or not, in order. */
  readonly httpCalls: () => readonly HttpClientRequest.HttpClientRequest[];
  /** Every file in the in-memory filesystem, keyed by canonical absolute `/` path. */
  readonly files: () => ReadonlyMap<string, string | Uint8Array>;
}

/**
 * Builds an in-memory {@link TestHarness} that provides every platform service.
 *
 * @remarks
 * State (files, records, calls) belongs to the harness, so build one harness per test. Paths are
 * resolved against `environment.cwd` (default {@link repositoryFixtureRoot}); `Glob.match` returns
 * sorted canonical absolute `/` paths. The layer type includes `TestClock` unless `clock` is
 * `"live"`; a widened `clock` value yields the layer without it.
 *
 * @param options - Fixtures, scripts, environment overrides, output settings, and clock choice.
 * @returns The harness layer and its accessors.
 */
export function makeTestLayer(options: TestLayerOptions & {readonly clock: "live"}): TestHarness<PlatformServices>;
export function makeTestLayer(options?: TestLayerOptions & {readonly clock?: "test"}): TestHarness;
export function makeTestLayer(options?: TestLayerOptions): TestHarness<PlatformServices>;
export function makeTestLayer(options: TestLayerOptions = {}): TestHarness<PlatformServices> {
  const snapshot: EnvironmentSnapshot = {
    variables: {},
    cwd: repositoryFixtureRoot,
    executablePath: process.execPath,
    platform: process.platform,
    architecture: process.arch,
    stdinIsTTY: false,
    stdoutIsTTY: false,
    isCI: false,
    ...options.environment,
  };
  const store: FixtureStore = {files: new Map(), directories: new Set()};
  const fileSystem = memoryFileSystem(store, snapshot.cwd, options.files ?? {});

  const calls: RecordedProcessCall[] = [];
  const scripted = (request: ProcessRequest, runOptions: ProcessOptions): Effect.Effect<ProcessResult, ProcessError> => {
    const respond = options.processes?.find((script) => script.match(request, runOptions))?.respond;
    if (respond === undefined) {
      return Effect.die(new Error(`unscripted process: ${formatProcessRequest(request)}`));
    }
    if (typeof respond === "function") {
      return respond(request, runOptions);
    }
    return "_tag" in respond ? Effect.fail(respond) : Effect.succeed(respond);
  };
  // Mirrors ProcessLive around the scripted response: invariants, echo, tee, and timeout share its helpers.
  const processLayer = Layer.effect(
    Process,
    Effect.gen(function* () {
      const settings = yield* OutputSettings;
      const presenter = yield* Presenter;
      const tee = (outcome: {readonly stdout: string; readonly stderr: string}, runOptions: ProcessOptions): Effect.Effect<void> =>
        Effect.andThen(
          teeProcessOutput(presenter, runOptions, "stdout", outcome.stdout),
          teeProcessOutput(presenter, runOptions, "stderr", outcome.stderr),
        );
      return Process.of({
        run: (request, runOptions = {}) =>
          Effect.gen(function* () {
            calls.push({request, options: runOptions});
            yield* validateProcessRequest(request, runOptions);
            const command = formatProcessRequest(request);
            yield* echoProcessCommand(command, runOptions, settings);
            const startedAt = yield* Clock.currentTimeMillis;
            const teed = scripted(request, runOptions).pipe(
              Effect.tap((result) => tee(result, runOptions)),
              Effect.tapError((error) => tee(error, runOptions)),
            );
            const timeout = runOptions.timeout;
            if (timeout === undefined) {
              return yield* teed;
            }
            const finished = yield* Effect.timeoutOption(teed, timeout);
            if (Option.isSome(finished)) {
              return finished.value;
            }
            const durationMs = (yield* Clock.currentTimeMillis) - startedAt;
            return yield* processTimedOut({command, stdout: "", stderr: "", durationMs}, timeout);
          }),
      });
    }),
  );

  const httpCalls: HttpClientRequest.HttpClientRequest[] = [];
  const httpLayer = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request, url) => {
      httpCalls.push(request);
      const respond = options.http?.find((script) => script.match(request))?.respond;
      if (respond === undefined) {
        return Effect.die(new Error(`unscripted http: ${request.method} ${url.href}`));
      }
      const init = {status: respond.status, ...(respond.headers === undefined ? {} : {headers: {...respond.headers}})};
      return Effect.succeed(HttpClientResponse.fromWeb(request, new Response(respond.body, init)));
    }),
  );

  const globLayer = Layer.succeed(Glob, memoryGlob(store, snapshot.cwd));

  const spawnerLayer = Layer.succeed(
    ChildProcessSpawner.ChildProcessSpawner,
    ChildProcessSpawner.make((command) =>
      Effect.die(new Error(`unscripted process: ${command._tag === "StandardCommand" ? formatProcessRequest(command) : "piped command"}`)),
    ),
  );

  const sink = memorySink({stdoutIsTTY: snapshot.stdoutIsTTY});
  const terminalLayer = Layer.effect(
    Terminal.Terminal,
    Effect.map(Effect.service(Sink), (target) =>
      Terminal.make({
        columns: Effect.succeed(80),
        rows: Effect.succeed(24),
        readInput: Effect.die(new Error("unscripted terminal input")),
        readLine: Effect.die(new Error("unscripted terminal input")),
        display: (text) => target.write({stream: "stdout", text}),
      }),
    ),
  ).pipe(Layer.provide(sink.layer));

  const promptsLayer = Layer.succeed(Prompts, scriptedPrompts(snapshot.stdinIsTTY, options.prompts ?? []));

  const nodeFiles = options.fileSystem === "node";
  const base = Layer.mergeAll(ReadOnlyFilesLive, GetOnlyHttpLive, promptsLayer, TemporaryDirectoriesLive).pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        layerEnvironment(snapshot),
        nodeFiles ? NodeFileSystem.layer : Layer.succeed(FileSystem.FileSystem, fileSystem),
        NodePath.layer,
        spawnerLayer,
        httpLayer,
        nodeFiles ? GlobLive : globLayer,
        sink.layer,
        terminalLayer,
      ),
    ),
  );
  const settings = {mode: options.mode ?? "human", verbose: options.verbose ?? false, color: false, context: options.context ?? "test"};
  const inspectionLayer = options.inspection === undefined ? InspectionLive : scriptedInspection(options.inspection);
  // The harness Process and Inspection serve direct effect tests; the factory references make `commandLayer`
  // rebuild the same scripted process (and inspection) over each CLI invocation's own output settings and presenter.
  const platform = inspectionLayer.pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        processLayer,
        Layer.succeed(ProcessLayerFactory, processLayer),
        Layer.succeed(InspectionLayerFactory, inspectionLayer),
      ),
    ),
    Layer.provideMerge(outputLayer(settings)),
    Layer.provideMerge(base),
  );

  return {
    layer: options.clock === "live" ? platform : Layer.merge(platform, TestClock.layer()),
    output: sink.records,
    processCalls: () => [...calls],
    httpCalls: () => [...httpCalls],
    files: () => new Map(store.files),
  };
}
