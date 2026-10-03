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

import {resolve} from "node:path";

import {NodeServices} from "@effect/platform-node";
import {Deferred, Effect, Fiber, Layer, PlatformError, Sink as EffectSink, Stream} from "effect";
import {ChildProcessSpawner} from "effect/process";
import {afterEach, describe, expect, it} from "vitest";

import {layerEnvironment, type EnvironmentSnapshot} from "./Environment.ts";
import {memorySink, outputLayer, Sink, type SinkRecord} from "./Output.ts";
import {
  formatProcessRequest,
  MAX_EVIDENCE_CHARACTERS,
  Process,
  ProcessExited,
  ProcessLive,
  processErrorEvidence,
  ProcessSignalled,
  ProcessSpawnFailed,
  ProcessTimedOut,
  type ProcessError,
  type ProcessRequest,
} from "./Process.ts";
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
    "kills the process on interruption",
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
      const deadline = Date.now() + 3000;
      while ((isAlive(pids.parent) || isAlive(pids.grandchild)) && Date.now() < deadline) {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
      }

      // Assert
      expect(isAlive(pids.parent)).toBe(false);
      expect(isAlive(pids.grandchild)).toBe(false);
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
