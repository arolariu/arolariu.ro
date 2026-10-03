// @vitest-environment node
/**
 * @fileoverview Tests for the Effect test helpers shared by every scripts Effect suite.
 * @module scripts/platform/testing.test
 *
 * @remarks
 * Exercises {@link runScoped} and {@link effectTest} with in-memory effects and layers only: scope
 * finalization, typed-failure propagation, and layer provisioning. No test touches real I/O.
 */

import {Context, Effect, Fiber, FileSystem, Layer, Schema, Stream} from "effect";
import {HttpClient} from "effect/http";
import {TestClock} from "effect/testing";
import {describe, expect, it} from "vitest";

import {Environment} from "./Environment.ts";
import {ReadOnlyFiles, writeTextAtomic, Glob} from "./Files.ts";
import {StdoutIsTTY} from "./Output.ts";
import {Process, ProcessExited, type ProcessOptions} from "./Process.ts";
import {effectTest, makeTestLayer, repositoryFixtureRoot, runScoped} from "./testing.ts";

class Probe extends Context.Service<Probe, {readonly n: number}>()("arolariu/scripts/Probe") {}

describe("runScoped", () => {
  it("resolves with the effect value after running its finalizers", async () => {
    // Arrange
    const events: string[] = [];
    const program = Effect.gen(function* () {
      yield* Effect.addFinalizer(() => Effect.sync(() => events.push("finalized")));
      return 42;
    });

    // Act
    const value = await runScoped(program, Layer.empty);

    // Assert
    expect(value).toBe(42);
    expect(events).toEqual(["finalized"]);
  });

  it("rejects with the original typed error", async () => {
    // Arrange
    class Boom extends Schema.TaggedError<Boom>()("Boom", {message: Schema.String}) {}

    // Act
    const result = runScoped(Effect.fail(new Boom({message: "x"})), Layer.empty);

    // Assert
    await expect(result).rejects.toMatchObject({_tag: "Boom", message: "x"});
  });
});

effectTest(
  "effectTest provides the layer",
  () =>
    Effect.gen(function* () {
      expect((yield* Probe).n).toBe(7);
    }),
  Layer.succeed(Probe, {n: 7}),
);

