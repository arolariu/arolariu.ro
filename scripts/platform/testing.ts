/**
 * @fileoverview Vitest helpers for running Effect programs in scripts test suites.
 * @module scripts/platform/testing
 *
 * @remarks
 * The repository stays on Vitest 4 (required by `@storybook/addon-vitest`), so `@effect/vitest` is
 * not available. These helpers fill that gap: {@link runScoped} runs an effect inside a fresh scope
 * with a test layer provided and surfaces typed failures as the original error value, and
 * {@link effectTest} registers a Vitest case whose body is an effect. {@link makeTestLayer} builds
 * the in-memory counterpart of `makeNodeLayer`: a map-backed filesystem and glob (`./testing.fs.ts`),
 * scripted processes and HTTP responses, a recording sink, a fixed environment, and the test clock.
 * The scripted `Process` reproduces `ProcessLive`'s request invariants, command echo, output tee, and
 * timeout around each scripted response. Unscripted processes, HTTP requests, child-process spawns,
 * terminal reads, and unimplemented `FileSystem` members die, so a test never reaches a real external
 * boundary or a silent no-op by accident.
 */

import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

import {NodePath} from "@effect/platform-node";
import {Cause, Clock, Effect, Exit, FileSystem, Layer, Option, Terminal, type Scope} from "effect";
import {HttpClient, HttpClientResponse, type HttpClientRequest} from "effect/http";
import {ChildProcessSpawner} from "effect/process";
import {TestClock} from "effect/testing";
import {it} from "vitest";

import {layerEnvironment, type EnvironmentSnapshot} from "./Environment.ts";
import {GetOnlyHttpLive, Glob, ReadOnlyFilesLive} from "./Files.ts";
import type {PlatformServices} from "./layers.ts";
import {memorySink, OutputSettings, outputLayer, Presenter, Sink, type OutputMode, type SinkRecord} from "./Output.ts";
import {
  echoProcessCommand,
  formatProcessRequest,
  Process,
  processTimedOut,
  teeProcessOutput,
  validateProcessRequest,
  type ProcessError,
  type ProcessOptions,
  type ProcessRequest,
  type ProcessResult,
} from "./Process.ts";
import {memoryFileSystem, memoryGlob, type FixtureStore} from "./testing.fs.ts";

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
}

/** An in-memory platform layer and accessors over what the code under test did with it. */
export interface TestHarness<Provided = PlatformServices | TestClock.TestClock> {
  /** Provides every platform service (and the test clock unless `clock: "live"`). */
  readonly layer: Layer.Layer<Provided>;
  /** Every record written to the sink, in order. */
  readonly output: () => readonly SinkRecord[];
  /** Every `Process.run` call, in order. */
  readonly processCalls: () => readonly RecordedProcessCall[];
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

  const httpLayer = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request, url) => {
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

  const base = Layer.mergeAll(ReadOnlyFilesLive, GetOnlyHttpLive).pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        layerEnvironment(snapshot),
        Layer.succeed(FileSystem.FileSystem, fileSystem),
        NodePath.layer,
        spawnerLayer,
        httpLayer,
        globLayer,
        sink.layer,
        terminalLayer,
      ),
    ),
  );
  const settings = {mode: options.mode ?? "human", verbose: options.verbose ?? false, color: false, context: options.context ?? "test"};
  const platform = processLayer.pipe(Layer.provideMerge(outputLayer(settings)), Layer.provideMerge(base));

  return {
    layer: options.clock === "live" ? platform : Layer.merge(platform, TestClock.layer()),
    output: sink.records,
    processCalls: () => [...calls],
    files: () => new Map(store.files),
  };
}
