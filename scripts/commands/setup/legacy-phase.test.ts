// @vitest-environment node
/**
 * @fileoverview Tests for the temporary legacy setup phase adapter.
 * @module scripts/commands/setup/legacy-phase.test
 *
 * @remarks
 * Every case runs a legacy Promise phase through `legacyPhase` over the in-memory harness plus the
 * real `SetupActions` layer, so the views reach the scripted `Process`, `Prompts`, `HttpClient`, and
 * inspection session, and every rendered line is read from the recording sink. Deleted with the
 * adapter in Task 5.5.
 */

import {Deferred, Effect, Exit, Fiber, Layer, Redacted, Terminal} from "effect";
import {describe, expect} from "vitest";

import {createRepositoryPaths} from "../../common/repository-paths.ts";
import type {ProcessOutcome} from "../../common/runner.ts";
import {CommandCancellation, HttpError, type HttpResponse} from "../../common/runtime.ts";
import type {RepositoryInspectionKey, RepositoryInspectionSession} from "../../inspection/repository.ts";
import type {PlatformServices} from "../../platform/layers.ts";
import {ProcessExited, ProcessSignalled, ProcessSpawnFailed, ProcessTimedOut} from "../../platform/Process.ts";
import {Prompts} from "../../platform/Prompts.ts";
import {
  effectTest,
  makeTestLayer,
  repositoryFixtureRoot,
  type ScriptedHttp,
  type ScriptedProcess,
  type TestHarness,
} from "../../platform/testing.ts";
import {setupActionsLayer, type SetupActions} from "./actions.ts";
import {legacyClock, legacyPhase, PHASE_COMMAND_TIMEOUT_MS} from "./legacy-phase.ts";
import {runSetupPhases} from "./runner.ts";
import type {LegacySetupContext, SetupContext, SetupInput, SetupPhaseResult} from "./types.ts";

const paths = createRepositoryPaths(repositoryFixtureRoot);

/** Records every session call and answers every `inspect` as unavailable. */
function recordingSession(calls: string[]): RepositoryInspectionSession {
  return {
    inspect: (key) =>
      Effect.sync(() => {
        calls.push(`inspect:${key}`);
        return {kind: "unavailable", reason: `stub ${key}`, durationMs: 0};
      }),
    invalidate: (...keys: readonly RepositoryInspectionKey[]) =>
      Effect.sync(() => {
        calls.push(`invalidate:${keys.join(",")}`);
      }),
    updateInfrastructureEngine: (engine) =>
      Effect.sync(() => {
        calls.push(`engine:${engine}`);
      }),
  };
}

/** Builds the shared context of one phase run. */
function setupContext(options: Partial<SetupInput> = {}, session: RepositoryInspectionSession = recordingSession([])): SetupContext {
  return {
    options: {verbose: false, dryRun: false, yes: false, ...options},
    paths,
    requirements: {
      node: {major: 24, minor: 0, patch: 0},
      npm: {major: 11, minor: 0, patch: 0},
      dotnet: {major: 10, minor: 0, patch: 0},
      python: {major: 3, minor: 12, patch: 0},
      packages: new Map(),
    },
    inspection: session,
  };
}

/** One succeeded phase result. */
function succeeded(id = "legacy"): SetupPhaseResult {
  return {id, status: "succeeded", summary: `${id} is ready.`, evidence: [], nextActions: [], durationMs: 0};
}

/** Options of one {@link adapterHarness}. */
interface AdapterHarnessOptions {
  readonly processes?: readonly ScriptedProcess[];
  readonly http?: readonly ScriptedHttp[];
  readonly prompts?: readonly (boolean | string)[];
  readonly stdinIsTTY?: boolean;
  readonly input?: Partial<SetupInput>;
}

