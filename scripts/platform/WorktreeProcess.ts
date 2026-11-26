/** @fileoverview Foreground supervisor with cooperative pipe-close shutdown. */
import {Deferred, Effect, Exit, Fiber, Scope, Stream} from "effect";
import {ChildProcess, ChildProcessSpawner} from "effect/process";

/** Starts only the verified native AppHost entrypoint, without sending a PID-based kill on release. */
export function runOwnedWorktreeProcess(
  executable: string,
  cwd: string,
  environment: Readonly<Record<string, string>>,
  startup: string,
  onEvent: (line: string) => Effect.Effect<void>,
  stop: Effect.Effect<void, unknown> = Effect.never,
): Effect.Effect<number, unknown, ChildProcessSpawner.ChildProcessSpawner> {
  return Effect.uninterruptibleMask((restore) =>
    Effect.gen(function* () {
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
      const scope = yield* Scope.make();
      const shutdown = yield* Deferred.make<void>();
      const command = ChildProcess.make(executable, ["--run-verified-worktree"], {
        cwd,
        env: environment,
        extendEnv: false,
        detached: false,
        windowsHide: true,
        stdin: Stream.concat(
          Stream.make(new TextEncoder().encode(`${startup}\n`)),
          Stream.fromEffect(Deferred.await(shutdown)).pipe(Stream.drain),
        ),
        stdout: "pipe",
        stderr: "pipe",
      });
      return yield* Effect.ensuring(
        Effect.gen(function* () {
          const handle = yield* spawner.spawn(command).pipe(
            Scope.provide(scope),
            Effect.tap((child) => child.unref),
          );
          const lines = Stream.splitLines(Stream.decodeText(handle.stdout));
          const errors = Stream.splitLines(Stream.decodeText(handle.stderr));
          const process = Effect.all([handle.exitCode, Stream.runForEach(lines, onEvent), Stream.runForEach(errors, onEvent)], {
            concurrency: "unbounded",
          }).pipe(Effect.map(([code]) => Number(code)));
          // Race the wait, not the readers, so AppHost can still report failures after stdin closes.
          const observer = yield* Effect.forkIn(process, scope);
          const exited = Fiber.join(observer);
          const stopped = Deferred.succeed(shutdown, undefined).pipe(
            Effect.andThen(exited.pipe(Effect.interruptible)),
            Effect.timeout("60 seconds"),
          );
          const outcome = yield* Effect.exit(restore(Effect.raceFirst(exited, stop.pipe(Effect.as("stop" as const)))));
          if (Exit.hasInterrupts(outcome) || (Exit.isSuccess(outcome) && outcome.value === "stop")) return Number(yield* stopped);
          if (Exit.isFailure(outcome)) return yield* Effect.failCause(outcome.cause);
          return typeof outcome.value === "number" ? outcome.value : Number(yield* stopped);
        }),
        Scope.close(scope, Exit.void),
      );
    }),
  );
}
