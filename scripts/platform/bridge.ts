/**
 * @fileoverview Temporary interop bridge between legacy Promise commands and Effect programs.
 * @module scripts/platform/bridge
 *
 * @remarks
 * {@link runEffect} lets a legacy Promise command run an Effect program with the platform layer;
 * {@link legacyInvoker} lets a migrated Effect program pose as a legacy `CommandInvoker`, so an
 * unmigrated caller composes it unchanged. Cancellation flows from `AbortSignal`s into fiber
 * interruption, and every scope finalizer completes before the returned promise settles. The bridge
 * exists only while both command models coexist and is deleted in cohort 7.
 */

import {Cause, Effect, Exit, Result, type Layer, type Scope} from "effect";

import type {CommandExecution, CommandInvocationOptions, CommandInvoker, CommandPresentation} from "../common/commander.ts";
import {linkAbortSignals} from "../common/runtime.ts";
import {Environment, EnvironmentLive} from "./Environment.ts";
import {makeNodeLayer, type PlatformServices} from "./layers.ts";
import {resolveColor, type OutputSettingsShape} from "./Output.ts";
import {processErrorEvidence, ProcessExited, ProcessSignalled, ProcessSpawnFailed, ProcessTimedOut, type ProcessError} from "./Process.ts";

/** Builds the platform layer for one bridged invocation from its output settings. */
export type LayerFactory = (settings: OutputSettingsShape) => Layer.Layer<PlatformServices>;

/** Options of one {@link runEffect} invocation. */
export interface RunEffectOptions {
  /** Output mode of the invocation. */
  readonly presentation: CommandPresentation;
  /** Whether debug logs are emitted. */
  readonly verbose: boolean;
  /** Default `[arolariu::<context>]` log prefix context. */
  readonly context: string;
  /** Aborting it interrupts the program; finalizers complete before the promise settles. */
  readonly signal?: AbortSignal;
  /** Builds the platform layer; defaults to `makeNodeLayer`. */
  readonly makeLayer?: LayerFactory;
}

/**
 * Runs an Effect program from legacy Promise code with a freshly built platform layer.
 *
 * @remarks
 * The layer is built from `{mode: presentation, verbose, color, context}`, where `color` follows
 * `resolveColor` over the ambient Node environment snapshot (`EnvironmentLive`). The program runs
 * in its own scope; aborting `signal` interrupts it and the promise settles only after every
 * finalizer has run.
 *
 * @param program - The program to run; it may require any platform service and a scope.
 * @param options - Output settings, cancellation signal, and optional layer factory.
 * @returns A promise of the program exit; it never rejects for typed failures, defects, or interruption.
 */
export function runEffect<A, E>(
  program: Effect.Effect<A, E, PlatformServices | Scope.Scope>,
  options: RunEffectOptions,
): Promise<Exit.Exit<A, E>> {
  const makeLayer = options.makeLayer ?? makeNodeLayer;
  const runnable = Effect.gen(function* () {
    const environment = yield* Environment;
    const layer = makeLayer({
      mode: options.presentation,
      verbose: options.verbose,
      color: resolveColor(environment),
      context: options.context,
    });
    return yield* program.pipe(Effect.scoped, Effect.provide(layer));
  }).pipe(Effect.provide(EnvironmentLive));
  return Effect.runPromiseExit(runnable, {signal: options.signal});
}

/**
 * Narrows an unknown failure to a {@link ProcessError}.
 *
 * @param error - The failure value.
 * @returns Whether `error` is one of the `Process.run` failure classes.
 */
function isProcessError(error: unknown): error is ProcessError {
  return (
    error instanceof ProcessExited
    || error instanceof ProcessSignalled
    || error instanceof ProcessSpawnFailed
    || error instanceof ProcessTimedOut
  );
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
 * Reads the legacy `verbose` flag from a command input, when the input declares one.
 *
 * @param input - The command input.
 * @returns `true` only when `input.verbose` is exactly `true`.
 */
function verboseOf(input: unknown): boolean {
  return typeof input === "object" && input !== null && "verbose" in input && input.verbose === true;
}

/**
 * Maps an Effect program exit to the legacy {@link CommandExecution} shape.
 *
 * @param exit - The program exit.
 * @param exitCodeOf - Business exit code of a successful output.
 * @returns The equivalent legacy execution.
 */
function toExecution<TOutput, E>(exit: Exit.Exit<TOutput, E>, exitCodeOf: (output: Readonly<TOutput>) => 0 | 1): CommandExecution<TOutput> {
  if (Exit.isSuccess(exit)) {
    return {status: "completed", value: exit.value, exitCode: exitCodeOf(exit.value)};
  }
  const {cause} = exit;
  if (Cause.hasInterruptsOnly(cause)) {
    return {status: "cancelled", exitCode: 130, failure: {kind: "cancelled", message: "Command cancelled.", evidence: []}};
  }
  const failure = Cause.findError(cause);
  const isTyped = Result.isSuccess(failure);
  const error: unknown = isTyped ? failure.success : Cause.squash(cause);
  return {
    status: "failed",
    exitCode: 1,
    failure: {
      kind: isTyped ? "operational" : "internal",
      message: messageOf(error),
      evidence: isProcessError(error) ? processErrorEvidence(error) : [],
      cause: error,
    },
  };
}

/**
 * Wraps a migrated Effect program as a legacy {@link CommandInvoker}.
 *
 * @remarks
 * `invoke(input, options)` runs `program(input)` through {@link runEffect} with presentation
 * `options.presentation ?? "silent"`, `verbose` taken from `input.verbose === true`, and a signal
 * linked from the parent runtime signal and `options.signal`. Success maps to `completed` with
 * `exitCodeOf(value)`; interruption only to `cancelled` (`130`); a typed failure to an
 * `operational` failure (`1`, with process evidence for a `ProcessError`); any other cause to an
 * `internal` failure (`1`).
 *
 * @param context - Default `[arolariu::<context>]` log prefix context.
 * @param program - Builds the program for one input.
 * @param exitCodeOf - Business exit code of a successful output.
 * @param makeLayer - Builds the platform layer; defaults to `makeNodeLayer`.
 * @returns An invoker whose `invoke` never rejects.
 */
export function legacyInvoker<TInput, TOutput, E>(
  context: string,
  program: (input: Readonly<TInput>) => Effect.Effect<TOutput, E, PlatformServices | Scope.Scope>,
  exitCodeOf: (output: Readonly<TOutput>) => 0 | 1,
  makeLayer?: LayerFactory,
): CommandInvoker<TInput, TOutput> {
  return {
    invoke: async (input: Readonly<TInput>, options: Readonly<CommandInvocationOptions> = {}): Promise<CommandExecution<TOutput>> => {
      const link = linkAbortSignals(options.parent?.runtime.signal, options.signal);
      try {
        const exit = await runEffect(
          Effect.suspend(() => program(input)),
          {
            presentation: options.presentation ?? "silent",
            verbose: verboseOf(input),
            context,
            signal: link.signal,
            ...(makeLayer === undefined ? {} : {makeLayer}),
          },
        );
        return toExecution(exit, exitCodeOf);
      } finally {
        link.dispose();
      }
    },
  };
}
