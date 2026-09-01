// @vitest-environment node
/**
 * @fileoverview Contract tests for read-only React and website diagnostics.
 * @module scripts.doctor.react.test
 */

import {mkdir, mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {basename, dirname, join, resolve} from "node:path";
import {afterEach, describe, expect, it, vi, type Mock} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import type {CommandResult, CommandSpec} from "./common/process.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import {getExpectedTaxonomyArtifactPaths, taxonomyArtifactFileNames} from "./common/taxonomy-artifacts.ts";
import {inspectWebsiteEnvironment, reactDoctorModule} from "./doctor.react.ts";
import type {DiagnosticCommandRunner, DiagnosticNetworkResult, DoctorContext, DoctorOptions} from "./doctor.types.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";

const fixtureRoots: string[] = [];

const REACT_PACKAGE_VERSIONS: ReadonlyMap<string, string> = new Map([
  ["next", "16.3.0"],
  ["react", "19.2.8"],
  ["react-dom", "19.2.8"],
  ["@arolariu/components", "2.2.0"],
  ["@clerk/nextjs", "7.6.5"],
  ["@docusaurus/core", "3.10.2"],
  ["playwright", "1.62.1"],
]);

function validRequirements(): RepositoryRequirements {
  const packages = new Map([...REACT_PACKAGE_VERSIONS].map(([name, version]) => [name, {name, version}]));
  return {
    node: {major: 24, minor: 0, patch: 0},
    npm: {major: 11, minor: 0, patch: 0},
    dotnet: {major: 10, minor: 0, patch: 0},
    python: {major: 3, minor: 12, patch: 0},
    packages,
  };
}

function commandResult(patch: Partial<CommandResult> = {}): CommandResult {
  return {
    code: 0,
    stdout: "",
    stderr: "",
    durationMs: 4,
    timedOut: false,
    ...patch,
  };
}

function commandKey(command: Readonly<CommandSpec>, cwd?: string): string {
  return `${cwd ?? ""}\u0000${command.command}\u0000${JSON.stringify(command.args)}`;
}

function doctorOptions(patch: Partial<DoctorOptions> = {}): DoctorOptions {
  return {
    verbose: false,
    quick: false,
    ...patch,
  };
}

async function writeFixtureFile(path: string, contents = "{}\n"): Promise<void> {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, contents, "utf8");
}

