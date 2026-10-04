// @vitest-environment node
/**
 * @fileoverview Contract tests for the setup command object and its mutation control.
 * @module scripts.setup.test
 *
 * @remarks
 * Every orchestrator test drives `setupCommand.invoke()` through an injected test runtime
 * factory whose filesystem is an in-memory repository fixture, whose inspection registry hands out
 * a deterministic session, and whose phases are fakes. No test in this file reads the live
 * checkout, spawns a real process, or mutates disk.
 */

import {resolve} from "node:path";
import {PassThrough} from "node:stream";
import {describe, expect, it, vi} from "vitest";

import type {CommandExecution, CommandInvoker, CommandRuntimeFactory} from "../../common/commander.ts";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger, type MonorepositoryLogger} from "../../common/logger.ts";
import {createTerminalPromptProvider, type PromptProvider} from "../../common/prompts.ts";
import {createRepositoryPaths, type RepositoryPaths} from "../../common/repository-paths.ts";
import type {ProcessRequest, ProcessRunOptions, ProcessRunner} from "../../common/runner.ts";
import {createMemoryFileSystem, createProcessRunner, createTestRuntimeFactory, repositoryFixtureRoot} from "../../common/runtime.testing.ts";
import {
  CommandCancellation,
  type FileSystem,
  type RepositoryInspectionRequest,
  type RepositoryInspectionRuntime,
} from "../../common/runtime.ts";
import type {GenerateInput, GenerateResult} from "../generate/index.ts";
import type {DotnetFacts} from "../../inspection/dotnet.ts";
import type {LegacyRepositoryInspectionSession} from "../../platform/bridge.ts";
import {dotnetSetupPhase} from "./phases/dotnet.ts";
import {createSetupActionExecutor, createSetupCommand, setupPhases, type SetupResult} from "./index.ts";
import type {SetupAction, SetupContext, SetupInput, SetupPhaseDefinition, SetupPhaseResult, SetupStatus} from "./types.ts";

/** Canonical paths of the in-memory repository fixture every orchestrator test resolves. */
const FIXTURE_PATHS: RepositoryPaths = createRepositoryPaths(repositoryFixtureRoot);

/** A typed fake {@link LegacyRepositoryInspectionSession} that never resolves a real repository fact. */
function createFakeInspectionSession(): LegacyRepositoryInspectionSession {
  return {
    inspect: async () => ({kind: "unavailable", reason: "Not exercised by this test.", durationMs: 0}),
    invalidate: () => {},
    updateInfrastructureEngine: () => {},
  };
}

/**
 * Builds the in-memory repository fixture the setup command resolves its paths and manifest
 * requirements from, so no orchestrator test reads the live checkout.
 *
 * @param patch - Files overlaid on (or removed from) the seeded manifest sources.
 * @returns A deterministic filesystem capability anchored to the fixture repository root.
 */
function setupFixtureFileSystem(patch: Readonly<Record<string, string>> = {}): FileSystem {
  return createMemoryFileSystem({
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
  });
}

/** Records every session request while returning the exact same session instance every time. */
interface SetupFixtureInspection {
  /** The registry injected into the test runtime. */
  readonly inspection: RepositoryInspectionRuntime;
  /** Every request the command asked the registry for, in call order. */
  readonly requests: readonly Readonly<RepositoryInspectionRequest>[];
  /** Every session the registry handed out, in call order. */
  readonly sessions: readonly LegacyRepositoryInspectionSession[];
}

function setupFixtureInspection(session: LegacyRepositoryInspectionSession = createFakeInspectionSession()): SetupFixtureInspection {
  const requests: Readonly<RepositoryInspectionRequest>[] = [];
  const sessions: LegacyRepositoryInspectionSession[] = [];

  return {
    inspection: {
      getRepositorySession: (request: Readonly<RepositoryInspectionRequest>): LegacyRepositoryInspectionSession => {
        requests.push(request);
        sessions.push(session);
        return session;
      },
    },
    get requests(): readonly Readonly<RepositoryInspectionRequest>[] {
      return requests;
    },
    get sessions(): readonly LegacyRepositoryInspectionSession[] {
      return sessions;
    },
  };
}

function createLogger(verbose?: boolean): Readonly<{
  logger: MonorepositoryConsoleLogger;
  sink: InMemoryLoggerSink;
}> {
  const sink = new InMemoryLoggerSink();
  const logger = new MonorepositoryConsoleLogger("setup", {
    color: false,
    sink,
    ...(verbose === undefined ? {} : {verbose}),
  });
  return {logger, sink};
}

function createPrompts(confirmResult: boolean = true): Readonly<{
  prompts: PromptProvider;
  confirm: ReturnType<typeof vi.fn<(message: string, defaultValue?: boolean) => Promise<boolean>>>;
}> {
  const confirm = vi.fn<(message: string, defaultValue?: boolean) => Promise<boolean>>().mockResolvedValue(confirmResult);
  const prompts: PromptProvider = {
    confirm,
    select: async <TValue extends string>(
      _message: string,
      choices: readonly Readonly<{value: TValue; label: string}>[],
      defaultValue?: TValue,
    ): Promise<TValue> => {
      const selected = defaultValue ?? choices[0]?.value;
      if (selected === undefined) {
        throw new Error("Test prompt requires a choice");
      }
      return selected;
    },
    text: async () => "",
    secret: async () => "",
  };
  return {prompts, confirm};
}