/** Builds the harness and the layer one adapter run needs. */
function adapterHarness(
  options: AdapterHarnessOptions = {},
): Readonly<{harness: TestHarness; layer: Layer.Layer<SetupActions | PlatformServices>}> {
  const harness = makeTestLayer({
    context: "setup",
    environment: {stdinIsTTY: options.stdinIsTTY ?? false},
    ...(options.processes === undefined ? {} : {processes: options.processes}),
    ...(options.http === undefined ? {} : {http: options.http}),
    ...(options.prompts === undefined ? {} : {prompts: options.prompts}),
  });
  const input: SetupInput = {verbose: false, dryRun: false, yes: false, ...options.input};
  return {harness, layer: setupActionsLayer(input).pipe(Layer.provideMerge(harness.layer))};
}

/** A legacy phase whose body is `run`. */
function legacy(run: (context: LegacySetupContext) => Promise<SetupPhaseResult>): ReturnType<typeof legacyPhase> {
  return legacyPhase({id: "legacy", title: "Legacy phase", required: true, dependsOn: ["before"], run});
}

/** The rendered sink lines as `<stream>: <line>`. */
function lines(harness: Pick<TestHarness, "output">): readonly string[] {
  return harness.output().map(({stream, text}) => `${stream}: ${text.replace(/\n$/u, "")}`);
}

const gitVersion: ScriptedProcess = {
  match: (request) => request.command === "git",
  respond: {stdout: "git version 2.50.0\n", stderr: "", durationMs: 4},
};

