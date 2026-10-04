/**
 * @fileoverview Test support shared by the native setup phase tests.
 * @module scripts/commands/setup/phase-testing
 *
 * @remarks
 * Builds the services one native setup phase test runs against on top of a `makeTestLayer`
 * harness: request-driven scripted commands with legacy-shaped outcomes, a recording inspection
 * session, a recording or dry-run `SetupActions`, filesystem overrides that inject failures or
 * record mutations, and {@link runPhase}, which runs one phase under a {@link countingClock} so each
 * phase reports the deterministic duration its legacy test clock produced.
 */

import {Cause, Clock, Effect, Exit, FileSystem, Layer} from "effect";
import {vi} from "vitest";

import type {RepositoryInspectionFacts, RepositoryInspectionKey, RepositoryInspectionSession} from "../../inspection/repository.ts";
import type {InspectionOutcome} from "../../inspection/types.ts";
import type {ProbeOutcome} from "../../inspection/probes.ts";
import {ReadOnlyFiles, type ReadOnlyFileSystemShape} from "../../platform/Files.ts";
import type {Presenter} from "../../platform/Output.ts";
import {
  formatProcessRequest,
  Process,
  ProcessExited,
  ProcessSignalled,
  ProcessSpawnFailed,
  ProcessTimedOut,
  type ProcessError,
  type ProcessOptions,
  type ProcessRequest,
  type ProcessResult,
} from "../../platform/Process.ts";
import {Prompts} from "../../platform/Prompts.ts";
import {runScoped, type ScriptedProcess} from "../../platform/testing.ts";
import {SetupActions, setupActionsLayer} from "./actions.ts";
import type {
  SetupAction,
  SetupActionDisposition,
  SetupContext,
  SetupInput,
  SetupPhaseDefinition,
  SetupPhaseResult,
  SetupRequirements,
} from "./types.ts";

/** A scripted command outcome: a probe outcome, or `cancelled` for an interrupted command. */
export type ScriptedCommandOutcome = ProbeOutcome | {readonly kind: "cancelled"};

/**
 * A clock whose `currentTimeMillis` advances by one millisecond on every read.
 *
 * @remarks
 * Reproduces the legacy phase test clock (`monotonicNow: () => elapsed++`): a phase that reads the
 * clock at its start and once more for its result reports `durationMs: 1`. The unsafe reads (log
 * timestamps, spans) never advance it, and `sleep` never completes.
 *
 * @returns A fresh clock starting at `0`.
 */
export function countingClock(): Clock.Clock {
  let elapsed = 0;
  const nanos = (): bigint => BigInt(elapsed) * 1_000_000n;
  return {
    currentTimeMillisUnsafe: () => elapsed,
    currentTimeMillis: Effect.sync(() => elapsed++),
    currentTimeNanosUnsafe: nanos,
    currentTimeNanos: Effect.sync(nanos),
    monotonicTimeNanosUnsafe: nanos,
    monotonicTimeNanos: Effect.sync(nanos),
    sleep: () => Effect.never,
  };
}

/** A clock frozen at `0` whose `sleep` never completes. */
const frozenClock: Clock.Clock = {
  currentTimeMillisUnsafe: () => 0,
  currentTimeMillis: Effect.succeed(0),
  currentTimeNanosUnsafe: () => 0n,
  currentTimeNanos: Effect.succeed(0n),
  monotonicTimeNanosUnsafe: () => 0n,
  monotonicTimeNanos: Effect.succeed(0n),
  sleep: () => Effect.never,
};

/**
 * Re-provides `Process` so every process call observes the {@link frozenClock}: the harness's own
 * timing reads then never advance the {@link countingClock} the phase measures itself with.
 */
const frozenClockProcess: Layer.Layer<Process, never, Process> = Layer.effect(
  Process,
  Effect.map(Effect.service(Process), (process) =>
    Process.of({run: (request, options) => Effect.provideService(process.run(request, options), Clock.Clock, frozenClock)}),
  ),
);

/**
 * Converts a scripted outcome into the `Process.run` result or failure it stands for.
 *
 * @remarks
 * A `spawn-failed` outcome's `message` becomes the failure `message` (the reason is `ENOENT`), as
 * the legacy runner's spawn message became the legacy outcome's; `cancelled` interrupts.
 *
 * @param request - The answered request.
 * @param outcome - The scripted outcome.
 * @returns The process effect.
 */