function healthyNpmLsJson(): string {
  const dependencies: Record<string, Record<string, string>> = {};
  for (const [name, version] of REACT_PACKAGE_VERSIONS) {
    dependencies[name] =
      name === "@arolariu/components"
        ? {version, resolved: "file:packages/components"}
        : {version, resolved: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`};
  }
  return JSON.stringify({name: "@arolariu/monorepo", version: "0.0.0", dependencies});
}

function healthyPlaywrightInstallList(): string {
  return [
    "Playwright version: 1.60.0",
    "  Browsers:",
    "    C:\\ms-playwright\\chromium-1223",
    "  References:",
    "    C:\\other\\playwright-core",
    "",
    "Playwright version: 1.62.1",
    "  Browsers:",
    "    C:\\ms-playwright\\chromium-1234",
    "    C:\\ms-playwright\\ffmpeg-1011",
    "  References:",
    "    C:\\repo\\node_modules\\playwright-core",
  ].join("\n");
}

function messagesFixture(): Readonly<{en: object; ro: object; fr: object}> {
  const shape = {app: {title: "Title", nested: {label: "Label"}}};
  return {
    en: {app: {title: "Title", nested: {label: "Label"}}},
    ro: shape,
    fr: shape,
  };
}

function declaredMessagesSource(messages: object): string {
  return ["declare const messages: " + JSON.stringify(messages, undefined, 2).concat(";"), "export default messages;", ""].join("\n");
}

function taxonomyArtifactContents(
  path: string,
  overrides: Partial<{version: string; generatedAt: string; system: string; sourceUrl: string; attribution: string}> = {},
): string {
  const fileName = basename(path);
  return `${JSON.stringify({
    system: overrides.system ?? "GENERIC",
    version: overrides.version ?? "1.0.0",
    sourceUrl: overrides.sourceUrl ?? `https://example.test/${fileName}`,
    generatedAt: overrides.generatedAt ?? "2026-08-29T00:00:00.000Z",
    attribution: overrides.attribution ?? "Example",
    nodes: [],
  })}\n`;
}

interface ReactFixture {
  readonly root: string;
  readonly context: DoctorContext;
  readonly run: Mock<DiagnosticCommandRunner["run"]>;
  readonly responses: Map<string, CommandResult>;
  readonly setResponse: (command: CommandSpec, result: CommandResult, cwd?: string) => void;
  readonly websiteRoot: string;
  readonly docsRoot: string;
}

async function createReactFixture(
  input: Readonly<{
    options?: Partial<DoctorOptions>;
    requirementsValid?: boolean;
    skipNodeModules?: boolean;
    skipWebsitePackageJson?: boolean;
    skipProjectJsonDependsOn?: boolean;
    envContents?: string;
    skipEnv?: boolean;
    messagesOverride?: Readonly<Partial<{en: object; ro: object; fr: object}>>;
    skipDeclaration?: boolean;
    declarationOverride?: string;
    skipLicenses?: boolean;
    licensesOverride?: unknown;
    skipTaxonomy?: readonly string[];
    taxonomyOverrides?: Readonly<
      Record<string, Partial<{version: string; generatedAt: string; system: string; sourceUrl: string; attribution: string}>>
    >;
    nextConfigOverride?: string;
    docusaurusConfigOverride?: string;
    npmLsOverride?: CommandResult;
    playwrightListOverride?: CommandResult;
  }> = {},
): Promise<ReactFixture> {
  const root = await mkdtemp(join(tmpdir(), "arolariu-doctor-react-"));
  fixtureRoots.push(root);
  const paths = createRepositoryPaths(root);
  const websiteRoot = paths.websiteRoot;
  const docsRoot = paths.docsRoot;

  if (input.skipNodeModules !== true) {
    await mkdir(resolve(root, "node_modules"), {recursive: true});
  }

  if (input.skipWebsitePackageJson !== true) {
    await writeFixtureFile(
      resolve(websiteRoot, "package.json"),
      JSON.stringify({name: "@arolariu/website", dependencies: {"@arolariu/components": "*"}}),
    );
  }

  await writeFixtureFile(
    resolve(websiteRoot, "project.json"),
    JSON.stringify({
      name: "@arolariu/website",
      targets: {
        build: {dependsOn: input.skipProjectJsonDependsOn === true ? [] : ["components:build"]},
        dev: {dependsOn: input.skipProjectJsonDependsOn === true ? [] : ["components:build"]},
      },
    }),
  );

  if (input.skipEnv !== true) {
    await writeFixtureFile(
      paths.websiteEnvironment,
      input.envContents
        ?? [
          "SITE_ENV=DEVELOPMENT",
          "SITE_NAME=dev.arolariu.ro",
          "SITE_URL=https://localhost:3000",
          "USE_CDN=false",
          "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_abc123",
          "CLERK_SECRET_KEY=sk_test_def456",
          "",
        ].join("\n"),
    );
  }

  const messages = {...messagesFixture(), ...input.messagesOverride};
  await Promise.all([
    writeFixtureFile(resolve(websiteRoot, "messages", "en.json"), `${JSON.stringify(messages.en)}\n`),
    writeFixtureFile(resolve(websiteRoot, "messages", "ro.json"), `${JSON.stringify(messages.ro)}\n`),
    writeFixtureFile(resolve(websiteRoot, "messages", "fr.json"), `${JSON.stringify(messages.fr)}\n`),
  ]);

  if (input.skipDeclaration !== true) {
    await writeFixtureFile(
      resolve(websiteRoot, "messages", "en.d.json.ts"),
      input.declarationOverride ?? declaredMessagesSource(messages.en),
    );
  }

  if (input.skipLicenses !== true) {
    await writeFixtureFile(
      resolve(websiteRoot, "licenses.json"),
      `${JSON.stringify(
        input.licensesOverride ?? {
          production: [{name: "example-package", license: "MIT", version: "1.0.0"}],
          development: [],
          peer: [],
        },
      )}\n`,
    );
  }

  const taxonomyPaths = getExpectedTaxonomyArtifactPaths(root).filter((path) => path.startsWith(websiteRoot));
  for (const artifactPath of taxonomyPaths) {
    if (input.skipTaxonomy?.includes(basename(artifactPath)) === true) {
      continue;
    }
    await writeFixtureFile(artifactPath, taxonomyArtifactContents(artifactPath, input.taxonomyOverrides?.[basename(artifactPath)]));
  }

  await writeFixtureFile(
    resolve(websiteRoot, "next.config.ts"),
    input.nextConfigOverride
      ?? [
        'import createNextIntlPlugin from "next-intl/plugin";',
        "const withTranslation = createNextIntlPlugin({",
        "  experimental: {",
        '    createMessagesDeclaration: "./messages/en.json",',
        "  },",
        "});",
        "export default withTranslation({});",
        "",
      ].join("\n"),
  );

  await writeFixtureFile(
    resolve(docsRoot, "docusaurus.config.ts"),
    input.docusaurusConfigOverride
      ?? [
        "import type * as Preset from '@docusaurus/preset-classic';",
        "const config = {presets: [['classic', {}]]};",
        "export default config;",
        "",
      ].join("\n"),
  );

  const responses = new Map<string, CommandResult>();
  const setResponse = (command: CommandSpec, result: CommandResult, cwd = root): void => {
    responses.set(commandKey(command, cwd), result);
  };

  setResponse({command: "npm", args: ["ls", "--json"]}, input.npmLsOverride ?? commandResult({stdout: healthyNpmLsJson()}));
  setResponse(
    {command: "npx", args: ["--no-install", "playwright", "install", "--list"]},
    input.playwrightListOverride ?? commandResult({stdout: healthyPlaywrightInstallList()}),
  );

  const run = vi.fn<DiagnosticCommandRunner["run"]>(
    async (command: Readonly<CommandSpec>, options): Promise<CommandResult> =>
      responses.get(commandKey(command, options?.cwd)) ?? commandResult({code: 127, spawnError: `Unexpected command ${command.command}`}),
  );
  const runner: DiagnosticCommandRunner = {run};
  const networkGet = vi.fn(async (): Promise<DiagnosticNetworkResult> => ({status: "reachable", statusCode: 200, durationMs: 1}));
  const sink = new InMemoryLoggerSink();
  let now = 0;
  const context: DoctorContext = {
    options: doctorOptions(input.options),
    paths,
    requirements:
      input.requirementsValid === false
        ? {status: "invalid", errors: ["synthetic invalid requirements"]}
        : {status: "valid", requirements: validRequirements()},
    runner,
    network: {get: networkGet},
    logger: new MonorepositoryConsoleLogger("doctor::react", {color: false, sink}),
    platform: "win32",
    arch: "x64",
    env: {PATH: resolve(root, "bin")},
    now: () => ++now,
    inspection: {
      inspect: async () => ({kind: "unavailable" as const, reason: "test", durationMs: 0}),
      invalidate: () => {},
      updateInfrastructureEngine: () => {},
    } as RepositoryInspectionSession,
  };

  return {root, context, run, responses, setResponse, websiteRoot, docsRoot};
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map((dir) => rm(dir, {recursive: true, force: true})));
});

describe("inspectWebsiteEnvironment", () => {
  it("reports every recognized key present for a healthy file", () => {
    const result = inspectWebsiteEnvironment(
      [
        "# comment",
        "SITE_ENV=DEVELOPMENT",
        'SITE_NAME="dev.arolariu.ro"',
        "SITE_URL='https://localhost:3000'",
        "USE_CDN=false",
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_abc",
        "CLERK_SECRET_KEY=sk_test_def",
      ].join("\n"),
    );

    expect(result.syntaxErrors).toEqual([]);
    expect(result.missingCoreKeys).toEqual([]);
    expect(result.missingAuthenticationKeys).toEqual([]);
    expect(result.presentKeys).toEqual(
      ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "SITE_ENV", "SITE_NAME", "SITE_URL", "USE_CDN"].toSorted(),
    );
  });

  it("ignores blank lines and full-line comments", () => {
    const result = inspectWebsiteEnvironment(["", "  ", "# a comment", "SITE_ENV=DEVELOPMENT"].join("\n"));

    expect(result.syntaxErrors).toEqual([]);
    expect(result.presentKeys).toEqual(["SITE_ENV"]);
  });

  it("reports a syntax error for a line without an assignment", () => {
    const result = inspectWebsiteEnvironment(["SITE_ENV=DEVELOPMENT", "this is not valid"].join("\n"));

    expect(result.syntaxErrors.length).toBeGreaterThan(0);
    expect(result.presentKeys).toEqual(["SITE_ENV"]);
  });

  it("reports a syntax error for a duplicate key", () => {
    const result = inspectWebsiteEnvironment(["SITE_ENV=DEVELOPMENT", "SITE_ENV=PRODUCTION"].join("\n"));

    expect(result.syntaxErrors.length).toBeGreaterThan(0);
  });

  it("reports missing core keys when a core key is absent", () => {
    const result = inspectWebsiteEnvironment(["SITE_NAME=dev.arolariu.ro", "SITE_URL=https://localhost:3000", "USE_CDN=false"].join("\n"));

    expect(result.missingCoreKeys).toEqual(["SITE_ENV"]);
  });

  it("reports both Clerk keys missing when neither is present", () => {
    const result = inspectWebsiteEnvironment(
      ["SITE_ENV=DEVELOPMENT", "SITE_NAME=dev.arolariu.ro", "SITE_URL=https://localhost:3000", "USE_CDN=false"].join("\n"),
    );

    expect(result.missingAuthenticationKeys).toEqual(["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"].toSorted());
  });

  it("reports only one Clerk key missing when the pair is inconsistent", () => {
    const result = inspectWebsiteEnvironment(
      [
        "SITE_ENV=DEVELOPMENT",
        "SITE_NAME=dev.arolariu.ro",
        "SITE_URL=https://localhost:3000",
        "USE_CDN=false",
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_abc",
      ].join("\n"),
    );

    expect(result.missingAuthenticationKeys).toEqual(["CLERK_SECRET_KEY"]);
  });

  it("treats an empty value as absent", () => {
    const result = inspectWebsiteEnvironment(
      ["SITE_ENV=DEVELOPMENT", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=", "CLERK_SECRET_KEY="].join("\n"),
    );

    expect(result.missingAuthenticationKeys).toEqual(["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"].toSorted());
  });

  it("never retains configured values in the returned diagnostic", () => {
    const result = inspectWebsiteEnvironment("CLERK_SECRET_KEY=sk_live_super_secret_value\n");

    expect(JSON.stringify(result)).not.toContain("sk_live_super_secret_value");
  });
});

describe("reactDoctorModule", () => {
  it("returns every stable react check in order for a healthy local baseline", async () => {
    const fixture = await createReactFixture();

    const results = await reactDoctorModule.run(fixture.context);

    expect(results.map(({id}) => id)).toEqual([
      "react.packages",
      "react.workspace-link",
      "react.environment",
      "react.i18n",
      "react.taxonomy-and-licenses",
      "react.playwright",
      "react.framework-config",
    ]);
    expect(results.every(({module}) => module === "react")).toBe(true);
    expect(results.every(({status}) => status === "pass")).toBe(true);
  });

  it("skips react.packages and react.playwright when requirement sources are invalid", async () => {
    const fixture = await createReactFixture({requirementsValid: false});

    const results = await reactDoctorModule.run(fixture.context);

    expect(results.find(({id}) => id === "react.packages")?.status).toBe("skipped");
    expect(results.find(({id}) => id === "react.playwright")?.status).toBe("skipped");
  });

  describe("react.packages", () => {
    it("fails with a single root cause when the root dependency tree is absent", async () => {
      const fixture = await createReactFixture({skipNodeModules: true});

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.packages");

      expect(result?.status).toBe("fail");
      expect(result?.rootCause).toBeDefined();
      expect(result?.potentialCauses).toEqual([]);
    });

    it("fails when a required package is missing from the installed tree", async () => {
      const dependencies: Record<string, Record<string, string>> = {};
      for (const [name, version] of REACT_PACKAGE_VERSIONS) {
        if (name === "next") {
          continue;
        }
        dependencies[name] = {version, resolved: name === "@arolariu/components" ? "file:packages/components" : "registry"};
      }
      const fixture = await createReactFixture({
        npmLsOverride: commandResult({stdout: JSON.stringify({dependencies})}),
      });

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.packages");

      expect(result?.status).toBe("fail");
      expect(result?.evidence.join("\n")).toMatch(/next/iu);
    });

    it("fails when @arolariu/components does not resolve to the local workspace package", async () => {
      const dependencies: Record<string, Record<string, string>> = {};
      for (const [name, version] of REACT_PACKAGE_VERSIONS) {
        dependencies[name] = {
          version,
          resolved: name === "@arolariu/components" ? "https://registry.npmjs.org/@arolariu/components/-/components-2.2.0.tgz" : "registry",
        };
      }
      const fixture = await createReactFixture({npmLsOverride: commandResult({stdout: JSON.stringify({dependencies})})});

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.packages");

      expect(result?.status).toBe("fail");
      expect(result?.rootCause ?? result?.potentialCauses.map((cause) => cause.cause).join("\n")).toMatch(/workspace/iu);
    });

    it("fails when an installed version drifts from the locked requirement", async () => {
      const dependencies: Record<string, Record<string, string>> = {};
      for (const [name, version] of REACT_PACKAGE_VERSIONS) {
        dependencies[name] = {
          version: name === "react" ? "18.0.0" : version,
          resolved: name === "@arolariu/components" ? "file:packages/components" : "registry",
        };
      }
      const fixture = await createReactFixture({npmLsOverride: commandResult({stdout: JSON.stringify({dependencies})})});

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.packages");

      expect(result?.status).toBe("fail");
      expect(result?.evidence.join("\n")).toMatch(/18\.0\.0/u);
    });

    it("reports package drift without retaining the complete npm dependency tree", async () => {
      const dependencies: Record<string, unknown> = {};
      for (const [name, version] of REACT_PACKAGE_VERSIONS) {
        dependencies[name] = {
          version: name === "@arolariu/components" ? "2.3.0" : version,
          resolved: name === "@arolariu/components" ? "file:packages/components" : "registry",
        };
      }
      dependencies["unrelated-noise-package"] = {
        version: "9.9.9",
        dependencies: Object.fromEntries(
          Array.from({length: 100}, (_, index) => [`transitive-noise-${String(index)}`, {version: "1.0.0"}]),
        ),
      };
      const fixture = await createReactFixture({
        npmLsOverride: commandResult({
          stdout: JSON.stringify({name: "@arolariu/monorepo", dependencies}, undefined, 2),
          stderr: "npm warn unrelated configuration noise",
        }),
      });

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.packages");

      expect(result?.status).toBe("fail");
      expect(result?.evidence).toEqual(["@arolariu/components installed version '2.3.0' does not match the locked version '2.2.0'."]);
      expect(JSON.stringify(result)).not.toContain("unrelated-noise-package");
    });

    it("reports a structured npm document error instead of claiming every package is missing", async () => {
      const fixture = await createReactFixture({
        npmLsOverride: commandResult({
          code: 1,
          stdout: JSON.stringify({
            name: "@arolariu/monorepo",
            problems: ["Invalid package.json metadata prevented dependency inspection."],
            error: {
              code: "EJSONPARSE",
              summary: "Invalid package.json: JSON parsing failed.",
              detail: "Correct the malformed package.json document.",
            },
          }),
        }),
      });

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.packages");
      const diagnosis = [result?.rootCause, ...(result?.potentialCauses.map(({cause}) => cause) ?? [])]
        .filter((entry): entry is string => entry !== undefined)
        .join("\n");

      expect(result?.status).toBe("fail");
      expect(result?.summary).toBe("npm could not produce React ecosystem package metadata.");
      expect(result?.evidence).toContain("npm code: EJSONPARSE");
      expect(result?.evidence).toContain("npm summary: Invalid package.json: JSON parsing failed.");
      expect(diagnosis).toMatch(/EJSONPARSE|Invalid package\.json/iu);
      expect(result?.evidence.join("\n")).not.toMatch(/is required at .* but is not installed/iu);
    });
  });

  describe("react.workspace-link", () => {
    it("fails when the website package.json does not declare @arolariu/components", async () => {
      const fixture = await createReactFixture({skipWebsitePackageJson: true});
      await writeFixtureFile(resolve(fixture.websiteRoot, "package.json"), JSON.stringify({name: "@arolariu/website", dependencies: {}}));

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.workspace-link");

      expect(result?.status).toBe("fail");
    });

    it("fails when the build and dev targets omit the components:build dependsOn linkage", async () => {
      const fixture = await createReactFixture({skipProjectJsonDependsOn: true});

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.workspace-link");

      expect(result?.status).toBe("fail");
      expect(result?.evidence.join("\n")).toMatch(/build/iu);
      expect(result?.evidence.join("\n")).toMatch(/dev/iu);
    });
  });

  describe("react.environment", () => {
    it("fails when the .env file is absent", async () => {
      const fixture = await createReactFixture({skipEnv: true});

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.environment");

      expect(result?.status).toBe("fail");
    });

    it("warns with a root cause when both Clerk keys are absent", async () => {
      const fixture = await createReactFixture({
        envContents: ["SITE_ENV=DEVELOPMENT", "SITE_NAME=dev.arolariu.ro", "SITE_URL=https://localhost:3000", "USE_CDN=false"].join("\n"),
      });

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.environment");

      expect(result?.status).toBe("warn");
      expect(result?.summary).toBe("Both Clerk credentials are absent; ordinary non-CI Next.js development may use Clerk keyless mode.");
      expect(result?.rootCause).toBe("Both Clerk credentials are absent; ordinary non-CI Next.js development may use Clerk keyless mode.");
    });

    it("fails when only one Clerk key is present", async () => {
      const fixture = await createReactFixture({
        envContents: [
          "SITE_ENV=DEVELOPMENT",
          "SITE_NAME=dev.arolariu.ro",
          "SITE_URL=https://localhost:3000",
          "USE_CDN=false",
          "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_abc",
        ].join("\n"),
      });

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.environment");

      expect(result?.status).toBe("fail");
    });

    it("fails when a core site key is absent", async () => {
      const fixture = await createReactFixture({
        envContents: ["SITE_NAME=dev.arolariu.ro", "SITE_URL=https://localhost:3000", "USE_CDN=false"].join("\n"),
      });

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.environment");

      expect(result?.status).toBe("fail");
    });

    it("never leaks configured secret values into evidence", async () => {
      const fixture = await createReactFixture({
        envContents: [
          "SITE_ENV=DEVELOPMENT",
          "SITE_NAME=dev.arolariu.ro",
          "SITE_URL=https://localhost:3000",
          "USE_CDN=false",
          "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_abc",
          "CLERK_SECRET_KEY=sk_test_super_secret_value",
        ].join("\n"),
      });

      const results = await reactDoctorModule.run(fixture.context);

      expect(JSON.stringify(results)).not.toContain("sk_test_super_secret_value");
    });
  });

  describe("react.i18n", () => {
    it("fails when a locale dictionary is not valid JSON", async () => {
      const fixture = await createReactFixture();
      await writeFixtureFile(resolve(fixture.websiteRoot, "messages", "ro.json"), "not json");

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.i18n");

      expect(result?.status).toBe("fail");
    });

    it("fails when locale key shape diverges", async () => {
      const fixture = await createReactFixture({
        messagesOverride: {fr: {app: {title: "Titre"}}},
      });

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.i18n");

      expect(result?.status).toBe("fail");
    });

    it("warns when the generated declaration is missing", async () => {
      const fixture = await createReactFixture({skipDeclaration: true});

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.i18n");

      expect(result?.status).toBe("warn");
    });

    it("warns when the generated declaration key shape is stale", async () => {
      const fixture = await createReactFixture({
        declarationOverride: declaredMessagesSource({app: {title: "Title"}}),
      });

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.i18n");

      expect(result?.status).toBe("warn");
    });
  });

  describe("react.taxonomy-and-licenses", () => {
    it("fails when a website taxonomy artifact is missing", async () => {
      const fixture = await createReactFixture({skipTaxonomy: [taxonomyArtifactFileNames.gpc]});

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.taxonomy-and-licenses");

      expect(result?.status).toBe("fail");
    });

    it("fails when a website taxonomy artifact has invalid metadata", async () => {
      const fixture = await createReactFixture({
        taxonomyOverrides: {[taxonomyArtifactFileNames.nace]: {generatedAt: "not-a-date"}},
      });

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.taxonomy-and-licenses");

      expect(result?.status).toBe("fail");
    });

    it("fails when licenses.json is missing", async () => {
      const fixture = await createReactFixture({skipLicenses: true});

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.taxonomy-and-licenses");

      expect(result?.status).toBe("fail");
    });

    it("fails when licenses.json has malformed entries", async () => {
      const fixture = await createReactFixture({
        licensesOverride: {production: [{name: "broken"}], development: [], peer: []},
      });

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.taxonomy-and-licenses");

      expect(result?.status).toBe("fail");
    });
  });

  describe("react.playwright", () => {
    it("fails when no installed browser inventory matches the locked version", async () => {
      const fixture = await createReactFixture({
        playwrightListOverride: commandResult({
          stdout: [
            "Playwright version: 1.50.0",
            "  Browsers:",
            "    C:\\ms-playwright\\chromium-1000",
            "  References:",
            "    C:\\other\\playwright-core",
          ].join("\n"),
        }),
      });

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.playwright");

      expect(result?.status).toBe("fail");
    });

    it("fails when the matching version's inventory does not include chromium", async () => {
      const fixture = await createReactFixture({
        playwrightListOverride: commandResult({
          stdout: [
            "Playwright version: 1.62.1",
            "  Browsers:",
            "    C:\\ms-playwright\\firefox-1509",
            "  References:",
            "    C:\\repo\\node_modules\\playwright-core",
          ].join("\n"),
        }),
      });

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.playwright");

      expect(result?.status).toBe("fail");
    });

    it("does not install or launch a browser", async () => {
      const fixture = await createReactFixture();

      await reactDoctorModule.run(fixture.context);

      expect(
        fixture.run.mock.calls.some(
          ([command]) => command.args.includes("install") && command.args.some((argument) => argument === "chromium"),
        ),
      ).toBe(false);
    });
  });

  describe("react.framework-config", () => {
    it("fails when next.config.ts does not wire the next-intl messages declaration", async () => {
      const fixture = await createReactFixture({nextConfigOverride: "export default {};\n"});

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.framework-config");

      expect(result?.status).toBe("fail");
    });

    it("fails when docusaurus.config.ts does not reference the classic preset", async () => {
      const fixture = await createReactFixture({docusaurusConfigOverride: "const config = {};\nexport default config;\n"});

      const results = await reactDoctorModule.run(fixture.context);
      const result = results.find(({id}) => id === "react.framework-config");

      expect(result?.status).toBe("fail");
    });
  });

  it("never runs an install, build, or generation command", async () => {
    const fixture = await createReactFixture();

    await reactDoctorModule.run(fixture.context);

    const forbiddenSubstrings = ["install", "ci", "build", "generate", "restore"];
    for (const [command, ...rest] of fixture.run.mock.calls.map(([spec]) => [spec.command, ...spec.args])) {
      if (command === "npx" && rest.includes("playwright") && rest.includes("--list")) {
        continue;
      }
      expect(forbiddenSubstrings.some((token) => rest.some((argument) => argument === token))).toBe(false);
    }
  });
});
