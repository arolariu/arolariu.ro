// @vitest-environment node
/**
 * @fileoverview Contract tests for the Effect setup orchestrator and its CLI completion.
 * @module scripts/commands/setup/index.test
 *
 * @remarks
 * Every orchestrator test runs a real `setup` CLI invocation (`runCli` with
 * `makeSetupCommand(runSetupWith(<phases>))`) on the in-memory harness: the filesystem is an
 * in-memory repository fixture, the shared inspection layer records every request and hands out a
 * deterministic session, prompts are scripted (or `PromptsLive` without a TTY), and phases are
 * stubs — Effect stubs, or legacy Promise stubs run through the `legacyPhase` adapter. No test in
 * this file reads the live checkout, spawns a real process, or mutates disk.
 *
 * The R1 characterization pins compare a legacy-shaped view of each run so their expected values
 * stay byte-identical to the legacy command's: `execution` maps the CLI exit and the captured
 * result back to `{status, value, exitCode}`, and `records` maps each sink record to
 * `{stream, text, write}` (`text` without its line terminator; `write` when it had none).
 */

import {resolve} from "node:path";

import {Cause, Deferred, Effect, Exit, Fiber, Layer, Result, Terminal} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import {createRepositoryPaths, type RepositoryPaths} from "../../common/repository-paths.ts";
import type {DotnetFacts} from "../../inspection/dotnet.ts";
import {Inspection, InspectionLayerFactory} from "../../inspection/Inspection.ts";
import type {
  RepositoryInspectionFacts,
  RepositoryInspectionKey,
  RepositoryInspectionRequest,
  RepositoryInspectionSession,
} from "../../inspection/repository.ts";
import type {InspectionOutcome} from "../../inspection/types.ts";
import {exitCodeFor, ReportedFailure} from "../../platform/exit.ts";
import {Prompts, PromptsLive, type PromptsShape} from "../../platform/Prompts.ts";
import {
  makeTestLayer,
  repositoryFixtureRoot,
  type ScriptedInspection,
  type ScriptedProcess,
  type TestHarness,
} from "../../platform/testing.ts";
import {makeSetupCommand} from "./cli.ts";
import {runSetupWith, setupOutcome, setupPhases, type SetupResult} from "./index.ts";
import {legacyPhase} from "./legacy-phase.ts";
import {dotnetSetupPhase} from "./phases/dotnet.ts";
import {infrastructureSetupPhase} from "./phases/infrastructure.ts";
import {pythonSetupPhase} from "./phases/python.ts";
import {reactSetupPhase} from "./phases/react.ts";
import {svelteSetupPhase} from "./phases/svelte.ts";
import {workspaceSetupPhases} from "./phases/workspace.ts";
import type {
  LegacySetupContext,
  SetupContext,
  SetupInput,
  SetupPhaseDefinition,
  SetupPhaseResult,
  SetupRequirements,
  SetupStatus,
} from "./types.ts";

/** Canonical paths of the in-memory repository fixture every orchestrator test resolves. */
const FIXTURE_PATHS: RepositoryPaths = createRepositoryPaths(repositoryFixtureRoot);

/**
 * The in-memory repository fixture the setup program resolves its paths and manifest requirements
 * from, so no orchestrator test reads the live checkout.
 *
 * @param patch - Files overlaid on the seeded manifest sources.
 * @returns The fixture files.
 */
function setupFixtureFiles(patch: Readonly<Record<string, string>> = {}): Readonly<Record<string, string>> {
  return {
    [FIXTURE_PATHS.packageJson]: JSON.stringify({
      name: "@arolariu/monorepo",
      engines: {node: ">=24", npm: ">=11"},
      devDependencies: {},
    }),
    [FIXTURE_PATHS.packageLock]: JSON.stringify({
      lockfileVersion: 3,
      packages: {"": {name: "@arolariu/monorepo", version: "0.0.0", devDependencies: {}}},
    }),
    [resolve(FIXTURE_PATHS.root, ".nvmrc")]: "24\n",
    [resolve(FIXTURE_PATHS.root, ".node-version")]: "24\n",
    [FIXTURE_PATHS.dotnetBuildProps]: "<Project><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>",
    [FIXTURE_PATHS.pythonProject]: '[project]\nrequires-python = ">=3.12"\n',
    ...patch,
  };
}

/** A deterministic Effect inspection session that never resolves a real repository fact. */
function createFakeInspectionSession(): RepositoryInspectionSession {
  return {
    inspect: () => Effect.succeed({kind: "unavailable", reason: "Not exercised by this test.", durationMs: 0}),
    invalidate: () => Effect.void,
    updateInfrastructureEngine: () => Effect.void,
  };
}

/** An inspection layer that records every session request and returns the exact same session every time. */
interface SetupFixtureInspection {
  /** The layer the CLI invocation builds its `Inspection` service from. */
  readonly layer: Layer.Layer<Inspection>;
  /** Every request the setup program asked for, in call order. */
  readonly requests: readonly RepositoryInspectionRequest[];
}

function setupFixtureInspection(session: RepositoryInspectionSession): SetupFixtureInspection {
  const requests: RepositoryInspectionRequest[] = [];
  return {
    layer: Layer.succeed(
      Inspection,
      Inspection.of({
        session: (request) =>
          Effect.sync(() => {
            requests.push(request);
            return session;
          }),
      }),
    ),
    requests,
  };
}

/** One recorded confirmation request. */
interface RecordedConfirmation {
  readonly message: string;
  readonly defaultValue: boolean | undefined;
}

/** Scripted prompts that answer every confirmation with `answer` and record each request. */
function recordingPrompts(answer: boolean): Readonly<{prompts: PromptsShape; confirmations: readonly RecordedConfirmation[]}> {
  const confirmations: RecordedConfirmation[] = [];
  const unexpected = (): Effect.Effect<never> => Effect.die(new Error("Only confirmations are scripted."));
  return {
    prompts: Prompts.of({
      confirm: (message, defaultValue) =>
        Effect.sync(() => {
          confirmations.push({message, defaultValue});
          return answer;
        }),
      select: unexpected,
      text: unexpected,
      secret: unexpected,
    }),
    confirmations,
  };
}

function options(patch: Partial<SetupInput> = {}): SetupInput {
  return {
    verbose: false,
    dryRun: false,
    yes: false,
    ...patch,
  };
}

function phaseResult(id: string, status: SetupStatus, patch: Partial<SetupPhaseResult> = {}): SetupPhaseResult {
  return {
    id,
    status,
    summary: patch.summary ?? `${id}:${status}`,
    evidence: patch.evidence ?? [],
    nextActions: patch.nextActions ?? [],
    durationMs: patch.durationMs ?? 1,
  };
}

/** One Effect stub phase. */
function stubPhase(
  id: string,
  config: Readonly<{
    dependsOn?: readonly string[];
    required?: boolean;
    run?: (context: SetupContext) => Effect.Effect<SetupPhaseResult, never, SetupRequirements>;
  }> = {},
): SetupPhaseDefinition {
  return {
    id,
    title: id,
    required: config.required ?? true,
    dependsOn: config.dependsOn ?? [],
    run: config.run ?? ((): Effect.Effect<SetupPhaseResult> => Effect.succeed(phaseResult(id, "succeeded"))),
  };
}

/** One legacy Promise stub phase, run through the `legacyPhase` adapter. */
function legacyStubPhase(
  id: string,
  run: (context: LegacySetupContext) => Promise<SetupPhaseResult>,
  config: Readonly<{dependsOn?: readonly string[]}> = {},
): SetupPhaseDefinition {
  return legacyPhase({id, title: id, required: true, dependsOn: config.dependsOn ?? [], run});
}

/** Fake phases mirroring the real onboarding graph, without any real phase behavior. */
const setupFixturePhases: readonly SetupPhaseDefinition[] = [
  stubPhase("workspace.prerequisites"),
  stubPhase("workspace.root-dependencies", {dependsOn: ["workspace.prerequisites"]}),
  stubPhase("workspace.github-scripts-dependencies", {dependsOn: ["workspace.prerequisites"]}),
  stubPhase("workspace.generators", {dependsOn: ["workspace.root-dependencies"]}),
  stubPhase("dotnet"),
  stubPhase("react", {dependsOn: ["workspace.root-dependencies", "workspace.generators"]}),
  stubPhase("svelte", {dependsOn: ["workspace.root-dependencies"]}),
  stubPhase("python"),
  stubPhase("infrastructure"),
];

/** Every seam one orchestrator test may replace. */
interface SetupFixtureInput {
  /** Phases to execute; defaults to {@link setupFixturePhases}. */
  readonly phases?: readonly SetupPhaseDefinition[];
  /** Files overlaid on the in-memory repository fixture. */
  readonly files?: Readonly<Record<string, string>>;
  /** Prompts replacing the harness prompts. */
  readonly prompts?: PromptsShape;
  /** Uses the production `PromptsLive` over the harness (non-TTY) instead of scripted prompts. */
  readonly livePrompts?: boolean;
  /** Scripted process responses. */
  readonly processes?: readonly ScriptedProcess[];
  /** Inspection session the shared inspection layer hands out. */
  readonly session?: RepositoryInspectionSession;
  /** Extra global flags, for example `--json`. */
  readonly flags?: readonly string[];
  /** Interrupts the invocation once this deferred completes. */
  readonly interruptWhen?: Deferred.Deferred<void>;
}

/** The legacy-shaped view of one sink record. */
interface LegacyRecord {
  readonly stream: "stdout" | "stderr";
  readonly text: string;
  readonly write: boolean;
}

