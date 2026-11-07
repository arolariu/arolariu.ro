import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {isAbsolute, join, relative, resolve, sep} from "node:path";

import {Effect} from "effect";
import ts from "typescript";
import {afterEach, describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "./cli.ts";
import {makeGenerateCommand} from "./commands/generate/cli.ts";
import {Environment} from "./platform/Environment.ts";
import {exitCodeFor} from "./platform/exit.ts";
import {
  createPreparationFixture,
  devcontainerMountTargets,
  readDevcontainer,
  type PreparationFixture,
} from "./platform/devcontainer-testing.ts";
import {makeNodeLayer} from "./platform/layers.ts";

const fixtures: PreparationFixture[] = [];
const layer = makeNodeLayer({mode: "silent", verbose: false, color: false, context: "devcontainer-test"});

function fixture(): PreparationFixture {
  expect(existsSync(resolve(".devcontainer/website/postCreate.sh"))).toBe(true);
  const value = createPreparationFixture("website");
  fixtures.push(value);
  return value;
}

function run(value: PreparationFixture, environment?: Readonly<Record<string, string>>) {
  return Effect.runPromise(value.run(environment).pipe(Effect.provide(layer)));
}

async function licenseGenerator() {
  expect(existsSync(resolve("scripts/commands/generate/prepare-website-licenses.ts"))).toBe(true);
  return import("./commands/generate/prepare-website-licenses.ts");
}

afterEach(() => {
  for (const value of fixtures.splice(0)) value.dispose();
});

describe("Website devcontainer", () => {
  it("keeps repository tooling out of the production website compilation", {timeout: 30_000}, () => {
    const config = ts.getParsedCommandLineOfConfigFile(
      resolve("sites/arolariu.ro/tsconfig.json"),
      {},
      {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
          throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        },
      },
    );
    if (config === undefined) throw new Error("The website compiler configuration could not be loaded.");
    const program = ts.createProgram(config.fileNames, config.options);
    const toolingRoot = resolve("scripts");
    const toolingInputs = program.getSourceFiles().filter(({fileName}) => {
      const path = relative(toolingRoot, fileName);
      return path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
    });

    expect(toolingInputs.map(({fileName}) => relative(resolve("."), fileName))).toEqual([]);
  });

  it.each([
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-themes",
    "@storybook/nextjs-vite",
    "@storybook/react",
    "@testing-library/user-event",
    "storybook",
  ])("installs directly consumed tooling %s without another workspace", (name) => {
    const root: unknown = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
    const manifest: unknown = JSON.parse(readFileSync(resolve("sites/arolariu.ro/package.json"), "utf8"));
    const lock: unknown = JSON.parse(readFileSync(resolve("package-lock.json"), "utf8"));

    expect(root).toMatchObject({devDependencies: {[name]: expect.stringMatching(/^\d+\.\d+\.\d+/)}});
    expect(manifest).toMatchObject({devDependencies: {[name]: "*"}});
    expect(lock).toMatchObject({packages: {"sites/arolariu.ro": {devDependencies: {[name]: "*"}}}});
  });

  it("selects website-only Node tooling without warm preparation", () => {
    const definition = readDevcontainer("website");
    expect(definition).toBeDefined();
    expect(definition).toMatchObject({
      name: "arolariu.ro - Website",
      containerUser: "vscode",
      remoteUser: "vscode",
      workspaceFolder: "/workspaces/arolariu.ro/sites/arolariu.ro",
      features: {"ghcr.io/devcontainers/features/node:1": {version: "24", pnpmVersion: "none"}},
      forwardPorts: [3000],
    });
    expect(definition).not.toHaveProperty("postStartCommand");
    expect(definition).not.toHaveProperty("updateContentCommand");
    expect(definition).not.toHaveProperty("privileged", true);
  });

  it("masks all dependency directories touched by npm cleanup", () => {
    const definition = readDevcontainer("website");
    expect(definition).toBeDefined();
    expect(devcontainerMountTargets(definition)).toEqual([
      "/home/vscode/.cache",
      "/home/vscode/.cache/npm",
      "/workspaces/arolariu.ro/node_modules",
      "/workspaces/arolariu.ro/sites/arolariu.ro/node_modules",
      "/workspaces/arolariu.ro/sites/cv.arolariu.ro/node_modules",
      "/workspaces/arolariu.ro/sites/docs.arolariu.ro/node_modules",
      "/workspaces/arolariu.ro/sites/status.arolariu.ro/node_modules",
      "/workspaces/arolariu.ro/packages/components/node_modules",
    ]);
  });

  it("installs the website before its own attribution and type generation", async () => {
    const value = fixture();
    expect(await run(value)).toMatchObject({status: 0});
    const events = value
      .events()
      .filter(
        (event) => event.startsWith("npm\t") || (event.startsWith("node\t") && event.endsWith("\tgenerate\t--website-licenses-only")),
      );
    expect(events).toHaveLength(3);
    expect(events[0]).toBe(
      "npm\tci\t--workspace\t@arolariu/website\t--include-workspace-root=false\t--foreground-scripts\t--no-audit\t--no-fund",
    );
    expect(events[1]).toMatch(/^node\t.*\/scripts\/cli\.ts\tgenerate\t--website-licenses-only$/);
    expect(events[2]).toBe("npm\texec\t--yes=false\t--workspace\t@arolariu/website\t--\tnext\ttypegen");
  });

  it("does not generate artifacts after an installation failure", async () => {
    const value = fixture();
    const result = await run(value, {FAIL_COMMAND: "npm"});
    expect(result.status).toBe(17);
    expect(result.stderr).toContain("controlled npm failure");
    expect(value.events().some((event) => event.endsWith("\tgenerate\t--website-licenses-only"))).toBe(false);
    expect(result.stdout).not.toMatch(/ready|complete/i);
  });

  it("rejects a root lifecycle hook before installing another scope", async () => {
    const value = fixture();
    writeFileSync(join(value.root, "package.json"), JSON.stringify({scripts: {prepare: "echo unrelated"}}));
    const result = await run(value);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/root.*prepare/i);
    expect(value.events().some((event) => event.startsWith("npm"))).toBe(false);
  });

  it("generates actual website attribution through the central CLI without changing API files", async () => {
    const value = fixture();
    const apiSentinel = join(value.root, "sites", "api.arolariu.ro", "sentinel.txt");
    writeFileSync(apiSentinel, "unchanged");
    writeFileSync(join(value.root, "sites", "arolariu.ro", "package.json"), JSON.stringify({dependencies: {demo: "1.0.0"}}));
    const installed = join(value.root, "node_modules", "demo");
    mkdirSync(installed, {recursive: true});
    writeFileSync(
      join(installed, "package.json"),
      JSON.stringify({
        name: "demo",
        version: "1.0.0",
        author: "Fixture",
        license: "MIT",
        homepage: "https://example.test",
      }),
    );

    const outcome = await Effect.runPromiseExit(
      runCli(["generate", "--website-licenses-only"], makeRootCommand([makeGenerateCommand()])).pipe(
        Effect.provideService(Environment, {
          variables: {},
          cwd: value.root,
          executablePath: process.execPath,
          platform: process.platform,
          architecture: process.arch,
          stdinIsTTY: false,
          stdoutIsTTY: false,
          isCI: false,
        }),
        Effect.provide(layer),
      ),
    );
    const output = join(value.root, "sites", "arolariu.ro", "licenses.json");
    expect(exitCodeFor(outcome, undefined)).toBe(0);
    const document: unknown = JSON.parse(readFileSync(output, "utf8"));
    expect(document).toMatchObject({production: [{name: "demo", version: "1.0.0", license: "MIT"}]});
    expect(readFileSync(apiSentinel, "utf8")).toBe("unchanged");
  });

  it("fails explicitly when attribution dependencies are missing", async () => {
    const {prepareWebsiteLicenses} = await licenseGenerator();
    const value = fixture();
    writeFileSync(join(value.root, "sites", "arolariu.ro", "package.json"), JSON.stringify({dependencies: {missing: "1.0.0"}}));
    await expect(Effect.runPromise(prepareWebsiteLicenses(value.root).pipe(Effect.provide(layer)))).rejects.toThrow(
      /Unable to resolve declared frontend package manifest/,
    );
    expect(existsSync(join(value.root, "sites", "arolariu.ro", "licenses.json"))).toBe(false);
  });
});
