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
import {getExpectedTaxonomyArtifactPaths} from "./common/taxonomy-artifacts.ts";
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
const packageVersions = new Map<string, string>([
  ["react", "19.2.8"],
  ["react-dom", "19.2.8"],
  ["next", "16.3.0"],
  ["@clerk/nextjs", "7.6.5"],
  ["@docusaurus/core", "3.10.2"],
  ["@playwright/test", "1.62.1"],
  ["playwright", "1.62.1"],
  ["@arolariu/components", "2.2.0"],
]);
const linkedComponentsVersion = "2.3.0";
const requiredPackageNames = [
  "react",
  "react-dom",
  "next",
  "@clerk/nextjs",
  "@docusaurus/core",
  "@playwright/test",
  "@arolariu/components",
] as const;
const packageInspectionCommand: CommandSpec = {
  command: "npm",
  args: ["ls", "--json", "--depth=0", ...requiredPackageNames],
};
const browserInventoryCommand: CommandSpec = {
  command: "npx",
  args: ["--no-install", "playwright", "install", "--list"],
};
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
const generatedArtifacts = [
  ...getExpectedTaxonomyArtifactPaths(paths.root),
  resolve(paths.websiteRoot, "licenses.json"),
  resolve(paths.websiteRoot, "messages", "en.json"),
  resolve(paths.websiteRoot, "messages", "ro.json"),
  resolve(paths.websiteRoot, "messages", "fr.json"),
];
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

function requirements(patch: ReadonlyMap<string, string> = new Map()): RepositoryRequirements {
  const packages = new Map<string, PackageRequirement>();
  for (const [name, version] of packageVersions) {
    packages.set(name, requirement(name, patch.get(name) ?? version));
  }
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

function npmTree(versions: ReadonlyMap<string, string> = new Map(), nested: Readonly<Record<string, unknown>> = {}): string {
  return JSON.stringify({
    name: "@arolariu/monorepo",
    dependencies: Object.fromEntries(
      requiredPackageNames.map((name) => [
        name,
        {
          version: versions.get(name) ?? (name === "@arolariu/components" ? linkedComponentsVersion : packageVersions.get(name)),
          ...nested,
        },
      ]),
    ),
  });
}

function inventory(version: string = "1.62.1", browserVersion: string = "chromium-1234"): string {
  return [`Playwright version: ${version}`, "  Browsers:", `    C:\\cache\\ms-playwright\\${browserVersion}`, ""].join("\n");
}

interface VirtualFilesystem {
  readonly files: Map<string, string>;
  readonly directories: Set<string>;
  readonly writes: Array<Readonly<{path: string; content: string; mode: number}>>;
  readonly modes: Array<Readonly<{path: string; mode: number}>>;
  readonly dependencies: ReactSetupDependencies;
}

function createFilesystem(
  input: Readonly<{
    environment?: string | null;
    rootDependencies?: boolean;
    missingArtifacts?: readonly string[];
    platform?: NodeJS.Platform;
    interactive?: boolean;
  }> = {},
): VirtualFilesystem {
  const files = new Map<string, string>([
    [resolve(paths.componentsRoot, "package.json"), JSON.stringify({name: "@arolariu/components", version: linkedComponentsVersion})],
    [
      paths.packageLock,
      JSON.stringify({
        packages: {
          "packages/components": {
            name: "@arolariu/components",
            version: linkedComponentsVersion,
          },
        },
      }),
    ],
  ]);
  if (input.environment !== null) {
    files.set(paths.websiteEnvironment, input.environment ?? completeEnvironment);
  }
  for (const artifact of generatedArtifacts) {
    if (!input.missingArtifacts?.includes(artifact)) {
      files.set(artifact, "generated\n");
    }
  }
  const directories = new Set<string>();
  if (input.rootDependencies !== false) {
    directories.add(resolve(paths.root, "node_modules"));
  }
  const writes: Array<Readonly<{path: string; content: string; mode: number}>> = [];
  const modes: Array<Readonly<{path: string; mode: number}>> = [];
  const missingError = (path: string): Error => Object.assign(new Error(`ENOENT: ${path}`), {code: "ENOENT"});

  return {
    files,
    directories,
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
      inspectPath: async (path) => {
        if (files.has(path)) {
          return "file";
        }
        if (directories.has(path)) {
          return "directory";
        }
        return "missing";
      },
    },
  };
}

