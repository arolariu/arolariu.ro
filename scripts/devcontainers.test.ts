import {existsSync, globSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from "node:fs";
import {dirname, join, posix, resolve} from "node:path";

import {Effect} from "effect";
import {afterEach, describe, expect, it} from "vitest";

import {
  createPreparationFixture,
  devcontainerMountTargets,
  readDevcontainer,
  type DevcontainerFlavor,
  type PreparationFixture,
} from "./platform/devcontainer-testing.ts";
import {makeNodeLayer} from "./platform/layers.ts";

const flavors: readonly DevcontainerFlavor[] = ["api", "components", "cv-docs-status", "exp", "website"];
const nodeFlavors = ["components", "cv-docs-status", "website"] as const;
const fixtures: PreparationFixture[] = [];
const layer = makeNodeLayer({mode: "silent", verbose: false, color: false, context: "devcontainer-test"});

function workspaceCleanupTargets(): readonly string[] {
  const manifest: unknown = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
  if (typeof manifest !== "object" || manifest === null || !("workspaces" in manifest) || !Array.isArray(manifest.workspaces)) {
    throw new Error("Expected explicit root workspace patterns.");
  }
  const patterns = manifest.workspaces.map((pattern: unknown) => {
    if (typeof pattern !== "string" || pattern.startsWith("!")) throw new Error("Unsupported root workspace pattern.");
    return `${pattern}/package.json`;
  });
  return [
    "/workspaces/arolariu.ro/node_modules",
    ...globSync(patterns).map((manifestPath) =>
      posix.join("/workspaces/arolariu.ro", dirname(manifestPath).replaceAll("\\", "/"), "node_modules"),
    ),
  ];
}

afterEach(() => {
  for (const fixture of fixtures.splice(0)) fixture.dispose();
});

describe("service-focused development containers", () => {
  it("offers exactly five independent definitions without a monolithic default", () => {
    const root = resolve(".devcontainer");
    const definitions = readdirSync(root, {withFileTypes: true})
      .filter((entry) => entry.isDirectory() && existsSync(join(root, entry.name, "devcontainer.json")))
      .map((entry) => entry.name)
      .sort();
    expect(definitions).toEqual(["api", "components", "cv-docs-status", "exp", "website"]);
    expect(existsSync(join(root, "devcontainer.json"))).toBe(false);
    expect(existsSync(join(root, "postCreate.sh"))).toBe(false);
  });

  it.each(flavors)("%s keeps host control out of the workspace", (flavor) => {
    const definition = readDevcontainer(flavor);
    expect(definition).toBeDefined();
    expect(definition).toMatchObject({
      image: "mcr.microsoft.com/devcontainers/base:ubuntu-24.04",
      containerUser: "vscode",
      remoteUser: "vscode",
      workspaceMount: "source=${localWorkspaceFolder},target=/workspaces/arolariu.ro,type=bind",
    });
    expect(definition).not.toHaveProperty("privileged", true);
    expect(definition).not.toHaveProperty("capAdd");
    expect(definition).not.toHaveProperty("securityOpt");
    expect(JSON.stringify(definition)).not.toMatch(/docker\.sock|podman\.sock|docker-in-docker|docker-outside-of-docker/);
  });

  it.each(flavors)("%s has no warm install or generation lifecycle", (flavor) => {
    const definition = readDevcontainer(flavor);
    expect(definition).not.toHaveProperty("postStartCommand");
    expect(definition).not.toHaveProperty("postAttachCommand");
    expect(definition).not.toHaveProperty("updateContentCommand");
    expect(definition).toHaveProperty("postCreateCommand", ["bash", `/workspaces/arolariu.ro/.devcontainer/${flavor}/postCreate.sh`]);
  });

  it.each(flavors)("%s waits for preparation before connecting the editor", (flavor) => {
    expect(readDevcontainer(flavor)).toHaveProperty("waitFor", "postCreateCommand");
  });

  it.each(flavors)("%s exposes LF-compatible shell bytes to Linux", (flavor) => {
    expect(readFileSync(resolve(".devcontainer", flavor, "postCreate.sh")).includes(13)).toBe(false);
  });

  it.each(flavors)("%s locks each declared feature to a content-addressed image", (flavor) => {
    const definition = readDevcontainer(flavor);
    if (
      typeof definition !== "object" ||
      definition === null ||
      !("features" in definition) ||
      typeof definition.features !== "object" ||
      definition.features === null
    ) {
      throw new Error("Expected explicit feature declarations.");
    }
    const lock: unknown = JSON.parse(readFileSync(resolve(".devcontainer", flavor, "devcontainer-lock.json"), "utf8"));
    for (const feature of Object.keys(definition.features)) {
      expect(lock).toMatchObject({
        features: {
          [feature]: {
            version: expect.stringMatching(/^\d+\.\d+\.\d+/),
            resolved: expect.stringMatching(/@sha256:[a-f0-9]{64}$/),
            integrity: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
          },
        },
      });
    }
  });

  it.each(nodeFlavors)("%s masks every live npm workspace cleanup destination", (flavor) => {
    expect(devcontainerMountTargets(readDevcontainer(flavor))).toEqual(expect.arrayContaining(workspaceCleanupTargets()));
  });

  it.each(nodeFlavors)("%s refuses a newly added workspace before npm can clean host dependencies", async (flavor) => {
    const fixture = createPreparationFixture(flavor);
    fixtures.push(fixture);
    const workspace = join(fixture.root, "sites", "future.arolariu.ro");
    const sentinel = join(workspace, "node_modules", "host-sentinel.txt");
    mkdirSync(dirname(sentinel), {recursive: true});
    writeFileSync(join(workspace, "package.json"), JSON.stringify({name: "@arolariu/future", version: "1.0.0", private: true}));
    writeFileSync(sentinel, "host dependencies");

    const result = await Effect.runPromise(fixture.run().pipe(Effect.provide(layer)));

    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/protective mount.*future\.arolariu\.ro/);
    expect(fixture.events().some((event) => event.startsWith("npm\t"))).toBe(false);
    expect(readFileSync(sentinel, "utf8")).toBe("host dependencies");
  });
});
