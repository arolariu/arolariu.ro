/**
 * @fileoverview Vitest helpers for running Effect programs in scripts test suites.
 * @module scripts/platform/testing
 *
 * @remarks
 * The repository stays on Vitest 4 (required by `@storybook/addon-vitest`), so `@effect/vitest` is
 * not available. These helpers fill that gap: {@link runScoped} runs an effect inside a fresh scope
 * with a test layer provided and surfaces typed failures as the original error value, and
 * {@link effectTest} registers a Vitest case whose body is an effect. {@link makeTestLayer} builds
 * the in-memory counterpart of `makeNodeLayer`: a map-backed filesystem and glob, scripted
 * processes and HTTP responses, a recording sink, a fixed environment, and the test clock.
 * Unscripted processes, HTTP requests, child-process spawns, and terminal reads die, so a test
 * never reaches a real external boundary by accident.
 */

import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

import {NodePath} from "@effect/platform-node";
import {ByteSize, Cause, Effect, Exit, FileSystem, Layer, Option, PlatformError, Terminal, type Scope} from "effect";
import {HttpClient, HttpClientResponse, type HttpClientRequest} from "effect/http";
import {ChildProcessSpawner} from "effect/process";
import {TestClock} from "effect/testing";
import {it} from "vitest";

import {layerEnvironment, type EnvironmentSnapshot} from "./Environment.ts";
import {GetOnlyHttpLive, Glob, ReadOnlyFilesLive} from "./Files.ts";
import type {PlatformServices} from "./layers.ts";
import {memorySink, outputLayer, Sink, type OutputMode, type SinkRecord} from "./Output.ts";
import {formatProcessRequest, Process, type ProcessError, type ProcessOptions, type ProcessRequest, type ProcessResult} from "./Process.ts";

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

/** Fixed timestamp reported by every in-memory `stat`. */
const FIXTURE_MODIFIED_AT = new Date("2025-01-01T00:00:00.000Z");
const ABSOLUTE_PATH = /^(?:[A-Za-z]:)?[\\/]/u;

/**
 * Normalizes a POSIX or Windows path into one canonical, `/`-separated form (legacy port).
 *
 * @param path - Path supplied by a caller.
 * @returns The canonical path used as the in-memory filesystem key.
 */
function normalizeFixturePath(path: string): string {
  const unified = path.replaceAll("\\", "/");
  const driveMatch = /^([A-Za-z]:)\/?(.*)$/u.exec(unified);
  const prefix = driveMatch === null ? (unified.startsWith("/") ? "/" : "") : `${driveMatch[1] ?? ""}/`;
  const body = driveMatch === null ? unified : (driveMatch[2] ?? "");
  const segments: string[] = [];
  for (const segment of body.split("/")) {
    if (segment === "..") {
      segments.pop();
    } else if (segment !== "" && segment !== ".") {
      segments.push(segment);
    }
  }
  const joined = segments.join("/");
  return prefix === "" ? joined || "." : `${prefix}${joined}`;
}

/**
 * Resolves a path against a working directory and normalizes it.
 *
 * @param cwd - Directory relative paths are resolved against.
 * @param path - Absolute or relative path.
 * @returns The canonical absolute key.
 */
function fixtureKey(cwd: string, path: string): string {
  return normalizeFixturePath(ABSOLUTE_PATH.test(path) ? path : `${cwd}/${path}`);
}

/**
 * Returns the parent of a canonical key.
 *
 * @param key - A canonical key.
 * @returns The parent key, or `undefined` for a root.
 */
function fixtureParent(key: string): string | undefined {
  const index = key.lastIndexOf("/");
  if (index < 0 || index === key.length - 1) {
    return undefined;
  }
  const parent = key.slice(0, index);
  return parent === "" ? "/" : /^[A-Za-z]:$/u.test(parent) ? `${parent}/` : parent;
}

/**
 * Compiles one glob pattern into a regular expression over canonical paths (legacy port).
 *
 * @param pattern - Glob pattern supporting `?`, `*`, and `**`.
 * @returns A regular expression matching whole canonical paths.
 */
function fixtureGlobToRegExp(pattern: string): RegExp {
  let source = "";
  let index = 0;
  while (index < pattern.length) {
    const character = pattern[index] ?? "";
    if (character === "*" && pattern[index + 1] === "*") {
      const slash = pattern[index + 2] === "/";
      source += slash ? "(?:[^/]+/)*" : "[^]*";
      index += slash ? 3 : 2;
    } else {
      source += character === "*" ? "[^/]*" : character === "?" ? "[^/]" : character.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
      index += 1;
    }
  }
  return new RegExp(`^${source}$`, "u");
}

/** Mutable state behind the in-memory filesystem and glob. */
interface FixtureStore {
  readonly files: Map<string, string | Uint8Array>;
  readonly directories: Set<string>;
}

