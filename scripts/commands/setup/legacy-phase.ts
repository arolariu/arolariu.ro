/**
 * @fileoverview Temporary adapter that runs the legacy Promise setup phases under the Effect kernel.
 * @module scripts/commands/setup/legacy-phase
 *
 * @remarks
 * {@link legacyPhase} turns a {@link LegacySetupPhaseDefinition} into a {@link SetupPhaseDefinition}:
 * its `run` builds a {@link LegacySetupContext} whose every capability is a Promise view over the
 * invocation's Effect services, then awaits the legacy phase. The views run their effects with the
 * phase's captured context (`Effect.runPromiseExitWith`), so the legacy phase logs, prompts, spawns,
 * inspects, and submits actions through the same services, settings, and test harness as the rest of
 * the invocation; every mutation still passes the consent-gated `SetupActions`.
 *
 * Interruption of the phase fiber aborts the phase signal and waits for the legacy promise to
 * settle: in-flight processes resolve `cancelled`, prompts and inspections reject with a
 * `CommandCancellation`, and no further action executes. A legacy rejection that is itself an
 * interruption (a `CommandCancellation`, an `AbortError`, or a terminal quit at a prompt) interrupts
 * the setup run; any other rejection is a defect, which the runner records as a failed phase.
 *
 * Deleted in Task 5.5, once every phase is an Effect.
 */

import {Cause, Clock, Effect, Exit, Redacted, Result, Terminal, type Context} from "effect";
import {HttpClient, HttpClientRequest} from "effect/http";

import type {CommandInvoker} from "../../common/commander.ts";
import {MonorepositoryConsoleLogger} from "../../common/logger.ts";
import type {PromptProvider} from "../../common/prompts.ts";
import {
  AbstractProcessRunner,
  type ProcessOutcome,
  type ProcessRequest as LegacyProcessRequest,
  type ProcessRunOptions,
  type ProcessRunner,
} from "../../common/runner.ts";
import {
  CommandCancellation,
  commandCancellationFromSignal,
  HttpError,
  linkAbortSignals,
  type Clock as LegacyClock,
  type HttpClient as LegacyHttpClient,
  type HttpRequest,
  type HttpResponse,
} from "../../common/runtime.ts";
import {nodeLoggerRuntimeHost} from "../../common/runtime.node.ts";
import type {RepositoryInspectionSession} from "../../inspection/repository.ts";
import {legacyFileSystem, legacyTaskScheduler, type LegacyRepositoryInspectionSession} from "../../platform/bridge.ts";
import {Environment} from "../../platform/Environment.ts";
import {OutputSettings} from "../../platform/Output.ts";
import {Process, type ProcessError, type ProcessOptions, type ProcessResult} from "../../platform/Process.ts";
import {Prompts, PromptUnavailable} from "../../platform/Prompts.ts";
import {generateCommand, type GenerateInput, type GenerateResult} from "../generate/index.ts";
import {SetupActions} from "./actions.ts";
import {SetupActionFailed} from "./errors.ts";
import type {
  LegacySetupActionExecutor,
  LegacySetupContext,
  LegacySetupPhaseDefinition,
  SetupPhaseDefinition,
  SetupPhaseResult,
  SetupRequirements,
} from "./types.ts";

/** Bounded default timeout applied to every legacy phase command that does not request its own. */
export const PHASE_COMMAND_TIMEOUT_MS = 120_000;

/** Methods the legacy HTTP client retries, because repeating them is safe. */
const IDEMPOTENT_HTTP_METHODS: ReadonlySet<string> = new Set(["GET", "PUT", "DELETE"]);

/** Response size the legacy HTTP client buffers by default before failing the request. */
const DEFAULT_MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

/** Runs one effect with a captured context, linked to an abort signal. */
type ContextRunner<R> = <A, E>(effect: Effect.Effect<A, E, R>, signal: AbortSignal | undefined) => Promise<Exit.Exit<A, E>>;

