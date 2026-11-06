import {existsSync, readFileSync, writeFileSync} from "node:fs";
import {join, resolve} from "node:path";

import {Effect} from "effect";
import {afterEach, describe, expect, it} from "vitest";

import postcss from "../packages/components/postcss.config.ts";
import {
  createPreparationFixture,
  devcontainerMountTargets,
  readDevcontainer,
  runFixtureNpm,
  type PreparationFixture,
} from "./platform/devcontainer-testing.ts";
import {makeNodeLayer} from "./platform/layers.ts";

const fixtures: PreparationFixture[] = [];
const layer = makeNodeLayer({mode: "silent", verbose: false, color: false, context: "devcontainer-test"});

function fixture(): PreparationFixture {
  expect(existsSync(resolve(".devcontainer/components/postCreate.sh"))).toBe(true);
  const value = createPreparationFixture("components");
  fixtures.push(value);
  return value;
}

function run(value: PreparationFixture, environment?: Readonly<Record<string, string>>) {
  return Effect.runPromise(value.run(environment).pipe(Effect.provide(layer)));
}

afterEach(() => {
  for (const value of fixtures.splice(0)) value.dispose();
});

describe("Components devcontainer", () => {
  it("declares every PostCSS plugin in the filtered workspace install", () => {
    const manifest: unknown = JSON.parse(readFileSync(resolve("packages/components/package.json"), "utf8"));
    const lock: unknown = JSON.parse(readFileSync(resolve("package-lock.json"), "utf8"));

    for (const plugin of Object.keys(postcss.plugins)) {
      expect(manifest).toMatchObject({devDependencies: {[plugin]: "*"}});
      expect(lock).toMatchObject({packages: {"packages/components": {devDependencies: {[plugin]: "*"}}}});
    }
  });

  it("prepares a library-only Node workspace without engine access", () => {
    const definition = readDevcontainer("components");
    expect(definition).toBeDefined();
    expect(definition).toMatchObject({
      name: "arolariu.ro - Components",
      containerUser: "vscode",
      remoteUser: "vscode",
      workspaceFolder: "/workspaces/arolariu.ro/packages/components",
      features: {
        "ghcr.io/devcontainers/features/node:1": {
          version: "24",
          pnpmVersion: "none",
          nodeGypDependencies: false,
          installYarnUsingApt: false,
        },
      },
      forwardPorts: [6006],
    });
    expect(definition).not.toHaveProperty("postStartCommand");
    expect(definition).not.toHaveProperty("updateContentCommand");
    expect(definition).not.toHaveProperty("privileged", true);
  });

  it("protects every host dependency directory npm ci can clean", () => {
    const definition = readDevcontainer("components");
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

  it("installs only the library and does not start Storybook", async () => {
    const value = fixture();
    expect(await run(value)).toMatchObject({status: 0});
    expect(value.events().filter((event) => event.startsWith("npm"))).toEqual([
      "npm\tci\t--workspace\t@arolariu/components\t--include-workspace-root=false\t--foreground-scripts\t--no-audit\t--no-fund",
    ]);
  });

  it("rejects root lifecycle hooks before invoking npm", async () => {
    const value = fixture();
    writeFileSync(join(value.root, "package.json"), JSON.stringify({private: true, scripts: {postinstall: "echo unrelated"}}));
    const result = await run(value);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/root.*postinstall/i);
    expect(value.events().some((event) => event.startsWith("npm"))).toBe(false);
  });

  it("propagates installer failures without reporting readiness", async () => {
    const value = fixture();
    const result = await run(value, {FAIL_COMMAND: "npm"});
    expect(result.status).toBe(17);
    expect(result.stderr).toContain("controlled npm failure");
    expect(result.stdout).not.toMatch(/ready|complete/i);
  });

  it("does not install when a protective dependency mount is absent", async () => {
    const value = fixture();
    const result = await run(value, {FAIL_MOUNT: "1"});
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("mount");
    expect(value.events().some((event) => /^(npm|sudo)\t/.test(event))).toBe(false);
  });

  it("characterizes filtered npm ci without executing unselected workspace preparation", async () => {
    const value = fixture();
    for (const [directory, name] of [
      ["sites/cv.arolariu.ro", "@arolariu/cv"],
      ["sites/docs.arolariu.ro", "@arolariu/docs"],
      ["sites/status.arolariu.ro", "@arolariu/status"],
      ["sites/arolariu.ro", "@arolariu/website"],
      ["packages/components", "@arolariu/components"],
    ]) {
      if (directory === undefined || name === undefined) throw new Error("Invalid workspace fixture.");
      const path = join(value.root, directory);
      writeFileSync(
        join(path, "package.json"),
        JSON.stringify({
          name,
          version: "1.0.0",
          private: true,
          scripts: {prepare: "node prepare.cjs"},
        }),
      );
      writeFileSync(
        join(path, "prepare.cjs"),
        `require("node:fs").appendFileSync(process.env.TEST_HOOK_TRACE, ${JSON.stringify(`${name}\n`)});\n`,
      );
    }
    await Effect.runPromise(
      runFixtureNpm(value, ["install", "--package-lock-only", "--ignore-scripts", "--offline", "--no-audit", "--no-fund"]).pipe(
        Effect.provide(layer),
      ),
    );
    await Effect.runPromise(
      runFixtureNpm(value, [
        "ci",
        "--workspace",
        "@arolariu/components",
        "--include-workspace-root=false",
        "--foreground-scripts",
        "--offline",
        "--no-audit",
        "--no-fund",
      ]).pipe(Effect.provide(layer)),
    );
    expect(readFileSync(join(value.root, "workspace-hooks.log"), "utf8").trim().split(/\r?\n/)).toEqual(["@arolariu/components"]);
  });
});
