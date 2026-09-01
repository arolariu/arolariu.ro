// @vitest-environment node
/**
 * @fileoverview Contract tests for React, website environment, and Playwright setup.
 * @module scripts.setup.react.test
 */

import {mkdtemp, readFile, readdir, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {CommandResult, CommandRunner, CommandSpec} from "./common/process.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import type {PackageRequirement, RepositoryRequirements} from "./common/requirements.ts";
import type {EnvironmentFacts, ReactFacts} from "./inspection/frontend.ts";
import type {InstalledPackageFact, PackageInventoryFacts} from "./inspection/packages.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";
import {createReactSetupPhase, reactSetupPhase, writeTextFileAtomically, type ReactSetupDependencies} from "./setup.react.ts";
import type {SetupAction, SetupActionDisposition, SetupActionExecutor, SetupContext, SetupOptions} from "./setup.types.ts";

const filesystemFailures = vi.hoisted((): {rename?: Readonly<{path: string; code: string}>} => ({}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    rename: (...args: unknown[]) => {
      const failure = filesystemFailures.rename;
      if (failure !== undefined && String(args[1]) === failure.path) {
        return Promise.reject(Object.assign(new Error(`${failure.code}: simulated rename failure`), {code: failure.code}));
      }
      return Reflect.apply(actual.rename, actual, args);
    },
  };
});

const paths = createRepositoryPaths(resolve("C:\\fixture\\arolariu.ro"));
const lockedPackageVersions = new Map<string, string>([
  ["react", "19.2.8"],
  ["react-dom", "19.2.8"],
  ["next", "16.3.0"],
  ["@clerk/nextjs", "7.6.5"],
  ["@docusaurus/core", "3.10.2"],
  ["@playwright/test", "1.62.1"],
  ["playwright", "1.62.1"],
]);
const workspaceLinkedPackage = "@arolariu/components";
const workspaceLinkedRoot = "packages/components";
const installedComponentsVersion = "2.3.0";
const lockedPlaywrightVersion = "1.62.1";
const browserInstallCommand: CommandSpec = {
  command: "npx",
  args: ["--no-install", "playwright", "install", "chromium"],
};
const dependencyProbeCommand: CommandSpec = {
  command: "npx",
  args: ["--no-install", "playwright", "install-deps", "--dry-run", "chromium"],
};
const dependencyInstallCommand: CommandSpec = {
  command: "npx",
  args: ["--no-install", "playwright", "install-deps", "chromium"],
};
const packageInventoryCommand: CommandSpec = {
  command: "npm",
  args: ["ls", "--json", "--depth=0"],
};
const browserInventoryCommand: CommandSpec = {
  command: "npx",
  args: ["--no-install", "playwright", "install", "--list"],
};
const completeEnvironment = [
  "SITE_ENV=DEVELOPMENT",
  "SITE_NAME=dev.arolariu.ro",
  "SITE_URL=https://localhost:3000",
  "USE_CDN=false",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_existing",
  "CLERK_SECRET_KEY=sk_test_existing",
  "",
].join("\n");

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

function requirements(input: Readonly<{patch?: ReadonlyMap<string, string>; omit?: string}> = {}): RepositoryRequirements {
  const packages = new Map<string, PackageRequirement>();
  for (const [name, version] of lockedPackageVersions) {
    if (name === input.omit) {
      continue;
    }
    packages.set(name, requirement(name, input.patch?.get(name) ?? version));
  }
  packages.set(workspaceLinkedPackage, requirement(workspaceLinkedPackage, "2.2.0"));
  return {
    node: {major: 24, minor: 0, patch: 0},
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
  patch: Readonly<{
    absent?: readonly string[];
    versions?: ReadonlyMap<string, string>;
    componentsWorkspaceRoot?: string | null;
    malformed?: readonly string[];
  }> = {},
): PackageInventoryFacts {
  const installed: Record<string, InstalledPackageFact> = {};
  for (const [name, version] of lockedPackageVersions) {
    if (patch.absent?.includes(name) === true) {
      continue;
    }
    installed[name] = {version: patch.versions?.get(name) ?? version};
  }
  if (patch.absent?.includes(workspaceLinkedPackage) !== true) {
    const workspaceRoot = patch.componentsWorkspaceRoot === undefined ? workspaceLinkedRoot : patch.componentsWorkspaceRoot;
    installed[workspaceLinkedPackage] = {
      version: installedComponentsVersion,
      ...(workspaceRoot === null ? {} : {workspaceRoot}),
    };
  }
  return {installed, malformed: patch.malformed ?? []};
}

const emptyInventory: PackageInventoryFacts = {installed: {}, malformed: []};

function environmentFacts(patch: Partial<EnvironmentFacts> = {}): EnvironmentFacts {
  return {
    syntaxErrors: [],
    presentKeys: ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "SITE_ENV", "SITE_NAME", "SITE_URL", "USE_CDN"],
    missingCoreKeys: [],
    missingAuthenticationKeys: [],
    ...patch,
  };
}

