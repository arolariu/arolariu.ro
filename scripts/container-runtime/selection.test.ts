/**
 * @fileoverview Tests for local container runtime selection.
 * @module scripts/container-runtime/selection.test
 */

import {mkdtemp, rm, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {resolve} from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import {resolveContainerEngine, resolveRuntimeContainerEngine} from "./selection.ts";

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((path) => rm(path, {force: true, recursive: true})));
});

async function malformedToolingConfigPath(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "arolariu-selection-"));
  temporaryRoots.push(root);
  const path = resolve(root, "tooling.local.json");
  await writeFile(path, "{ not valid json", "utf8");
  return path;
}

describe("resolveContainerEngine", () => {
  it("uses the --engine argument when present", () => {
    const result = resolveContainerEngine({
      argv: ["node", "script.ts", "--engine", "podman"],
      env: {},
    });

    expect(result).toEqual({engine: "podman", source: "argument"});
  });

  it("uses AROLARIU_CONTAINER_ENGINE when no argument is present", () => {
    const result = resolveContainerEngine({
      argv: ["node", "script.ts"],
      env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
    });

    expect(result).toEqual({engine: "rancher", source: "environment"});
  });

  it("uses the persisted engine after arguments and environment", () => {
    expect(
      resolveContainerEngine({
        argv: ["node", "script.ts"],
        env: {},
        configuredEngine: "podman",
      }),
    ).toEqual({engine: "podman", source: "configuration"});
  });

  it("prefers arguments and environment over the persisted engine", () => {
    expect(
      resolveContainerEngine({
        argv: ["node", "script.ts", "--engine", "rancher"],
        env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
        configuredEngine: "podman",
      }),
    ).toEqual({engine: "rancher", source: "argument"});
    expect(
      resolveContainerEngine({
        argv: ["node", "script.ts"],
        env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
        configuredEngine: "podman",
      }),
    ).toEqual({engine: "rancher", source: "environment"});
  });

  it.each(["docker", "docker-desktop", "colima"])("rejects configured engine %s", (configuredEngine) => {
    expect(() =>
      resolveContainerEngine({
        argv: ["node", "script.ts"],
        env: {},
        configuredEngine,
      }),
    ).toThrow(configuredEngine === "colima" ? "Unsupported container engine" : "Docker Desktop is deprecated");
  });

  it("rejects docker as an engine", () => {
    expect(() =>
      resolveContainerEngine({
        argv: ["node", "script.ts", "--engine", "docker"],
        env: {},
      }),
    ).toThrow("Docker Desktop is deprecated for this repository");
  });

  it("rejects missing engine selection with a clear message", () => {
    expect(() =>
      resolveContainerEngine({
        argv: ["node", "script.ts"],
        env: {},
      }),
    ).toThrow("Select a container engine with --engine rancher|podman");
  });

  it("rejects unknown engines", () => {
    expect(() =>
      resolveContainerEngine({
        argv: ["node", "script.ts", "--engine", "colima"],
        env: {},
      }),
    ).toThrow("Unsupported container engine 'colima'");
  });
});

describe("resolveRuntimeContainerEngine", () => {
  it("uses an explicit argument without consulting malformed persisted configuration", async () => {
    const toolingConfigPath = await malformedToolingConfigPath();

    await expect(
      resolveRuntimeContainerEngine({
        argv: ["node", "script.ts", "--engine", "podman"],
        env: {},
        toolingConfigPath,
      }),
    ).resolves.toEqual({engine: "podman", source: "argument"});
  });

  it("uses the environment without consulting malformed persisted configuration", async () => {
    const toolingConfigPath = await malformedToolingConfigPath();

    await expect(
      resolveRuntimeContainerEngine({
        argv: ["node", "script.ts"],
        env: {AROLARIU_CONTAINER_ENGINE: "rancher"},
        toolingConfigPath,
      }),
    ).resolves.toEqual({engine: "rancher", source: "environment"});
  });

  it("surfaces malformed persisted configuration when no higher-priority source exists", async () => {
    const toolingConfigPath = await malformedToolingConfigPath();

    await expect(
      resolveRuntimeContainerEngine({
        argv: ["node", "script.ts"],
        env: {},
        toolingConfigPath,
      }),
    ).rejects.toThrow("Invalid local tooling configuration");
  });

  it("rejects an invalid explicit argument instead of falling back to persisted configuration", async () => {
    const toolingConfigPath = await malformedToolingConfigPath();

    await expect(
      resolveRuntimeContainerEngine({
        argv: ["node", "script.ts", "--engine", "colima"],
        env: {},
        toolingConfigPath,
      }),
    ).rejects.toThrow("Unsupported container engine 'colima'");
  });
});
