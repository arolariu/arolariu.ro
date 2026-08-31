/**
 * @fileoverview Tests for container runtime preflight checks.
 * @module scripts/container-runtime/preflight.test
 */

import {describe, expect, it} from "vitest";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger, type MonorepositoryLogger} from "../common/logger.ts";
import type {CommandResult, CommandRunner} from "../common/process.ts";
import {getContainerAdapter} from "./adapters.ts";
import {
  assertNoDockerDesktopBackend,
  assertPodmanBackend,
  assertRancherBackend,
  assertToolAvailable,
  describeCommandFailure,
  runArtifactGeneration,
  requiredLocalPorts,
  runSharedPreflight,
  warnOnExistingLocalContainers,
} from "./preflight.ts";

function commandResult(stdout: string, code = 0): CommandResult {
  return {code, stdout, stderr: "", durationMs: 0, timedOut: false};
}

function commandResultWithStderr(stderr: string, code = 0): CommandResult {
  return {code, stdout: "", stderr, durationMs: 0, timedOut: false};
}

function runnerWith(output: string, code = 0): CommandRunner {
  return {
    run: async () => commandResult(output, code),
  };
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

function createTestLogger(): Readonly<{sink: InMemoryLoggerSink; logger: MonorepositoryLogger}> {
  const sink = new InMemoryLoggerSink();
  const logger = new MonorepositoryConsoleLogger("test", {
    color: false,
    sink,
  });

  return {sink, logger};
}

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
    await expect(assertToolAvailable("podman", runnerWith("podman version 5"))).resolves.toBeUndefined();
  });

  it("throws when the tool is missing", async () => {
    await expect(assertToolAvailable("podman", runnerWith("not found", 1))).rejects.toThrow("Required tool 'podman' is not available");
  });
});

describe("assertNoDockerDesktopBackend", () => {
  it("throws when the active backend is Docker Desktop", async () => {
    await expect(assertNoDockerDesktopBackend(runnerWith("Docker Desktop 4.40.0"))).rejects.toThrow("Docker Desktop is the active backend");
  });

  it("passes when the active backend is Rancher Desktop", async () => {
    await expect(assertNoDockerDesktopBackend(runnerWith("Rancher Desktop"))).resolves.toBeUndefined();
  });

  it("throws when the Docker Desktop banner is only present on stderr", async () => {
    const runner: CommandRunner = {
      run: async () => commandResultWithStderr("Docker Desktop 4.40.0"),
    };

    await expect(assertNoDockerDesktopBackend(runner)).rejects.toThrow("Docker Desktop is the active backend");
  });
});

describe("assertRancherBackend", () => {
  it("accepts Rancher Desktop output", async () => {
    await expect(assertRancherBackend(runnerWith("Rancher Desktop 1.20.0"))).resolves.toBeUndefined();
  });

  it("rejects Docker Desktop output", async () => {
    await expect(assertRancherBackend(runnerWith("Docker Desktop 4.40.0"))).rejects.toThrow(
      "Rancher engine selected but Docker Desktop appears to be active",
    );
  });

  it("rejects an unavailable Docker-compatible CLI", async () => {
    await expect(assertRancherBackend(runnerWith("not found", 1))).rejects.toThrow(
      "Rancher Desktop Docker-compatible CLI is not available",
    );
  });

  it("rejects a Docker Desktop banner reported only on stderr", async () => {
    const runner: CommandRunner = {
      run: async () => commandResultWithStderr("Docker Desktop 4.40.0"),
    };

    await expect(assertRancherBackend(runner)).rejects.toThrow(
      "Rancher engine selected but Docker Desktop appears to be active",
    );
  });
});

describe("assertPodmanBackend", () => {
  it("accepts a working Podman CLI and compose provider", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        if (command.command === "podman" && command.args.join(" ") === "--version") {
          return commandResult("podman version 5.4.0");
        }

        if (command.command === "podman" && command.args.join(" ") === "compose version") {
          return commandResult("podman-compose version 1.2.0");
        }

        return commandResult("unexpected command", 1);
      },
    };

    await expect(assertPodmanBackend(runner)).resolves.toBeUndefined();
  });

  it("rejects missing Podman", async () => {
    await expect(assertPodmanBackend(runnerWith("podman missing", 1))).rejects.toThrow("Podman is not available");
  });

  it("rejects missing Podman Compose provider", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        if (command.command === "podman" && command.args.join(" ") === "--version") {
          return commandResult("podman version 5.4.0");
        }

        return commandResult("podman compose provider is not configured", 1);
      },
    };

    await expect(assertPodmanBackend(runner)).rejects.toThrow("Podman Compose provider is not available");
  });

  it("rejects Docker Desktop compose provider delegation", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        if (command.command === "podman" && command.args.join(" ") === "--version") {
          return commandResult("podman version 5.8.2");
        }

        return commandResult(
          'Executing external compose provider "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-compose.exe"',
        );
      },
    };

    await expect(assertPodmanBackend(runner)).rejects.toThrow("Podman Compose is currently delegated to a Docker Desktop compose provider");
  });

  it("rejects macOS Docker Desktop compose provider delegation", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        if (command.command === "podman" && command.args.join(" ") === "--version") {
          return commandResult("podman version 5.8.2");
        }

        return commandResult('Executing external compose provider "/Applications/Docker.app/Contents/Resources/cli-plugins/docker-compose"');
      },
    };

    await expect(assertPodmanBackend(runner)).rejects.toThrow("Podman Compose is currently delegated to a Docker Desktop compose provider");
  });

  it("rejects Docker Desktop compose provider delegation reported only on stderr", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        if (command.command === "podman" && command.args.join(" ") === "--version") {
          return commandResult("podman version 5.8.2");
        }

        return commandResultWithStderr(
          'Executing external compose provider "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-compose.exe"',
        );
      },
    };

    await expect(assertPodmanBackend(runner)).rejects.toThrow("Podman Compose is currently delegated to a Docker Desktop compose provider");
  });

  it("allows Podman Compose provider output", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        if (command.command === "podman" && command.args.join(" ") === "--version") {
          return commandResult("podman version 5.8.2");
        }

        return commandResult("podman version 5.8.2\npodman-compose version 1.5.0");
      },
    };

    await expect(assertPodmanBackend(runner)).resolves.toBeUndefined();
  });
});

describe("warnOnExistingLocalContainers", () => {
  it("warns when known local containers already exist", async () => {
    const {sink, logger} = createTestLogger();

    await warnOnExistingLocalContainers(getContainerAdapter("podman"), runnerWith("mssql\nredis\n"), logger);

    expect(sink.records.some((record) => record.text.includes("Existing local containers detected for Podman Desktop: mssql, redis"))).toBe(
      true,
    );
  });

  it("does not warn when container listing fails", async () => {
    const {sink, logger} = createTestLogger();

    await warnOnExistingLocalContainers(getContainerAdapter("podman"), runnerWith("error", 1), logger);

    expect(sink.records).toHaveLength(0);
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
});

describe("requiredLocalPorts", () => {
  it("includes all selfhost and Aspire fixed ports", () => {
    expect(requiredLocalPorts).toEqual([3000, 3002, 4173, 5000, 5002, 6379, 8081, 8082, 10000]);
  });
});
