/**
 * @fileoverview Shared Effect building blocks of the native setup phases.
 * @module scripts/commands/setup/phase-support
 *
 * @remarks
 * Every native setup phase runs its commands through {@link runPhaseCommand}, which applies the
 * setup command defaults (repository root, bounded {@link PHASE_COMMAND_TIMEOUT_MS} timeout, command
 * echo under `--verbose`, full captured output on failure) and turns a process failure into a value
 * the phase classifies; submits its mutations through {@link submitSetupAction}, which turns an
 * action failure into a value and a terminal quit into an interruption; and measures its duration
 * from `Clock` with {@link phaseResult}.
 */

import {Clock, Effect, Terminal} from "effect";

import {Process, type ProcessError, type ProcessOptions, type ProcessRequest} from "../../platform/Process.ts";
import {SetupActions} from "./actions.ts";
import type {SetupAction, SetupActionDisposition, SetupContext, SetupPhaseResult, SetupRequirements} from "./types.ts";

/** Bounded default timeout applied to every setup phase command that does not request its own. */
export const PHASE_COMMAND_TIMEOUT_MS = 120_000;

/** Bounded length of the child output a failed setup command reports. */
const MAX_FAILURE_OUTPUT_LENGTH = 2_000;

/** Per-command overrides of the setup command defaults. */
export interface PhaseCommandOptions {
  /** Working directory; defaults to the repository root. */
  readonly cwd?: string;
  /** Environment overrides. */
  readonly env?: ProcessOptions["env"];
  /** Output mode; defaults to `capture`. */
  readonly output?: ProcessOptions["output"];
  /** Standard input. */
  readonly input?: ProcessOptions["input"];
  /** Time limit in milliseconds; defaults to {@link PHASE_COMMAND_TIMEOUT_MS}. */
  readonly timeoutMs?: number;
}

/** Completed setup phase command: its captured output, or the typed process failure. */
export type PhaseCommandOutcome =
  | {readonly kind: "succeeded"; readonly stdout: string; readonly stderr: string}
  | {readonly kind: "failed"; readonly error: ProcessError; readonly stdout: string; readonly stderr: string};

/**
 * Runs one setup phase command with the setup command defaults.
 *
 * @remarks
 * Defaults: `cwd` is the repository root, the time limit is {@link PHASE_COMMAND_TIMEOUT_MS}, the
 * command is echoed only under `--verbose`, and a failure keeps its whole captured output. Every
 * `ProcessError` becomes a `failed` outcome; an interruption propagates.
 *
 * @param context - The setup context.
 * @param request - The command.
 * @param options - Per-command overrides.
 * @returns The command outcome; never fails.
 */
export function runPhaseCommand(
  context: SetupContext,
  request: ProcessRequest,
  options: PhaseCommandOptions = {},
): Effect.Effect<PhaseCommandOutcome, never, Process> {
  return Effect.gen(function* () {
    const process = yield* Process;
    const processOptions: ProcessOptions = {
      cwd: options.cwd ?? context.paths.root,
      ...(options.env === undefined ? {} : {env: options.env}),
      ...(options.output === undefined ? {} : {output: options.output}),
      ...(options.input === undefined ? {} : {input: options.input}),
      timeout: options.timeoutMs ?? PHASE_COMMAND_TIMEOUT_MS,
      echo: context.options.verbose,
      failureOutput: "full",
    };
    return yield* process.run(request, processOptions).pipe(
      Effect.map(({stdout, stderr}): PhaseCommandOutcome => ({kind: "succeeded", stdout, stderr})),
      Effect.catch((error) => Effect.succeed<PhaseCommandOutcome>({kind: "failed", error, stdout: error.stdout, stderr: error.stderr})),
    );
  });
}

/** Outcome of one submitted setup action: its disposition, or the message of its failure. */
export type SubmittedActionOutcome = {readonly kind: SetupActionDisposition} | {readonly kind: "failed"; readonly message: string};

/**
 * Submits one action to the consent-gated {@link SetupActions} service.
 *
 * @remarks
 * A failure of the action (or of its consent prompt) becomes a `failed` outcome carrying its
 * message, which the phase reports as evidence; a terminal quit at the consent prompt interrupts
 * the setup run, as the legacy prompt cancellation did.
 *
 * @param action - The action.
 * @returns The disposition, or the failure message.
 */
export function submitSetupAction(action: SetupAction): Effect.Effect<SubmittedActionOutcome, never, SetupRequirements> {
  return Effect.gen(function* () {
    const actions = yield* SetupActions;
    return yield* actions.run(action).pipe(
      Effect.map((disposition): SubmittedActionOutcome => ({kind: disposition})),
      Effect.catch((error) =>
        Terminal.isQuitError(error) ? Effect.interrupt : Effect.succeed<SubmittedActionOutcome>({kind: "failed", message: error.message}),
      ),
    );
  });
}

/**
 * Completes a phase result with its elapsed duration.
 *
 * @param startedAt - `Clock.currentTimeMillis` read when the phase started.
 * @param input - The result without its duration.
 * @returns The result; its duration is never negative.
 */
export function phaseResult(startedAt: number, input: Omit<SetupPhaseResult, "durationMs">): Effect.Effect<SetupPhaseResult> {
  return Effect.map(Clock.currentTimeMillis, (now) => ({...input, durationMs: Math.max(0, now - startedAt)}));
}

/**
 * Selects the bounded child output reported for a failed process, as the legacy runner's failure
 * evidence did: standard error, else standard output, else the start failure's message.
 *
 * @param error - The process failure.
 * @param options - `stdout: false` never reports standard output (for a command whose stdout may
 * echo a secret payload).
 * @returns At most 2 000 characters, possibly empty.
 */
export function processFailureOutput(error: ProcessError, options: {readonly stdout?: boolean} = {}): string {
  const candidate =
    error.stderr.length > 0
      ? error.stderr
      : options.stdout !== false && error.stdout.length > 0
        ? error.stdout
        : error._tag === "ProcessSpawnFailed"
          ? error.message
          : "";
  return candidate.slice(0, MAX_FAILURE_OUTPUT_LENGTH);
}
