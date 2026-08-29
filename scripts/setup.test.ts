// @vitest-environment node
/**
 * @fileoverview Contract tests for setup option parsing and mutation control.
 * @module scripts.setup.test
 */

import {PassThrough} from "node:stream";
import {describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {CommandRunner} from "./common/process.ts";
import {createTerminalPromptProvider, type PromptProvider} from "./common/prompts.ts";
import {createSetupActionExecutor, main, parseSetupOptions, runSetup, setupPhases} from "./setup.ts";
import type {SetupAction, SetupContext, SetupOptions, SetupPhaseDefinition, SetupPhaseResult, SetupStatus} from "./setup.types.ts";

function createLogger(): Readonly<{
  logger: MonorepositoryConsoleLogger;
  sink: InMemoryLoggerSink;
}> {
  const sink = new InMemoryLoggerSink();
  const logger = new MonorepositoryConsoleLogger("setup", {
    color: false,
    sink,
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
    const prompts = createTerminalPromptProvider(logger, {
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

describe("parseSetupOptions", () => {
  it("returns disabled defaults when no arguments are provided", () => {
    expect(parseSetupOptions([])).toEqual({
      verbose: false,
      dryRun: false,
      yes: false,
    });
  });

  it("parses flags and a separate engine value", () => {
    expect(parseSetupOptions(["--verbose", "--dry-run", "--yes", "--engine", "rancher"])).toEqual({
      verbose: true,
      dryRun: true,
      yes: true,
      engine: "rancher",
    });
  });

  it("parses an inline engine value", () => {
    expect(parseSetupOptions(["--engine=podman"])).toEqual({
      verbose: false,
      dryRun: false,
      yes: false,
      engine: "podman",
    });
  });

  it("consumes --help without widening SetupOptions", () => {
    const parsed = parseSetupOptions(["--help"]);

    expect(parsed).toEqual({
      verbose: false,
      dryRun: false,
      yes: false,
    });
    expect(Object.keys(parsed)).toEqual(["verbose", "dryRun", "yes"]);
  });

  it.each([["--unknown"], ["positional"], ["--engine"], ["--engine=docker"]])("rejects invalid arguments: %s", (...argv) => {
    expect(() => parseSetupOptions(argv)).toThrow(/setup option|engine/i);
  });
});

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

    const {exitCode, results} = await runSetup(options(), {phases, logger, prompts, runner: noopRunner});

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

    const {exitCode, results} = await runSetup(options({dryRun: true}), {phases, logger, prompts, runner: noopRunner});

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

    const {exitCode, results} = await runSetup(options(), {phases, logger, prompts, runner: noopRunner});

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

    const {results} = await runSetup(options(), {phases, logger, prompts, runner: noopRunner});

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

    const {results} = await runSetup(options(), {phases, logger, prompts, runner: noopRunner});

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

    const {exitCode, results} = await runSetup(options(), {phases, logger, prompts, runner: noopRunner});

    expect(exitCode).toBe(0);
    expect(results[0]).toMatchObject({status: "degraded"});
  });

  it("returns exit code 1 for a required failure", async () => {
    const {prompts} = createPrompts();
    const {logger} = createLogger();
    const phases = [stubPhase("dotnet", {run: () => Promise.resolve(phaseResult("dotnet", "failed"))})];

    const {exitCode} = await runSetup(options(), {phases, logger, prompts, runner: noopRunner});

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

    await runSetup(options(), {phases, logger, prompts, runner: noopRunner});

    const rendered = sink.records.map((record) => record.text).join("\n");
    expect(rendered).toContain("The .NET SDK is ready. (42ms)");
  });

  it("propagates AbortError interruption instead of converting it to a failed result", async () => {
    const {prompts} = createPrompts();
    const {logger} = createLogger();
    const interruption = new DOMException("The command was interrupted", "AbortError");
    const phases = [stubPhase("dotnet", {run: () => Promise.reject(interruption)})];

    await expect(runSetup(options(), {phases, logger, prompts, runner: noopRunner})).rejects.toBe(interruption);
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

    const {exitCode, results} = await runSetup(options(), {phases, logger, prompts, runner: noopRunner});

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

    const {results} = await runSetup(options(), {phases, logger, prompts, runner: noopRunner});

    expect(results[0]).toMatchObject({
      status: "skipped",
      summary: expect.stringContaining("workspace.root-dependencies"),
    });
  });
});

describe("main", () => {
  it("renders help and returns 0 without parsing other options", async () => {
    await expect(main(["--bogus", "--help"])).resolves.toBe(0);
  });

  it("rejects on an invalid option instead of silently continuing", async () => {
    await expect(main(["--bogus"])).rejects.toThrow(/unknown setup option/i);
  });
});
