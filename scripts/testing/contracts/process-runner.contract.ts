/**
 * @fileoverview Shared process-runner contract: every engine-neutral validation, command-echo,
 * scoping, environment-merge, and typed-failure behavior a `ProcessRunner` implementation must
 * exhibit, independent of the process engine that eventually executes the request.
 * @module scripts/testing/contracts/process-runner.contract
 */

import {describe, expect, it} from "vitest";

import {
  formatProcessExecutionRequest,
  type ProcessExecutionOptions,
  type ProcessExecutionRequest,
} from "../../core/process/process-execution-request.ts";
import type {FailedProcessExecutionResult} from "../../core/process/process-execution-result.ts";
import {ProcessRunnerError, type ProcessRunner} from "../../core/process/process-runner.ts";
import {
  buildCancelledProcessExecutionResult,
  buildExitedProcessExecutionResult,
  buildProgrammableProcessRunner,
  buildSignalledProcessExecutionResult,
  buildSpawnFailedProcessExecutionResult,
  buildSucceededProcessExecutionResult,
  buildTimedOutProcessExecutionResult,
} from "../builders/process-result.builder.ts";
import {buildRecordingPresenter} from "../fixtures/terminal.fixture.ts";

/** Per-call decision function the contract programs its runner with. */
type ProcessRunnerContractResponder = Parameters<typeof buildProgrammableProcessRunner>[0];

/** One recorded invocation observed through the responder. */
type RecordedInvocation = Readonly<{request: ProcessExecutionRequest; options: ProcessExecutionOptions}>;

/** Secret registered with the contract presenter before any diagnostic text is produced. */
const CONTRACT_SECRET = "hunter2";

/** Failure variants `expectSuccess` must reject with, plus the exact message each one produces. */
const failureVariants = [
  ["exited", buildExitedProcessExecutionResult(7, {stdout: "ignored", stderr: "detail"}), "Process exited with code 7: tool check\ndetail"],
  ["signalled", buildSignalledProcessExecutionResult("SIGTERM"), "Process terminated by SIGTERM: tool check"],
  ["spawn-failed", buildSpawnFailedProcessExecutionResult("spawn tool ENOENT"), "Process failed to start: tool check\nspawn tool ENOENT"],
  ["timed-out", buildTimedOutProcessExecutionResult(), "Process timed out: tool check"],
  ["cancelled", buildCancelledProcessExecutionResult({signal: "SIGKILL"}), "Process cancelled by SIGKILL: tool check"],
  [
    "stdout-only evidence",
    buildExitedProcessExecutionResult(3, {stdout: "stdout detail"}),
    "Process exited with code 3: tool check\nstdout detail",
  ],
] as const satisfies readonly (readonly [string, FailedProcessExecutionResult, string])[];

/**
 * Runs the shared process-runner contract against one runner implementation.
 *
 * @param definition - The label used in the suite name and a factory that builds the runner under
 * test from a per-call responder, so a case can observe effective options, fail only a chosen
 * invocation, or reject from inside the engine seam.
 */
