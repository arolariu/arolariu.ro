// @vitest-environment node
/**
 * @fileoverview Contract tests for read-only SvelteKit diagnostics (CV and status sites).
 * @module scripts.doctor.svelte.test
 */

import {mkdir, mkdtemp, rm, utimes, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {afterEach, describe, expect, it, vi} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {CommandResult, CommandSpec} from "./common/process.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import {inspectSvelteProject, svelteDoctorModule} from "./doctor.svelte.ts";
import type {DiagnosticCommandRunner, DiagnosticNetworkResult, DoctorContext, DoctorOptions} from "./doctor.types.ts";

const fixtureRoots: string[] = [];

const PACKAGE_VERSIONS: ReadonlyMap<string, string> = new Map([
  ["svelte", "5.56.8"],
  ["@sveltejs/kit", "2.70.2"],
  ["vite", "8.2.0"],
  ["typescript", "6.0.3"],
  ["vitest", "4.1.10"],
  ["svelte-adapter-azure-swa", "0.22.1"],
]);

function validRequirements(): RepositoryRequirements {
  return {
    node: {major: 24, minor: 0, patch: 0},
    npm: {major: 11, minor: 0, patch: 0},
    dotnet: {major: 10, minor: 0, patch: 0},
    python: {major: 3, minor: 12, patch: 0},
    packages: new Map(),
  };
}

function doctorOptions(patch: Partial<DoctorOptions> = {}): DoctorOptions {
  return {
    verbose: false,
    ci: false,
    score: false,
    json: false,
    quick: false,
    help: false,
    ...patch,
  };
}

async function writeFixtureFile(path: string, contents: string): Promise<void> {
  await mkdir(resolve(path, ".."), {recursive: true});
  await writeFile(path, contents, "utf8");
}

function svelteConfigSource(): string {
  return [
    "import {vitePreprocess} from \"@sveltejs/vite-plugin-svelte\";",
    "import azure from \"svelte-adapter-azure-swa\";",
    "",
    "const config = {",
    "  preprocess: vitePreprocess(),",
    "  kit: {",
    "    adapter: azure(),",
    "    alias: {\"@/*\": \"src/*\"},",
    "  },",
    "};",
    "",
    "export default config;",
    "",
  ].join("\n");
}

function viteConfigSource(): string {
  return [
    "import {sveltekit} from \"@sveltejs/kit/vite\";",
    "import {defineConfig} from \"vite\";",
    "",
    "export default defineConfig({",
    "  plugins: [sveltekit()],",
    "});",
    "",
  ].join("\n");
}

function packageJsonSource(name: string, engines: string): string {
  return JSON.stringify(
    {
      name,
      private: true,
      version: "1.0.0",
      type: "module",
      engines: {node: engines},
      scripts: {
        dev: "vite dev",
        build: "vite build",
        preview: "vite preview",
        prepare: "svelte-kit sync || echo ''",
        check: "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
        test: "npm run test:unit",
        "test:unit": "svelte-kit sync && npm run test:vitest",
        "test:vitest": "vitest run",
      },
      devDependencies: {
        "@sveltejs/kit": "*",
        "@sveltejs/vite-plugin-svelte": "*",
        svelte: "*",
        "svelte-adapter-azure-swa": "*",
        "svelte-check": "*",
        typescript: "*",
        vite: "*",
        vitest: "*",
      },
    },
    undefined,
    2,
  );
}

function projectJsonSource(name: string, siteRelativeRoot: string): string {
  return JSON.stringify(
    {
      name,
      targets: {
        build: {executor: "nx:run-commands", options: {command: "npm run build", cwd: siteRelativeRoot}},
        prepare: {executor: "nx:run-commands", options: {command: "npm run prepare", cwd: siteRelativeRoot}},
        check: {executor: "nx:run-commands", options: {command: "npm run check", cwd: siteRelativeRoot}},
        test: {executor: "nx:run-commands", options: {command: "npm run test", cwd: siteRelativeRoot}},
      },
    },
    undefined,
    2,
  );
}

interface SiteOptions {
  readonly packageJsonContents?: string;
  readonly skipPackageJson?: boolean;
  readonly projectJsonContents?: string;
  readonly skipProjectJson?: boolean;
  readonly svelteConfigContents?: string;
  readonly skipSvelteConfig?: boolean;
  readonly viteConfigFileName?: "vite.config.ts" | "vite.config.js";
  readonly viteConfigContents?: string;
  readonly skipViteConfig?: boolean;
  readonly skipGeneratedTsconfig?: boolean;
  readonly engines?: string;
}

interface SvelteFixture {
  readonly root: string;
  readonly context: DoctorContext;
  readonly run: ReturnType<typeof vi.fn<DiagnosticCommandRunner["run"]>>;
  readonly cvRoot: string;
  readonly statusRoot: string;
}

async function writeHealthySite(
  root: string,
  siteRoot: string,
  name: string,
  siteRelativeRoot: string,
  options: SiteOptions = {},
): Promise<void> {
  if (options.skipPackageJson !== true) {
    await writeFixtureFile(
      resolve(siteRoot, "package.json"),
      options.packageJsonContents ?? packageJsonSource(name, options.engines ?? ">=24"),
    );
  }

  if (options.skipProjectJson !== true) {
    await writeFixtureFile(
      resolve(siteRoot, "project.json"),
      options.projectJsonContents ?? projectJsonSource(name, siteRelativeRoot),
    );
  }

  if (options.skipSvelteConfig !== true) {
    await writeFixtureFile(resolve(siteRoot, "svelte.config.js"), options.svelteConfigContents ?? svelteConfigSource());
  }

  if (options.skipViteConfig !== true) {
    await writeFixtureFile(
      resolve(siteRoot, options.viteConfigFileName ?? "vite.config.ts"),
      options.viteConfigContents ?? viteConfigSource(),
    );
  }

  if (options.skipGeneratedTsconfig !== true) {
    await writeFixtureFile(resolve(siteRoot, ".svelte-kit", "tsconfig.json"), "{}\n");
    // Ensure the generated file is not older than the sources it depends on by
    // touching it slightly in the future, avoiding filesystem timestamp granularity flakes.
    const future = new Date(Date.now() + 60_000);
    await utimes(resolve(siteRoot, ".svelte-kit", "tsconfig.json"), future, future);
  }
}

async function createSvelteFixture(
  input: Readonly<{
    cv?: SiteOptions;
    status?: SiteOptions;
    requirementsValid?: boolean;
    skipPackageLock?: boolean;
    packageLockContents?: string;
    skipNodeModules?: readonly string[];
    installedVersionOverrides?: ReadonlyMap<string, string>;
  }> = {},
): Promise<SvelteFixture> {
  const root = await mkdtemp(join(tmpdir(), "arolariu-doctor-svelte-"));
  fixtureRoots.push(root);
  const paths = createRepositoryPaths(root);

  const installedVersions = new Map(PACKAGE_VERSIONS);
  for (const [name, version] of input.installedVersionOverrides ?? []) {
    installedVersions.set(name, version);
  }

  for (const [name, version] of installedVersions) {
    if (input.skipNodeModules?.includes(name) === true) {
      continue;
    }
    await writeFixtureFile(
      resolve(root, "node_modules", ...name.split("/"), "package.json"),
      JSON.stringify({name, version}),
    );
  }

  if (input.skipPackageLock !== true) {
    const lockPackages: Record<string, unknown> = {};
    for (const [name, version] of PACKAGE_VERSIONS) {
      lockPackages[`node_modules/${name}`] = {version};
    }
    await writeFixtureFile(
      paths.packageLock,
      input.packageLockContents ?? JSON.stringify({lockfileVersion: 3, packages: lockPackages}),
    );
  }

  await writeHealthySite(root, paths.cvRoot, "@arolariu/cv", "sites/cv.arolariu.ro", {engines: ">=22.8", ...input.cv});
  await writeHealthySite(root, paths.statusRoot, "@arolariu/status", "sites/status.arolariu.ro", {engines: ">=24", ...input.status});

  const run = vi.fn<DiagnosticCommandRunner["run"]>(
    async (): Promise<CommandResult> => ({code: 127, stdout: "", stderr: "", durationMs: 1, timedOut: false, spawnError: "unexpected call"}),
  );
  const runner: DiagnosticCommandRunner = {run};
  const networkGet = vi.fn(async (): Promise<DiagnosticNetworkResult> => ({status: "reachable", statusCode: 200, durationMs: 1}));
  const sink = new InMemoryLoggerSink();
  let now = 0;
  const context: DoctorContext = {
    options: doctorOptions(),
    paths,
    requirements:
      input.requirementsValid === false
        ? {status: "invalid", errors: ["synthetic invalid requirements"]}
        : {status: "valid", requirements: validRequirements()},
    runner,
    network: {get: networkGet},
    logger: new MonorepositoryConsoleLogger("doctor::svelte", {color: false, sink}),
    platform: "win32",
    arch: "x64",
    env: {PATH: resolve(root, "bin")},
    now: () => ++now,
  };

  return {root, context, run, cvRoot: paths.cvRoot, statusRoot: paths.statusRoot};
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map((dir) => rm(dir, {recursive: true, force: true})));
});

