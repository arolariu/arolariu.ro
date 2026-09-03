/**
 * @fileoverview Tests for container runtime preflight checks.
 * @module scripts/container-runtime/preflight.test
 */

import {describe, expect, it} from "vitest";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger, type MonorepositoryLogger} from "../common/logger.ts";
import type {CommandResult, CommandRunner} from "../common/process.ts";
import type {ProcessOutcome} from "../common/runner.ts";
import {createProcessRunner} from "../common/runtime.testing.ts";
import {getContainerAdapter} from "./adapters.ts";
import {
  assertNoDockerDesktopBackend,
  assertPodmanBackend,
  assertRancherBackend,
  assertToolAvailable,
  buildArtifactGenerationCommand,
  describeCommandFailure,
  requiredLocalPorts,
  runArtifactGeneration,
  runContainerPreflight,
  runSharedPreflight,
  warnOnExistingLocalContainers,
  type ContainerPreflightContext,
} from "./preflight.ts";

function commandResult(stdout: string, code = 0): CommandResult {
  return {code, stdout, stderr: "", durationMs: 0, timedOut: false};
}

function commandResultWithStderr(stderr: string, code = 0): CommandResult {
  return {code, stdout: "", stderr, durationMs: 0, timedOut: false};
}

function succeeded(stdout = "", stderr = ""): ProcessOutcome {
  return {kind: "succeeded", exitCode: 0, stdout, stderr, durationMs: 0};
}

function exited(code: number, stdout = "", stderr = ""): ProcessOutcome {
  return {kind: "exited", exitCode: code, stdout, stderr, durationMs: 0};
}

function createTestLogger(): Readonly<{sink: InMemoryLoggerSink; logger: MonorepositoryLogger}> {
  const sink = new InMemoryLoggerSink();
  const logger = new MonorepositoryConsoleLogger("test", {
    color: false,
    sink,
  });

  return {sink, logger};
}

describe("describeCommandFailure", () => {
  it("prefers stderr, then stdout, then spawnError, then the fallback", () => {
    expect(describeCommandFailure({code: 1, stdout: "out", stderr: "err", durationMs: 0, timedOut: false}, "fallback")).toBe("err");
    expect(describeCommandFailure({code: 1, stdout: "out", stderr: "", durationMs: 0, timedOut: false}, "fallback")).toBe("out");
    expect(
      describeCommandFailure({code: 1, stdout: "", stderr: "", durationMs: 0, timedOut: false, spawnError: "spawn failed"}, "fallback"),
    ).toBe("spawn failed");
    expect(describeCommandFailure({code: 1, stdout: "", stderr: "", durationMs: 0, timedOut: false}, "fallback")).toBe("fallback");
  });
});

describe("buildArtifactGenerationCommand", () => {
  it("uses the current Node executable and unified artifact alias", () => {
    expect(buildArtifactGenerationCommand()).toEqual({
      command: process.execPath,
      args: [expect.stringMatching(/scripts[\\/]generate\.ts$/u), "/a"],
    });
  });
});

describe("runArtifactGeneration", () => {
  it("logs the command and supplies the logger for tee output", async () => {
    const {sink, logger} = createTestLogger();
    let receivedLogger: MonorepositoryLogger | undefined;
    const runner: CommandRunner = {
      run: async (_command, options) => {
        receivedLogger = options?.logger;
        return commandResult("");
      },
    };

    await runArtifactGeneration(runner, logger);

    expect(sink.records.some((record) => record.text.includes("generate.ts") && record.text.startsWith("$ "))).toBe(true);
    expect(receivedLogger).toBe(logger);
  });
});

describe("assertToolAvailable", () => {
  it("passes when the tool exits successfully", async () => {
    await expect(assertToolAvailable("podman", createProcessRunner([succeeded("podman version 5")]))).resolves.toBeUndefined();
  });

  it("throws when the tool is missing", async () => {
    await expect(assertToolAvailable("podman", createProcessRunner([exited(1, "not found")]))).rejects.toThrow(
      "Required tool 'podman' is not available",
    );
  });
});

