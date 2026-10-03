// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli root command, its runner, and unreported-failure rendering.
 * @module scripts/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation of a test root built with `makeRootCommand` on the
 * in-memory harness and maps the exit through `exitCodeFor`, exactly like the entry block. effect/cli
 * help and error text is routed into the harness sink, so the test output stays clean.
 */

import {Cause, Console, Context, Effect, Stdio, Stream} from "effect";
import {Command} from "effect/cli";
import {describe, expect, it} from "vitest";

import packageJson from "../package.json" with {type: "json"};
import {makeRootCommand, renderUnreportedFailure, rootCommand, runCli, type RootCommand} from "./cli.ts";
import {withCommandOutput} from "./commands/flags.ts";
import {exitCodeFor, ReportedFailure, type CommandExitCode} from "./platform/exit.ts";
import {memorySink, Presenter, type SinkRecord} from "./platform/Output.ts";
import {ProcessExited} from "./platform/Process.ts";
import {makeTestLayer} from "./platform/testing.ts";

const reportDocument = {status: "failed", checks: 3};

/** A service no root provides; registering a command that needs it must not compile. */
class Extra extends Context.Service<Extra, {readonly value: number}>()("arolariu/scripts/test/Extra") {}

const testRoot = makeRootCommand([
  Command.make("ok", {}, () => Effect.void),
  Command.make("report", {}, () =>
    Effect.gen(function* () {
      const presenter = yield* Presenter;
      yield* presenter.json(reportDocument);
      return yield* new ReportedFailure({exitCode: 1, message: "report failed"});
    }).pipe(withCommandOutput("report")),
  ),
  Command.make("boom", {}, () => Effect.fail(new Error("kaboom"))),
  Command.make("die", {}, () => Effect.die("bug")),
]);

/** The outcome of one harnessed CLI run. */
interface CliRun {
  /** Process exit code chosen by `exitCodeFor`. */
  readonly code: CommandExitCode;
  /** Concatenated stdout records. */
  readonly stdout: string;
  /** Every stdout record, in order. */
  readonly stdoutRecords: readonly SinkRecord[];
  /** Every stderr record, in order. */
  readonly stderrRecords: readonly SinkRecord[];
}

/**
 * Runs `root` against `argv` with a fresh harness.
 *
 * @param argv - Arguments after the program name.
 * @param root - The root command; defaults to the test root.
 * @returns The exit code and the captured output.
 */
async function run(argv: readonly string[], root: RootCommand = testRoot): Promise<CliRun> {
  const harness = makeTestLayer();
  const exit = await Effect.runPromiseExit(runCli(argv, root).pipe(Effect.provide(harness.layer)));
  const records = harness.output();
  const stdoutRecords = records.filter((record) => record.stream === "stdout");
  return {
    code: exitCodeFor(exit, undefined),
    stdout: stdoutRecords.map((record) => record.text).join(""),
    stdoutRecords,
    stderrRecords: records.filter((record) => record.stream === "stderr"),
  };
}