describe("makeTestLayer", () => {
  it("makeTestLayer serves fixture files", async () => {
    // Arrange
    const harness = makeTestLayer({files: {"a.txt": "x"}});
    const program = Effect.flatMap(FileSystem.FileSystem, (fs) => fs.readFileString("a.txt"));

    // Act
    const contents = await runScoped(program, harness.layer);

    // Assert
    expect(contents).toBe("x");
  });

  it("makeTestLayer records process calls and returns scripted results", async () => {
    // Arrange
    const harness = makeTestLayer({
      processes: [{match: (request) => request.command === "git", respond: {stdout: "main\n", stderr: "", durationMs: 1}}],
    });
    const program = Effect.flatMap(Process, (process) => process.run({command: "git", args: ["branch"]}));

    // Act
    const result = await runScoped(program, harness.layer);

    // Assert
    expect(result.stdout).toBe("main\n");
    expect(harness.processCalls()[0]?.request.args).toEqual(["branch"]);
  });

  it("makeTestLayer dies on unscripted processes", async () => {
    // Arrange
    const harness = makeTestLayer();
    const program = Effect.flatMap(Process, (process) => process.run({command: "npm", args: ["ci"]}));

    // Act
    const result = runScoped(program, harness.layer);

    // Assert
    await expect(result).rejects.toThrow("unscripted process: npm ci");
  });

  it("makeTestLayer captures output", async () => {
    // Arrange
    const harness = makeTestLayer();

    // Act
    await runScoped(Effect.logInfo("hi"), harness.layer);

    // Assert
    expect(harness.output()[0]?.text).toContain("hi");
  });

  it("makeTestLayer uses the test clock", async () => {
    // Arrange
    const harness = makeTestLayer();
    const program = Effect.gen(function* () {
      const fiber = yield* Effect.forkChild(Effect.sleep("1 hour"));
      yield* TestClock.adjust("1 hour");
      yield* Fiber.join(fiber);
      return "slept";
    });

    // Act
    const outcome = await runScoped(program, harness.layer);

    // Assert
    expect(outcome).toBe("slept");
  });

  it("makeTestLayer with clock live uses real time", async () => {
    // Arrange
    const harness = makeTestLayer({clock: "live"});
    const started = Date.now();

    // Act
    await runScoped(Effect.sleep("20 millis"), harness.layer);

    // Assert
    expect(Date.now() - started).toBeGreaterThanOrEqual(15);
  });

  it("makeTestLayer globs absolute fixture paths and exposes written files", async () => {
    // Arrange
    const harness = makeTestLayer({files: {"src/a.ts": "a", "src/nested/b.ts": "b", "README.md": "r"}});
    const root = repositoryFixtureRoot.replaceAll("\\", "/");
    const program = Effect.gen(function* () {
      yield* writeTextAtomic("out/report.txt", "done");
      return yield* Effect.flatMap(Glob, (glob) => glob.match("src/**/*.ts", {onlyFiles: true}));
    });

    // Act
    const matches = await runScoped(program, harness.layer);

    // Assert
    expect(matches).toEqual([`${root}/src/a.ts`, `${root}/src/nested/b.ts`]);
    expect(harness.files().get(`${root}/out/report.txt`)).toBe("done");
    expect([...harness.files().keys()].filter((key) => key.endsWith(".tmp"))).toEqual([]);
  });

  it("makeTestLayer answers scripted requests and dies on unscripted ones", async () => {
    // Arrange
    const harness = makeTestLayer({
      http: [{match: (request) => request.url.endsWith("/health"), respond: {status: 200, body: "ok", headers: {"x-probe": "1"}}}],
    });
    const scripted = Effect.flatMap(HttpClient.HttpClient, (client) =>
      Effect.flatMap(client.get("https://example.test/health"), (response) => response.text),
    );
    const unscripted = Effect.flatMap(HttpClient.HttpClient, (client) => client.post("https://example.test/other"));

    // Act
    const body = await runScoped(scripted, harness.layer);
    const failure = runScoped(unscripted, harness.layer);

    // Assert
    expect(body).toBe("ok");
    await expect(failure).rejects.toThrow("unscripted http: POST https://example.test/other");
  });

  it("makeTestLayer filesystem appends, lists directories, and reports missing paths", async () => {
    // Arrange
    const harness = makeTestLayer({files: {"logs/run.log": "a", "logs/old/x.log": "x"}});
    const program = Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.writeFileString("logs/run.log", "b", {flag: "a"});
      const missing = yield* Effect.flip(fs.readFileString("logs/absent.log"));
      return {
        appended: yield* fs.readFileString("logs/run.log"),
        entries: yield* fs.readDirectory("logs"),
        missing: missing.reason._tag,
        exists: yield* fs.exists("logs/old"),
      };
    });

    // Act
    const observed = await runScoped(program, harness.layer);

    // Assert
    expect(observed).toEqual({appended: "ab", entries: ["old", "run.log"], missing: "NotFound", exists: true});
  });

  it("makeTestLayer provides a deterministic environment with overrides", async () => {
    // Arrange
    const harness = makeTestLayer({environment: {isCI: true}});

    // Act
    const snapshot = await runScoped(Effect.service(Environment), harness.layer);

    // Assert
    expect(snapshot).toMatchObject({platform: process.platform, stdinIsTTY: false, stdoutIsTTY: false, isCI: true, variables: {}});
  });

  it("makeTestLayer forwards environment.stdoutIsTTY to the sink", async () => {
    // Arrange
    const harness = makeTestLayer({environment: {stdoutIsTTY: true}});

    // Act
    const tty = await runScoped(
      Effect.gen(function* () {
        return yield* StdoutIsTTY;
      }),
      harness.layer,
    );

    // Assert
    expect(tty).toBe(true);
  });
});