/** Everything one orchestrator test observes. */
interface SetupRun {
  /** The run mapped to the legacy `{status, value, exitCode}` execution shape. */
  readonly execution: unknown;
  /** The CLI exit code. */
  readonly exitCode: number;
  /** Every sink record in the legacy `{stream, text, write}` shape. */
  readonly records: readonly LegacyRecord[];
  /** Every inspection session request. */
  readonly inspection: readonly RepositoryInspectionRequest[];
  /** The harness, for process calls and raw output. */
  readonly harness: TestHarness;
}

/**
 * Builds the CLI arguments of one setup input.
 *
 * @param input - The setup input.
 * @param flags - Extra global flags.
 * @returns The arguments after the program name.
 */
function setupArgv(input: SetupInput, flags: readonly string[]): readonly string[] {
  return [
    "setup",
    ...(input.dryRun ? ["--dry-run"] : []),
    ...(input.yes ? ["--yes"] : []),
    ...(input.verbose ? ["--verbose"] : []),
    ...(input.engine === undefined ? [] : ["--engine", input.engine]),
    ...flags,
  ];
}

/**
 * Maps a CLI exit and the captured result to the legacy `CommandExecution` shape.
 *
 * @remarks
 * A run that produced its result and then succeeded or failed with the rendered
 * `ReportedFailure` is `completed`; an interruption-only exit is `cancelled`; anything else is
 * `failed` with the first typed failure's (or the defect's) message.
 *
 * @param exit - The CLI exit.
 * @param value - The captured setup result, if the program produced one.
 * @returns The legacy-shaped execution.
 */
function executionOf(exit: Exit.Exit<void, unknown>, value: SetupResult | undefined): unknown {
  const exitCode = exitCodeFor(exit, undefined);
  if (Exit.isSuccess(exit)) {
    return {status: "completed", value, exitCode};
  }
  if (Cause.hasInterruptsOnly(exit.cause)) {
    return {status: "cancelled", exitCode};
  }
  const failure = Cause.findError(exit.cause);
  const error: unknown = Result.isSuccess(failure) ? failure.success : Cause.squash(exit.cause);
  if (value !== undefined && error instanceof ReportedFailure) {
    return {status: "completed", value, exitCode};
  }
  return {status: "failed", exitCode, message: error instanceof Error ? error.message : String(error)};
}

/**
 * Runs one `setup` CLI invocation over the in-memory harness.
 *
 * @param input - The setup input, encoded as CLI flags.
 * @param fixture - Optional seam replacements for this test.
 * @returns The observed run.
 */
async function invokeSetup(input: SetupInput, fixture: Readonly<SetupFixtureInput> = {}): Promise<SetupRun> {
  const harness = makeTestLayer({
    files: setupFixtureFiles(fixture.files),
    ...(fixture.processes === undefined ? {} : {processes: fixture.processes}),
  });
  const inspection = setupFixtureInspection(fixture.session ?? createFakeInspectionSession());
  let captured: SetupResult | undefined;
  const program = (setupInput: SetupInput): ReturnType<ReturnType<typeof runSetupWith>> =>
    runSetupWith(fixture.phases ?? setupFixturePhases)(setupInput).pipe(
      Effect.tap((result) =>
        Effect.sync(() => {
          captured = result;
        }),
      ),
    );

  const invocation = runCli(setupArgv(input, fixture.flags ?? []), makeRootCommand([makeSetupCommand(program)])).pipe(
    Effect.provideService(InspectionLayerFactory, inspection.layer),
  );
  const prompted =
    fixture.prompts !== undefined
      ? invocation.pipe(Effect.provideService(Prompts, fixture.prompts))
      : fixture.livePrompts === true
        ? invocation.pipe(Effect.provide(PromptsLive))
        : invocation;
  const runnable = prompted.pipe(Effect.provide(harness.layer));

  let exit: Exit.Exit<void, unknown>;
  if (fixture.interruptWhen === undefined) {
    exit = await Effect.runPromiseExit(runnable);
  } else {
    const fiber = Effect.runFork(runnable);
    await Effect.runPromise(Deferred.await(fixture.interruptWhen));
    await Effect.runPromise(Fiber.interrupt(fiber));
    exit = await Effect.runPromise(Fiber.await(fiber));
  }

  return {
    execution: executionOf(exit, captured),
    exitCode: exitCodeFor(exit, undefined),
    records: harness.output().map(({stream, text}) => ({
      stream,
      text: text.endsWith("\n") ? text.slice(0, -1) : text,
      write: !text.endsWith("\n"),
    })),
    inspection: inspection.requests,
    harness,
  };
}

function expectCompleted(run: SetupRun): SetupResult {
  const execution = run.execution as {status: string; value?: SetupResult};
  expect(execution.status).toBe("completed");
  if (execution.value === undefined) {
    throw new Error("Setup did not complete.");
  }
  return execution.value;
}

function rendered(run: SetupRun): string {
  return run.records.map((record) => record.text).join("\n");
}

describe("setupPhases", () => {
  it("assembles the exact repository onboarding order", () => {
    expect(setupPhases.map((phase) => phase.id)).toEqual([
      "workspace.prerequisites",
      "workspace.root-dependencies",
      "workspace.github-scripts-dependencies",
      "workspace.generators",
      "dotnet",
      "react",
      "svelte",
      "python",
      "infrastructure",
    ]);
  });

  it("runs the native phases directly and every legacy phase through the adapter with its id, title, requirement flag, and dependencies", () => {
    type PhaseMetadata = Pick<SetupPhaseDefinition, "id" | "title" | "required" | "dependsOn">;
    const metadata = (phase: PhaseMetadata): PhaseMetadata => ({
      id: phase.id,
      title: phase.title,
      required: phase.required,
      dependsOn: phase.dependsOn,
    });
    const nativePhases: readonly SetupPhaseDefinition[] = [...workspaceSetupPhases, dotnetSetupPhase];
    const declaredPhases: readonly PhaseMetadata[] = [
      ...workspaceSetupPhases,
      dotnetSetupPhase,
      reactSetupPhase,
      svelteSetupPhase,
      pythonSetupPhase,
      infrastructureSetupPhase,
    ];

    expect(setupPhases.map(metadata)).toEqual(declaredPhases.map(metadata));
    expect(setupPhases.filter((phase) => nativePhases.includes(phase))).toEqual(nativePhases);
  });
});