describe("runCli", () => {
  it("succeeds", async () => {
    // Arrange
    const argv = ["ok"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result).toEqual({code: 0, stdout: "", stdoutRecords: [], stderrRecords: []});
  });

  it("rejects unknown flags with usage exit", async () => {
    // Arrange
    const argv = ["ok", "--bogus"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.stdout).toContain("USAGE");
    expect(result.stderrRecords.map((record) => record.text).join("")).toContain("--bogus");
    expect(result.stderrRecords.map((record) => record.text).join("")).not.toContain("[arolariu::cli]");
  });

  it("renders a usage error as one JSON document with --json", async () => {
    // Arrange
    const argv = ["ok", "--bogus", "--json"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.stdoutRecords).toHaveLength(1);
    const document: unknown = JSON.parse(result.stdout);
    expect(document).toMatchObject({status: "failed", kind: "usage", evidence: []});
    expect(document).toHaveProperty("message", expect.stringContaining("--bogus"));
    expect(result.stderrRecords.map((record) => record.text).join("")).toContain("USAGE");
  });

  it("keeps every usage error after the first as JSON evidence", async () => {
    // Arrange
    const argv = ["ok", "--bogus", "--other", "--json"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.stdoutRecords).toHaveLength(1);
    const document: unknown = JSON.parse(result.stdout);
    expect(document).toMatchObject({status: "failed", kind: "usage"});
    expect(document).toHaveProperty("message", expect.stringContaining("--bogus"));
    expect(document).toHaveProperty("evidence", [expect.stringContaining("--other")]);
  });

  it("renders an invalid built-in flag value as one JSON document with --json", async () => {
    // Arrange
    const argv = ["--completions", "powershell", "--json"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.stdoutRecords).toHaveLength(1);
    const document: unknown = JSON.parse(result.stdout);
    expect(document).toMatchObject({status: "failed", kind: "usage", evidence: []});
    expect(document).toHaveProperty("message", expect.stringContaining("powershell"));
  });

  it("runs a group without a subcommand under --json to help on stderr and no document", async () => {
    // Arrange
    const argv = ["--json"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.stdoutRecords).toEqual([]);
    expect(result.stderrRecords.map((record) => record.text).join("")).toContain("SUBCOMMANDS");
  });

  it("prints help to stderr and no document for --help --json", async () => {
    // Arrange
    const argv = ["--help", "--json"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.stdoutRecords).toEqual([]);
    expect(result.stderrRecords.map((record) => record.text).join("")).toContain("USAGE");
  });

  it("rejects at compile time a subcommand that requires an unprovided service", () => {
    // Arrange
    const needsExtra = Command.make("extra", {}, () =>
      Effect.gen(function* () {
        yield* Extra;
      }),
    );

    // Act
    // @ts-expect-error -- `Extra` is neither a base service nor a global setting.
    const root = makeRootCommand([needsExtra]);

    // Assert
    expect(root.name).toBe("arolariu");
  });

  it("prints help", async () => {
    // Arrange
    const argv = ["--help"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("ok");
    expect(result.stdout).toContain("report");
    expect(result.stdout).toContain("--json");
    expect(result.stdout).toContain("--verbose");
    expect(result.stderrRecords).toEqual([]);
  });

  it("prints the version from the root package manifest", async () => {
    // Arrange
    const argv = ["--version"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(packageJson.version);
  });

  it("runs a group without a subcommand to help exit 0", async () => {
    // Arrange
    const rootWithoutHandler = makeRootCommand([Command.make("ok", {}, () => Effect.void)]);

    // Act
    const result = await run([], rootWithoutHandler);

    // Assert
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("ok");
    expect(result.stderrRecords).toEqual([]);
  });

  it("does not render a second document for a reported failure", async () => {
    // Arrange
    const argv = ["report", "--json"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(1);
    expect(result.stdoutRecords).toEqual([{stream: "stdout", text: `${JSON.stringify(reportDocument, null, 2)}\n`}]);
    expect(result.stderrRecords).toEqual([]);
  });

  it("renders unreported failures in human mode", async () => {
    // Arrange
    const argv = ["boom"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(1);
    expect(result.stdoutRecords).toEqual([]);
    expect(result.stderrRecords).toEqual([{stream: "stderr", text: "[arolariu::cli] ⛔ kaboom\n"}]);
  });

  it("renders unreported failures as one JSON document", async () => {
    // Arrange
    const argv = ["boom", "--json"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(1);
    expect(result.stdoutRecords).toHaveLength(1);
    expect(JSON.parse(result.stdout)).toEqual({status: "failed", kind: "operational", message: "kaboom", evidence: []});
    expect(result.stderrRecords).toEqual([]);
  });

  it("marks defects as internal", async () => {
    // Arrange
    const argv = ["die", "--json"];

    // Act
    const result = await run(argv);

    // Assert
    expect(result.code).toBe(1);
    expect(JSON.parse(result.stdout)).toEqual({status: "failed", kind: "internal", message: "bug", evidence: []});
  });

  it("lists every command family in the default root's help", async () => {
    // Arrange
    const argv = ["--help"];

    // Act
    const result = await run(argv, rootCommand);

    // Assert
    expect(result.code).toBe(0);
    for (const family of ["setup", "doctor", "status", "generate", "docs", "rates"]) {
      expect(result.stdout).toContain(family);
    }
    expect(result.stderrRecords).toEqual([]);
  });

  it("routes effect Console output into the sink", async () => {
    // Arrange
    const root = makeRootCommand([
      Command.make("console", {}, () =>
        Effect.gen(function* () {
          yield* Console.log("out", 1);
          yield* Console.error("err");
          yield* Console.assert(true, "hidden");
          yield* Console.assert(false, "shown");
          yield* Console.count("ignored");
        }),
      ),
    ]);

    // Act
    const result = await run(["console"], root);

    // Assert
    expect(result.code).toBe(0);
    expect(result.stdoutRecords).toEqual([{stream: "stdout", text: "out 1\n"}]);
    expect(result.stderrRecords).toEqual([
      {stream: "stderr", text: "err\n"},
      {stream: "stderr", text: "shown\n"},
    ]);
  });

  it("exposes the invocation arguments through Stdio and rejects Stdio output", async () => {
    // Arrange
    const root = makeRootCommand([
      // @ts-expect-error -- Stdio is deliberately not a subcommand service; runCli provides it only for effect/cli.
      Command.make("stdio", {}, () =>
        Effect.gen(function* () {
          const stdio = yield* Stdio.Stdio;
          yield* Console.log((yield* stdio.args).join(","));
          yield* Stream.run(Stream.make("x"), stdio.stdout());
        }),
      ),
    ]);

    // Act
    const result = await run(["stdio"], root);

    // Assert
    expect(result.code).toBe(1);
    expect(result.stdoutRecords).toEqual([{stream: "stdout", text: "stdio\n"}]);
    expect(result.stderrRecords).toEqual([{stream: "stderr", text: "[arolariu::cli] ⛔ effect/cli Stdio output is not supported\n"}]);
  });

  it("uses the default root when none is given", async () => {
    // Arrange
    const harness = makeTestLayer();

    // Act
    const exit = await Effect.runPromiseExit(runCli(["--help"]).pipe(Effect.provide(harness.layer)));

    // Assert
    expect(exitCodeFor(exit, undefined)).toBe(0);
    expect(
      harness
        .output()
        .map((record) => record.text)
        .join(""),
    ).toContain("rates");
  });
});

describe("renderUnreportedFailure", () => {
  it("includes process evidence in the JSON document", async () => {
    // Arrange
    const sink = memorySink();
    const error = new ProcessExited({
      command: "git status",
      stdout: "out",
      stderr: "err",
      durationMs: 1,
      message: "git exited 1",
      exitCode: 1,
    });

    // Act
    await Effect.runPromise(renderUnreportedFailure(Cause.fail(error), true).pipe(Effect.provide(sink.layer)));

    // Assert
    expect(sink.records()).toHaveLength(1);
    expect(JSON.parse(sink.records()[0]?.text ?? "")).toEqual({
      status: "failed",
      kind: "operational",
      message: "git exited 1",
      evidence: ["git exited 1", "stdout: out", "stderr: err"],
    });
  });

  it("renders a non-error failure value with its string form", async () => {
    // Arrange
    const sink = memorySink();

    // Act
    await Effect.runPromise(renderUnreportedFailure(Cause.fail(42), false).pipe(Effect.provide(sink.layer)));

    // Assert
    expect(sink.records()).toEqual([{stream: "stderr", text: "[arolariu::cli] ⛔ 42\n"}]);
  });
});