/**
 * Builds a {@link ContextRunner} over a captured context.
 *
 * @param context - The services every effect runs with.
 * @returns The runner; it never rejects.
 */
function contextRunner<R>(context: Context.Context<R>): ContextRunner<R> {
  const run = Effect.runPromiseExitWith(context);
  return (effect, signal) => run(effect, signal === undefined ? undefined : {signal});
}

/**
 * Reads the human-readable message of a failure value.
 *
 * @param error - The failure value.
 * @returns `error.message` when it is a string, otherwise `String(error)`.
 */
function messageOf(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return String(error);
}

/**
 * Reports whether a legacy rejection is an interruption rather than an ordinary failure.
 *
 * @param error - The rejection value.
 * @returns Whether it is a `CommandCancellation` or an `AbortError`.
 */
function isLegacyInterruption(error: unknown): boolean {
  return error instanceof CommandCancellation || (error instanceof Error && error.name === "AbortError");
}

/**
 * Builds the legacy prompt cancellation: the `AbortError` a quit terminal prompt rejects with.
 *
 * @returns The legacy `Prompt cancelled by user.` `AbortError`.
 */
function promptCancelled(): Error {
  const error = new Error("Prompt cancelled by user.");
  error.name = "AbortError";
  return error;
}

/**
 * Converts the failed exit of a view call into the value the legacy Promise rejects with.
 *
 * @remarks
 * An interruption becomes the phase signal's `CommandCancellation`; a terminal quit becomes the
 * legacy prompt `AbortError`; `PromptUnavailable` becomes the legacy non-interactive `Error` with
 * the identical message; any other typed failure rejects as itself and a defect as its squashed value.
 *
 * @param cause - The failure cause.
 * @param signal - The phase signal.
 * @returns The legacy rejection value.
 */
function toLegacyRejection(cause: Cause.Cause<unknown>, signal: AbortSignal | undefined): unknown {
  if (Cause.hasInterrupts(cause)) {
    return signal === undefined ? new CommandCancellation("Setup was interrupted.", 130) : commandCancellationFromSignal(signal);
  }
  const failure = Cause.findError(cause);
  if (!Result.isSuccess(failure)) {
    return Cause.squash(cause);
  }
  const error = failure.success;
  if (Terminal.isQuitError(error)) {
    return promptCancelled();
  }
  if (error instanceof PromptUnavailable) {
    return new Error(error.message);
  }
  return error;
}

/**
 * Settles a view call as a legacy Promise.
 *
 * @param run - The context runner.
 * @param effect - The call.
 * @param signal - The phase signal.
 * @returns The success value; rejects with {@link toLegacyRejection}.
 */
async function settle<A, E, R>(run: ContextRunner<R>, effect: Effect.Effect<A, E, R>, signal: AbortSignal | undefined): Promise<A> {
  const exit = await run(effect, signal);
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }
  throw toLegacyRejection(exit.cause, signal);
}

/**
 * Legacy {@link PromptProvider} view over the Effect {@link Prompts} service.
 *
 * @remarks
 * `secret` unwraps the `Redacted` value only at this legacy boundary. A `PromptUnavailable` failure
 * rejects with the legacy non-interactive `Error` (same message); a terminal quit rejects with the
 * legacy `AbortError`; an aborted `signal` rejects with its `CommandCancellation`.
 *
 * @param signal - The phase signal every prompt is linked to.
 * @returns An effect producing the view.
 */
export function legacyPromptProvider(signal?: AbortSignal): Effect.Effect<PromptProvider, never, Prompts> {
  return Effect.gen(function* () {
    const run = contextRunner(yield* Effect.context<Prompts>());
    const prompts = yield* Prompts;
    return {
      confirm: (message, defaultValue) => settle(run, prompts.confirm(message, defaultValue), signal),
      select: (message, choices, defaultValue) => settle(run, prompts.select(message, choices, defaultValue), signal),
      text: (message) => settle(run, prompts.text(message), signal),
      secret: (message) => settle(run, Effect.map(prompts.secret(message), Redacted.value), signal),
    };
  });
}

