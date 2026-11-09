import {existsSync} from "node:fs";
import {resolve} from "node:path";

import {Effect} from "effect";
import {afterEach, describe, expect, it} from "vitest";

import {createPreparationFixture, readDevcontainer, type PreparationFixture} from "./platform/devcontainer-testing.ts";
import {makeNodeLayer} from "./platform/layers.ts";

const fixtures: PreparationFixture[] = [];

function fixture(): PreparationFixture {
  expect(existsSync(resolve(".devcontainer/api/postCreate.sh"))).toBe(true);
  const value = createPreparationFixture("api");
  fixtures.push(value);
  return value;
}

function run(value: PreparationFixture, environment?: Readonly<Record<string, string>>) {
  return Effect.runPromise(
    value
      .run(environment)
      .pipe(Effect.provide(makeNodeLayer({mode: "silent", verbose: false, color: false, context: "devcontainer-test"}))),
  );
}

afterEach(() => {
  for (const value of fixtures.splice(0)) value.dispose();
});

describe("API devcontainer", () => {
  it("isolates API tooling, caches and MSBuild outputs", () => {
    const definition = readDevcontainer("api");
    expect(definition).toBeDefined();
    expect(definition).toMatchObject({
      image: "mcr.microsoft.com/devcontainers/base:ubuntu-24.04",
      containerUser: "vscode",
      remoteUser: "vscode",
      workspaceFolder: "/workspaces/arolariu.ro/sites/api.arolariu.ro",
      features: {"ghcr.io/devcontainers/features/dotnet:2": {version: "10.0"}},
      containerEnv: {
        UseArtifactsOutput: "true",
        ArtifactsPath: "/home/vscode/.cache/api-dotnet/artifacts",
        DOTNET_CLI_HOME: "/home/vscode/.cache/api-dotnet",
        NUGET_PACKAGES: "/home/vscode/.nuget/packages",
      },
      forwardPorts: [5000],
      postCreateCommand: ["bash", "/workspaces/arolariu.ro/.devcontainer/api/postCreate.sh"],
    });
    expect(definition).not.toHaveProperty("postStartCommand");
    expect(definition).not.toHaveProperty("updateContentCommand");
    expect(definition).not.toHaveProperty("privileged", true);
  });

  it("restores only the API and its two owning test graphs", async () => {
    const value = fixture();
    expect(await run(value)).toMatchObject({status: 0});
    expect(value.events().filter((event) => event.startsWith("dotnet"))).toEqual([
      "dotnet\trestore\tsrc/Core/arolariu.Backend.Core.csproj",
      "dotnet\trestore\ttests/arolariu.Backend.Core.Tests/arolariu.Backend.Core.Tests.csproj",
      "dotnet\trestore\ttests/arolariu.Backend.Domain.Tests/arolariu.Backend.Domain.Tests.csproj",
    ]);
    expect(value.events().some((event) => /^(npm|python3)\t/.test(event))).toBe(false);
  });

  it("stops restoring after a failed API restore", async () => {
    const value = fixture();
    const result = await run(value, {FAIL_COMMAND: "dotnet"});
    expect(result.status).toBe(17);
    expect(result.stderr).toContain("controlled dotnet failure");
    expect(value.events().filter((event) => event.startsWith("dotnet"))).toHaveLength(1);
    expect(result.stdout).not.toMatch(/ready|complete/i);
  });

  it("does not restore or change ownership when a cache is unmounted", async () => {
    const value = fixture();
    const result = await run(value, {FAIL_MOUNT: "1"});
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("mount");
    expect(value.events().filter((event) => /^(sudo|dotnet)\t/.test(event))).toEqual([]);
  });
});