describe("makeTestLayer process parity with ProcessLive", () => {
  const ok = {stdout: "out\n", stderr: "err\n", durationMs: 1};
  const scriptedGit = {match: () => true, respond: ok};
  const run = (options?: ProcessOptions) => Effect.flatMap(Process, (service) => service.run({command: "git", args: ["status"]}, options));
  const texts = (harness: ReturnType<typeof makeTestLayer>): string[] => harness.output().map((record) => record.text);

  it.each([
    {verbose: true, options: {}, echoed: true},
    {verbose: true, options: {echo: false}, echoed: false},
    {verbose: false, options: {}, echoed: false},
    {verbose: false, options: {echo: true}, echoed: false},
  ])("echoes $ git status when verbose=$verbose and options=$options: $echoed", async ({verbose, options, echoed}) => {
    // Arrange
    const harness = makeTestLayer({verbose, processes: [scriptedGit]});

    // Act
    await runScoped(run(options), harness.layer);

    // Assert
    expect(texts(harness).some((text) => text.includes("$ git status"))).toBe(echoed);
  });

  it("tees scripted stdout and stderr only in tee mode", async () => {
    // Arrange
    const tee = makeTestLayer({processes: [scriptedGit]});
    const capture = makeTestLayer({processes: [scriptedGit]});

    // Act
    await runScoped(run({output: "tee"}), tee.layer);
    await runScoped(run(), capture.layer);

    // Assert
    expect(tee.output()).toEqual([
      {stream: "stdout", text: "out\n"},
      {stream: "stderr", text: "err\n"},
    ]);
    expect(capture.output()).toEqual([]);
  });

  it("tees the streams of a scripted process failure", async () => {
    // Arrange
    const failure = new ProcessExited({
      command: "git status",
      stdout: "partial",
      stderr: "boom",
      durationMs: 1,
      exitCode: 2,
      message: "git status exited with code 2",
    });
    const harness = makeTestLayer({processes: [{match: () => true, respond: failure}]});

    // Act
    const result = runScoped(run({output: "tee"}), harness.layer);

    // Assert
    await expect(result).rejects.toMatchObject({_tag: "ProcessExited", exitCode: 2});
    expect(harness.output()).toEqual([
      {stream: "stdout", text: "partial"},
      {stream: "stderr", text: "boom"},
    ]);
  });

  it.each([
    {request: {command: "  ", args: []}, options: {}, message: "Command cannot be empty"},
    {
      request: {command: "git", args: []},
      options: {output: "inherit", input: "x"} as const,
      message: "Cannot supply input when output is inherited",
    },
  ])("dies on an invalid request: $message", async ({request, options, message}) => {
    // Arrange
    const harness = makeTestLayer({processes: [scriptedGit]});

    // Act
    const result = runScoped(
      Effect.flatMap(Process, (service) => service.run(request, options)),
      harness.layer,
    );

    // Assert
    await expect(result).rejects.toThrow(message);
  });

  it("fails a scripted run that outlives its timeout with ProcessTimedOut", async () => {
    // Arrange
    const harness = makeTestLayer({processes: [{match: () => true, respond: () => Effect.never}]});
    const program = Effect.gen(function* () {
      const fiber = yield* Effect.forkChild(Effect.flip(run({timeout: "5 seconds"})));
      yield* TestClock.adjust("5 seconds");
      return yield* Fiber.join(fiber);
    });

    // Act
    const error = await runScoped(program, harness.layer);

    // Assert
    expect(error).toMatchObject({
      _tag: "ProcessTimedOut",
      command: "git status",
      stdout: "",
      stderr: "",
      durationMs: 5000,
      timeoutMs: 5000,
      message: "git status timed out after 5000 ms",
    });
  });
});

