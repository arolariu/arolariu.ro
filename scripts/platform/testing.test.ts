// @vitest-environment node
/**
 * @fileoverview Tests for the Effect test helpers shared by every scripts Effect suite.
 * @module scripts/platform/testing.test
 *
 * @remarks
 * Exercises {@link runScoped} and {@link effectTest} with in-memory effects and layers only: scope
 * finalization, typed-failure propagation, and layer provisioning. No test touches real I/O.
 */

import {Context, Effect, Fiber, FileSystem, Layer, Schema} from "effect";
import {HttpClient} from "effect/http";
import {TestClock} from "effect/testing";
import {describe, expect, it} from "vitest";

import {Environment} from "./Environment.ts";
import {writeTextAtomic, Glob} from "./Files.ts";
import {Process} from "./Process.ts";
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
});
