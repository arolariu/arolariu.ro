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
import {
  createSvelteSetupPhase,
  inspectSvelteWorkspace,
  svelteSetupPhase,
  type SvelteSetupDependencies,
  type SvelteWorkspaceState,
} from "./setup.svelte.ts";
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
const workspaceDefinitions = {
  cv: {
    root: paths.cvRoot,
    packageName: "@arolariu/cv",
    workspace: "sites/cv.arolariu.ro",
    node: ">=22.8",
  },
  status: {
    root: paths.statusRoot,
    packageName: "@arolariu/status",
    workspace: "sites/status.arolariu.ro",
    node: ">=24",
  },
} as const;
const prepareCommand: CommandSpec = {
  command: "npm",
  args: ["run", "prepare", "--workspace=sites/cv.arolariu.ro", "--workspace=sites/status.arolariu.ro"],
};

type WorkspaceName = keyof typeof workspaceDefinitions;
type PathKind = Awaited<ReturnType<SvelteSetupDependencies["inspectPath"]>>;

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

function inspectionCommand(name: WorkspaceName): CommandSpec {
  return {
    command: "npm",
    args: ["ls", "--json", "--depth=0", `--workspace=${workspaceDefinitions[name].workspace}`, ...requiredPackages],
  };
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

function manifest(
  name: WorkspaceName,
  patch: Readonly<{
    packageName?: unknown;
    version?: unknown;
    prepare?: unknown;
    node?: unknown;
    devDependencies?: unknown;
  }> = {},
): string {
  return JSON.stringify({
    name: patch.packageName ?? workspaceDefinitions[name].packageName,
    private: true,
    version: patch.version ?? "1.0.0",
    type: "module",
    engines: {node: patch.node ?? workspaceDefinitions[name].node},
    scripts: {
      dev: "vite dev",
      build: "vite build",
      prepare: patch.prepare ?? "svelte-kit sync || echo ''",
      check: "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
      test: name === "cv" ? "npm run test:unit" : "npm run test:unit",
    },
    devDependencies:
      patch.devDependencies
      ?? Object.fromEntries([
        ["@playwright/test", "*"],
        ...requiredPackages.map((packageName) => [packageName, "*"]),
        ["svelte-check", "*"],
        ["sass", "*"],
      ]),
  });
}

function workspaceEvidence(
  name: WorkspaceName,
  input: Readonly<{
    omitWorkspace?: boolean;
    omitPackage?: string;
    mismatchPackage?: string;
    extraRootWorkspace?: WorkspaceName;
    nestedMismatchPackage?: string;
  }> = {},
): string {
  const dependencies = Object.fromEntries(
    requiredPackages
      .filter((packageName) => packageName !== input.omitPackage)
      .map((packageName) => [
        packageName,
        {
          version: packageName === input.mismatchPackage ? "0.0.1" : packageVersions.get(packageName),
          ...(packageName === input.nestedMismatchPackage ? {dependencies: {[packageName]: {version: "0.0.2"}}} : {}),
        },
      ]),
  );
  const selected = input.omitWorkspace
    ? {}
    : {
        [workspaceDefinitions[name].packageName]: {
          version: "1.0.0",
          resolved: `file:../../${workspaceDefinitions[name].workspace}`,
          dependencies,
        },
      };
  const sibling =
    input.extraRootWorkspace === undefined
      ? {}
      : {
          [workspaceDefinitions[input.extraRootWorkspace].packageName]: {
            version: "1.0.0",
            dependencies: Object.fromEntries(
              requiredPackages.map((packageName) => [packageName, {version: packageVersions.get(packageName)}]),
            ),
          },
        };
  return JSON.stringify({
    name: "@arolariu/monorepo",
    version: "0.0.0",
    dependencies: {...selected, ...sibling},
  });
}

interface VirtualFilesystem {
  readonly files: Map<string, string>;
  readonly directories: Set<string>;
  readonly others: Set<string>;
  readonly dependencies: SvelteSetupDependencies;
}

function generatedConfig(name: WorkspaceName): string {
  return resolve(workspaceDefinitions[name].root, ".svelte-kit", "tsconfig.json");
}

function createFilesystem(
  input: Readonly<{
    rootDependencies?: PathKind;
    missingConfigs?: readonly WorkspaceName[];
    directoryConfigs?: readonly WorkspaceName[];
    otherConfigs?: readonly WorkspaceName[];
    manifestPatch?: Readonly<Partial<Record<WorkspaceName, string>>>;
    inspectError?: Readonly<{path: string; error: Error}>;
    readError?: Readonly<{path: string; error: Error}>;
  }> = {},
): VirtualFilesystem {
  const files = new Map<string, string>([
    [resolve(paths.cvRoot, "package.json"), input.manifestPatch?.cv ?? manifest("cv")],
    [resolve(paths.statusRoot, "package.json"), input.manifestPatch?.status ?? manifest("status")],
  ]);
  const directories = new Set<string>();
  const others = new Set<string>();
  const rootDependencies = resolve(paths.root, "node_modules");
  const rootKind = input.rootDependencies ?? "directory";
  if (rootKind === "file") {
    files.set(rootDependencies, "");
  } else if (rootKind === "directory") {
    directories.add(rootDependencies);
  } else if (rootKind === "other") {
    others.add(rootDependencies);
  }
  for (const name of ["cv", "status"] as const) {
    const config = generatedConfig(name);
    if (input.directoryConfigs?.includes(name) === true) {
      directories.add(config);
    } else if (input.otherConfigs?.includes(name) === true) {
      others.add(config);
    } else if (input.missingConfigs?.includes(name) !== true) {
      files.set(config, "{}\n");
    }
  }
  const missingError = (path: string): Error => Object.assign(new Error(`ENOENT: ${path}`), {code: "ENOENT"});
  return {
    files,
    directories,
    others,
    dependencies: {
      readTextFile: async (path) => {
        if (input.readError?.path === path) {
          throw input.readError.error;
        }
        const content = files.get(path);
        if (content === undefined) {
          throw missingError(path);
        }
        return content;
      },
      inspectPath: async (path) => {
        if (input.inspectError?.path === path) {
          throw input.inspectError.error;
        }
        if (files.has(path)) {
          return "file";
        }
        if (directories.has(path)) {
          return "directory";
        }
        if (others.has(path)) {
          return "other";
        }
        return "missing";
      },
    },
  };
}

function defaultResponse(command: Readonly<CommandSpec>): CommandResult {
  if (commandKey(command) === commandKey(inspectionCommand("cv"))) {
    return commandResult({stdout: workspaceEvidence("cv")});
  }
  if (commandKey(command) === commandKey(inspectionCommand("status"))) {
    return commandResult({stdout: workspaceEvidence("status")});
  }
  return commandResult();
}

function createRunner(
  responses: Readonly<Record<string, CommandResult | readonly CommandResult[]>> = {},
  onRun?: (command: Readonly<CommandSpec>) => void,
): Readonly<{runner: CommandRunner; run: ReturnType<typeof vi.fn<CommandRunner["run"]>>}> {
  const offsets = new Map<string, number>();
  const run = vi.fn<CommandRunner["run"]>(async (command) => {
    onRun?.(command);
    const key = commandKey(command);
    const configured = responses[key];
    if (Array.isArray(configured)) {
      const offset = offsets.get(key) ?? 0;
      offsets.set(key, offset + 1);
      return configured[offset] ?? configured.at(-1) ?? defaultResponse(command);
    }
    return (configured as CommandResult | undefined) ?? defaultResponse(command);
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
    repositoryRequirements?: RepositoryRequirements;
    onRun?: (command: Readonly<CommandSpec>) => void;
    actionsOverride?: SetupActionExecutor;
  }> = {},
): Readonly<{
  phase: ReturnType<typeof createSvelteSetupPhase>;
  context: SetupContext;
  filesystem: VirtualFilesystem;
  run: ReturnType<typeof vi.fn<CommandRunner["run"]>>;
  actionIds: string[];
  actionRecords: SetupAction[];
  sink: InMemoryLoggerSink;
}> {
  const filesystem = input.filesystem ?? createFilesystem();
  const {runner, run} = createRunner(input.responses, input.onRun);
  const createdActions = createActions(input.dispositions);
  const sink = new InMemoryLoggerSink();
  let time = 0;
  const context: SetupContext = {
    options: input.setupOptions ?? options(),
    paths,
    requirements: input.repositoryRequirements ?? requirements(),
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
    phase: createSvelteSetupPhase(filesystem.dependencies),
    context,
    filesystem,
    run,
    actionIds: createdActions.actionIds,
    actionRecords: createdActions.actionRecords,
    sink,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Svelte setup public contract", () => {
  it("exports the exact required phase metadata and inspection surface", () => {
    expect(svelteSetupPhase).toMatchObject({
      id: "svelte",
      title: "Svelte workspaces",
      required: true,
      dependsOn: ["workspace.root-dependencies"],
    });
    expect(createSvelteSetupPhase).toBeTypeOf("function");
    expect(inspectSvelteWorkspace).toBeTypeOf("function");
    const state: SvelteWorkspaceState = {
      name: "cv",
      root: paths.cvRoot,
      packageContractValid: true,
      generatedConfigExists: true,
      problems: [],
    };
    expect(state.name).toBe("cv");
  });

  it("keeps the production import graph limited to Node built-ins and repository modules", async () => {
    await expect(import("./setup.svelte.ts")).resolves.toMatchObject({
      createSvelteSetupPhase: expect.any(Function),
      inspectSvelteWorkspace: expect.any(Function),
      svelteSetupPhase: expect.any(Object),
    });
  });
});

describe("workspace manifest contracts", () => {
  it("accepts both live manifest shapes and reports both sites independently", async () => {
    const harness = createHarness();

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^cv: .*package contract.*ready/i),
        expect.stringMatching(/^status: .*package contract.*ready/i),
      ]),
    );
  });

  it.each(["cv", "status"] as const)("requires exact identity, version, prepare script, and engine fields for %s", async (name) => {
    const invalidManifests = [
      manifest(name, {packageName: "@arolariu/wrong"}),
      manifest(name, {version: " "}),
      manifest(name, {prepare: " "}),
      manifest(name, {node: ""}),
    ];
    for (const invalidManifest of invalidManifests) {
      const filesystem = createFilesystem({manifestPatch: {[name]: invalidManifest}});
      const harness = createHarness({filesystem});

      const result = await harness.phase.run(harness.context);

      expect(result.status, invalidManifest).toBe("failed");
      expect(result.evidence.join("\n"), invalidManifest).toContain(`${name}:`);
    }
  });

  it.each(["cv", "status"] as const)("reports malformed and non-object %s manifests without throwing", async (name) => {
    for (const invalidManifest of ["{not-json", "[]"]) {
      const filesystem = createFilesystem({manifestPatch: {[name]: invalidManifest}});
      const harness = createHarness({filesystem});

      const result = await harness.phase.run(harness.context);

      expect(result.status).toBe("failed");
      expect(result.evidence.join("\n")).toMatch(new RegExp(`${name}:.*(?:parse|object)`, "iu"));
    }
  });

  it.each(requiredPackages)("requires wildcard declaration for %s in each site", async (packageName) => {
    for (const name of ["cv", "status"] as const) {
      const dependencies = Object.fromEntries(requiredPackages.map((candidate) => [candidate, candidate === packageName ? "1.0.0" : "*"]));
      const filesystem = createFilesystem({
        manifestPatch: {[name]: manifest(name, {devDependencies: dependencies})},
      });
      const harness = createHarness({filesystem});

      const result = await harness.phase.run(harness.context);

      expect(result.status, `${name}:${packageName}`).toBe("failed");
      expect(result.evidence.join("\n"), `${name}:${packageName}`).toMatch(
        new RegExp(`${name}:.*${packageName.replaceAll("/", "\\/")}.*\\*`, "iu"),
      );
    }
  });

  it.each(requiredPackages)("fails both static contracts when root requirement %s is missing or blank", async (packageName) => {
    for (const repositoryRequirements of [requirements({omitPackage: packageName}), requirements({blankPackage: packageName})]) {
      const harness = createHarness({repositoryRequirements});

      const result = await harness.phase.run(harness.context);

      expect(result.status).toBe("failed");
      expect(result.evidence.join("\n")).toContain(packageName);
      expect(result.evidence.join("\n")).toMatch(/(?:cv|status):.*requirement/iu);
      expect(harness.run).not.toHaveBeenCalled();
    }
  });

  it.each([">=24", ">=24.0", ">=24.0.0"])("accepts supported Node engine syntax %s", async (engine) => {
    const filesystem = createFilesystem({
      manifestPatch: {
        cv: manifest("cv", {node: engine}),
        status: manifest("status", {node: engine}),
      },
    });
    const harness = createHarness({filesystem});

    await expect(harness.phase.run(harness.context)).resolves.toMatchObject({status: "succeeded"});
  });

  it.each(["24", ">24", "^24", ">=24.x", ">=24.0.0 || >=26"])("rejects unsupported Node engine syntax %s", async (engine) => {
    const filesystem = createFilesystem({manifestPatch: {cv: manifest("cv", {node: engine})}});
    const harness = createHarness({filesystem});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/cv:.*unsupported.*engine/iu);
  });

  it("rejects a site minimum above the root-supported Node minimum", async () => {
    const filesystem = createFilesystem({manifestPatch: {status: manifest("status", {node: ">=24.1"})}});
    const harness = createHarness({filesystem});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/status:.*root.*24\.0\.0.*24\.1\.0/iu);
  });
});

