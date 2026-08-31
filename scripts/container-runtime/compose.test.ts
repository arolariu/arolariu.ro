/**
 * @fileoverview Tests for engine-aware Compose helper.
 * @module scripts/container-runtime/compose.test
 */

import {describe, expect, it} from "vitest";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "../common/logger.ts";
import type {CommandRunner} from "../common/process.ts";
import {getContainerAdapter} from "./adapters.ts";
import {buildComposeCommand, runComposeCli} from "./compose.ts";

function successfulRunner(commands: string[] = []): CommandRunner {
  return {
    run: async (command) => {
      commands.push([command.command, ...command.args].join(" "));
      return {code: 0, stdout: "Rancher Desktop", stderr: "", durationMs: 0, timedOut: false};
    },
  };
}

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

describe("runComposeCli", () => {
  it("preserves pass-through argument order and bytes after --", async () => {
    const commands: string[] = [];
    const runner = successfulRunner(commands);

    await runComposeCli(
      ["--file", "infra/Local/Storage/docker-compose.yml", "--engine", "rancher", "--", "up", "-d", "--remove-orphans"],
      {runner},
    );

    expect(commands.at(-1)).toBe(
      "docker compose -f infra/Local/Storage/docker-compose.yml up -d --remove-orphans",
    );
  });

  it("rejects a missing --file with the existing usage error", async () => {
    await expect(runComposeCli(["--engine", "rancher", "--", "up", "-d"], {runner: successfulRunner()})).rejects.toThrow(
      "Use --file <compose-file> -- <compose arguments>",
    );
  });

  it("rejects missing pass-through arguments with the existing usage error", async () => {
    await expect(
      runComposeCli(["--file", "infra/Local/Storage/docker-compose.yml", "--engine", "rancher"], {runner: successfulRunner()}),
    ).rejects.toThrow("Use --file <compose-file> -- <compose arguments>");
  });

  it.each(["--help", "-h", "/h"])("routes %s through the injected logger without executing anything", async (helpFlag) => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});
    let executed = false;
    const runner: CommandRunner = {
      run: async () => {
        executed = true;
        return {code: 0, stdout: "", stderr: "", durationMs: 0, timedOut: false};
      },
    };

    await expect(runComposeCli([helpFlag], {runner, logger})).resolves.toBeUndefined();

    expect(executed).toBe(false);
    expect(sink.records.some((record) => record.text.includes("Usage:"))).toBe(true);
  });
});
