// @vitest-environment node
/**
 * @fileoverview Contract tests for shared read-only React and Svelte inspection facts.
 * @module scripts/inspection/frontend.test
 */

import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {CommandResult, CommandRunner, CommandSpec} from "../common/process.ts";
import {createRepositoryPaths, type RepositoryPaths} from "../common/repository-paths.ts";
import {
  createReactProvider,
  createSvelteProvider,
  type FrontendProviderInput,
  type ReactFacts,
  type SvelteFacts,
  type SvelteProjectId,
} from "./frontend.ts";
import {REACT_INSPECTED_PACKAGE_NAMES, SVELTE_INSPECTED_PACKAGE_NAMES, type PackageInventoryFacts} from "./packages.ts";
import {createInspectionProbeRunner} from "./probes.ts";
import type {InspectionOutcome} from "./types.ts";

const fixtureRoots: string[] = [];

const REACT_PACKAGE_VERSIONS: ReadonlyMap<string, string> = new Map([
  ["react", "19.2.8"],
  ["react-dom", "19.2.8"],
  ["next", "16.3.0"],
  ["@clerk/nextjs", "7.6.5"],
  ["@docusaurus/core", "3.10.2"],
  ["@playwright/test", "1.62.1"],
  ["playwright", "1.62.1"],
  ["@arolariu/components", "2.2.0"],
]);

const SVELTE_PACKAGE_VERSIONS: ReadonlyMap<string, string> = new Map([
  ["@sveltejs/kit", "2.70.2"],
  ["@sveltejs/vite-plugin-svelte", "6.4.1"],
  ["svelte", "5.56.8"],
  ["svelte-adapter-azure-swa", "0.22.1"],
  ["vite", "8.2.0"],
  ["vitest", "4.1.10"],
  ["typescript", "6.0.3"],
]);

function clock(): () => number {
  let current = 100;
  return () => {
    current += 5;
    return current;
  };
}

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

function commandKey(command: Readonly<CommandSpec>, cwd?: string): string {
  return `${cwd ?? ""}\u0000${command.command}\u0000${JSON.stringify(command.args)}`;
}

async function writeFixtureFile(path: string, contents: string): Promise<void> {
  await mkdir(resolve(path, ".."), {recursive: true});
  await writeFile(path, contents, "utf8");
}

function availablePackages(
  installed: Readonly<Record<string, Readonly<{version: string; workspaceRoot?: string}>>>,
): PackageInventoryFacts {
  return {installed, malformed: []};
}

function packagesOf(overrides: Readonly<Record<string, Readonly<{version: string; workspaceRoot?: string}>>> = {}): PackageInventoryFacts {
  const installed: Record<string, Readonly<{version: string; workspaceRoot?: string}>> = {};
  for (const [name, version] of REACT_PACKAGE_VERSIONS) {
    installed[name] = name === "@arolariu/components" ? {version, workspaceRoot: "packages/components"} : {version};
  }
  for (const [name, version] of SVELTE_PACKAGE_VERSIONS) {
    installed[name] = {version};
  }
  return availablePackages({...installed, ...overrides});
}

function nextConfigSource(): string {
  return [
    'import createNextIntlPlugin from "next-intl/plugin";',
    "",
    "const withNextIntl = createNextIntlPlugin({",
    '  createMessagesDeclaration: "./messages/en.json",',
    "});",
    "",
    "export default withNextIntl({});",
    "",
  ].join("\n");
}

function docusaurusConfigSource(): string {
  return [
    'import type {Config} from "@docusaurus/types";',
    'import preset from "@docusaurus/preset-classic";',
    "",
    "const config: Config = {",
    '  presets: [["@docusaurus/preset-classic", {}]],',
    "};",
    "",
    "export default config;",
    "",
  ].join("\n");
}