type PlaywrightFacts = ReactFacts["playwright"];

function playwrightFacts(patch: Readonly<{version?: string | null; browsers?: readonly string[]}> = {}): PlaywrightFacts {
  const version = patch.version === undefined ? lockedPlaywrightVersion : patch.version;
  return {
    ...(version === null ? {} : {version}),
    browsers: patch.browsers ?? ["chromium-1179", "ffmpeg-1011"],
  };
}

function reactFacts(patch: Partial<ReactFacts> = {}): ReactFacts {
  return {
    packages: inventory(),
    workspaceLinkIssues: [],
    environment: environmentFacts(),
    i18nIssues: [],
    artifactIssues: [],
    playwright: playwrightFacts(),
    frameworkIssues: [],
    ...patch,
  };
}

function reactAvailable(patch: Partial<ReactFacts> = {}): InspectionOutcome<ReactFacts> {
  return {kind: "available", value: reactFacts(patch), durationMs: 1};
}

function packagesAvailable(value: PackageInventoryFacts = inventory()): InspectionOutcome<PackageInventoryFacts> {
  return {kind: "available", value, durationMs: 1};
}

function unavailable<T>(reason = "The Playwright browser inventory could not be read."): InspectionOutcome<T> {
  return {kind: "unavailable", reason, durationMs: 1};
}

function invalid<T>(
  issues: readonly string[] = ["The Playwright browser inventory reported multiple ambiguous versions."],
): InspectionOutcome<T> {
  return {kind: "invalid", issues, durationMs: 1};
}

interface InspectionHarness {
  readonly session: RepositoryInspectionSession;
  readonly inspect: ReturnType<typeof vi.fn>;
  readonly invalidate: ReturnType<typeof vi.fn>;
  readonly events: string[];
}

