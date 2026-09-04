// @vitest-environment node
/**
 * @fileoverview Focused tests for composed terminal presentation state and output decisions.
 * @module scripts.core.presentation.composed-terminal-presenter.test
 */

import {describe, expect, it, vi} from "vitest";

import {ComposedTerminalPresenter} from "./composed-terminal-presenter.ts";
import type {
  PresentationScheduledInterval,
  PresentationSegment,
  PresentationSemanticLevel,
  PresentationStream,
  TerminalPresenterRuntimeHost,
  TerminalPresenterSink,
} from "./terminal-presenter.ts";
import {RecordingTerminalPresenterSink, buildRecordingPresenter} from "../../testing/fixtures/terminal.fixture.ts";

/** Deterministic {@link TerminalPresenterRuntimeHost} whose progress interval advances explicitly. */
interface TestTerminalPresenterRuntimeHost extends TerminalPresenterRuntimeHost {
  /** Invokes every still-scheduled interval callback the requested number of times. */
  readonly tick: (times?: number) => void;
  /** Number of intervals that are currently scheduled and not yet cancelled. */
  readonly scheduledCount: () => number;
  /** Number of scheduled intervals that were explicitly unreferenced. */
  readonly unreferencedCount: () => number;
  /** Number of times a scheduled interval handle was cancelled. */
  readonly cancelledCount: () => number;
}
function createTestRuntimeHost(options: Readonly<{stdoutIsTTY?: boolean; noColor?: boolean}> = {}): TestTerminalPresenterRuntimeHost {
  const callbacks = new Set<() => void>();
  let unreferencedCount = 0;
  let cancelledCount = 0;

  return {
    stdoutIsTTY: options.stdoutIsTTY ?? false,
    noColor: options.noColor ?? false,
    scheduleInterval: (callback: () => void): PresentationScheduledInterval => {
      callbacks.add(callback);
      return {
        cancel: (): void => {
          if (callbacks.delete(callback)) {
            cancelledCount += 1;
          }
        },
        unref: (): void => {
          unreferencedCount += 1;
        },
      };
    },
    tick: (times = 1): void => {
      for (let iteration = 0; iteration < times; iteration += 1) {
        for (const callback of [...callbacks]) {
          callback();
        }
      }
    },
    scheduledCount: (): number => callbacks.size,
    unreferencedCount: (): number => unreferencedCount,
    cancelledCount: (): number => cancelledCount,
  };
}

/** Sink that keeps composed segments intact so a test can assert the presenter's colour decision. */
class SegmentRecordingSink implements TerminalPresenterSink {
  public readonly segments: Array<readonly PresentationSegment[]> = [];

  public line(_stream: PresentationStream, segments: readonly PresentationSegment[]): void {
    this.segments.push(segments);
  }
  public write(_stream: PresentationStream, segments: readonly PresentationSegment[]): void {
    this.segments.push(segments);
  }
}

type SemanticCase = Readonly<{
  level: PresentationSemanticLevel | "fatal";
  emit: (presenter: ComposedTerminalPresenter, message: string) => void;
  icon: string;
  stream: PresentationStream;
  sinkLevel: PresentationSemanticLevel;
}>;

const semanticCases: readonly SemanticCase[] = [
  {level: "debug", emit: (presenter, message) => presenter.debug(message), icon: "🐛", stream: "stdout", sinkLevel: "debug"},
  {level: "info", emit: (presenter, message) => presenter.info(message), icon: "ℹ️", stream: "stdout", sinkLevel: "info"},
  {level: "warn", emit: (presenter, message) => presenter.warn(message), icon: "⚠️", stream: "stderr", sinkLevel: "warn"},
  {level: "error", emit: (presenter, message) => presenter.error(message), icon: "⛔", stream: "stderr", sinkLevel: "error"},
  {level: "success", emit: (presenter, message) => presenter.success(message), icon: "✅", stream: "stdout", sinkLevel: "success"},
  {level: "fatal", emit: (presenter, message) => presenter.fatal(message), icon: "⛔", stream: "stderr", sinkLevel: "error"},
];

