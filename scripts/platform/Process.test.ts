// @vitest-environment node
/**
 * @fileoverview Tests for the Effect `Process` service and its live layer.
 * @module scripts/platform/Process.test
 *
 * @remarks
 * Live cases spawn `process.execPath` (Node) so they behave the same on every OS; the child
 * process is the true external boundary. Output is captured with {@link memorySink}. The signal
 * case replaces the spawner itself (also a true external boundary) because Windows never reports
 * a terminating signal. Every potentially hanging case carries an explicit timeout.
 */

import {mkdtemp, readFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";

import {NodeServices} from "@effect/platform-node";
import {Deferred, Effect, Fiber, Layer, PlatformError, Schedule, Sink as EffectSink, Stream} from "effect";
import {ChildProcess, ChildProcessSpawner} from "effect/process";
import {afterEach, describe, expect, it} from "vitest";

import {layerEnvironment, type EnvironmentSnapshot} from "./Environment.ts";
import {memorySink, outputLayer, Sink, type SinkRecord} from "./Output.ts";
import {
  formatProcessRequest,
  INTERRUPT_GRACE_PERIOD,
  MAX_EVIDENCE_CHARACTERS,
  Process,
  ProcessExited,
  ProcessLive,
  processErrorEvidence,
  ProcessSignalled,
  ProcessSpawnFailed,
  ProcessTimedOut,
  type ProcessError,
  type ProcessOptions,
  type ProcessRequest,
} from "./Process.ts";
import {TerminationSignals, type TerminationSignalsShape} from "./signals.ts";
import {runScoped} from "./testing.ts";

const FIXTURES = resolve(import.meta.dirname, "__fixtures__");
const LIVE_TIMEOUT_MS = 15_000;

const liveSnapshot = (variables: Readonly<Record<string, string | undefined>> = process.env): EnvironmentSnapshot => ({
  variables: {...variables},
  cwd: process.cwd(),
  executablePath: process.execPath,
  platform: process.platform,
  architecture: process.arch,
  stdinIsTTY: false,
  stdoutIsTTY: false,
  isCI: false,
});

const node = (script: string): ProcessRequest => ({command: process.execPath, args: ["-e", script]});

interface HarnessOptions {
  readonly verbose?: boolean;
  readonly snapshot?: EnvironmentSnapshot;
  readonly sink?: Layer.Layer<Sink>;
  readonly spawner?: Layer.Layer<ChildProcessSpawner.ChildProcessSpawner>;
}

/**
 * Builds the live `Process` layer over a memory sink, human output, and the given environment.
 *
 * @param options - Verbosity, environment, sink, and spawner overrides.
 * @returns The layer and an accessor over the recorded sink output.
 */
function harness(options: HarnessOptions = {}): {
  readonly layer: Layer.Layer<Process>;
  readonly records: () => readonly SinkRecord[];
} {
  const sink = memorySink();
  const output = outputLayer({mode: "human", verbose: options.verbose ?? false, color: false, context: "test"}).pipe(
    Layer.provide(options.sink ?? sink.layer),
  );
  const layer = ProcessLive.pipe(
    Layer.provideMerge(Layer.mergeAll(output, layerEnvironment(options.snapshot ?? liveSnapshot()), options.spawner ?? NodeServices.layer)),
  );
  return {layer, records: sink.records};
}

/**
 * Runs a request through the live layer and returns the typed failure.
 *
 * @param request - The request expected to fail.
 * @param options - Process options.
 * @param layer - The layer to run against.
 * @returns The typed process failure.
 */
async function failureOf(
  request: ProcessRequest,
  options: Parameters<Process["Service"]["run"]>[1],
  layer: Layer.Layer<Process> = harness().layer,
): Promise<ProcessError> {
  return runScoped(Effect.flatMap(Process, (service) => service.run(request, options)).pipe(Effect.flip), layer);
}

const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

/**
 * Waits up to three seconds for every process to exit.
 *
 * @param pids - The processes to watch.
 * @returns A promise that settles once they exited or the deadline passed.
 */
async function waitUntilDead(pids: readonly number[]): Promise<void> {
  const deadline = Date.now() + 3000;
  while (pids.some(isAlive) && Date.now() < deadline) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
}

describe("Process", () => {
  const spawnedPids: number[] = [];

  afterEach(() => {
    for (const pid of spawnedPids.splice(0)) {
      if (isAlive(pid)) {
        process.kill(pid);
      }
    }
  });

  it(
    "captures stdout of a successful process",
    async () => {
      // Arrange
      const {layer} = harness();

      // Act
      const result = await runScoped(
        Effect.flatMap(Process, (service) => service.run(node("process.stdout.write('ok')"))),
        layer,
      );

      // Assert
      expect(result).toMatchObject({stdout: "ok", stderr: ""});
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "fails with ProcessExited carrying the exit code",
    async () => {
      // Arrange
      const request = node("process.stdout.write('out'); process.stderr.write('err'); process.exit(3)");

      // Act
      const error = await failureOf(request, {});

      // Assert
      expect(error).toBeInstanceOf(ProcessExited);
      expect(error).toMatchObject({
        _tag: "ProcessExited",
        exitCode: 3,
        command: formatProcessRequest(request),
        stdout: "out",
        stderr: "err",
        message: `${formatProcessRequest(request)} exited with code 3`,
      });
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "bounds evidence to the last 2,000 characters",
    async () => {
      // Arrange
      const request = node("process.stderr.write('a'.repeat(5000)+'END'); process.exit(1)");

      // Act
      const error = await failureOf(request, {});

      // Assert
      expect(MAX_EVIDENCE_CHARACTERS).toBe(2000);
      expect(error.stderr).toHaveLength(2000);
      expect(error.stderr.endsWith("END")).toBe(true);
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "keeps the full captured output of a failure when failureOutput is full",
    async () => {
      // Arrange
      const request = node("process.stdout.write('o'.repeat(5000)); process.stderr.write('e'.repeat(3000)); process.exit(1)");

      // Act
      const error = await failureOf(request, {failureOutput: "full"});

      // Assert
      expect(error).toBeInstanceOf(ProcessExited);
      expect(error.stdout).toHaveLength(5000);
      expect(error.stderr).toHaveLength(3000);
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "fails with ProcessSpawnFailed for a missing command",
    async () => {
      // Arrange
      const request: ProcessRequest = {command: "definitely-not-a-command-xyz", args: []};

      // Act
      const error = await failureOf(request, {});

      // Assert
      expect(error).toBeInstanceOf(ProcessSpawnFailed);
      expect(error).toMatchObject({_tag: "ProcessSpawnFailed", reason: "ENOENT", command: "definitely-not-a-command-xyz"});
      expect(error.message.startsWith("definitely-not-a-command-xyz failed to start")).toBe(true);
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "times out",
    async () => {
      // Arrange
      const request = node("process.stdout.write('started'); setInterval(()=>{},1000)");

      // Act
      const error = await failureOf(request, {timeout: "200 millis"});

      // Assert
      expect(error).toBeInstanceOf(ProcessTimedOut);
      expect(error).toMatchObject({
        _tag: "ProcessTimedOut",
        timeoutMs: 200,
        message: `${formatProcessRequest(request)} timed out after 200 ms`,
      });
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "writes input to stdin",
    async () => {
      // Arrange
      const {layer} = harness();

      // Act
      const result = await runScoped(
        Effect.flatMap(Process, (service) => service.run(node("process.stdin.pipe(process.stdout)"), {input: "hi"})),
        layer,
      );

      // Assert
      expect(result.stdout).toBe("hi");
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "writes binary input to stdin",
    async () => {
      // Arrange
      const {layer} = harness();

      // Act
      const result = await runScoped(
        Effect.flatMap(Process, (service) =>
          service.run(node("process.stdin.pipe(process.stdout)"), {input: new TextEncoder().encode("bytes")}),
        ),
        layer,
      );

      // Assert
      expect(result.stdout).toBe("bytes");
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "merges env over the environment snapshot",
    async () => {
      // Arrange
      const {layer} = harness({snapshot: liveSnapshot({...process.env, X: undefined})});

      // Act
      const result = await runScoped(
        Effect.flatMap(Process, (service) => service.run(node("process.stdout.write(process.env.X ?? 'none')"), {env: {X: "1"}})),
        layer,
      );

      // Assert
      expect(result.stdout).toBe("1");
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "unsets a variable whose env override is undefined",
    async () => {
      // Arrange
      const {layer} = harness({snapshot: liveSnapshot({...process.env, X: "leak"})});

      // Act
      const result = await runScoped(
        Effect.flatMap(Process, (service) => service.run(node("process.stdout.write(process.env.X ?? 'none')"), {env: {X: undefined}})),
        layer,
      );

      // Assert
      expect(result.stdout).toBe("none");
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "runs in the requested working directory",
    async () => {
      // Arrange
      const {layer} = harness();

      // Act
      const result = await runScoped(
        Effect.flatMap(Process, (service) => service.run(node("process.stdout.write(process.cwd())"), {cwd: FIXTURES})),
        layer,
      );

      // Assert
      expect(result.stdout).toBe(FIXTURES);
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "fails with ProcessSpawnFailed for a missing working directory",
    async () => {
      // Act
      const error = await failureOf(node("0"), {cwd: resolve(FIXTURES, "does-not-exist")});

      // Assert
      expect(error._tag).toBe("ProcessSpawnFailed");
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "tees output to the presenter",
    async () => {
      // Arrange
      const {layer, records} = harness();

      // Act
      const result = await runScoped(
        Effect.flatMap(Process, (service) => service.run(node("process.stdout.write('t'); process.stderr.write('e')"), {output: "tee"})),
        layer,
      );

      // Assert
      expect(result).toMatchObject({stdout: "t", stderr: "e"});
      expect(records()).toContainEqual({stream: "stdout", text: "t"});
      expect(records()).toContainEqual({stream: "stderr", text: "e"});
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "does not capture inherited output",
    async () => {
      // Arrange
      const {layer, records} = harness();

      // Act
      const result = await runScoped(
        Effect.flatMap(Process, (service) => service.run(node("0"), {output: "inherit"})),
        layer,
      );

      // Assert
      expect(result).toMatchObject({stdout: "", stderr: ""});
      expect(records()).toEqual([]);
    },
    LIVE_TIMEOUT_MS,
  );

  it.each([
    {verbose: true, echoed: true},
    {verbose: false, echoed: false},
  ])(
    "echoes the command only when verbose (verbose: $verbose)",
    async ({verbose, echoed}) => {
      // Arrange
      const {layer, records} = harness({verbose});
      const request = node("0");

      // Act
      await runScoped(
        Effect.flatMap(Process, (service) => service.run(request)),
        layer,
      );

      // Assert
      const echo = records().some((record) => record.text.includes(`$ ${formatProcessRequest(request)}`));
      expect(echo).toBe(echoed);
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "never echoes when echo is false",
    async () => {
      // Arrange
      const {layer, records} = harness({verbose: true});

      // Act
      await runScoped(
        Effect.flatMap(Process, (service) => service.run(node("0"), {echo: false})),
        layer,
      );

      // Assert
      expect(records().some((record) => record.text.includes("$ "))).toBe(false);
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "never echoes environment values",
    async () => {
      // Arrange
      const {layer, records} = harness({verbose: true});

      // Act
      await runScoped(
        Effect.flatMap(Process, (service) => service.run(node("0"), {env: {SECRET_VALUE: "hunter2"}, echo: true})),
        layer,
      );

      // Assert
      expect(records().some((record) => record.text.includes("$ "))).toBe(true);
      expect(records().some((record) => record.text.includes("hunter2"))).toBe(false);
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "kills the whole captured process tree on interruption",
    async () => {
      // Arrange
      const directory = await mkdtemp(join(tmpdir(), "arolariu-process-tree-"));
      const pidFile = join(directory, "pids.txt");
      const {layer} = harness();
      const readPids = Effect.promise(() => readFile(pidFile, "utf8").catch(() => "")).pipe(
        Effect.flatMap((text) => {
          const match = /PARENT=(\d+)\r?\nGRANDCHILD=(\d+)\r?\n/u.exec(text);
          return match === null
            ? Effect.fail("pending" as const)
            : Effect.succeed({parent: Number(match[1]), grandchild: Number(match[2])});
        }),
      );

      // Act
      const pids = await runScoped(
        Effect.gen(function* () {
          const service = yield* Process;
          const fiber = yield* Effect.forkChild(service.run({command: process.execPath, args: [resolve(FIXTURES, "parent.js"), pidFile]}));
          const spawned = yield* readPids.pipe(Effect.retry(Schedule.spaced("50 millis")), Effect.timeout("10 seconds"));
          spawnedPids.push(spawned.parent, spawned.grandchild);
          yield* Fiber.interrupt(fiber);
          return spawned;
        }),
        layer,
      ).finally(() => rm(directory, {recursive: true, force: true}));
      await waitUntilDead([pids.parent, pids.grandchild]);

      // Assert
      expect(isAlive(pids.parent)).toBe(false);
      expect(isAlive(pids.grandchild)).toBe(false);
    },
    LIVE_TIMEOUT_MS,
  );

  it(
    "kills a terminal-attached child at once on a programmatic interruption",
    async () => {
      // Arrange
      const ready = Deferred.makeUnsafe<{readonly parent: number; readonly grandchild: number}>();
      let buffer = "";
      const sink = Layer.succeed(Sink, {
        write: (record: SinkRecord) =>
          Effect.suspend(() => {
            buffer += record.text;
            const match = /PARENT=(\d+)\r?\nGRANDCHILD=(\d+)\r?\n/u.exec(buffer);
            return match === null ? Effect.void : Deferred.succeed(ready, {parent: Number(match[1]), grandchild: Number(match[2])});
          }).pipe(Effect.asVoid),
      });
      const {layer} = harness({sink});

      // Act
      const pids = await runScoped(
        Effect.gen(function* () {
          const service = yield* Process;
          const fiber = yield* Effect.forkChild(
            service.run({command: process.execPath, args: [resolve(FIXTURES, "parent.js")]}, {output: "tee"}),
          );
          const spawned = yield* Deferred.await(ready).pipe(Effect.timeout("10 seconds"));
          spawnedPids.push(spawned.parent, spawned.grandchild);
          yield* Fiber.interrupt(fiber);
          return spawned;
        }),
        layer,
      );
      await waitUntilDead(process.platform === "win32" ? [pids.parent, pids.grandchild] : [pids.parent]);

      // Assert
      expect(isAlive(pids.parent)).toBe(false);
      // Off Windows a terminal-attached child shares this process group, so only `taskkill /T` reaches its descendants.
      if (process.platform === "win32") {
        expect(isAlive(pids.grandchild)).toBe(false);
      }
    },
    LIVE_TIMEOUT_MS,
  );

  it.runIf(process.platform === "win32")(
    "round-trips cmd metacharacters on Windows",
    async () => {
      // Arrange
      const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === "PATH") ?? "PATH";
      const args = ["a b", 'q"uote', "50%", "x^y", "", "trailing\\", 'two\\\\"q', "end\\\\", "safe&echo PWNED"];
      const {layer} = harness();
      const warnings: Error[] = [];
      const onWarning = (warning: Error): void => {
        warnings.push(warning);
      };
      process.on("warning", onWarning);

      // Act
      const result = await runScoped(
        Effect.flatMap(Process, (service) =>
          service.run({command: "echoargs", args}, {env: {[pathKey]: `${FIXTURES};${process.env[pathKey] ?? ""}`}}),
        ),
        layer,
      ).finally(() => {
        process.off("warning", onWarning);
      });

      // Assert
      expect(result.stdout.trimEnd().split(/\r?\n/u)).toEqual([JSON.stringify(args)]);
      expect(result.stdout).not.toMatch(/^PWNED/mu);
      expect(result.stderr).toBe("");
      expect(warnings.map((warning) => warning.name + warning.message).join("\n")).not.toContain("DEP0190");
    },
    LIVE_TIMEOUT_MS,
  );

  it.runIf(process.platform === "win32")(
    "round-trips arguments through a path-qualified cmd shim",
    async () => {
      // Arrange
      const args = ["a b", "safe&echo PWNED"];
      const {layer} = harness();

      // Act
      const result = await runScoped(
        Effect.flatMap(Process, (service) => service.run({command: resolve(FIXTURES, "echoargs.cmd"), args})),
        layer,
      );

      // Assert
      expect(result.stdout.trimEnd().split(/\r?\n/u)).toEqual([JSON.stringify(args)]);
      expect(result.stdout).not.toMatch(/^PWNED/mu);
      expect(result.stderr).toBe("");
    },
    LIVE_TIMEOUT_MS,
  );

  it.each(["first\nsecond", "first\rsecond"])(
    "fails fast without spawning when a shell-routed argument contains a line break (%j)",
    async (argument) => {
      // Arrange
      const command = resolve(FIXTURES, "echoargs.cmd");
      const request: ProcessRequest = {command, args: ["ok", argument]};
      let spawnCalls = 0;
      const spawner = Layer.succeed(
        ChildProcessSpawner.ChildProcessSpawner,
        ChildProcessSpawner.make(() =>
          Effect.sync(() => {
            spawnCalls += 1;
          }).pipe(Effect.andThen(Effect.die(new Error("spawn must not be reached")))),
        ),
      );
      const {layer} = harness({snapshot: {...liveSnapshot(), platform: "win32"}, spawner});

      // Act
      const error = await failureOf(request, {}, layer);

      // Assert
      expect(spawnCalls).toBe(0);
      expect(error).toBeInstanceOf(ProcessSpawnFailed);
      expect(error).toMatchObject({
        _tag: "ProcessSpawnFailed",
        reason: `argument contains a line break, which cmd.exe cannot pass to ${command}`,
        command: formatProcessRequest(request),
        stdout: "",
        stderr: "",
      });
    },
    LIVE_TIMEOUT_MS,
  );

  it("fails with ProcessSignalled when the child is terminated by a signal", async () => {
    // Arrange
    const spawner = Layer.succeed(
      ChildProcessSpawner.ChildProcessSpawner,
      ChildProcessSpawner.make(() =>
        Effect.succeed(
          ChildProcessSpawner.makeHandle({
            pid: ChildProcessSpawner.ProcessId(1),
            exitCode: Effect.fail(
              PlatformError.systemError({
                _tag: "Unknown",
                module: "ChildProcess",
                method: "exitCode",
                cause: new Error("Process interrupted due to receipt of signal: 'SIGKILL'"),
              }),
            ),
            isRunning: Effect.succeed(false),
            kill: () => Effect.void,
            stdin: EffectSink.drain,
            stdout: Stream.make(new TextEncoder().encode("partial")),
            stderr: Stream.empty,
            all: Stream.empty,
            getInputFd: () => EffectSink.drain,
            getOutputFd: () => Stream.empty,
            unref: Effect.succeed(Effect.void),
          }),
        ),
      ),
    );
    const request = node("0");

    // Act
    const error = await failureOf(request, {}, harness({spawner}).layer);

    // Assert
    expect(error).toBeInstanceOf(ProcessSignalled);
    expect(error).toMatchObject({
      _tag: "ProcessSignalled",
      signal: "SIGKILL",
      stdout: "partial",
      message: `${formatProcessRequest(request)} was terminated by SIGKILL`,
    });
  });

  it("dies when input is combined with inherited output", async () => {
    // Arrange
    const {layer} = harness();

    // Act
    const run = runScoped(
      Effect.flatMap(Process, (service) => service.run(node("0"), {output: "inherit", input: "x"})),
      layer,
    );

    // Assert
    await expect(run).rejects.toThrow("Cannot supply input when output is inherited");
  });

  it("dies for an empty command", async () => {
    // Arrange
    const {layer} = harness();

    // Act
    const run = runScoped(
      Effect.flatMap(Process, (service) => service.run({command: "  ", args: []})),
      layer,
    );

    // Assert
    await expect(run).rejects.toThrow("Command cannot be empty");
  });
});

/** A scripted child that never exits on its own unless the test or a kill ends it. */
interface FakeChild {
  /** Spawner layer handing out the child and recording every spawned command. */
  readonly spawner: Layer.Layer<ChildProcessSpawner.ChildProcessSpawner>;
  /** Completes once the child was spawned. */
  readonly spawned: Deferred.Deferred<void>;
  /** The `detached` option of every spawned command. */
  readonly detached: () => readonly (boolean | undefined)[];
  /** Every `kill` request, in order. */
  readonly kills: () => readonly ChildProcess.KillOptions[];
  /** Ends the child with an exit code. */
  readonly exit: (code: number) => Effect.Effect<void>;
}

/**
 * Builds a {@link FakeChild}; its `kill` ends it with code `137`.
 *
 * @returns The fake child.
 */
function fakeChild(): FakeChild {
  const spawned = Deferred.makeUnsafe<void>();
  const exitCode = Deferred.makeUnsafe<number>();
  let running = true;
  const detached: (boolean | undefined)[] = [];
  const kills: ChildProcess.KillOptions[] = [];
  const exit = (code: number): Effect.Effect<void> =>
    Effect.suspend(() => {
      running = false;
      return Deferred.succeed(exitCode, code);
    }).pipe(Effect.asVoid);
  const handle = ChildProcessSpawner.makeHandle({
    pid: ChildProcessSpawner.ProcessId(-1),
    exitCode: Effect.map(Deferred.await(exitCode), (code) => ChildProcessSpawner.ExitCode(code)),
    isRunning: Effect.sync(() => running),
    kill: (options) =>
      Effect.suspend(() => {
        kills.push(options ?? {});
        return exit(137);
      }),
    stdin: EffectSink.drain,
    stdout: Stream.empty,
    stderr: Stream.empty,
    all: Stream.empty,
    getInputFd: () => EffectSink.drain,
    getOutputFd: () => Stream.empty,
    unref: Effect.succeed(Effect.void),
  });
  const spawner = Layer.succeed(
    ChildProcessSpawner.ChildProcessSpawner,
    ChildProcessSpawner.make((command) =>
      Effect.suspend(() => {
        detached.push(command._tag === "StandardCommand" ? command.options.detached : undefined);
        return Deferred.succeed(spawned, undefined);
      }).pipe(Effect.as(handle)),
    ),
  );
  return {spawner, spawned, detached: () => [...detached], kills: () => [...kills], exit};
}

/**
 * Recorded termination signals a test can advance.
 *
 * @param initial - The signals received before the run is interrupted.
 * @returns The view and a function recording one more signal.
 */
function signalsOf(initial: readonly ("SIGINT" | "SIGTERM")[]): {
  readonly signals: TerminationSignalsShape;
  readonly receive: (signal: "SIGINT" | "SIGTERM") => void;
} {
  const received = [...initial];
  return {
    signals: {last: () => received.at(-1), count: () => received.length},
    receive: (signal) => {
      received.push(signal);
    },
  };
}

/**
 * Starts a run against a fake child, interrupts it once spawned, and waits for its finalizers.
 *
 * @param child - The fake child.
 * @param signals - The recorded termination signals.
 * @param options - Process options.
 * @param whileInterrupting - An effect forked just before the interruption (for example a child exit).
 * @returns The milliseconds the interruption took.
 */
async function interruptRun(
  child: FakeChild,
  signals: TerminationSignalsShape,
  options: ProcessOptions,
  whileInterrupting: Effect.Effect<void> = Effect.void,
): Promise<number> {
  return runScoped(
    Effect.gen(function* () {
      const service = yield* Process;
      const fiber = yield* Effect.forkChild(service.run(node("0"), options).pipe(Effect.provideService(TerminationSignals, signals)));
      yield* Deferred.await(child.spawned);
      yield* Effect.forkChild(whileInterrupting);
      const startedAt = Date.now();
      yield* Fiber.interrupt(fiber);
      return Date.now() - startedAt;
    }),
    harness({spawner: child.spawner}).layer,
  );
}

describe("Process terminal attachment and interrupt grace", () => {
  it.each([
    ["capture", undefined],
    ["tee", false],
    ["inherit", false],
  ] as const)("spawns %s children with detached %j", async (output, expected) => {
    // Arrange
    const child = fakeChild();

    // Act
    await interruptRun(child, signalsOf([]).signals, {output});

    // Assert
    expect(child.detached()).toEqual([expected]);
  });

  it("defaults the interrupt grace period to 15 seconds", () => {
    expect(INTERRUPT_GRACE_PERIOD).toBe("15 seconds");
  });

  it.each(["tee", "inherit"] as const)("lets a %s child finish its own Ctrl+C shutdown without a kill", async (output) => {
    // Arrange
    const child = fakeChild();

    // Act
    const elapsed = await interruptRun(
      child,
      signalsOf(["SIGINT"]).signals,
      {output, interruptGracePeriod: "10 seconds"},
      Effect.sleep("200 millis").pipe(Effect.andThen(child.exit(130))),
    );

    // Assert
    expect(child.kills()).toEqual([]);
    expect(elapsed).toBeGreaterThanOrEqual(150);
    expect(elapsed).toBeLessThan(5_000);
  });

  it("terminates a terminal-attached child that outlives the grace period after Ctrl+C", async () => {
    // Arrange
    const child = fakeChild();

    // Act
    const elapsed = await interruptRun(child, signalsOf(["SIGINT"]).signals, {output: "inherit", interruptGracePeriod: "300 millis"});

    // Assert
    expect(child.kills()).toEqual([{killSignal: "SIGTERM", forceKillAfter: "1 second"}]);
    expect(elapsed).toBeGreaterThanOrEqual(250);
  });

  it("ends the grace period at a second Ctrl+C", async () => {
    // Arrange
    const child = fakeChild();
    const {signals, receive} = signalsOf(["SIGINT"]);

    // Act
    const elapsed = await interruptRun(
      child,
      signals,
      {output: "inherit", interruptGracePeriod: "60 seconds"},
      Effect.sleep("200 millis").pipe(Effect.andThen(Effect.sync(() => receive("SIGINT")))),
    );

    // Assert
    expect(child.kills()).toEqual([{killSignal: "SIGTERM", forceKillAfter: "1 second"}]);
    expect(elapsed).toBeLessThan(5_000);
  });

  it("forwards SIGTERM to a terminal-attached child and force-kills it after the grace period", async () => {
    // Arrange
    const child = fakeChild();

    // Act
    await interruptRun(child, signalsOf(["SIGTERM"]).signals, {output: "tee", interruptGracePeriod: "2 seconds"});

    // Assert
    expect(child.kills()).toEqual([{killSignal: "SIGTERM", forceKillAfter: "2 seconds"}]);
  });

  it.each([
    ["a programmatic interruption of an attached child", [], "inherit"],
    ["a Ctrl+C of a captured child", ["SIGINT"], "capture"],
  ] as const)("leaves %s to the spawner's immediate tree kill", async (_label, received, output) => {
    // Arrange
    const child = fakeChild();

    // Act
    const elapsed = await interruptRun(child, signalsOf(received).signals, {output, interruptGracePeriod: "60 seconds"});

    // Assert
    expect(child.kills()).toEqual([]);
    expect(elapsed).toBeLessThan(5_000);
  });
});

describe("formatProcessRequest", () => {
  it("quotes empty, whitespace, and quote-bearing tokens like the legacy runner", () => {
    // Act
    const formatted = formatProcessRequest({command: "npm", args: ["run", "a b", "", 'q"x']});

    // Assert
    expect(formatted).toBe('npm run "a b" "" "q\\"x"');
  });
});

describe("processErrorEvidence", () => {
  const fields = {command: "npm test", durationMs: 1, message: "npm test exited with code 1"};

  it("returns the message followed by non-empty streams", () => {
    // Arrange
    const error = new ProcessExited({...fields, exitCode: 1, stdout: "out", stderr: "err"});

    // Act
    const evidence = processErrorEvidence(error);

    // Assert
    expect(evidence).toEqual(["npm test exited with code 1", "stdout: out", "stderr: err"]);
  });

  it("omits empty streams", () => {
    // Arrange
    const error = new ProcessTimedOut({...fields, timeoutMs: 5, stdout: "", stderr: ""});

    // Act
    const evidence = processErrorEvidence(error);

    // Assert
    expect(evidence).toEqual(["npm test exited with code 1"]);
  });
});
