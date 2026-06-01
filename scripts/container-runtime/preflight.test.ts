/**
 * @fileoverview Tests for container runtime preflight checks.
 * @module scripts/container-runtime/preflight.test
 */

import {describe, expect, it, vi} from "vitest";
import {getContainerAdapter} from "./adapters.ts";
import {
  assertNoDockerDesktopBackend,
  assertPodmanBackend,
  assertRancherBackend,
  assertToolAvailable,
  requiredLocalPorts,
  runSharedPreflight,
  warnOnExistingLocalContainers,
} from "./preflight.ts";
import type {CommandRunner} from "./process.ts";

function runnerWith(output: string, code = 0): CommandRunner {
  return {
    run: async () => ({code, output}),
  };
}

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
});

describe("assertPodmanBackend", () => {
  it("accepts a working Podman CLI and compose provider", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        if (command.command === "podman" && command.args.join(" ") === "--version") {
          return {code: 0, output: "podman version 5.4.0"};
        }

        if (command.command === "podman" && command.args.join(" ") === "compose version") {
          return {code: 0, output: "podman-compose version 1.2.0"};
        }

        return {code: 1, output: "unexpected command"};
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
          return {code: 0, output: "podman version 5.4.0"};
        }

        return {code: 1, output: "podman compose provider is not configured"};
      },
    };

    await expect(assertPodmanBackend(runner)).rejects.toThrow("Podman Compose provider is not available");
  });

  it("rejects Docker Desktop compose provider delegation", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        if (command.command === "podman" && command.args.join(" ") === "--version") {
          return {code: 0, output: "podman version 5.8.2"};
        }

        return {
          code: 0,
          output: 'Executing external compose provider "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-compose.exe"',
        };
      },
    };

    await expect(assertPodmanBackend(runner)).rejects.toThrow("Podman Compose is currently delegated to a Docker Desktop compose provider");
  });

  it("rejects macOS Docker Desktop compose provider delegation", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        if (command.command === "podman" && command.args.join(" ") === "--version") {
          return {code: 0, output: "podman version 5.8.2"};
        }

        return {
          code: 0,
          output: 'Executing external compose provider "/Applications/Docker.app/Contents/Resources/cli-plugins/docker-compose"',
        };
      },
    };

    await expect(assertPodmanBackend(runner)).rejects.toThrow("Podman Compose is currently delegated to a Docker Desktop compose provider");
  });

  it("allows Podman Compose provider output", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        if (command.command === "podman" && command.args.join(" ") === "--version") {
          return {code: 0, output: "podman version 5.8.2"};
        }

        return {code: 0, output: "podman version 5.8.2\npodman-compose version 1.5.0"};
      },
    };

    await expect(assertPodmanBackend(runner)).resolves.toBeUndefined();
  });
});

describe("warnOnExistingLocalContainers", () => {
  it("warns when known local containers already exist", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await warnOnExistingLocalContainers(getContainerAdapter("podman"), runnerWith("mssql\nredis\n"));

    expect(warn).toHaveBeenCalledWith("Existing local containers detected for Podman Desktop: mssql, redis");
  });

  it("does not warn when container listing fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await warnOnExistingLocalContainers(getContainerAdapter("podman"), runnerWith("error", 1));

    expect(warn).not.toHaveBeenCalled();
  });
});

describe("runSharedPreflight", () => {
  it("runs Rancher validation and compose checks", async () => {
    const calls: string[] = [];
    const runner: CommandRunner = {
      run: async (command) => {
        calls.push([command.command, ...command.args].join(" "));
        return {code: 0, output: "Rancher Desktop"};
      },
    };

    await runSharedPreflight(getContainerAdapter("rancher"), runner);

    expect(calls).toEqual(["docker --version", "docker version", "docker compose version", "docker ps -a --format {{.Names}}"]);
  });

  it("rejects Docker Desktop before validating Podman", async () => {
    const runner: CommandRunner = {
      run: async (command) => {
        if (command.command === "podman") {
          return {code: 0, output: "podman version 5.4.0"};
        }

        return {code: 0, output: "Docker Desktop 4.40.0"};
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