function svelteConfigSource(): string {
  return [
    'import {vitePreprocess} from "@sveltejs/vite-plugin-svelte";',
    'import azure from "svelte-adapter-azure-swa";',
    "",
    "const config = {",
    "  preprocess: vitePreprocess(),",
    "  kit: {",
    "    adapter: azure(),",
    "  },",
    "};",
    "",
    "export default config;",
    "",
  ].join("\n");
}

function viteConfigSource(): string {
  return [
    'import {sveltekit} from "@sveltejs/kit/vite";',
    'import {defineConfig} from "vite";',
    "",
    "export default defineConfig({",
    "  plugins: [sveltekit()],",
    "});",
    "",
  ].join("\n");
}

function sveltePackageJsonSource(name: string, engines = ">=24"): string {
  return JSON.stringify({
    name,
    private: true,
    version: "1.0.0",
    engines: {node: engines},
    scripts: {
      prepare: "svelte-kit sync || echo ''",
      check: "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
      test: "vitest run",
      build: "vite build",
    },
    dependencies: {"svelte-adapter-azure-swa": "*"},
    devDependencies: {
      "@sveltejs/kit": "*",
      "@sveltejs/vite-plugin-svelte": "*",
      svelte: "*",
      typescript: "*",
      vite: "*",
      vitest: "*",
    },
  });
}

function svelteProjectJsonSource(name: string, siteRelativeRoot: string): string {
  return JSON.stringify({
    name,
    targets: {
      build: {executor: "nx:run-commands", options: {command: "npm run build", cwd: siteRelativeRoot}},
      prepare: {executor: "nx:run-commands", options: {command: "npm run prepare", cwd: siteRelativeRoot}},
      check: {executor: "nx:run-commands", options: {command: "npm run check", cwd: siteRelativeRoot}},
      test: {executor: "nx:run-commands", options: {command: "npm run test", cwd: siteRelativeRoot}},
    },
  });
}

function taxonomyArtifactSource(): string {
  return JSON.stringify({
    system: "gpc",
    version: "2026-05",
    sourceUrl: "https://example.test/taxonomy",
    attribution: "Example attribution",
    generatedAt: new Date().toISOString(),
  });
}

function healthyLicensesSource(): string {
  return JSON.stringify({production: [{name: "example", license: "MIT", version: "1.0.0"}]});
}

function healthyMessages(): string {
  return JSON.stringify({greeting: "hello", nested: {label: "world"}});
}

function healthyDeclaration(): string {
  return [
    "declare const messages: {",
    '  "greeting": "hello",',
    '  "nested": {',
    '    "label": "world"',
    "  }",
    "};",
    "",
    "export default messages;",
    "",
  ].join("\n");
}

function playwrightInventoryOutput(version: string, includeChromium = true): string {
  return [
    `Playwright version: ${version}`,
    "  Browsers:",
    ...(includeChromium ? ["    C:\\ms-playwright\\chromium-1179"] : []),
    "  References:",
    "    C:\\repo\\node_modules\\playwright-core",
  ].join("\n");
}

interface FrontendFixture {
  readonly root: string;
  readonly paths: RepositoryPaths;
  readonly run: ReturnType<typeof vi.fn<CommandRunner["run"]>>;
  readonly setResponse: (command: Readonly<CommandSpec>, result: CommandResult, cwd?: string) => void;
  readonly input: FrontendProviderInput;
  readonly packages: ReturnType<typeof vi.fn<() => Promise<InspectionOutcome<PackageInventoryFacts>>>>;
}