describe("makeTestLayer in-memory filesystem", () => {
  const root = repositoryFixtureRoot.replaceAll("\\", "/");

  it("serves ReadOnlyFiles.readBytesBounded and enforces the bound", async () => {
    // Arrange
    const harness = makeTestLayer({files: {"data.txt": "hello", "data.bin": new Uint8Array([1, 2, 3])}});
    const program = Effect.gen(function* () {
      const files = yield* ReadOnlyFiles;
      return {
        text: new TextDecoder().decode(yield* files.readBytesBounded("data.txt", 5)),
        bytes: [...(yield* files.readBytesBounded("data.bin", 10))],
        exceeded: yield* Effect.flip(files.readBytesBounded("data.txt", 4)),
        missing: yield* Effect.flip(files.readBytesBounded("absent.txt", 4)),
      };
    });

    // Act
    const observed = await runScoped(program, harness.layer);

    // Assert
    expect(observed.text).toBe("hello");
    expect(observed.bytes).toEqual([1, 2, 3]);
    expect(observed.exceeded).toMatchObject({_tag: "MaxBytesExceeded", maximumBytes: 4});
    expect(observed.missing).toMatchObject({_tag: "PlatformError", reason: {_tag: "NotFound"}});
  });

  it("streams an opened file through the derived FileSystem.stream", async () => {
    // Arrange
    const harness = makeTestLayer({files: {"data.txt": "streamed"}});
    const program = Effect.flatMap(FileSystem.FileSystem, (fs) => Stream.runCollect(Stream.decodeText(fs.stream("data.txt"))));

    // Act
    const chunks = await runScoped(program, harness.layer);

    // Assert
    expect([...chunks].join("")).toBe("streamed");
  });

  it("copies files and directories like fs.cp and fs.copyFile", async () => {
    // Arrange
    const harness = makeTestLayer({files: {"src/a.txt": "a", "src/nested/b.txt": "b", "dest/a.txt": "old", "copy.txt": "stale"}});
    const program = Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.copy("src", "dest");
      const kept = yield* fs.readFileString("dest/a.txt");
      yield* fs.copy("src", "dest", {overwrite: true});
      yield* fs.copyFile("src/a.txt", "copy.txt");
      return {
        kept,
        overwritten: yield* fs.readFileString("dest/a.txt"),
        nested: yield* fs.readFileString("dest/nested/b.txt"),
        copied: yield* fs.readFileString("copy.txt"),
        intoSelf: (yield* Effect.flip(fs.copy("src", "src/inner"))).reason._tag,
        missing: (yield* Effect.flip(fs.copyFile("absent.txt", "x.txt"))).reason._tag,
      };
    });

    // Act
    const observed = await runScoped(program, harness.layer);

    // Assert
    expect(observed).toEqual({kept: "old", overwritten: "a", nested: "b", copied: "a", intoSelf: "BadArgument", missing: "NotFound"});
  });

  it("creates temporary directories and removes the scoped ones when the scope closes", async () => {
    // Arrange
    const harness = makeTestLayer();
    const program = Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const scoped = yield* Effect.scoped(
        Effect.gen(function* () {
          const directory = yield* fs.makeTempDirectoryScoped();
          yield* fs.writeFileString(`${directory}/note.txt`, "n");
          return {directory, existed: yield* fs.exists(`${directory}/note.txt`)};
        }),
      );
      const kept = yield* fs.makeTempDirectory({prefix: "keep-"});
      return {...scoped, removed: !(yield* fs.exists(scoped.directory)), kept, keptExists: yield* fs.exists(kept)};
    });

    // Act
    const observed = await runScoped(program, harness.layer);

    // Assert
    expect(observed).toEqual({
      directory: `${root}/.tmp/harness-1`,
      existed: true,
      removed: true,
      kept: `${root}/.tmp/keep-2`,
      keptExists: true,
    });
    expect([...harness.files().keys()].filter((key) => key.includes("harness-1"))).toEqual([]);
  });

  it.each([
    {operation: "chmod", program: (fs: FileSystem.FileSystem) => fs.chmod("a.txt", 0o600)},
    {operation: "watch", program: (fs: FileSystem.FileSystem) => Stream.runDrain(fs.watch("a.txt"))},
    {operation: "sink", program: (fs: FileSystem.FileSystem) => Stream.run(Stream.make(new Uint8Array([1])), fs.sink("a.txt"))},
    {operation: 'open (flag "w")', program: (fs: FileSystem.FileSystem) => fs.open("a.txt", {flag: "w"})},
  ])("dies on the unimplemented FileSystem.$operation", async ({operation, program}) => {
    // Arrange
    const harness = makeTestLayer({files: {"a.txt": "a"}});

    // Act
    const result = runScoped(Effect.flatMap(FileSystem.FileSystem, program), harness.layer);

    // Assert
    await expect(result).rejects.toThrow(`unimplemented harness FileSystem.${operation}`);
  });
});