function buildPresenter(
  context: string,
  options: Readonly<{
    mode?: "human" | "json" | "silent";
    verbose?: boolean;
    redactions?: readonly string[];
    runtimeHost?: TerminalPresenterRuntimeHost;
  }> = {},
): Readonly<{presenter: ComposedTerminalPresenter; sink: RecordingTerminalPresenterSink}> {
  const sink = new RecordingTerminalPresenterSink();
  return {presenter: new ComposedTerminalPresenter(context, {color: false, sink, ...options}), sink};
}

describe("ComposedTerminalPresenter semantic output", () => {
  it.each(semanticCases)("prefixes and routes the $level level", ({emit, icon, stream, sinkLevel}) => {
    const {presenter, sink} = buildPresenter("generate::artifacts");

    emit(presenter, "the message");

    expect(sink.records).toEqual([{stream, text: `[arolariu::generate::artifacts] ${icon} the message`, write: false, level: sinkLevel}]);
  });

  it.each([
    {name: "omitted", options: {}, expected: ["[arolariu::setup] 🐛 hidden", "[arolariu::setup] ℹ️ visible"]},
    {name: "true", options: {verbose: true}, expected: ["[arolariu::setup] 🐛 hidden", "[arolariu::setup] ℹ️ visible"]},
    {name: "false", options: {verbose: false}, expected: ["[arolariu::setup] ℹ️ visible"]},
  ])("emits diagnostics when verbosity is $name", ({options, expected}) => {
    const {presenter, sink} = buildPresenter("setup", options);

    presenter.debug("hidden");
    presenter.info("visible");

    expect(sink.records.map((record) => record.text)).toEqual(expected);
  });
});

describe("ComposedTerminalPresenter mode matrix", () => {
  it.each((["human", "json", "silent"] as const).flatMap((mode) => semanticCases.map((semanticCase) => ({mode, ...semanticCase}))))(
    "emits the $level level correctly in $mode mode",
    ({mode, level, emit, icon, stream, sinkLevel}) => {
      const {presenter, sink} = buildPresenter("status", {mode});

      emit(presenter, "the message");

      if (mode === "human") {
        expect(sink.records).toEqual([{stream, text: `[arolariu::status] ${icon} the message`, write: false, level: sinkLevel}]);
        return;
      }

      if (mode === "json" && level === "fatal") {
        expect(sink.records).toEqual([{stream: "stderr", text: "the message", write: false, level: "error"}]);
        return;
      }

      expect(sink.records).toEqual([]);
    },
  );

  it("suppresses every presentation method in silent mode", () => {
    const {presenter, sink} = buildPresenter("nested", {mode: "silent"});

    presenter.line("hidden");
    presenter.write("hidden");
    presenter.section("hidden");
    presenter.banner(["hidden"]);
    presenter.table({headers: ["hidden"], rows: [["hidden"]]});
    presenter.command("hidden");
    presenter.json({hidden: true});
    presenter.progress("hidden").succeed("hidden");
    const writer = presenter.createStreamWriter();
    writer.write("hidden");
    writer.end();

    expect(sink.records).toEqual([]);
  });

  it("writes exactly one plain redacted fatal line before the JSON document", () => {
    const {presenter, sink} = buildPresenter("status", {mode: "json", redactions: ["secret"]});

    presenter.fatal("failed with secret");
    presenter.json({schemaVersion: 1});

    expect(sink.records).toEqual([
      {stream: "stderr", text: "failed with [REDACTED]", write: false, level: "error"},
      {stream: "stdout", text: '{\n  "schemaVersion": 1\n}', write: false},
    ]);
  });

  it("renders a human-mode fatal diagnostic in the normal error form", () => {
    const {presenter, sink} = buildPresenter("status", {redactions: ["secret"]});

    presenter.fatal("failed with secret");

    expect(sink.records).toEqual([{stream: "stderr", text: "[arolariu::status] ⛔ failed with [REDACTED]", write: false, level: "error"}]);
  });

  it("suppresses human presentation output in JSON mode", () => {
    const {presenter, sink} = buildPresenter("doctor", {mode: "json"});

    presenter.line([{text: "hidden rich message", styles: ["red"]}]);
    presenter.command("hidden");
    presenter.section("hidden");

    expect(sink.records).toEqual([]);
  });
});

