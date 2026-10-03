// @vitest-environment node
/**
 * @fileoverview Tests for the Effect output platform: settings, sinks, presenter, and logger.
 * @module scripts/platform/Output.test
 *
 * @remarks
 * Every case renders into {@link memorySink} so output is asserted record by record and nothing
 * reaches the real process streams. The live sink is exercised with the process stream writers
 * replaced, because the terminal is the true external boundary.
 */

import {Cause, Effect, Layer, type Scope} from "effect";
import {describe, expect, it, vi} from "vitest";

import type {EnvironmentSnapshot} from "./Environment.ts";
import {
  memorySink,
  outputLayer,
  Presenter,
  resolveColor,
  Sink,
  SinkLive,
  toJsonValue,
  withLogContext,
  type OutputMode,
  type OutputSettingsShape,
  type SinkRecord,
} from "./Output.ts";
import {runScoped} from "./testing.ts";

const snapshot: EnvironmentSnapshot = {
  variables: {},
  cwd: "/repo",
  executablePath: "/usr/bin/node",
  platform: "linux",
  architecture: "x64",
  stdinIsTTY: false,
  stdoutIsTTY: false,
  isCI: false,
};

interface RenderOptions {
  readonly mode?: OutputMode;
  readonly verbose?: boolean;
  readonly color?: boolean;
  readonly stdoutIsTTY?: boolean;
}

/**
 * Runs a program against a fresh memory sink and returns every record it wrote.
 *
 * @param program - The program under test.
 * @param options - Output settings overrides; defaults to human, non-verbose, colorless output.
 * @returns The recorded sink output.
 */
async function render<E>(
  program: Effect.Effect<void, E, Presenter | Scope.Scope>,
  options: RenderOptions = {},
): Promise<readonly SinkRecord[]> {
  const sink = memorySink({stdoutIsTTY: options.stdoutIsTTY ?? false});
  const settings: OutputSettingsShape = {
    mode: options.mode ?? "human",
    verbose: options.verbose ?? false,
    color: options.color ?? false,
    context: "test",
  };
  await runScoped(program, outputLayer(settings).pipe(Layer.provide(sink.layer)));
  return sink.records();
}

describe("Output logger", () => {
  it("renders info with the legacy prefix", async () => {
    // Arrange
    const program = Effect.logInfo("hello");

    // Act
    const records = await render(program);

    // Assert
    expect(records).toEqual([{stream: "stdout", text: "[arolariu::test] ℹ️ hello\n"}]);
  });

  it("uses the context annotation", async () => {
    // Arrange
    const program = Effect.logInfo("x").pipe(withLogContext("doctor"));

    // Act
    const records = await render(program);

    // Assert
    expect(records).toHaveLength(1);
    expect(records[0]?.text.startsWith("[arolariu::doctor] ")).toBe(true);
  });

  it("routes warnings and errors to stderr", async () => {
    // Arrange
    const program = Effect.logWarning("w").pipe(Effect.andThen(Effect.logError("e")));

    // Act
    const records = await render(program);

    // Assert
    expect(records).toEqual([
      {stream: "stderr", text: "[arolariu::test] ⚠️ w\n"},
      {stream: "stderr", text: "[arolariu::test] ⛔ e\n"},
    ]);
  });

  it("hides debug unless verbose", async () => {
    // Arrange
    const program = Effect.logDebug("d");

    // Act
    const quiet = await render(program, {verbose: false});
    const verbose = await render(program, {verbose: true});

    // Assert
    expect(quiet).toEqual([]);
    expect(verbose).toEqual([{stream: "stdout", text: "[arolariu::test] 🐛 d\n"}]);
  });

  it("renders fatal logs, non-string messages, and causes", async () => {
    // Arrange
    const program = Effect.logFatal("boom", {code: 7}, Cause.fail("reason"));

    // Act
    const records = await render(program);

    // Assert
    expect(records).toHaveLength(1);
    expect(records[0]?.stream).toBe("stderr");
    expect(records[0]?.text.startsWith('[arolariu::test] ⛔ boom {"code":7}\n')).toBe(true);
    expect(records[0]?.text).toContain("reason");
  });

  it("colors the whole line when color is enabled", async () => {
    // Arrange
    const program = Effect.logInfo("tinted");

    // Act
    const records = await render(program, {color: true});

    // Assert
    expect(records[0]?.text).toBe("\u001B[36m[arolariu::test] ℹ️ tinted\u001B[39m\n");
  });
});