/**
 * Converts the legacy run options into `Process.run` options.
 *
 * @remarks
 * `timeoutMs` becomes `timeout`, `logCommands` becomes `echo` (defaulting to no echo, like the
 * legacy runner), and a failure carries its whole captured output, as the legacy outcome did.
 *
 * @param options - The legacy run options.
 * @returns The equivalent process options.
 */
function toProcessOptions(options: Readonly<ProcessRunOptions>): ProcessOptions {
  return {
    ...(options.cwd === undefined ? {} : {cwd: options.cwd}),
    ...(options.env === undefined ? {} : {env: options.env}),
    ...(options.output === undefined ? {} : {output: options.output}),
    ...(options.input === undefined ? {} : {input: options.input}),
    ...(options.timeoutMs === undefined ? {} : {timeout: options.timeoutMs}),
    echo: options.logCommands === true,
    failureOutput: "full",
  };
}

/**
 * Converts one `Process.run` exit into the legacy {@link ProcessOutcome}.
 *
 * @remarks
 * The inverse of the scripted-outcome mapping: `ProcessExited` → `exited`, `ProcessSignalled` →
 * `signalled`, `ProcessSpawnFailed` → `spawn-failed` (its `reason` becomes `message`),
 * `ProcessTimedOut` → `timed-out`, and an interruption → `cancelled`. A defect rejects.
 *
 * @param exit - The process exit.
 * @param durationMs - Elapsed time of an interrupted run.
 * @returns The legacy outcome.
 */
function toLegacyOutcome(exit: Exit.Exit<ProcessResult, ProcessError>, durationMs: number): ProcessOutcome {
  if (Exit.isSuccess(exit)) {
    return {kind: "succeeded", exitCode: 0, ...exit.value};
  }
  if (Cause.hasInterrupts(exit.cause)) {
    return {kind: "cancelled", stdout: "", stderr: "", durationMs};
  }
  const failure = Cause.findError(exit.cause);
  if (!Result.isSuccess(failure)) {
    throw Cause.squash(exit.cause);
  }
  const error = failure.success;
  const output = {stdout: error.stdout, stderr: error.stderr, durationMs: error.durationMs};
  switch (error._tag) {
    case "ProcessExited": {
      return {kind: "exited", exitCode: error.exitCode, ...output};
    }
    case "ProcessSignalled": {
      return {kind: "signalled", signal: error.signal as NodeJS.Signals, ...output};
    }
    case "ProcessSpawnFailed": {
      return {kind: "spawn-failed", message: error.reason, ...output};
    }
    case "ProcessTimedOut": {
      return {kind: "timed-out", ...output};
    }
  }
}

/** Legacy {@link ProcessRunner} over the Effect {@link Process} service. */
class LegacyProcessRunnerView extends AbstractProcessRunner {
  readonly #process: Process["Service"];
  readonly #run: ContextRunner<never>;
  readonly #now: () => number;
  readonly #signal: AbortSignal | undefined;

  /**
   * Creates the view.
   *
   * @param process - The Effect process service.
   * @param run - Runs each process with the captured context.
   * @param now - Current time in milliseconds.
   * @param signal - The phase signal every process is linked to.
   */
  public constructor(process: Process["Service"], run: ContextRunner<never>, now: () => number, signal: AbortSignal | undefined) {
    super();
    this.#process = process;
    this.#run = run;
    this.#now = now;
    this.#signal = signal;
  }

