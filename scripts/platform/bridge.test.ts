// @vitest-environment node
/**
 * @fileoverview Tests for the Effect interop bridge used by legacy Promise commands.
 * @module scripts/platform/bridge.test
 *
 * @remarks
 * Every runEffect/legacyInvoker case injects a layer factory over the in-memory harness with the
 * live clock, so real time applies (cancellation waits on a real timer) while no test reaches a
 * real external boundary.
 */

import {join} from "node:path";

import {Cause, Effect, Exit, PlatformError, Scope} from "effect";
import {describe, expect, it} from "vitest";

import {createRepositoryPaths, resolveRepositoryPaths} from "../common/repository-paths.ts";
import {CommandCancellation, FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE, FileSystemError} from "../common/runtime.ts";
import {createTestRuntimeFactory} from "../common/runtime.testing.ts";
import type {RepositoryInspectionFacts, RepositoryInspectionRequest} from "../inspection/repository.ts";
import {
  createLegacyInspectionRuntime,
  legacyFileSystem,
  legacyInvoker,
  legacyReadOnlyFiles,
  legacyTaskScheduler,
  runEffect,
  toLegacyFileSystemError,
  type LayerFactory,
} from "./bridge.ts";
import {MaxBytesExceeded} from "./Files.ts";
import type {PlatformServices} from "./layers.ts";
import {OutputSettings, type OutputSettingsShape, type SinkRecord} from "./Output.ts";
import {ProcessExited} from "./Process.ts";
import {effectTest, makeTestLayer, repositoryFixtureRoot, type TestHarness} from "./testing.ts";

/** A layer factory over a live-clock harness, plus accessors over the last harness it built. */
interface RecordingFactory {
  readonly makeLayer: LayerFactory;
  readonly output: () => readonly SinkRecord[];
  readonly settings: () => OutputSettingsShape | undefined;
}

/**
 * Builds a {@link LayerFactory} that records the settings it receives and the harness it builds.
 *
 * @returns The factory and its accessors.
 */
function recordingFactory(): RecordingFactory {
  let harness: TestHarness<PlatformServices> | undefined;
  let received: OutputSettingsShape | undefined;
  return {
    makeLayer: (settings) => {
      received = settings;
      harness = makeTestLayer({mode: settings.mode, verbose: settings.verbose, context: settings.context, clock: "live"});
      return harness.layer;
    },
    output: () => harness?.output() ?? [],
    settings: () => received,
  };
}

describe("runEffect", () => {
  it("runEffect returns a success exit", async () => {
    // Arrange
    const factory = recordingFactory();

    // Act
    const exit = await runEffect(Effect.succeed(1), {
      presentation: "silent",
      verbose: false,
      context: "bridge",
      makeLayer: factory.makeLayer,
    });

    // Assert
    expect(Exit.isSuccess(exit)).toBe(true);
    expect(Exit.isSuccess(exit) ? exit.value : undefined).toBe(1);
  });

  it("runEffect renders in the requested presentation", async () => {
    // Arrange
    const json = recordingFactory();
    const human = recordingFactory();

    // Act
    await runEffect(Effect.logInfo("x"), {presentation: "json", verbose: false, context: "bridge", makeLayer: json.makeLayer});
    await runEffect(Effect.logInfo("x"), {presentation: "human", verbose: true, context: "bridge", makeLayer: human.makeLayer});

    // Assert
    expect(json.output()).toEqual([]);
    expect(human.output()).toHaveLength(1);
    expect(human.output()[0]?.text).toContain("[arolariu::bridge]");
    expect(human.settings()).toMatchObject({mode: "human", verbose: true, context: "bridge"});
  });
});

