// @vitest-environment node
/**
 * @fileoverview Contract tests for Svelte workspace setup.
 * @module scripts.setup.svelte.test
 */

import {resolve} from "node:path";
import {afterEach, describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {CommandResult, CommandRunner, CommandSpec} from "./common/process.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import type {PackageRequirement, RepositoryRequirements} from "./common/requirements.ts";
import type {SvelteFacts, SvelteProjectId} from "./inspection/frontend.ts";
import type {InstalledPackageFact, PackageInventoryFacts} from "./inspection/packages.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";
import {createSvelteSetupPhase, svelteSetupPhase} from "./setup.svelte.ts";
import type {SetupAction, SetupActionDisposition, SetupActionExecutor, SetupContext, SetupOptions} from "./setup.types.ts";

const paths = createRepositoryPaths(resolve("C:\\fixture\\arolariu.ro"));
const requiredPackages = [
  "@sveltejs/kit",
  "@sveltejs/vite-plugin-svelte",
  "svelte",
  "svelte-adapter-azure-swa",
  "vite",
  "vitest",
  "typescript",
] as const;
const packageVersions = new Map<string, string>([
  ["@sveltejs/kit", "2.70.2"],
  ["@sveltejs/vite-plugin-svelte", "7.2.0"],
  ["svelte", "5.56.8"],
  ["svelte-adapter-azure-swa", "0.22.1"],
  ["vite", "8.2.0"],
  ["vitest", "4.1.10"],
  ["typescript", "6.0.3"],
]);
const nodeEngines: Readonly<Record<SvelteProjectId, string>> = {cv: ">=22", status: ">=24"};
const prepareCommand: CommandSpec = {
  command: "npm",
  args: ["run", "prepare", "--workspace=sites/cv.arolariu.ro", "--workspace=sites/status.arolariu.ro"],
};
const packageInventoryCommand: CommandSpec = {
  command: "npm",
  args: ["ls", "--json", "--depth=0"],
};

function commandResult(patch: Partial<CommandResult> = {}): CommandResult {
  return {
    code: 0,
    stdout: "",
    stderr: "",
    durationMs: 1,
    timedOut: false,
    ...patch,
  };
}

function commandKey(command: Readonly<CommandSpec>): string {
  return [command.command, ...command.args].join("\u0000");
}

function requirement(name: string, version: string): PackageRequirement {
  return {name, version};
}

function requirements(
  input: Readonly<{
    node?: Readonly<{major: number; minor: number; patch: number}>;
    omitPackage?: string;
    blankPackage?: string;
    packagePatch?: ReadonlyMap<string, string>;
  }> = {},
): RepositoryRequirements {
  const packages = new Map<string, PackageRequirement>();
  for (const [name, version] of packageVersions) {
    if (name !== input.omitPackage) {
      packages.set(name, requirement(name, name === input.blankPackage ? " " : (input.packagePatch?.get(name) ?? version)));
    }
  }
  return {
    node: input.node ?? {major: 24, minor: 0, patch: 0},
    npm: {major: 11, minor: 0, patch: 0},
    dotnet: {major: 10, minor: 0, patch: 0},
    python: {major: 3, minor: 12, patch: 0},
    packages,
  };
}

function options(patch: Partial<SetupOptions> = {}): SetupOptions {
  return {
    verbose: false,
    dryRun: false,
    yes: false,
    ...patch,
  };
}

function inventory(
  patch: Readonly<{absent?: readonly string[]; versions?: ReadonlyMap<string, string>; malformed?: readonly string[]}> = {},
): PackageInventoryFacts {
  const installed: Record<string, InstalledPackageFact> = {};
  for (const [name, version] of packageVersions) {
    if (patch.absent?.includes(name) === true) {
      continue;
    }
    installed[name] = {version: patch.versions?.get(name) ?? version};
  }
  return {installed, malformed: patch.malformed ?? []};
}

const emptyInventory: PackageInventoryFacts = {installed: {}, malformed: []};

type SvelteFactsPatch = Partial<Omit<SvelteFacts, "id" | "nodeEngine" | "adapterSpecifier">> & {
  nodeEngine?: string | undefined;
  adapterSpecifier?: string | undefined;
};

function svelteFacts(id: SvelteProjectId, patch: SvelteFactsPatch = {}): SvelteFacts {
  const {nodeEngine, adapterSpecifier, ...rest} = patch;
  // `"key" in patch` distinguishes an absent field (use the default) from an explicit `undefined`
  // (clear the optional field), which a destructuring default alone cannot tell apart.
  const includeNodeEngine = !("nodeEngine" in patch) || nodeEngine !== undefined;
  const includeAdapter = !("adapterSpecifier" in patch) || adapterSpecifier !== undefined;
  return {
    id,
    packageIssues: [],
    scriptIssues: [],
    generatedConfigExists: true,
    adapterIssues: [],
    ...rest,
    ...(includeNodeEngine ? {nodeEngine: nodeEngine ?? nodeEngines[id]} : {}),
    ...(includeAdapter ? {adapterSpecifier: adapterSpecifier ?? "svelte-adapter-azure-swa"} : {}),
  };
}

function svelteAvailable(id: SvelteProjectId, patch: SvelteFactsPatch = {}): InspectionOutcome<SvelteFacts> {
  return {kind: "available", value: svelteFacts(id, patch), durationMs: 1};
}

function packagesAvailable(value: PackageInventoryFacts = inventory()): InspectionOutcome<PackageInventoryFacts> {
  return {kind: "available", value, durationMs: 1};
}

function unavailable<T>(reason = "The repository root could not be inspected for installed package metadata."): InspectionOutcome<T> {
  return {kind: "unavailable", reason, durationMs: 1};
}

function invalid<T>(issues: readonly string[] = ["Installed package metadata is malformed for 'svelte'."]): InspectionOutcome<T> {
  return {kind: "invalid", issues, durationMs: 1};
}

interface InspectionHarness {
  readonly session: RepositoryInspectionSession;
  readonly inspect: ReturnType<typeof vi.fn>;
  readonly invalidate: ReturnType<typeof vi.fn>;
  readonly events: string[];
}

/** A controllable fake session resolving only the `"packages"` and both Svelte keys, in call order. */
function createInspectionHarness(
  input: Readonly<{
    packages?: readonly InspectionOutcome<PackageInventoryFacts>[];
    cv?: readonly InspectionOutcome<SvelteFacts>[];
    status?: readonly InspectionOutcome<SvelteFacts>[];
  }> = {},
): InspectionHarness {
  const sequences: Readonly<Record<string, readonly InspectionOutcome<unknown>[]>> = {
    packages: input.packages ?? [packagesAvailable()],
    "svelte.cv": input.cv ?? [svelteAvailable("cv")],
    "svelte.status": input.status ?? [svelteAvailable("status")],
  };
  const offsets = new Map<string, number>();
  const events: string[] = [];
  const inspect = vi.fn(async (key: string) => {
    events.push(`inspect:${key}`);
    const sequence = sequences[key];
    if (sequence === undefined || sequence.length === 0) {
      return {kind: "unavailable" as const, reason: "Not exercised by this test.", durationMs: 0};
    }
    const offset = offsets.get(key) ?? 0;
    offsets.set(key, offset + 1);
    return sequence[Math.min(offset, sequence.length - 1)]!;
  });
  const invalidate = vi.fn((...keys: readonly string[]) => {
    events.push(`invalidate:${keys.join("+")}`);
  });
  return {
    session: {inspect, invalidate, updateInfrastructureEngine: vi.fn()} as unknown as RepositoryInspectionSession,
    inspect,
    invalidate,
    events,
  };
}

function createRunner(responses: Readonly<Record<string, CommandResult | readonly CommandResult[]>> = {}): Readonly<{
  runner: CommandRunner;
  run: ReturnType<typeof vi.fn<CommandRunner["run"]>>;
}> {
  const offsets = new Map<string, number>();
  const run = vi.fn<CommandRunner["run"]>(async (command) => {
    const key = commandKey(command);
    const configured = responses[key];
    if (Array.isArray(configured)) {
      const offset = offsets.get(key) ?? 0;
      offsets.set(key, offset + 1);
      return configured[offset] ?? configured.at(-1) ?? commandResult();
    }
    return (configured as CommandResult | undefined) ?? commandResult();
  });
  return {runner: {run}, run};
}

function createActions(dispositions: Readonly<Record<string, SetupActionDisposition>> = {}): Readonly<{
  actions: SetupActionExecutor;
  actionIds: string[];
  actionRecords: SetupAction[];
}> {
  const actionIds: string[] = [];
  const actionRecords: SetupAction[] = [];
  const actions: SetupActionExecutor = {
    run: async (action) => {
      actionIds.push(action.id);
      actionRecords.push(action);
      const disposition = dispositions[action.id] ?? "executed";
      if (disposition === "executed") {
        await action.execute();
      }
      return disposition;
    },
  };
  return {actions, actionIds, actionRecords};
}

function createHarness(
  input: Readonly<{
    responses?: Readonly<Record<string, CommandResult | readonly CommandResult[]>>;
    dispositions?: Readonly<Record<string, SetupActionDisposition>>;
    setupOptions?: SetupOptions;
    repositoryRequirements?: RepositoryRequirements;
    packages?: readonly InspectionOutcome<PackageInventoryFacts>[];
    cv?: readonly InspectionOutcome<SvelteFacts>[];
    status?: readonly InspectionOutcome<SvelteFacts>[];
    actionsOverride?: SetupActionExecutor;
  }> = {},
): Readonly<{
  phase: ReturnType<typeof createSvelteSetupPhase>;
  context: SetupContext;
  run: ReturnType<typeof vi.fn<CommandRunner["run"]>>;
  actionIds: string[];
  actionRecords: SetupAction[];
  sink: InMemoryLoggerSink;
  inspect: ReturnType<typeof vi.fn>;
  invalidate: ReturnType<typeof vi.fn>;
  events: string[];
}> {
  const {runner, run} = createRunner(input.responses);
  const createdActions = createActions(input.dispositions);
  const sink = new InMemoryLoggerSink();
  const inspection = createInspectionHarness({
    ...(input.packages === undefined ? {} : {packages: input.packages}),
    ...(input.cv === undefined ? {} : {cv: input.cv}),
    ...(input.status === undefined ? {} : {status: input.status}),
  });
  let time = 0;
  const context: SetupContext = {
    options: input.setupOptions ?? options(),
    paths,
    requirements: input.repositoryRequirements ?? requirements(),
    inspection: inspection.session,
    runner,
    prompts: {
      confirm: async () => true,
      select: async <TValue extends string>(
        _message: string,
        choices: readonly Readonly<{value: TValue; label: string}>[],
      ): Promise<TValue> => {
        const selected = choices[0]?.value;
        if (selected === undefined) {
          throw new Error("A test choice is required.");
        }
        return selected;
      },
      text: async () => "",
      secret: async () => "",
    },
    actions: input.actionsOverride ?? createdActions.actions,
    logger: new MonorepositoryConsoleLogger("setup::svelte", {color: false, sink}),
    now: () => time++,
  };
  return {
    phase: createSvelteSetupPhase(),
    context,
    run,
    actionIds: createdActions.actionIds,
    actionRecords: createdActions.actionRecords,
    sink,
    inspect: inspection.inspect,
    invalidate: inspection.invalidate,
    events: inspection.events,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Svelte setup public contract", () => {
  it("exports the exact required phase metadata", () => {
    expect(svelteSetupPhase).toMatchObject({
      id: "svelte",
      title: "Svelte workspaces",
      required: true,
      dependsOn: ["workspace.root-dependencies"],
    });
    expect(createSvelteSetupPhase).toBeTypeOf("function");
  });

  it("no longer publishes a setup-owned workspace inspection surface", async () => {
    const module = await import("./setup.svelte.ts");

    expect(module).toMatchObject({
      createSvelteSetupPhase: expect.any(Function),
      svelteSetupPhase: expect.any(Object),
    });
    expect(Object.keys(module).toSorted()).toEqual(["createSvelteSetupPhase", "svelteSetupPhase"]);
  });
});

describe("shared fact consumption", () => {
  it("consumes the shared package inventory and both Svelte facts exactly once without running a command", async () => {
    const harness = createHarness();

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.events).toEqual(["inspect:packages", "inspect:svelte.cv", "inspect:svelte.status"]);
    expect(harness.run).not.toHaveBeenCalled();
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it.each([
    ["unavailable", unavailable<PackageInventoryFacts>()],
    ["invalid", invalid<PackageInventoryFacts>()],
  ])("fails when the shared package inventory is %s", async (_name, outcome) => {
    const harness = createHarness({packages: [outcome]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/installed package metadata|repository root/i);
    expect(harness.actionIds).toEqual([]);
    expect(harness.run).not.toHaveBeenCalled();
  });

  it.each([
    ["cv", "unavailable"],
    ["cv", "invalid"],
    ["status", "unavailable"],
    ["status", "invalid"],
  ])("fails when the %s project fact is %s", async (project, kind) => {
    const outcome =
      kind === "unavailable"
        ? unavailable<SvelteFacts>("The website environment file could not be read.")
        : invalid<SvelteFacts>(["Installed package metadata is malformed for 'svelte'."]);
    const harness = createHarness(project === "cv" ? {cv: [outcome]} : {status: [outcome]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain(project);
    expect(harness.actionIds).toEqual([]);
  });
});

describe("locked package policy", () => {
  it.each([
    ["missing", requirements({omitPackage: "vite"})],
    ["blank", requirements({blankPackage: "vite"})],
  ])("fails before inspecting any fact when the root requirement for a package is %s", async (_name, repositoryRequirements) => {
    const harness = createHarness({repositoryRequirements});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("vite");
    expect(harness.inspect).not.toHaveBeenCalled();
  });

  it("fails when an installed package version disagrees with its locked requirement", async () => {
    const harness = createHarness({packages: [packagesAvailable(inventory({versions: new Map([["svelte", "5.0.0"]])}))]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/svelte.*5\.0\.0|5\.0\.0.*svelte/i);
    expect(harness.actionIds).toEqual([]);
  });

  it("fails when a required package is absent outside dry-run", async () => {
    const harness = createHarness({
      packages: [packagesAvailable(inventory({absent: ["vitest"]}))],
      cv: [svelteAvailable("cv", {packageIssues: ["vitest is not installed."]})],
      status: [svelteAvailable("status", {packageIssues: ["vitest is not installed."]})],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("vitest");
  });

  it("defers absent required packages to the planned root-dependency action during dry-run", async () => {
    const harness = createHarness({
      packages: [packagesAvailable(emptyInventory)],
      cv: [svelteAvailable("cv", {packageIssues: requiredPackages.map((name) => `${name} is not installed.`)})],
      status: [svelteAvailable("status", {adapterIssues: ["svelte-adapter-azure-swa is not installed."]})],
      setupOptions: options({dryRun: true}),
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toMatch(/workspace\.root-dependencies/);
    expect(harness.actionIds).toEqual([]);
  });

  it("fails when the shared inventory reports a malformed required package manifest", async () => {
    const harness = createHarness({packages: [packagesAvailable(inventory({malformed: ["svelte"]}))]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("svelte");
  });
});

describe("project contract policy", () => {
  it("fails when the root Node minimum does not satisfy a validated project engine range", async () => {
    const harness = createHarness({repositoryRequirements: requirements({node: {major: 22, minor: 0, patch: 0}})});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/status/);
    expect(result.evidence.join("\n")).toMatch(/22/);
  });

  it("accepts a project engine range below the root Node minimum", async () => {
    const harness = createHarness({cv: [svelteAvailable("cv", {nodeEngine: ">=22.8"})]});

    await expect(harness.phase.run(harness.context)).resolves.toMatchObject({status: "succeeded"});
  });

  it("fails when a validated project engine range is absent", async () => {
    const harness = createHarness({
      cv: [
        svelteAvailable("cv", {
          nodeEngine: undefined,
          packageIssues: ["package.json#engines.node is missing or uses an unsupported range."],
        }),
      ],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("engines.node");
  });

  it.each([
    ["script", {scriptIssues: ["package.json#scripts.check does not run svelte-check."]}],
    ["adapter", {adapterIssues: ["svelte.config does not configure a recognizable kit.adapter."]}],
    ["package", {packageIssues: ["package.json could not be read or parsed."]}],
  ])("fails on %s issues reported by shared facts", async (_name, patch) => {
    const harness = createHarness({status: [svelteAvailable("status", patch)], setupOptions: options({dryRun: true})});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual([]);
  });
});

describe("generated SvelteKit configuration", () => {
  it("runs no preparation action when both generated configs exist", async () => {
    const harness = createHarness();

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).toEqual([]);
    expect(harness.run).not.toHaveBeenCalled();
  });

  it.each([["cv"], ["status"]])("prepares both workspaces with one action when the %s config is absent", async (project) => {
    const harness = createHarness(
      project === "cv"
        ? {cv: [svelteAvailable("cv", {generatedConfigExists: false}), svelteAvailable("cv")]}
        : {status: [svelteAvailable("status", {generatedConfigExists: false}), svelteAvailable("status")]},
    );

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.map(({id, scope}) => ({id, scope}))).toEqual([{id: "svelte.prepare", scope: "repository"}]);
    expect(harness.run).toHaveBeenCalledExactlyOnceWith(prepareCommand, {
      cwd: paths.root,
      output: "tee",
      logger: harness.context.logger,
    });
  });

  it("invalidates both Svelte facts and re-inspects them immediately after an executed preparation", async () => {
    const harness = createHarness({
      cv: [svelteAvailable("cv", {generatedConfigExists: false}), svelteAvailable("cv")],
      status: [svelteAvailable("status", {generatedConfigExists: false}), svelteAvailable("status")],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.events).toEqual([
      "inspect:packages",
      "inspect:svelte.cv",
      "inspect:svelte.status",
      "invalidate:svelte.cv+svelte.status",
      "inspect:svelte.cv",
      "inspect:svelte.status",
    ]);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("svelte.cv", "svelte.status");
  });

  it.each([["cv"], ["status"]])("fails when the refreshed %s config remains absent after preparation", async (project) => {
    const absent = svelteAvailable(project as SvelteProjectId, {generatedConfigExists: false});
    const harness = createHarness(project === "cv" ? {cv: [absent, absent]} : {status: [absent, absent]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/postcondition/i);
    expect(result.evidence.join("\n")).toContain(project);
  });

  it("fails when refreshed facts report a package, script, or adapter regression after preparation", async () => {
    const harness = createHarness({
      cv: [
        svelteAvailable("cv", {generatedConfigExists: false}),
        svelteAvailable("cv", {scriptIssues: ["package.json#scripts.build does not run vite build."]}),
      ],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("vite build");
  });

  it("fails when a refreshed Svelte fact cannot be observed after preparation", async () => {
    const harness = createHarness({
      cv: [
        svelteAvailable("cv", {generatedConfigExists: false}),
        unavailable<SvelteFacts>("The website environment file could not be read."),
      ],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("svelte.prepare");
  });

  it("invalidates both Svelte facts even when the attempted preparation command fails", async () => {
    const harness = createHarness({
      cv: [svelteAvailable("cv", {generatedConfigExists: false})],
      responses: {[commandKey(prepareCommand)]: commandResult({code: 1, stderr: "sync failed"})},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("sync failed");
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("svelte.cv", "svelte.status");
  });

  it("fails without invalidating when the required preparation is declined", async () => {
    const harness = createHarness({
      cv: [svelteAvailable("cv", {generatedConfigExists: false})],
      dispositions: {"svelte.prepare": "declined"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("svelte.prepare");
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("plans the preparation without invalidating or fabricating facts during dry-run", async () => {
    const harness = createHarness({
      cv: [svelteAvailable("cv", {generatedConfigExists: false})],
      setupOptions: options({dryRun: true}),
      dispositions: {"svelte.prepare": "planned"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toContain("Planned action: svelte.prepare");
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.run).not.toHaveBeenCalled();
    expect(harness.events).toEqual(["inspect:packages", "inspect:svelte.cv", "inspect:svelte.status"]);
  });
});

describe("interruption and command safety", () => {
  it("rethrows AbortError instead of converting interruption to a failure", async () => {
    const interruption = Object.assign(new Error("interrupted"), {name: "AbortError"});
    const harness = createHarness({
      cv: [svelteAvailable("cv", {generatedConfigExists: false})],
      actionsOverride: {run: async () => Promise.reject(interruption)},
    });

    await expect(harness.phase.run(harness.context)).rejects.toBe(interruption);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("invalidates both Svelte facts when an attempted preparation is interrupted", async () => {
    const interruption = Object.assign(new Error("interrupted"), {name: "AbortError"});
    const harness = createHarness({cv: [svelteAvailable("cv", {generatedConfigExists: false})]});
    harness.run.mockRejectedValueOnce(interruption);

    await expect(harness.phase.run(harness.context)).rejects.toBe(interruption);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("svelte.cv", "svelte.status");
  });

  it("uses explicit cwd and argument arrays without builds, tests, services, or package restoration", async () => {
    const harness = createHarness({
      cv: [svelteAvailable("cv", {generatedConfigExists: false}), svelteAvailable("cv")],
    });
    const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
      vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
    );

    await expect(harness.phase.run(harness.context)).resolves.toMatchObject({status: "succeeded"});

    expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    expect(harness.run.mock.calls.map(([command]) => commandKey(command))).not.toContain(commandKey(packageInventoryCommand));
    for (const [command, runOptions] of harness.run.mock.calls) {
      expect(Array.isArray(command.args)).toBe(true);
      expect(runOptions?.cwd).toBe(paths.root);
      const joined = [command.command, ...command.args].join(" ");
      expect(command.args).not.toEqual(expect.arrayContaining(["build"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["test"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["check"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["dev"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["ls"]));
      expect(joined).not.toMatch(/\bnpm (?:ci|install)\b/iu);
    }
  });
});