  /** {@inheritDoc AbstractProcessRunner.execute} */
  protected override async execute(request: Readonly<LegacyProcessRequest>, options: Readonly<ProcessRunOptions>): Promise<ProcessOutcome> {
    const link = linkAbortSignals(this.#signal, options.signal);
    try {
      const startedAt = this.#now();
      const exit = await this.#run(this.#process.run(request, toProcessOptions(options)), link.signal);
      return toLegacyOutcome(exit, Math.max(0, this.#now() - startedAt));
    } finally {
      link.dispose();
    }
  }
}

/**
 * Legacy {@link ProcessRunner} view over the Effect {@link Process} service.
 *
 * @remarks
 * Validation, `expectSuccess`, and `scope` keep the legacy `AbstractProcessRunner` semantics. Every
 * process is linked to `signal` and to its own `options.signal`; an aborted run resolves
 * `cancelled`, and a defect (an unscripted test process) rejects.
 *
 * @param signal - The phase signal every process is linked to.
 * @returns An effect producing the view.
 */
export function legacyProcessRunner(signal?: AbortSignal): Effect.Effect<ProcessRunner, never, Process> {
  return Effect.gen(function* () {
    const context = yield* Effect.context<never>();
    const now = (): number => Effect.runSyncWith(context)(Clock.currentTimeMillis);
    return new LegacyProcessRunnerView(yield* Process, contextRunner(context), now, signal);
  });
}

/**
 * Legacy {@link LegacyClock} view over the Effect `Clock`, with the `nodeClock` semantics.
 *
 * @remarks
 * `monotonicNow` is `Clock.currentTimeMillis`, `isoTimestamp` formats it, and `delay` sleeps on the
 * Effect clock and rejects with an `AbortError` once `signal` aborts.
 */
export const legacyClock: Effect.Effect<LegacyClock> = Effect.map(Effect.context<never>(), (context) => {
  const now = (): number => Effect.runSyncWith(context)(Clock.currentTimeMillis);
  const run = contextRunner(context);
  return {
    monotonicNow: now,
    isoTimestamp: () => new Date(now()).toISOString(),
    delay: async (milliseconds, signal) => {
      const exit = await run(Effect.sleep(milliseconds), signal);
      if (!Exit.isSuccess(exit)) {
        const error = new Error("The operation was aborted", {cause: signal?.reason});
        error.name = "AbortError";
        throw error;
      }
    },
  };
});

/**
 * Sends one legacy HTTP request through the Effect client, honoring the legacy retry policy.
 *
 * @param client - The Effect HTTP client.
 * @param request - The legacy request.
 * @returns The legacy response, or an {@link HttpError}.
 */
function sendLegacyRequest(client: HttpClient.HttpClient, request: Readonly<HttpRequest>): Effect.Effect<HttpResponse, unknown> {
  const method = request.method ?? "GET";
  const identity = {url: request.url, method};
  const maximumBytes = request.maximumResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
  const retry = request.retry;
  const attempts = retry !== undefined && IDEMPOTENT_HTTP_METHODS.has(method) ? Math.max(1, retry.attempts) : 1;

  const attempt = Effect.gen(function* () {
    let outgoing = HttpClientRequest.make(method)(request.url, request.headers === undefined ? undefined : {headers: request.headers});
    if (request.body !== undefined) {
      outgoing =
        typeof request.body === "string"
          ? HttpClientRequest.bodyText(outgoing, request.body)
          : HttpClientRequest.bodyUint8Array(outgoing, request.body);
    }
    const response = yield* client.execute(outgoing);
    const bytes = new Uint8Array(yield* response.arrayBuffer);
    if (bytes.byteLength > maximumBytes) {
      return yield* Effect.fail(
        new HttpError(`Response exceeded the ${String(maximumBytes)} byte limit.`, identity, {status: response.status}),
      );
    }
    return {
      status: response.status,
      ok: response.status >= 200 && response.status < 300,
      headers: Object.fromEntries(Object.entries(response.headers)),
      bytes,
      text: new TextDecoder("utf-8").decode(bytes),
    } satisfies HttpResponse;
  });

  const withRetries = Effect.gen(function* () {
    for (let attemptNumber = 1; ; attemptNumber += 1) {
      const response = yield* attempt;
      if (retry === undefined || attemptNumber >= attempts || !retry.statuses.includes(response.status)) {
        return response;
      }
      yield* Effect.sleep(retry.delayMs);
    }
  });

  const bounded =
    request.timeoutMs === undefined
      ? withRetries
      : Effect.flatMap(Effect.timeoutOption(withRetries, request.timeoutMs), (response) =>
          response._tag === "Some"
            ? Effect.succeed(response.value)
            : Effect.fail(new HttpError(`HTTP request timed out after ${String(request.timeoutMs)} ms.`, identity)),
        );
  return Effect.mapError(bounded, (error) =>
    error instanceof HttpError ? error : new HttpError(`HTTP request failed: ${messageOf(error)}`, identity, {cause: error}),
  );
}

/**
 * Legacy {@link LegacyHttpClient} view over the Effect `HttpClient`.
 *
 * @remarks
 * Keeps the legacy method default (`GET`), response bound, overall timeout, and idempotent-only
 * retry policy. Every failure rejects with an `HttpError`; an aborted `signal` (or
 * `request.signal`) rejects with the phase `CommandCancellation`.
 *
 * @param signal - The phase signal every request is linked to.
 * @returns An effect producing the view.
 */
export function legacyHttpClient(signal?: AbortSignal): Effect.Effect<LegacyHttpClient, never, HttpClient.HttpClient> {
  return Effect.gen(function* () {
    const run = contextRunner(yield* Effect.context<HttpClient.HttpClient>());
    const client = yield* HttpClient.HttpClient;
    return {
      request: async (request) => {
        const link = linkAbortSignals(signal, request.signal);
        try {
          return await settle(run, sendLegacyRequest(client, request), link.signal);
        } finally {
          link.dispose();
        }
      },
    };
  });
}

/**
 * Legacy {@link LegacySetupActionExecutor} view over the {@link SetupActions} service.
 *
 * @remarks
 * Each legacy action becomes a {@link SetupActions} action whose `execute` wraps the legacy
 * `execute` with `Effect.tryPromise`; a legacy rejection fails it with {@link SetupActionFailed}
 * and the view rejects with the original rejection value. Once `signal` aborts, no further action
 * runs: `run` rejects with the phase `CommandCancellation` before consulting `SetupActions`.
 *
 * @param signal - The phase signal every action is linked to.
 * @returns An effect producing the view.
 */
export function legacySetupActionExecutor(signal?: AbortSignal): Effect.Effect<LegacySetupActionExecutor, never, SetupRequirements> {
  return Effect.gen(function* () {
    const run = contextRunner(yield* Effect.context<SetupRequirements>());
    const actions = yield* SetupActions;
    return {
      run: async (action) => {
        if (signal?.aborted === true) {
          throw commandCancellationFromSignal(signal);
        }
        let rejection: {readonly value: unknown} | undefined;
        const execute = Effect.tryPromise({
          try: () => action.execute(),
          catch: (error) => {
            rejection = {value: error};
            return new SetupActionFailed({message: messageOf(error), actionId: action.id});
          },
        });
        const exit = await run(actions.run({id: action.id, scope: action.scope, summary: action.summary, execute}), signal);
        if (Exit.isSuccess(exit)) {
          return exit.value;
        }
        const failure = Cause.findError(exit.cause);
        if (rejection !== undefined && Result.isSuccess(failure) && failure.success instanceof SetupActionFailed) {
          throw rejection.value;
        }
        throw toLegacyRejection(exit.cause, signal);
      },
    };
  });
}

/**
 * Legacy {@link LegacyRepositoryInspectionSession} view over an Effect inspection session.
 *
 * @remarks
 * `inspect` resolves the memoized outcome (rejecting with the phase `CommandCancellation` once
 * `signal` aborts); `invalidate` and `updateInfrastructureEngine` apply synchronously, so they
 * affect every later `inspect`.
 *
 * @param session - The Effect session.
 * @param signal - The phase signal every inspection is linked to.
 * @returns An effect producing the view.
 */
export function legacyInspectionSession(
  session: RepositoryInspectionSession,
  signal?: AbortSignal,
): Effect.Effect<LegacyRepositoryInspectionSession> {
  return Effect.map(Effect.context<never>(), (context) => {
    const run = contextRunner(context);
    const runSync = Effect.runSyncWith(context);
    return {
      inspect: (key) => settle(run, session.inspect(key), signal),
      invalidate: (...keys) => {
        runSync(session.invalidate(...keys));
      },
      updateInfrastructureEngine: (engine) => {
        runSync(session.updateInfrastructureEngine(engine));
      },
    };
  });
}

/** Seams {@link legacyPhase} accepts. */
export interface LegacyPhaseOptions {
  /** Composed generation command `invokeGenerate` calls; defaults to the cohort 3 `generateCommand` shim. */
  readonly generate?: CommandInvoker<GenerateInput, GenerateResult>;
}

/**
 * Runs a legacy Promise setup phase as an Effect setup phase.
 *
 * @remarks
 * The phase receives a {@link LegacySetupContext} built from the invocation services: the views of
 * this module (all linked to one phase `AbortSignal`), a process runner scoped to the repository
 * root with the bounded {@link PHASE_COMMAND_TIMEOUT_MS} default and command echo under `--verbose`,
 * the bridge's `legacyFileSystem` and `legacyTaskScheduler`, the `Environment` snapshot, a
 * `MonorepositoryConsoleLogger("setup")` in the invocation's output mode and verbosity, and
 * `invokeGenerate` over the generation shim. Interrupting the phase aborts its signal and waits for
 * the legacy promise to settle. A rejection that is an interruption (`CommandCancellation`,
 * `AbortError`, or a terminal quit at a prompt) interrupts the run; any other rejection is a defect.
 *
 * @param definition - The legacy phase.
 * @param options - Optional generation seam.
 * @returns The equivalent Effect phase, with the same id, title, requirement flag, and dependencies.
 */
export function legacyPhase(definition: LegacySetupPhaseDefinition, options: LegacyPhaseOptions = {}): SetupPhaseDefinition {
  const generate = options.generate ?? generateCommand;
  return {
    id: definition.id,
    title: definition.title,
    required: definition.required,
    dependsOn: definition.dependsOn,
    run: (context) =>
      Effect.gen(function* () {
        const controller = new AbortController();
        const {signal} = controller;
        const settings = yield* OutputSettings;
        const environment = yield* Environment;
        const runner = (yield* legacyProcessRunner(signal)).scope({
          cwd: context.paths.root,
          timeoutMs: PHASE_COMMAND_TIMEOUT_MS,
          logCommands: context.options.verbose,
        });
        const legacyContext: LegacySetupContext = {
          options: context.options,
          paths: context.paths,
          requirements: context.requirements,
          inspection: yield* legacyInspectionSession(context.inspection, signal),
          runtime: {
            runner,
            files: yield* legacyFileSystem,
            http: yield* legacyHttpClient(signal),
            clock: yield* legacyClock,
            tasks: legacyTaskScheduler,
            environment,
            invokeGenerate: (input) => generate.invoke(input, {presentation: "silent", signal}),
          },
          prompts: yield* legacyPromptProvider(signal),
          actions: yield* legacySetupActionExecutor(signal),
          logger: new MonorepositoryConsoleLogger("setup", {
            mode: settings.mode,
            verbose: settings.verbose,
            runtimeHost: nodeLoggerRuntimeHost,
          }),
        };

        return yield* Effect.callback<SetupPhaseResult>((resume) => {
          const phase = Promise.resolve().then(() => definition.run(legacyContext));
          phase.then(
            (result) => {
              resume(Effect.succeed(result));
            },
            (error: unknown) => {
              resume(isLegacyInterruption(error) ? Effect.interrupt : Effect.die(error));
            },
          );
          return Effect.promise(async () => {
            controller.abort(new CommandCancellation("Setup was interrupted.", 130));
            await phase.then(
              () => undefined,
              () => undefined,
            );
          });
        });
      }),
  };
}