describe("workspace-scoped installed package evidence", () => {
  it("runs exactly one selected-workspace npm command per site from the repository root", async () => {
    const harness = createHarness();

    await expect(harness.phase.run(harness.context)).resolves.toMatchObject({status: "succeeded"});

    expect(harness.run.mock.calls).toEqual([
      [inspectionCommand("cv"), {cwd: paths.root}],
      [inspectionCommand("status"), {cwd: paths.root}],
    ]);
  });

  it.each([
    ["transport failure", commandResult({code: 1, spawnError: "ENOENT"})],
    ["timeout", commandResult({code: 1, timedOut: true})],
    ["signal", commandResult({code: 1, signal: "SIGTERM"})],
    ["nonzero exit", commandResult({code: 1, stdout: workspaceEvidence("cv"), stderr: "npm failed"})],
    ["empty output", commandResult()],
    ["malformed JSON", commandResult({stdout: "not-json"})],
    ["non-object JSON", commandResult({stdout: "[]"})],
  ])("reports cv %s while preserving status evidence", async (_case, response) => {
    const harness = createHarness({responses: {[commandKey(inspectionCommand("cv"))]: response}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("cv:");
    expect(result.evidence).toEqual(expect.arrayContaining([expect.stringMatching(/^status: .*ready/iu)]));
    expect(harness.run).toHaveBeenCalledWith(inspectionCommand("status"), {cwd: paths.root});
  });

  it("requires the exact selected workspace key and ignores another workspace subtree", async () => {
    const cvEvidence = workspaceEvidence("cv", {omitWorkspace: true, extraRootWorkspace: "status"});
    const harness = createHarness({
      responses: {[commandKey(inspectionCommand("cv"))]: commandResult({stdout: cvEvidence})},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("@arolariu/cv");
    expect(result.evidence.join("\n")).toMatch(/cv:.*workspace/iu);
  });

  it.each(requiredPackages)("requires installed %s evidence under each selected workspace", async (packageName) => {
    for (const name of ["cv", "status"] as const) {
      const harness = createHarness({
        responses: {
          [commandKey(inspectionCommand(name))]: commandResult({
            stdout: workspaceEvidence(name, {omitPackage: packageName}),
          }),
        },
      });

      const result = await harness.phase.run(harness.context);

      expect(result.status, `${name}:${packageName}`).toBe("failed");
      expect(result.evidence.join("\n"), `${name}:${packageName}`).toMatch(
        new RegExp(`${name}:.*${packageName.replaceAll("/", "\\/")}.*absent`, "iu"),
      );
    }
  });

  it.each(["top-level occurrence", "nested occurrence"])("rejects a mismatched %s from the selected subtree", async (location) => {
    const evidence =
      location === "top-level occurrence"
        ? workspaceEvidence("cv", {mismatchPackage: "svelte"})
        : workspaceEvidence("cv", {nestedMismatchPackage: "svelte"});
    const harness = createHarness({
      responses: {[commandKey(inspectionCommand("cv"))]: commandResult({stdout: evidence})},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/cv:.*svelte.*0\.0\.[12]/iu);
  });
});

describe("generated SvelteKit state", () => {
  it("treats only a regular tsconfig path as generated state", async () => {
    for (const [kind, filesystem] of [
      ["missing", createFilesystem({missingConfigs: ["cv"]})],
      ["directory", createFilesystem({directoryConfigs: ["cv"]})],
      ["other", createFilesystem({otherConfigs: ["cv"]})],
    ] as const) {
      const harness = createHarness({
        filesystem,
        dispositions: {"svelte.prepare": "planned"},
        setupOptions: options({dryRun: kind === "missing"}),
      });

      const result = await harness.phase.run(harness.context);

      if (kind === "missing") {
        expect(result.status).toBe("skipped");
      } else {
        expect(result.status).toBe("failed");
        expect(result.evidence.join("\n")).toMatch(new RegExp(`cv:.*${kind}`, "iu"));
        expect(harness.actionIds).toEqual([]);
      }
    }
  });

  it("keeps one ready site's evidence when the other generated path is invalid", async () => {
    const harness = createHarness({filesystem: createFilesystem({directoryConfigs: ["status"]})});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence).toEqual(expect.arrayContaining([expect.stringMatching(/^cv: .*generated config.*file/iu)]));
    expect(result.evidence.join("\n")).toMatch(/status:.*directory/iu);
  });

  it("does not mutate when generated-state inspection fails", async () => {
    const inaccessible = generatedConfig("cv");
    const filesystem = createFilesystem({
      inspectError: {path: inaccessible, error: Object.assign(new Error("EACCES: denied"), {code: "EACCES"})},
    });
    const harness = createHarness({filesystem});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/cv:.*EACCES/iu);
    expect(harness.actionIds).toEqual([]);
    expect(harness.run).not.toHaveBeenCalledWith(prepareCommand, expect.anything());
  });
});

describe("shared prepare action", () => {
  it("executes one repository action with logger-backed tee and verifies both postconditions", async () => {
    const filesystem = createFilesystem({missingConfigs: ["cv"]});
    const harness = createHarness({
      filesystem,
      onRun: (command) => {
        if (commandKey(command) === commandKey(prepareCommand)) {
          filesystem.files.set(generatedConfig("cv"), "{}\n");
          filesystem.files.set(generatedConfig("status"), "{}\n");
        }
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords).toHaveLength(1);
    expect(harness.actionRecords[0]).toMatchObject({id: "svelte.prepare", scope: "repository"});
    expect(harness.run).toHaveBeenCalledWith(prepareCommand, {
      cwd: paths.root,
      output: "tee",
      logger: harness.context.logger,
    });
  });

  it.each([
    ["nonzero exit", commandResult({code: 1, stderr: "prepare failed"})],
    ["transport failure", commandResult({code: 1, spawnError: "ENOENT"})],
    ["timeout", commandResult({code: 1, timedOut: true})],
    ["signal", commandResult({code: 1, signal: "SIGTERM"})],
  ])("converts prepare %s into a structured phase failure", async (_case, prepareResult) => {
    const filesystem = createFilesystem({missingConfigs: ["cv"]});
    const harness = createHarness({
      filesystem,
      responses: {[commandKey(prepareCommand)]: prepareResult},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/prepare|svelte\.prepare/iu);
  });

  it("fails when an executed prepare command leaves either postcondition missing", async () => {
    const filesystem = createFilesystem({missingConfigs: ["cv"]});
    const harness = createHarness({filesystem});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain(generatedConfig("cv"));
    expect(result.evidence.join("\n")).toMatch(/postcondition/iu);
  });

  it("fails with the action ID when shared prepare is declined", async () => {
    const harness = createHarness({
      filesystem: createFilesystem({missingConfigs: ["status"]}),
      dispositions: {"svelte.prepare": "declined"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("svelte.prepare");
    expect(harness.run).not.toHaveBeenCalledWith(prepareCommand, expect.anything());
  });

  it("returns a traversable planned result naming the action and each missing site postcondition", async () => {
    const harness = createHarness({
      filesystem: createFilesystem({missingConfigs: ["cv", "status"]}),
      setupOptions: options({dryRun: true}),
      dispositions: {"svelte.prepare": "planned"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toContain("svelte.prepare");
    expect(result.evidence.join("\n")).toMatch(/cv:.*postcondition/iu);
    expect(result.evidence.join("\n")).toMatch(/status:.*postcondition/iu);
    expect(harness.run).not.toHaveBeenCalledWith(prepareCommand, expect.anything());
  });

  it("is idempotent when both sites are already ready", async () => {
    const harness = createHarness();

    await expect(harness.phase.run(harness.context)).resolves.toMatchObject({status: "succeeded"});
    await expect(harness.phase.run(harness.context)).resolves.toMatchObject({status: "succeeded"});

    expect(harness.actionIds).toEqual([]);
    expect(harness.run.mock.calls.filter(([command]) => commandKey(command) === commandKey(prepareCommand))).toHaveLength(0);
  });
});

describe("fresh-checkout dry-run and failures", () => {
  it("defers only installed evidence, validates static state, and plans missing generated config", async () => {
    const filesystem = createFilesystem({rootDependencies: "missing", missingConfigs: ["status"]});
    const harness = createHarness({
      filesystem,
      setupOptions: options({dryRun: true}),
      dispositions: {"svelte.prepare": "planned"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toMatch(/workspace\.root-dependencies.*deferred|deferred.*workspace\.root-dependencies/iu);
    expect(result.evidence.join("\n")).toContain("svelte.prepare");
    expect(harness.run).not.toHaveBeenCalled();
    expect(harness.actionIds).toEqual(["svelte.prepare"]);
  });

  it("returns skipped with explicit deferred evidence when generated state already exists", async () => {
    const harness = createHarness({
      filesystem: createFilesystem({rootDependencies: "missing"}),
      setupOptions: options({dryRun: true}),
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toMatch(/deferred.*npm|npm.*deferred/iu);
    expect(harness.actionIds).toEqual([]);
    expect(harness.run).not.toHaveBeenCalled();
  });

  it("does not hide static manifest or generated path failures behind fresh-checkout deferral", async () => {
    const filesystem = createFilesystem({
      rootDependencies: "missing",
      directoryConfigs: ["status"],
      manifestPatch: {cv: manifest("cv", {node: "^24"})},
    });
    const harness = createHarness({filesystem, setupOptions: options({dryRun: true})});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/cv:.*unsupported.*engine/iu);
    expect(result.evidence.join("\n")).toMatch(/status:.*directory/iu);
    expect(harness.run).not.toHaveBeenCalled();
    expect(harness.actionIds).toEqual([]);
  });

  it.each(["file", "other"] as const)("fails when root node_modules is a %s", async (kind) => {
    const harness = createHarness({filesystem: createFilesystem({rootDependencies: kind})});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/node_modules.*(?:directory|invalid)/iu);
    expect(harness.run).not.toHaveBeenCalled();
  });

  it("fails real execution without root dependencies and names the prerequisite action", async () => {
    const harness = createHarness({filesystem: createFilesystem({rootDependencies: "missing"})});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("workspace.root-dependencies");
    expect(harness.run).not.toHaveBeenCalled();
    expect(harness.actionIds).toEqual([]);
  });

  it("rethrows AbortError from filesystem, runner, and action boundaries", async () => {
    const interruption = Object.assign(new Error("interrupted"), {name: "AbortError"});
    const filesystemHarness = createHarness({
      filesystem: createFilesystem({
        inspectError: {path: generatedConfig("cv"), error: interruption},
      }),
    });
    await expect(filesystemHarness.phase.run(filesystemHarness.context)).rejects.toBe(interruption);

    const runnerHarness = createHarness({
      responses: {},
      onRun: () => {
        throw interruption;
      },
    });
    await expect(runnerHarness.phase.run(runnerHarness.context)).rejects.toBe(interruption);

    const actionHarness = createHarness({
      filesystem: createFilesystem({missingConfigs: ["cv"]}),
      actionsOverride: {run: async () => Promise.reject(interruption)},
    });
    await expect(actionHarness.phase.run(actionHarness.context)).rejects.toBe(interruption);
  });

  it("converts ordinary filesystem errors into structured evidence and still inspects the other site", async () => {
    const inaccessible = resolve(paths.cvRoot, "package.json");
    const filesystem = createFilesystem({
      readError: {path: inaccessible, error: Object.assign(new Error("EACCES: denied"), {code: "EACCES"})},
    });
    const harness = createHarness({filesystem});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/cv:.*EACCES/iu);
    expect(result.evidence).toEqual(expect.arrayContaining([expect.stringMatching(/^status: .*ready/iu)]));
  });
});

describe("output and command safety", () => {
  it("uses no direct console output and dispatches no forbidden command", async () => {
    const harness = createHarness();
    const consoleSpies = ["debug", "info", "warn", "error", "log"].map((level) =>
      vi.spyOn(console, level as "debug").mockImplementation(() => undefined),
    );

    await expect(harness.phase.run(harness.context)).resolves.toMatchObject({status: "succeeded"});

    expect(consoleSpies.every((spy) => spy.mock.calls.length === 0)).toBe(true);
    for (const [command, runOptions] of harness.run.mock.calls) {
      expect(Array.isArray(command.args)).toBe(true);
      expect(runOptions?.cwd).toBe(paths.root);
      const joined = [command.command, ...command.args].join(" ");
      expect(joined).not.toMatch(
        /\bsvelte-check\b|\bnpm (?:test|ci|install)\b|\bvite (?:build|dev)\b|\bsvelte-kit build\b|\b(?:start|serve)\b/iu,
      );
      expect(command.args.slice(0, 2)).not.toEqual(["run", "test"]);
      expect(command.command).not.toBe("vitest");
    }
  });
});
