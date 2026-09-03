/**
 * @fileoverview Typed, side-effect-free runtime fakes shared by command and capability tests.
 * @module scripts/common/runtime.testing
 *
 * @remarks
 * Nothing here imports a Node adapter or touches ambient process, filesystem, or network state.
 * The only Node modules used are `node:path` and `node:url`, and only to derive
 * {@link repositoryFixtureRoot} from this module's own location so command definitions that call
 * `resolveRepositoryPaths(import.meta.url, files)` stay testable without real I/O. Every fake is
 * deterministic: fixed timestamps, fixed environment, counter-based temporary directories, and
 * intervals that never fire on their own.
 */

import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

import type {CommandContext, CommandProcessHost, CommandRuntimeFactory, RuntimeCreationOptions} from "./commander.ts";
import {
  InMemoryLoggerSink,
  MonorepositoryConsoleLogger,
  type LoggerRuntimeHost,
  type MonorepositoryLogger,
} from "./logger.ts";
import type {PromptProvider} from "./prompts.ts";
import {
  AbstractProcessRunner,
  type ProcessOutcome,
  type ProcessRequest,
  type ProcessRunner,
  type ProcessRunOptions,
} from "./runner.ts";
import {
  commandCancellationFromSignal,
  createRepositoryInspectionRuntime,
  DefaultTaskScheduler,
  FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE,
  FileSystemError,
  LifoCleanupRegistry,
  linkAbortSignals,
  type Clock,
  type CommandRuntime,
  type DirectoryEntry,
  type FileMetadata,
  type FileSystem,
  type HttpClient,
  type HttpResponse,
  type RuntimeEnvironment,
  type TemporaryDirectory,
} from "./runtime.ts";
import type {RepositoryInspectionSession} from "../inspection/repository.ts";
import type {InspectionOutcome} from "../inspection/types.ts";

/** Repository root every fixture filesystem is anchored to. */
export const repositoryFixtureRoot: string = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Fixed modification timestamp reported by every in-memory filesystem entry. */
const FIXTURE_MODIFIED_AT = new Date("2025-01-01T00:00:00.000Z");

/** Default POSIX-style permission bits for created files and directories. */
const FIXTURE_FILE_MODE = 0o644;
const FIXTURE_DIRECTORY_MODE = 0o755;

/** Root under which the in-memory filesystem creates temporary directories. */
const FIXTURE_TEMPORARY_ROOT = "/fixture-tmp";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

interface MemoryFileEntry {
  readonly kind: "file";
  contents: Uint8Array;
  mode: number;
}

interface MemoryDirectoryEntry {
  readonly kind: "directory";
  mode: number;
}

type MemoryEntry = MemoryFileEntry | MemoryDirectoryEntry;

/**
 * Normalizes a POSIX or Windows path into one canonical, separator-consistent absolute form.
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
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  const joined = segments.join("/");
  if (prefix === "") {
    return joined === "" ? "." : joined;
  }

  return `${prefix}${joined}`;
}

function fixtureParentPath(path: string): string | undefined {
  const separatorIndex = path.lastIndexOf("/");
  if (separatorIndex < 0 || separatorIndex === path.length - 1) {
    return undefined;
  }

  const parent = path.slice(0, separatorIndex);
  if (parent === "") {
    return "/";
  }

  return /^[A-Za-z]:$/u.test(parent) ? `${parent}/` : parent;
}

function fixtureEntryName(path: string): string {
  const separatorIndex = path.lastIndexOf("/");
  return separatorIndex < 0 ? path : path.slice(separatorIndex + 1);
}

function fixtureError(operation: string, path: string, code: string, detail: string): FileSystemError {
  return new FileSystemError(operation, path, `Failed to ${operation} '${path}': ${detail}`, {code});
}

function escapeFixtureRegExp(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Compiles one glob pattern into a regular expression over canonical paths.
 *
 * @param pattern - Glob pattern supporting `?`, `*`, and `**`.
 * @returns A regular expression matching whole canonical paths.
 */