describe("runSetup", () => {
  it("runs every declared phase in dependency order without touching the live checkout", async () => {
    const run = await invokeSetup({verbose: false, dryRun: true, yes: false});

    expect(expectCompleted(run).phases.map(({id}) => id)).toEqual([
      "workspace.prerequisites",
      "workspace.root-dependencies",
      "workspace.github-scripts-dependencies",
      "workspace.generators",
      "dotnet",
      "react",
      "svelte",
      "python",
      "infrastructure",
    ]);
    expect(run.exitCode).toBe(0);
    expect(run.harness.files().size).toBe(Object.keys(setupFixtureFiles()).length);
  });

  it("succeeds when every phase reports success", async () => {
    const run = await invokeSetup(options(), {phases: [stubPhase("a"), stubPhase("b", {dependsOn: ["a"]})]});

    expect(expectCompleted(run).phases.map((phase) => phase.status)).toEqual(["succeeded", "succeeded"]);
    expect(run.exitCode).toBe(0);
  });

  it("traverses a dry-run planned dependency to run downstream generators", async () => {
    const ran: string[] = [];
    const run = await invokeSetup(options({dryRun: true}), {
      phases: [
        stubPhase("workspace.root-dependencies", {
          run: () => Effect.succeed(phaseResult("workspace.root-dependencies", "skipped", {summary: "Planned npm restoration."})),
        }),
        stubPhase("workspace.generators", {
          dependsOn: ["workspace.root-dependencies"],
          run: () =>
            Effect.sync(() => {
              ran.push("workspace.generators");
              return phaseResult("workspace.generators", "succeeded");
            }),
        }),
      ],
    });

    expect(ran).toEqual(["workspace.generators"]);
    expect(expectCompleted(run).phases.find(({id}) => id === "workspace.generators")).toMatchObject({status: "succeeded"});
    expect(run.exitCode).toBe(0);
  });

  it("keeps python and infrastructure independent from a failed dotnet phase", async () => {
    const run = await invokeSetup(options(), {
      phases: [
        stubPhase("dotnet", {run: () => Effect.succeed(phaseResult("dotnet", "failed", {summary: "The .NET toolchain failed."}))}),
        stubPhase("python"),
        stubPhase("infrastructure"),
      ],
    });

    const result = expectCompleted(run);
    expect(result.phases.find(({id}) => id === "python")).toMatchObject({status: "succeeded"});
    expect(result.phases.find(({id}) => id === "infrastructure")).toMatchObject({status: "succeeded"});
    expect(run.exitCode).toBe(1);
  });

  it("skips generators, react, and svelte when the workspace root dependency fails", async () => {
    const run = await invokeSetup(options(), {
      phases: [
        stubPhase("workspace.root-dependencies", {
          run: () => Effect.succeed(phaseResult("workspace.root-dependencies", "failed", {summary: "npm ci failed."})),
        }),
        stubPhase("workspace.generators", {dependsOn: ["workspace.root-dependencies"]}),
        stubPhase("react", {dependsOn: ["workspace.root-dependencies", "workspace.generators"]}),
        stubPhase("svelte", {dependsOn: ["workspace.root-dependencies"]}),
      ],
    });

    const {phases} = expectCompleted(run);
    for (const id of ["workspace.generators", "react", "svelte"]) {
      expect(phases.find((phase) => phase.id === id)).toMatchObject({
        status: "skipped",
        summary: expect.stringContaining("workspace.root-dependencies"),
      });
    }
  });

  it("does not skip react or svelte when only the .github scripts dependency fails", async () => {
    const run = await invokeSetup(options(), {
      phases: [
        stubPhase("workspace.root-dependencies"),
        stubPhase("workspace.github-scripts-dependencies", {
          run: () =>
            Effect.succeed(phaseResult("workspace.github-scripts-dependencies", "failed", {summary: ".github scripts npm ci failed."})),
        }),
        stubPhase("react", {dependsOn: ["workspace.root-dependencies"]}),
        stubPhase("svelte", {dependsOn: ["workspace.root-dependencies"]}),
      ],
    });

    const {phases} = expectCompleted(run);
    expect(phases.find(({id}) => id === "react")).toMatchObject({status: "succeeded"});
    expect(phases.find(({id}) => id === "svelte")).toMatchObject({status: "succeeded"});
  });

  it("completes with exit code 0 for a degraded capability", async () => {
    const run = await invokeSetup(options(), {
      phases: [
        stubPhase("react", {run: () => Effect.succeed(phaseResult("react", "degraded", {summary: "Clerk credentials are unavailable."}))}),
      ],
    });

    expect(expectCompleted(run).phases[0]).toMatchObject({status: "degraded"});
    expect(run.exitCode).toBe(0);
  });

  it("completes with exit code 1 for a required failure", async () => {
    const run = await invokeSetup(options(), {phases: [stubPhase("dotnet", {run: () => Effect.succeed(phaseResult("dotnet", "failed"))})]});

    expect(run.exitCode).toBe(1);
  });

  it("blocks a phase whose dependency was never defined", async () => {
    const run = await invokeSetup(options(), {phases: [stubPhase("react", {dependsOn: ["workspace.root-dependencies"]})]});

    expect(expectCompleted(run).phases[0]).toMatchObject({
      status: "skipped",
      summary: expect.stringContaining("workspace.root-dependencies"),
    });
    expect(run.exitCode).toBe(1);
  });

  it("converts an ordinary thrown legacy exception into a failed result and continues with independent phases", async () => {
    const run = await invokeSetup(options(), {
      phases: [
        legacyStubPhase("dotnet", (): Promise<SetupPhaseResult> => {
          throw new Error("unexpected dotnet failure");
        }),
        stubPhase("python"),
      ],
    });

    const result = expectCompleted(run);
    expect(result.phases.find(({id}) => id === "python")).toMatchObject({status: "succeeded"});
    expect(result.phases.find(({id}) => id === "dotnet")).toMatchObject({
      status: "failed",
      evidence: expect.arrayContaining([expect.stringContaining("unexpected dotnet failure")]),
    });
    expect(run.exitCode).toBe(1);
  });

  it("cancels the command when a legacy phase aborts instead of degrading it to a failed phase", async () => {
    const ran: string[] = [];
    const run = await invokeSetup(options(), {
      phases: [
        legacyStubPhase("dotnet", () => Promise.reject(new DOMException("The command was interrupted", "AbortError"))),
        stubPhase("python", {run: () => Effect.sync(() => (ran.push("python"), phaseResult("python", "succeeded")))}),
      ],
    });

    expect(run.execution).toEqual({status: "cancelled", exitCode: 130});
    expect(ran).toEqual([]);
    expect(rendered(run)).not.toContain("Setup summary");
  });

  it("cancels the command when interrupted during a legacy phase that degraded its own cancellation", async () => {
    const started = Deferred.makeUnsafe<void>();
    const ran: string[] = [];
    const outcomes: string[] = [];
    const run = await invokeSetup(options(), {
      interruptWhen: started,
      processes: [{match: () => true, respond: () => Effect.andThen(Deferred.succeed(started, undefined), Effect.never)}],
      phases: [
        // A phase whose runner returned a cancelled outcome reports an ordinary failed result instead of
        // rethrowing; the interruption must still cancel setup.
        legacyStubPhase("dotnet", async (context) => {
          outcomes.push((await context.runtime.runner.run({command: "dotnet", args: ["restore"]})).kind);
          return phaseResult("dotnet", "failed");
        }),
        stubPhase("python", {run: () => Effect.sync(() => (ran.push("python"), phaseResult("python", "succeeded")))}),
      ],
    });

    expect(run.execution).toEqual({status: "cancelled", exitCode: 130});
    expect(outcomes).toEqual(["cancelled"]);
    expect(ran).toEqual([]);
    expect(rendered(run)).not.toContain("Setup summary");
    expect(rendered(run)).not.toContain("Setup is ready");
  });

  it("cancels the command when a setup prompt is quit", async () => {
    const executed: string[] = [];
    const {prompts} = recordingPrompts(true);
    const run = await invokeSetup(options(), {
      prompts: {...prompts, confirm: () => Effect.fail(new Terminal.QuitError())},
      phases: [
        legacyStubPhase("infrastructure", async (context) => {
          await context.actions.run({
            id: "infrastructure.install",
            scope: "system",
            summary: "Install the container engine.",
            execute: async () => void executed.push("infrastructure.install"),
          });
          return phaseResult("infrastructure", "succeeded");
        }),
      ],
    });

    expect(run.execution).toEqual({status: "cancelled", exitCode: 130});
    expect(executed).toEqual([]);
  });

  it("executes a system-scoped phase action without prompting under --yes", async () => {
    const executed: string[] = [];
    const {prompts, confirmations} = recordingPrompts(false);
    const run = await invokeSetup(options({yes: true}), {
      prompts,
      phases: [
        legacyStubPhase("infrastructure", async (context) => {
          await context.actions.run({
            id: "infrastructure.install",
            scope: "system",
            summary: "Install the container engine.",
            execute: async () => void executed.push("infrastructure.install"),
          });
          return phaseResult("infrastructure", "succeeded");
        }),
      ],
    });

    expect(expectCompleted(run).phases[0]).toMatchObject({status: "succeeded"});
    expect(executed).toEqual(["infrastructure.install"]);
    expect(confirmations).toEqual([]);
  });

  it("plans a phase action without executing it during a dry run, even under --yes", async () => {
    const executed: string[] = [];
    const run = await invokeSetup(options({dryRun: true, yes: true}), {
      phases: [
        legacyStubPhase("infrastructure", async (context) => {
          const disposition = await context.actions.run({
            id: "infrastructure.install",
            scope: "system",
            summary: "Install the container engine.",
            execute: async () => void executed.push("infrastructure.install"),
          });
          return phaseResult("infrastructure", disposition === "planned" ? "skipped" : "succeeded");
        }),
      ],
    });

    expect(expectCompleted(run).phases[0]).toMatchObject({status: "skipped"});
    expect(executed).toEqual([]);
    expect(run.exitCode).toBe(0);
  });

  it("constructs one full inspection session shared by every setup phase", async () => {
    const received: RepositoryInspectionSession[] = [];
    const session = createFakeInspectionSession();
    const recordingPhase = (id: string, dependsOn: readonly string[] = []): SetupPhaseDefinition =>
      stubPhase(id, {
        dependsOn,
        run: (context) =>
          Effect.sync(() => {
            received.push(context.inspection);
            return phaseResult(id, "succeeded");
          }),
      });
    const run = await invokeSetup(options(), {session, phases: [recordingPhase("a"), recordingPhase("b", ["a"])]});

    expect(run.inspection).toEqual([{profile: "full", paths: FIXTURE_PATHS}]);
    expect(received).toHaveLength(2);
    expect(received.every((inspection) => inspection === session)).toBe(true);
  });

  it("omits requestedEngine from the inspection request when no engine option is set", async () => {
    const run = await invokeSetup(options(), {phases: [stubPhase("a")]});

    const request = run.inspection[0];
    if (request === undefined) {
      throw new Error("The inspection layer was never asked for a session.");
    }
    expect(Object.hasOwn(request, "requestedEngine")).toBe(false);
  });

  it("passes the requested engine through to the inspection request", async () => {
    const run = await invokeSetup(options({engine: "podman"}), {phases: [stubPhase("a")]});

    expect(run.inspection).toEqual([{profile: "full", paths: FIXTURE_PATHS, requestedEngine: "podman"}]);
  });

  it("fails without constructing an inspection session when repository requirements are invalid", async () => {
    const ran: string[] = [];
    const run = await invokeSetup(options(), {
      phases: [stubPhase("a", {run: () => Effect.sync(() => (ran.push("a"), phaseResult("a", "succeeded")))})],
      files: {[resolve(FIXTURE_PATHS.root, ".nvmrc")]: "22\n"},
    });

    expect(run.execution).toMatchObject({
      status: "failed",
      exitCode: 1,
      message: expect.stringMatching(/^Repository requirements are invalid:/u),
    });
    expect(run.inspection).toHaveLength(0);
    expect(ran).toEqual([]);
  });
});

