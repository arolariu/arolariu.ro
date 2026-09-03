/**
 * @fileoverview Tests for container runtime command adapters.
 * @module scripts/container-runtime/adapters.test
 *
 * @remarks
 * `RuntimeCommand` is now backed by the shared `ProcessRequest` contract (`../common/runner.ts`)
 * instead of the deprecated `CommandSpec` facade; every command literal below already satisfies
 * that `{command, args}` shape unchanged.
 */

import {describe, expect, it} from "vitest";
import {getContainerAdapter} from "./adapters.ts";

describe("getContainerAdapter", () => {
  it("maps Rancher to the Rancher-owned Docker-compatible CLI", () => {
    const adapter = getContainerAdapter("rancher");

    expect(adapter.engine).toBe("rancher");
    expect(adapter.displayName).toBe("Rancher Desktop");
    expect(adapter.compose(["-f", "Management/docker-compose.yml", "up", "-d"])).toEqual({
      command: "docker",
      args: ["compose", "-f", "Management/docker-compose.yml", "up", "-d"],
    });
    expect(adapter.exec("mssql", ["/bin/sh", "-c", "echo ok"])).toEqual({
      command: "docker",
      args: ["exec", "mssql", "/bin/sh", "-c", "echo ok"],
    });
  });

  it("maps Podman to Podman-owned commands", () => {
    const adapter = getContainerAdapter("podman");

    expect(adapter.engine).toBe("podman");
    expect(adapter.displayName).toBe("Podman Desktop");
    expect(adapter.compose(["-f", "Management/docker-compose.yml", "up", "-d"])).toEqual({
      command: "podman",
      args: ["compose", "-f", "Management/docker-compose.yml", "up", "-d"],
    });
    expect(adapter.exec("mssql", ["/bin/sh", "-c", "echo ok"])).toEqual({
      command: "podman",
      args: ["exec", "mssql", "/bin/sh", "-c", "echo ok"],
    });
  });

  it("maps Aspire runtime values per engine", () => {
    expect(getContainerAdapter("rancher").aspireRuntime).toBe("docker");
    expect(getContainerAdapter("podman").aspireRuntime).toBe("podman");
  });

  it("maps image and log commands through the selected engine", () => {
    expect(getContainerAdapter("rancher").logs("api", ["--tail", "5"])).toEqual({
      command: "docker",
      args: ["logs", "--tail", "5", "api"],
    });
    expect(getContainerAdapter("rancher").build(["-t", "image", "."])).toEqual({
      command: "docker",
      args: ["build", "-t", "image", "."],
    });
    expect(getContainerAdapter("podman").run(["--rm", "image"])).toEqual({
      command: "podman",
      args: ["run", "--rm", "image"],
    });
  });
});