function fixtureGlobToRegExp(pattern: string): RegExp {
  let source = "";
  let index = 0;

  while (index < pattern.length) {
    const character = pattern[index] ?? "";
    if (character === "*") {
      if (pattern[index + 1] === "*") {
        if (pattern[index + 2] === "/") {
          source += "(?:[^/]+/)*";
          index += 3;
          continue;
        }
        source += "[^]*";
        index += 2;
        continue;
      }
      source += "[^/]*";
      index += 1;
      continue;
    }

    if (character === "?") {
      source += "[^/]";
      index += 1;
      continue;
    }

    source += escapeFixtureRegExp(character);
    index += 1;
  }

  return new RegExp(`^${source}$`, "u");
}

/**
 * Creates a complete in-memory {@link FileSystem} that normalizes Windows and POSIX paths,
 * reports platform-style error codes, bounds reads, and hands out exact temporary-directory
 * handles, so command tests never mock repository modules or touch real disk state.
 *
 * @param initialFiles - Files seeded before the filesystem is returned; missing parent
 * directories are created for each seeded path.
 * @returns A deterministic filesystem capability.
 */
export function createMemoryFileSystem(initialFiles: Readonly<Record<string, string | Uint8Array>> = {}): FileSystem {
  const entries = new Map<string, MemoryEntry>();
  let temporaryDirectoryCounter = 0;

  const ensureDirectory = (path: string): void => {
    const existing = entries.get(path);
    if (existing !== undefined) {
      return;
    }

    const parent = fixtureParentPath(path);
    if (parent !== undefined) {
      ensureDirectory(parent);
    }
    entries.set(path, {kind: "directory", mode: FIXTURE_DIRECTORY_MODE});
  };

  const requireEntry = (operation: string, path: string): MemoryEntry => {
    const entry = entries.get(path);
    if (entry === undefined) {
      throw fixtureError(operation, path, "ENOENT", "no such file or directory");
    }
    return entry;
  };

  const requireFile = (operation: string, path: string): MemoryFileEntry => {
    const entry = requireEntry(operation, path);
    if (entry.kind !== "file") {
      throw fixtureError(operation, path, "EISDIR", "illegal operation on a directory");
    }
    return entry;
  };

  const writeFileEntry = (operation: string, path: string, contents: Uint8Array, options: Readonly<{mode?: number; exclusive?: boolean}>): void => {
    const parent = fixtureParentPath(path);
    if (parent !== undefined && !entries.has(parent)) {
      throw fixtureError(operation, path, "ENOENT", "no such file or directory");
    }
    if (options.exclusive === true && entries.has(path)) {
      throw fixtureError(operation, path, "EEXIST", "file already exists");
    }

    const existing = entries.get(path);
    if (existing !== undefined && existing.kind === "directory") {
      throw fixtureError(operation, path, "EISDIR", "illegal operation on a directory");
    }

    entries.set(path, {kind: "file", contents: new Uint8Array(contents), mode: options.mode ?? existing?.mode ?? FIXTURE_FILE_MODE});
  };

  const descendantPaths = (path: string): readonly string[] =>
    [...entries.keys()].filter((candidate) => candidate === path || candidate.startsWith(`${path}/`));

  const removeSubtree = (path: string): void => {
    for (const candidate of descendantPaths(path)) {
      entries.delete(candidate);
    }
  };

  const fileSystem: FileSystem = {
    readText: async (path: string): Promise<string> =>
      textDecoder.decode(requireFile("readText", normalizeFixturePath(path)).contents),

    readBytes: async (path: string, options: Readonly<{maximumBytes?: number}> = {}): Promise<Uint8Array> => {
      const normalized = normalizeFixturePath(path);
      const {maximumBytes} = options;
      if (maximumBytes !== undefined && (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0)) {
        throw new RangeError("maximumBytes must be a non-negative safe integer.");
      }

      const entry = requireFile("readBytes", normalized);
      if (maximumBytes !== undefined && entry.contents.byteLength > maximumBytes) {
        throw new FileSystemError("readBytes", normalized, `File exceeds the ${String(maximumBytes)} byte limit.`, {
          code: FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE,
        });
      }

      return new Uint8Array(entry.contents);
    },

    exists: async (path: string): Promise<boolean> => entries.has(normalizeFixturePath(path)),

    assertAccessible: async (path: string): Promise<void> => {
      requireEntry("assertAccessible", normalizeFixturePath(path));
    },

    realPath: async (path: string): Promise<string> => {
      const normalized = normalizeFixturePath(path);
      requireEntry("realPath", normalized);
      return normalized;
    },

    inspect: async (path: string): Promise<FileMetadata> => {
      const normalized = normalizeFixturePath(path);
      const entry = entries.get(normalized);
      if (entry === undefined) {
        return {kind: "missing", size: 0};
      }

      return {
        kind: entry.kind,
        size: entry.kind === "file" ? entry.contents.byteLength : 0,
        mode: entry.mode,
        modifiedAt: FIXTURE_MODIFIED_AT,
      };
    },

    readDirectory: async (path: string): Promise<readonly DirectoryEntry[]> => {
      const normalized = normalizeFixturePath(path);
      const entry = requireEntry("readDirectory", normalized);
      if (entry.kind !== "directory") {
        throw fixtureError("readDirectory", normalized, "ENOTDIR", "not a directory");
      }

      return [...entries.entries()]
        .filter(([candidate]) => fixtureParentPath(candidate) === normalized)
        .map(([candidate, child]): DirectoryEntry => ({name: fixtureEntryName(candidate), kind: child.kind}))
        .toSorted((left, right) => left.name.localeCompare(right.name));
    },

    glob: async (
      patterns: string | readonly string[],
      options: Readonly<{cwd?: string; onlyFiles?: boolean}> = {},
    ): Promise<readonly string[]> => {
      const cwd = normalizeFixturePath(options.cwd ?? repositoryFixtureRoot);
      const expressions = (typeof patterns === "string" ? [patterns] : patterns).map((pattern) =>
        fixtureGlobToRegExp(normalizeFixturePath(`${cwd}/${pattern}`)),
      );

      return [...entries.entries()]
        .filter(([candidate, entry]) => {
          if (options.onlyFiles === true && entry.kind !== "file") {
            return false;
          }
          return expressions.some((expression) => expression.test(candidate));
        })
        .map(([candidate]) => candidate)
        .toSorted((left, right) => left.localeCompare(right));
    },

    createDirectory: async (path: string, options: Readonly<{recursive?: boolean; mode?: number}> = {}): Promise<void> => {
      const normalized = normalizeFixturePath(path);
      if (options.recursive === true) {
        ensureDirectory(normalized);
        return;
      }

      if (entries.has(normalized)) {
        throw fixtureError("createDirectory", normalized, "EEXIST", "file already exists");
      }

      const parent = fixtureParentPath(normalized);
      if (parent !== undefined && !entries.has(parent)) {
        throw fixtureError("createDirectory", normalized, "ENOENT", "no such file or directory");
      }

      entries.set(normalized, {kind: "directory", mode: options.mode ?? FIXTURE_DIRECTORY_MODE});
    },

    writeText: async (path: string, contents: string, options: Readonly<{mode?: number; exclusive?: boolean}> = {}): Promise<void> => {
      writeFileEntry("writeText", normalizeFixturePath(path), textEncoder.encode(contents), options);
    },

    writeBytes: async (path: string, contents: Uint8Array, options: Readonly<{mode?: number; exclusive?: boolean}> = {}): Promise<void> => {
      writeFileEntry("writeBytes", normalizeFixturePath(path), contents, options);
    },

    writeTextAtomic: async (path: string, contents: string, options: Readonly<{mode?: number; directoryMode?: number}> = {}): Promise<void> => {
      const normalized = normalizeFixturePath(path);
      const parent = fixtureParentPath(normalized);
      if (parent !== undefined) {
        ensureDirectory(parent);
      }
      writeFileEntry("writeTextAtomic", normalized, textEncoder.encode(contents), options.mode === undefined ? {} : {mode: options.mode});
    },

    copy: async (source: string, destination: string, options: Readonly<{recursive?: boolean; force?: boolean}> = {}): Promise<void> => {
      const normalizedSource = normalizeFixturePath(source);
      const normalizedDestination = normalizeFixturePath(destination);
      const entry = requireEntry("copy", normalizedSource);

      if (entry.kind === "directory" && options.recursive !== true) {
        throw fixtureError("copy", normalizedSource, "ERR_FS_EISDIR", "recursive copy is required for a directory");
      }

      for (const candidate of descendantPaths(normalizedSource)) {
        const candidateEntry = entries.get(candidate);
        if (candidateEntry === undefined) {
          continue;
        }

        const target = `${normalizedDestination}${candidate.slice(normalizedSource.length)}`;
        const parent = fixtureParentPath(target);
        if (parent !== undefined) {
          ensureDirectory(parent);
        }

        entries.set(
          target,
          candidateEntry.kind === "file"
            ? {kind: "file", contents: new Uint8Array(candidateEntry.contents), mode: candidateEntry.mode}
            : {kind: "directory", mode: candidateEntry.mode},
        );
      }
    },

    move: async (source: string, destination: string): Promise<void> => {
      const normalizedSource = normalizeFixturePath(source);
      const normalizedDestination = normalizeFixturePath(destination);
      requireEntry("move", normalizedSource);

      for (const candidate of descendantPaths(normalizedSource)) {
        const entry = entries.get(candidate);
        if (entry === undefined) {
          continue;
        }

        const target = `${normalizedDestination}${candidate.slice(normalizedSource.length)}`;
        const parent = fixtureParentPath(target);
        if (parent !== undefined) {
          ensureDirectory(parent);
        }
        entries.set(target, entry);
        entries.delete(candidate);
      }
    },

    remove: async (path: string, options: Readonly<{recursive?: boolean; force?: boolean}> = {}): Promise<void> => {
      const normalized = normalizeFixturePath(path);
      const entry = entries.get(normalized);
      if (entry === undefined) {
        if (options.force === true) {
          return;
        }
        throw fixtureError("remove", normalized, "ENOENT", "no such file or directory");
      }

      if (entry.kind === "directory" && options.recursive !== true) {
        throw fixtureError("remove", normalized, "ERR_FS_EISDIR", "recursive removal is required for a directory");
      }

      removeSubtree(normalized);
    },

    createTemporaryDirectory: async (prefix: string): Promise<TemporaryDirectory> => {
      temporaryDirectoryCounter += 1;
      const path = normalizeFixturePath(`${FIXTURE_TEMPORARY_ROOT}/${prefix}${String(temporaryDirectoryCounter).padStart(6, "0")}`);
      ensureDirectory(path);

      return {
        path,
        remove: async (): Promise<void> => {
          removeSubtree(path);
        },
      };
    },

    setMode: async (path: string, mode: number): Promise<void> => {
      const normalized = normalizeFixturePath(path);
      requireEntry("setMode", normalized).mode = mode;
    },
  };

  for (const [path, contents] of Object.entries(initialFiles)) {
    const normalized = normalizeFixturePath(path);
    const parent = fixtureParentPath(normalized);
    if (parent !== undefined) {
      ensureDirectory(parent);
    }
    entries.set(normalized, {
      kind: "file",
      contents: typeof contents === "string" ? textEncoder.encode(contents) : new Uint8Array(contents),
      mode: FIXTURE_FILE_MODE,
    });
  }

  return fileSystem;
}