export function scriptedCommandEffect(
  request: ProcessRequest,
  outcome: ScriptedCommandOutcome,
): Effect.Effect<ProcessResult, ProcessError> {
  if (outcome.kind === "cancelled") {
    return Effect.interrupt;
  }
  const command = formatProcessRequest(request);
  const base = {command, stdout: outcome.stdout, stderr: outcome.stderr, durationMs: outcome.durationMs};
  switch (outcome.kind) {
    case "succeeded":
      return Effect.succeed({stdout: outcome.stdout, stderr: outcome.stderr, durationMs: outcome.durationMs});
    case "exited":
      return Effect.fail(
        new ProcessExited({...base, exitCode: outcome.exitCode, message: `${command} exited with code ${String(outcome.exitCode)}`}),
      );
    case "signalled":
      return Effect.fail(
        new ProcessSignalled({...base, signal: outcome.signal, message: `${command} was terminated by ${outcome.signal}`}),
      );
    case "spawn-failed":
      return Effect.fail(new ProcessSpawnFailed({...base, reason: "ENOENT", message: outcome.message}));
    case "timed-out":
      return Effect.fail(new ProcessTimedOut({...base, timeoutMs: 0, message: `${command} timed out`}));
  }
}

/**
 * Builds a catch-all script answering each request with a scripted outcome.
 *
 * @param respond - Answers one request (and its options).
 * @returns The script.
 */
export function scriptedCommands(respond: (request: ProcessRequest, options: ProcessOptions) => ScriptedCommandOutcome): ScriptedProcess {
  return {
    match: () => true,
    respond: (request, options) => Effect.suspend(() => scriptedCommandEffect(request, respond(request, options))),
  };
}

/** Scripted outcome provider per inspection key. */
export type InspectionProviders = Partial<{
  readonly [K in RepositoryInspectionKey]: () => InspectionOutcome<RepositoryInspectionFacts[K]>;
}>;

/** A recording inspection session and its call recorders. */
export interface RecordingInspection {
  /** The session handed to the phase. */
  readonly session: RepositoryInspectionSession;
  /** Records every `inspect(key)` call. */
  readonly inspect: ReturnType<typeof vi.fn<(key: RepositoryInspectionKey) => void>>;
  /** Records every `invalidate(...keys)` call. */
  readonly invalidate: ReturnType<typeof vi.fn<(...keys: RepositoryInspectionKey[]) => void>>;
  /** Records every `updateInfrastructureEngine(engine)` call. */
  readonly updateInfrastructureEngine: ReturnType<typeof vi.fn<(engine: string) => void>>;
}

/**
 * Builds a recording inspection session that answers each key from `providers`.
 *
 * @param providers - Outcome provider per key; any other key is `unavailable` ("Not exercised by this test.").
 * @returns The session and its recorders.
 */
export function recordingInspection(providers: InspectionProviders = {}): RecordingInspection {
  const inspect = vi.fn<(key: RepositoryInspectionKey) => void>();
  const invalidate = vi.fn<(...keys: RepositoryInspectionKey[]) => void>();
  const updateInfrastructureEngine = vi.fn<(engine: string) => void>();
  const session: RepositoryInspectionSession = {
    inspect: <K extends RepositoryInspectionKey>(key: K) =>
      Effect.sync((): InspectionOutcome<RepositoryInspectionFacts[K]> => {
        inspect(key);
        const provider = providers[key] as (() => InspectionOutcome<RepositoryInspectionFacts[K]>) | undefined;
        return provider === undefined ? {kind: "unavailable", reason: "Not exercised by this test.", durationMs: 0} : provider();
      }),
    invalidate: (...keys) =>
      Effect.sync(() => {
        invalidate(...[...keys]);
      }),
    updateInfrastructureEngine: (engine) =>
      Effect.sync(() => {
        updateInfrastructureEngine(engine);
      }),
  };
  return {session, inspect, invalidate, updateInfrastructureEngine};
}

/** A recording `SetupActions` service and what it observed. */
export interface RecordingActions {
  /** Provides the recording `SetupActions`. */
  readonly layer: Layer.Layer<SetupActions>;
  /** Identifier of every submitted action, in order. */
  readonly actionIds: string[];
  /** Records every submitted action. */
  readonly run: ReturnType<typeof vi.fn<(action: SetupAction) => void>>;
}

/**
 * Builds a recording `SetupActions` that answers each action with a scripted disposition.
 *
 * @param dryRun - Default disposition: `planned` when `true`, otherwise `executed`.
 * @param dispositions - Disposition overrides per action id; only `executed` runs the action.
 * @returns The layer and its recorders.
 */
export function recordingActions(dryRun: boolean, dispositions: Readonly<Record<string, SetupActionDisposition>> = {}): RecordingActions {
  const actionIds: string[] = [];
  const run = vi.fn<(action: SetupAction) => void>();
  const layer = Layer.succeed(
    SetupActions,
    SetupActions.of({
      run: (action) =>
        Effect.gen(function* () {
          run(action);
          actionIds.push(action.id);
          const disposition = dispositions[action.id] ?? (dryRun ? "planned" : "executed");
          if (disposition === "executed") {
            yield* action.execute;
          }
          return disposition;
        }),
    }),
  );
  return {layer, actionIds, run};
}

