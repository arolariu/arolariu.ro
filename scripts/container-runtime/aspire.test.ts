/**
 * @fileoverview Tests for engine-aware Aspire startup.
 * @module scripts/container-runtime/aspire.test
 */

import {describe, expect, it} from "vitest";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "../common/logger.ts";
import type {CommandRunner} from "../common/process.ts";
import {getContainerAdapter} from "./adapters.ts";
import {buildAspireCommand, runAspire} from "./aspire.ts";

function successfulRunner(): CommandRunner {
  return {
    run: async () => ({code: 0, stdout: "Rancher Desktop", stderr: "", durationMs: 0, timedOut: false}),
  };
}

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

describe("runAspire", () => {
  it("resolves the requested engine from an explicit CLI argument, not process.argv", async () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});
    const commands: string[] = [];
    const runner: CommandRunner = {
      run: async (command) => {
        commands.push([command.command, ...command.args].join(" "));
        return {code: 0, stdout: "Rancher Desktop", stderr: "", durationMs: 0, timedOut: false};
      },
    };

    await runAspire(["--engine", "rancher"], {runner, logger});

    expect(commands).toContain("dotnet run --project tooling/AppHost");
  });

  it("rejects an unsupported engine value", async () => {
    await expect(runAspire(["--engine", "docker"], {runner: successfulRunner()})).rejects.toThrow("Docker Desktop is deprecated");
  });

  it("rejects an unknown option instead of exiting silently", async () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    await expect(runAspire(["--bogus"], {runner: successfulRunner(), logger})).rejects.toThrow(/unknown option/iu);
  });

  it("rejects a missing --engine argument instead of exiting silently", async () => {
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("test", {color: false, sink});

    await expect(runAspire(["--engine"], {runner: successfulRunner(), logger})).rejects.toThrow(/argument missing/iu);
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

    await expect(runAspire([helpFlag], {runner, logger})).resolves.toBeUndefined();

    expect(executed).toBe(false);
    expect(sink.records.some((record) => record.text.includes("Usage:"))).toBe(true);
  });
});
