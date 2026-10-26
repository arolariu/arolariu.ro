// @vitest-environment node
/**
 * @fileoverview Contract tests for the generic process runner.
 * @module scripts.common.runner.test
 */

import {describe, expect, it} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./logger.ts";
import {
  AbstractProcessRunner,
  formatProcessRequest,
  processFailureEvidence,
  RunnerError,
  type ProcessOutcome,
  type ProcessRequest,
  type ProcessRunOptions,
} from "./runner.ts";

class FakeProcessRunner extends AbstractProcessRunner {
  public readonly calls: Array<Readonly<{request: ProcessRequest; options: ProcessRunOptions}>> = [];
  readonly #outcome: ProcessOutcome;

  public constructor(outcome: ProcessOutcome) {
    super();
    this.#outcome = outcome;
  }

  protected override execute(request: Readonly<ProcessRequest>, options: Readonly<ProcessRunOptions>): Promise<ProcessOutcome> {
    this.calls.push({request, options});
    return Promise.resolve(this.#outcome);
  }
}

function createLogger(redactions: readonly string[] = []): MonorepositoryConsoleLogger {
  return new MonorepositoryConsoleLogger("runner", {
    color: false,
    redactions,
    sink: new InMemoryLoggerSink(),
  });
}

describe("formatProcessRequest", () => {
  it("quotes commands and arguments containing whitespace", () => {
    expect(
      formatProcessRequest({
        command: "C:\\Program Files\\Tool\\tool.exe",
        args: ["plain", "two words", ""],
      }),
    ).toBe('"C:\\Program Files\\Tool\\tool.exe" plain "two words" ""');
  });
});

describe("processFailureEvidence", () => {
  it("prefers stderr, then stdout, then spawn messages", () => {
    expect(
      processFailureEvidence({
        kind: "exited",
        exitCode: 7,
        stdout: "stdout detail",
        stderr: "stderr detail",
        durationMs: 1,
      }),
    ).toBe("stderr detail");

    expect(
      processFailureEvidence({
        kind: "signalled",
        signal: "SIGTERM",
        stdout: "stdout detail",
        stderr: "",
        durationMs: 1,
      }),
    ).toBe("stdout detail");

    expect(
      processFailureEvidence({
        kind: "spawn-failed",
        message: "spawn detail",
        stdout: "",
        stderr: "",
        durationMs: 1,
      }),
    ).toBe("spawn detail");
  });

  it("sanitizes and bounds evidence excerpts", () => {
    const logger = createLogger(["secret"]);
    const evidence = processFailureEvidence(
      {
        kind: "cancelled",
        stdout: `secret:${"x".repeat(2_100)}`,
        stderr: "",
        durationMs: 1,
      },
      logger,
    );

    expect(evidence).not.toContain("secret");
    expect(evidence).toContain("[REDACTED]");
    expect(evidence).toHaveLength(2_000);
  });
});

describe("AbstractProcessRunner", () => {
  it("merges scoped defaults with call options and environment removals", async () => {
    const runner = new FakeProcessRunner({
      kind: "succeeded",
      exitCode: 0,
      stdout: "",
      stderr: "",
      durationMs: 1,
    });

    await runner
      .scope({cwd: "C:\\repo", env: {KEEP: "parent", REMOVE: "value"}, timeoutMs: 10})
      .run({command: "tool", args: ["check"]}, {env: {REMOVE: undefined}, timeoutMs: 20});

    expect(runner.calls[0]?.options).toMatchObject({
      cwd: "C:\\repo",
      env: {KEEP: "parent", REMOVE: undefined},
      timeoutMs: 20,
    });
  });

  it("keeps scoped defaults immutable after scope creation", async () => {
    const runner = new FakeProcessRunner({
      kind: "succeeded",
      exitCode: 0,
      stdout: "",
      stderr: "",
      durationMs: 1,
    });
    const defaults = {
      cwd: "C:\\repo",
      env: {KEEP: "parent"},
      timeoutMs: 10,
    } satisfies ProcessRunOptions;

    const scoped = runner.scope(defaults);
    defaults.env.KEEP = "mutated";

    await scoped.run({command: "tool", args: ["check"]});

    expect(runner.calls[0]?.options).toMatchObject({
      cwd: "C:\\repo",
      env: {KEEP: "parent"},
      timeoutMs: 10,
    });
    expect(runner.calls[0]?.options).not.toBe(defaults);
    expect(runner.calls[0]?.options.env).not.toBe(defaults.env);
  });

  it("logs formatted commands without exposing stdin or environment values", async () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("runner", {
      color: false,
      redactions: ["secret-argument"],
      sink,
    });
    const runner = new FakeProcessRunner({
      kind: "succeeded",
      exitCode: 0,
      stdout: "",
      stderr: "",
      durationMs: 1,
    });

    await runner.run(
      {command: "tool", args: ["two words", "secret-argument"]},
      {
        env: {TOKEN: "environment-secret"},
        input: "stdin-secret",
        logCommands: true,
        logger,
      },
    );

    expect(sink.records).toEqual([
      {
        stream: "stdout",
        text: '$ tool "two words" [REDACTED]',
        write: false,
      },
    ]);
  });

  it("returns successful outcomes from expectSuccess", async () => {
    const outcome = {
      kind: "succeeded",
      exitCode: 0,
      stdout: "ok",
      stderr: "",
      durationMs: 1,
    } as const satisfies ProcessOutcome;
    const runner = new FakeProcessRunner(outcome);

    await expect(runner.expectSuccess({command: "tool", args: ["check"]})).resolves.toEqual(outcome);
  });

  it.each([
    ["exited", {kind: "exited", exitCode: 7, stdout: "out", stderr: "detail", durationMs: 2}],
    ["signalled", {kind: "signalled", signal: "SIGTERM", stdout: "", stderr: "", durationMs: 2}],
    ["spawn-failed", {kind: "spawn-failed", message: "spawn tool ENOENT", stdout: "", stderr: "", durationMs: 2}],
    ["timed-out", {kind: "timed-out", signal: "SIGTERM", stdout: "", stderr: "", durationMs: 2}],
    ["cancelled", {kind: "cancelled", signal: "SIGTERM", stdout: "", stderr: "", durationMs: 2}],
  ] as const)("throws RunnerError for %s outcomes", async (_kind, outcome) => {
    const runner = new FakeProcessRunner(outcome);

    await expect(runner.expectSuccess({command: "tool", args: ["check"]})).rejects.toMatchObject({name: "RunnerError", outcome});
  });

  it("throws RunnerError with sanitized bounded evidence", async () => {
    const runner = new FakeProcessRunner({
      kind: "exited",
      exitCode: 7,
      stdout: "out",
      stderr: `detail secret ${"x".repeat(3_000)}`,
      durationMs: 2,
    });
    const logger = createLogger(["secret"]);

    await expect(runner.expectSuccess({command: "secret command", args: ["check"]}, {logger})).rejects.toMatchObject({
      name: "RunnerError",
      outcome: {kind: "exited", exitCode: 7},
    });

    await runner.expectSuccess({command: "secret command", args: ["check"]}, {logger}).catch((error: unknown) => {
      expect(error).toBeInstanceOf(RunnerError);
      if (!(error instanceof RunnerError)) {
        return;
      }

      expect(error.message).toContain("[REDACTED]");
      expect(error.message).not.toContain("secret");
      expect(error.message.length).toBeLessThanOrEqual(4_200);
    });
  });

  it("redacts every retained request and outcome string when a logger is supplied", async () => {
    const token = "runner-retained-secret";
    const request = {command: `tool-${token}`, args: ["check", `authToken=${token}`]} satisfies ProcessRequest;
    const outcome = {
      kind: "spawn-failed",
      message: `spawn failed for ${token}`,
      stdout: `stdout ${token}`,
      stderr: `stderr ${token}`,
      durationMs: 23,
    } as const satisfies ProcessOutcome;
    const runner = new FakeProcessRunner(outcome);
    const logger = createLogger([token]);

    await runner.expectSuccess(request, {logger}).catch((error: unknown) => {
      expect(error).toBeInstanceOf(RunnerError);
      if (!(error instanceof RunnerError)) {
        return;
      }

      expect(error.message).not.toContain(token);
      expect(error.request).toEqual({command: "tool-[REDACTED]", args: ["check", "authToken=[REDACTED]"]});
      expect(error.outcome).toEqual({
        kind: "spawn-failed",
        message: "spawn failed for [REDACTED]",
        stdout: "stdout [REDACTED]",
        stderr: "stderr [REDACTED]",
        durationMs: 23,
      });
    });
  });

  it("retains the original request and outcome when no logger is supplied", async () => {
    const request = {command: "tool", args: ["check"]} satisfies ProcessRequest;
    const outcome = {
      kind: "exited",
      exitCode: 7,
      stdout: "raw stdout",
      stderr: "raw stderr",
      durationMs: 2,
    } as const satisfies ProcessOutcome;
    const runner = new FakeProcessRunner(outcome);

    await runner.expectSuccess(request).catch((error: unknown) => {
      expect(error).toBeInstanceOf(RunnerError);
      if (!(error instanceof RunnerError)) {
        return;
      }

      expect(error.request).toBe(request);
      expect(error.outcome).toBe(outcome);
    });
  });

  it("rejects empty commands", () => {
    const runner = new FakeProcessRunner({
      kind: "succeeded",
      exitCode: 0,
      stdout: "",
      stderr: "",
      durationMs: 1,
    });

    expect(() => runner.run({command: "   ", args: []})).toThrow("Command cannot be empty");
  });

  it("rejects inherited output when stdin is supplied", () => {
    const runner = new FakeProcessRunner({
      kind: "succeeded",
      exitCode: 0,
      stdout: "",
      stderr: "",
      durationMs: 1,
    });

    expect(() => runner.run({command: "tool", args: []}, {input: "payload", output: "inherit"})).toThrow(
      "Cannot supply input when output is inherited",
    );
  });
});