describe("legacyInvoker", () => {
  it("legacyInvoker maps success with the business exit code", async () => {
    // Arrange
    const factory = recordingFactory();
    const invoker = legacyInvoker(
      "bridge",
      (_input: Readonly<{verbose?: boolean}>) => Effect.succeed({ok: false}),
      (output) => (output.ok ? 0 : 1),
      factory.makeLayer,
    );

    // Act
    const execution = await invoker.invoke({verbose: true});

    // Assert
    expect(execution).toEqual({status: "completed", exitCode: 1, value: {ok: false}});
    expect(factory.settings()).toMatchObject({mode: "silent", verbose: true, context: "bridge"});
  });

  it("legacyInvoker maps typed failures to operational exit 1 with process evidence", async () => {
    // Arrange
    const error = new ProcessExited({
      command: "git status",
      stdout: "",
      stderr: "boom",
      durationMs: 5,
      exitCode: 1,
      message: "git status exited with code 1",
    });
    const invoker = legacyInvoker(
      "bridge",
      () => Effect.fail(error),
      () => 0,
      recordingFactory().makeLayer,
    );

    // Act
    const execution = await invoker.invoke({}, {presentation: "human"});

    // Assert
    expect(execution).toEqual({
      status: "failed",
      exitCode: 1,
      failure: {
        kind: "operational",
        message: "git status exited with code 1",
        evidence: ["git status exited with code 1", "stderr: boom"],
        cause: error,
      },
    });
  });

  it("legacyInvoker maps defects to internal", async () => {
    // Arrange
    const invoker = legacyInvoker(
      "bridge",
      () => Effect.die("bad"),
      () => 0,
      recordingFactory().makeLayer,
    );

    // Act
    const execution = await invoker.invoke({});

    // Assert
    expect(execution).toEqual({status: "failed", exitCode: 1, failure: {kind: "internal", message: "bad", evidence: [], cause: "bad"}});
  });

  it("runs finalizers before resolving a cancelled execution", async () => {
    // Arrange
    const events: string[] = [];
    const program = (): Effect.Effect<never, never, PlatformServices | Scope.Scope> =>
      Effect.gen(function* () {
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            events.push("finalized");
          }),
        );
        return yield* Effect.never;
      });
    const invoker = legacyInvoker("bridge", program, () => 0, recordingFactory().makeLayer);
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort();
    }, 50);

    // Act
    const observed = await invoker.invoke({}, {signal: controller.signal}).then((execution) => ({execution, events: [...events]}));

    // Assert
    expect(observed.execution).toMatchObject({
      status: "cancelled",
      exitCode: 130,
      failure: {kind: "cancelled", evidence: []},
    });
    expect(observed.execution.status === "cancelled" ? observed.execution.failure.cause : undefined).toBeInstanceOf(CommandCancellation);
    expect(observed.events).toEqual(["finalized"]);
  });

  it("legacyInvoker preserves a SIGTERM cancellation reason", async () => {
    // Arrange
    const reason = new CommandCancellation("Command terminated by SIGTERM.", 143);
    const invoker = legacyInvoker(
      "bridge",
      () => Effect.never,
      () => 0,
      recordingFactory().makeLayer,
    );
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort(reason);
    }, 20);

    // Act
    const execution = await invoker.invoke({}, {signal: controller.signal});

    // Assert
    expect(execution).toEqual({
      status: "cancelled",
      exitCode: 143,
      failure: {kind: "cancelled", message: "Command terminated by SIGTERM.", evidence: [], cause: reason},
    });
  });

  it("legacyInvoker keeps a cancellation when a finalizer fails", async () => {
    // Arrange
    const program = (): Effect.Effect<never, never, PlatformServices | Scope.Scope> =>
      Effect.gen(function* () {
        yield* Effect.addFinalizer(() => Effect.die(new Error("cleanup broke")));
        return yield* Effect.never;
      });
    const invoker = legacyInvoker("bridge", program, () => 0, recordingFactory().makeLayer);
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort(new CommandCancellation("Command interrupted by SIGINT.", 130));
    }, 20);

    // Act
    const execution = await invoker.invoke({}, {signal: controller.signal});

    // Assert
    expect(execution).toMatchObject({
      status: "cancelled",
      exitCode: 130,
      failure: {kind: "cancelled", message: "Command interrupted by SIGINT.", evidence: ["cleanup broke"]},
    });
  });

  it("legacyInvoker keeps a cancellation when the interrupted program also failed", async () => {
    // Arrange
    const controller = new AbortController();
    const reason = new CommandCancellation("Command terminated by SIGTERM.", 143);
    const program = (): Effect.Effect<never, Error> =>
      Effect.uninterruptible(
        Effect.sync(() => {
          controller.abort(reason);
        }).pipe(Effect.andThen(Effect.failCause(Cause.combine(Cause.fail(new Error("step failed")), Cause.interrupt())))),
      );
    const invoker = legacyInvoker("bridge", program, () => 0, recordingFactory().makeLayer);

    // Act
    const execution = await invoker.invoke({}, {signal: controller.signal});

    // Assert
    expect(execution).toEqual({
      status: "cancelled",
      exitCode: 143,
      failure: {kind: "cancelled", message: "Command terminated by SIGTERM.", evidence: ["step failed"], cause: reason},
    });
  });

  it("legacyInvoker maps a self-interruption without an aborted signal to 130", async () => {
    // Arrange
    const invoker = legacyInvoker(
      "bridge",
      () => Effect.interrupt,
      () => 0,
      recordingFactory().makeLayer,
    );

    // Act
    const execution = await invoker.invoke({});

    // Assert
    expect(execution).toEqual({
      status: "cancelled",
      exitCode: 130,
      failure: {kind: "cancelled", message: "Command cancelled.", evidence: []},
    });
  });

  it("legacyInvoker defaults to the Node layer", async () => {
    // Arrange
    const invoker = legacyInvoker(
      "bridge",
      () => Effect.as(Effect.service(OutputSettings), {ok: true}),
      () => 0,
    );

    // Act
    const execution = await invoker.invoke({});

    // Assert
    expect(execution).toEqual({status: "completed", exitCode: 0, value: {ok: true}});
  });

  it("legacyInvoker follows the parent runtime signal", async () => {
    // Arrange
    const runtime = await createTestRuntimeFactory().createRoot({
      presentation: "silent",
      registerProcessSignals: false,
      signal: AbortSignal.abort(),
    });
    const invoker = legacyInvoker(
      "bridge",
      () => Effect.never,
      () => 0,
      recordingFactory().makeLayer,
    );

    // Act
    const execution = await invoker.invoke({}, {parent: {runtime, presentation: "silent"}});
    await runtime.cleanup.drain();

    // Assert
    expect(execution.status).toBe("cancelled");
    expect(execution.exitCode).toBe(130);
    expect(execution.status === "cancelled" ? execution.failure.cause : undefined).toBeInstanceOf(CommandCancellation);
  });
});