describe("ComposedTerminalPresenter JSON documents", () => {
  it("writes exactly one document across a parent and its child", () => {
    const {presenter, sink} = buildPresenter("doctor", {mode: "json"});
    const child = presenter.child("infrastructure");

    presenter.json({schemaVersion: 1, score: 100});
    child.json({schemaVersion: 2});
    presenter.json({schemaVersion: 3});

    expect(sink.records).toEqual([{stream: "stdout", text: '{\n  "schemaVersion": 1,\n  "score": 100\n}', write: false}]);
  });

  it("ignores json() outside JSON mode and redacts JSON-escaped secrets inside it", () => {
    const secret = 'quote"slash\\line\nend';
    const human = buildPresenter("status");
    const json = buildPresenter("doctor", {mode: "json", redactions: [secret]});

    human.presenter.json({schemaVersion: 1});
    json.presenter.json({token: secret});

    expect(human.sink.records).toEqual([]);
    expect(json.sink.records).toEqual([{stream: "stdout", text: '{\n  "token": "[REDACTED]"\n}', write: false}]);
  });
});

describe("ComposedTerminalPresenter redaction", () => {
  it("redacts registered and runtime values from semantic and command output", () => {
    const {presenter, sink} = buildPresenter("setup", {redactions: ["secret", "secret-value", ""]});

    presenter.error("Failed with secret-value");
    presenter.command("tool --token secret-value");
    presenter.redact("runtime-secret");
    presenter.info("Received runtime-secret");

    expect(sink.records.map((record) => record.text)).toEqual([
      "[arolariu::setup] ⛔ Failed with [REDACTED]",
      "$ tool --token [REDACTED]",
      "[arolariu::setup] ℹ️ Received [REDACTED]",
    ]);
  });

  it("keeps a secret intact across stream-writer chunk boundaries", () => {
    const {presenter, sink} = buildPresenter("setup");

    presenter.redact("super-secret");
    const writer = presenter.createStreamWriter("stdout");
    writer.write("sup");
    writer.write("er-sec");
    writer.write("ret tail");
    writer.end();

    const emitted = sink.records.map((record) => record.text).join("");
    expect(emitted).toBe("[REDACTED] tail");
    expect(sink.records.every((record) => record.write)).toBe(true);
  });

  it("joins colorless segments before sanitizing so one replacement spans the boundary", () => {
    const {presenter, sink} = buildPresenter("setup", {redactions: ["super-secret"]});

    presenter.line([{text: "super-"}, {text: "secret"}]);

    expect(sink.records.map((record) => record.text)).toEqual(["[REDACTED]"]);
  });

  it("sanitizes on demand without emitting output", () => {
    const secret = 'quote"slash\\line\nend';
    const {presenter, sink} = buildPresenter("doctor", {redactions: ["secret-value", secret]});
    const escaped = JSON.stringify(secret).slice(1, -1);

    expect(presenter.sanitize("token=secret-value")).toBe("token=[REDACTED]");
    expect(presenter.sanitize(escaped)).toBe(escaped);
    expect(presenter.sanitize(escaped, true)).toBe("[REDACTED]");
    expect(sink.records).toEqual([]);
  });
});

