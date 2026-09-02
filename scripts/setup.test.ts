// @vitest-environment node
/**
 * @fileoverview Contract tests for setup option parsing and mutation control.
 * @module scripts.setup.test
 */

import {spawn} from "node:child_process";
import {resolve} from "node:path";
import {PassThrough} from "node:stream";
import {fileURLToPath} from "node:url";
import {describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {CommandRunner} from "./common/process.ts";
import {createTerminalPromptProvider, type PromptProvider} from "./common/prompts.ts";
import {createRepositoryPaths, type RepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import type {RepositoryInspectionSession, RepositoryInspectionSessionFactory} from "./inspection/repository.ts";
import {createSetupActionExecutor, main, runSetup, setupPhases, type SetupDependencies} from "./setup.ts";
import type {SetupAction, SetupContext, SetupOptions, SetupPhaseDefinition, SetupPhaseResult, SetupStatus} from "./setup.types.ts";

/** A typed fake {@link RepositoryInspectionSession} that never resolves a real repository fact. */
function createFakeInspectionSession(): RepositoryInspectionSession {
  return {
    inspect: async () => ({kind: "unavailable", reason: "Not exercised by this test.", durationMs: 0}),
    invalidate: () => {},
    updateInfrastructureEngine: () => {},
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

/** Fixed repository paths so orchestrator tests never resolve the live checkout. */
const FIXED_REPOSITORY_PATHS: RepositoryPaths = createRepositoryPaths(resolve("C:\\fixture\\arolariu.ro"));

/** Fixed valid requirements so orchestrator tests never read live manifests. */
const FIXED_REPOSITORY_REQUIREMENTS: RepositoryRequirements = {
  node: {major: 24, minor: 0, patch: 0},
  npm: {major: 11, minor: 0, patch: 0},
  dotnet: {major: 10, minor: 0, patch: 0},
  python: {major: 3, minor: 12, patch: 0},
  packages: new Map(),
};

/**
 * Fixed path/requirements seam shared by every {@link runSetup} test.
 *
 * @remarks
 * Every orchestrator test must inject deterministic repository paths and a
 * valid requirements result so it never reads live manifests or local
 * tooling configuration (see F8 in the plan-wide remediation brief).
 */
function fixedRuntimeDependencies(): Pick<SetupDependencies, "resolveRepositoryPaths" | "loadRepositoryRequirements"> {
  return {
    resolveRepositoryPaths: () => FIXED_REPOSITORY_PATHS,
    loadRepositoryRequirements: async () => ({status: "valid", requirements: FIXED_REPOSITORY_REQUIREMENTS}),
  };
}

/**
 * Runs the orchestrator with the shared fixed path/requirements seam applied.
 *
 * @param setupOptions - Parsed setup options for this run.
 * @param dependencies - Additional boundary replacements for this run.
 * @returns The same result {@link runSetup} resolves with.
 */
function runSetupForTest(setupOptions: SetupOptions, dependencies: Readonly<Partial<SetupDependencies>>): ReturnType<typeof runSetup> {
  return runSetup(setupOptions, {...fixedRuntimeDependencies(), ...dependencies});
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

function options(patch: Partial<SetupOptions> = {}): SetupOptions {
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

// CLI option parsing (`--help`, `-h`, `/h`, `--verbose`, `--dry-run`, `--yes`, `--engine`) is
// owned by Commander through `main()`; see the `describe("main", ...)` CLI coverage below.

const noopRunner: CommandRunner = {
  run: async () => ({code: 0, stdout: "", stderr: "", durationMs: 0, timedOut: false}),
};

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

describe("runSetup", () => {
  it("succeeds when every phase reports success", async () => {
    const {prompts} = createPrompts();
    const {logger, sink} = createLogger();
    const phases = [stubPhase("a"), stubPhase("b", {dependsOn: ["a"]})];

    const {exitCode, results} = await runSetupForTest(options(), {phases, logger, prompts, runner: noopRunner});

    expect(exitCode).toBe(0);
    expect(results.map((result) => result.status)).toEqual(["succeeded", "succeeded"]);
    expect(sink.records.length).toBeGreaterThan(0);
  });

  it("traverses a dry-run planned dependency to run downstream generators", async () => {
    const {prompts} = createPrompts();
    const {logger} = createLogger();
    const rootDependenciesRun = vi.fn<() => Promise<SetupPhaseResult>>(() =>
      Promise.resolve(phaseResult("workspace.root-dependencies", "skipped", {summary: "Planned npm restoration."})),
    );
    const generatorsRun = vi.fn<() => Promise<SetupPhaseResult>>(() => Promise.resolve(phaseResult("workspace.generators", "succeeded")));
    const phases = [
      stubPhase("workspace.root-dependencies", {run: rootDependenciesRun}),
      stubPhase("workspace.generators", {dependsOn: ["workspace.root-dependencies"], run: generatorsRun}),
    ];

    const {exitCode, results} = await runSetupForTest(options({dryRun: true}), {phases, logger, prompts, runner: noopRunner});

    expect(generatorsRun).toHaveBeenCalledOnce();
    expect(results.find(({id}) => id === "workspace.generators")).toMatchObject({status: "succeeded"});
    expect(exitCode).toBe(0);
  });

  it("keeps python and infrastructure independent from a failed dotnet phase", async () => {
    const {prompts} = createPrompts();
    const {logger} = createLogger();
    const pythonRun = vi.fn<() => Promise<SetupPhaseResult>>(() => Promise.resolve(phaseResult("python", "succeeded")));
    const infrastructureRun = vi.fn<() => Promise<SetupPhaseResult>>(() => Promise.resolve(phaseResult("infrastructure", "succeeded")));
    const phases = [
      stubPhase("dotnet", {run: () => Promise.resolve(phaseResult("dotnet", "failed", {summary: "The .NET toolchain failed."}))}),
      stubPhase("python", {run: pythonRun}),
      stubPhase("infrastructure", {run: infrastructureRun}),
    ];

    const {exitCode, results} = await runSetupForTest(options(), {phases, logger, prompts, runner: noopRunner});

    expect(pythonRun).toHaveBeenCalledOnce();
    expect(infrastructureRun).toHaveBeenCalledOnce();
    expect(results.find(({id}) => id === "python")).toMatchObject({status: "succeeded"});
    expect(results.find(({id}) => id === "infrastructure")).toMatchObject({status: "succeeded"});
    expect(exitCode).toBe(1);
  });

  it("skips generators, react, and svelte when the workspace root dependency fails", async () => {
    const {prompts} = createPrompts();
    const {logger} = createLogger();
    const phases = [
      stubPhase("workspace.root-dependencies", {
        run: () => Promise.resolve(phaseResult("workspace.root-dependencies", "failed", {summary: "npm ci failed."})),
      }),
      stubPhase("workspace.generators", {dependsOn: ["workspace.root-dependencies"]}),
      stubPhase("react", {dependsOn: ["workspace.root-dependencies", "workspace.generators"]}),
      stubPhase("svelte", {dependsOn: ["workspace.root-dependencies"]}),
    ];

    const {results} = await runSetupForTest(options(), {phases, logger, prompts, runner: noopRunner});

    expect(results.find(({id}) => id === "workspace.generators")).toMatchObject({
      status: "skipped",
      summary: expect.stringContaining("workspace.root-dependencies"),
    });
    expect(results.find(({id}) => id === "react")).toMatchObject({
      status: "skipped",
      summary: expect.stringContaining("workspace.root-dependencies"),
    });
    expect(results.find(({id}) => id === "svelte")).toMatchObject({
      status: "skipped",
      summary: expect.stringContaining("workspace.root-dependencies"),
    });
  });

  it("does not skip react or svelte when only the .github scripts dependency fails", async () => {
    const {prompts} = createPrompts();
    const {logger} = createLogger();
    const reactRun = vi.fn<() => Promise<SetupPhaseResult>>(() => Promise.resolve(phaseResult("react", "succeeded")));
    const svelteRun = vi.fn<() => Promise<SetupPhaseResult>>(() => Promise.resolve(phaseResult("svelte", "succeeded")));
    const phases = [
      stubPhase("workspace.root-dependencies"),
      stubPhase("workspace.github-scripts-dependencies", {
        run: () =>
          Promise.resolve(phaseResult("workspace.github-scripts-dependencies", "failed", {summary: ".github scripts npm ci failed."})),
      }),
      stubPhase("react", {dependsOn: ["workspace.root-dependencies"], run: reactRun}),
      stubPhase("svelte", {dependsOn: ["workspace.root-dependencies"], run: svelteRun}),
    ];

    const {results} = await runSetupForTest(options(), {phases, logger, prompts, runner: noopRunner});

    expect(reactRun).toHaveBeenCalledOnce();
    expect(svelteRun).toHaveBeenCalledOnce();
    expect(results.find(({id}) => id === "react")).toMatchObject({status: "succeeded"});
    expect(results.find(({id}) => id === "svelte")).toMatchObject({status: "succeeded"});
  });

  it("returns exit code 0 for a degraded capability", async () => {
    const {prompts} = createPrompts();
    const {logger} = createLogger();
    const phases = [
      stubPhase("react", {
        run: () => Promise.resolve(phaseResult("react", "degraded", {summary: "Clerk credentials are unavailable."})),
      }),
    ];

    const {exitCode, results} = await runSetupForTest(options(), {phases, logger, prompts, runner: noopRunner});

    expect(exitCode).toBe(0);
    expect(results[0]).toMatchObject({status: "degraded"});
  });

  it("returns exit code 1 for a required failure", async () => {
    const {prompts} = createPrompts();
    const {logger} = createLogger();
    const phases = [stubPhase("dotnet", {run: () => Promise.resolve(phaseResult("dotnet", "failed"))})];

    const {exitCode} = await runSetupForTest(options(), {phases, logger, prompts, runner: noopRunner});

    expect(exitCode).toBe(1);
  });

  it("renders the exact duration and summary for a completed phase", async () => {
    const {prompts} = createPrompts();
    const {logger, sink} = createLogger();
    const phases = [
      stubPhase("dotnet", {
        run: () => Promise.resolve(phaseResult("dotnet", "succeeded", {summary: "The .NET SDK is ready.", durationMs: 42})),
      }),
    ];

    await runSetupForTest(options(), {phases, logger, prompts, runner: noopRunner});

    const rendered = sink.records.map((record) => record.text).join("\n");
    expect(rendered).toContain("The .NET SDK is ready. (42ms)");
  });

  it("propagates AbortError interruption instead of converting it to a failed result", async () => {
    const {prompts} = createPrompts();
    const {logger} = createLogger();
    const interruption = new DOMException("The command was interrupted", "AbortError");
    const phases = [stubPhase("dotnet", {run: () => Promise.reject(interruption)})];

    await expect(runSetupForTest(options(), {phases, logger, prompts, runner: noopRunner})).rejects.toBe(interruption);
  });

  it("converts an ordinary thrown exception into a failed result and continues with independent phases", async () => {
    const {prompts} = createPrompts();
    const {logger} = createLogger();
    const pythonRun = vi.fn<() => Promise<SetupPhaseResult>>(() => Promise.resolve(phaseResult("python", "succeeded")));
    const phases = [
      stubPhase("dotnet", {
        run: (): Promise<SetupPhaseResult> => {
          throw new Error("unexpected dotnet failure");
        },
      }),
      stubPhase("python", {run: pythonRun}),
    ];

    const {exitCode, results} = await runSetupForTest(options(), {phases, logger, prompts, runner: noopRunner});

    expect(pythonRun).toHaveBeenCalledOnce();
    expect(results.find(({id}) => id === "dotnet")).toMatchObject({
      status: "failed",
      evidence: expect.arrayContaining([expect.stringContaining("unexpected dotnet failure")]),
    });
    expect(exitCode).toBe(1);
  });

  it("blocks a phase whose dependency was never defined", async () => {
    const {prompts} = createPrompts();
    const {logger} = createLogger();
    const phases = [stubPhase("react", {dependsOn: ["workspace.root-dependencies"]})];

    const {results} = await runSetupForTest(options(), {phases, logger, prompts, runner: noopRunner});

    expect(results[0]).toMatchObject({
      status: "skipped",
      summary: expect.stringContaining("workspace.root-dependencies"),
    });
  });

  it("emits verbose dependency-block reasoning naming the unmet dependency and its status", async () => {
    const {prompts} = createPrompts();
    const {logger, sink} = createLogger(true);
    const phases = [
      stubPhase("workspace.root-dependencies", {
        run: () => Promise.resolve(phaseResult("workspace.root-dependencies", "failed", {summary: "npm ci failed."})),
      }),
      stubPhase("workspace.generators", {dependsOn: ["workspace.root-dependencies"]}),
    ];

    await runSetupForTest(options(), {phases, logger, prompts, runner: noopRunner});

    const rendered = sink.records.map((record) => record.text).join("\n");
    expect(rendered).toContain("🐛");
    expect(rendered).toMatch(/\[arolariu::setup::workspace\.generators]/);
    expect(rendered).toContain("workspace.root-dependencies");
    expect(rendered).toMatch(/status 'failed'/);
  });

  it("does not emit debug-level dependency-block reasoning in normal mode", async () => {
    const {prompts} = createPrompts();
    const {logger, sink} = createLogger(false);
    const phases = [
      stubPhase("workspace.root-dependencies", {
        run: () => Promise.resolve(phaseResult("workspace.root-dependencies", "failed", {summary: "npm ci failed."})),
      }),
      stubPhase("workspace.generators", {dependsOn: ["workspace.root-dependencies"]}),
    ];

    await runSetupForTest(options(), {phases, logger, prompts, runner: noopRunner});

    const rendered = sink.records.map((record) => record.text).join("\n");
    expect(rendered).not.toContain("🐛");
  });

  it("constructs one full inspection session for every setup phase", async () => {
    const {prompts} = createPrompts();
    const {logger} = createLogger();
    const fakeSession = createFakeInspectionSession();
    const createInspectionSession = vi.fn<RepositoryInspectionSessionFactory>(() => fakeSession);
    const receivedContexts: SetupContext[] = [];
    const phases = [
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
    ];

    await runSetupForTest(options(), {phases, logger, prompts, runner: noopRunner, createInspectionSession});

    expect(createInspectionSession).toHaveBeenCalledTimes(1);
    expect(createInspectionSession).toHaveBeenCalledWith(
      expect.objectContaining({
        profile: "full",
        paths: FIXED_REPOSITORY_PATHS,
      }),
    );
    expect(receivedContexts).toHaveLength(2);
    expect(receivedContexts.every((context) => context.inspection === receivedContexts[0]?.inspection)).toBe(true);
    expect(receivedContexts[0]?.inspection).toBe(fakeSession);
  });

  it("omits requestedEngine from the inspection session input when no engine option is set", async () => {
    const createInspectionSession = vi.fn<RepositoryInspectionSessionFactory>(() => createFakeInspectionSession());

    await runSetupForTest(options(), {
      phases: [stubPhase("a")],
      logger: createLogger().logger,
      prompts: createPrompts().prompts,
      runner: noopRunner,
      createInspectionSession,
    });

    const call = createInspectionSession.mock.calls[0];
    expect(call).toBeDefined();
    const input = call?.[0];
    if (input === undefined) {
      throw new Error("createInspectionSession was not called.");
    }
    expect(Object.hasOwn(input, "requestedEngine")).toBe(false);
  });

  it("passes the requested engine through to the inspection session", async () => {
    const createInspectionSession = vi.fn<RepositoryInspectionSessionFactory>(() => createFakeInspectionSession());

    await runSetupForTest(options({engine: "podman"}), {
      phases: [stubPhase("a")],
      logger: createLogger().logger,
      prompts: createPrompts().prompts,
      runner: noopRunner,
      createInspectionSession,
    });

    expect(createInspectionSession).toHaveBeenCalledWith(expect.objectContaining({requestedEngine: "podman"}));
  });

  it("does not construct an inspection session when repository requirements are invalid", async () => {
    const {prompts} = createPrompts();
    const {logger} = createLogger();
    const createInspectionSession = vi.fn<RepositoryInspectionSessionFactory>(() => createFakeInspectionSession());

    await expect(
      runSetup(options(), {
        resolveRepositoryPaths: () => FIXED_REPOSITORY_PATHS,
        loadRepositoryRequirements: async () => ({status: "invalid", errors: ["reason is blocking"]}),
        logger,
        prompts,
        runner: noopRunner,
        createInspectionSession,
      }),
    ).rejects.toThrow(/invalid/i);

    expect(createInspectionSession).not.toHaveBeenCalled();
  });
});

describe("phase command execution", () => {
  it("does not emit command evidence in normal mode", async () => {
    const {prompts} = createPrompts();
    const {logger, sink} = createLogger(false);
    const run = vi.fn<CommandRunner["run"]>(async () => ({code: 0, stdout: "", stderr: "", durationMs: 1, timedOut: false}));
    const phases = [
      stubPhase("dotnet", {
        run: async (context) => {
          await context.runner.run({command: "dotnet", args: ["--version"]});
          return phaseResult("dotnet", "succeeded");
        },
      }),
    ];

    await runSetupForTest(options({verbose: false}), {phases, logger, prompts, runner: {run}});

    expect(sink.records.some((record) => record.text.includes("dotnet --version"))).toBe(false);
  });

  it("emits formatted command evidence in verbose mode without stdin or environment values", async () => {
    const {prompts} = createPrompts();
    const {logger, sink} = createLogger(false);
    const run = vi.fn<CommandRunner["run"]>(async () => ({code: 0, stdout: "", stderr: "", durationMs: 1, timedOut: false}));
    const phases = [
      stubPhase("dotnet", {
        run: async (context) => {
          await context.runner.run(
            {command: "dotnet", args: ["user-secrets", "set"]},
            {input: "super-secret-stdin-payload", env: {SOME_TOKEN: "super-secret-env-value"}},
          );
          return phaseResult("dotnet", "succeeded");
        },
      }),
    ];

    await runSetupForTest(options({verbose: true}), {phases, logger, prompts, runner: {run}});

    const rendered = sink.records.map((record) => record.text).join("\n");
    expect(rendered).toContain("$ dotnet user-secrets set");
    expect(rendered).not.toContain("super-secret-stdin-payload");
    expect(rendered).not.toContain("super-secret-env-value");
  });

  it.each([
    ["no explicit output mode", undefined, 120_000],
    ["capture", "capture" as const, 120_000],
    ["tee", "tee" as const, 1_200_000],
    ["inherit", "inherit" as const, 1_200_000],
  ] as const)("bounds a command with %s with the default timeout %i", async (_case, output, expectedTimeoutMs) => {
    const {prompts} = createPrompts();
    const {logger} = createLogger(false);
    const run = vi.fn<CommandRunner["run"]>(async () => ({code: 0, stdout: "", stderr: "", durationMs: 1, timedOut: false}));
    const phases = [
      stubPhase("dotnet", {
        run: async (context) => {
          await context.runner.run({command: "dotnet", args: ["--version"]}, output === undefined ? {} : {output});
          return phaseResult("dotnet", "succeeded");
        },
      }),
    ];

    await runSetupForTest(options(), {phases, logger, prompts, runner: {run}});

    expect(run).toHaveBeenCalledWith({command: "dotnet", args: ["--version"]}, expect.objectContaining({timeoutMs: expectedTimeoutMs}));
  });

  it("preserves an explicit caller timeout instead of applying a default", async () => {
    const {prompts} = createPrompts();
    const {logger} = createLogger(false);
    const run = vi.fn<CommandRunner["run"]>(async () => ({code: 0, stdout: "", stderr: "", durationMs: 1, timedOut: false}));
    const phases = [
      stubPhase("dotnet", {
        run: async (context) => {
          await context.runner.run({command: "dotnet", args: ["--version"]}, {output: "tee", timeoutMs: 5_000});
          return phaseResult("dotnet", "succeeded");
        },
      }),
    ];

    await runSetupForTest(options(), {phases, logger, prompts, runner: {run}});

    expect(run).toHaveBeenCalledWith({command: "dotnet", args: ["--version"]}, expect.objectContaining({timeoutMs: 5_000}));
  });
});

describe("main", () => {
  it.each([["--help"], ["-h"], ["/h"]])("performs no repository work and exits 0 for %s", async (flag) => {
    const {logger} = createLogger();
    const resolveRepositoryPaths = vi.fn<() => RepositoryPaths>(() => FIXED_REPOSITORY_PATHS);

    const exitCode = await main([flag], {logger, resolveRepositoryPaths});

    expect(exitCode).toBe(0);
    expect(resolveRepositoryPaths).not.toHaveBeenCalled();
  });

  it("renders help and returns 0 without parsing other options", async () => {
    const resolveRepositoryPaths = vi.fn<() => RepositoryPaths>(() => FIXED_REPOSITORY_PATHS);

    await expect(main(["--bogus", "--help"], {resolveRepositoryPaths})).resolves.toBe(0);

    expect(resolveRepositoryPaths).not.toHaveBeenCalled();
  });

  it("returns 1 and renders the option error instead of silently continuing", async () => {
    const {logger, sink} = createLogger();
    const resolveRepositoryPaths = vi.fn<() => RepositoryPaths>(() => FIXED_REPOSITORY_PATHS);

    await expect(main(["--bogus"], {logger, resolveRepositoryPaths})).resolves.toBe(1);

    expect(resolveRepositoryPaths).not.toHaveBeenCalled();
    expect(sink.records.map((record) => record.text).join("\n")).toMatch(/unknown option/i);
  });

  it("returns 1 and performs no repository work for an invalid --engine value", async () => {
    const {logger, sink} = createLogger();
    const resolveRepositoryPaths = vi.fn<() => RepositoryPaths>(() => FIXED_REPOSITORY_PATHS);

    await expect(main(["--engine=docker"], {logger, resolveRepositoryPaths})).resolves.toBe(1);

    expect(resolveRepositoryPaths).not.toHaveBeenCalled();
    expect(sink.records.map((record) => record.text).join("\n")).toMatch(/engine/i);
  });

  it.each([
    ["--verbose", {verbose: true, dryRun: false, yes: false}],
    ["--dry-run", {verbose: false, dryRun: true, yes: false}],
    ["--yes", {verbose: false, dryRun: false, yes: true}],
  ] as const)("parses %s into SetupOptions before running setup", async (flag, expectedOptions) => {
    const {logger} = createLogger();
    const {prompts} = createPrompts();
    let receivedOptions: SetupOptions | undefined;
    const phases = [
      stubPhase("dotnet", {
        run: async (context) => {
          receivedOptions = context.options;
          return phaseResult("dotnet", "succeeded");
        },
      }),
    ];

    const exitCode = await main([flag], {logger, prompts, runner: noopRunner, phases, ...fixedRuntimeDependencies()});

    expect(exitCode).toBe(0);
    expect(receivedOptions).toEqual(expectedOptions);
  });

  it.each([
    ["--engine", "podman", ["--engine", "podman"]],
    ["--engine=podman", "podman", ["--engine=podman"]],
  ] as const)("parses %s into a podman SetupOptions.engine before running setup", async (_case, expectedEngine, argv) => {
    const {logger} = createLogger();
    const {prompts} = createPrompts();
    let receivedOptions: SetupOptions | undefined;
    const phases = [
      stubPhase("dotnet", {
        run: async (context) => {
          receivedOptions = context.options;
          return phaseResult("dotnet", "succeeded");
        },
      }),
    ];

    const exitCode = await main([...argv], {logger, prompts, runner: noopRunner, phases, ...fixedRuntimeDependencies()});

    expect(exitCode).toBe(0);
    expect(receivedOptions?.engine).toBe(expectedEngine);
  });

  it("returns 1 and renders every blocking reason for invalid repository requirements", async () => {
    const {logger, sink} = createLogger();

    const exitCode = await main([], {
      logger,
      ...fixedRuntimeDependencies(),
      loadRepositoryRequirements: async () => ({status: "invalid", errors: ["reason one is blocking", "reason two is blocking"]}),
    });

    expect(exitCode).toBe(1);
    const rendered = sink.records.map((record) => record.text).join("\n");
    expect(rendered).toContain("reason one is blocking");
    expect(rendered).toContain("reason two is blocking");
  });

  it("returns 130 and renders interruption when a phase aborts", async () => {
    const {logger, sink} = createLogger();
    const {prompts} = createPrompts();
    const interruption = new DOMException("The command was interrupted", "AbortError");

    const exitCode = await main([], {
      logger,
      prompts,
      runner: noopRunner,
      phases: [stubPhase("dotnet", {run: () => Promise.reject(interruption)})],
      ...fixedRuntimeDependencies(),
    });

    expect(exitCode).toBe(130);
    expect(sink.records.map((record) => record.text).join("\n")).toMatch(/interrupt/i);
  });

  it("emits a diagnostic and exits 1 for direct process invocation of an invalid option", async () => {
    const setupEntrypoint = fileURLToPath(new URL("./setup.ts", import.meta.url));

    const result = await new Promise<{code: number | null; output: string}>((resolveProcess, rejectProcess) => {
      const child = spawn(process.execPath, [setupEntrypoint, "--bogus"], {
        cwd: resolve(setupEntrypoint, "..", ".."),
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      child.stdout.on("data", (chunk: Buffer) => {
        output += chunk.toString("utf8");
      });
      child.stderr.on("data", (chunk: Buffer) => {
        output += chunk.toString("utf8");
      });
      child.once("error", rejectProcess);
      child.once("close", (code) => {
        resolveProcess({code, output});
      });
    });

    expect(result.code).toBe(1);
    expect(result.output.trim().length).toBeGreaterThan(0);
    expect(result.output).toMatch(/unknown option/i);
  });
});