function options(patch: Partial<SetupInput> = {}): SetupInput {
  return {
    verbose: false,
    dryRun: false,
    yes: false,
    ...patch,
  };
}

function action(scope: SetupAction["scope"], execute = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)): SetupAction {
  return {
    id: `${scope}.action`,
    scope,
    summary: `Run ${scope} action`,
    execute,
  };
}

describe("createSetupActionExecutor", () => {
  it.each(["repository", "user", "system"] as const)("plans a %s mutation during dry-run", async (scope) => {
    const execute = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const {prompts, confirm} = createPrompts();
    const {logger, sink} = createLogger();
    const controller = createSetupActionExecutor({
      options: options({dryRun: true}),
      prompts,
      logger,
    });

    await expect(controller.run(action(scope, execute))).resolves.toBe("planned");
    expect(execute).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
    expect(sink.records.map((record) => record.text).join("\n")).toContain(`${scope}.action`);
  });

  it("asks before a system mutation but not a repository mutation", async () => {
    const {prompts, confirm} = createPrompts(false);
    const {logger, sink} = createLogger();
    const systemAction = action("system");
    const repositoryAction = action("repository");
    const userAction = action("user");
    const controller = createSetupActionExecutor({
      options: options(),
      prompts,
      logger,
    });

    await expect(controller.run(systemAction)).resolves.toBe("declined");
    await expect(controller.run(repositoryAction)).resolves.toBe("executed");
    await expect(controller.run(userAction)).resolves.toBe("executed");
    expect(confirm).toHaveBeenCalledOnce();
    expect(systemAction.execute).not.toHaveBeenCalled();
    expect(repositoryAction.execute).toHaveBeenCalledOnce();
    expect(userAction.execute).toHaveBeenCalledOnce();
    expect(sink.records.map((record) => record.text).join("\n")).toMatch(/Declined setup action.*system\.action/s);
    expect(sink.records.map((record) => record.text).join("\n")).toMatch(/Executed setup action.*repository\.action/s);
    expect(sink.records.map((record) => record.text).join("\n")).toMatch(/Executed setup action.*user\.action/s);
  });

  it("executes a confirmed system mutation", async () => {
    const {prompts, confirm} = createPrompts(true);
    const {logger} = createLogger();
    const systemAction = action("system");
    const controller = createSetupActionExecutor({
      options: options(),
      prompts,
      logger,
    });

    await expect(controller.run(systemAction)).resolves.toBe("executed");
    expect(confirm).toHaveBeenCalledOnce();
    expect(systemAction.execute).toHaveBeenCalledOnce();
  });

  it.each(["repository", "user", "system"] as const)("executes a %s mutation without prompting under --yes", async (scope) => {
    const {prompts, confirm} = createPrompts(false);
    const {logger} = createLogger();
    const setupAction = action(scope);
    const controller = createSetupActionExecutor({
      options: options({yes: true}),
      prompts,
      logger,
    });

    await expect(controller.run(setupAction)).resolves.toBe("executed");
    expect(setupAction.execute).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("declines a system mutation without blocking on non-interactive stdin", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const {logger} = createLogger();
    const prompts = createTerminalPromptProvider({
      input,
      output,
      isTTY: false,
    });
    const setupAction = action("system");
    const controller = createSetupActionExecutor({
      options: options(),
      prompts,
      logger,
    });

    await expect(controller.run(setupAction)).resolves.toBe("declined");
    expect(setupAction.execute).not.toHaveBeenCalled();
  });

  it("preserves action failures without logging their potentially secret details", async () => {
    const secret = "do-not-log-this-secret";
    const failure = new Error(secret);
    const execute = vi.fn<() => Promise<void>>().mockRejectedValue(failure);
    const {prompts} = createPrompts();
    const {logger, sink} = createLogger();
    const controller = createSetupActionExecutor({
      options: options(),
      prompts,
      logger,
    });

    await expect(controller.run(action("repository", execute))).rejects.toBe(failure);
    expect(sink.records.every((record) => !record.text.includes(secret))).toBe(true);
  });

  it("preserves command interruption", async () => {
    const interruption = new DOMException("The command was interrupted", "AbortError");
    const execute = vi.fn<() => Promise<void>>().mockRejectedValue(interruption);
    const {prompts} = createPrompts();
    const {logger} = createLogger();
    const controller = createSetupActionExecutor({
      options: options(),
      prompts,
      logger,
    });

    await expect(controller.run(action("user", execute))).rejects.toBe(interruption);
  });
});

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

function stubPhase(
  id: string,
  config: Readonly<{
    dependsOn?: readonly string[];
    required?: boolean;
    run?: (context: SetupContext) => Promise<SetupPhaseResult>;
  }> = {},
): SetupPhaseDefinition {
  return {
    id,
    title: id,
    required: config.required ?? true,
    dependsOn: config.dependsOn ?? [],
    run: config.run ?? ((): Promise<SetupPhaseResult> => Promise.resolve(phaseResult(id, "succeeded"))),
  };
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

/** Recording process runner used to assert phase-scoped command options. */
type RecordingRunner = ProcessRunner & Readonly<{calls: readonly Readonly<{request: ProcessRequest; options: ProcessRunOptions}>[]}>;

/** Every seam one orchestrator test may replace. */
interface SetupFixtureInput {
  /** Fake phases to execute; defaults to {@link setupFixturePhases}. */
  readonly phases?: readonly SetupPhaseDefinition[];
  /** Filesystem capability; defaults to the in-memory repository fixture. */
  readonly files?: FileSystem;
  /** Prompt provider observed by the action executor. */
  readonly prompts?: PromptProvider;
  /** Process runner every phase command is recorded by. */
  readonly runner?: RecordingRunner;
  /** Logger every rendered line is captured through. */
  readonly logger?: MonorepositoryLogger;
  /** Inspection session the shared registry hands out. */
  readonly session?: LegacyRepositoryInspectionSession;
  /** Composed generation command. */
  readonly generate?: CommandInvoker<GenerateInput, GenerateResult>;
}

interface SetupFixture {
  /** The command under test. */
  readonly command: ReturnType<typeof createSetupCommand>;
  /** Recorded inspection registry requests and sessions. */
  readonly inspection: SetupFixtureInspection;
  /** Recorded process invocations. */
  readonly runner: RecordingRunner;
}

/**
 * Assembles a setup command wired to fake phases, the in-memory repository fixture, and a
 * deterministic inspection registry.
 *
 * @param input - Optional seam replacements for this test.
 * @returns The command plus its recorded inspection and process seams.
 */
function createSetupFixture(input: Readonly<SetupFixtureInput> = {}): SetupFixture {
  const inspection = setupFixtureInspection(input.session ?? createFakeInspectionSession());
  const runner = input.runner ?? createProcessRunner();
  const runtimeFactory: CommandRuntimeFactory = createTestRuntimeFactory({
    files: input.files ?? setupFixtureFileSystem(),
    inspection: inspection.inspection,
    runner,
    ...(input.prompts === undefined ? {} : {prompts: input.prompts}),
    ...(input.logger === undefined ? {} : {logger: input.logger}),
  });

  const command = createSetupCommand({
    runtimeFactory,
    phases: input.phases ?? setupFixturePhases,
    ...(input.generate === undefined ? {} : {generate: input.generate}),
  });

  return {command, inspection, runner};
}

function expectCompleted(execution: CommandExecution<SetupResult>): SetupResult {
  expect(execution.status).toBe("completed");
  if (execution.status !== "completed") {
    throw new Error("Setup did not complete.");
  }
  return execution.value;
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
});

describe("setupCommand", () => {
  it("runs every declared phase in dependency order without touching the live checkout", async () => {
    const {command} = createSetupFixture();

    const execution = await command.invoke({verbose: false, dryRun: true, yes: false});

    expect(execution.status).toBe("completed");
    if (execution.status !== "completed") throw new Error("Setup did not complete.");
    expect(execution.value.phases.map(({id}) => id)).toEqual([
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
    expect(execution.exitCode).toBe(0);
  });

  it("succeeds when every phase reports success", async () => {
    const {command} = createSetupFixture({phases: [stubPhase("a"), stubPhase("b", {dependsOn: ["a"]})]});

    const execution = await command.invoke(options());

    const result = expectCompleted(execution);
    expect(result.phases.map((phase) => phase.status)).toEqual(["succeeded", "succeeded"]);
    expect(execution.exitCode).toBe(0);
  });

  it("traverses a dry-run planned dependency to run downstream generators", async () => {
    const generatorsRun = vi.fn<() => Promise<SetupPhaseResult>>(() => Promise.resolve(phaseResult("workspace.generators", "succeeded")));
    const {command} = createSetupFixture({
      phases: [
        stubPhase("workspace.root-dependencies", {
          run: () => Promise.resolve(phaseResult("workspace.root-dependencies", "skipped", {summary: "Planned npm restoration."})),
        }),
        stubPhase("workspace.generators", {dependsOn: ["workspace.root-dependencies"], run: generatorsRun}),
      ],
    });

    const execution = await command.invoke(options({dryRun: true}));

    const result = expectCompleted(execution);
    expect(generatorsRun).toHaveBeenCalledOnce();
    expect(result.phases.find(({id}) => id === "workspace.generators")).toMatchObject({status: "succeeded"});
    expect(execution.exitCode).toBe(0);
  });

  it("keeps python and infrastructure independent from a failed dotnet phase", async () => {
    const pythonRun = vi.fn<() => Promise<SetupPhaseResult>>(() => Promise.resolve(phaseResult("python", "succeeded")));
    const infrastructureRun = vi.fn<() => Promise<SetupPhaseResult>>(() => Promise.resolve(phaseResult("infrastructure", "succeeded")));
    const {command} = createSetupFixture({
      phases: [
        stubPhase("dotnet", {run: () => Promise.resolve(phaseResult("dotnet", "failed", {summary: "The .NET toolchain failed."}))}),
        stubPhase("python", {run: pythonRun}),
        stubPhase("infrastructure", {run: infrastructureRun}),
      ],
    });

    const execution = await command.invoke(options());

    const result = expectCompleted(execution);
    expect(pythonRun).toHaveBeenCalledOnce();
    expect(infrastructureRun).toHaveBeenCalledOnce();
    expect(result.phases.find(({id}) => id === "python")).toMatchObject({status: "succeeded"});
    expect(result.phases.find(({id}) => id === "infrastructure")).toMatchObject({status: "succeeded"});
    expect(execution.exitCode).toBe(1);
  });

  it("skips generators, react, and svelte when the workspace root dependency fails", async () => {
    const {command} = createSetupFixture({
      phases: [
        stubPhase("workspace.root-dependencies", {
          run: () => Promise.resolve(phaseResult("workspace.root-dependencies", "failed", {summary: "npm ci failed."})),
        }),
        stubPhase("workspace.generators", {dependsOn: ["workspace.root-dependencies"]}),
        stubPhase("react", {dependsOn: ["workspace.root-dependencies", "workspace.generators"]}),
        stubPhase("svelte", {dependsOn: ["workspace.root-dependencies"]}),
      ],
    });

    const {phases} = expectCompleted(await command.invoke(options()));

    for (const id of ["workspace.generators", "react", "svelte"]) {
      expect(phases.find((phase) => phase.id === id)).toMatchObject({
        status: "skipped",
        summary: expect.stringContaining("workspace.root-dependencies"),
      });
    }
  });

  it("does not skip react or svelte when only the .github scripts dependency fails", async () => {
    const reactRun = vi.fn<() => Promise<SetupPhaseResult>>(() => Promise.resolve(phaseResult("react", "succeeded")));
    const svelteRun = vi.fn<() => Promise<SetupPhaseResult>>(() => Promise.resolve(phaseResult("svelte", "succeeded")));
    const {command} = createSetupFixture({
      phases: [
        stubPhase("workspace.root-dependencies"),
        stubPhase("workspace.github-scripts-dependencies", {
          run: () =>
            Promise.resolve(phaseResult("workspace.github-scripts-dependencies", "failed", {summary: ".github scripts npm ci failed."})),
        }),
        stubPhase("react", {dependsOn: ["workspace.root-dependencies"], run: reactRun}),
        stubPhase("svelte", {dependsOn: ["workspace.root-dependencies"], run: svelteRun}),
      ],
    });

    const {phases} = expectCompleted(await command.invoke(options()));

    expect(reactRun).toHaveBeenCalledOnce();
    expect(svelteRun).toHaveBeenCalledOnce();
    expect(phases.find(({id}) => id === "react")).toMatchObject({status: "succeeded"});
    expect(phases.find(({id}) => id === "svelte")).toMatchObject({status: "succeeded"});
  });

  it("completes with exit code 0 for a degraded capability", async () => {
    const {command} = createSetupFixture({
      phases: [
        stubPhase("react", {
          run: () => Promise.resolve(phaseResult("react", "degraded", {summary: "Clerk credentials are unavailable."})),
        }),
      ],
    });

    const execution = await command.invoke(options());

    expect(expectCompleted(execution).phases[0]).toMatchObject({status: "degraded"});
    expect(execution.exitCode).toBe(0);
  });

  it("completes with exit code 1 for a required failure", async () => {
    const {command} = createSetupFixture({
      phases: [stubPhase("dotnet", {run: () => Promise.resolve(phaseResult("dotnet", "failed"))})],
    });

    expect((await command.invoke(options())).exitCode).toBe(1);
  });

  it("blocks a phase whose dependency was never defined", async () => {
    const {command} = createSetupFixture({phases: [stubPhase("react", {dependsOn: ["workspace.root-dependencies"]})]});

    const {phases} = expectCompleted(await command.invoke(options()));

    expect(phases[0]).toMatchObject({
      status: "skipped",
      summary: expect.stringContaining("workspace.root-dependencies"),
    });
  });

  it("converts an ordinary thrown exception into a failed result and continues with independent phases", async () => {
    const pythonRun = vi.fn<() => Promise<SetupPhaseResult>>(() => Promise.resolve(phaseResult("python", "succeeded")));
    const {command} = createSetupFixture({
      phases: [
        stubPhase("dotnet", {
          run: (): Promise<SetupPhaseResult> => {
            throw new Error("unexpected dotnet failure");
          },
        }),
        stubPhase("python", {run: pythonRun}),
      ],
    });

    const execution = await command.invoke(options());

    const result = expectCompleted(execution);
    expect(pythonRun).toHaveBeenCalledOnce();
    expect(result.phases.find(({id}) => id === "dotnet")).toMatchObject({
      status: "failed",
      evidence: expect.arrayContaining([expect.stringContaining("unexpected dotnet failure")]),
    });
    expect(execution.exitCode).toBe(1);
  });

  it("cancels the command when a phase aborts instead of degrading it to a failed phase", async () => {
    const interruption = new DOMException("The command was interrupted", "AbortError");
    const pythonRun = vi.fn<() => Promise<SetupPhaseResult>>(() => Promise.resolve(phaseResult("python", "succeeded")));
    const {command} = createSetupFixture({
      phases: [stubPhase("dotnet", {run: () => Promise.reject(interruption)}), stubPhase("python", {run: pythonRun})],
    });

    const execution = await command.invoke(options());

    expect(execution.status).toBe("cancelled");
    expect(execution.exitCode).toBe(130);
    expect(pythonRun).not.toHaveBeenCalled();
  });

  it("cancels the command when the invocation aborts during a phase that degraded its own cancellation", async () => {
    const controller = new AbortController();
    const {logger, sink} = createLogger();
    const pythonRun = vi.fn<() => Promise<SetupPhaseResult>>(() => Promise.resolve(phaseResult("python", "succeeded")));
    const {command} = createSetupFixture({
      logger,
      phases: [
        stubPhase("dotnet", {
          // A phase whose runner returned a typed cancelled outcome may report an ordinary failed
          // result instead of rethrowing; the orchestrator must still observe the aborted signal.
          run: () => {
            controller.abort(new CommandCancellation("The command was interrupted.", 130));
            return Promise.resolve(phaseResult("dotnet", "failed"));
          },
        }),
        stubPhase("python", {run: pythonRun}),
      ],
    });

    const execution = await command.invoke(options(), {signal: controller.signal, presentation: "human"});

    expect(execution.status).toBe("cancelled");
    expect(execution.exitCode).toBe(130);
    expect(pythonRun).not.toHaveBeenCalled();
    const rendered = sink.records.map((record) => record.text).join("\n");
    expect(rendered).not.toContain("Setup summary");
    expect(rendered).not.toContain("Setup is ready");
  });

  it("cancels before running any phase when the invocation signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort(new CommandCancellation("The command was terminated.", 143));
    const dotnetRun = vi.fn<() => Promise<SetupPhaseResult>>(() => Promise.resolve(phaseResult("dotnet", "succeeded")));
    const {command} = createSetupFixture({phases: [stubPhase("dotnet", {run: dotnetRun})]});

    const execution = await command.invoke(options(), {signal: controller.signal});

    expect(execution.status).toBe("cancelled");
    expect(execution.exitCode).toBe(143);
    expect(dotnetRun).not.toHaveBeenCalled();
  });

  it("cancels the command when a setup prompt is interrupted", async () => {
    const interruption = new DOMException("The prompt was interrupted", "AbortError");
    const {prompts} = createPrompts();
    const interruptedPrompts: PromptProvider = {
      ...prompts,
      confirm: () => Promise.reject(interruption),
    };
    const {command} = createSetupFixture({
      prompts: interruptedPrompts,
      phases: [
        stubPhase("infrastructure", {
          run: async (context) => {
            await context.actions.run({
              id: "infrastructure.install",
              scope: "system",
              summary: "Install the container engine.",
              execute: async () => undefined,
            });
            return phaseResult("infrastructure", "succeeded");
          },
        }),
      ],
    });

    const execution = await command.invoke(options());

    expect(execution.status).toBe("cancelled");
    expect(execution.exitCode).toBe(130);
  });

  it("executes a system-scoped phase action without prompting under --yes", async () => {
    const {prompts, confirm} = createPrompts(false);
    const execute = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const {command} = createSetupFixture({
      prompts,
      phases: [
        stubPhase("infrastructure", {
          run: async (context) => {
            await context.actions.run({
              id: "infrastructure.install",
              scope: "system",
              summary: "Install the container engine.",
              execute,
            });
            return phaseResult("infrastructure", "succeeded");
          },
        }),
      ],
    });

    const execution = await command.invoke(options({yes: true}));

    expect(expectCompleted(execution).phases[0]).toMatchObject({status: "succeeded"});
    expect(execute).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
  });

  it("plans a phase action without executing it during a dry run", async () => {
    const execute = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const {command} = createSetupFixture({
      phases: [
        stubPhase("infrastructure", {
          run: async (context) => {
            const disposition = await context.actions.run({
              id: "infrastructure.install",
              scope: "system",
              summary: "Install the container engine.",
              execute,
            });
            return phaseResult("infrastructure", disposition === "planned" ? "skipped" : "succeeded");
          },
        }),
      ],
    });

    const execution = await command.invoke(options({dryRun: true}));

    expect(expectCompleted(execution).phases[0]).toMatchObject({status: "skipped"});
    expect(execute).not.toHaveBeenCalled();
  });

  it("constructs one full inspection session shared by every setup phase", async () => {
    const receivedContexts: SetupContext[] = [];
    const session = createFakeInspectionSession();
    const {command, inspection} = createSetupFixture({
      session,
      phases: [
        stubPhase("a", {
          run: async (context) => {
            receivedContexts.push(context);
            return phaseResult("a", "succeeded");
          },
        }),
        stubPhase("b", {
          dependsOn: ["a"],
          run: async (context) => {
            receivedContexts.push(context);
            return phaseResult("b", "succeeded");
          },
        }),
      ],
    });

    await command.invoke(options());

    expect(inspection.requests).toHaveLength(1);
    expect(inspection.requests[0]).toMatchObject({profile: "full", paths: FIXTURE_PATHS});
    expect(receivedContexts).toHaveLength(2);
    expect(receivedContexts.every((context) => context.inspection === session)).toBe(true);
  });

  it("omits requestedEngine from the inspection request when no engine option is set", async () => {
    const {command, inspection} = createSetupFixture({phases: [stubPhase("a")]});

    await command.invoke(options());

    const request = inspection.requests[0];
    if (request === undefined) {
      throw new Error("The inspection registry was never asked for a session.");
    }
    expect(Object.hasOwn(request, "requestedEngine")).toBe(false);
  });

  it("passes the requested engine through to the inspection request", async () => {
    const {command, inspection} = createSetupFixture({phases: [stubPhase("a")]});

    await command.invoke(options({engine: "podman"}));

    expect(inspection.requests[0]).toMatchObject({requestedEngine: "podman"});
  });

  it("fails without constructing an inspection session when repository requirements are invalid", async () => {
    const {command, inspection} = createSetupFixture({
      phases: [stubPhase("a")],
      files: setupFixtureFileSystem({[resolve(FIXTURE_PATHS.root, ".nvmrc")]: "22\n"}),
    });

    const execution = await command.invoke(options());

    expect(execution.status).toBe("failed");
    expect(execution.exitCode).toBe(1);
    if (execution.status !== "failed") throw new Error("Setup did not fail.");
    expect(execution.failure.message).toMatch(/invalid/i);
    expect(inspection.requests).toHaveLength(0);
  });
});

describe("setup phase command execution", () => {
  function commandPhase(run: (context: SetupContext) => Promise<unknown>): SetupPhaseDefinition {
    return stubPhase("dotnet", {
      run: async (context) => {
        await run(context);
        return phaseResult("dotnet", "succeeded");
      },
    });
  }

  function recordedOptions(runner: RecordingRunner): ProcessRunOptions {
    const call = runner.calls[0];
    if (call === undefined) {
      throw new Error("No process invocation was recorded.");
    }
    return call.options;
  }

  it("scopes every phase command to the repository root with the bounded default timeout", async () => {
    const runner = createProcessRunner();
    const {command} = createSetupFixture({
      runner,
      phases: [commandPhase((context) => context.runtime?.runner.run({command: "dotnet", args: ["--version"]}) ?? Promise.resolve())],
    });

    await command.invoke(options());

    expect(runner.calls.map(({request}) => request)).toEqual([{command: "dotnet", args: ["--version"]}]);
    expect(recordedOptions(runner)).toMatchObject({cwd: FIXTURE_PATHS.root, timeoutMs: 120_000});
    expect(recordedOptions(runner).signal).toBeDefined();
  });

  it("preserves an explicit caller timeout instead of the scoped default", async () => {
    const runner = createProcessRunner();
    const {command} = createSetupFixture({
      runner,
      phases: [
        commandPhase(
          (context) => context.runtime?.runner.run({command: "dotnet", args: ["--version"]}, {timeoutMs: 5_000}) ?? Promise.resolve(),
        ),
      ],
    });

    await command.invoke(options());

    expect(recordedOptions(runner)).toMatchObject({timeoutMs: 5_000});
  });

  it("keeps the scoped default for a mutation command instead of the pre-migration bridge policy", async () => {
    const runner = createProcessRunner();
    const {command} = createSetupFixture({
      runner,
      phases: [
        commandPhase((context) => context.runtime?.runner.run({command: "npm", args: ["ci"]}, {output: "tee"}) ?? Promise.resolve()),
      ],
    });

    await command.invoke(options());

    expect(recordedOptions(runner)).toMatchObject({output: "tee", timeoutMs: 120_000});
  });

  it("does not echo command evidence in normal mode", async () => {
    const {logger, sink} = createLogger(false);
    const runner = createProcessRunner();
    const {command} = createSetupFixture({
      logger,
      runner,
      phases: [commandPhase((context) => context.runtime?.runner.run({command: "dotnet", args: ["--version"]}) ?? Promise.resolve())],
    });

    await command.invoke(options(), {presentation: "human"});

    expect(recordedOptions(runner).logCommands).toBe(false);
    expect(sink.records.some((record) => record.text.includes("dotnet --version"))).toBe(false);
  });

  it("echoes formatted command evidence in verbose mode without stdin or environment values", async () => {
    const {logger, sink} = createLogger(true);
    const runner = createProcessRunner();
    const {command} = createSetupFixture({
      logger,
      runner,
      phases: [
        commandPhase((context) =>
          context.runtime === undefined
            ? Promise.resolve()
            : context.runtime.runner.run(
                {command: "dotnet", args: ["user-secrets", "set"]},
                {input: "super-secret-stdin-payload", env: {SOME_TOKEN: "super-secret-env-value"}},
              ),
        ),
      ],
    });

    await command.invoke(options({verbose: true}), {presentation: "human"});

    const rendered = sink.records.map((record) => record.text).join("\n");
    expect(rendered).toContain("$ dotnet user-secrets set");
    expect(rendered).not.toContain("super-secret-stdin-payload");
    expect(rendered).not.toContain("super-secret-env-value");
  });
});

describe("setup presentation", () => {
  it("renders the exact duration and summary for a completed phase", async () => {
    const {logger, sink} = createLogger();
    const {command} = createSetupFixture({
      logger,
      phases: [
        stubPhase("dotnet", {
          run: () => Promise.resolve(phaseResult("dotnet", "succeeded", {summary: "The .NET SDK is ready.", durationMs: 42})),
        }),
      ],
    });

    await command.invoke(options(), {presentation: "human"});

    expect(sink.records.map((record) => record.text).join("\n")).toContain("The .NET SDK is ready. (42ms)");
  });

  it("renders the summary table, degraded capabilities, and next actions", async () => {
    const {logger, sink} = createLogger();
    const {command} = createSetupFixture({
      logger,
      phases: [
        stubPhase("react", {
          run: () =>
            Promise.resolve(
              phaseResult("react", "degraded", {
                summary: "Clerk credentials are unavailable.",
                nextActions: ["Provide Clerk credentials, then rerun setup."],
              }),
            ),
        }),
      ],
    });

    await command.invoke(options(), {presentation: "human"});

    const rendered = sink.records.map((record) => record.text).join("\n");
    expect(rendered).toContain("Setup summary");
    expect(rendered).toContain("Degraded capabilities");
    expect(rendered).toContain("Provide Clerk credentials, then rerun setup.");
    expect(rendered).toContain("Setup is ready with degraded capabilities.");
  });

  it("emits verbose dependency-block reasoning naming the unmet dependency and its status", async () => {
    const {logger, sink} = createLogger(true);
    const {command} = createSetupFixture({
      logger,
      phases: [
        stubPhase("workspace.root-dependencies", {
          run: () => Promise.resolve(phaseResult("workspace.root-dependencies", "failed", {summary: "npm ci failed."})),
        }),
        stubPhase("workspace.generators", {dependsOn: ["workspace.root-dependencies"]}),
      ],
    });

    await command.invoke(options({verbose: true}), {presentation: "human"});

    const rendered = sink.records.map((record) => record.text).join("\n");
    expect(rendered).toContain("🐛");
    expect(rendered).toMatch(/\[arolariu::setup::workspace\.generators]/);
    expect(rendered).toContain("workspace.root-dependencies");
    expect(rendered).toMatch(/status 'failed'/);
  });

  it("does not emit debug-level dependency-block reasoning in normal mode", async () => {
    const {logger, sink} = createLogger(false);
    const {command} = createSetupFixture({
      logger,
      phases: [
        stubPhase("workspace.root-dependencies", {
          run: () => Promise.resolve(phaseResult("workspace.root-dependencies", "failed", {summary: "npm ci failed."})),
        }),
        stubPhase("workspace.generators", {dependsOn: ["workspace.root-dependencies"]}),
      ],
    });

    await command.invoke(options(), {presentation: "human"});

    expect(sink.records.map((record) => record.text).join("\n")).not.toContain("🐛");
  });

  it("defers the summary to completion, so a silent nested invocation never renders it", async () => {
    const {logger, sink} = createLogger();
    const {command} = createSetupFixture({logger, phases: [stubPhase("dotnet")]});

    await command.invoke(options());

    expect(sink.records.map((record) => record.text).join("\n")).not.toContain("Setup summary");
  });
});

describe("setup generation composition", () => {
  it("hands migrated phases a generation invoker scoped to this invocation", async () => {
    const invoke = vi.fn<CommandInvoker<GenerateInput, GenerateResult>["invoke"]>(async () => ({
      status: "completed",
      value: {selected: ["env"], completed: ["env"]},
      exitCode: 0,
    }));
    const {command} = createSetupFixture({
      generate: {invoke},
      phases: [
        stubPhase("workspace.generators", {
          run: async (context) => {
            await context.runtime?.invokeGenerate({verbose: false, env: true, i18n: true, gql: true, artifacts: true});
            return phaseResult("workspace.generators", "succeeded");
          },
        }),
      ],
    });

    await command.invoke(options());

    expect(invoke).toHaveBeenCalledTimes(1);
    const [generateInput, invocationOptions] = invoke.mock.calls[0] ?? [];
    expect(generateInput).toEqual({verbose: false, env: true, i18n: true, gql: true, artifacts: true});
    expect(invocationOptions?.presentation).toBe("silent");
    expect(invocationOptions?.parent).toBeDefined();
  });
});

describe("setup characterization (pre-Effect migration)", () => {
  function withRootPlaceholder(value: unknown): unknown {
    const escapedRoot = JSON.stringify(FIXTURE_PATHS.root).slice(1, -1);
    return JSON.parse(JSON.stringify(value).split(escapedRoot).join("<root>"));
  }

  /** A scripted prompt provider recording every confirmation request and answering `answer`. */
  function scriptedPrompts(answer: boolean): Readonly<{
    prompts: PromptProvider;
    confirmations: readonly Readonly<{message: string; defaultValue: boolean | undefined}>[];
  }> {
    const confirmations: Readonly<{message: string; defaultValue: boolean | undefined}>[] = [];
    const {prompts} = createPrompts(answer);
    return {
      prompts: {
        ...prompts,
        confirm: async (message, defaultValue) => {
          confirmations.push({message, defaultValue});
          return answer;
        },
      },
      confirmations,
    };
  }

  /** One phase that submits a repository, a user, and a system action, then reports their dispositions. */
  function threeScopeActionPhase(executed: string[]): SetupPhaseDefinition {
    return stubPhase("infrastructure", {
      run: async (context) => {
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
        const status: SetupStatus = dispositions.includes("declined")
          ? "failed"
          : dispositions.includes("planned")
            ? "skipped"
            : "succeeded";
        return phaseResult("infrastructure", status, {summary: `Dispositions: ${dispositions.join(", ")}.`, durationMs: 5});
      },
    });
  }

  async function invokeThreeScopePhase(
    input: SetupInput,
    prompts: PromptProvider,
  ): Promise<Readonly<{execution: CommandExecution<SetupResult>; executed: readonly string[]; records: readonly unknown[]}>> {
    const executed: string[] = [];
    const {logger, sink} = createLogger(false);
    const {command} = createSetupFixture({logger, prompts, phases: [threeScopeActionPhase(executed)]});
    const execution = await command.invoke(input, {presentation: "human"});
    return {execution, executed, records: sink.records};
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
    const output = new PassThrough();
    const prompts = createTerminalPromptProvider({input: new PassThrough(), output, isTTY: false});

    // Act
    const defaulted = await prompts.confirm("Allow system setup action?", false);
    const undefaulted = await prompts.confirm("Allow system setup action?").then(
      (value) => ({kind: "resolved", value}),
      (error: unknown) => ({kind: "rejected", message: error instanceof Error ? error.message : String(error)}),
    );

    // Assert
    expect(defaulted).toBe(false);
    expect(undefaulted).toEqual({
      kind: "rejected",
      message: "Cannot request confirmation without an interactive terminal. Re-run setup in a TTY.",
    });
    expect(output.read()).toBeNull();
  });

  it("pins the exact non-TTY outcome of the real .NET phase's system action without --yes", async () => {
    // Arrange
    const output = new PassThrough();
    const prompts = createTerminalPromptProvider({input: new PassThrough(), output, isTTY: false});
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
    const session = {
      inspect: async (key: string) =>
        key === "dotnet"
          ? {kind: "available", value: facts, durationMs: 1}
          : {kind: "unavailable", reason: "Not exercised by this test.", durationMs: 0},
      invalidate: () => undefined,
      updateInfrastructureEngine: () => undefined,
    } as unknown as LegacyRepositoryInspectionSession;
    const runner = createProcessRunner();
    const {logger, sink} = createLogger(false);
    const {command} = createSetupFixture({logger, prompts, runner, session, phases: [dotnetSetupPhase]});

    // Act
    const execution = await command.invoke(options(), {presentation: "human"});
    const observed = withRootPlaceholder({
      execution,
      commands: runner.calls.map(({request}) => request),
      records: sink.records,
      promptOutput: output.read(),
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
      promptOutput: null,
    });
  });

  /**
   * Re-uses the real setup phase graph (ids, titles, requirement flags, and dependencies) with
   * scripted phase bodies, so dependency skipping is pinned against the production graph.
   */
  function realGraphWith(failing: string, ran: string[]): readonly SetupPhaseDefinition[] {
    return setupPhases.map((phase) => ({
      ...phase,
      run: async (): Promise<SetupPhaseResult> => {
        ran.push(phase.id);
        return phase.id === failing
          ? phaseResult(phase.id, "failed", {
              summary: `${phase.title} failed.`,
              evidence: [`${phase.id} evidence.`],
              nextActions: [`Repair ${phase.id}.`],
              durationMs: 3,
            })
          : phaseResult(phase.id, "succeeded", {summary: `${phase.title} is ready.`, durationMs: 2});
      },
    }));
  }

  it.each(["workspace.prerequisites", "workspace.root-dependencies"])(
    "pins dependency skipping, independent phases, the summary, and the exit code when %s fails",
    async (failing) => {
      // Arrange
      const ran: string[] = [];
      const {logger, sink} = createLogger(true);
      const {command} = createSetupFixture({logger, phases: realGraphWith(failing, ran)});

      // Act
      const execution = await command.invoke(options({verbose: true}), {presentation: "human"});
      const observed = withRootPlaceholder({execution, ran, records: sink.records});

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
    const {logger, sink} = createLogger(false);
    const {command} = createSetupFixture({
      logger,
      phases: [
        stubPhase("dotnet", {
          run: () =>
            Promise.resolve(
              phaseResult("dotnet", "succeeded", {summary: "The .NET SDK is ready.", evidence: ["SDK 10.0.100."], durationMs: 42}),
            ),
        }),
        stubPhase("react", {
          run: () =>
            Promise.resolve(
              phaseResult("react", reactStatus, {
                summary: reactStatus === "degraded" ? "Clerk credentials are unavailable." : "The website is ready.",
                nextActions: reactStatus === "degraded" ? ["Provide Clerk credentials, then rerun setup."] : [],
                durationMs: 7,
              }),
            ),
        }),
      ],
    });

    // Act
    const execution = await command.invoke(options(), {presentation: "human"});
    const observed = withRootPlaceholder({execution, records: sink.records});

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