/**
 * Creates an in-memory filesystem that already identifies {@link repositoryFixtureRoot} as the
 * monorepository root, so `resolveRepositoryPaths(import.meta.url, files)` resolves without real
 * I/O.
 *
 * @param initialFiles - Files overlaid on top of the seeded repository identity.
 * @returns A filesystem capability anchored to the fixture repository root.
 */
export function createRepositoryFixtureFileSystem(
  initialFiles: Readonly<Record<string, string | Uint8Array>> = {},
): FileSystem {
  return createMemoryFileSystem({
    [`${repositoryFixtureRoot}/package.json`]: JSON.stringify({name: "@arolariu/monorepo"}, null, 2),
    ...initialFiles,
  });
}

/**
 * Builds one complete {@link HttpResponse} without performing any network I/O.
 *
 * @param status - HTTP status code.
 * @param body - Response body text.
 * @param headers - Optional response headers.
 * @returns A fully populated response value.
 */
export function createHttpResponse(
  status: number,
  body: string,
  headers: Readonly<Record<string, string>> = {},
): HttpResponse {
  return {
    status,
    ok: status >= 200 && status <= 299,
    headers,
    bytes: textEncoder.encode(body),
    text: body,
  };
}

/**
 * Creates a repository inspection session that reports every fact as unavailable.
 *
 * @returns A session stub safe to share across commands that never inspect the repository.
 */