describe("ComposedTerminalPresenter child and fork state", () => {
  it("shares context, redactions, verbosity, and the sink with a child", () => {
    const {presenter, sink} = buildPresenter("doctor", {verbose: false});
    const child = presenter.child("infrastructure");

    child.child("containers").info("child");
    child.debug("hidden by the parent's verbosity");
    presenter.info("parent");
    presenter.redact("generated-password");
    child.error("generated-password");
    child.redact("child-secret");
    presenter.info("child-secret");

    expect(sink.records.map((record) => record.text)).toEqual([
      "[arolariu::doctor::infrastructure::containers] ℹ️ child",
      "[arolariu::doctor] ℹ️ parent",
      "[arolariu::doctor::infrastructure] ⛔ [REDACTED]",
      "[arolariu::doctor] ℹ️ [REDACTED]",
    ]);
  });

  it("gives a fork its own mode, verbosity, context, and document slot while sharing redactions", () => {
    const {presenter, sink} = buildPresenter("status", {mode: "json", verbose: false});
    const silentFork = presenter.fork("silent-doctor", {mode: "silent", verbose: true});
    const jsonFork = presenter.fork("json-doctor", {mode: "json", verbose: false});
    const humanFork = presenter.fork("doctor", {mode: "human", verbose: true});

    presenter.redact("parent-secret");
    humanFork.redact("fork-secret");
    silentFork.info("hidden");
    jsonFork.json({fork: 1});
    jsonFork.json({fork: 2});
    presenter.json({parent: 1});
    humanFork.debug("parent-secret and fork-secret");
    humanFork.child("dotnet").info("fork child");

    expect(sink.records.map((record) => record.text)).toEqual([
      '{\n  "fork": 1\n}',
      '{\n  "parent": 1\n}',
      "[arolariu::doctor] 🐛 [REDACTED] and [REDACTED]",
      "[arolariu::doctor::dotnet] ℹ️ fork child",
    ]);
  });

  it("gives a fork independent progress state", () => {
    const runtimeHost = createTestRuntimeHost({stdoutIsTTY: true});
    const {presenter, sink} = buildPresenter("status", {runtimeHost});
    const fork = presenter.fork("doctor", {mode: "human", verbose: true});

    const parentProgress = presenter.progress("parent work");
    fork.progress("fork work").stop();
    parentProgress.succeed("parent done");

    expect(sink.records.filter((record) => !record.write).map((record) => record.text)).toEqual(["✔ parent done"]);
  });

  it("lets a human fork of a JSON parent regain styled output", () => {
    const sink = new SegmentRecordingSink();
    const presenter = new ComposedTerminalPresenter("status", {
      mode: "json",
      color: true,
      sink,
      runtimeHost: createTestRuntimeHost({stdoutIsTTY: true, noColor: false}),
    });

    presenter.fork("doctor", {mode: "human", verbose: true}).info("styled again");

    expect(sink.segments).toEqual([[{text: "[arolariu::doctor] ℹ️ styled again", styles: ["cyan"]}]]);
  });
});