describe("assertNoDockerDesktopBackend", () => {
  it("throws when the active backend is Docker Desktop", async () => {
    await expect(assertNoDockerDesktopBackend(createProcessRunner([succeeded("Docker Desktop 4.40.0")]))).rejects.toThrow(
      "Docker Desktop is the active backend",
    );
  });

  it("passes when the active backend is Rancher Desktop", async () => {
    await expect(assertNoDockerDesktopBackend(createProcessRunner([succeeded("Rancher Desktop")]))).resolves.toBeUndefined();
  });

  it("throws when the Docker Desktop banner is only present on stderr", async () => {
    await expect(assertNoDockerDesktopBackend(createProcessRunner([succeeded("", "Docker Desktop 4.40.0")]))).rejects.toThrow(
      "Docker Desktop is the active backend",
    );
  });

  it("passes when the probe itself fails, since a failed probe cannot confirm a Docker Desktop banner", async () => {
    await expect(assertNoDockerDesktopBackend(createProcessRunner([exited(1, "not found")]))).resolves.toBeUndefined();
  });
});

describe("assertRancherBackend", () => {
  it("accepts Rancher Desktop output", async () => {
    await expect(assertRancherBackend(createProcessRunner([succeeded("Rancher Desktop 1.20.0")]))).resolves.toBeUndefined();
  });

  it("rejects Docker Desktop output", async () => {
    await expect(assertRancherBackend(createProcessRunner([succeeded("Docker Desktop 4.40.0")]))).rejects.toThrow(
      "Rancher engine selected but Docker Desktop appears to be active",
    );
  });

  it("rejects an unavailable Docker-compatible CLI", async () => {
    await expect(assertRancherBackend(createProcessRunner([exited(1, "not found")]))).rejects.toThrow(
      "Rancher Desktop Docker-compatible CLI is not available",
    );
  });

  it("rejects a Docker Desktop banner reported only on stderr", async () => {
    await expect(assertRancherBackend(createProcessRunner([succeeded("", "Docker Desktop 4.40.0")]))).rejects.toThrow(
      "Rancher engine selected but Docker Desktop appears to be active",
    );
  });
});

describe("assertPodmanBackend", () => {
  it("accepts a working Podman CLI and compose provider", async () => {
    await expect(
      assertPodmanBackend(createProcessRunner([succeeded("podman version 5.4.0"), succeeded("podman-compose version 1.2.0")])),
    ).resolves.toBeUndefined();
  });

  it("rejects missing Podman", async () => {
    await expect(assertPodmanBackend(createProcessRunner([exited(1, "podman missing")]))).rejects.toThrow("Podman is not available");
  });

  it("rejects missing Podman Compose provider", async () => {
    await expect(
      assertPodmanBackend(createProcessRunner([succeeded("podman version 5.4.0"), exited(1, "podman compose provider is not configured")])),
    ).rejects.toThrow("Podman Compose provider is not available");
  });

  it("rejects Docker Desktop compose provider delegation", async () => {
    await expect(
      assertPodmanBackend(
        createProcessRunner([
          succeeded("podman version 5.8.2"),
          succeeded('Executing external compose provider "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-compose.exe"'),
        ]),
      ),
    ).rejects.toThrow("Podman Compose is currently delegated to a Docker Desktop compose provider");
  });

  it("rejects macOS Docker Desktop compose provider delegation", async () => {
    await expect(
      assertPodmanBackend(
        createProcessRunner([
          succeeded("podman version 5.8.2"),
          succeeded('Executing external compose provider "/Applications/Docker.app/Contents/Resources/cli-plugins/docker-compose"'),
        ]),
      ),
    ).rejects.toThrow("Podman Compose is currently delegated to a Docker Desktop compose provider");
  });

  it("rejects Docker Desktop compose provider delegation reported only on stderr", async () => {
    await expect(
      assertPodmanBackend(
        createProcessRunner([
          succeeded("podman version 5.8.2"),
          succeeded("", 'Executing external compose provider "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-compose.exe"'),
        ]),
      ),
    ).rejects.toThrow("Podman Compose is currently delegated to a Docker Desktop compose provider");
  });

  it("allows Podman Compose provider output", async () => {
    await expect(
      assertPodmanBackend(
        createProcessRunner([succeeded("podman version 5.8.2"), succeeded("podman version 5.8.2\npodman-compose version 1.5.0")]),
      ),
    ).resolves.toBeUndefined();
  });
});

describe("warnOnExistingLocalContainers", () => {
  it("warns when known local containers already exist", async () => {
    const {sink, logger} = createTestLogger();

    await warnOnExistingLocalContainers(getContainerAdapter("podman"), createProcessRunner([succeeded("mssql\nredis\n")]), logger);

    expect(sink.records.some((record) => record.text.includes("Existing local containers detected for Podman Desktop: mssql, redis"))).toBe(
      true,
    );
  });

  it("does not warn when container listing fails", async () => {
    const {sink, logger} = createTestLogger();

    await warnOnExistingLocalContainers(getContainerAdapter("podman"), createProcessRunner([exited(1, "error")]), logger);

    expect(sink.records).toHaveLength(0);
  });
});