/** The production dry-run `SetupActions` and the actions it executed. */
export interface DryRunActions {
  /** Provides the production `setupActionsLayer(options)` behind an execution recorder; prompts die. */
  readonly layer: Layer.Layer<SetupActions, never, Presenter>;
  /** Identifier of every action whose `execute` ran. */
  readonly executed: string[];
}

/**
 * Builds the production consent policy (`setupActionsLayer`) for `options`, recording every
 * executed action; any prompt dies with `A dry run must never prompt.`.
 *
 * @param options - The setup input.
 * @returns The layer (which requires the harness `Presenter`) and the executed recorder.
 */
export function productionActions(options: SetupInput): DryRunActions {
  const executed: string[] = [];
  const refuse = (): Effect.Effect<never> => Effect.die(new Error("A dry run must never prompt."));
  const prompts = Prompts.of({confirm: refuse, select: refuse, text: refuse, secret: refuse});
  const layer = Layer.effect(
    SetupActions,
    Effect.map(Effect.service(SetupActions), (actions) =>
      SetupActions.of({
        run: (action) =>
          actions.run({
            ...action,
            execute: Effect.andThen(
              Effect.sync(() => executed.push(action.id)),
              action.execute,
            ),
          }),
      }),
    ),
  ).pipe(Layer.provide(setupActionsLayer(options)), Layer.provide(Layer.succeed(Prompts, prompts)));
  return {layer, executed};
}

/**
 * Overrides members of the harness `ReadOnlyFiles` (for example to inject a failure).
 *
 * @param patch - Builds the overriding members from the harness service.
 * @returns A layer re-providing the patched service.
 */
export function patchReadOnlyFiles(
  patch: (files: ReadOnlyFileSystemShape) => Partial<ReadOnlyFileSystemShape>,
): Layer.Layer<ReadOnlyFiles, never, ReadOnlyFiles> {
  return Layer.effect(
    ReadOnlyFiles,
    Effect.map(Effect.service(ReadOnlyFiles), (files) => ReadOnlyFiles.of({...files, ...patch(files)})),
  );
}

/** Mutating members of the Effect `FileSystem` a recording filesystem observes. */
const MUTATING_FILE_SYSTEM_MEMBERS = [
  "chmod",
  "chown",
  "copy",
  "copyFile",
  "link",
  "makeDirectory",
  "makeTempDirectory",
  "makeTempDirectoryScoped",
  "makeTempFile",
  "makeTempFileScoped",
  "remove",
  "rename",
  "symlink",
  "truncate",
  "utimes",
  "writeFile",
  "writeFileString",
] as const satisfies readonly (keyof FileSystem.FileSystem)[];

/**
 * Records every mutating `FileSystem` call (`<member>: <first argument>`) before delegating.
 *
 * @param mutations - Receives one entry per mutating call.
 * @returns A layer re-providing the recording filesystem.
 */
export function recordingFileSystem(mutations: string[]): Layer.Layer<FileSystem.FileSystem, never, FileSystem.FileSystem> {
  return Layer.effect(
    FileSystem.FileSystem,
    Effect.map(Effect.service(FileSystem.FileSystem), (files) => {
      const patched: Record<string, unknown> = {...files};
      for (const member of MUTATING_FILE_SYSTEM_MEMBERS) {
        const operation = files[member] as (...args: readonly unknown[]) => unknown;
        patched[member] = (...args: readonly unknown[]): unknown => {
          mutations.push(`${member}: ${String(args[0])}`);
          return operation(...args);
        };
      }
      return patched as unknown as FileSystem.FileSystem;
    }),
  );
}

/**
 * Runs one phase under a {@link countingClock} and returns its exit.
 *
 * @param phase - The phase.
 * @param context - The setup context.
 * @param layer - Provides every service the phase requires.
 * @returns The phase exit.
 */
export function runPhaseExit(
  phase: SetupPhaseDefinition,
  context: SetupContext,
  layer: Layer.Layer<SetupRequirements>,
): Promise<Exit.Exit<SetupPhaseResult>> {
  const program = phase.run(context).pipe(Effect.provide(frozenClockProcess), Effect.provideService(Clock.Clock, countingClock()));
  return runScoped(Effect.exit(program), layer);
}

/**
 * Runs one phase under a {@link countingClock}.
 *
 * @param phase - The phase.
 * @param context - The setup context.
 * @param layer - Provides every service the phase requires.
 * @returns The phase result; rejects with the squashed cause of a failed exit.
 */
export async function runPhase(
  phase: SetupPhaseDefinition,
  context: SetupContext,
  layer: Layer.Layer<SetupRequirements>,
): Promise<SetupPhaseResult> {
  const exit = await runPhaseExit(phase, context, layer);
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }
  throw Cause.squash(exit.cause);
}