describe("Output presenter", () => {
  it("renders success", async () => {
    // Arrange
    const program = Effect.flatMap(Effect.service(Presenter), (presenter) => presenter.success("done"));

    // Act
    const records = await render(program);

    // Assert
    expect(records).toEqual([{stream: "stdout", text: "[arolariu::test] ✅ done\n"}]);
  });

  it("suppresses human output in json mode", async () => {
    // Arrange
    const program = Effect.gen(function* () {
      const presenter = yield* Presenter;
      yield* Effect.logInfo("info");
      yield* presenter.success("done");
      yield* presenter.section("Section");
    });

    // Act
    const records = await render(program, {mode: "json"});

    // Assert
    expect(records).toEqual([]);
  });

  it("writes one pretty JSON document", async () => {
    // Arrange
    const program = Effect.flatMap(Effect.service(Presenter), (presenter) => presenter.json({a: 1}));

    // Act
    const records = await render(program, {mode: "json"});

    // Assert
    expect(records).toEqual([{stream: "stdout", text: '{\n  "a": 1\n}\n'}]);
  });

  it("rejects a second JSON document", async () => {
    // Arrange
    const sink = memorySink();
    const layer = outputLayer({mode: "json", verbose: false, color: false, context: "test"}).pipe(Layer.provide(sink.layer));
    const program = Effect.gen(function* () {
      const presenter = yield* Presenter;
      yield* presenter.json({a: 1});
      return yield* Effect.flip(presenter.json({b: 2}));
    });

    // Act
    const error = await runScoped(program, layer);

    // Assert
    expect(error._tag).toBe("JsonDocumentAlreadyWritten");
    expect(sink.records()).toHaveLength(1);
  });

  it("writes nothing in silent mode", async () => {
    // Arrange
    const program = Effect.gen(function* () {
      const presenter = yield* Presenter;
      yield* Effect.logInfo("info");
      yield* presenter.success("s");
      yield* presenter.fatal("f");
      yield* presenter.line("stdout", "l");
      yield* presenter.write("stderr", "w");
      yield* presenter.section("t", "📦");
      yield* presenter.banner("b", ["x"]);
      yield* presenter.table({rows: [["a"]]});
      yield* presenter.json({a: 1});
      const progress = yield* presenter.progress("p", 1);
      yield* progress.advance();
    });

    // Act
    const records = await render(program, {mode: "silent"});

    // Assert
    expect(records).toEqual([]);
  });

  it("renders fatal plainly to stderr in json mode and prefixed in human mode", async () => {
    // Arrange
    const program = Effect.flatMap(Effect.service(Presenter), (presenter) => presenter.fatal("broken"));

    // Act
    const json = await render(program, {mode: "json"});
    const human = await render(program.pipe(withLogContext("doctor")));

    // Assert
    expect(json).toEqual([{stream: "stderr", text: "broken\n"}]);
    expect(human).toEqual([{stream: "stderr", text: "[arolariu::doctor] ⛔ broken\n"}]);
  });

  it("renders lines, raw writes, sections, and banners like the legacy logger", async () => {
    // Arrange
    const program = Effect.gen(function* () {
      const presenter = yield* Presenter;
      yield* presenter.line("stderr", "line");
      yield* presenter.write("stdout", "raw");
      yield* presenter.section("Title", "📦");
      yield* presenter.section("Plain");
      yield* presenter.banner("Banner", ["first"]);
      yield* presenter.banner("Only");
    });

    // Act
    const records = await render(program);

    // Assert
    expect(records.map((record) => record.text)).toEqual([
      "line\n",
      "raw",
      "\n",
      "📦 Title\n",
      "\n",
      "\n",
      "Plain\n",
      "\n",
      "Banner\n",
      "first\n",
      "Only\n",
    ]);
    expect(records[0]?.stream).toBe("stderr");
  });

  it("renders aligned tables like the legacy logger", async () => {
    // Arrange
    const program = Effect.gen(function* () {
      const presenter = yield* Presenter;
      yield* presenter.table({
        headers: ["Name", "Count"],
        rows: [
          ["alpha", "1"],
          ["b", "22"],
        ],
        align: ["left", "right"],
      });
      yield* presenter.table({rows: [["x", "yy"], ["zzz"]]});
      yield* presenter.table({rows: []});
    });

    // Act
    const records = await render(program);

    // Assert
    expect(records.map((record) => record.text)).toEqual([
      "Name   Count\n",
      "-----  -----\n",
      "alpha      1\n",
      "b         22\n",
      "x    yy\n",
      "zzz  \n",
    ]);
  });

  it("styles section titles when color is enabled", async () => {
    // Arrange
    const program = Effect.flatMap(Effect.service(Presenter), (presenter) => presenter.section("Title"));

    // Act
    const records = await render(program, {color: true});

    // Assert
    expect(records[1]?.text).toBe("\u001B[1m\u001B[36mTitle\u001B[39m\u001B[22m\n");
  });
});