/**
 * Appends written contents to existing fixture contents, as an `"a"`-flag write does.
 *
 * @param previous - The stored contents.
 * @param next - The appended contents.
 * @returns A string when both sides are strings, otherwise the concatenated bytes.
 */
function appendContents(previous: string | Uint8Array, next: string | Uint8Array): string | Uint8Array {
  if (typeof previous === "string" && typeof next === "string") {
    return `${previous}${next}`;
  }
  const encode = (value: string | Uint8Array): Uint8Array => (typeof value === "string" ? new TextEncoder().encode(value) : value);
  return new Uint8Array([...encode(previous), ...encode(next)]);
}

/**
 * Builds the overrides passed to `FileSystem.layerNoop` for a map-backed filesystem.
 *
 * @param store - The fixture state.
 * @param cwd - Directory relative paths are resolved against.
 * @param seeds - Files stored, with their parent directories, before the filesystem is returned.
 * @returns The implemented `FileSystem` members; every other member keeps its no-op default.
 */
function memoryFileSystem(
  store: FixtureStore,
  cwd: string,
  seeds: Readonly<Record<string, string | Uint8Array>>,
): Partial<FileSystem.FileSystem> {
  const {files, directories} = store;
  const fail = (method: string, path: string, tag: PlatformError.SystemErrorTag): Effect.Effect<never, PlatformError.PlatformError> =>
    Effect.fail(
      PlatformError.systemError({_tag: tag, module: "FileSystem", method, pathOrDescriptor: path, description: `${tag}: ${path}`}),
    );
  const descendants = (key: string): string[] => {
    const prefix = key.endsWith("/") ? key : `${key}/`;
    return [...files.keys(), ...directories].filter((candidate) => candidate.startsWith(prefix) && candidate !== key);
  };
  const addDirectories = (key: string | undefined): void => {
    for (let current = key; current !== undefined && !directories.has(current); current = fixtureParent(current)) {
      directories.add(current);
    }
  };
  const lookup = <A>(method: string, path: string, found: (key: string) => Effect.Effect<A, PlatformError.PlatformError>) =>
    Effect.suspend(() => {
      const key = fixtureKey(cwd, path);
      return files.has(key) || directories.has(key) ? found(key) : fail(method, key, "NotFound");
    });
  const readFile = (method: string, path: string): Effect.Effect<string | Uint8Array, PlatformError.PlatformError> =>
    lookup(method, path, (key) => {
      const contents = files.get(key);
      return contents === undefined ? fail(method, key, "BadResource") : Effect.succeed(contents);
    });
  const write = (method: string, path: string, contents: string | Uint8Array, flag: string | undefined) =>
    Effect.suspend(() => {
      const key = fixtureKey(cwd, path);
      const parent = fixtureParent(key);
      if (parent !== undefined && !directories.has(parent)) {
        return fail(method, key, "NotFound");
      }
      if (directories.has(key) || (flag?.includes("x") === true && files.has(key))) {
        return fail(method, key, directories.has(key) ? "BadResource" : "AlreadyExists");
      }
      const previous = flag?.startsWith("a") === true ? files.get(key) : undefined;
      files.set(key, previous === undefined ? contents : appendContents(previous, contents));
      return Effect.void;
    });
  const info = (type: FileSystem.File.Type, size: number): FileSystem.File.Info => ({
    type,
    mtime: Option.some(FIXTURE_MODIFIED_AT),
    atime: Option.some(FIXTURE_MODIFIED_AT),
    birthtime: Option.some(FIXTURE_MODIFIED_AT),
    dev: 0,
    ino: Option.none(),
    mode: type === "File" ? 0o644 : 0o755,
    nlink: Option.none(),
    uid: Option.none(),
    gid: Option.none(),
    rdev: Option.none(),
    size: ByteSize.bytes(size),
    blksize: Option.none(),
    blocks: Option.none(),
  });

  addDirectories(normalizeFixturePath(cwd));
  for (const [path, contents] of Object.entries(seeds)) {
    const key = fixtureKey(cwd, path);
    addDirectories(fixtureParent(key));
    files.set(key, contents);
  }
  return {
    access: (path) => lookup("access", path, () => Effect.void),
    exists: (path) => Effect.sync(() => files.has(fixtureKey(cwd, path)) || directories.has(fixtureKey(cwd, path))),
    realPath: (path) => lookup("realPath", path, Effect.succeed),
    readFile: (path) =>
      Effect.map(readFile("readFile", path), (contents) =>
        typeof contents === "string" ? new TextEncoder().encode(contents) : new Uint8Array(contents),
      ),
    readFileString: (path, encoding) =>
      Effect.map(readFile("readFileString", path), (contents) =>
        typeof contents === "string" ? contents : new TextDecoder(encoding).decode(contents),
      ),
    writeFile: (path, data, options) => write("writeFile", path, new Uint8Array(data), options?.flag),
    writeFileString: (path, data, options) => write("writeFileString", path, data, options?.flag),
    stat: (path) =>
      lookup("stat", path, (key) => {
        const contents = files.get(key);
        const size =
          contents === undefined ? 0 : typeof contents === "string" ? new TextEncoder().encode(contents).byteLength : contents.byteLength;
        return Effect.succeed(info(contents === undefined ? "Directory" : "File", size));
      }),
    readDirectory: (path, options) =>
      lookup("readDirectory", path, (key) => {
        if (!directories.has(key)) {
          return fail("readDirectory", key, "BadResource");
        }
        const prefixLength = key.endsWith("/") ? key.length : key.length + 1;
        const names = descendants(key).map((candidate) => candidate.slice(prefixLength));
        return Effect.succeed(names.filter((name) => options?.recursive === true || !name.includes("/")).toSorted());
      }),
    makeDirectory: (path, options) =>
      Effect.suspend(() => {
        const key = fixtureKey(cwd, path);
        const parent = fixtureParent(key);
        if (files.has(key) || (directories.has(key) && options?.recursive !== true)) {
          return fail("makeDirectory", key, "AlreadyExists");
        }
        if (options?.recursive !== true && parent !== undefined && !directories.has(parent)) {
          return fail("makeDirectory", key, "NotFound");
        }
        addDirectories(key);
        return Effect.void;
      }),
    remove: (path, options) =>
      Effect.suspend(() => {
        const key = fixtureKey(cwd, path);
        const children = descendants(key);
        if (!files.has(key) && !directories.has(key)) {
          return options?.force === true ? Effect.void : fail("remove", key, "NotFound");
        }
        if (children.length > 0 && options?.recursive !== true) {
          return fail("remove", key, "BadResource");
        }
        for (const entry of [key, ...children]) {
          files.delete(entry);
          directories.delete(entry);
        }
        return Effect.void;
      }),
    rename: (oldPath, newPath) =>
      lookup("rename", oldPath, (from) => {
        const to = fixtureKey(cwd, newPath);
        const parent = fixtureParent(to);
        if (parent !== undefined && !directories.has(parent)) {
          return fail("rename", to, "NotFound");
        }
        if (directories.has(to) && files.has(from)) {
          return fail("rename", to, "BadResource");
        }
        for (const entry of [from, ...descendants(from)]) {
          const target = `${to}${entry.slice(from.length)}`;
          const contents = files.get(entry);
          if (contents === undefined) {
            directories.delete(entry);
            directories.add(target);
          } else {
            files.delete(entry);
            files.set(target, contents);
          }
        }
        return Effect.void;
      }),
  };
}

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
  const processLayer = Layer.succeed(Process, {
    run: (request, runOptions = {}) =>
      Effect.suspend(() => {
        calls.push({request, options: runOptions});
        const respond = options.processes?.find((script) => script.match(request, runOptions))?.respond;
        if (respond === undefined) {
          return Effect.die(new Error(`unscripted process: ${formatProcessRequest(request)}`));
        }
        if (typeof respond === "function") {
          return respond(request, runOptions);
        }
        return "_tag" in respond ? Effect.fail(respond) : Effect.succeed(respond);
      }),
  });

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

  const globLayer = Layer.succeed(Glob, {
    match: (patterns, globOptions = {}) =>
      Effect.sync(() => {
        const base = fixtureKey(snapshot.cwd, globOptions.cwd ?? ".");
        const expressions = (typeof patterns === "string" ? [patterns] : patterns).map((pattern) =>
          fixtureGlobToRegExp(fixtureKey(base, pattern)),
        );
        const candidates = globOptions.onlyFiles === true ? [...store.files.keys()] : [...store.files.keys(), ...store.directories];
        return candidates
          .filter((candidate) => expressions.some((expression) => expression.test(candidate)))
          .toSorted((left, right) => left.localeCompare(right));
      }),
  });

  const spawnerLayer = Layer.succeed(
    ChildProcessSpawner.ChildProcessSpawner,
    ChildProcessSpawner.make((command) =>
      Effect.die(new Error(`unscripted process: ${command._tag === "StandardCommand" ? formatProcessRequest(command) : "piped command"}`)),
    ),
  );

  const sink = memorySink();
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
        FileSystem.layerNoop(fileSystem),
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
  const platform = Layer.merge(outputLayer(settings), processLayer).pipe(Layer.provideMerge(base));

  return {
    layer: options.clock === "live" ? platform : Layer.merge(platform, TestClock.layer()),
    output: sink.records,
    processCalls: () => [...calls],
    files: () => new Map(store.files),
  };
}
