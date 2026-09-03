/**
 * @fileoverview Tests for container runtime preflight checks.
 * @module scripts/container-runtime/preflight.test
 */

import {describe, expect, it} from "vitest";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger, type MonorepositoryLogger} from "../common/logger.ts";
import type {ProcessOutcome} from "../common/runner.ts";
import {createProcessRunner} from "../common/runtime.testing.ts";
import {CommandCancellation} from "../common/runtime.ts";
import {getContainerAdapter} from "./adapters.ts";
import {
  assertNoDockerDesktopBackend,
  assertPodmanBackend,
  assertRancherBackend,
  assertToolAvailable,
  requiredLocalPorts,
  runContainerPreflight,
  warnOnExistingLocalContainers,
  type ContainerPreflightContext,
} from "./preflight.ts";

function succeeded(stdout = "", stderr = ""): ProcessOutcome {
  return {kind: "succeeded", exitCode: 0, stdout, stderr, durationMs: 0};
}

function exited(code: number, stdout = "", stderr = ""): ProcessOutcome {
  return {kind: "exited", exitCode: code, stdout, stderr, durationMs: 0};
}

function cancelled(): ProcessOutcome {
  return {kind: "cancelled", stdout: "", stderr: "", durationMs: 0};
}

function createTestLogger(): Readonly<{sink: InMemoryLoggerSink; logger: MonorepositoryLogger}> {
  const sink = new InMemoryLoggerSink();
  const logger = new MonorepositoryConsoleLogger("test", {
    color: false,
    sink,
  });

  return {sink, logger};
}

describe("assertToolAvailable", () => {
  it("passes when the tool exits successfully", async () => {
    await expect(assertToolAvailable("podman", createProcessRunner([succeeded("podman version 5")]))).resolves.toBeUndefined();
  });

  it("throws when the tool is missing", async () => {
    await expect(assertToolAvailable("podman", createProcessRunner([exited(1, "not found")]))).rejects.toThrow(
      "Required tool 'podman' is not available",
    );
  });

  it("throws the invocation's cancellation reason when the probe is cancelled on an aborted signal", async () => {
    const controller = new AbortController();
    controller.abort(new CommandCancellation("Terminated by test signal.", 130));

    await expect(assertToolAvailable("podman", createProcessRunner([cancelled()]), controller.signal)).rejects.toMatchObject({
      name: "CommandCancellation",
      exitCode: 130,
      message: "Terminated by test signal.",
    });
  });

  it("treats a standalone cancelled outcome without an aborted signal as an operational failure", async () => {
    await expect(assertToolAvailable("podman", createProcessRunner([cancelled()]))).rejects.toThrow(
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

  it("throws the invocation's cancellation reason when the advisory probe is cancelled on an aborted signal", async () => {
    const controller = new AbortController();
    controller.abort(new CommandCancellation("Terminated by test signal.", 130));

    await expect(assertNoDockerDesktopBackend(createProcessRunner([cancelled()]), controller.signal)).rejects.toMatchObject({
      name: "CommandCancellation",
      exitCode: 130,
      message: "Terminated by test signal.",
    });
  });

  it("keeps a standalone cancelled outcome advisory when no invocation signal is aborted", async () => {
    await expect(assertNoDockerDesktopBackend(createProcessRunner([cancelled()]))).resolves.toBeUndefined();
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
    controller: AbortController;
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

    return {context, runner, logger, sink, controller};
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

  it("throws the invocation's cancellation reason when a probe is cancelled on an aborted signal, with no later probes", async () => {
    const {context, runner, controller} = contextFor([cancelled()]);
    controller.abort(new CommandCancellation("Terminated by test signal.", 130));

    await expect(runContainerPreflight(getContainerAdapter("rancher"), context)).rejects.toMatchObject({
      name: "CommandCancellation",
      exitCode: 130,
      message: "Terminated by test signal.",
    });
    expect(runner.calls).toHaveLength(1);
  });

  it("keeps a standalone cancelled outcome an operational failure when the invocation signal is not aborted", async () => {
    const {context} = contextFor([cancelled()]);

    await expect(runContainerPreflight(getContainerAdapter("rancher"), context)).rejects.toThrow("Required tool 'docker' is not available");
  });

  it("surfaces an aborted invocation at the advisory Docker Desktop probe without an extra probe", async () => {
    const {context, runner, controller} = contextFor([succeeded("podman version 5.8.2"), cancelled()]);
    controller.abort(new CommandCancellation("Terminated by test signal.", 143));

    await expect(runContainerPreflight(getContainerAdapter("podman"), context)).rejects.toMatchObject({
      name: "CommandCancellation",
      exitCode: 143,
      message: "Terminated by test signal.",
    });
    expect(runner.calls.map((call) => [call.request.command, ...call.request.args].join(" "))).toEqual([
      "podman --version",
      "docker version",
    ]);
  });
});

describe("requiredLocalPorts", () => {
  it("includes all selfhost and Aspire fixed ports", () => {
    expect(requiredLocalPorts).toEqual([3000, 3002, 4173, 5000, 5002, 6379, 8081, 8082, 10000]);
  });
});