function defaultResponse(command: Readonly<CommandSpec>): CommandResult {
  const key = commandKey(command);
  if (key === commandKey(packageInspectionCommand)) {
    return commandResult({stdout: npmTree()});
  }
  if (key === commandKey(browserInventoryCommand)) {
    return commandResult({stdout: inventory()});
  }
  if (key === commandKey(dependencyProbeCommand)) {
    return commandResult();
  }
  return commandResult();
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
    requirementPatch?: ReadonlyMap<string, string>;
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
  let time = 0;
  const context: SetupContext = {
    options: input.setupOptions ?? options(),
    paths,
    requirements: requirements(input.requirementPatch),
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

describe("locked package validation", () => {
  it("runs the exact npm inspection command in the repository root and accepts recursive matching evidence", async () => {
    const nestedEvidence = {
      dependencies: {
        react: {version: "19.2.8"},
      },
    };
    const harness = createHarness({
      responses: {
        [commandKey(packageInspectionCommand)]: commandResult({stdout: npmTree(new Map(), nestedEvidence)}),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.run).toHaveBeenCalledWith(packageInspectionCommand, {cwd: paths.root});
  });

  it.each([
    ["nonzero exit", commandResult({code: 1, stdout: npmTree(), stderr: "npm failed"})],
    ["transport failure", commandResult({code: 1, spawnError: "ENOENT"})],
    ["timeout", commandResult({code: 1, timedOut: true})],
    ["signal", commandResult({code: 1, signal: "SIGTERM"})],
    ["empty output", commandResult()],
    ["malformed JSON", commandResult({stdout: "not json"})],
  ])("fails required package validation for %s", async (_name, response) => {
    const harness = createHarness({responses: {[commandKey(packageInspectionCommand)]: response}});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(harness.actionIds).toEqual([]);
  });

  it("fails when a required package is absent", async () => {
    const document = JSON.parse(npmTree()) as {dependencies: Record<string, unknown>};
    delete document.dependencies["next"];
    const harness = createHarness({
      responses: {[commandKey(packageInspectionCommand)]: commandResult({stdout: JSON.stringify(document)})},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("next");
  });

  it("fails when any recursive occurrence has a mismatched version", async () => {
    const harness = createHarness({
      responses: {
        [commandKey(packageInspectionCommand)]: commandResult({
          stdout: npmTree(new Map(), {dependencies: {react: {version: "18.3.1"}}}),
        }),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/react.*18\.3\.1|18\.3\.1.*react/i);
  });

  it("requires playwright and @playwright/test to have the same manifest-derived version", async () => {
    const harness = createHarness({
      requirementPatch: new Map([["playwright", "1.61.0"]]),
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/playwright/i);
    expect(harness.run).not.toHaveBeenCalled();
  });

  it("derives the linked component version from its package and matching lock entry instead of the root spec", async () => {
    const harness = createHarness();

    await expect(harness.phase.run(harness.context)).resolves.toMatchObject({status: "succeeded"});
    expect(harness.context.requirements.packages.get("@arolariu/components")?.version).toBe("2.2.0");
  });

  it("fails when the linked component package and workspace lock entry disagree", async () => {
    const filesystem = createFilesystem();
    filesystem.files.set(
      paths.packageLock,
      JSON.stringify({packages: {"packages/components": {name: "@arolariu/components", version: "2.2.0"}}}),
    );
    const harness = createHarness({filesystem});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/components.*lock|lock.*components/i);
    expect(harness.run).not.toHaveBeenCalled();
  });
});

describe("generated website postconditions", () => {
  it("requires every taxonomy mirror, license manifest, and locale after a real generator run", async () => {
    for (const missingArtifact of generatedArtifacts) {
      const harness = createHarness({filesystem: createFilesystem({missingArtifacts: [missingArtifact]})});

      const result = await harness.phase.run(harness.context);

      expect(result.status, missingArtifact).toBe("failed");
      expect(result.evidence.join("\n"), missingArtifact).toContain(missingArtifact);
    }
  });

  it("does not require the Next-owned locale declaration", async () => {
    const declaration = resolve(paths.websiteRoot, "messages", "en.d.json.ts");
    const harness = createHarness();
    expect(generatedArtifacts).not.toContain(declaration);

    await expect(harness.phase.run(harness.context)).resolves.toMatchObject({status: "succeeded"});
  });

  it("defers absent generated artifacts during dry-run to workspace.generators", async () => {
    const filesystem = createFilesystem({missingArtifacts: generatedArtifacts});
    const harness = createHarness({
      filesystem,
      setupOptions: options({dryRun: true}),
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(result.evidence.join("\n")).toMatch(/workspace\.generators|deferred/i);
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

  it("preserves user comments and values byte-for-byte and appends only missing keys", async () => {
    const original = "# user-owned\r\nSITE_NAME=custom\r\nSITE_URL=https://custom.test\r\n";
    const filesystem = createFilesystem({environment: original, interactive: false});
    const harness = createHarness({filesystem});

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
    const harness = createHarness({filesystem});

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
    const harness = createHarness({filesystem, textAnswers: ["  "], secretAnswers: [""]});

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
    const harness = createHarness({filesystem});

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
    });

    await expect(harness.phase.run(harness.context)).resolves.toMatchObject({status: "succeeded"});
    const firstContent = filesystem.files.get(paths.websiteEnvironment);
    await expect(harness.phase.run(harness.context)).resolves.toMatchObject({status: "succeeded"});

    expect(filesystem.writes).toHaveLength(1);
    expect(filesystem.files.get(paths.websiteEnvironment)).toBe(firstContent);
    expect(harness.text).toHaveBeenCalledTimes(1);
    expect(harness.secret).toHaveBeenCalledTimes(1);
  });
});

describe("Playwright Chromium preparation", () => {
  it("accepts Chromium only from the inventory group matching the locked Playwright version", async () => {
    const responses = {
      [commandKey(browserInventoryCommand)]: [
        commandResult({stdout: `${inventory("1.61.0")}${inventory("1.62.1", "firefox-999")}`}),
        commandResult({stdout: inventory()}),
      ],
      [commandKey(browserInstallCommand)]: commandResult(),
    };
    const harness = createHarness({responses});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.actionRecords.find(({id}) => id === "react.playwright.chromium.install")?.scope).toBe("repository");
    expect(harness.run).toHaveBeenCalledWith(browserInstallCommand, {
      cwd: paths.root,
      output: "tee",
      logger: harness.context.logger,
    });
    expect(harness.run.mock.calls.filter(([command]) => commandKey(command) === commandKey(browserInventoryCommand))).toHaveLength(2);
  });

  it("fails when Chromium remains absent after a successful install command", async () => {
    const missing = commandResult({stdout: inventory("1.62.1", "firefox-999")});
    const harness = createHarness({
      responses: {
        [commandKey(browserInventoryCommand)]: [missing, missing],
        [commandKey(browserInstallCommand)]: commandResult(),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/postcondition|chromium/i);
  });

  it("runs no Linux mutation when browser inventory and dependency probe are healthy", async () => {
    const harness = createHarness({filesystem: createFilesystem({platform: "linux"})});

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("succeeded");
    expect(harness.run).toHaveBeenCalledWith(dependencyProbeCommand, {cwd: paths.root});
    expect(harness.actionIds).toEqual([]);
  });

  it("installs missing Linux dependencies as a system action, verifies them, then installs and verifies Chromium", async () => {
    const missingBrowser = commandResult({stdout: inventory("1.62.1", "firefox-999")});
    const harness = createHarness({
      filesystem: createFilesystem({platform: "linux"}),
      responses: {
        [commandKey(browserInventoryCommand)]: [missingBrowser, commandResult({stdout: inventory()})],
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
  });

  it("treats a declined proven-required Linux dependency action as blocking", async () => {
    const harness = createHarness({
      filesystem: createFilesystem({platform: "linux"}),
      responses: {
        [commandKey(dependencyProbeCommand)]: commandResult({code: 1, stderr: "missing packages"}),
      },
      dispositions: {"react.playwright.system-dependencies.install": "declined"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("react.playwright.system-dependencies.install");
    expect(harness.actionIds).not.toContain("react.playwright.chromium.install");
  });

  it.each([
    ["inventory transport failure", browserInventoryCommand, commandResult({code: 1, spawnError: "ENOENT"})],
    ["dependency probe timeout", dependencyProbeCommand, commandResult({code: 1, timedOut: true})],
  ])("reports %s as a required failure", async (_name, command, response) => {
    const harness = createHarness({
      filesystem: createFilesystem({platform: "linux"}),
      responses: {[commandKey(command)]: response},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
  });

  it("converts action failures into structured failed results", async () => {
    const harness = createHarness({
      responses: {
        [commandKey(browserInventoryCommand)]: commandResult({stdout: inventory("1.62.1", "firefox-999")}),
        [commandKey(browserInstallCommand)]: commandResult({code: 1, stderr: "download failed"}),
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain("download failed");
  });
});

describe("dry-run, interruption, and command safety", () => {
  it("plans environment, Linux system dependencies, and Chromium without executing closures", async () => {
    const filesystem = createFilesystem({environment: null, platform: "linux"});
    const harness = createHarness({
      filesystem,
      setupOptions: options({dryRun: true}),
      responses: {
        [commandKey(browserInventoryCommand)]: commandResult({stdout: inventory("1.62.1", "firefox-999")}),
        [commandKey(dependencyProbeCommand)]: commandResult({code: 1, stderr: "missing packages"}),
      },
      dispositions: {
        "react.environment.write": "planned",
        "react.playwright.system-dependencies.install": "planned",
        "react.playwright.chromium.install": "planned",
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toEqual([
      "react.environment.write",
      "react.playwright.system-dependencies.install",
      "react.playwright.chromium.install",
    ]);
    expect(filesystem.writes).toHaveLength(0);
    expect(harness.run.mock.calls.some(([command]) => commandKey(command) === commandKey(dependencyInstallCommand))).toBe(false);
    expect(harness.run.mock.calls.some(([command]) => commandKey(command) === commandKey(browserInstallCommand))).toBe(false);
    expect(harness.text).not.toHaveBeenCalled();
    expect(harness.secret).not.toHaveBeenCalled();
  });

  it("defers package and browser probes in a fresh-checkout dry-run while naming safe planned actions", async () => {
    const filesystem = createFilesystem({
      environment: null,
      rootDependencies: false,
      missingArtifacts: generatedArtifacts,
      platform: "linux",
    });
    const harness = createHarness({
      filesystem,
      setupOptions: options({dryRun: true}),
      dispositions: {
        "react.environment.write": "planned",
        "react.playwright.chromium.install": "planned",
      },
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("skipped");
    expect(harness.actionIds).toEqual(["react.environment.write", "react.playwright.chromium.install"]);
    expect(harness.run).not.toHaveBeenCalled();
    expect(filesystem.writes).toHaveLength(0);
    expect(result.evidence.join("\n")).toMatch(/workspace\.root-dependencies|deferred/i);
  });

  it("fails fresh-checkout dry-run when Playwright requirements disagree before dependency probes", async () => {
    const filesystem = createFilesystem({rootDependencies: false});
    const harness = createHarness({
      filesystem,
      setupOptions: options({dryRun: true}),
      requirementPatch: new Map([["playwright", "1.61.0"]]),
      dispositions: {"react.playwright.chromium.install": "planned"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/playwright/i);
    expect(harness.run).not.toHaveBeenCalled();
    expect(harness.actionIds).toEqual([]);
    expect(filesystem.writes).toHaveLength(0);
  });

  it("fails fresh-checkout dry-run when the linked component lock entry disagrees before dependency probes", async () => {
    const filesystem = createFilesystem({rootDependencies: false});
    filesystem.files.set(
      paths.packageLock,
      JSON.stringify({packages: {"packages/components": {name: "@arolariu/components", version: "2.2.0"}}}),
    );
    const harness = createHarness({
      filesystem,
      setupOptions: options({dryRun: true}),
      dispositions: {"react.playwright.chromium.install": "planned"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toMatch(/components.*lock|lock.*components/i);
    expect(harness.run).not.toHaveBeenCalled();
    expect(harness.actionIds).toEqual([]);
    expect(filesystem.writes).toHaveLength(0);
  });

  it("fails fresh-checkout dry-run when a generated artifact path is a directory", async () => {
    const invalidArtifact = generatedArtifacts[0];
    if (invalidArtifact === undefined) {
      throw new Error("A generated artifact fixture is required.");
    }
    const filesystem = createFilesystem({rootDependencies: false});
    filesystem.files.delete(invalidArtifact);
    filesystem.directories.add(invalidArtifact);
    const harness = createHarness({
      filesystem,
      setupOptions: options({dryRun: true}),
      dispositions: {"react.playwright.chromium.install": "planned"},
    });

    const result = await harness.phase.run(harness.context);

    expect(result.status).toBe("failed");
    expect(result.evidence.join("\n")).toContain(`Generated artifact path is not a file: ${invalidArtifact}`);
    expect(harness.run).not.toHaveBeenCalled();
    expect(harness.actionIds).toEqual([]);
    expect(filesystem.writes).toHaveLength(0);
  });

  it("rethrows AbortError instead of converting interruption to a failure", async () => {
    const interruption = Object.assign(new Error("interrupted"), {name: "AbortError"});
    const harness = createHarness({
      filesystem: createFilesystem({environment: null}),
      actionsOverride: {run: async () => Promise.reject(interruption)},
    });

    await expect(harness.phase.run(harness.context)).rejects.toBe(interruption);
  });

  it("uses explicit cwd and argument arrays without builds, tests, browser launches, services, or package restoration", async () => {
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
      expect(command.args).not.toEqual(expect.arrayContaining(["build"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["test"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["typecheck"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["check"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["dev"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["start"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["serve"]));
      expect(command.args).not.toEqual(expect.arrayContaining(["launch"]));
      expect(joined).not.toMatch(/\bnpm (?:ci|install)\b/iu);
    }
  });
});