/** Absolute path of a harness fixture file. */
function fixturePath(...segments: readonly string[]): string {
  return join(repositoryFixtureRoot, ...segments);
}

/**
 * Settles a promise into its rejection reason.
 *
 * @param promise - A promise expected to reject.
 * @returns An effect succeeding with the rejection reason, or `undefined` when the promise resolved.
 */
function rejectionOf(promise: () => Promise<unknown>): Effect.Effect<unknown> {
  return Effect.promise(() =>
    promise().then(
      () => undefined,
      (error: unknown) => error,
    ),
  );
}

describe("legacy file views", () => {
  const readHarness = makeTestLayer({files: {"a.txt": "x", "two.bin": "ab", "nested/b.md": "# B"}});

  effectTest(
    "legacyReadOnlyFiles reads through the Effect service",
    () =>
      Effect.gen(function* () {
        // Arrange
        const view = yield* legacyReadOnlyFiles;

        // Act
        const text = yield* Effect.promise(() => view.readText(fixturePath("a.txt")));
        const bytes = yield* Effect.promise(() => view.readBytes(fixturePath("two.bin")));
        const bounded = yield* Effect.promise(() => view.readBytes(fixturePath("two.bin"), {maximumBytes: 2}));
        const exists = yield* Effect.promise(() => view.exists(fixturePath("a.txt")));
        const missing = yield* Effect.promise(() => view.exists(fixturePath("missing.txt")));
        const entries = yield* Effect.promise(() => view.readDirectory(repositoryFixtureRoot));
        const file = yield* Effect.promise(() => view.inspect(fixturePath("a.txt")));
        const directory = yield* Effect.promise(() => view.inspect(fixturePath("nested")));
        const absent = yield* Effect.promise(() => view.inspect(fixturePath("missing.txt")));
        const real = yield* Effect.promise(() => view.realPath(fixturePath("a.txt")));
        const matches = yield* Effect.promise(() => view.glob("**/*.md", {cwd: repositoryFixtureRoot, onlyFiles: true}));
        yield* Effect.promise(() => view.assertAccessible(fixturePath("a.txt"), {read: true, write: true}));

        // Assert
        expect(text).toBe("x");
        expect(new TextDecoder().decode(bytes)).toBe("ab");
        expect(new TextDecoder().decode(bounded)).toBe("ab");
        expect([exists, missing]).toEqual([true, false]);
        expect(entries).toEqual([
          {name: "a.txt", kind: "file"},
          {name: "nested", kind: "directory"},
          {name: "two.bin", kind: "file"},
        ]);
        expect(file).toMatchObject({kind: "file", size: 1});
        expect(file.modifiedAt).toBeInstanceOf(Date);
        expect(directory.kind).toBe("directory");
        expect(absent).toEqual({kind: "missing", size: 0});
        expect(real.replaceAll("\\", "/")).toBe(fixturePath("a.txt").replaceAll("\\", "/"));
        expect(matches).toEqual([fixturePath("nested", "b.md").replaceAll("\\", "/")]);
      }),
    readHarness.layer,
  );

  effectTest(
    "legacyReadOnlyFiles maps missing files to ENOENT",
    () =>
      Effect.gen(function* () {
        // Arrange
        const view = yield* legacyReadOnlyFiles;
        const path = fixturePath("missing.txt");

        // Act
        const error = yield* rejectionOf(() => view.readText(path));
        const listing = yield* rejectionOf(() => view.readDirectory(path));
        const access = yield* rejectionOf(() => view.assertAccessible(path));

        // Assert
        expect(error).toBeInstanceOf(FileSystemError);
        expect(error).toMatchObject({code: "ENOENT", operation: "readText", path});
        expect(listing).toMatchObject({code: "ENOENT", operation: "readDirectory"});
        expect(access).toMatchObject({code: "ENOENT", operation: "assertAccessible"});
      }),
    makeTestLayer().layer,
  );

  effectTest(
    "legacyReadOnlyFiles maps the byte limit",
    () =>
      Effect.gen(function* () {
        // Arrange
        const view = yield* legacyReadOnlyFiles;
        const path = fixturePath("two.bin");

        // Act
        const error = yield* rejectionOf(() => view.readBytes(path, {maximumBytes: 1}));
        const invalid = yield* rejectionOf(() => view.readBytes(path, {maximumBytes: -1}));
        const execute = yield* rejectionOf(() => view.assertAccessible(path, {execute: true}));

        // Assert
        expect(error).toBeInstanceOf(FileSystemError);
        expect(error).toMatchObject({code: FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE, operation: "readBytes", path});
        expect(invalid).toBeInstanceOf(RangeError);
        expect(execute).toMatchObject({code: "ENOTSUP", operation: "assertAccessible"});
      }),
    makeTestLayer({files: {"two.bin": "ab"}}).layer,
  );

  effectTest(
    "resolveRepositoryPaths works through the view",
    () =>
      Effect.gen(function* () {
        // Arrange
        const view = yield* legacyReadOnlyFiles;

        // Act
        const paths = yield* Effect.promise(() => resolveRepositoryPaths(import.meta.url, view));

        // Assert
        expect(paths.root).toBe(repositoryFixtureRoot);
      }),
    makeTestLayer({files: {"package.json": JSON.stringify({name: "@arolariu/monorepo"})}}).layer,
  );

  const writeHarness = makeTestLayer({files: {"src/a.md": "A", "src/deep/b.md": "B", "old.txt": "old"}});

  effectTest(
    "legacyFileSystem mutates through the Effect services",
    () =>
      Effect.gen(function* () {
        // Arrange
        const view = yield* legacyFileSystem;

        // Act
        yield* Effect.promise(() => view.createDirectory(fixturePath("out", "nested"), {recursive: true}));
        yield* Effect.promise(() => view.writeText(fixturePath("out", "text.txt"), "text"));
        yield* Effect.promise(() => view.writeBytes(fixturePath("out", "bytes.bin"), new TextEncoder().encode("bytes")));
        yield* Effect.promise(() => view.writeTextAtomic(fixturePath("atomic", "file.txt"), "atomic"));
        yield* Effect.promise(() => view.copy(fixturePath("src"), fixturePath("copy"), {recursive: true}));
        yield* Effect.promise(() => view.copy(fixturePath("src", "a.md"), fixturePath("single.md")));
        yield* Effect.promise(() => view.move(fixturePath("old.txt"), fixturePath("new.txt")));
        yield* Effect.promise(() => view.remove(fixturePath("src"), {recursive: true}));
        yield* Effect.promise(() => view.remove(fixturePath("never"), {force: true}));
        const temporary = yield* Effect.promise(() => view.createTemporaryDirectory("arolariu-"));
        const temporaryExisted = yield* Effect.promise(() => view.exists(temporary.path));
        yield* Effect.promise(() => temporary.remove());
        const exclusive = yield* rejectionOf(() => view.writeText(fixturePath("out", "text.txt"), "again", {exclusive: true}));
        const shallowCopy = yield* rejectionOf(() => view.copy(fixturePath("copy"), fixturePath("copy-2")));

        // Assert
        const files = writeHarness.files();
        const key = (...segments: readonly string[]): string => fixturePath(...segments).replaceAll("\\", "/");
        expect(files.get(key("out", "text.txt"))).toBe("text");
        expect(new TextDecoder().decode(files.get(key("out", "bytes.bin")) as Uint8Array)).toBe("bytes");
        expect(files.get(key("atomic", "file.txt"))).toBe("atomic");
        expect(files.get(key("copy", "a.md"))).toBe("A");
        expect(files.get(key("copy", "deep", "b.md"))).toBe("B");
        expect(files.get(key("single.md"))).toBe("A");
        expect(files.get(key("new.txt"))).toBe("old");
        expect(files.has(key("old.txt"))).toBe(false);
        expect(files.has(key("src", "a.md"))).toBe(false);
        expect(temporaryExisted).toBe(true);
        expect(yield* Effect.promise(() => view.exists(temporary.path))).toBe(false);
        expect(exclusive).toMatchObject({code: "EEXIST", operation: "writeText"});
        expect(shallowCopy).toMatchObject({code: "ERR_FS_EISDIR", operation: "copy"});
      }),
    writeHarness.layer,
  );

  it("legacyTaskScheduler is a shared legacy task scheduler", async () => {
    // Act
    const results = await legacyTaskScheduler.parallel([async () => 1, async () => 2]);

    // Assert
    expect(results).toEqual([1, 2]);
  });
});