describe("legacyPhase", () => {
  effectTest(
    "keeps the id, title, requirement flag, and dependencies",
    () =>
      Effect.sync(() => {
        // Act
        const phase = legacyPhase({id: "x", title: "X", required: false, dependsOn: ["a", "b"], run: async () => succeeded("x")});

        // Assert
        expect({id: phase.id, title: phase.title, required: phase.required, dependsOn: phase.dependsOn}).toEqual({
          id: "x",
          title: "X",
          required: false,
          dependsOn: ["a", "b"],
        });
      }),
    Layer.empty,
  );

  {
    const {harness, layer} = adapterHarness({processes: [gitVersion], prompts: [true], stdinIsTTY: true});
    const observed: unknown[] = [];
    effectTest(
      "runs a legacy phase through the views",
      () =>
        Effect.gen(function* () {
          // Arrange
          const phase = legacy(async (context) => {
            observed.push(await context.runtime.runner.run({command: "git", args: ["--version"]}));
            observed.push(await context.prompts.confirm("Proceed?"));
            return succeeded();
          });

          // Act
          const result = yield* phase.run(setupContext());

          // Assert
          expect(result).toEqual(succeeded());
          expect(observed).toEqual([{kind: "succeeded", exitCode: 0, stdout: "git version 2.50.0\n", stderr: "", durationMs: 4}, true]);
          expect(harness.processCalls()).toEqual([
            {
              request: {command: "git", args: ["--version"]},
              options: {cwd: paths.root, timeout: PHASE_COMMAND_TIMEOUT_MS, echo: false, failureOutput: "full"},
            },
          ]);
        }),
      layer,
    );
  }

  {
    const started = Deferred.makeUnsafe<void>();
    const {harness, layer} = adapterHarness({
      processes: [{match: () => true, respond: () => Effect.andThen(Deferred.succeed(started, undefined), Effect.never)}],
    });
    const observed: unknown[] = [];
    const executed: string[] = [];
    effectTest(
      "maps interruption to a cancelled legacy outcome",
      () =>
        Effect.gen(function* () {
          // Arrange
          const phase = legacy(async (context) => {
            observed.push(await context.runtime.runner.run({command: "npm", args: ["ci"]}));
            observed.push(
              await context.actions
                .run({id: "late", scope: "repository", summary: "Must never run.", execute: async () => void executed.push("late")})
                .catch((error: unknown) => (error instanceof CommandCancellation ? `rejected: ${error.message}` : error)),
            );
            observed.push((await context.runtime.runner.run({command: "npm", args: ["ci"]})).kind);
            return succeeded();
          });

          // Act
          const fiber = yield* Effect.forkChild(phase.run(setupContext()));
          yield* Deferred.await(started);
          yield* Fiber.interrupt(fiber);
          const exit = yield* Fiber.await(fiber);

          // Assert
          expect(Exit.isFailure(exit) && exit.cause.reasons.every((reason) => reason._tag === "Interrupt")).toBe(true);
          expect(observed).toEqual([
            {kind: "cancelled", stdout: "", stderr: "", durationMs: 0},
            "rejected: Setup was interrupted.",
            "cancelled",
          ]);
          expect(executed).toEqual([]);
          expect(harness.output()).toEqual([]);
        }),
      layer,
    );
  }

  {
    const {layer} = adapterHarness({
      processes: [
        {
          match: (request) => request.args[0] === "exited",
          respond: new ProcessExited({command: "x exited", stdout: "o", stderr: "e", durationMs: 1, exitCode: 3, message: "exited"}),
        },
        {
          match: (request) => request.args[0] === "signalled",
          respond: new ProcessSignalled({command: "x", stdout: "", stderr: "", durationMs: 2, signal: "SIGKILL", message: "signalled"}),
        },
        {
          match: (request) => request.args[0] === "spawn",
          respond: new ProcessSpawnFailed({command: "x", stdout: "", stderr: "", durationMs: 3, reason: "ENOENT", message: "spawn"}),
        },
        {
          match: (request) => request.args[0] === "timeout",
          respond: new ProcessTimedOut({command: "x", stdout: "partial", stderr: "", durationMs: 4, timeoutMs: 5, message: "timeout"}),
        },
      ],
    });
    const outcomes: ProcessOutcome[] = [];
    let expectSuccessMessage = "";
    effectTest(
      "maps process failures to the legacy outcome kinds and keeps expectSuccess",
      () =>
        Effect.gen(function* () {
          // Arrange
          const phase = legacy(async ({runtime}) => {
            for (const kind of ["exited", "signalled", "spawn", "timeout"]) {
              // eslint-disable-next-line no-await-in-loop -- the outcomes are recorded in order
              outcomes.push(await runtime.runner.run({command: "x", args: [kind]}));
            }
            await runtime.runner.expectSuccess({command: "x", args: ["exited"]}).catch((error: unknown) => {
              expectSuccessMessage = error instanceof Error ? error.message : String(error);
            });
            return succeeded();
          });

          // Act
          yield* phase.run(setupContext());

          // Assert
          expect(outcomes).toEqual([
            {kind: "exited", exitCode: 3, stdout: "o", stderr: "e", durationMs: 1},
            {kind: "signalled", signal: "SIGKILL", stdout: "", stderr: "", durationMs: 2},
            {kind: "spawn-failed", message: "ENOENT", stdout: "", stderr: "", durationMs: 3},
            {kind: "timed-out", stdout: "partial", stderr: "", durationMs: 4},
          ]);
          expect(expectSuccessMessage).toBe("Process exited with code 3: x exited\ne");
        }),
      layer,
    );
  }

  {
    const {harness, layer} = adapterHarness({processes: [gitVersion], input: {verbose: true}});
    effectTest(
      "honors explicit run options and echoes commands under --verbose",
      () =>
        Effect.gen(function* () {
          // Arrange
          const phase = legacy(async ({runtime}) => {
            await runtime.runner.run(
              {command: "git", args: ["status"]},
              {timeoutMs: 5_000, output: "tee", env: {GIT_TOKEN: "secret-env"}, input: "secret-stdin", cwd: "C:\\elsewhere"},
            );
            return succeeded();
          });

          // Act
          yield* phase.run(setupContext({verbose: true}));

          // Assert
          expect(harness.processCalls()[0]?.options).toEqual({
            cwd: "C:\\elsewhere",
            env: {GIT_TOKEN: "secret-env"},
            output: "tee",
            input: "secret-stdin",
            timeout: 5_000,
            echo: true,
            failureOutput: "full",
          });
          expect(lines(harness)).toEqual(["stdout: git version 2.50.0"]);
        }),
      layer,
    );
  }

  {
    const {layer} = adapterHarness();
    effectTest(
      "maps an ordinary rejection to a failed phase through the runner",
      () =>
        Effect.gen(function* () {
          // Arrange
          const phase = legacy(async () => {
            throw new Error("unexpected legacy failure");
          });
          const ready: ReturnType<typeof legacyPhase> = {
            id: "before",
            title: "Before",
            required: true,
            dependsOn: [],
            run: () => Effect.succeed(succeeded("before")),
          };

          // Act
          const results = yield* runSetupPhases([ready, phase], setupContext());

          // Assert
          expect(results[1]).toEqual({
            id: "legacy",
            status: "failed",
            summary: "'Legacy phase' failed with an unexpected exception.",
            evidence: ["unexpected legacy failure"],
            nextActions: ["Resolve the reported 'Legacy phase' failure, then rerun setup."],
            durationMs: 0,
          });
        }),
      layer,
    );
  }

  for (const [name, rejection] of [
    ["an AbortError", Object.assign(new Error("aborted"), {name: "AbortError"})],
    ["a CommandCancellation", new CommandCancellation("Cancelled.", 143)],
  ] as const) {
    const {layer} = adapterHarness();
    effectTest(
      `interrupts the run when the legacy phase rejects with ${name}`,
      () =>
        Effect.gen(function* () {
          // Arrange
          const phase = legacy(() => Promise.reject(rejection));

          // Act
          const exit = yield* Effect.exit(phase.run(setupContext()));

          // Assert
          expect(Exit.isFailure(exit) && exit.cause.reasons.every((reason) => reason._tag === "Interrupt")).toBe(true);
        }),
      layer,
    );
  }

  {
    const {harness, layer} = adapterHarness({stdinIsTTY: false});
    const observed: unknown[] = [];
    effectTest(
      "resolves defaulted prompts without a TTY and rejects the rest with the legacy non-interactive error",
      () =>
        Effect.gen(function* () {
          // Arrange
          const message = (error: unknown): string => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));
          const phase = legacy(async ({prompts}) => {
            observed.push(await prompts.confirm("Allow?", false));
            observed.push(await prompts.select("Engine?", [{value: "podman", label: "Podman"}], "podman"));
            observed.push(await prompts.confirm("Allow?").catch(message));
            observed.push(await prompts.text("Key?").catch(message));
            observed.push(await prompts.secret("Secret?").catch(message));
            return succeeded();
          });

          // Act
          yield* phase.run(setupContext());

          // Assert
          expect(observed).toEqual([
            false,
            "podman",
            "Error: Cannot request confirmation without an interactive terminal. Re-run setup in a TTY.",
            "Error: Cannot request text input without an interactive terminal. Re-run setup in a TTY.",
            "Error: Cannot request a secret without an interactive terminal. Re-run setup in a TTY.",
          ]);
          expect(harness.output()).toEqual([]);
        }),
      layer,
    );
  }

  {
    const {layer} = adapterHarness({stdinIsTTY: true, prompts: ["visible", "hidden"]});
    const observed: unknown[] = [];
    effectTest(
      "unwraps a secret only at the legacy boundary",
      () =>
        Effect.gen(function* () {
          // Arrange
          const phase = legacy(async ({prompts}) => {
            observed.push(await prompts.text("Key?"), await prompts.secret("Secret?"));
            return succeeded();
          });

          // Act
          yield* phase.run(setupContext());

          // Assert
          expect(observed).toEqual(["visible", "hidden"]);
        }),
      layer,
    );
  }

  {
    const harness = makeTestLayer({context: "setup", environment: {stdinIsTTY: true}});
    const quitting = Prompts.of({
      confirm: () => Effect.fail(new Terminal.QuitError()),
      select: () => Effect.fail(new Terminal.QuitError()),
      text: () => Effect.fail(new Terminal.QuitError()),
      secret: () => Effect.succeed(Redacted.make("")),
    });
    const layer = setupActionsLayer({verbose: false, dryRun: false, yes: false}).pipe(
      Layer.provideMerge(Layer.merge(harness.layer, Layer.succeed(Prompts, quitting))),
    );
    const observed: unknown[] = [];
    const executed: string[] = [];
    effectTest(
      "turns a terminal quit at a consent prompt into an interruption",
      () =>
        Effect.gen(function* () {
          // Arrange: the legacy phase rethrows the prompt AbortError like every real phase does.
          const phase = legacy(async ({actions}) => {
            try {
              await actions.run({id: "sys", scope: "system", summary: "System.", execute: async () => void executed.push("sys")});
            } catch (error: unknown) {
              observed.push(error instanceof Error ? `${error.name}: ${error.message}` : error);
              throw error;
            }
            return succeeded();
          });

          // Act
          const exit = yield* Effect.exit(phase.run(setupContext()));

          // Assert
          expect(Exit.isFailure(exit) && exit.cause.reasons.every((reason) => reason._tag === "Interrupt")).toBe(true);
          expect(observed).toEqual(["AbortError: Prompt cancelled by user."]);
          expect(executed).toEqual([]);
        }),
      layer,
    );
  }

  {
    const {harness, layer} = adapterHarness();
    const failure = new Error("restore failed");
    const observed: unknown[] = [];
    effectTest(
      "runs legacy actions through SetupActions and rejects with the original action failure",
      () =>
        Effect.gen(function* () {
          // Arrange
          const phase = legacy(async ({actions}) => {
            observed.push(await actions.run({id: "ok", scope: "repository", summary: "Works.", execute: async () => undefined}));
            observed.push(await actions.run({id: "sys", scope: "system", summary: "Needs consent.", execute: async () => undefined}));
            observed.push(
              await actions
                .run({id: "bad", scope: "user", summary: "Fails.", execute: () => Promise.reject(failure)})
                .catch((error: unknown) => error === failure),
            );
            return succeeded();
          });

          // Act
          yield* phase.run(setupContext());

          // Assert
          expect(observed).toEqual(["executed", "declined", true]);
          expect(lines(harness)).toEqual([
            "stdout: [arolariu::setup] ✅ Executed setup action 'ok' (repository): Works.",
            "stderr: [arolariu::setup] ⚠️ Declined setup action 'sys' (system): Needs consent.",
          ]);
        }),
      layer,
    );
  }

  {
    const {layer} = adapterHarness();
    const calls: string[] = [];
    const observed: unknown[] = [];
    effectTest(
      "inspects, invalidates, and updates the engine through the shared Effect session",
      () =>
        Effect.gen(function* () {
          // Arrange
          const phase = legacy(async ({inspection}) => {
            observed.push(await inspection.inspect("dotnet"));
            inspection.invalidate("infrastructure", "aggregate");
            inspection.updateInfrastructureEngine("podman");
            return succeeded();
          });

          // Act
          yield* phase.run(setupContext({}, recordingSession(calls)));

          // Assert
          expect(observed).toEqual([{kind: "unavailable", reason: "stub dotnet", durationMs: 0}]);
          expect(calls).toEqual(["inspect:dotnet", "invalidate:infrastructure,aggregate", "engine:podman"]);
        }),
      layer,
    );
  }

  {
    const {layer} = adapterHarness();
    const observed: unknown[] = [];
    effectTest(
      "hands the phase the environment snapshot, the setup logger, and a generation seam that refuses to run",
      () =>
        Effect.gen(function* () {
          // Arrange
          const phase = legacyPhase({
            id: "legacy",
            title: "Legacy",
            required: true,
            dependsOn: [],
            run: async ({runtime, logger}) => {
              observed.push(runtime.environment.stdinIsTTY, runtime.environment.cwd === repositoryFixtureRoot, logger.sanitize("plain"));
              try {
                await runtime.invokeGenerate({verbose: false, env: true, i18n: false, gql: false, artifacts: false});
                observed.push("generated");
              } catch (error: unknown) {
                observed.push(error instanceof Error ? error.message : String(error));
              }
              observed.push(await runtime.files.exists(paths.packageJson), runtime.clock.isoTimestamp());
              return succeeded();
            },
          });

          // Act
          yield* phase.run(setupContext());

          // Assert
          expect(observed).toEqual([
            false,
            true,
            "plain",
            "legacy phases may not invoke generate after cohort 5 Task 5.3",
            false,
            "1970-01-01T00:00:00.000Z",
          ]);
        }),
      layer,
    );
  }

  {
    const {harness, layer} = adapterHarness({
      http: [
        {match: (request) => request.url.endsWith("/ok"), respond: {status: 200, body: "hello", headers: {"x-test": "1"}}},
        {match: (request) => request.url.endsWith("/busy"), respond: {status: 503, body: "busy"}},
        {match: (request) => request.url.endsWith("/large"), respond: {status: 200, body: "0123456789"}},
      ],
    });
    const observed: unknown[] = [];
    effectTest(
      "sends legacy HTTP requests through the Effect client",
      () =>
        Effect.gen(function* () {
          // Arrange
          const describeResponse = (response: HttpResponse): unknown => ({
            status: response.status,
            ok: response.ok,
            header: response.headers["x-test"],
            text: response.text,
          });
          const phase = legacy(async ({runtime}) => {
            observed.push(describeResponse(await runtime.http.request({url: new URL("https://example.test/ok")})));
            observed.push(
              describeResponse(
                await runtime.http.request({
                  url: new URL("https://example.test/busy"),
                  method: "POST",
                  body: "payload",
                  headers: {"content-type": "text/plain"},
                  retry: {attempts: 3, delayMs: 0, statuses: [503]},
                }),
              ),
            );
            observed.push(
              describeResponse(
                await runtime.http.request({
                  url: new URL("https://example.test/busy"),
                  body: new Uint8Array([1]),
                  retry: {attempts: 2, delayMs: 0, statuses: [503]},
                }),
              ),
            );
            observed.push(
              await runtime.http
                .request({url: new URL("https://example.test/large"), maximumResponseBytes: 4, timeoutMs: 1_000})
                .catch((error: unknown) => (error instanceof HttpError ? error.message : error)),
            );
            return succeeded();
          });

          // Act
          yield* phase.run(setupContext());

          // Assert
          expect(observed).toEqual([
            {status: 200, ok: true, header: "1", text: "hello"},
            {status: 503, ok: false, header: undefined, text: "busy"},
            {status: 503, ok: false, header: undefined, text: "busy"},
            "Response exceeded the 4 byte limit.",
          ]);
          // POST is never retried; GET is retried up to its attempt budget.
          expect(harness.httpCalls().map((request) => `${request.method} ${request.url}`)).toEqual([
            "GET https://example.test/ok",
            "POST https://example.test/busy",
            "GET https://example.test/busy",
            "GET https://example.test/busy",
            "GET https://example.test/large",
          ]);
        }),
      layer,
    );
  }
});

describe("legacyClock", () => {
  effectTest(
    "reads the Effect clock and rejects an aborted delay",
    () =>
      Effect.gen(function* () {
        // Arrange
        const clock = yield* legacyClock;
        const controller = new AbortController();
        controller.abort();

        // Act
        const rejection = yield* Effect.promise(() =>
          clock.delay(1_000, controller.signal).then(
            () => "resolved",
            (error: unknown) => (error instanceof Error ? error.name : String(error)),
          ),
        );

        // Assert
        expect(clock.monotonicNow()).toBe(0);
        expect(clock.isoTimestamp()).toBe("1970-01-01T00:00:00.000Z");
        expect(rejection).toBe("AbortError");
        expect(yield* Effect.promise(() => clock.delay(0).then(() => "resolved"))).toBe("resolved");
      }),
    makeTestLayer().layer,
  );
});