describe("Output progress", () => {
  it("ends non-TTY progress with a final line", async () => {
    // Arrange
    const program = Effect.gen(function* () {
      const presenter = yield* Presenter;
      yield* Effect.scoped(
        Effect.gen(function* () {
          const progress = yield* presenter.progress("p", 2);
          yield* progress.advance();
          yield* progress.advance();
        }),
      );
    });

    // Act
    const records = await render(program);

    // Assert
    expect(records[0]?.text).toContain("p");
    expect(records.at(-1)).toEqual({stream: "stdout", text: "✔ p (2/2)\n"});
    expect(records).toHaveLength(2);
  });

  it("ends failed non-TTY progress with a failure line on stderr", async () => {
    // Arrange
    const program = Effect.gen(function* () {
      const presenter = yield* Presenter;
      yield* Effect.scoped(
        Effect.gen(function* () {
          const progress = yield* presenter.progress("p");
          yield* progress.advance(1, "q");
          return yield* Effect.fail("stop");
        }),
      ).pipe(Effect.ignore);
    });

    // Act
    const records = await render(program);

    // Assert
    expect(records).toEqual([
      {stream: "stdout", text: "p\n"},
      {stream: "stderr", text: "✖ q\n"},
    ]);
  });

  it("redraws one TTY line, clears it before other output, and clears it on close", async () => {
    // Arrange
    const program = Effect.gen(function* () {
      const presenter = yield* Presenter;
      yield* Effect.scoped(
        Effect.gen(function* () {
          const progress = yield* presenter.progress("p", 2);
          yield* progress.advance();
          yield* Effect.logInfo("between");
          yield* progress.advance(1, "q");
        }),
      );
    });

    // Act
    const records = await render(program, {stdoutIsTTY: true});

    // Assert
    expect(records.map((record) => record.text)).toEqual([
      "\r⠋ p (0/2)",
      "\r⠙ p (1/2)",
      "\r\u001B[K",
      "[arolariu::test] ℹ️ between\n",
      "\r⠹ q (2/2)",
      "\r\u001B[K",
    ]);
  });

  it("stops redrawing a TTY progress replaced by a newer one", async () => {
    // Arrange
    const program = Effect.gen(function* () {
      const presenter = yield* Presenter;
      yield* Effect.scoped(
        Effect.gen(function* () {
          const first = yield* presenter.progress("a");
          yield* presenter.progress("b");
          yield* first.advance();
        }),
      );
    });

    // Act
    const records = await render(program, {stdoutIsTTY: true});

    // Assert
    expect(records.map((record) => record.text)).toEqual(["\r⠋ a", "\r\u001B[K", "\r⠋ b", "\r\u001B[K"]);
  });
});

describe("Output color and sinks", () => {
  it("disables color when NO_COLOR is set even on a TTY", () => {
    // Arrange
    const environment: EnvironmentSnapshot = {...snapshot, stdoutIsTTY: true, variables: {NO_COLOR: ""}};

    // Act
    const color = resolveColor(environment);

    // Assert
    expect(color).toBe(false);
  });

  it("enables color on a TTY without NO_COLOR", () => {
    // Arrange
    const environment: EnvironmentSnapshot = {...snapshot, stdoutIsTTY: true, variables: {}};

    // Act
    const color = resolveColor(environment);

    // Assert
    expect(color).toBe(true);
  });

  it("SinkLive writes text unchanged to the matching process stream", async () => {
    // Arrange
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    const program = Effect.gen(function* () {
      const sink = yield* Sink;
      yield* sink.write({stream: "stdout", text: "out"});
      yield* sink.write({stream: "stderr", text: "err"});
    });

    // Act
    await runScoped(program, SinkLive);

    // Assert
    expect(stdout).toHaveBeenCalledWith("out");
    expect(stderr).toHaveBeenCalledWith("err");
  });

  it("re-exports the moved JSON conversion", () => {
    // Arrange
    const value = {a: [1, "b", null, true]};

    // Act
    const converted = toJsonValue(value);

    // Assert
    expect(converted).toEqual(value);
  });
});