describe("toLegacyFileSystemError", () => {
  it("preserves the Node error code carried by the cause", () => {
    // Arrange
    const cause = Object.assign(new Error("EPERM: operation not permitted"), {code: "EPERM"});
    const error = PlatformError.systemError({_tag: "PermissionDenied", module: "FileSystem", method: "remove", cause});

    // Act
    const legacy = toLegacyFileSystemError(error, "/x");

    // Assert
    expect(legacy).toBeInstanceOf(FileSystemError);
    expect(legacy).toMatchObject({code: "EPERM", operation: "remove", path: "/x"});
    expect(legacy.message).toBe(`Failed to remove '/x': ${error.message}`);
    expect(legacy.cause).toBe(error);
  });

  it.each([
    ["NotFound", "ENOENT"],
    ["PermissionDenied", "EACCES"],
    ["AlreadyExists", "EEXIST"],
    ["BadResource", "EBADF"],
    ["Busy", "EBUSY"],
    ["InvalidData", "EINVAL"],
    ["TimedOut", "ETIMEDOUT"],
    ["UnexpectedEof", "EOF"],
    ["Unknown", "EUNKNOWN"],
    ["WouldBlock", "EUNKNOWN"],
    ["WriteZero", "EUNKNOWN"],
  ] as const)("maps the %s reason to %s without a Node code", (tag, code) => {
    // Arrange
    const error = PlatformError.systemError({_tag: tag, module: "FileSystem", method: "stat"});

    // Act
    const legacy = toLegacyFileSystemError(error, "/x", "inspect");

    // Assert
    expect(legacy).toMatchObject({code, operation: "inspect"});
  });

  it("maps bad arguments and the byte limit", () => {
    // Arrange
    const badArgument = PlatformError.badArgument({module: "FileSystem", method: "open", description: "bad"});
    const tooLarge = new MaxBytesExceeded({path: "/x", maximumBytes: 1, message: "too large"});

    // Act
    const argument = toLegacyFileSystemError(badArgument, "/x");
    const bound = toLegacyFileSystemError(tooLarge, "/x");

    // Assert
    expect(argument).toMatchObject({code: "EINVAL", operation: "open"});
    expect(bound).toMatchObject({code: FILE_SYSTEM_MAX_BYTES_EXCEEDED_CODE, operation: "readBytes", message: "too large"});
  });
});

