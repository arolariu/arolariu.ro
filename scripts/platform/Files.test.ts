/**
 * @fileoverview Tests for the Effect file, glob, read-only file, and GET-only HTTP services.
 * @module scripts/platform/Files.test
 */

import {NodeServices} from "@effect/platform-node";
import {Effect, FileSystem, Layer, Path} from "effect";
import {HttpClient, HttpClientResponse} from "effect/http";
import {describe, expect} from "vitest";

import {GetOnlyHttp, GetOnlyHttpLive, Glob, GlobLive, MaxBytesExceeded, ReadOnlyFiles, ReadOnlyFilesLive, readBytesBounded, TemporaryDirectories, TemporaryDirectoriesLive, writeTextAtomic} from "./Files.ts";
import {effectTest} from "./testing.ts";

const liveLayer = ReadOnlyFilesLive.pipe(Layer.provideMerge(Layer.merge(NodeServices.layer, GlobLive)));

const MUTATING_MEMBERS = ["writeFile", "writeFileString", "remove", "rename", "makeDirectory", "copy"] as const;

describe("readBytesBounded", () => {
  effectTest(
    "readBytesBounded returns content within the limit",
    () =>
      Effect.gen(function* () {
        // Arrange
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* fs.makeTempDirectoryScoped();
        const file = path.join(root, "ten.bin");
        yield* fs.writeFileString(file, "0123456789");

        // Act
        const bytes = yield* readBytesBounded(file, 10);

        // Assert
        expect(bytes).toHaveLength(10);
        expect(new TextDecoder().decode(bytes)).toBe("0123456789");
      }),
    liveLayer,
  );

  effectTest(
    "readBytesBounded fails with MaxBytesExceeded past the limit",
    () =>
      Effect.gen(function* () {
        // Arrange
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* fs.makeTempDirectoryScoped();
        const file = path.join(root, "eleven.bin");
        yield* fs.writeFileString(file, "0123456789A");

        // Act
        const error = yield* Effect.flip(readBytesBounded(file, 10));

        // Assert
        expect(error).toBeInstanceOf(MaxBytesExceeded);
        expect(error).toMatchObject({_tag: "MaxBytesExceeded", path: file, maximumBytes: 10});
      }),
    liveLayer,
  );

  effectTest(
    "readBytesBounded rejects a negative limit before opening the file",
    () =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(readBytesBounded("never-opened.bin", -1));

        // Assert
        expect(error).toMatchObject({_tag: "PlatformError", reason: {_tag: "BadArgument", method: "readBytesBounded"}});
      }),
    liveLayer,
  );
});

describe("writeTextAtomic", () => {
  effectTest(
    "writeTextAtomic replaces the file and leaves no temp files",
    () =>
      Effect.gen(function* () {
        // Arrange
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* fs.makeTempDirectoryScoped();
        const target = path.join(root, "target.txt");
        yield* fs.writeFileString(target, "old");

        // Act
        yield* writeTextAtomic(target, "new");

        // Assert
        expect(yield* fs.readFileString(target)).toBe("new");
        expect(yield* fs.readDirectory(root)).toEqual(["target.txt"]);
      }),
    liveLayer,
  );

  effectTest(
    "writeTextAtomic creates the parent directory",
    () =>
      Effect.gen(function* () {
        // Arrange
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* fs.makeTempDirectoryScoped();
        const target = path.join(root, "a", "b", "c.txt");

        // Act
        yield* writeTextAtomic(target, "nested");

        // Assert
        expect(yield* fs.exists(target)).toBe(true);
        expect(yield* fs.readFileString(target)).toBe("nested");
      }),
    liveLayer,
  );

  effectTest(
    "writeTextAtomic removes its temp file when the rename fails",
    () =>
      Effect.gen(function* () {
        // Arrange
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const root = yield* fs.makeTempDirectoryScoped();
        const target = path.join(root, "occupied");
        yield* fs.makeDirectory(path.join(target, "child"), {recursive: true});

        // Act
        const error = yield* Effect.flip(writeTextAtomic(target, "text", {mode: 0o644, directoryMode: 0o755}));

        // Assert
        expect(error._tag).toBe("PlatformError");
        expect((yield* fs.readDirectory(root)).toSorted()).toEqual(["occupied"]);
      }),
    liveLayer,
  );
});

