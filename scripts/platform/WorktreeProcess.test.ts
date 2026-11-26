import {Deferred, Effect, Sink, Stream} from "effect";
import {ChildProcessSpawner} from "effect/process";
import {expect, it} from "vitest";

import {runOwnedWorktreeProcess} from "./WorktreeProcess.ts";

it("drains shutdown diagnostics after requesting cooperative AppHost exit", async () => {
  const lines: string[] = [];
  const {exitCode, killed} = await Effect.runPromise(
    Effect.gen(function* () {
      const stop = yield* Deferred.make<void>();
      const inputClosed = yield* Deferred.make<void>();
      const encoder = new TextEncoder();
      let killed = false;
      const spawner = ChildProcessSpawner.make((command) =>
        Effect.gen(function* () {
          if (command._tag !== "StandardCommand") return yield* Effect.die("Expected a single process");
          expect(command.command).toBe("dotnet");
          expect(command.args).toEqual(["/repo/AppHost.dll", "--run-verified-worktree"]);
          const input = command.options.stdin;
          if (input === undefined || typeof input === "string" || "stream" in input)
            return yield* Effect.die("Expected the cooperative stdin stream");
          yield* Effect.forkChild(Stream.runDrain(input).pipe(Effect.andThen(Deferred.succeed(inputClosed, undefined))));
          return ChildProcessSpawner.makeHandle({
            pid: ChildProcessSpawner.ProcessId(-1),
            exitCode: Deferred.await(inputClosed).pipe(Effect.as(ChildProcessSpawner.ExitCode(1))),
            isRunning: Deferred.isDone(inputClosed).pipe(Effect.map((closed) => !closed)),
            kill: () => Effect.sync(() => (killed = true)).pipe(Effect.asVoid),
            stdin: Sink.drain,
            stdout: Stream.make(encoder.encode("worktree-website-healthy\n")),
            stderr: Stream.fromEffect(
              Deferred.await(inputClosed).pipe(Effect.as(encoder.encode("worktree-failure:OperationCanceledException\n"))),
            ),
            all: Stream.empty,
            getInputFd: () => Sink.drain,
            getOutputFd: () => Stream.empty,
            unref: Effect.succeed(Effect.void),
          });
        }),
      );

      const exitCode = yield* runOwnedWorktreeProcess(
        {command: "dotnet", args: ["/repo/AppHost.dll"]},
        process.cwd(),
        {},
        "{}",
        (line) =>
          Effect.gen(function* () {
            lines.push(line);
            if (line === "worktree-website-healthy") yield* Deferred.succeed(stop, undefined);
          }),
        Deferred.await(stop),
      ).pipe(Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner));
      return {exitCode, killed};
    }),
  );

  expect(exitCode).toBe(1);
  expect(killed).toBe(false);
  expect(lines).toEqual(["worktree-website-healthy", "worktree-failure:OperationCanceledException"]);
});
