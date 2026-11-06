import {existsSync, readdirSync, readFileSync} from "node:fs";
import {join, resolve} from "node:path";

import {describe, expect, it} from "vitest";

import {readDevcontainer, type DevcontainerFlavor} from "./platform/devcontainer-testing.ts";

const flavors: readonly DevcontainerFlavor[] = ["api", "components", "cv-docs-status", "exp", "website"];

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

  it.each(flavors)("%s exposes LF-compatible shell bytes to Linux", (flavor) => {
    expect(readFileSync(resolve(".devcontainer", flavor, "postCreate.sh")).includes(13)).toBe(false);
  });
});
