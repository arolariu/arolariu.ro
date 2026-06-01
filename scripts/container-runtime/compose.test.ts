/**
 * @fileoverview Tests for engine-aware Compose helper.
 * @module scripts/container-runtime/compose.test
 */

import {describe, expect, it} from "vitest";
import {getContainerAdapter} from "./adapters.ts";
import {buildComposeCommand} from "./compose.ts";

describe("buildComposeCommand", () => {
  it("routes compose files through Podman", () => {
    const command = buildComposeCommand(getContainerAdapter("podman"), {
      file: "infra/Local/Storage/docker-compose.yml",
      args: ["up", "-d"],
    });

    expect(command).toEqual({
      command: "podman",
      args: ["compose", "-f", "infra/Local/Storage/docker-compose.yml", "up", "-d"],
    });
  });
});
