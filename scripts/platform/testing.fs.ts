/**
 * @fileoverview In-memory `FileSystem` and `Glob` used by the scripts test harness.
 * @module scripts/platform/testing.fs
 *
 * @remarks
 * Backs `makeTestLayer` (`./testing.ts`). Files and directories live in a map and a set keyed by
 * canonical, `/`-separated absolute paths. Every `FileSystem` member is either implemented with
 * Node-like semantics or dies with `unimplemented harness FileSystem.<op>`, so a test never
 * observes a silent no-op default that masquerades as a real outcome.
 */

import {ByteSize, Effect, FileSystem, Option, PlatformError, Sink, Stream} from "effect";

import type {GlobShape} from "./Files.ts";

/** Fixed timestamp reported by every in-memory `stat`. */
const FIXTURE_MODIFIED_AT = new Date("2025-01-01T00:00:00.000Z");
const ABSOLUTE_PATH = /^(?:[A-Za-z]:)?[\\/]/u;

/**
 * Normalizes a POSIX or Windows path into one canonical, `/`-separated form (legacy port).
 *
 * @param path - Path supplied by a caller.
 * @returns The canonical path used as the in-memory filesystem key.
 */
export function normalizeFixturePath(path: string): string {
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
export interface FixtureStore {
  /** File contents keyed by canonical absolute path. */
  readonly files: Map<string, string | Uint8Array>;
  /** Canonical absolute paths of every directory. */
  readonly directories: Set<string>;
}

/**
 * Encodes stored contents as bytes.
 *
 * @param value - Stored text or bytes.
 * @returns A fresh byte array.
 */
function toBytes(value: string | Uint8Array): Uint8Array {
  return typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
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
  return new Uint8Array([...toBytes(previous), ...toBytes(next)]);
}

/**
 * Builds the defect raised by a `FileSystem` member the harness does not implement.
 *
 * @param operation - The member name.
 * @returns The defect.
 */
function unimplemented(operation: string): Error {
  return new Error(`unimplemented harness FileSystem.${operation}`);
}

/**
 * Builds a complete map-backed `FileSystem`.
 *
 * @remarks
 * Temporary directories are created under `<cwd>/.tmp/harness-<n>` (or `<directory>/<prefix><n>`),
 * scoped variants remove them recursively when the scope closes, and `open` returns a read-only
 * handle (other flags die). `copy` follows `fs.cp` (recursive; existing files are skipped unless
 * `overwrite`), `copyFile` follows `fs.copyFile` (always overwrites).
 *
 * @param store - The fixture state.
 * @param cwd - Directory relative paths are resolved against.
 * @param seeds - Files stored, with their parent directories, before the filesystem is returned.
 * @returns The in-memory filesystem.
 */
export function memoryFileSystem(
  store: FixtureStore,
  cwd: string,
  seeds: Readonly<Record<string, string | Uint8Array>>,
): FileSystem.FileSystem {
  const {files, directories} = store;
  let temporaryCount = 0;
  const fail = (method: string, path: string, tag: PlatformError.SystemErrorTag): Effect.Effect<never, PlatformError.PlatformError> =>
    Effect.fail(
      PlatformError.systemError({_tag: tag, module: "FileSystem", method, pathOrDescriptor: path, description: `${tag}: ${path}`}),
    );
  const badArgument = (method: string, description: string): Effect.Effect<never, PlatformError.PlatformError> =>
    Effect.fail(PlatformError.badArgument({module: "FileSystem", method, description}));
  const die = (operation: string): Effect.Effect<never> => Effect.die(unimplemented(operation));
  const descendants = (key: string): string[] => {
    const prefix = key.endsWith("/") ? key : `${key}/`;
    return [...files.keys(), ...directories].filter((candidate) => candidate.startsWith(prefix) && candidate !== key);
  };
  const child = (key: string, name: string): string => (key.endsWith("/") ? `${key}${name}` : `${key}/${name}`);
  const addDirectories = (key: string | undefined): void => {
    for (let current = key; current !== undefined && !directories.has(current); current = fixtureParent(current)) {
      directories.add(current);
    }
  };
  const lookup = <A, R = never>(method: string, path: string, found: (key: string) => Effect.Effect<A, PlatformError.PlatformError, R>) =>
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
  const statKey = (key: string): FileSystem.File.Info => {
    const contents = files.get(key);
    return contents === undefined ? info("Directory", 0) : info("File", toBytes(contents).byteLength);
  };

  const remove: FileSystem.FileSystem["remove"] = (path, options) =>
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
    });

  const makeTempDirectory = (method: string, options?: {readonly directory?: string | undefined; readonly prefix?: string | undefined}) =>
    Effect.suspend(() => {
      const parent = fixtureKey(cwd, options?.directory ?? ".tmp");
      if (options?.directory === undefined) {
        addDirectories(parent);
      } else if (!directories.has(parent)) {
        return fail(method, parent, "NotFound");
      }
      temporaryCount += 1;
      const key = child(parent, `${options?.prefix ?? "harness-"}${String(temporaryCount)}`);
      directories.add(key);
      return Effect.succeed(key);
    });
  const makeTempFile = (
    method: string,
    options?: {readonly directory?: string | undefined; readonly prefix?: string | undefined; readonly suffix?: string | undefined},
  ) =>
    Effect.map(makeTempDirectory(method, options), (directory) => {
      const key = child(directory, `file-${String(temporaryCount)}${options?.suffix ?? ""}`);
      files.set(key, new Uint8Array(0));
      return key;
    });
  const removeTemporary = (key: string): Effect.Effect<void> => Effect.orDie(remove(key, {recursive: true}));

  const open: FileSystem.FileSystem["open"] = (path, options) => {
    const flag = options?.flag ?? "r";
    if (flag !== "r") {
      return die(`open (flag "${flag}")`);
    }
    return lookup("open", path, (key) => {
      const contents = files.get(key);
      if (contents === undefined) {
        return fail("open", key, "BadResource");
      }
      const bytes = toBytes(contents);
      const handle = {closed: false, position: 0};
      const guarded = <A>(method: string, run: () => Effect.Effect<A, PlatformError.PlatformError>) =>
        Effect.suspend(() => (handle.closed ? fail(method, key, "BadResource") : run()));
      const take = (size: number): Uint8Array => {
        const chunk = bytes.subarray(handle.position, Math.min(bytes.length, handle.position + size));
        handle.position += chunk.length;
        return chunk;
      };
      const readOnly = (method: string) => guarded(method, () => fail(method, key, "BadResource"));
      const file: FileSystem.File = {
        [FileSystem.FileTypeId]: FileSystem.FileTypeId,
        stat: guarded("stat", () => Effect.succeed(info("File", bytes.length))),
        seek: (offset, from) =>
          guarded("seek", () => {
            const position = (from === "start" ? 0n : BigInt(handle.position)) + offset;
            if (position < 0n) {
              return badArgument("seek", "Cannot seek before the start of the file");
            }
            handle.position = Number(position);
            return Effect.succeed(position);
          }),
        sync: guarded("sync", () => Effect.void),
        read: (buffer) =>
          guarded("read", () =>
            Effect.sync(() => {
              const chunk = take(buffer.length);
              buffer.set(chunk);
              return chunk.length;
            }),
          ),
        readAlloc: (size) =>
          guarded("readAlloc", () => {
            if (!Number.isInteger(size) || size < 0) {
              return badArgument("readAlloc", "size must be a non-negative integer");
            }
            const chunk = take(size);
            return Effect.succeed(chunk.length === 0 ? Option.none() : Option.some(new Uint8Array(chunk)));
          }),
        truncate: () => readOnly("truncate"),
        write: () => readOnly("write"),
        writeAll: () => readOnly("writeAll"),
      };
      return Effect.acquireRelease(Effect.succeed(file), () =>
        Effect.sync(() => {
          handle.closed = true;
        }),
      );
    });
  };

  const copy: FileSystem.FileSystem["copy"] = (fromPath, toPath, options) =>
    lookup("copy", fromPath, (from) => {
      const to = fixtureKey(cwd, toPath);
      if (to === from || to.startsWith(child(from, ""))) {
        return badArgument("copy", `cannot copy ${from} to itself or to a subdirectory of itself`);
      }
      const entries = [from, ...descendants(from)].map((entry) => ({entry, target: `${to}${entry.slice(from.length)}`}));
      for (const {entry, target} of entries) {
        if (files.has(entry) ? directories.has(target) : files.has(target)) {
          return fail("copy", target, "BadResource");
        }
      }
      for (const {entry, target} of entries) {
        const contents = files.get(entry);
        if (contents === undefined) {
          addDirectories(target);
        } else if (options?.overwrite === true || !files.has(target)) {
          addDirectories(fixtureParent(target));
          files.set(target, typeof contents === "string" ? contents : new Uint8Array(contents));
        }
      }
      return Effect.void;
    });

  const copyFile: FileSystem.FileSystem["copyFile"] = (fromPath, toPath) =>
    Effect.flatMap(readFile("copyFile", fromPath), (contents) =>
      write("copyFile", toPath, typeof contents === "string" ? contents : new Uint8Array(contents), undefined),
    );

  addDirectories(normalizeFixturePath(cwd));
  for (const [path, contents] of Object.entries(seeds)) {
    const key = fixtureKey(cwd, path);
    addDirectories(fixtureParent(key));
    files.set(key, contents);
  }

  const fileSystem = FileSystem.make({
    access: (path) => lookup("access", path, () => Effect.void),
    chmod: () => die("chmod"),
    chown: () => die("chown"),
    copy,
    copyFile,
    glob: () => die("glob"),
    link: () => die("link"),
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
    makeTempDirectory: (options) => makeTempDirectory("makeTempDirectory", options),
    makeTempDirectoryScoped: (options) => Effect.acquireRelease(makeTempDirectory("makeTempDirectoryScoped", options), removeTemporary),
    makeTempFile: (options) => makeTempFile("makeTempFile", options),
    makeTempFileScoped: (options) =>
      Effect.acquireRelease(makeTempFile("makeTempFileScoped", options), (key) => removeTemporary(fixtureParent(key) ?? key)),
    open,
    readDirectory: (path, options) =>
      lookup("readDirectory", path, (key) => {
        if (!directories.has(key)) {
          return fail("readDirectory", key, "BadResource");
        }
        const prefixLength = child(key, "").length;
        const names = descendants(key).map((candidate) => candidate.slice(prefixLength));
        return Effect.succeed(names.filter((name) => options?.recursive === true || !name.includes("/")).toSorted());
      }),
    readFile: (path) => Effect.map(readFile("readFile", path), toBytes),
    readLink: () => die("readLink"),
    realPath: (path) => lookup("realPath", path, Effect.succeed),
    remove,
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
    stat: (path) => lookup("stat", path, (key) => Effect.succeed(statKey(key))),
    symlink: () => die("symlink"),
    truncate: () => die("truncate"),
    utimes: () => die("utimes"),
    watch: () => Stream.die(unimplemented("watch")),
    writeFile: (path, data, options) => write("writeFile", path, new Uint8Array(data), options?.flag),
  });
  return FileSystem.FileSystem.of({
    ...fileSystem,
    readFileString: (path, encoding) =>
      Effect.map(readFile("readFileString", path), (contents) =>
        typeof contents === "string" ? contents : new TextDecoder(encoding).decode(contents),
      ),
    writeFileString: (path, data, options) => write("writeFileString", path, data, options?.flag),
    sink: () => Sink.die(unimplemented("sink")),
  });
}

/**
 * Builds a `Glob` over the in-memory store.
 *
 * @param store - The fixture state.
 * @param cwd - Directory relative patterns and `options.cwd` are resolved against.
 * @returns A glob returning sorted canonical absolute `/` paths.
 */
export function memoryGlob(store: FixtureStore, cwd: string): GlobShape {
  return {
    match: (patterns, options = {}) =>
      Effect.sync(() => {
        const base = fixtureKey(cwd, options.cwd ?? ".");
        const expressions = (typeof patterns === "string" ? [patterns] : patterns).map((pattern) =>
          fixtureGlobToRegExp(fixtureKey(base, pattern)),
        );
        const candidates = options.onlyFiles === true ? [...store.files.keys()] : [...store.files.keys(), ...store.directories];
        return candidates
          .filter((candidate) => expressions.some((expression) => expression.test(candidate)))
          .toSorted((left, right) => left.localeCompare(right));
      }),
  };
}