describe("ComposedTerminalPresenter progress", () => {
  it("stays deterministic, colorless, and timer-free without an injected runtime host", () => {
    vi.useFakeTimers();
    const sink = new RecordingTerminalPresenterSink();

    try {
      const presenter = new ComposedTerminalPresenter("setup", {sink});
      const progress = presenter.progress("Installing");
      vi.advanceTimersByTime(160);
      progress.update("Configuring");
      progress.succeed("Configured");
      presenter.line([{text: "styled", styles: ["red"]}]);

      expect(sink.records.filter((record) => record.write)).toEqual([]);
      expect(vi.getTimerCount()).toBe(0);
      expect(sink.records).toEqual([
        {stream: "stdout", text: "✔ Configured", write: false},
        {stream: "stdout", text: "styled", write: false},
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps non-interactive progress line-oriented and free of carriage returns", () => {
    const {presenter, sink} = buildPresenter("setup", {runtimeHost: createTestRuntimeHost({stdoutIsTTY: false})});

    const progress = presenter.progress("Installing");
    progress.update("Configuring");
    progress.fail("Configuration failed");

    expect(sink.records).toEqual([{stream: "stderr", text: "✖ Configuration failed", write: false}]);
  });

  it("advances frames only when the recorded interval callback runs", () => {
    const runtimeHost = createTestRuntimeHost({stdoutIsTTY: true});
    const {presenter, sink} = buildPresenter("setup", {runtimeHost});

    const progress = presenter.progress("Installing");
    const framesBeforeTick = sink.records.length;
    runtimeHost.tick(2);
    const framesAfterTick = sink.records.length;
    progress.stop();

    expect(framesBeforeTick).toBe(1);
    expect(framesAfterTick).toBe(3);
    expect(runtimeHost.unreferencedCount()).toBeGreaterThan(0);
    expect(runtimeHost.cancelledCount()).toBe(1);
    expect(runtimeHost.scheduledCount()).toBe(0);
  });

  it("pauses and clears active progress before interleaved semantic output", () => {
    const runtimeHost = createTestRuntimeHost({stdoutIsTTY: true});
    const {presenter, sink} = buildPresenter("setup", {runtimeHost});

    const progress = presenter.progress("Installing");
    presenter.warn("Using fallback");
    progress.update("Configuring");
    progress.succeed("Configured");
    progress.succeed("Duplicate success");
    progress.fail("Late failure");
    const recordCountAfterSuccess = sink.records.length;
    runtimeHost.tick(2);

    expect(sink.records.some((record) => record.write && record.text === "\r\u001B[K")).toBe(true);
    expect(sink.records.filter((record) => record.text.includes("Using fallback"))).toEqual([
      {stream: "stderr", text: "[arolariu::setup] ⚠️ Using fallback", write: false, level: "warn"},
    ]);
    expect(sink.records.some((record) => record.write && record.text.includes("Configuring"))).toBe(true);
    expect(sink.records.filter((record) => record.text === "✔ Configured")).toEqual([
      {stream: "stdout", text: "✔ Configured", write: false},
    ]);
    expect(sink.records.every((record) => !record.text.includes("Duplicate success") && !record.text.includes("Late failure"))).toBe(true);
    expect(sink.records).toHaveLength(recordCountAfterSuccess);
  });

  it.each([true, false])("emits one terminal progress outcome when interactive is %s", (stdoutIsTTY) => {
    const runtimeHost = createTestRuntimeHost({stdoutIsTTY});
    const {presenter, sink} = buildPresenter("setup", {runtimeHost});

    const progress = presenter.progress("Installing");
    presenter.info("Downloaded package");
    progress.fail("Installation failed");
    progress.fail("Duplicate failure");
    progress.succeed("Late success");

    expect(sink.records.filter((record) => record.text === "✖ Installation failed")).toEqual([
      {stream: "stderr", text: "✖ Installation failed", write: false},
    ]);
    expect(sink.records.every((record) => !record.text.includes("Duplicate failure") && !record.text.includes("Late success"))).toBe(true);
  });

  it.each([true, false])("stops progress without a final line when interactive is %s", (stdoutIsTTY) => {
    const runtimeHost = createTestRuntimeHost({stdoutIsTTY});
    const {presenter, sink} = buildPresenter("setup", {runtimeHost});

    const progress = presenter.progress("Installing");
    presenter.info("Downloaded package");
    progress.stop();
    progress.update("Ignored update");
    progress.succeed("Late success");
    progress.fail("Late failure");
    const recordCountAfterStop = sink.records.length;
    runtimeHost.tick(2);

    expect(
      sink.records.some(
        (record) => record.text.includes("Ignored update") || record.text.includes("Late success") || record.text.includes("Late failure"),
      ),
    ).toBe(false);
    expect(sink.records).toHaveLength(recordCountAfterStop);
  });
});

describe("ComposedTerminalPresenter layout", () => {
  it("aligns table columns using the widest header or row value", () => {
    const {presenter, sink} = buildPresenter("doctor");

    presenter.table({
      headers: ["Name", "Count"],
      rows: [
        ["alpha", "2"],
        ["beta", "10"],
      ],
      align: ["left", "right"],
    });

    expect(sink.records.map((record) => record.text)).toEqual(["Name   Count", "-----  -----", "alpha      2", "beta      10"]);
  });

  it("renders sections, banners, blank lines, and commands in their current form", () => {
    const {presenter, sink} = buildPresenter("test::e2e");

    presenter.section("Running all E2E tests", "🎯");
    presenter.banner(["top", "bottom"], "magenta");
    presenter.line();
    presenter.command("npm run test:e2e");

    expect(sink.records.map((record) => record.text)).toEqual([
      "",
      "🎯 Running all E2E tests",
      "",
      "top",
      "bottom",
      "",
      "$ npm run test:e2e",
    ]);
  });

  it("routes line and raw-write records to their requested streams", () => {
    const {presenter, sink} = buildPresenter("format");

    presenter.line("stdout line");
    presenter.line("stderr line", "stderr");
    presenter.write("stdout chunk");
    presenter.write("stderr chunk", "stderr");

    expect(sink.records).toEqual([
      {stream: "stdout", text: "stdout line", write: false},
      {stream: "stderr", text: "stderr line", write: false},
      {stream: "stdout", text: "stdout chunk", write: true},
      {stream: "stderr", text: "stderr chunk", write: true},
    ]);
  });
});

describe("ComposedTerminalPresenter colour policy", () => {
  it("attaches the semantic style to the whole prefixed line when colour is allowed", () => {
    const sink = new SegmentRecordingSink();
    const presenter = new ComposedTerminalPresenter("ctx", {
      color: true,
      sink,
      runtimeHost: createTestRuntimeHost({stdoutIsTTY: true, noColor: false}),
    });

    presenter.error("failed");
    presenter.line([
      {text: "Status: ", styles: ["dim"]},
      {text: "ready", styles: ["bold", "green"]},
    ]);

    expect(sink.segments).toEqual([
      [{text: "[arolariu::ctx] ⛔ failed", styles: ["red"]}],
      [
        {text: "Status: ", styles: ["dim"]},
        {text: "ready", styles: ["bold", "green"]},
      ],
    ]);
  });

  it.each([
    {name: "NO_COLOR", mode: "human", stdoutIsTTY: true, noColor: true},
    {name: "no terminal", mode: "human", stdoutIsTTY: false, noColor: false},
    {name: "JSON mode", mode: "json", stdoutIsTTY: true, noColor: false},
  ] as const)("emits unstyled segments when colour is denied by $name", ({mode, stdoutIsTTY, noColor}) => {
    const sink = new SegmentRecordingSink();
    const presenter = new ComposedTerminalPresenter("ctx", {
      mode,
      color: true,
      sink,
      runtimeHost: createTestRuntimeHost({stdoutIsTTY, noColor}),
    });

    presenter.error("failed");
    presenter.line([{text: "plain", styles: ["bold", "green"]}]);
    presenter.json({schemaVersion: 1});

    expect(sink.segments).toEqual(
      mode === "json"
        ? [[{text: '{\n  "schemaVersion": 1\n}'}]]
        : [[{text: "[arolariu::ctx] ⛔ failed"}], [{text: "plain"}]],
    );
  });

  it("coalesces adjacent unstyled segments before redacting a secret that spans their boundary", () => {
    const sink = new SegmentRecordingSink();
    const presenter = new ComposedTerminalPresenter("ctx", {
      color: true,
      redactions: ["super-secret"],
      sink,
      runtimeHost: createTestRuntimeHost({stdoutIsTTY: true, noColor: false}),
    });
    presenter.line([{text: "token super-"}, {text: "secret"}, {text: " end", styles: ["dim"]}]);
    expect(sink.segments).toEqual([[{text: "token [REDACTED]"}, {text: " end", styles: ["dim"]}]]);
  });
});

describe("buildRecordingPresenter", () => {
  it("builds a colorless, non-verbose human presenter bound to its own sink", () => {
    const {presenter, sink} = buildRecordingPresenter({context: "fixture"});

    presenter.debug("hidden");
    presenter.info("visible");

    expect(sink.records).toEqual([{stream: "stdout", text: "[arolariu::fixture] ℹ️ visible", write: false, level: "info"}]);
  });
});