describe("setup phase command execution", () => {
  function commandPhase(run: (context: LegacySetupContext) => Promise<unknown>): SetupPhaseDefinition {
    return legacyStubPhase("dotnet", async (context) => {
      await run(context);
      return phaseResult("dotnet", "succeeded");
    });
  }

  const succeededProcess: ScriptedProcess = {match: () => true, respond: {stdout: "", stderr: "", durationMs: 0}};

  it("scopes every phase command to the repository root with the bounded default timeout", async () => {
    const run = await invokeSetup(options(), {
      processes: [succeededProcess],
      phases: [commandPhase((context) => context.runtime.runner.run({command: "dotnet", args: ["--version"]}))],
    });

    expect(run.harness.processCalls()).toEqual([
      {
        request: {command: "dotnet", args: ["--version"]},
        options: {cwd: FIXTURE_PATHS.root, timeout: 120_000, echo: false, failureOutput: "full"},
      },
    ]);
  });

  it("preserves an explicit caller timeout instead of the scoped default", async () => {
    const run = await invokeSetup(options(), {
      processes: [succeededProcess],
      phases: [commandPhase((context) => context.runtime.runner.run({command: "dotnet", args: ["--version"]}, {timeoutMs: 5_000}))],
    });

    expect(run.harness.processCalls()[0]?.options).toMatchObject({timeout: 5_000});
  });

  it("keeps the scoped default for a mutation command", async () => {
    const run = await invokeSetup(options(), {
      processes: [succeededProcess],
      phases: [commandPhase((context) => context.runtime.runner.run({command: "npm", args: ["ci"]}, {output: "tee"}))],
    });

    expect(run.harness.processCalls()[0]?.options).toMatchObject({output: "tee", timeout: 120_000});
  });

  it("does not echo command evidence in normal mode", async () => {
    const run = await invokeSetup(options(), {
      processes: [succeededProcess],
      phases: [commandPhase((context) => context.runtime.runner.run({command: "dotnet", args: ["--version"]}))],
    });

    expect(run.harness.processCalls()[0]?.options.echo).toBe(false);
    expect(rendered(run)).not.toContain("dotnet --version");
  });

  it("echoes formatted command evidence in verbose mode without stdin or environment values", async () => {
    const run = await invokeSetup(options({verbose: true}), {
      processes: [succeededProcess],
      phases: [
        commandPhase((context) =>
          context.runtime.runner.run(
            {command: "dotnet", args: ["user-secrets", "set"]},
            {input: "super-secret-stdin-payload", env: {SOME_TOKEN: "super-secret-env-value"}},
          ),
        ),
      ],
    });

    expect(rendered(run)).toContain("[arolariu::setup::dotnet] 🐛 $ dotnet user-secrets set");
    expect(rendered(run)).not.toContain("super-secret-stdin-payload");
    expect(rendered(run)).not.toContain("super-secret-env-value");
  });
});

describe("setup presentation", () => {
  it("renders the exact duration and summary for a completed phase", async () => {
    const run = await invokeSetup(options(), {
      phases: [
        stubPhase("dotnet", {
          run: () => Effect.succeed(phaseResult("dotnet", "succeeded", {summary: "The .NET SDK is ready.", durationMs: 42})),
        }),
      ],
    });

    expect(rendered(run)).toContain("The .NET SDK is ready. (42ms)");
  });

  it("renders the summary table, degraded capabilities, and next actions", async () => {
    const run = await invokeSetup(options(), {
      phases: [
        stubPhase("react", {
          run: () =>
            Effect.succeed(
              phaseResult("react", "degraded", {
                summary: "Clerk credentials are unavailable.",
                nextActions: ["Provide Clerk credentials, then rerun setup."],
              }),
            ),
        }),
      ],
    });

    expect(rendered(run)).toContain("Setup summary");
    expect(rendered(run)).toContain("Degraded capabilities");
    expect(rendered(run)).toContain("Provide Clerk credentials, then rerun setup.");
    expect(rendered(run)).toContain("Setup is ready with degraded capabilities.");
  });

  it("emits verbose dependency-block reasoning naming the unmet dependency and its status", async () => {
    const run = await invokeSetup(options({verbose: true}), {
      phases: [
        stubPhase("workspace.root-dependencies", {
          run: () => Effect.succeed(phaseResult("workspace.root-dependencies", "failed", {summary: "npm ci failed."})),
        }),
        stubPhase("workspace.generators", {dependsOn: ["workspace.root-dependencies"]}),
      ],
    });

    expect(rendered(run)).toContain(
      "[arolariu::setup::workspace.generators] 🐛 Dependency check for 'workspace.generators': Dependency 'workspace.root-dependencies' has status 'failed', not 'succeeded' or 'degraded'.",
    );
  });

  it("does not emit debug-level dependency-block reasoning in normal mode", async () => {
    const run = await invokeSetup(options(), {
      phases: [
        stubPhase("workspace.root-dependencies", {
          run: () => Effect.succeed(phaseResult("workspace.root-dependencies", "failed", {summary: "npm ci failed."})),
        }),
        stubPhase("workspace.generators", {dependsOn: ["workspace.root-dependencies"]}),
      ],
    });

    expect(rendered(run)).not.toContain("🐛");
  });

  it("leaves the summary to the CLI completion, so the setup program alone never renders it", async () => {
    const harness = makeTestLayer({files: setupFixtureFiles(), context: "setup"});
    const inspection = setupFixtureInspection(createFakeInspectionSession());

    const result = await Effect.runPromise(
      runSetupWith([stubPhase("dotnet")])(options()).pipe(Effect.provide(Layer.merge(harness.layer, inspection.layer))),
    );

    expect(setupOutcome(result)).toBe("ready");
    expect(
      harness
        .output()
        .map(({text}) => text)
        .join(""),
    ).not.toContain("Setup summary");
  });

  it("writes the result as the single JSON document under --json", async () => {
    const run = await invokeSetup(options(), {
      flags: ["--json"],
      phases: [stubPhase("dotnet", {run: () => Effect.succeed(phaseResult("dotnet", "failed"))})],
    });

    expect(run.exitCode).toBe(1);
    expect(run.harness.output()).toEqual([
      {stream: "stdout", text: `${JSON.stringify({phases: [phaseResult("dotnet", "failed")]}, null, 2)}\n`},
    ]);
  });
});

describe("setup generation composition", () => {
  it("refuses generation from a legacy phase: only the native workspace phase composes it", async () => {
    const run = await invokeSetup(options(), {
      phases: [
        legacyStubPhase("workspace.generators", async (context) => {
          await context.runtime.invokeGenerate({verbose: false, env: true, i18n: true, gql: true, artifacts: true});
          return phaseResult("workspace.generators", "succeeded");
        }),
      ],
    });

    expect(expectCompleted(run).phases).toEqual([
      {
        id: "workspace.generators",
        status: "failed",
        summary: "'workspace.generators' failed with an unexpected exception.",
        evidence: ["legacy phases may not invoke generate after cohort 5 Task 5.3"],
        nextActions: ["Resolve the reported 'workspace.generators' failure, then rerun setup."],
        durationMs: 0,
      },
    ]);
    expect(run.harness.processCalls()).toEqual([]);
  });
});