describe("runContainerPreflight", () => {
  function contextFor(outcomes: readonly ProcessOutcome[]): Readonly<{
    context: ContainerPreflightContext;
    runner: ReturnType<typeof createProcessRunner>;
    logger: MonorepositoryLogger;
    sink: InMemoryLoggerSink;
  }> {
    const runner = createProcessRunner(outcomes);
    const {sink, logger} = createTestLogger();
    const controller = new AbortController();
    const context: ContainerPreflightContext = {
      runner,
      logger,
      environment: {
        variables: {},
        cwd: "/repo",
        executablePath: "/usr/bin/node",
        platform: "linux",
        architecture: "x64",
        stdinIsTTY: false,
        stdoutIsTTY: false,
        isCI: true,
      },
      signal: controller.signal,
    };

    return {context, runner, logger, sink};
  }

  it("runs Rancher validation and compose checks in order", async () => {
    const {context, runner} = contextFor([succeeded("Rancher Desktop")]);

    await runContainerPreflight(getContainerAdapter("rancher"), context);

    expect(runner.calls.map((call) => [call.request.command, ...call.request.args].join(" "))).toEqual([
      "docker --version",
      "docker version",
      "docker compose version",
      "docker ps -a --format {{.Names}}",
    ]);
  });

  it("threads the context signal into every probe", async () => {
    const {context, runner} = contextFor([succeeded("Rancher Desktop")]);

    await runContainerPreflight(getContainerAdapter("rancher"), context);

    expect(runner.calls.every((call) => call.options.signal === context.signal)).toBe(true);
  });

  it("rejects Docker Desktop before validating Podman", async () => {
    const {context} = contextFor([succeeded("podman version 5.4.0"), succeeded("Docker Desktop 4.40.0")]);

    await expect(runContainerPreflight(getContainerAdapter("podman"), context)).rejects.toThrow("Docker Desktop is the active backend");
  });

  it("warns through the context logger when local containers already exist", async () => {
    const {context, sink} = contextFor([
      succeeded("podman version 5.8.2"), // podman --version (assertToolAvailable)
      succeeded(), // docker version (assertNoDockerDesktopBackend)
      succeeded("podman version 5.8.2"), // podman --version (assertPodmanBackend)
      succeeded("podman-compose version 1.5.0"), // podman compose version (assertPodmanBackend)
      succeeded("podman-compose version 1.5.0"), // podman compose version (runContainerPreflight's own check)
      succeeded("mssql\n"), // podman ps -a (warnOnExistingLocalContainers)
    ]);

    await runContainerPreflight(getContainerAdapter("podman"), context);

    expect(sink.records.some((record) => record.text.includes("Existing local containers detected for Podman Desktop: mssql"))).toBe(true);
  });
});

describe("runSharedPreflight", () => {
  it("runs Rancher validation and compose checks", async () => {
    const calls: string[] = [];
    const runner: CommandRunner = {
      run: async (command) => {
        calls.push([command.command, ...command.args].join(" "));
        return commandResult("Rancher Desktop");
      },
    };

    await runSharedPreflight(getContainerAdapter("rancher"), runner);

    expect(calls).toEqual(["docker --version", "docker version", "docker compose version", "docker ps -a --format {{.Names}}"]);
  });

  it("rejects Docker Desktop before validating Podman", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        if (command.command === "podman") {
          return commandResult("podman version 5.4.0");
        }

        return commandResult("Docker Desktop 4.40.0");
      },
    };

    await expect(runSharedPreflight(getContainerAdapter("podman"), runner)).rejects.toThrow("Docker Desktop is the active backend");
  });

  it("preserves a Docker Desktop banner detected only on stderr through the legacy CommandRunner adapter", async () => {
    const runner: CommandRunner = {
      run: async () => commandResultWithStderr("Docker Desktop 4.40.0"),
    };

    await expect(runSharedPreflight(getContainerAdapter("rancher"), runner)).rejects.toThrow(
      "Rancher engine selected but Docker Desktop appears to be active",
    );
  });
});

describe("requiredLocalPorts", () => {
  it("includes all selfhost and Aspire fixed ports", () => {
    expect(requiredLocalPorts).toEqual([3000, 3002, 4173, 5000, 5002, 6379, 8081, 8082, 10000]);
  });
});
