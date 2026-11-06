import {existsSync, writeFileSync} from "node:fs";
import {join, resolve} from "node:path";

import {Effect} from "effect";
import {afterEach, describe, expect, it} from "vitest";

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
  expect(existsSync(resolve(".devcontainer/cv-docs-status/postCreate.sh"))).toBe(true);
  const value = createPreparationFixture("cv-docs-status");
  fixtures.push(value);
  return value;
}

function run(value: PreparationFixture, environment?: Readonly<Record<string, string>>) {
  return Effect.runPromise(value.run(environment).pipe(Effect.provide(layer)));
}

afterEach(() => {
  for (const value of fixtures.splice(0)) value.dispose();
});

describe("CV docs status devcontainer", () => {
  it("uses only Node tooling with explicit docs-site-only scope", () => {
    const definition = readDevcontainer("cv-docs-status");
    expect(definition).toBeDefined();
    expect(definition).toMatchObject({
      name: "arolariu.ro - CV, Docs and Status",
      containerUser: "vscode",
      remoteUser: "vscode",
      workspaceFolder: "/workspaces/arolariu.ro/sites",
      features: {"ghcr.io/devcontainers/features/node:1": {version: "24", pnpmVersion: "none"}},
      containerEnv: {AROLARIU_DOCS_SITE_ONLY: "1"},
      forwardPorts: [5173, 4173, 3100, 5174, 4175],
    });
    expect(definition).not.toHaveProperty("postStartCommand");
    expect(definition).not.toHaveProperty("updateContentCommand");
  });

  it("isolates npm's full cleanup surface from host dependencies", () => {
    const definition = readDevcontainer("cv-docs-status");
    expect(definition).toBeDefined();
    expect(devcontainerMountTargets(definition)).toEqual([
      "/home/vscode/.cache/npm",
      "/workspaces/arolariu.ro/node_modules",
      "/workspaces/arolariu.ro/sites/arolariu.ro/node_modules",
      "/workspaces/arolariu.ro/sites/cv.arolariu.ro/node_modules",
      "/workspaces/arolariu.ro/sites/docs.arolariu.ro/node_modules",
      "/workspaces/arolariu.ro/sites/status.arolariu.ro/node_modules",
      "/workspaces/arolariu.ro/packages/components/node_modules",
    ]);
  });

  it("prepares exactly the three sites and their required local generated state", async () => {
    const value = fixture();
    expect(await run(value)).toMatchObject({status: 0});
    expect(value.events().filter((event) => event.startsWith("npm"))).toEqual([
      "npm\tci\t--workspace\t@arolariu/cv\t--workspace\t@arolariu/docs\t--workspace\t@arolariu/status\t--include-workspace-root=false\t--foreground-scripts\t--no-audit\t--no-fund",
      "npm\texec\t--yes=false\t--workspace\t@arolariu/cv\t--\tsvelte-kit\tsync",
      "npm\texec\t--yes=false\t--workspace\t@arolariu/status\t--\tsvelte-kit\tsync",
      "npm\trun\tprepare:site\t--workspace\t@arolariu/docs",
    ]);
    expect(value.events().some((event) => /^(python3|dotnet)\t/.test(event))).toBe(false);
  });

  it("does not mask Svelte synchronization failures", async () => {
    const value = fixture();
    const result = await run(value, {FAIL_COMMAND: "svelte"});
    expect(result.status).toBe(17);
    expect(result.stderr).toContain("controlled svelte failure");
    expect(value.events().filter((event) => event.startsWith("npm"))).toHaveLength(2);
  });

  it("stops preparation when npm fails", async () => {
    const value = fixture();
    const result = await run(value, {FAIL_COMMAND: "npm"});
    expect(result.status).toBe(17);
    expect(value.events().filter((event) => event.startsWith("npm"))).toHaveLength(1);
    expect(result.stdout).not.toMatch(/ready|complete/i);
  });

  it("rejects root lifecycle hooks rather than preparing another scope", async () => {
    const value = fixture();
    writeFileSync(join(value.root, "package.json"), JSON.stringify({scripts: {preinstall: "echo unrelated"}}));
    const result = await run(value);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/root.*preinstall/i);
    expect(value.events().some((event) => event.startsWith("npm"))).toBe(false);
  });
});