export function createRepositoryInspectionSessionStub(): RepositoryInspectionSession {
  return {
    inspect: <TValue,>(): Promise<InspectionOutcome<TValue>> =>
      Promise.resolve({kind: "unavailable", reason: "Inspection is stubbed in tests.", durationMs: 0}),
    invalidate: (): void => undefined,
    updateInfrastructureEngine: (): void => undefined,
  };
}

/** Outcome returned once a scripted {@link createProcessRunner} queue is exhausted. */
const DEFAULT_PROCESS_OUTCOME: ProcessOutcome = {
  kind: "succeeded",
  exitCode: 0,
  stdout: "",
  stderr: "",
  durationMs: 0,
};

class RecordingProcessRunner extends AbstractProcessRunner {
  readonly #outcomes: ProcessOutcome[];
  readonly #calls: Readonly<{request: ProcessRequest; options: ProcessRunOptions}>[] = [];

  public constructor(outcomes: readonly ProcessOutcome[]) {
    super();
    this.#outcomes = [...outcomes];
  }

  /** Every recorded invocation, in call order. */
  public get calls(): readonly Readonly<{request: ProcessRequest; options: ProcessRunOptions}>[] {
    return this.#calls;
  }

  /** {@inheritDoc AbstractProcessRunner.execute} */
  protected override execute(
    request: Readonly<ProcessRequest>,
    options: Readonly<ProcessRunOptions>,
  ): Promise<ProcessOutcome> {
    this.#calls.push({request, options});
    return Promise.resolve(this.#outcomes.shift() ?? DEFAULT_PROCESS_OUTCOME);
  }
}

/**
 * Creates a process runner that records every invocation and replays scripted outcomes.
 *
 * @param outcomes - Outcomes returned in order; a successful outcome is returned once exhausted.
 * @returns A runner exposing its recorded calls.
 */
export function createProcessRunner(
  outcomes: readonly ProcessOutcome[] = [],
): ProcessRunner & Readonly<{calls: readonly Readonly<{request: ProcessRequest; options: ProcessRunOptions}>[]}> {
  return new RecordingProcessRunner(outcomes);
}

/**
 * Creates a process host that records requested exit codes instead of assigning them.
 *
 * @remarks
 * `isDirectEntry` always reports `true`; a test that needs the non-entrypoint path spreads the
 * host and replaces that member while keeping the same recorder.
 *
 * @param argv - Invocation argv the host reports.
 * @returns A process host and its ordered record of requested exit codes.
 */
export function createTestProcessHost(
  argv: readonly string[] = [],
): CommandProcessHost & Readonly<{assignedExitCodes: readonly number[]}> {
  const assignedExitCodes: number[] = [];

  return {
    argv: Object.freeze([...argv]),
    isDirectEntry: (): boolean => true,
    setExitCode: (exitCode: number): void => {
      assignedExitCodes.push(exitCode);
    },
    get assignedExitCodes(): readonly number[] {
      return assignedExitCodes;
    },
  };
}

/** Immutable environment every test runtime observes unless a test replaces it. */
const testRuntimeEnvironment: RuntimeEnvironment = {
  variables: Object.freeze({}),
  cwd: repositoryFixtureRoot,
  executablePath: "/usr/bin/node",
  platform: "linux",
  architecture: "x64",
  stdinIsTTY: false,
  stdoutIsTTY: false,
  isCI: true,
};

/** Logger host whose progress interval never fires, so no test depends on wall-clock timing. */
const testLoggerRuntimeHost: LoggerRuntimeHost = {
  stdoutIsTTY: false,
  noColor: true,
  scheduleInterval: () => ({cancel: (): void => undefined, unref: (): void => undefined}),
};

const testClock: Clock = {
  monotonicNow: (): number => 0,
  isoTimestamp: (): string => "2025-01-01T00:00:00.000Z",
  delay: (_milliseconds: number, signal?: AbortSignal): Promise<void> =>
    signal?.aborted === true ? Promise.reject(commandCancellationFromSignal(signal)) : Promise.resolve(),
};

function rejectPrompt<TValue>(kind: string): Promise<TValue> {
  return Promise.reject(new Error(`Interactive ${kind} prompts are not available in the test runtime.`));
}

const testPromptProvider: PromptProvider = {
  confirm: (): Promise<boolean> => rejectPrompt("confirm"),
  select: <TValue extends string>(): Promise<TValue> => rejectPrompt<TValue>("select"),
  text: (): Promise<string> => rejectPrompt("text"),
  secret: (): Promise<string> => rejectPrompt("secret"),
};

const testHttpClient: HttpClient = {
  request: (): Promise<HttpResponse> => Promise.resolve(createHttpResponse(200, "")),
};

/**
 * Creates a {@link CommandRuntimeFactory} backed entirely by deterministic fakes.
 *
 * @remarks
 * Every scope receives fresh cancellation and cleanup state. A root scope links only the caller
 * signal; a child scope links both the parent and caller signals, shares the parent's
 * environment, inspection registry, filesystem, HTTP client, and prompts, and forks the parent
 * logger so redactions stay shared while presentation state stays independent. `overrides` are
 * applied last, so a test can replace any single capability without rebuilding the rest.
 *
 * @param overrides - Capabilities that replace the defaults on every created scope.
 * @returns A runtime factory suitable for command lifecycle tests.
 */
export function createTestRuntimeFactory(overrides: Readonly<Partial<CommandRuntime>> = {}): CommandRuntimeFactory {
  const environment = overrides.environment ?? testRuntimeEnvironment;
  const files = overrides.files ?? createRepositoryFixtureFileSystem();
  const inspection =
    overrides.inspection ?? createRepositoryInspectionRuntime(() => createRepositoryInspectionSessionStub());

  const createScope = (
    options: Readonly<RuntimeCreationOptions>,
    parent?: Readonly<CommandContext>,
  ): CommandRuntime => {
    const link = linkAbortSignals(parent?.runtime.signal, options.signal);
    const cleanup = new LifoCleanupRegistry();
    cleanup.register("cancellation link", () => {
      link.dispose();
    });

    const logger: MonorepositoryLogger =
      parent === undefined
        ? new MonorepositoryConsoleLogger("test", {
            mode: options.presentation,
            verbose: false,
            color: false,
            sink: new InMemoryLoggerSink(),
            runtimeHost: testLoggerRuntimeHost,
          })
        : parent.runtime.logger.fork("test", {mode: options.presentation, verbose: false});

    return {
      logger,
      prompts: parent?.runtime.prompts ?? testPromptProvider,
      runner: createProcessRunner(),
      http: parent?.runtime.http ?? testHttpClient,
      files: parent?.runtime.files ?? files,
      clock: testClock,
      tasks: new DefaultTaskScheduler(),
      inspection: parent?.runtime.inspection ?? inspection,
      environment: parent?.runtime.environment ?? environment,
      signal: link.signal,
      cleanup,
      ...overrides,
    };
  };

  return {
    processHost: createTestProcessHost(),
    createParseLogger: (): MonorepositoryLogger =>
      new MonorepositoryConsoleLogger("test", {
        verbose: false,
        color: false,
        sink: new InMemoryLoggerSink(),
        runtimeHost: testLoggerRuntimeHost,
      }),
    createRoot: (options: Readonly<RuntimeCreationOptions>): Promise<CommandRuntime> =>
      Promise.resolve(createScope(options)),
    createChild: (parent: Readonly<CommandContext>, options: Readonly<RuntimeCreationOptions>): Promise<CommandRuntime> =>
      Promise.resolve(createScope(options, parent)),
  };
}