describe("svelteDoctorModule", () => {
  it("returns every stable svelte check in CV-then-status order for a healthy baseline", async () => {
    const fixture = await createSvelteFixture();

    const results = await svelteDoctorModule.run(fixture.context);

    expect(results.map(({id}) => id)).toEqual([
      "svelte.cv.packages",
      "svelte.cv.node-engine",
      "svelte.cv.scripts",
      "svelte.cv.generated-state",
      "svelte.cv.adapter",
      "svelte.status.packages",
      "svelte.status.node-engine",
      "svelte.status.scripts",
      "svelte.status.generated-state",
      "svelte.status.adapter",
    ]);
    expect(results.every(({module}) => module === "svelte")).toBe(true);
    expect(results.every(({status}) => status === "pass")).toBe(true);
  });

  it("never invokes the command runner", async () => {
    const fixture = await createSvelteFixture();

    await svelteDoctorModule.run(fixture.context);

    expect(fixture.run).not.toHaveBeenCalled();
  });

  it("never asks for svelte-kit sync, svelte-check, vite build, vitest, or playwright test", async () => {
    const fixture = await createSvelteFixture();

    await svelteDoctorModule.run(fixture.context);

    const forbidden: readonly Readonly<CommandSpec>[] = [
      {command: "npx", args: ["svelte-kit", "sync"]},
      {command: "npx", args: ["svelte-check"]},
      {command: "npx", args: ["vite", "build"]},
      {command: "npx", args: ["vitest", "run"]},
      {command: "npx", args: ["playwright", "test"]},
    ];
    for (const call of fixture.run.mock.calls) {
      const [command] = call;
      expect(forbidden.some((entry) => entry.command === command.command && entry.args.join(" ") === command.args.join(" "))).toBe(false);
    }
  });
});