export function runProcessRunnerContract(
  definition: Readonly<{
    readonly label: string;
    readonly createRunner: (respond: ProcessRunnerContractResponder) => ProcessRunner;
  }>,
): void {
  const {label, createRunner} = definition;

  /** Builds a runner that always succeeds and records every effective invocation it observes. */
  function buildRecordingRunner(): Readonly<{runner: ProcessRunner; invocations: readonly RecordedInvocation[]}> {
    const invocations: RecordedInvocation[] = [];
    const runner = createRunner((request, options) => {
      invocations.push({request, options});
      return buildSucceededProcessExecutionResult();
    });

    return {runner, invocations};
  }

  /** Builds a runner that always returns one failed result, for `expectSuccess` policy cases. */
  function buildFailingRunner(result: Readonly<FailedProcessExecutionResult>): ProcessRunner {
    return createRunner(() => result);
  }

  describe(`${label} process-runner contract`, () => {
    it("quotes empty, whitespace-bearing, and quote-bearing tokens in the formatted command", () => {
      expect(formatProcessExecutionRequest({command: "C:\\Program Files\\Tool\\tool.exe", args: ["plain", "two words", "", 'a"b']})).toBe(
        '"C:\\Program Files\\Tool\\tool.exe" plain "two words" "" "a\\"b"',
      );
    });

    it("rejects an empty command before spawning anything", async () => {
      const {runner, invocations} = buildRecordingRunner();

      expect(() => runner.run({command: "   ", args: []})).toThrow(/command cannot be empty/i);
      await expect(async () => runner.run({command: "   ", args: []})).rejects.toThrow(/command cannot be empty/i);
      expect(invocations).toEqual([]);
    });

    it("rejects inherit output combined with piped input", async () => {
      const {runner, invocations} = buildRecordingRunner();

      expect(() => runner.run({command: "node", args: ["-e", ""]}, {output: "inherit", input: "payload"})).toThrow(/inherit/i);
      await expect(async () => runner.run({command: "node", args: ["-e", ""]}, {output: "inherit", input: "payload"})).rejects.toThrow(
        /inherit/i,
      );
      expect(invocations).toEqual([]);
    });

    it.each([
      [true, ['$ tool "two words" [REDACTED]']],
      [false, []],
    ])("echoes the formatted command through the presenter only when logCommands is %s", async (logCommands, expected) => {
      const {presenter, sink} = buildRecordingPresenter();
      presenter.redact(CONTRACT_SECRET);
      const {runner} = buildRecordingRunner();
      const request = {command: "tool", args: ["two words", CONTRACT_SECRET]} satisfies ProcessExecutionRequest;

      await runner.run(request, {presenter, logCommands, env: {TOKEN: CONTRACT_SECRET}, input: CONTRACT_SECRET});

      expect(formatProcessExecutionRequest(request)).toBe(`tool "two words" ${CONTRACT_SECRET}`);
      expect(sink.records.map(({text}) => text)).toEqual(expected);
    });

    it("merges scoped defaults under per-call options without mutating the parent runner", async () => {
      const {runner, invocations} = buildRecordingRunner();
      const defaults = {cwd: "C:\\repo", timeoutMs: 10} satisfies ProcessExecutionOptions;

      await runner.scope(defaults).run({command: "tool", args: ["scoped"]}, {timeoutMs: 20});
      await runner.run({command: "tool", args: ["parent"]});

      expect(invocations[0]?.options).toMatchObject({cwd: "C:\\repo", timeoutMs: 20});
      expect(invocations[1]?.options).toEqual({});
    });

    it("snapshots scope defaults so a later mutation of the defaults object cannot reach a call", async () => {
      const {runner, invocations} = buildRecordingRunner();
      const defaults = {cwd: "C:\\repo", env: {KEEP: "parent"}, timeoutMs: 10};

      const scoped = runner.scope(defaults);
      defaults.env.KEEP = "mutated";
      await scoped.run({command: "tool", args: ["check"]});

      expect(invocations[0]?.options).toMatchObject({cwd: "C:\\repo", env: {KEEP: "parent"}, timeoutMs: 10});
      expect(invocations[0]?.options.env).not.toBe(defaults.env);
    });

    it("merges environment values as base, then scope defaults, then per-call overrides", async () => {
      const {runner, invocations} = buildRecordingRunner();

      await runner
        .scope({env: {BASE: "base", SHARED: "base", REMOVED: "base"}})
        .scope({env: {SHARED: "scoped", SCOPED: "scoped"}})
        .run({command: "tool", args: ["check"]}, {env: {SHARED: "call", REMOVED: undefined}});

      expect(invocations[0]?.options.env).toStrictEqual({BASE: "base", SHARED: "call", SCOPED: "scoped", REMOVED: undefined});
    });

    it("returns the succeeded result from expectSuccess", async () => {
      const result = buildSucceededProcessExecutionResult({stdout: "ok"});
      const runner = createRunner(() => result);

      await expect(runner.expectSuccess({command: "tool", args: ["check"]})).resolves.toBe(result);
    });

    it.each(failureVariants)("throws ProcessRunnerError with the exact %s message form", async (_kind, result, message) => {
      const runner = buildFailingRunner(result);

      await expect(runner.expectSuccess({command: "tool", args: ["check"]})).rejects.toMatchObject({
        name: "ProcessRunnerError",
        message,
        result,
      });
    });

    it("bounds and redacts the failure message through the supplied presenter", async () => {
      const {presenter} = buildRecordingPresenter();
      presenter.redact(CONTRACT_SECRET);
      const runner = buildFailingRunner(buildExitedProcessExecutionResult(7, {stderr: `${CONTRACT_SECRET} ${"x".repeat(3_000)}`}));

      const error = await runner
        .expectSuccess({command: `tool-${CONTRACT_SECRET}`, args: ["check"]}, {presenter})
        .then(() => undefined)
        .catch((thrown: unknown) => thrown);

      expect(error).toBeInstanceOf(ProcessRunnerError);
      if (!(error instanceof ProcessRunnerError)) {
        return;
      }

      expect(error.message).toContain("[REDACTED]");
      expect(error.message).not.toContain(CONTRACT_SECRET);
      expect(error.message.split("\n").at(-1)).toHaveLength(2_000);
    });

    it("retains sanitized copies and leaves the originals unchanged when a presenter is supplied", async () => {
      const {presenter} = buildRecordingPresenter();
      presenter.redact(CONTRACT_SECRET);
      const request = {
        command: `tool-${CONTRACT_SECRET}`,
        args: ["check", `authToken=${CONTRACT_SECRET}`],
      } satisfies ProcessExecutionRequest;
      const result = buildSpawnFailedProcessExecutionResult(`spawn failed for ${CONTRACT_SECRET}`, {
        stdout: `stdout ${CONTRACT_SECRET}`,
        stderr: `stderr ${CONTRACT_SECRET}`,
        durationMs: 23,
      });
      const runner = buildFailingRunner(result);

      const error = await runner
        .expectSuccess(request, {presenter})
        .then(() => undefined)
        .catch((thrown: unknown) => thrown);

      expect(error).toBeInstanceOf(ProcessRunnerError);
      if (!(error instanceof ProcessRunnerError)) {
        return;
      }

      expect(error.request).not.toBe(request);
      expect(error.result).not.toBe(result);
      expect(error.request).toEqual({command: "tool-[REDACTED]", args: ["check", "authToken=[REDACTED]"]});
      expect(error.result).toEqual({
        kind: "spawn-failed",
        message: "spawn failed for [REDACTED]",
        stdout: "stdout [REDACTED]",
        stderr: "stderr [REDACTED]",
        durationMs: 23,
      });
      expect(JSON.stringify([error.request, error.result])).not.toContain(CONTRACT_SECRET);
      expect(request.command).toBe(`tool-${CONTRACT_SECRET}`);
      expect(result.message).toBe(`spawn failed for ${CONTRACT_SECRET}`);
    });

    it("retains the original request and result identities when no presenter is supplied", async () => {
      const request = {command: "tool", args: ["check"]} satisfies ProcessExecutionRequest;
      const result = buildExitedProcessExecutionResult(7, {stdout: "raw stdout", stderr: "raw stderr"});
      const runner = buildFailingRunner(result);

      const error = await runner
        .expectSuccess(request)
        .then(() => undefined)
        .catch((thrown: unknown) => thrown);

      expect(error).toBeInstanceOf(ProcessRunnerError);
      if (!(error instanceof ProcessRunnerError)) {
        return;
      }

      expect(error.request).toBe(request);
      expect(error.result).toBe(result);
    });

    it("propagates a rejection thrown inside the engine seam unchanged", async () => {
      const fault = new Error("engine fault");
      const runner = createRunner((_request, _options, callIndex) => {
        if (callIndex === 0) {
          return buildSucceededProcessExecutionResult();
        }

        return Promise.reject(fault);
      });

      await expect(runner.run({command: "tool", args: ["first"]})).resolves.toMatchObject({kind: "succeeded"});
      await expect(runner.expectSuccess({command: "tool", args: ["second"]})).rejects.toBe(fault);
    });
  });
}