describe("Glob", () => {
  effectTest(
    "Glob.match honours cwd and onlyFiles",
    () =>
      Effect.gen(function* () {
        // Arrange
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const glob = yield* Glob;
        const root = yield* fs.makeTempDirectoryScoped();
        yield* fs.makeDirectory(path.join(root, "x", "d"), {recursive: true});
        yield* fs.writeFileString(path.join(root, "x", "1.ts"), "1");
        yield* fs.writeFileString(path.join(root, "x", "2.md"), "2");

        // Act
        const files = yield* glob.match("x/*", {cwd: root, onlyFiles: true});
        const everything = yield* glob.match(["x/*"], {cwd: root});

        // Assert
        const relativeToRoot = (matches: readonly string[]): readonly string[] =>
          matches.map((match) => path.relative(root, match).replaceAll("\\", "/"));
        expect(files.every((match) => path.isAbsolute(match))).toBe(true);
        expect(relativeToRoot(files)).toEqual(["x/1.ts", "x/2.md"]);
        expect(relativeToRoot(everything).toSorted()).toEqual(["x/1.ts", "x/2.md", "x/d"]);
      }),
    liveLayer,
  );

  effectTest(
    "Glob.match reports a rejected walk as a PlatformError",
    () =>
      Effect.gen(function* () {
        // Arrange
        const glob = yield* Glob;
        const invalidPattern = 42 as unknown as string;

        // Act
        const error = yield* Effect.flip(glob.match(invalidPattern));

        // Assert
        expect(error).toMatchObject({
          _tag: "PlatformError",
          reason: {_tag: "Unknown", module: "Glob", method: "match", pathOrDescriptor: "."},
        });
      }),
    liveLayer,
  );
});

describe("ReadOnlyFiles", () => {
  effectTest(
    "ReadOnlyFiles exposes no mutating members",
    () =>
      Effect.gen(function* () {
        // Arrange
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const service = yield* ReadOnlyFiles;
        const root = yield* fs.makeTempDirectoryScoped();
        const file = path.join(root, "read.txt");
        yield* fs.writeFileString(file, "hello");

        // Act
        const keys = Object.keys(service);
        const text = yield* service.readFileString(file);
        const bounded = yield* Effect.flip(service.readBytesBounded(file, 4));
        const matches = yield* service.glob("*.txt", {cwd: root, onlyFiles: true});

        // Assert
        for (const member of MUTATING_MEMBERS) {
          expect(keys).not.toContain(member);
        }
        expect(keys.toSorted()).toEqual(
          ["access", "exists", "glob", "readBytesBounded", "readDirectory", "readFile", "readFileString", "realPath", "stat"].toSorted(),
        );
        expect(text).toBe("hello");
        expect(bounded._tag).toBe("MaxBytesExceeded");
        expect(matches).toEqual([path.join(root, "read.txt")]);
      }),
    liveLayer,
  );
});

describe("GetOnlyHttp", () => {
  effectTest(
    "GetOnlyHttp issues GET only",
    () => {
      // Arrange
      const requests: {method: string; url: string; accept: string | undefined}[] = [];
      const scripted = HttpClient.make((request) => {
        requests.push({method: request.method, url: request.url, accept: request.headers["accept"]});
        return Effect.succeed(HttpClientResponse.fromWeb(request, new Response("ok", {status: 200})));
      });
      const layer = GetOnlyHttpLive.pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, scripted)));

      return Effect.gen(function* () {
        const http = yield* GetOnlyHttp;

        // Act
        const response = yield* http.get("https://example.test/health", {headers: {accept: "application/json"}, timeout: "1 second"});

        // Assert
        expect(response.status).toBe(200);
        expect(Object.keys(http)).toEqual(["get"]);
        expect(requests).toEqual([{method: "GET", url: "https://example.test/health", accept: "application/json"}]);
      }).pipe(Effect.provide(layer));
    },
    Layer.empty,
  );

  effectTest(
    "GetOnlyHttp fails with TimeoutError when the request outlives the timeout",
    () => {
      // Arrange
      const scripted = HttpClient.make(() => Effect.never);
      const layer = GetOnlyHttpLive.pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, scripted)));

      return Effect.gen(function* () {
        const http = yield* GetOnlyHttp;

        // Act
        const error = yield* Effect.flip(http.get("https://example.test/slow", {timeout: "10 millis"}));

        // Assert
        expect(error._tag).toBe("TimeoutError");
      }).pipe(Effect.provide(layer));
    },
    Layer.empty,
  );
});

describe("TemporaryDirectories", () => {
  effectTest(
    "TemporaryDirectories removes the directory when the scope closes",
    () =>
      Effect.gen(function* () {
        // Arrange
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const temporaryDirectories = yield* TemporaryDirectories;

        // Act
        const created = yield* Effect.scoped(
          Effect.gen(function* () {
            const directory = yield* temporaryDirectories.make("arolariu-test-");
            yield* fs.writeFileString(path.join(directory, "nested.txt"), "content");
            expect(yield* fs.exists(directory)).toBe(true);
            return directory;
          }),
        );

        // Assert
        expect(path.basename(created).startsWith("arolariu-test-")).toBe(true);
        expect(yield* fs.exists(created)).toBe(false);
      }),
    TemporaryDirectoriesLive.pipe(Layer.provideMerge(NodeServices.layer)),
  );
});
