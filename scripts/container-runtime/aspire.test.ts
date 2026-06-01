/**
 * @fileoverview Tests for engine-aware Aspire startup.
 * @module scripts/container-runtime/aspire.test
 */

import {describe, expect, it} from "vitest";
import {getContainerAdapter} from "./adapters.ts";
import {buildAspireCommand} from "./aspire.ts";

describe("buildAspireCommand", () => {
  it("sets Rancher Aspire runtime", () => {
    const command = buildAspireCommand(getContainerAdapter("rancher"));

    expect(command.command).toBe("dotnet");
    expect(command.args).toEqual(["run", "--project", "tooling/AppHost"]);
    expect(command.env["DOTNET_ASPIRE_CONTAINER_RUNTIME"]).toBe("docker");
  });

  it("sets Podman Aspire runtime", () => {
    const command = buildAspireCommand(getContainerAdapter("podman"));

    expect(command.command).toBe("dotnet");
    expect(command.args).toEqual(["run", "--project", "tooling/AppHost"]);
    expect(command.env["DOTNET_ASPIRE_CONTAINER_RUNTIME"]).toBe("podman");
  });
});