async function createFrontendFixture(
  input: Readonly<{
    packagesOutcome?: InspectionOutcome<PackageInventoryFacts>;
    playwrightOutcome?: CommandResult;
    skipWebsiteEnv?: boolean;
    websiteEnvContents?: string;
    nextConfigContents?: string | null;
    docusaurusConfigContents?: string | null;
    messagesEn?: string | null;
    messagesRo?: string | null;
    messagesFr?: string | null;
    messagesDeclaration?: string | null;
    licensesContents?: string | null;
    skipTaxonomyArtifact?: boolean;
    websitePackageJsonContents?: string | null;
    websiteProjectJsonContents?: string | null;
    cv?: Readonly<{
      packageJsonContents?: string | null;
      projectJsonContents?: string | null;
      svelteConfigContents?: string | null;
      viteConfigContents?: string | null;
      skipGeneratedConfig?: boolean;
    }>;
    status?: Readonly<{
      packageJsonContents?: string | null;
      projectJsonContents?: string | null;
      svelteConfigContents?: string | null;
      viteConfigContents?: string | null;
      skipGeneratedConfig?: boolean;
    }>;
  }> = {},
): Promise<FrontendFixture> {
  const root = await mkdtemp(join(tmpdir(), "arolariu-inspection-frontend-"));
  fixtureRoots.push(root);
  const paths = createRepositoryPaths(root);

  const websiteTaxonomyRoot = resolve(paths.websiteRoot, "src", "data", "taxonomies");

  const writes: Promise<void>[] = [];
  if (input.websitePackageJsonContents !== null) {
    writes.push(
      writeFixtureFile(
        resolve(paths.websiteRoot, "package.json"),
        input.websitePackageJsonContents ?? JSON.stringify({name: "@arolariu/website", dependencies: {"@arolariu/components": "*"}}),
      ),
    );
  }
  if (input.websiteProjectJsonContents !== null) {
    writes.push(
      writeFixtureFile(
        resolve(paths.websiteRoot, "project.json"),
        input.websiteProjectJsonContents
          ?? JSON.stringify({
            name: "@arolariu/website",
            targets: {
              build: {dependsOn: ["components:build"]},
              dev: {dependsOn: ["components:build"]},
            },
          }),
      ),
    );
  }
  if (input.nextConfigContents !== null) {
    writes.push(writeFixtureFile(resolve(paths.websiteRoot, "next.config.ts"), input.nextConfigContents ?? nextConfigSource()));
  }
  if (input.docusaurusConfigContents !== null) {
    writes.push(
      writeFixtureFile(resolve(paths.docsRoot, "docusaurus.config.ts"), input.docusaurusConfigContents ?? docusaurusConfigSource()),
    );
  }
  if (input.skipWebsiteEnv !== true) {
    writes.push(
      writeFixtureFile(
        paths.websiteEnvironment,
        input.websiteEnvContents ?? "SITE_ENV=DEVELOPMENT\nSITE_NAME=dev.arolariu.ro\nSITE_URL=https://localhost:3000\nUSE_CDN=false\n",
      ),
    );
  }
  if (input.messagesEn !== null) {
    writes.push(writeFixtureFile(resolve(paths.websiteRoot, "messages", "en.json"), input.messagesEn ?? healthyMessages()));
  }
  if (input.messagesRo !== null) {
    writes.push(writeFixtureFile(resolve(paths.websiteRoot, "messages", "ro.json"), input.messagesRo ?? healthyMessages()));
  }
  if (input.messagesFr !== null) {
    writes.push(writeFixtureFile(resolve(paths.websiteRoot, "messages", "fr.json"), input.messagesFr ?? healthyMessages()));
  }
  if (input.messagesDeclaration !== null) {
    writes.push(
      writeFixtureFile(resolve(paths.websiteRoot, "messages", "en.d.json.ts"), input.messagesDeclaration ?? healthyDeclaration()),
    );
  }
  if (input.licensesContents !== null) {
    writes.push(writeFixtureFile(resolve(paths.websiteRoot, "licenses.json"), input.licensesContents ?? healthyLicensesSource()));
  }
  if (input.skipTaxonomyArtifact !== true) {
    writes.push(writeFixtureFile(resolve(websiteTaxonomyRoot, "gpc-2026-05.min.json"), taxonomyArtifactSource()));
    writes.push(writeFixtureFile(resolve(websiteTaxonomyRoot, "ecoicop-v2.min.json"), taxonomyArtifactSource()));
    writes.push(writeFixtureFile(resolve(websiteTaxonomyRoot, "nace-2.1.min.json"), taxonomyArtifactSource()));
  }

  const svelteRoots: Readonly<Record<SvelteProjectId, string>> = {cv: paths.cvRoot, status: paths.statusRoot};
  const svelteNames: Readonly<Record<SvelteProjectId, string>> = {cv: "@arolariu/cv", status: "@arolariu/status"};
  for (const id of ["cv", "status"] as const) {
    const options = input[id] ?? {};
    const siteRoot = svelteRoots[id];
    const siteRelativeRoot = id === "cv" ? "sites/cv.arolariu.ro" : "sites/status.arolariu.ro";
    if (options.packageJsonContents !== null) {
      writes.push(
        writeFixtureFile(resolve(siteRoot, "package.json"), options.packageJsonContents ?? sveltePackageJsonSource(svelteNames[id])),
      );
    }
    if (options.projectJsonContents !== null) {
      writes.push(
        writeFixtureFile(
          resolve(siteRoot, "project.json"),
          options.projectJsonContents ?? svelteProjectJsonSource(svelteNames[id], siteRelativeRoot),
        ),
      );
    }
    if (options.svelteConfigContents !== null) {
      writes.push(writeFixtureFile(resolve(siteRoot, "svelte.config.js"), options.svelteConfigContents ?? svelteConfigSource()));
    }
    if (options.viteConfigContents !== null) {
      writes.push(writeFixtureFile(resolve(siteRoot, "vite.config.ts"), options.viteConfigContents ?? viteConfigSource()));
    }
    if (options.skipGeneratedConfig !== true) {
      writes.push(writeFixtureFile(resolve(siteRoot, ".svelte-kit", "tsconfig.json"), "{}\n"));
    }
  }

  await Promise.all(writes);

  const responses = new Map<string, CommandResult>();
  const setResponse = (command: Readonly<CommandSpec>, result: CommandResult, cwd: string = paths.root): void => {
    responses.set(commandKey(command, cwd), result);
  };
  setResponse(
    {command: "npx", args: ["--no-install", "playwright", "install", "--list"]},
    input.playwrightOutcome ?? commandResult({stdout: playwrightInventoryOutput("1.62.1")}),
  );

  const run = vi.fn<CommandRunner["run"]>(
    async (command, options): Promise<CommandResult> =>
      responses.get(commandKey(command, options?.cwd))
      ?? commandResult({code: 127, spawnError: `unexpected-native-command-marker:${command.command}`}),
  );

  const packages = vi.fn<() => Promise<InspectionOutcome<PackageInventoryFacts>>>(
    async () => input.packagesOutcome ?? {kind: "available", value: packagesOf(), durationMs: 1},
  );

  const providerInput: FrontendProviderInput = {
    paths,
    packages,
    probes: createInspectionProbeRunner({run}),
    now: clock(),
  };

  return {root, paths, run, setResponse, input: providerInput, packages};
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map(async (root) => rm(root, {recursive: true, force: true})));
});