describe("inspectSvelteProject", () => {
  it("returns the five stable CV checks in order, all passing, for a healthy baseline", async () => {
    const fixture = await createSvelteFixture();

    const results = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

    expect(results.map(({id}) => id)).toEqual([
      "svelte.cv.packages",
      "svelte.cv.node-engine",
      "svelte.cv.scripts",
      "svelte.cv.generated-state",
      "svelte.cv.adapter",
    ]);
    expect(results.every(({status}) => status === "pass")).toBe(true);
  });

  it("returns the five stable status checks in order, all passing, for a healthy baseline", async () => {
    const fixture = await createSvelteFixture();

    const results = await inspectSvelteProject(fixture.context, {id: "status", root: fixture.statusRoot});

    expect(results.map(({id}) => id)).toEqual([
      "svelte.status.packages",
      "svelte.status.node-engine",
      "svelte.status.scripts",
      "svelte.status.generated-state",
      "svelte.status.adapter",
    ]);
    expect(results.every(({status}) => status === "pass")).toBe(true);
  });

  describe("packages", () => {
    it("fails with missing-install evidence when a package is not installed anywhere", async () => {
      const fixture = await createSvelteFixture({skipNodeModules: ["vite"]});

      const [packages] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(packages?.status).toBe("fail");
      expect(packages?.evidence.some((entry) => entry.includes("vite") && entry.includes("is not installed"))).toBe(true);
      expect(packages?.fixes.length).toBeGreaterThan(0);
    });

    it("fails with missing-package evidence when the lockfile has no entry for a package", async () => {
      const lockPackages: Record<string, unknown> = {};
      for (const [name, version] of PACKAGE_VERSIONS) {
        if (name === "typescript") {
          continue;
        }
        lockPackages[`node_modules/${name}`] = {version};
      }
      const fixture = await createSvelteFixture({packageLockContents: JSON.stringify({lockfileVersion: 3, packages: lockPackages})});

      const [packages] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(packages?.status).toBe("fail");
      expect(packages?.evidence.some((entry) => entry.includes("typescript") && entry.includes("missing package"))).toBe(true);
    });

    it("fails with version-drift evidence when installed and locked versions differ", async () => {
      const fixture = await createSvelteFixture({installedVersionOverrides: new Map([["svelte", "5.99.0"]])});

      const [packages] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(packages?.status).toBe("fail");
      expect(packages?.evidence.some((entry) => entry.includes("5.99.0") && entry.includes("version drift"))).toBe(true);
    });

    it("fails with malformed-metadata evidence when a locked entry has a non-string version", async () => {
      const lockPackages: Record<string, unknown> = {};
      for (const [name, version] of PACKAGE_VERSIONS) {
        lockPackages[`node_modules/${name}`] = name === "vitest" ? {version: 123} : {version};
      }
      const fixture = await createSvelteFixture({packageLockContents: JSON.stringify({lockfileVersion: 3, packages: lockPackages})});

      const [packages] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(packages?.status).toBe("fail");
      expect(packages?.evidence.some((entry) => entry.includes("vitest") && entry.toLowerCase().includes("malformed"))).toBe(true);
    });

    it("reports an issue but still checks the other packages when the adapter cannot be determined", async () => {
      const fixture = await createSvelteFixture({cv: {svelteConfigContents: "export default {};\n"}});

      const [packages] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(packages?.status).toBe("fail");
      expect(packages?.evidence.some((entry) => entry.toLowerCase().includes("adapter"))).toBe(true);
    });

    it("fails when package.json is malformed", async () => {
      const fixture = await createSvelteFixture({cv: {packageJsonContents: "{ not valid json"}});

      const [packages] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(packages?.status).toBe("fail");
      expect(packages?.evidence.some((entry) => entry.includes("package.json"))).toBe(true);
    });
  });

  describe("node-engine", () => {
    it("is skipped when root requirement sources are invalid", async () => {
      const fixture = await createSvelteFixture({requirementsValid: false});

      const [, nodeEngine] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(nodeEngine?.status).toBe("skipped");
    });

    it("fails when package.json is malformed", async () => {
      const fixture = await createSvelteFixture({cv: {packageJsonContents: "not json"}});

      const [, nodeEngine] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(nodeEngine?.status).toBe("fail");
      expect(nodeEngine?.evidence.some((entry) => entry.includes("package.json"))).toBe(true);
    });

    it("fails when engines.node is missing or malformed", async () => {
      const fixture = await createSvelteFixture({
        cv: {packageJsonContents: JSON.stringify({name: "@arolariu/cv", scripts: {}, devDependencies: {}})},
      });

      const [, nodeEngine] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(nodeEngine?.status).toBe("fail");
      expect(nodeEngine?.evidence.some((entry) => entry.includes("engines"))).toBe(true);
    });

    it("fails when the site requires a newer Node.js than the root runtime provides", async () => {
      const fixture = await createSvelteFixture({cv: {engines: ">=26"}});

      const [, nodeEngine] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(nodeEngine?.status).toBe("fail");
      expect(nodeEngine?.evidence.some((entry) => entry.includes(">=26"))).toBe(true);
    });
  });

  describe("scripts", () => {
    it("fails when a required script is missing", async () => {
      const fixture = await createSvelteFixture({
        cv: {
          packageJsonContents: JSON.stringify({
            name: "@arolariu/cv",
            scripts: {dev: "vite dev", check: "svelte-kit sync && svelte-check", test: "npm run test:unit", "test:unit": "vitest run"},
            devDependencies: {},
          }),
        },
      });

      const [, , scripts] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(scripts?.status).toBe("fail");
      expect(scripts?.evidence.some((entry) => entry.includes("build"))).toBe(true);
    });

    it("fails when package.json is malformed", async () => {
      const fixture = await createSvelteFixture({cv: {packageJsonContents: "{ still not valid"}});

      const [, , scripts] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(scripts?.status).toBe("fail");
      expect(scripts?.evidence.some((entry) => entry.includes("package.json"))).toBe(true);
    });

    it("fails when the build script does not run vite build", async () => {
      const fixture = await createSvelteFixture({
        cv: {
          packageJsonContents: JSON.stringify({
            name: "@arolariu/cv",
            scripts: {
              build: "echo not-vite",
              prepare: "svelte-kit sync || echo ''",
              check: "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
              test: "npm run test:unit",
              "test:unit": "vitest run",
            },
            devDependencies: {},
          }),
        },
      });

      const [, , scripts] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(scripts?.status).toBe("fail");
      expect(scripts?.evidence.some((entry) => entry.includes("build") && entry.includes("vite build"))).toBe(true);
    });

    it("fails when project.json target cwd does not match the site root", async () => {
      const fixture = await createSvelteFixture({
        cv: {projectJsonContents: projectJsonSource("@arolariu/cv", "sites/wrong-directory")},
      });

      const [, , scripts] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(scripts?.status).toBe("fail");
      expect(scripts?.evidence.some((entry) => entry.includes("cwd"))).toBe(true);
    });

    it("fails when project.json is malformed", async () => {
      const fixture = await createSvelteFixture({cv: {projectJsonContents: "{ broken"}});

      const [, , scripts] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(scripts?.status).toBe("fail");
      expect(scripts?.evidence.some((entry) => entry.includes("project.json"))).toBe(true);
    });

    it("fails when vite.config does not wire the SvelteKit Vite plugin", async () => {
      const fixture = await createSvelteFixture({cv: {viteConfigContents: "export default {};\n"}});

      const [, , scripts] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(scripts?.status).toBe("fail");
      expect(scripts?.evidence.some((entry) => entry.toLowerCase().includes("sveltekit"))).toBe(true);
    });
  });

  describe("generated-state", () => {
    it("fails with `npm run setup` as the first fix when .svelte-kit/tsconfig.json is missing", async () => {
      const fixture = await createSvelteFixture({cv: {skipGeneratedTsconfig: true}});

      const [, , , generatedState] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(generatedState?.status).toBe("fail");
      expect(generatedState?.fixes[0]?.command).toBe("npm run setup");
    });

    it("warns when the generated tsconfig is older than the package manifest", async () => {
      const fixture = await createSvelteFixture({cv: {skipGeneratedTsconfig: true}});
      const generatedPath = resolve(fixture.cvRoot, ".svelte-kit", "tsconfig.json");
      const past = new Date(Date.now() - 120_000);
      await writeFixtureFile(generatedPath, "{}\n");
      await utimes(generatedPath, past, past);

      const [, , , generatedState] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(generatedState?.status).toBe("warn");
      expect(generatedState?.evidence.some((entry) => entry.includes("package.json"))).toBe(true);
    });
  });

  describe("adapter", () => {
    it("fails when svelte.config does not configure kit.adapter", async () => {
      const fixture = await createSvelteFixture({cv: {svelteConfigContents: "export default {};\n"}});

      const [, , , , adapter] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(adapter?.status).toBe("fail");
    });

    it("fails when the adapter identifier has no matching import", async () => {
      const fixture = await createSvelteFixture({
        cv: {
          svelteConfigContents: [
            "const config = {kit: {adapter: azure()}};",
            "export default config;",
            "",
          ].join("\n"),
        },
      });

      const [, , , , adapter] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(adapter?.status).toBe("fail");
    });

    it("fails when the adapter package is not declared in package.json", async () => {
      const fixture = await createSvelteFixture({
        cv: {
          packageJsonContents: JSON.stringify({
            name: "@arolariu/cv",
            engines: {node: ">=22.8"},
            scripts: {
              build: "vite build",
              prepare: "svelte-kit sync || echo ''",
              check: "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
              test: "npm run test:unit",
              "test:unit": "vitest run",
            },
            devDependencies: {},
          }),
        },
      });

      const [, , , , adapter] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(adapter?.status).toBe("fail");
      expect(adapter?.evidence.some((entry) => entry.includes("svelte-adapter-azure-swa") && entry.includes("declared"))).toBe(true);
    });

    it("fails when package.json is malformed", async () => {
      const fixture = await createSvelteFixture({cv: {packageJsonContents: "{ nope"}});

      const [, , , , adapter] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(adapter?.status).toBe("fail");
      expect(adapter?.evidence.some((entry) => entry.includes("package.json"))).toBe(true);
    });

    it("fails when the adapter package is not installed", async () => {
      const fixture = await createSvelteFixture({skipNodeModules: ["svelte-adapter-azure-swa"]});

      const [, , , , adapter] = await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot});

      expect(adapter?.status).toBe("fail");
      expect(adapter?.evidence.some((entry) => entry.includes("svelte-adapter-azure-swa") && entry.includes("installed"))).toBe(true);
    });
  });

  it("keeps every warn/fail result with evidence, ordered fixes, and exactly one diagnosis form", async () => {
    const fixture = await createSvelteFixture({
      cv: {svelteConfigContents: "export default {};\n"},
      status: {skipGeneratedTsconfig: true},
    });

    const results = [
      ...(await inspectSvelteProject(fixture.context, {id: "cv", root: fixture.cvRoot})),
      ...(await inspectSvelteProject(fixture.context, {id: "status", root: fixture.statusRoot})),
    ];

    for (const result of results) {
      if (result.status !== "warn" && result.status !== "fail") {
        continue;
      }
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.fixes.length).toBeGreaterThan(0);
      const hasRootCause = result.rootCause !== undefined;
      const hasPotentialCauses = result.potentialCauses.length > 0;
      expect(hasRootCause).not.toBe(hasPotentialCauses);
    }
  });
});