describe("setup characterization (pre-Effect migration)", () => {
  function withRootPlaceholder(value: unknown): unknown {
    const escapedRoot = JSON.stringify(FIXTURE_PATHS.root).slice(1, -1);
    return JSON.parse(JSON.stringify(value).split(escapedRoot).join("<root>"));
  }

  /** A scripted prompt service recording every confirmation request and answering `answer`. */
  function scriptedPrompts(answer: boolean): Readonly<{prompts: PromptsShape; confirmations: readonly RecordedConfirmation[]}> {
    return recordingPrompts(answer);
  }

  /**
   * One legacy phase, run through the `legacyPhase` adapter, that submits a repository, a user, and a
   * system action, then reports their dispositions.
   */
  function threeScopeActionPhase(executed: string[]): SetupPhaseDefinition {
    return legacyStubPhase("infrastructure", async (context) => {
      const dispositions: string[] = [];
      for (const scope of ["repository", "user", "system"] as const) {
        const id = `infrastructure.${scope}-action`;
        dispositions.push(
          await context.actions.run({
            id,
            scope,
            summary: `Apply the ${scope} change.`,
            execute: async () => {
              executed.push(id);
            },
          }),
        );
      }
      const status: SetupStatus = dispositions.includes("declined") ? "failed" : dispositions.includes("planned") ? "skipped" : "succeeded";
      return phaseResult("infrastructure", status, {summary: `Dispositions: ${dispositions.join(", ")}.`, durationMs: 5});
    });
  }

  async function invokeThreeScopePhase(
    input: SetupInput,
    prompts: PromptsShape,
  ): Promise<Readonly<{execution: unknown; executed: readonly string[]; records: readonly LegacyRecord[]}>> {
    const executed: string[] = [];
    const run = await invokeSetup(input, {prompts, phases: [threeScopeActionPhase(executed)]});
    return {execution: run.execution, executed, records: run.records};
  }

  it("pins the exact planned action lines, records, and exit code during --dry-run", async () => {
    // Arrange
    const {prompts, confirmations} = scriptedPrompts(true);

    // Act
    const run = await invokeThreeScopePhase(options({dryRun: true}), prompts);
    const observed = withRootPlaceholder({...run, confirmations});

    // Assert
    expect(observed).toEqual({
      execution: {
        status: "completed",
        value: {
          phases: [
            {
              id: "infrastructure",
              status: "skipped",
              summary: "Dispositions: planned, planned, planned.",
              evidence: [],
              nextActions: [],
              durationMs: 5,
            },
          ],
        },
        exitCode: 0,
      },
      executed: [],
      records: [
        {stream: "stdout", text: "arolariu.ro repository setup", write: false},
        {stream: "stdout", text: "Dry run: planning every phase without mutating the repository.", write: false},
        {stream: "stdout", text: "", write: false},
        {stream: "stdout", text: "infrastructure", write: false},
        {stream: "stdout", text: "", write: false},
        {
          stream: "stdout",
          text: "[arolariu::setup] ℹ️ Planned setup action 'infrastructure.repository-action' (repository): Apply the repository change.",
          write: false,
        },
        {
          stream: "stdout",
          text: "[arolariu::setup] ℹ️ Planned setup action 'infrastructure.user-action' (user): Apply the user change.",
          write: false,
        },
        {
          stream: "stdout",
          text: "[arolariu::setup] ℹ️ Planned setup action 'infrastructure.system-action' (system): Apply the system change.",
          write: false,
        },
        {stream: "stderr", text: "[arolariu::setup::infrastructure] ⚠️ Dispositions: planned, planned, planned. (5ms)", write: false},
        {stream: "stdout", text: "", write: false},
        {stream: "stdout", text: "Setup summary", write: false},
        {stream: "stdout", text: "", write: false},
        {stream: "stdout", text: "Phase           Status   Duration  Summary", write: false},
        {stream: "stdout", text: "--------------  -------  --------  ----------------------------------------", write: false},
        {stream: "stdout", text: "infrastructure  skipped  5ms       Dispositions: planned, planned, planned.", write: false},
        {stream: "stdout", text: "Setup is ready.", write: false},
      ],
      confirmations: [],
    });
  });

  it("pins the exact consent prompt, declined system action, and executed actions when consent is refused", async () => {
    // Arrange
    const {prompts, confirmations} = scriptedPrompts(false);

    // Act
    const run = await invokeThreeScopePhase(options(), prompts);
    const observed = withRootPlaceholder({...run, confirmations});

    // Assert
    expect(observed).toEqual({
      execution: {
        status: "completed",
        value: {
          phases: [
            {
              id: "infrastructure",
              status: "failed",
              summary: "Dispositions: executed, executed, declined.",
              evidence: [],
              nextActions: [],
              durationMs: 5,
            },
          ],
        },
        exitCode: 1,
      },
      executed: ["infrastructure.repository-action", "infrastructure.user-action"],
      records: [
        {stream: "stdout", text: "arolariu.ro repository setup", write: false},
        {stream: "stdout", text: "Preparing every required workspace, toolchain, and local dependency.", write: false},
        {stream: "stdout", text: "", write: false},
        {stream: "stdout", text: "infrastructure", write: false},
        {stream: "stdout", text: "", write: false},
        {
          stream: "stdout",
          text: "[arolariu::setup] ✅ Executed setup action 'infrastructure.repository-action' (repository): Apply the repository change.",
          write: false,
        },
        {
          stream: "stdout",
          text: "[arolariu::setup] ✅ Executed setup action 'infrastructure.user-action' (user): Apply the user change.",
          write: false,
        },
        {
          stream: "stderr",
          text: "[arolariu::setup] ⚠️ Declined setup action 'infrastructure.system-action' (system): Apply the system change.",
          write: false,
        },
        {stream: "stderr", text: "[arolariu::setup::infrastructure] ⛔ Dispositions: executed, executed, declined. (5ms)", write: false},
        {stream: "stdout", text: "", write: false},
        {stream: "stdout", text: "Setup summary", write: false},
        {stream: "stdout", text: "", write: false},
        {stream: "stdout", text: "Phase           Status  Duration  Summary", write: false},
        {stream: "stdout", text: "--------------  ------  --------  -------------------------------------------", write: false},
        {stream: "stdout", text: "infrastructure  failed  5ms       Dispositions: executed, executed, declined.", write: false},
        {stream: "stdout", text: "Setup failed. Resolve the reported failures, then rerun setup.", write: false},
      ],
      confirmations: [
        {message: "Allow system setup action 'infrastructure.system-action' (system): Apply the system change.?", defaultValue: false},
      ],
    });
  });

  it("pins the exact consent prompt and executed action lines when consent is granted", async () => {
    // Arrange
    const {prompts, confirmations} = scriptedPrompts(true);

    // Act
    const run = await invokeThreeScopePhase(options(), prompts);
    const observed = withRootPlaceholder({...run, confirmations});

    // Assert
    expect(observed).toEqual({
      execution: {
        status: "completed",
        value: {
          phases: [
            {
              id: "infrastructure",
              status: "succeeded",
              summary: "Dispositions: executed, executed, executed.",
              evidence: [],
              nextActions: [],
              durationMs: 5,
            },
          ],
        },
        exitCode: 0,
      },
      executed: ["infrastructure.repository-action", "infrastructure.user-action", "infrastructure.system-action"],
      records: [
        {stream: "stdout", text: "arolariu.ro repository setup", write: false},
        {stream: "stdout", text: "Preparing every required workspace, toolchain, and local dependency.", write: false},
        {stream: "stdout", text: "", write: false},
        {stream: "stdout", text: "infrastructure", write: false},
        {stream: "stdout", text: "", write: false},
        {
          stream: "stdout",
          text: "[arolariu::setup] ✅ Executed setup action 'infrastructure.repository-action' (repository): Apply the repository change.",
          write: false,
        },
        {
          stream: "stdout",
          text: "[arolariu::setup] ✅ Executed setup action 'infrastructure.user-action' (user): Apply the user change.",
          write: false,
        },
        {
          stream: "stdout",
          text: "[arolariu::setup] ✅ Executed setup action 'infrastructure.system-action' (system): Apply the system change.",
          write: false,
        },
        {stream: "stdout", text: "[arolariu::setup::infrastructure] ✅ Dispositions: executed, executed, executed. (5ms)", write: false},
        {stream: "stdout", text: "", write: false},
        {stream: "stdout", text: "Setup summary", write: false},
        {stream: "stdout", text: "", write: false},
        {stream: "stdout", text: "Phase           Status     Duration  Summary", write: false},
        {stream: "stdout", text: "--------------  ---------  --------  -------------------------------------------", write: false},
        {stream: "stdout", text: "infrastructure  succeeded  5ms       Dispositions: executed, executed, executed.", write: false},
        {stream: "stdout", text: "Setup is ready.", write: false},
      ],
      confirmations: [
        {message: "Allow system setup action 'infrastructure.system-action' (system): Apply the system change.?", defaultValue: false},
      ],
    });
  });

  it("pins the exact executed action lines without any prompt under --yes", async () => {
    // Arrange
    const {prompts, confirmations} = scriptedPrompts(false);

    // Act
    const run = await invokeThreeScopePhase(options({yes: true}), prompts);
    const observed = withRootPlaceholder({...run, confirmations});

    // Assert
    expect(observed).toEqual({
      execution: {
        status: "completed",
        value: {
          phases: [
            {
              id: "infrastructure",
              status: "succeeded",
              summary: "Dispositions: executed, executed, executed.",
              evidence: [],
              nextActions: [],
              durationMs: 5,
            },
          ],
        },
        exitCode: 0,
      },
      executed: ["infrastructure.repository-action", "infrastructure.user-action", "infrastructure.system-action"],
      records: [
        {stream: "stdout", text: "arolariu.ro repository setup", write: false},
        {stream: "stdout", text: "Preparing every required workspace, toolchain, and local dependency.", write: false},
        {stream: "stdout", text: "", write: false},
        {stream: "stdout", text: "infrastructure", write: false},
        {stream: "stdout", text: "", write: false},
        {
          stream: "stdout",
          text: "[arolariu::setup] ✅ Executed setup action 'infrastructure.repository-action' (repository): Apply the repository change.",
          write: false,
        },
        {
          stream: "stdout",
          text: "[arolariu::setup] ✅ Executed setup action 'infrastructure.user-action' (user): Apply the user change.",
          write: false,
        },
        {
          stream: "stdout",
          text: "[arolariu::setup] ✅ Executed setup action 'infrastructure.system-action' (system): Apply the system change.",
          write: false,
        },
        {stream: "stdout", text: "[arolariu::setup::infrastructure] ✅ Dispositions: executed, executed, executed. (5ms)", write: false},
        {stream: "stdout", text: "", write: false},
        {stream: "stdout", text: "Setup summary", write: false},
        {stream: "stdout", text: "", write: false},
        {stream: "stdout", text: "Phase           Status     Duration  Summary", write: false},
        {stream: "stdout", text: "--------------  ---------  --------  -------------------------------------------", write: false},
        {stream: "stdout", text: "infrastructure  succeeded  5ms       Dispositions: executed, executed, executed.", write: false},
        {stream: "stdout", text: "Setup is ready.", write: false},
      ],
      confirmations: [],
    });
  });

  it("pins the non-TTY terminal confirmation contract: a defaulted confirm resolves the default, an undefaulted confirm rejects", async () => {
    // Arrange
    const harness = makeTestLayer();
    const prompts = PromptsLive.pipe(Layer.provide(harness.layer));

    // Act
    const [defaulted, undefaulted] = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* Prompts;
        return [
          yield* service.confirm("Allow system setup action?", false),
          yield* service.confirm("Allow system setup action?").pipe(
            Effect.match({
              onSuccess: (value) => ({kind: "resolved", value}),
              onFailure: (error) => ({kind: "rejected", message: error.message}),
            }),
          ),
        ] as const;
      }).pipe(Effect.provide(prompts)),
    );

    // Assert
    expect(defaulted).toBe(false);
    expect(undefaulted).toEqual({
      kind: "rejected",
      message: "Cannot request confirmation without an interactive terminal. Re-run setup in a TTY.",
    });
    expect(harness.output()).toEqual([]);
  });

  it("pins the exact non-TTY outcome of the real .NET phase's system action without --yes", async () => {
    // Arrange
    const facts: DotnetFacts = {
      executable: {available: true, resolvedPaths: ["/usr/bin/dotnet"]},
      sdks: ["10.0.100"],
      selectedVersion: "10.0.100",
      host: {version: "10.0.0", architecture: "x64", rid: "linux-x64"},
      workloads: [],
      nugetCachePath: "/home/fixture/.nuget/packages",
      solutionIssues: [],
      solutionRestoreIssues: [],
      localTools: [{name: "defaultdocumentation.console", version: "1.2.4"}],
      certificate: {exists: true, trusted: true},
      appHost: {projectExists: true, missingParameterKeys: [], userSecretKeys: []},
    };
    const outcomes: ScriptedInspection = {dotnet: {kind: "available", value: facts, durationMs: 1}};
    const session: RepositoryInspectionSession = {
      ...createFakeInspectionSession(),
      inspect: <K extends RepositoryInspectionKey>(key: K) =>
        Effect.succeed(
          (outcomes[key] as InspectionOutcome<RepositoryInspectionFacts[K]> | undefined) ?? {
            kind: "unavailable",
            reason: "Not exercised by this test.",
            durationMs: 0,
          },
        ),
    };

    // Act: the production `PromptsLive` over a non-interactive stdin, and the real Effect phase.
    const run = await invokeSetup(options(), {livePrompts: true, session, phases: [dotnetSetupPhase]});
    const observed = withRootPlaceholder({
      execution: run.execution,
      commands: run.harness.processCalls().map(({request}) => request),
      records: run.records,
    });

    // Assert
    expect(observed).toEqual({
      execution: {
        status: "completed",
        value: {
          phases: [
            {
              id: "dotnet",
              status: "failed",
              summary: "A required .NET restore action was declined.",
              evidence: ["A listed SDK and selected SDK satisfy >=10.0.0.", "Declined action: dotnet.workload-restore"],
              nextActions: ["Allow required action 'dotnet.workload-restore', then rerun setup."],
              durationMs: 0,
            },
          ],
        },
        exitCode: 1,
      },
      commands: [],
      records: [
        {stream: "stdout", text: "arolariu.ro repository setup", write: false},
        {stream: "stdout", text: "Preparing every required workspace, toolchain, and local dependency.", write: false},
        {stream: "stdout", text: "", write: false},
        {stream: "stdout", text: ".NET toolchain", write: false},
        {stream: "stdout", text: "", write: false},
        {
          stream: "stderr",
          text: "[arolariu::setup] ⚠️ Declined setup action 'dotnet.workload-restore' (system): Restore solution workloads required by the pinned SDK.",
          write: false,
        },
        {stream: "stderr", text: "[arolariu::setup::dotnet] ⛔ A required .NET restore action was declined. (0ms)", write: false},
        {stream: "stdout", text: "  - A listed SDK and selected SDK satisfy >=10.0.0.", write: false},
        {stream: "stdout", text: "  - Declined action: dotnet.workload-restore", write: false},
        {stream: "stdout", text: "", write: false},
        {stream: "stdout", text: "Setup summary", write: false},
        {stream: "stdout", text: "", write: false},
        {stream: "stdout", text: "Phase   Status  Duration  Summary", write: false},
        {stream: "stdout", text: "------  ------  --------  --------------------------------------------", write: false},
        {stream: "stdout", text: "dotnet  failed  0ms       A required .NET restore action was declined.", write: false},
        {stream: "stdout", text: "", write: false},
        {stream: "stdout", text: "Next actions", write: false},
        {stream: "stdout", text: "", write: false},
        {stream: "stdout", text: "1. Allow required action 'dotnet.workload-restore', then rerun setup.", write: false},
        {stream: "stdout", text: "Setup failed. Resolve the reported failures, then rerun setup.", write: false},
      ],
    });
  });

  /**
   * Re-uses the real setup phase graph (ids, titles, requirement flags, and dependencies) with
   * scripted phase bodies, so dependency skipping is pinned against the production graph.
   */
  function realGraphWith(failing: string, ran: string[]): readonly SetupPhaseDefinition[] {
    return setupPhases.map((phase) => ({
      ...phase,
      run: (): Effect.Effect<SetupPhaseResult> =>
        Effect.sync(() => {
          ran.push(phase.id);
          return phase.id === failing
            ? phaseResult(phase.id, "failed", {
                summary: `${phase.title} failed.`,
                evidence: [`${phase.id} evidence.`],
                nextActions: [`Repair ${phase.id}.`],
                durationMs: 3,
              })
            : phaseResult(phase.id, "succeeded", {summary: `${phase.title} is ready.`, durationMs: 2});
        }),
    }));
  }

  it.each(["workspace.prerequisites", "workspace.root-dependencies"])(
    "pins dependency skipping, independent phases, the summary, and the exit code when %s fails",
    async (failing) => {
      // Arrange
      const ran: string[] = [];

      // Act
      const run = await invokeSetup(options({verbose: true}), {phases: realGraphWith(failing, ran)});
      const observed = withRootPlaceholder({execution: run.execution, ran, records: run.records});

      // Assert
      expect(observed).toEqual(
        (
          {
            "workspace.prerequisites": {
              execution: {
                status: "completed",
                value: {
                  phases: [
                    {
                      id: "workspace.prerequisites",
                      status: "failed",
                      summary: "Validate workspace prerequisites failed.",
                      evidence: ["workspace.prerequisites evidence."],
                      nextActions: ["Repair workspace.prerequisites."],
                      durationMs: 3,
                    },
                    {
                      id: "workspace.root-dependencies",
                      status: "skipped",
                      summary:
                        "Skipped 'Validate root workspace dependencies' because dependency 'workspace.prerequisites' did not succeed.",
                      evidence: ["Dependency 'workspace.prerequisites' has status 'failed', not 'succeeded' or 'degraded'."],
                      nextActions: ["Resolve 'workspace.prerequisites', then rerun setup."],
                      durationMs: 0,
                    },
                    {
                      id: "workspace.github-scripts-dependencies",
                      status: "skipped",
                      summary:
                        "Skipped 'Restore GitHub scripts dependencies' because dependency 'workspace.prerequisites' did not succeed.",
                      evidence: ["Dependency 'workspace.prerequisites' has status 'failed', not 'succeeded' or 'degraded'."],
                      nextActions: ["Resolve 'workspace.prerequisites', then rerun setup."],
                      durationMs: 0,
                    },
                    {
                      id: "workspace.generators",
                      status: "skipped",
                      summary: "Skipped 'Generate checkout artifacts' because dependency 'workspace.root-dependencies' did not succeed.",
                      evidence: ["Dependency 'workspace.root-dependencies' has status 'skipped', not 'succeeded' or 'degraded'."],
                      nextActions: ["Resolve 'workspace.root-dependencies', then rerun setup."],
                      durationMs: 0,
                    },
                    {id: "dotnet", status: "succeeded", summary: ".NET toolchain is ready.", evidence: [], nextActions: [], durationMs: 2},
                    {
                      id: "react",
                      status: "skipped",
                      summary: "Skipped 'React workspace' because dependency 'workspace.root-dependencies' did not succeed.",
                      evidence: ["Dependency 'workspace.root-dependencies' has status 'skipped', not 'succeeded' or 'degraded'."],
                      nextActions: ["Resolve 'workspace.root-dependencies', then rerun setup."],
                      durationMs: 0,
                    },
                    {
                      id: "svelte",
                      status: "skipped",
                      summary: "Skipped 'Svelte workspaces' because dependency 'workspace.root-dependencies' did not succeed.",
                      evidence: ["Dependency 'workspace.root-dependencies' has status 'skipped', not 'succeeded' or 'degraded'."],
                      nextActions: ["Resolve 'workspace.root-dependencies', then rerun setup."],
                      durationMs: 0,
                    },
                    {
                      id: "python",
                      status: "succeeded",
                      summary: "Python toolchain is ready.",
                      evidence: [],
                      nextActions: [],
                      durationMs: 2,
                    },
                    {
                      id: "infrastructure",
                      status: "succeeded",
                      summary: "Local infrastructure is ready.",
                      evidence: [],
                      nextActions: [],
                      durationMs: 2,
                    },
                  ],
                },
                exitCode: 1,
              },
              ran: ["workspace.prerequisites", "dotnet", "python", "infrastructure"],
              records: [
                {stream: "stdout", text: "arolariu.ro repository setup", write: false},
                {stream: "stdout", text: "Preparing every required workspace, toolchain, and local dependency.", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Validate workspace prerequisites", write: false},
                {stream: "stdout", text: "", write: false},
                {
                  stream: "stderr",
                  text: "[arolariu::setup::workspace.prerequisites] ⛔ Validate workspace prerequisites failed. (3ms)",
                  write: false,
                },
                {stream: "stdout", text: "  - workspace.prerequisites evidence.", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Validate root workspace dependencies", write: false},
                {stream: "stdout", text: "", write: false},
                {
                  stream: "stdout",
                  text: "[arolariu::setup::workspace.root-dependencies] 🐛 Dependency check for 'Validate root workspace dependencies': Dependency 'workspace.prerequisites' has status 'failed', not 'succeeded' or 'degraded'.",
                  write: false,
                },
                {
                  stream: "stderr",
                  text: "[arolariu::setup::workspace.root-dependencies] ⚠️ Skipped 'Validate root workspace dependencies' because dependency 'workspace.prerequisites' did not succeed. (0ms)",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "  - Dependency 'workspace.prerequisites' has status 'failed', not 'succeeded' or 'degraded'.",
                  write: false,
                },
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Restore GitHub scripts dependencies", write: false},
                {stream: "stdout", text: "", write: false},
                {
                  stream: "stdout",
                  text: "[arolariu::setup::workspace.github-scripts-dependencies] 🐛 Dependency check for 'Restore GitHub scripts dependencies': Dependency 'workspace.prerequisites' has status 'failed', not 'succeeded' or 'degraded'.",
                  write: false,
                },
                {
                  stream: "stderr",
                  text: "[arolariu::setup::workspace.github-scripts-dependencies] ⚠️ Skipped 'Restore GitHub scripts dependencies' because dependency 'workspace.prerequisites' did not succeed. (0ms)",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "  - Dependency 'workspace.prerequisites' has status 'failed', not 'succeeded' or 'degraded'.",
                  write: false,
                },
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Generate checkout artifacts", write: false},
                {stream: "stdout", text: "", write: false},
                {
                  stream: "stdout",
                  text: "[arolariu::setup::workspace.generators] 🐛 Dependency check for 'Generate checkout artifacts': Dependency 'workspace.root-dependencies' has status 'skipped', not 'succeeded' or 'degraded'.",
                  write: false,
                },
                {
                  stream: "stderr",
                  text: "[arolariu::setup::workspace.generators] ⚠️ Skipped 'Generate checkout artifacts' because dependency 'workspace.root-dependencies' did not succeed. (0ms)",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "  - Dependency 'workspace.root-dependencies' has status 'skipped', not 'succeeded' or 'degraded'.",
                  write: false,
                },
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: ".NET toolchain", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "[arolariu::setup::dotnet] ✅ .NET toolchain is ready. (2ms)", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "React workspace", write: false},
                {stream: "stdout", text: "", write: false},
                {
                  stream: "stdout",
                  text: "[arolariu::setup::react] 🐛 Dependency check for 'React workspace': Dependency 'workspace.root-dependencies' has status 'skipped', not 'succeeded' or 'degraded'.",
                  write: false,
                },
                {
                  stream: "stderr",
                  text: "[arolariu::setup::react] ⚠️ Skipped 'React workspace' because dependency 'workspace.root-dependencies' did not succeed. (0ms)",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "  - Dependency 'workspace.root-dependencies' has status 'skipped', not 'succeeded' or 'degraded'.",
                  write: false,
                },
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Svelte workspaces", write: false},
                {stream: "stdout", text: "", write: false},
                {
                  stream: "stdout",
                  text: "[arolariu::setup::svelte] 🐛 Dependency check for 'Svelte workspaces': Dependency 'workspace.root-dependencies' has status 'skipped', not 'succeeded' or 'degraded'.",
                  write: false,
                },
                {
                  stream: "stderr",
                  text: "[arolariu::setup::svelte] ⚠️ Skipped 'Svelte workspaces' because dependency 'workspace.root-dependencies' did not succeed. (0ms)",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "  - Dependency 'workspace.root-dependencies' has status 'skipped', not 'succeeded' or 'degraded'.",
                  write: false,
                },
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Python toolchain", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "[arolariu::setup::python] ✅ Python toolchain is ready. (2ms)", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Local infrastructure", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "[arolariu::setup::infrastructure] ✅ Local infrastructure is ready. (2ms)", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Setup summary", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Phase                                  Status     Duration  Summary", write: false},
                {
                  stream: "stdout",
                  text: "-------------------------------------  ---------  --------  ------------------------------------------------------------------------------------------------------------",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "workspace.prerequisites                failed     3ms       Validate workspace prerequisites failed.",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "workspace.root-dependencies            skipped    0ms       Skipped 'Validate root workspace dependencies' because dependency 'workspace.prerequisites' did not succeed.",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "workspace.github-scripts-dependencies  skipped    0ms       Skipped 'Restore GitHub scripts dependencies' because dependency 'workspace.prerequisites' did not succeed.",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "workspace.generators                   skipped    0ms       Skipped 'Generate checkout artifacts' because dependency 'workspace.root-dependencies' did not succeed.",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "dotnet                                 succeeded  2ms       .NET toolchain is ready.",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "react                                  skipped    0ms       Skipped 'React workspace' because dependency 'workspace.root-dependencies' did not succeed.",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "svelte                                 skipped    0ms       Skipped 'Svelte workspaces' because dependency 'workspace.root-dependencies' did not succeed.",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "python                                 succeeded  2ms       Python toolchain is ready.",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "infrastructure                         succeeded  2ms       Local infrastructure is ready.",
                  write: false,
                },
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Next actions", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "1. Repair workspace.prerequisites.", write: false},
                {stream: "stdout", text: "2. Resolve 'workspace.prerequisites', then rerun setup.", write: false},
                {stream: "stdout", text: "3. Resolve 'workspace.prerequisites', then rerun setup.", write: false},
                {stream: "stdout", text: "4. Resolve 'workspace.root-dependencies', then rerun setup.", write: false},
                {stream: "stdout", text: "5. Resolve 'workspace.root-dependencies', then rerun setup.", write: false},
                {stream: "stdout", text: "6. Resolve 'workspace.root-dependencies', then rerun setup.", write: false},
                {stream: "stdout", text: "Setup failed. Resolve the reported failures, then rerun setup.", write: false},
              ],
            },
            "workspace.root-dependencies": {
              execution: {
                status: "completed",
                value: {
                  phases: [
                    {
                      id: "workspace.prerequisites",
                      status: "succeeded",
                      summary: "Validate workspace prerequisites is ready.",
                      evidence: [],
                      nextActions: [],
                      durationMs: 2,
                    },
                    {
                      id: "workspace.root-dependencies",
                      status: "failed",
                      summary: "Validate root workspace dependencies failed.",
                      evidence: ["workspace.root-dependencies evidence."],
                      nextActions: ["Repair workspace.root-dependencies."],
                      durationMs: 3,
                    },
                    {
                      id: "workspace.github-scripts-dependencies",
                      status: "succeeded",
                      summary: "Restore GitHub scripts dependencies is ready.",
                      evidence: [],
                      nextActions: [],
                      durationMs: 2,
                    },
                    {
                      id: "workspace.generators",
                      status: "skipped",
                      summary: "Skipped 'Generate checkout artifacts' because dependency 'workspace.root-dependencies' did not succeed.",
                      evidence: ["Dependency 'workspace.root-dependencies' has status 'failed', not 'succeeded' or 'degraded'."],
                      nextActions: ["Resolve 'workspace.root-dependencies', then rerun setup."],
                      durationMs: 0,
                    },
                    {id: "dotnet", status: "succeeded", summary: ".NET toolchain is ready.", evidence: [], nextActions: [], durationMs: 2},
                    {
                      id: "react",
                      status: "skipped",
                      summary: "Skipped 'React workspace' because dependency 'workspace.root-dependencies' did not succeed.",
                      evidence: ["Dependency 'workspace.root-dependencies' has status 'failed', not 'succeeded' or 'degraded'."],
                      nextActions: ["Resolve 'workspace.root-dependencies', then rerun setup."],
                      durationMs: 0,
                    },
                    {
                      id: "svelte",
                      status: "skipped",
                      summary: "Skipped 'Svelte workspaces' because dependency 'workspace.root-dependencies' did not succeed.",
                      evidence: ["Dependency 'workspace.root-dependencies' has status 'failed', not 'succeeded' or 'degraded'."],
                      nextActions: ["Resolve 'workspace.root-dependencies', then rerun setup."],
                      durationMs: 0,
                    },
                    {
                      id: "python",
                      status: "succeeded",
                      summary: "Python toolchain is ready.",
                      evidence: [],
                      nextActions: [],
                      durationMs: 2,
                    },
                    {
                      id: "infrastructure",
                      status: "succeeded",
                      summary: "Local infrastructure is ready.",
                      evidence: [],
                      nextActions: [],
                      durationMs: 2,
                    },
                  ],
                },
                exitCode: 1,
              },
              ran: [
                "workspace.prerequisites",
                "workspace.root-dependencies",
                "workspace.github-scripts-dependencies",
                "dotnet",
                "python",
                "infrastructure",
              ],
              records: [
                {stream: "stdout", text: "arolariu.ro repository setup", write: false},
                {stream: "stdout", text: "Preparing every required workspace, toolchain, and local dependency.", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Validate workspace prerequisites", write: false},
                {stream: "stdout", text: "", write: false},
                {
                  stream: "stdout",
                  text: "[arolariu::setup::workspace.prerequisites] ✅ Validate workspace prerequisites is ready. (2ms)",
                  write: false,
                },
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Validate root workspace dependencies", write: false},
                {stream: "stdout", text: "", write: false},
                {
                  stream: "stderr",
                  text: "[arolariu::setup::workspace.root-dependencies] ⛔ Validate root workspace dependencies failed. (3ms)",
                  write: false,
                },
                {stream: "stdout", text: "  - workspace.root-dependencies evidence.", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Restore GitHub scripts dependencies", write: false},
                {stream: "stdout", text: "", write: false},
                {
                  stream: "stdout",
                  text: "[arolariu::setup::workspace.github-scripts-dependencies] ✅ Restore GitHub scripts dependencies is ready. (2ms)",
                  write: false,
                },
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Generate checkout artifacts", write: false},
                {stream: "stdout", text: "", write: false},
                {
                  stream: "stdout",
                  text: "[arolariu::setup::workspace.generators] 🐛 Dependency check for 'Generate checkout artifacts': Dependency 'workspace.root-dependencies' has status 'failed', not 'succeeded' or 'degraded'.",
                  write: false,
                },
                {
                  stream: "stderr",
                  text: "[arolariu::setup::workspace.generators] ⚠️ Skipped 'Generate checkout artifacts' because dependency 'workspace.root-dependencies' did not succeed. (0ms)",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "  - Dependency 'workspace.root-dependencies' has status 'failed', not 'succeeded' or 'degraded'.",
                  write: false,
                },
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: ".NET toolchain", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "[arolariu::setup::dotnet] ✅ .NET toolchain is ready. (2ms)", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "React workspace", write: false},
                {stream: "stdout", text: "", write: false},
                {
                  stream: "stdout",
                  text: "[arolariu::setup::react] 🐛 Dependency check for 'React workspace': Dependency 'workspace.root-dependencies' has status 'failed', not 'succeeded' or 'degraded'.",
                  write: false,
                },
                {
                  stream: "stderr",
                  text: "[arolariu::setup::react] ⚠️ Skipped 'React workspace' because dependency 'workspace.root-dependencies' did not succeed. (0ms)",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "  - Dependency 'workspace.root-dependencies' has status 'failed', not 'succeeded' or 'degraded'.",
                  write: false,
                },
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Svelte workspaces", write: false},
                {stream: "stdout", text: "", write: false},
                {
                  stream: "stdout",
                  text: "[arolariu::setup::svelte] 🐛 Dependency check for 'Svelte workspaces': Dependency 'workspace.root-dependencies' has status 'failed', not 'succeeded' or 'degraded'.",
                  write: false,
                },
                {
                  stream: "stderr",
                  text: "[arolariu::setup::svelte] ⚠️ Skipped 'Svelte workspaces' because dependency 'workspace.root-dependencies' did not succeed. (0ms)",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "  - Dependency 'workspace.root-dependencies' has status 'failed', not 'succeeded' or 'degraded'.",
                  write: false,
                },
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Python toolchain", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "[arolariu::setup::python] ✅ Python toolchain is ready. (2ms)", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Local infrastructure", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "[arolariu::setup::infrastructure] ✅ Local infrastructure is ready. (2ms)", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Setup summary", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Phase                                  Status     Duration  Summary", write: false},
                {
                  stream: "stdout",
                  text: "-------------------------------------  ---------  --------  -------------------------------------------------------------------------------------------------------",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "workspace.prerequisites                succeeded  2ms       Validate workspace prerequisites is ready.",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "workspace.root-dependencies            failed     3ms       Validate root workspace dependencies failed.",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "workspace.github-scripts-dependencies  succeeded  2ms       Restore GitHub scripts dependencies is ready.",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "workspace.generators                   skipped    0ms       Skipped 'Generate checkout artifacts' because dependency 'workspace.root-dependencies' did not succeed.",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "dotnet                                 succeeded  2ms       .NET toolchain is ready.",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "react                                  skipped    0ms       Skipped 'React workspace' because dependency 'workspace.root-dependencies' did not succeed.",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "svelte                                 skipped    0ms       Skipped 'Svelte workspaces' because dependency 'workspace.root-dependencies' did not succeed.",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "python                                 succeeded  2ms       Python toolchain is ready.",
                  write: false,
                },
                {
                  stream: "stdout",
                  text: "infrastructure                         succeeded  2ms       Local infrastructure is ready.",
                  write: false,
                },
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "Next actions", write: false},
                {stream: "stdout", text: "", write: false},
                {stream: "stdout", text: "1. Repair workspace.root-dependencies.", write: false},
                {stream: "stdout", text: "2. Resolve 'workspace.root-dependencies', then rerun setup.", write: false},
                {stream: "stdout", text: "3. Resolve 'workspace.root-dependencies', then rerun setup.", write: false},
                {stream: "stdout", text: "4. Resolve 'workspace.root-dependencies', then rerun setup.", write: false},
                {stream: "stdout", text: "Setup failed. Resolve the reported failures, then rerun setup.", write: false},
              ],
            },
          } as Readonly<Record<string, unknown>>
        )[failing],
      );
    },
  );

  it.each([
    ["ready", "succeeded"],
    ["degraded", "degraded"],
  ] as const)("pins the exact %s summary table, banner, and exit code", async (_name, reactStatus) => {
    // Arrange
    const phases = [
      stubPhase("dotnet", {
        run: () =>
          Effect.succeed(
            phaseResult("dotnet", "succeeded", {summary: "The .NET SDK is ready.", evidence: ["SDK 10.0.100."], durationMs: 42}),
          ),
      }),
      stubPhase("react", {
        run: () =>
          Effect.succeed(
            phaseResult("react", reactStatus, {
              summary: reactStatus === "degraded" ? "Clerk credentials are unavailable." : "The website is ready.",
              nextActions: reactStatus === "degraded" ? ["Provide Clerk credentials, then rerun setup."] : [],
              durationMs: 7,
            }),
          ),
      }),
    ];

    // Act
    const run = await invokeSetup(options(), {phases});
    const observed = withRootPlaceholder({execution: run.execution, records: run.records});

    // Assert
    expect(observed).toEqual(
      (
        {
          ready: {
            execution: {
              status: "completed",
              value: {
                phases: [
                  {
                    id: "dotnet",
                    status: "succeeded",
                    summary: "The .NET SDK is ready.",
                    evidence: ["SDK 10.0.100."],
                    nextActions: [],
                    durationMs: 42,
                  },
                  {id: "react", status: "succeeded", summary: "The website is ready.", evidence: [], nextActions: [], durationMs: 7},
                ],
              },
              exitCode: 0,
            },
            records: [
              {stream: "stdout", text: "arolariu.ro repository setup", write: false},
              {stream: "stdout", text: "Preparing every required workspace, toolchain, and local dependency.", write: false},
              {stream: "stdout", text: "", write: false},
              {stream: "stdout", text: "dotnet", write: false},
              {stream: "stdout", text: "", write: false},
              {stream: "stdout", text: "[arolariu::setup::dotnet] ✅ The .NET SDK is ready. (42ms)", write: false},
              {stream: "stdout", text: "  - SDK 10.0.100.", write: false},
              {stream: "stdout", text: "", write: false},
              {stream: "stdout", text: "react", write: false},
              {stream: "stdout", text: "", write: false},
              {stream: "stdout", text: "[arolariu::setup::react] ✅ The website is ready. (7ms)", write: false},
              {stream: "stdout", text: "", write: false},
              {stream: "stdout", text: "Setup summary", write: false},
              {stream: "stdout", text: "", write: false},
              {stream: "stdout", text: "Phase   Status     Duration  Summary", write: false},
              {stream: "stdout", text: "------  ---------  --------  ----------------------", write: false},
              {stream: "stdout", text: "dotnet  succeeded  42ms      The .NET SDK is ready.", write: false},
              {stream: "stdout", text: "react   succeeded  7ms       The website is ready.", write: false},
              {stream: "stdout", text: "Setup is ready.", write: false},
            ],
          },
          degraded: {
            execution: {
              status: "completed",
              value: {
                phases: [
                  {
                    id: "dotnet",
                    status: "succeeded",
                    summary: "The .NET SDK is ready.",
                    evidence: ["SDK 10.0.100."],
                    nextActions: [],
                    durationMs: 42,
                  },
                  {
                    id: "react",
                    status: "degraded",
                    summary: "Clerk credentials are unavailable.",
                    evidence: [],
                    nextActions: ["Provide Clerk credentials, then rerun setup."],
                    durationMs: 7,
                  },
                ],
              },
              exitCode: 0,
            },
            records: [
              {stream: "stdout", text: "arolariu.ro repository setup", write: false},
              {stream: "stdout", text: "Preparing every required workspace, toolchain, and local dependency.", write: false},
              {stream: "stdout", text: "", write: false},
              {stream: "stdout", text: "dotnet", write: false},
              {stream: "stdout", text: "", write: false},
              {stream: "stdout", text: "[arolariu::setup::dotnet] ✅ The .NET SDK is ready. (42ms)", write: false},
              {stream: "stdout", text: "  - SDK 10.0.100.", write: false},
              {stream: "stdout", text: "", write: false},
              {stream: "stdout", text: "react", write: false},
              {stream: "stdout", text: "", write: false},
              {stream: "stderr", text: "[arolariu::setup::react] ⚠️ Clerk credentials are unavailable. (7ms)", write: false},
              {stream: "stdout", text: "", write: false},
              {stream: "stdout", text: "Setup summary", write: false},
              {stream: "stdout", text: "", write: false},
              {stream: "stdout", text: "Phase   Status     Duration  Summary", write: false},
              {stream: "stdout", text: "------  ---------  --------  ----------------------------------", write: false},
              {stream: "stdout", text: "dotnet  succeeded  42ms      The .NET SDK is ready.", write: false},
              {stream: "stdout", text: "react   degraded   7ms       Clerk credentials are unavailable.", write: false},
              {stream: "stdout", text: "", write: false},
              {stream: "stdout", text: "Degraded capabilities", write: false},
              {stream: "stdout", text: "", write: false},
              {stream: "stderr", text: "[arolariu::setup] ⚠️ Clerk credentials are unavailable.", write: false},
              {stream: "stdout", text: "", write: false},
              {stream: "stdout", text: "Next actions", write: false},
              {stream: "stdout", text: "", write: false},
              {stream: "stdout", text: "1. Provide Clerk credentials, then rerun setup.", write: false},
              {stream: "stdout", text: "Setup is ready with degraded capabilities.", write: false},
            ],
          },
        } as Readonly<Record<string, unknown>>
      )[_name],
    );
  });
});
