import {existsSync, readFileSync} from "node:fs";
import {resolve} from "node:path";

import {Effect} from "effect";
import {afterEach, describe, expect, it} from "vitest";

import {createPreparationFixture, readDevcontainer, type PreparationFixture} from "./platform/devcontainer-testing.ts";
import {makeNodeLayer} from "./platform/layers.ts";

const fixtures: PreparationFixture[] = [];

function fixture(): PreparationFixture {
  expect(existsSync(resolve(".devcontainer/exp/postCreate.sh"))).toBe(true);
  const value = createPreparationFixture("exp");
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

describe("EXP devcontainer", () => {
  it("uses Linux-compatible LF bytes in the shell entrypoint", () => {
    const source = resolve(".devcontainer/exp/postCreate.sh");
    expect(existsSync(source)).toBe(true);
    expect(readFileSync(source).includes(13)).toBe(false);
  });

  it("selects only the EXP Python toolchain and service endpoint", () => {
    const definition = readDevcontainer("exp");
    expect(definition).toBeDefined();
    expect(definition).toMatchObject({
      image: "mcr.microsoft.com/devcontainers/base:ubuntu-24.04",
      containerUser: "vscode",
      remoteUser: "vscode",
      workspaceFolder: "/workspaces/arolariu.ro/sites/exp.arolariu.ro",
      features: {
        "ghcr.io/devcontainers/features/python:1": {
          version: "os-provided",
          installTools: false,
          installJupyterlab: false,
        },
      },
      forwardPorts: [5002],
      postCreateCommand: ["bash", "/workspaces/arolariu.ro/.devcontainer/exp/postCreate.sh"],
    });
    expect(definition).not.toHaveProperty("postStartCommand");
    expect(definition).not.toHaveProperty("updateContentCommand");
    expect(definition).not.toHaveProperty("privileged", true);
  });

  it("initializes an empty mounted venv and installs only EXP development requirements", async () => {
    const value = fixture();
    expect(await run(value)).toMatchObject({status: 0});
    const installs = value.events().filter((event) => event.startsWith("venv-python"));
    expect(installs).toHaveLength(1);
    expect(installs[0]).toMatch(/\t-m\tpip\tinstall\t-r\t.*sites\/exp\.arolariu\.ro\/requirements-dev\.txt$/);
    expect(value.events().some((event) => event.startsWith("python3\t-m\tvenv\t"))).toBe(true);
    expect(value.events().some((event) => /^(npm|dotnet)\t/.test(event))).toBe(false);
  });

  it("reuses the initialized interpreter when preparation is rerun", async () => {
    const value = fixture();
    expect(await run(value)).toMatchObject({status: 0});
    expect(await run(value)).toMatchObject({status: 0});
    expect(value.events().filter((event) => event.startsWith("python3\t-m\tvenv\t"))).toHaveLength(1);
  });

  it("propagates pip failure instead of reporting readiness", async () => {
    const value = fixture();
    const result = await run(value, {FAIL_COMMAND: "pip"});
    expect(result.status).toBe(17);
    expect(result.stderr).toContain("controlled pip failure");
    expect(result.stdout).not.toMatch(/ready|complete/i);
  });

  it("rejects an unmounted cache before changing ownership or installing", async () => {
    const value = fixture();
    const result = await run(value, {FAIL_MOUNT: "1"});
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("mount");
    expect(value.events().filter((event) => /^(sudo|python3|venv-python)\t/.test(event))).toEqual([]);
  });
});