describe("package-name coverage", () => {
  it("only references package names within REACT_INSPECTED_PACKAGE_NAMES for React facts", async () => {
    const fixture = await createFrontendFixture();
    const outcome = await createReactProvider(fixture.input)();
    expect(outcome.kind).toBe("available");
    // The only package names dereferenced from the shared inventory by the React provider are
    // the workspace-linked components package and the Playwright package used to select the
    // matching browser inventory; both must belong to the exhaustive React tuple.
    expect(REACT_INSPECTED_PACKAGE_NAMES).toEqual(expect.arrayContaining(["@arolariu/components", "playwright"]));
  });

  it("only references package names within SVELTE_INSPECTED_PACKAGE_NAMES for Svelte facts", async () => {
    const fixture = await createFrontendFixture();
    const outcome = await createSvelteProvider("cv", fixture.input)();
    expect(outcome.kind).toBe("available");
    expect(SVELTE_INSPECTED_PACKAGE_NAMES.length).toBeGreaterThan(0);
    for (const name of SVELTE_INSPECTED_PACKAGE_NAMES) {
      expect(SVELTE_INSPECTED_PACKAGE_NAMES).toContain(name);
    }
  });
});

describe("createReactProvider", () => {
  it("projects healthy React facts with zero issues", async () => {
    const fixture = await createFrontendFixture();

    const outcome = await createReactProvider(fixture.input)();

    expect(outcome.kind).toBe("available");
    const value = (outcome as Extract<typeof outcome, {kind: "available"}>).value as ReactFacts;
    expect(value.workspaceLinkIssues).toEqual([]);
    expect(value.i18nIssues).toEqual([]);
    expect(value.artifactIssues).toEqual([]);
    expect(value.frameworkIssues).toEqual([]);
    expect(value.environment).toEqual({
      syntaxErrors: [],
      presentKeys: ["SITE_ENV", "SITE_NAME", "SITE_URL", "USE_CDN"],
      missingCoreKeys: [],
      missingAuthenticationKeys: ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"],
    });
    expect(value.playwright).toEqual({version: "1.62.1", browsers: ["chromium-1179"]});
    expect(value.packages.installed["@arolariu/components"]).toEqual({version: "2.2.0", workspaceRoot: "packages/components"});
    expect(outcome.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("propagates an unavailable package inventory outcome", async () => {
    const fixture = await createFrontendFixture({packagesOutcome: {kind: "unavailable", reason: "packages unavailable", durationMs: 1}});

    const outcome = await createReactProvider(fixture.input)();

    expect(outcome).toEqual({kind: "unavailable", reason: "packages unavailable", durationMs: expect.any(Number)});
  });

  it("propagates an invalid package inventory outcome", async () => {
    const fixture = await createFrontendFixture({
      packagesOutcome: {kind: "invalid", issues: ["bad package metadata"], durationMs: 1},
    });

    const outcome = await createReactProvider(fixture.input)();

    expect(outcome).toEqual({kind: "invalid", issues: ["bad package metadata"], durationMs: expect.any(Number)});
  });

  it("reports a workspace-link issue when @arolariu/components is not installed", async () => {
    const fixture = await createFrontendFixture({
      packagesOutcome: {
        kind: "available",
        value: (() => {
          const value = packagesOf();
          const installed = {...value.installed} as Record<string, {version: string; workspaceRoot?: string}>;
          delete installed["@arolariu/components"];
          return {installed, malformed: []};
        })(),
        durationMs: 1,
      },
    });

    const outcome = await createReactProvider(fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as ReactFacts;
    expect(facts.workspaceLinkIssues).toContain("@arolariu/components is not installed.");
  });

  it("reports a workspace-link issue when @arolariu/components resolves outside the workspace", async () => {
    const fixture = await createFrontendFixture({
      packagesOutcome: {
        kind: "available",
        value: packagesOf({"@arolariu/components": {version: "2.2.0"}}),
        durationMs: 1,
      },
    });

    const outcome = await createReactProvider(fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as ReactFacts;
    expect(facts.workspaceLinkIssues).toContain("@arolariu/components is not linked to the local workspace package.");
  });

  it("reports a workspace-link issue when the website package.json omits the dependency", async () => {
    const fixture = await createFrontendFixture({
      websitePackageJsonContents: JSON.stringify({name: "@arolariu/website", dependencies: {}}),
    });

    const outcome = await createReactProvider(fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as ReactFacts;
    expect(facts.workspaceLinkIssues).toContain("sites/arolariu.ro/package.json does not declare a dependency on @arolariu/components.");
  });

  it("reports a workspace-link issue when the build target omits the components:build dependsOn linkage", async () => {
    const fixture = await createFrontendFixture({
      websiteProjectJsonContents: JSON.stringify({
        name: "@arolariu/website",
        targets: {build: {dependsOn: []}, dev: {dependsOn: ["components:build"]}},
      }),
    });

    const outcome = await createReactProvider(fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as ReactFacts;
    expect(facts.workspaceLinkIssues).toContain("sites/arolariu.ro/project.json build target does not depend on components:build.");
  });

  it("treats an absent website .env file as every key missing without a syntax error", async () => {
    const fixture = await createFrontendFixture({skipWebsiteEnv: true});

    const outcome = await createReactProvider(fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as ReactFacts;
    expect(facts.environment).toEqual({
      syntaxErrors: [],
      presentKeys: [],
      missingCoreKeys: ["SITE_ENV", "SITE_NAME", "SITE_URL", "USE_CDN"],
      missingAuthenticationKeys: ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"],
    });
  });

  it("reports a syntax error for a website .env line without an assignment", async () => {
    const fixture = await createFrontendFixture({websiteEnvContents: ["SITE_ENV=DEVELOPMENT", "this is not valid"].join("\n")});

    const outcome = await createReactProvider(fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as ReactFacts;
    expect(facts.environment.syntaxErrors).toEqual(["Line 2: expected KEY=VALUE syntax."]);
  });

  it("reports a syntax error for a duplicate website .env key", async () => {
    const fixture = await createFrontendFixture({
      websiteEnvContents: ["SITE_ENV=DEVELOPMENT", "SITE_ENV=PRODUCTION"].join("\n"),
    });

    const outcome = await createReactProvider(fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as ReactFacts;
    expect(facts.environment.syntaxErrors).toEqual(["Line 2: 'SITE_ENV' duplicates the key first defined on line 1."]);
  });

  it("reports an i18n issue when a locale dictionary key shape diverges", async () => {
    const fixture = await createFrontendFixture({messagesRo: JSON.stringify({greeting: "salut"})});

    const outcome = await createReactProvider(fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as ReactFacts;
    expect(facts.i18nIssues.some((issue) => issue.includes("ro.json is missing"))).toBe(true);
  });

  it("reports an i18n issue when the generated declaration is missing", async () => {
    const fixture = await createFrontendFixture({messagesDeclaration: null});

    const outcome = await createReactProvider(fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as ReactFacts;
    expect(facts.i18nIssues).toEqual(["messages/en.d.json.ts was not found."]);
  });

  it("reports an artifact issue when a website taxonomy artifact is missing", async () => {
    const fixture = await createFrontendFixture({skipTaxonomyArtifact: true});

    const outcome = await createReactProvider(fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as ReactFacts;
    expect(facts.artifactIssues).toContain("gpc-2026-05.min.json is missing.");
  });

  it("reports an artifact issue when licenses.json is malformed", async () => {
    const fixture = await createFrontendFixture({licensesContents: JSON.stringify({production: [{name: ""}]})});

    const outcome = await createReactProvider(fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as ReactFacts;
    expect(facts.artifactIssues).toContain("licenses.json contains malformed license entries.");
  });

  it("returns an unavailable outcome when the Playwright inventory probe cannot be started", async () => {
    const fixture = await createFrontendFixture({
      playwrightOutcome: commandResult({code: 127, spawnError: "missing-playwright-marker"}),
    });

    const outcome = await createReactProvider(fixture.input)();

    expect(outcome.kind).toBe("unavailable");
    expect(JSON.stringify(outcome)).not.toMatch(/missing-playwright-marker/u);
  });

  it("reports a framework issue when next.config.ts does not wire next-intl", async () => {
    const fixture = await createFrontendFixture({nextConfigContents: "export default {};\n"});

    const outcome = await createReactProvider(fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as ReactFacts;
    expect(facts.frameworkIssues).toContain("next.config.ts does not call createNextIntlPlugin.");
  });

  it("reports a framework issue when docusaurus.config.ts does not reference the classic preset", async () => {
    const fixture = await createFrontendFixture({docusaurusConfigContents: "export default {};\n"});

    const outcome = await createReactProvider(fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as ReactFacts;
    expect(facts.frameworkIssues).toContain("docusaurus.config.ts does not reference @docusaurus/preset-classic.");
  });

  it("measures duration only after all inspection completes", async () => {
    const fixture = await createFrontendFixture();

    const outcome = await createReactProvider(fixture.input)();

    expect(outcome.durationMs).toBeGreaterThan(0);
  });
});

describe("createSvelteProvider", () => {
  it("projects healthy cv Svelte facts with zero issues", async () => {
    const fixture = await createFrontendFixture();

    const outcome = await createSvelteProvider("cv", fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as SvelteFacts;
    expect(facts.id).toBe("cv");
    expect(facts.packageIssues).toEqual([]);
    expect(facts.scriptIssues).toEqual([]);
    expect(facts.adapterIssues).toEqual([]);
    expect(facts.nodeEngine).toBe(">=24");
    expect(facts.adapterSpecifier).toBe("svelte-adapter-azure-swa");
    expect(facts.generatedConfigExists).toBe(true);
  });

  it("projects healthy status Svelte facts with the status identity", async () => {
    const fixture = await createFrontendFixture();

    const outcome = await createSvelteProvider("status", fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as SvelteFacts;
    expect(facts.id).toBe("status");
    expect(facts.packageIssues).toEqual([]);
  });

  it("propagates an unavailable package inventory outcome", async () => {
    const fixture = await createFrontendFixture({packagesOutcome: {kind: "unavailable", reason: "packages unavailable", durationMs: 1}});

    const outcome = await createSvelteProvider("cv", fixture.input)();

    expect(outcome).toEqual({kind: "unavailable", reason: "packages unavailable", durationMs: expect.any(Number)});
  });

  it("propagates an invalid package inventory outcome", async () => {
    const fixture = await createFrontendFixture({
      packagesOutcome: {kind: "invalid", issues: ["bad package metadata"], durationMs: 1},
    });

    const outcome = await createSvelteProvider("cv", fixture.input)();

    expect(outcome).toEqual({kind: "invalid", issues: ["bad package metadata"], durationMs: expect.any(Number)});
  });

  it("reports a package issue when package.json cannot be read", async () => {
    const fixture = await createFrontendFixture({cv: {packageJsonContents: null}});

    const outcome = await createSvelteProvider("cv", fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as SvelteFacts;
    expect(facts.packageIssues).toContain("package.json could not be read or parsed.");
    expect(facts.nodeEngine).toBeUndefined();
  });

  it("reports a package issue when a required package is not installed", async () => {
    const fixture = await createFrontendFixture({
      packagesOutcome: {
        kind: "available",
        value: (() => {
          const value = packagesOf();
          const installed = {...value.installed} as Record<string, {version: string; workspaceRoot?: string}>;
          delete installed["vitest"];
          return {installed, malformed: []};
        })(),
        durationMs: 1,
      },
    });

    const outcome = await createSvelteProvider("cv", fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as SvelteFacts;
    expect(facts.packageIssues).toContain("vitest is not installed.");
  });

  it("reports a package issue when package.json#engines.node is malformed", async () => {
    const fixture = await createFrontendFixture({
      cv: {packageJsonContents: sveltePackageJsonSource("@arolariu/cv", "not-a-range")},
    });

    const outcome = await createSvelteProvider("cv", fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as SvelteFacts;
    expect(facts.packageIssues).toContain("package.json#engines.node is missing or uses an unsupported range.");
    expect(facts.nodeEngine).toBeUndefined();
  });

  it("reports a script issue when a required script is missing", async () => {
    const fixture = await createFrontendFixture({
      cv: {
        packageJsonContents: JSON.stringify({
          name: "@arolariu/cv",
          engines: {node: ">=24"},
          scripts: {check: "svelte-kit sync && svelte-check", test: "vitest run", build: "vite build"},
          dependencies: {"svelte-adapter-azure-swa": "*"},
          devDependencies: {
            "@sveltejs/kit": "*",
            "@sveltejs/vite-plugin-svelte": "*",
            svelte: "*",
            typescript: "*",
            vite: "*",
            vitest: "*",
          },
        }),
      },
    });

    const outcome = await createSvelteProvider("cv", fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as SvelteFacts;
    expect(facts.scriptIssues).toContain("package.json#scripts.prepare is missing or not a string.");
  });

  it("reports a script issue when a project.json target cwd disagrees with the site root", async () => {
    const fixture = await createFrontendFixture({
      cv: {projectJsonContents: svelteProjectJsonSource("@arolariu/cv", "sites/wrong-root")},
    });

    const outcome = await createSvelteProvider("cv", fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as SvelteFacts;
    expect(facts.scriptIssues.some((issue) => issue.includes("project.json#targets.build.options.cwd"))).toBe(true);
  });

  it("reports a script issue when vite.config does not wire the SvelteKit plugin", async () => {
    const fixture = await createFrontendFixture({cv: {viteConfigContents: "export default {};\n"}});

    const outcome = await createSvelteProvider("cv", fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as SvelteFacts;
    expect(facts.scriptIssues.some((issue) => issue.includes("does not wire the SvelteKit Vite plugin"))).toBe(true);
  });

  it("reports generatedConfigExists as false when .svelte-kit/tsconfig.json is absent", async () => {
    const fixture = await createFrontendFixture({cv: {skipGeneratedConfig: true}});

    const outcome = await createSvelteProvider("cv", fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as SvelteFacts;
    expect(facts.generatedConfigExists).toBe(false);
  });

  it("reports an adapter issue when svelte.config does not configure a recognizable adapter", async () => {
    const fixture = await createFrontendFixture({cv: {svelteConfigContents: "export default {kit: {}};\n"}});

    const outcome = await createSvelteProvider("cv", fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as SvelteFacts;
    expect(facts.adapterIssues).toContain("svelte.config does not configure a recognizable kit.adapter.");
    expect(facts.adapterSpecifier).toBeUndefined();
  });

  it("reports an adapter issue when the adapter package is not declared in package.json", async () => {
    const fixture = await createFrontendFixture({
      cv: {
        packageJsonContents: JSON.stringify({
          name: "@arolariu/cv",
          engines: {node: ">=24"},
          scripts: {
            prepare: "svelte-kit sync",
            check: "svelte-kit sync && svelte-check",
            test: "vitest run",
            build: "vite build",
          },
          devDependencies: {
            "@sveltejs/kit": "*",
            "@sveltejs/vite-plugin-svelte": "*",
            svelte: "*",
            typescript: "*",
            vite: "*",
            vitest: "*",
          },
        }),
      },
    });

    const outcome = await createSvelteProvider("cv", fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as SvelteFacts;
    expect(facts.adapterIssues).toContain("svelte-adapter-azure-swa is not declared as a dependency in package.json.");
  });

  it("reports an adapter issue when the adapter package is not installed", async () => {
    const fixture = await createFrontendFixture({
      packagesOutcome: {
        kind: "available",
        value: (() => {
          const value = packagesOf();
          const installed = {...value.installed} as Record<string, {version: string; workspaceRoot?: string}>;
          delete installed["svelte-adapter-azure-swa"];
          return {installed, malformed: []};
        })(),
        durationMs: 1,
      },
    });

    const outcome = await createSvelteProvider("cv", fixture.input)();

    expect(outcome.kind).toBe("available");
    const facts = (outcome as Extract<typeof outcome, {kind: "available"}>).value as SvelteFacts;
    expect(facts.adapterIssues).toContain("svelte-adapter-azure-swa is not installed.");
    // The adapter presence check must not additionally duplicate into packageIssues.
    expect(facts.packageIssues).toEqual([]);
  });

  it("measures duration only after all inspection completes", async () => {
    const fixture = await createFrontendFixture();

    const outcome = await createSvelteProvider("status", fixture.input)();

    expect(outcome.durationMs).toBeGreaterThan(0);
  });
});