/** A controllable fake session resolving only the `"packages"` and `"react"` keys, in call order. */
function createInspectionHarness(
  input: Readonly<{
    packages?: readonly InspectionOutcome<PackageInventoryFacts>[];
    react?: readonly InspectionOutcome<ReactFacts>[];
  }> = {},
): InspectionHarness {
  const sequences: Readonly<Record<string, readonly InspectionOutcome<unknown>[]>> = {
    packages: input.packages ?? [packagesAvailable()],
    react: input.react ?? [reactAvailable()],
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

interface VirtualFilesystem {
  readonly files: Map<string, string>;
  readonly writes: Array<Readonly<{path: string; content: string; mode: number}>>;
  readonly modes: Array<Readonly<{path: string; mode: number}>>;
  readonly dependencies: ReactSetupDependencies;
}

function createFilesystem(
  input: Readonly<{
    environment?: string | null;
    platform?: NodeJS.Platform;
    interactive?: boolean;
  }> = {},
): VirtualFilesystem {
  const files = new Map<string, string>();
  if (input.environment !== null) {
    files.set(paths.websiteEnvironment, input.environment ?? completeEnvironment);
  }
  const writes: Array<Readonly<{path: string; content: string; mode: number}>> = [];
  const modes: Array<Readonly<{path: string; mode: number}>> = [];
  const missingError = (path: string): Error => Object.assign(new Error(`ENOENT: ${path}`), {code: "ENOENT"});

  return {
    files,
    writes,
    modes,
    dependencies: {
      platform: input.platform ?? "win32",
      interactive: input.interactive ?? false,
      readTextFile: async (path) => {
        const content = files.get(path);
        if (content === undefined) {
          throw missingError(path);
        }
        return content;
      },
      writeTextFile: async (path, content, mode) => {
        writes.push({path, content, mode});
        files.set(path, content);
      },
      setFileMode: async (path, mode) => {
        modes.push({path, mode});
      },
    },
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
    filesystem?: VirtualFilesystem;
    responses?: Readonly<Record<string, CommandResult | readonly CommandResult[]>>;
    dispositions?: Readonly<Record<string, SetupActionDisposition>>;
    setupOptions?: SetupOptions;
    requirementsOverride?: RepositoryRequirements;
    packages?: readonly InspectionOutcome<PackageInventoryFacts>[];
    react?: readonly InspectionOutcome<ReactFacts>[];
    textAnswers?: readonly string[];
    secretAnswers?: readonly string[];
    actionsOverride?: SetupActionExecutor;
  }> = {},
): Readonly<{
  phase: ReturnType<typeof createReactSetupPhase>;
  context: SetupContext;
  filesystem: VirtualFilesystem;
  run: ReturnType<typeof vi.fn<CommandRunner["run"]>>;
  actionIds: string[];
  actionRecords: SetupAction[];
  text: ReturnType<typeof vi.fn<SetupContext["prompts"]["text"]>>;
  secret: ReturnType<typeof vi.fn<SetupContext["prompts"]["secret"]>>;
  sink: InMemoryLoggerSink;
  redactions: string[];
  inspect: ReturnType<typeof vi.fn>;
  invalidate: ReturnType<typeof vi.fn>;
  events: string[];
}> {
  const filesystem = input.filesystem ?? createFilesystem();
  const {runner, run} = createRunner(input.responses);
  const createdActions = createActions(input.dispositions);
  const textAnswers = [...(input.textAnswers ?? [])];
  const secretAnswers = [...(input.secretAnswers ?? [])];
  const text = vi.fn<SetupContext["prompts"]["text"]>(async () => textAnswers.shift() ?? "");
  const secret = vi.fn<SetupContext["prompts"]["secret"]>(async () => secretAnswers.shift() ?? "");
  const sink = new InMemoryLoggerSink();
  const logger = new MonorepositoryConsoleLogger("setup::react", {color: false, sink});
  const redactions: string[] = [];
  const originalRedact = logger.redact.bind(logger);
  logger.redact = (value: string): void => {
    redactions.push(value);
    originalRedact(value);
  };
  const inspection = createInspectionHarness({
    ...(input.packages === undefined ? {} : {packages: input.packages}),
    ...(input.react === undefined ? {} : {react: input.react}),
  });
  let time = 0;
  const context: SetupContext = {
    options: input.setupOptions ?? options(),
    paths,
    requirements: input.requirementsOverride ?? requirements(),
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
      text,
      secret,
    },
    actions: input.actionsOverride ?? createdActions.actions,
    logger,
    now: () => time++,
  };
  return {
    phase: createReactSetupPhase(filesystem.dependencies),
    context,
    filesystem,
    run,
    actionIds: createdActions.actionIds,
    actionRecords: createdActions.actionRecords,
    text,
    secret,
    sink,
    redactions,
    inspect: inspection.inspect,
    invalidate: inspection.invalidate,
    events: inspection.events,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock("@azure/identity");
});

describe("writeTextFileAtomically", () => {
  let root: string;

  beforeEach(async () => {
    delete filesystemFailures.rename;
    root = await mkdtemp(join(tmpdir(), "arolariu-setup-react-env-"));
  });

  afterEach(async () => {
    delete filesystemFailures.rename;
    await rm(root, {recursive: true, force: true});
  });

  it("replaces the destination file atomically with no leftover temporary sibling", async () => {
    const target = join(root, ".env");
    await writeFile(target, "EXISTING=1\n", "utf8");

    await writeTextFileAtomically(target, "EXISTING=1\nADDED=2\n", 0o600);

    await expect(readFile(target, "utf8")).resolves.toBe("EXISTING=1\nADDED=2\n");
    await expect(readdir(root)).resolves.toEqual([".env"]);
  });

  it("preserves the original file content and removes the temporary file when rename fails", async () => {
    const target = join(root, ".env");
    const originalContent = "CLERK_SECRET_KEY=sk_test_original\n";
    await writeFile(target, originalContent, "utf8");
    filesystemFailures.rename = {path: target, code: "EPERM"};

    await expect(writeTextFileAtomically(target, "CLERK_SECRET_KEY=sk_test_original\nADDED=2\n", 0o600)).rejects.toThrow(
      /simulated rename failure/,
    );

    await expect(readFile(target, "utf8")).resolves.toBe(originalContent);
    await expect(readdir(root)).resolves.toEqual([".env"]);
  });
});

describe("React setup public contract", () => {
  it("publishes a required phase with both workspace dependencies", () => {
    expect(reactSetupPhase).toMatchObject({
      id: "react",
      required: true,
      dependsOn: ["workspace.root-dependencies", "workspace.generators"],
    });
  });

  it("keeps the setup import graph safe before external packages are restored", async () => {
    vi.resetModules();
    vi.doMock("@azure/identity", () => {
      throw new Error("Azure identity loaded eagerly");
    });

    await expect(import("./setup.react.ts")).resolves.toMatchObject({
      createReactSetupPhase: expect.any(Function),
      prepareWebsiteEnvironment: expect.any(Function),
      reactSetupPhase: expect.any(Object),
    });
  });
});

describe("shared fact consumption", () => {
  it("consumes exactly the shared packages and react facts and runs no inventory command", async () => {
    const harness = createHarness();

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.events).toEqual(["inspect:packages", "inspect:react"]);
    expect(harness.inspect.mock.calls.map(([key]) => key)).toEqual(["packages", "react"]);
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.run).not.toHaveBeenCalled();
  });

  it.each([
    ["unavailable", unavailable<PackageInventoryFacts>("The repository root could not be inspected for installed package metadata.")],
    ["invalid", invalid<PackageInventoryFacts>(["Installed package metadata is malformed for 'next'."])],
  ])("fails when the shared package inventory is %s", async (_name, outcome) => {
    const harness = createHarness({packages: [outcome]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/installed package metadata|repository root/i);
    expect(harness.actionIds).toEqual([]);
    expect(harness.run).not.toHaveBeenCalled();
  });

  it.each([
    ["unavailable", unavailable<ReactFacts>()],
    ["invalid", invalid<ReactFacts>()],
  ])("fails when the shared React facts are %s", async (_name, outcome) => {
    const harness = createHarness({react: [outcome]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/Playwright browser inventory/i);
    expect(harness.actionIds).toEqual([]);
    expect(harness.run).not.toHaveBeenCalled();
  });

  it("defers a fresh-checkout dry-run only when the shared inventory proves every package is absent", async () => {
    const filesystem = createFilesystem({environment: null});
    const harness = createHarness({
      filesystem,
      packages: [packagesAvailable(emptyInventory)],
      react: [unavailable<ReactFacts>()],
      setupOptions: options({dryRun: true}),
      dispositions: {
        "react.environment.write": "planned",
        "react.playwright.chromium.install": "planned",
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toEqual(["react.environment.write", "react.playwright.chromium.install"]);
    expect(result.evidence.join("\n")).toMatch(/workspace\.root-dependencies/);
    expect(harness.run).not.toHaveBeenCalled();
    expect(filesystem.writes).toHaveLength(0);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("does not defer a fresh-checkout dry-run when only some required packages are absent", async () => {
    const harness = createHarness({
      packages: [packagesAvailable(inventory({absent: ["next"]}))],
      react: [unavailable<ReactFacts>()],
      setupOptions: options({dryRun: true}),
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual([]);
  });

  it("never defers an invalid React fact in a fresh-checkout dry-run", async () => {
    const harness = createHarness({
      packages: [packagesAvailable(emptyInventory)],
      react: [invalid<ReactFacts>()],
      setupOptions: options({dryRun: true}),
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual([]);
  });
});

describe("locked package policy", () => {
  it("fails before inspecting any fact when a manifest package requirement is missing", async () => {
    const harness = createHarness({requirementsOverride: requirements({omit: "next"})});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("next");
    expect(harness.inspect).not.toHaveBeenCalled();
  });

  it("requires playwright and @playwright/test to share one manifest-derived version", async () => {
    const harness = createHarness({requirementsOverride: requirements({patch: new Map([["playwright", "1.61.0"]])})});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/playwright/i);
    expect(harness.inspect).not.toHaveBeenCalled();
  });

  it("fails when an installed package version disagrees with its locked requirement", async () => {
    const harness = createHarness({packages: [packagesAvailable(inventory({versions: new Map([["react", "18.3.1"]])}))]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/react.*18\.3\.1|18\.3\.1.*react/i);
    expect(harness.actionIds).toEqual([]);
  });

  it("fails when a required package is absent outside dry-run", async () => {
    const harness = createHarness({packages: [packagesAvailable(inventory({absent: ["@clerk/nextjs"]}))]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("@clerk/nextjs");
  });

  it("defers absent required packages to the planned root-dependency action during dry-run", async () => {
    const harness = createHarness({
      packages: [packagesAvailable(inventory({absent: ["@clerk/nextjs"]}))],
      setupOptions: options({dryRun: true}),
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toMatch(/workspace\.root-dependencies/);
  });

  it("requires the components package to resolve to the local workspace link", async () => {
    const harness = createHarness({packages: [packagesAvailable(inventory({componentsWorkspaceRoot: null}))]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/@arolariu\/components/);
  });

  it("fails when the components package is linked outside the packages/components workspace", async () => {
    const harness = createHarness({packages: [packagesAvailable(inventory({componentsWorkspaceRoot: "sites/arolariu.ro"}))]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/@arolariu\/components/);
  });

  it("fails when the shared React facts report workspace link issues", async () => {
    const harness = createHarness({
      react: [reactAvailable({workspaceLinkIssues: ["sites/arolariu.ro/project.json build target does not depend on components:build."]})],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("components:build");
  });

  it("fails when the shared inventory reports a malformed required package manifest", async () => {
    const harness = createHarness({packages: [packagesAvailable(inventory({malformed: ["next"]}))]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("next");
  });
});

describe("website contract postconditions", () => {
  it.each([
    ["i18n", {i18nIssues: ["ro.json is missing 3 key(s) present in en.json, e.g. 'about.title'."]}],
    ["framework", {frameworkIssues: ["next.config.ts does not call createNextIntlPlugin."]}],
  ])("fails on %s contract defects even during dry-run", async (_name, patch) => {
    const harness = createHarness({react: [reactAvailable(patch)], setupOptions: options({dryRun: true})});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual([]);
  });

  it("fails when a generated artifact is absent outside dry-run", async () => {
    const harness = createHarness({react: [reactAvailable({artifactIssues: ["licenses.json is missing."]})]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("licenses.json is missing.");
  });

  it("defers absent generated artifacts to the planned generator action during dry-run", async () => {
    const harness = createHarness({
      react: [reactAvailable({artifactIssues: ["licenses.json is missing.", "messages/fr.json is missing."]})],
      setupOptions: options({dryRun: true}),
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toMatch(/workspace\.generators/);
  });

  it("never defers a malformed generated artifact during dry-run", async () => {
    const harness = createHarness({
      react: [reactAvailable({artifactIssues: ["licenses.json contains malformed license entries."]})],
      setupOptions: options({dryRun: true}),
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("malformed license entries");
  });

  it("fails on website environment syntax errors before prompting or writing", async () => {
    const filesystem = createFilesystem({environment: "SITE_ENV\n", interactive: true});
    const harness = createHarness({
      filesystem,
      react: [reactAvailable({environment: environmentFacts({syntaxErrors: ["Line 1: expected KEY=VALUE syntax."]})})],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Line 1: expected KEY=VALUE syntax.");
    expect(harness.text).not.toHaveBeenCalled();
    expect(filesystem.writes).toHaveLength(0);
    expect(harness.actionIds).toEqual([]);
  });
});

describe("website environment preparation", () => {
  it("creates an absent file with ordered safe defaults and valid prompted Clerk credentials", async () => {
    const filesystem = createFilesystem({environment: null, interactive: true});
    const publishable = "pk_test_entered-publishable";
    const secret = "sk_test_entered-secret";
    const harness = createHarness({
      filesystem,
      textAnswers: [publishable],
      secretAnswers: [secret],
      react: [reactAvailable({environment: environmentFacts({presentKeys: []})}), reactAvailable()],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.find(({id}) => id === "react.environment.write")?.scope).toBe("repository");
    expect(filesystem.writes).toHaveLength(1);
    expect(filesystem.writes[0]).toMatchObject({path: paths.websiteEnvironment, mode: 0o600});
    expect(filesystem.writes[0]?.content).toBe(
      [
        "# arolariu.ro setup-managed values",
        "SITE_ENV=DEVELOPMENT",
        "SITE_NAME=dev.arolariu.ro",
        "SITE_URL=https://localhost:3000",
        "USE_CDN=false",
        `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${publishable}`,
        `CLERK_SECRET_KEY=${secret}`,
        "# End arolariu.ro setup-managed values",
        "",
      ].join("\n"),
    );
  });

  it("invalidates exactly the react fact and re-inspects it immediately after an executed write", async () => {
    const filesystem = createFilesystem({environment: null, interactive: true});
    const harness = createHarness({
      filesystem,
      textAnswers: ["pk_test_written"],
      secretAnswers: ["sk_test_written"],
      react: [reactAvailable({environment: environmentFacts({presentKeys: []})}), reactAvailable()],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.events).toEqual(["inspect:packages", "inspect:react", "invalidate:react", "inspect:react"]);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("react");
  });

  it("fails when refreshed facts omit a written setup-owned key", async () => {
    const filesystem = createFilesystem({environment: null, interactive: false});
    const harness = createHarness({
      filesystem,
      react: [
        reactAvailable({environment: environmentFacts({presentKeys: []})}),
        reactAvailable({environment: environmentFacts({presentKeys: ["SITE_ENV", "SITE_NAME", "SITE_URL"]})}),
      ],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("USE_CDN");
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("react");
  });

  it("fails when refreshed facts report an environment syntax regression", async () => {
    const filesystem = createFilesystem({environment: null, interactive: false});
    const harness = createHarness({
      filesystem,
      react: [
        reactAvailable({environment: environmentFacts({presentKeys: []})}),
        reactAvailable({environment: environmentFacts({syntaxErrors: ["Line 9: 'SITE ENV' is not a valid environment key name."]})}),
      ],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("Line 9");
  });

  it("fails when the react fact cannot be re-inspected after an executed write", async () => {
    const filesystem = createFilesystem({environment: null, interactive: false});
    const harness = createHarness({
      filesystem,
      react: [reactAvailable({environment: environmentFacts({presentKeys: []})}), unavailable<ReactFacts>()],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("react.environment.write");
  });

  it("preserves user comments and values byte-for-byte and appends only missing keys", async () => {
    const original = "# user-owned\r\nSITE_NAME=custom\r\nSITE_URL=https://custom.test\r\n";
    const filesystem = createFilesystem({environment: original, interactive: false});
    const harness = createHarness({
      filesystem,
      react: [
        reactAvailable({environment: environmentFacts({presentKeys: ["SITE_NAME", "SITE_URL"]})}),
        reactAvailable({environment: environmentFacts({presentKeys: ["SITE_ENV", "SITE_NAME", "SITE_URL", "USE_CDN"]})}),
      ],
    });

    const result = await harness.phase.run(harness.context);
    const written = filesystem.writes[0]?.content ?? "";

    expect(result.status).toBe("degraded");
    expect(written.startsWith(original)).toBe(true);
    expect(written.slice(original.length)).toBe(
      ["# arolariu.ro setup-managed values", "SITE_ENV=DEVELOPMENT", "USE_CDN=false", "# End arolariu.ro setup-managed values", ""].join(
        "\r\n",
      ),
    );
    expect(written).not.toContain("SITE_NAME=dev.arolariu.ro");
    expect(written).not.toContain("SITE_URL=https://localhost:3000");
  });

  it("never overwrites or prompts for existing empty or invalid Clerk values", async () => {
    const original = [
      "SITE_ENV=DEVELOPMENT",
      "SITE_NAME=dev.arolariu.ro",
      "SITE_URL=https://localhost:3000",
      "USE_CDN=false",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=",
      "CLERK_SECRET_KEY=not-a-secret-key",
      "",
    ].join("\n");
    const filesystem = createFilesystem({environment: original, interactive: true});
    const harness = createHarness({filesystem});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.evidence.join("\n")).toContain("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
    expect(result.evidence.join("\n")).toContain("CLERK_SECRET_KEY");
    expect(harness.text).not.toHaveBeenCalled();
    expect(harness.secret).not.toHaveBeenCalled();
    expect(filesystem.writes).toHaveLength(0);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("prompts only for the absent half and rejects a mismatched Clerk mode without writing it", async () => {
    const original = [
      "SITE_ENV=DEVELOPMENT",
      "SITE_NAME=dev.arolariu.ro",
      "SITE_URL=https://localhost:3000",
      "USE_CDN=false",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_existing",
      "",
    ].join("\n");
    const filesystem = createFilesystem({environment: original, interactive: true});
    const entered = "sk_test_mismatched";
    const harness = createHarness({filesystem, secretAnswers: [entered]});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(harness.text).not.toHaveBeenCalled();
    expect(harness.secret).toHaveBeenCalledExactlyOnceWith("CLERK_SECRET_KEY");
    expect(harness.redactions).toContain(entered);
    expect(filesystem.writes).toHaveLength(0);
    expect(result.evidence.join("\n")).not.toContain(entered);
  });

  it("does not prompt noninteractively and reports missing credentials as degraded", async () => {
    const filesystem = createFilesystem({environment: null, interactive: false});
    const harness = createHarness({
      filesystem,
      react: [reactAvailable({environment: environmentFacts({presentKeys: []})}), reactAvailable()],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(result.summary).toBe(
      "React tooling is ready, but Clerk credentials are incomplete or invalid outside keyless local development.",
    );
    expect(harness.text).not.toHaveBeenCalled();
    expect(harness.secret).not.toHaveBeenCalled();
    expect(filesystem.writes[0]?.content).not.toMatch(/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=|CLERK_SECRET_KEY=/);
  });

  it("skips empty prompt answers without writing empty credential lines", async () => {
    const filesystem = createFilesystem({environment: null, interactive: true});
    const harness = createHarness({
      filesystem,
      textAnswers: ["  "],
      secretAnswers: [""],
      react: [reactAvailable({environment: environmentFacts({presentKeys: []})}), reactAvailable()],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("degraded");
    expect(filesystem.writes[0]?.content).not.toMatch(/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=|CLERK_SECRET_KEY=/);
  });

  it("registers every nonempty entered credential before retained output can expose it", async () => {
    const filesystem = createFilesystem({environment: null, interactive: true});
    const publishable = "pk_test_redacted-publishable";
    const secret = "sk_test_redacted-secret";
    const harness = createHarness({
      filesystem,
      textAnswers: [publishable],
      secretAnswers: [secret],
      react: [reactAvailable({environment: environmentFacts({presentKeys: []})}), reactAvailable()],
    });

    const result = await harness.phase.run(harness.context);
    const retained = JSON.stringify({
      records: harness.sink.records,
      result,
      actions: harness.actionRecords.map(({id, scope, summary}) => ({id, scope, summary})),
    });

    expect(harness.redactions).toEqual(expect.arrayContaining([publishable, secret]));
    expect(retained).not.toContain(publishable);
    expect(retained).not.toContain(secret);
  });

  it("enforces mode 0600 after a successful write on non-Windows platforms", async () => {
    const filesystem = createFilesystem({environment: null, platform: "linux"});
    const harness = createHarness({
      filesystem,
      react: [reactAvailable({environment: environmentFacts({presentKeys: []})}), reactAvailable()],
    });

    await expect(harness.phase.run(harness.context)).resolves.toMatchObject({status: "degraded"});

    expect(filesystem.writes[0]).toMatchObject({mode: 0o600});
    expect(filesystem.modes).toEqual([{path: paths.websiteEnvironment, mode: 0o600}]);
  });

  it("is idempotent after the first additive write", async () => {
    const filesystem = createFilesystem({environment: null, interactive: true});
    const harness = createHarness({
      filesystem,
      textAnswers: ["pk_test_idempotent"],
      secretAnswers: ["sk_test_idempotent"],
      react: [reactAvailable({environment: environmentFacts({presentKeys: []})}), reactAvailable()],
    });

    await expect(harness.phase.run(harness.context)).resolves.toMatchObject({status: "succeeded"});
    const firstContent = filesystem.files.get(paths.websiteEnvironment);
    await expect(harness.phase.run(harness.context)).resolves.toMatchObject({status: "succeeded"});

    expect(filesystem.writes).toHaveLength(1);
    expect(filesystem.files.get(paths.websiteEnvironment)).toBe(firstContent);
    expect(harness.text).toHaveBeenCalledTimes(1);
    expect(harness.secret).toHaveBeenCalledTimes(1);
  });

  it("plans the write without mutating or invalidating during dry-run", async () => {
    const filesystem = createFilesystem({environment: null});
    const harness = createHarness({
      filesystem,
      setupOptions: options({dryRun: true}),
      dispositions: {"react.environment.write": "planned"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toContain("Planned action: react.environment.write");
    expect(filesystem.writes).toHaveLength(0);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("fails when the required environment write is declined", async () => {
    const filesystem = createFilesystem({environment: null});
    const harness = createHarness({filesystem, dispositions: {"react.environment.write": "declined"}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("react.environment.write");
    expect(harness.invalidate).not.toHaveBeenCalled();
  });
});

describe("Playwright Chromium preparation", () => {
  it("accepts Chromium only from the locked Playwright version reported by shared facts", async () => {
    const harness = createHarness();

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionIds).toEqual([]);
    expect(harness.run).not.toHaveBeenCalled();
  });

  it("installs Chromium when shared facts report a different Playwright version", async () => {
    const harness = createHarness({
      react: [reactAvailable({playwright: playwrightFacts({version: "1.61.0"})}), reactAvailable()],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.find(({id}) => id === "react.playwright.chromium.install")?.scope).toBe("repository");
    expect(harness.run).toHaveBeenCalledWith(browserInstallCommand, {
      cwd: paths.root,
      output: "tee",
      logger: harness.context.logger,
    });
    expect(harness.events).toEqual(["inspect:packages", "inspect:react", "invalidate:react", "inspect:react"]);
  });

  it("fails when refreshed facts still lack a locked Chromium entry after a successful install command", async () => {
    const harness = createHarness({
      react: [
        reactAvailable({playwright: playwrightFacts({browsers: ["firefox-999"]})}),
        reactAvailable({playwright: playwrightFacts({browsers: ["firefox-999"]})}),
      ],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/postcondition|chromium/i);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("react");
  });

  it("fails when refreshed facts report a Playwright version other than the locked one", async () => {
    const harness = createHarness({
      react: [
        reactAvailable({playwright: playwrightFacts({browsers: []})}),
        reactAvailable({playwright: playwrightFacts({version: "1.61.0"})}),
      ],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/1\.62\.1/);
  });

  it("fails when the react fact cannot be re-inspected after an executed install", async () => {
    const harness = createHarness({
      react: [reactAvailable({playwright: playwrightFacts({browsers: []})}), unavailable<ReactFacts>()],
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("react.playwright.chromium.install");
  });

  it("invalidates the react fact even when the attempted install command fails", async () => {
    const harness = createHarness({
      react: [reactAvailable({playwright: playwrightFacts({browsers: []})})],
      responses: {[commandKey(browserInstallCommand)]: commandResult({code: 1, stderr: "download failed"})},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("download failed");
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("react");
  });

  it("fails without invalidating when the required Chromium install is declined", async () => {
    const harness = createHarness({
      react: [reactAvailable({playwright: playwrightFacts({browsers: []})})],
      dispositions: {"react.playwright.chromium.install": "declined"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("react.playwright.chromium.install");
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("plans the Chromium install without invalidating or running a command during dry-run", async () => {
    const harness = createHarness({
      react: [reactAvailable({playwright: playwrightFacts({browsers: []})})],
      setupOptions: options({dryRun: true}),
      dispositions: {"react.playwright.chromium.install": "planned"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toContain("Planned action: react.playwright.chromium.install");
    expect(harness.invalidate).not.toHaveBeenCalled();
    expect(harness.run).not.toHaveBeenCalled();
  });

  it("runs no Linux mutation when the dependency probe is healthy", async () => {
    const harness = createHarness({filesystem: createFilesystem({platform: "linux"})});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.run).toHaveBeenCalledExactlyOnceWith(dependencyProbeCommand, {cwd: paths.root});
    expect(harness.actionIds).toEqual([]);
  });

  it("installs missing Linux dependencies as a system action, verifies them, then installs and verifies Chromium", async () => {
    const harness = createHarness({
      filesystem: createFilesystem({platform: "linux"}),
      react: [reactAvailable({playwright: playwrightFacts({browsers: ["firefox-999"]})}), reactAvailable()],
      responses: {
        [commandKey(dependencyProbeCommand)]: [commandResult({code: 1, stderr: "missing packages"}), commandResult()],
        [commandKey(dependencyInstallCommand)]: commandResult(),
        [commandKey(browserInstallCommand)]: commandResult(),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.map(({id, scope}) => ({id, scope}))).toEqual([
      {id: "react.playwright.system-dependencies.install", scope: "system"},
      {id: "react.playwright.chromium.install", scope: "repository"},
    ]);
    expect(harness.run).toHaveBeenCalledWith(dependencyInstallCommand, {
      cwd: paths.root,
      output: "tee",
      logger: harness.context.logger,
    });
    expect(harness.run.mock.calls.filter(([command]) => commandKey(command) === commandKey(dependencyProbeCommand))).toHaveLength(2);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("react");
  });

  it("treats a declined proven-required Linux dependency action as blocking", async () => {
    const harness = createHarness({
      filesystem: createFilesystem({platform: "linux"}),
      responses: {[commandKey(dependencyProbeCommand)]: commandResult({code: 1, stderr: "missing packages"})},
      dispositions: {"react.playwright.system-dependencies.install": "declined"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("react.playwright.system-dependencies.install");
    expect(harness.actionIds).not.toContain("react.playwright.chromium.install");
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("reports an inconclusive Linux dependency probe as a required failure", async () => {
    const harness = createHarness({
      filesystem: createFilesystem({platform: "linux"}),
      responses: {[commandKey(dependencyProbeCommand)]: commandResult({code: 1, timedOut: true})},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
  });
});

describe("dry-run, interruption, and command safety", () => {
  it("rethrows AbortError instead of converting interruption to a failure", async () => {
    const interruption = Object.assign(new Error("interrupted"), {name: "AbortError"});
    const harness = createHarness({
      filesystem: createFilesystem({environment: null}),
      actionsOverride: {run: async () => Promise.reject(interruption)},
    });

    await expect(harness.phase.run(harness.context)).rejects.toBe(interruption);
    expect(harness.invalidate).not.toHaveBeenCalled();
  });

  it("invalidates the react fact when an attempted mutation is interrupted", async () => {
    const interruption = Object.assign(new Error("interrupted"), {name: "AbortError"});
    const harness = createHarness({
      react: [reactAvailable({playwright: playwrightFacts({browsers: []})})],
    });
    harness.run.mockRejectedValueOnce(interruption);

    await expect(harness.phase.run(harness.context)).rejects.toBe(interruption);
    expect(harness.invalidate).toHaveBeenCalledExactlyOnceWith("react");
  });

  it("uses explicit cwd and argument arrays without builds, tests, services, or package restoration", async () => {
    const harness = createHarness({
      filesystem: createFilesystem({platform: "linux"}),
      react: [reactAvailable({playwright: playwrightFacts({browsers: []})}), reactAvailable()],
    });
    const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
      vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
    );

    await expect(harness.phase.run(harness.context)).resolves.toMatchObject({status: "succeeded"});

    expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    const executed = harness.run.mock.calls.map(([command]) => commandKey(command));
    expect(executed).not.toContain(commandKey(packageInventoryCommand));
    expect(executed).not.toContain(commandKey(browserInventoryCommand));
    for (const [command, runOptions] of harness.run.mock.calls) {
      expect(Array.isArray(command.args)).toBe(true);
      expect(runOptions?.cwd).toBe(paths.root);
      const joined = [command.command, ...command.args].join(" ");
      expect(command.args).not.toEqual(expect.arrayContaining(["build"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["test"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["typecheck"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["check"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["dev"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["start"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["serve"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["launch"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["ls"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["--list"]));
      expect(joined).not.toMatch(/\bnpm (?:ci|install)\b/iu);
    }
  });
});