describe("createLegacyInspectionRuntime", () => {
  const paths = createRepositoryPaths(repositoryFixtureRoot);
  const request: RepositoryInspectionRequest = {profile: "quick", paths};

  it("legacy inspection adapter resolves facts through the effect session", async () => {
    // Arrange
    const dotnet = {kind: "available", value: {} as RepositoryInspectionFacts["dotnet"], durationMs: 1} as const;
    const adapter = createLegacyInspectionRuntime(() => makeTestLayer({inspection: {dotnet}}).layer);

    try {
      // Act
      const outcome = await adapter.getRepositorySession(request).inspect("dotnet");

      // Assert
      expect(outcome).toEqual(dotnet);
    } finally {
      await adapter.dispose();
    }
  });

  it("memoizes sessions by key and throws the legacy conflict synchronously", async () => {
    // Arrange
    const adapter = createLegacyInspectionRuntime(() => makeTestLayer().layer);

    try {
      // Act
      const first = adapter.getRepositorySession(request);
      const second = adapter.getRepositorySession({profile: "quick", paths: createRepositoryPaths(repositoryFixtureRoot)});

      // Assert
      expect(second).toBe(first);
      expect(adapter.getRepositorySession({...request, requestedEngine: "podman"})).not.toBe(first);
      expect(() =>
        adapter.getRepositorySession({...request, paths: {...paths, websiteEnvironment: `${paths.websiteEnvironment}.other`}}),
      ).toThrow(/conflicts with an already-created session/u);
    } finally {
      await adapter.dispose();
    }
  });

  it("applies invalidate and engine updates before a later inspect", async () => {
    // Arrange
    const adapter = createLegacyInspectionRuntime(
      () =>
        makeTestLayer({
          environment: {platform: "aix" as NodeJS.Platform},
          processes: [
            {
              match: () => true,
              respond: new ProcessExited({command: "probe", stdout: "", stderr: "", durationMs: 1, message: "absent", exitCode: 1}),
            },
          ],
        }).layer,
    );

    try {
      const session = adapter.getRepositorySession(request);
      const first = await session.inspect("infrastructure");

      // Act
      session.updateInfrastructureEngine("podman");
      session.invalidate("infrastructure");
      const second = await session.inspect("infrastructure");
      const third = await session.inspect("infrastructure");

      // Assert
      expect(first.kind === "available" ? first.value.selectedEngine : "unexpected").toBeUndefined();
      expect(second.kind === "available" ? second.value.selectedEngine : undefined).toBe("podman");
      expect(third).toBe(second);
    } finally {
      await adapter.dispose();
    }
  });

  it("rejects inspections with the signal's cancellation once it aborts", async () => {
    // Arrange
    const controller = new AbortController();
    const adapter = createLegacyInspectionRuntime(() => makeTestLayer({inspection: {}}).layer, {signal: controller.signal});

    try {
      const session = adapter.getRepositorySession(request);

      // Act
      controller.abort(new CommandCancellation("Command terminated by SIGTERM.", 143));
      const rejected = session.inspect("dotnet");

      // Assert
      await expect(rejected).rejects.toBeInstanceOf(CommandCancellation);
      await expect(rejected).rejects.toMatchObject({exitCode: 143});
    } finally {
      await adapter.dispose();
    }
  });

  it("rejects an in-flight inspection with the signal's cancellation", async () => {
    // Arrange
    const controller = new AbortController();
    const adapter = createLegacyInspectionRuntime(
      () => makeTestLayer({clock: "live", processes: [{match: () => true, respond: () => Effect.never}]}).layer,
      {signal: controller.signal},
    );

    try {
      const pending = adapter.getRepositorySession(request).inspect("npm.root");
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });

      // Act
      controller.abort(new CommandCancellation("Command interrupted by SIGINT.", 130));

      // Assert
      await expect(pending).rejects.toMatchObject({exitCode: 130});
    } finally {
      await adapter.dispose();
    }
  });

  it("surfaces an inspection defect as a rejection", async () => {
    // Arrange
    const adapter = createLegacyInspectionRuntime(() => makeTestLayer({inspection: {}}).layer);

    try {
      // Act
      const rejected = adapter.getRepositorySession(request).inspect("python");

      // Assert
      await expect(rejected).rejects.toThrow("unscripted inspection: python");
    } finally {
      await adapter.dispose();
    }
  });
});
