/**
 * @fileoverview Tests for container runtime preflight checks.
 * @module scripts/container-runtime/preflight.test
 *
 * @remarks
 * Every probe answers from a scripted `Process` on the in-memory harness, in call order; an
 * unscripted extra probe dies. The failure messages are the exact legacy texts, including the
 * failure detail rebuilt from the `ProcessError` fields.
 */

import {Cause, Effect, Exit} from "effect";
import {describe, expect, it} from "vitest";

import type {ProbeOutcome} from "../inspection/probes.ts";
import {formatProcessRequest} from "../platform/Process.ts";
import {effectTest, makeTestLayer, processOutcomeEffect, type ScriptedProcess, type TestHarness} from "../platform/testing.ts";
import {getContainerAdapter} from "./adapters.ts";
import {
  assertNoDockerDesktopBackend,
  assertPodmanBackend,
  assertRancherBackend,
  assertToolAvailable,
  requiredLocalPorts,
  runContainerPreflight,
  warnOnExistingLocalContainers,
} from "./preflight.ts";
import {ContainerRuntimeError} from "./types.ts";

function succeeded(stdout = "", stderr = ""): ProbeOutcome {
  return {kind: "succeeded", exitCode: 0, stdout, stderr, durationMs: 0};
}

function exited(code: number, stdout = "", stderr = ""): ProbeOutcome {
  return {kind: "exited", exitCode: code, stdout, stderr, durationMs: 0};
}

/** One scripted probe answer: an outcome, or `"interrupt"` for a probe interrupted while it runs. */
type ProbeAnswer = ProbeOutcome | "interrupt";

/**
 * Scripts every process request from `answers`, in call order; an extra request dies.
 *
 * @param answers - One answer per expected probe.
 * @returns The catch-all script.
 */
function inOrder(answers: readonly ProbeAnswer[]): ScriptedProcess {
  const queue = [...answers];
  return {
    match: () => true,
    respond: (request) => {
      const next = queue.shift();
      if (next === undefined) {
        return Effect.die(new Error(`unscripted process: ${formatProcessRequest(request)}`));
      }
      return next === "interrupt" ? Effect.interrupt : processOutcomeEffect(request, next);
    },
  };
}

/**
 * Builds a harness whose processes answer from `answers` in order.
 *
 * @param answers - One answer per expected probe.
 * @returns The harness.
 */
function harnessWith(...answers: readonly ProbeAnswer[]): TestHarness {
  return makeTestLayer({processes: [inOrder(answers)], context: "preflight"});
}

/**
 * Renders the recorded probes as command lines.
 *
 * @param harness - The harness.
 * @returns One `command arg…` line per probe.
 */
function probeLines(harness: TestHarness): readonly string[] {
  return harness.processCalls().map((call) => [call.request.command, ...call.request.args].join(" "));
}

describe("assertToolAvailable", () => {
  const passing = harnessWith(succeeded("podman version 5"));
  effectTest(
    "passes when the tool exits successfully, probing --version with the whole failure output kept",
    () =>
      Effect.gen(function* () {
        // Act
        yield* assertToolAvailable("podman");

        // Assert
        expect(passing.processCalls()).toEqual([{request: {command: "podman", args: ["--version"]}, options: {failureOutput: "full"}}]);
      }),
    passing.layer,
  );

  effectTest(
    "fails with the legacy message and the stdout detail when the tool is missing",
    () =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(assertToolAvailable("podman"));

        // Assert
        expect(error).toBeInstanceOf(ContainerRuntimeError);
        expect(error.message).toBe("Required tool 'podman' is not available. Output: not found");
      }),
    harnessWith(exited(1, "not found")).layer,
  );

  effectTest(
    "prefers stderr over stdout in the failure detail",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertToolAvailable("podman"));
        expect(error.message).toBe("Required tool 'podman' is not available. Output: permission denied");
      }),
    harnessWith(exited(1, "partial stdout", "permission denied")).layer,
  );

  effectTest(
    "keeps the leading 2000 characters of a long failure output",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertToolAvailable("podman"));
        expect(error.message).toBe(`Required tool 'podman' is not available. Output: ${"a".repeat(2_000)}`);
      }),
    harnessWith(exited(1, "", `${"a".repeat(2_000)}${"b".repeat(500)}`)).layer,
  );

  effectTest(
    "falls back to the exit code when the failed probe printed nothing",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertToolAvailable("podman"));
        expect(error.message).toBe("Required tool 'podman' is not available. Output: exit code 127");
      }),
    harnessWith(exited(127)).layer,
  );

  effectTest(
    "reports the spawn failure reason",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertToolAvailable("podman"));
        expect(error.message).toBe("Required tool 'podman' is not available. Output: spawn podman ENOENT");
      }),
    harnessWith({kind: "spawn-failed", message: "spawn podman ENOENT", stdout: "", stderr: "", durationMs: 0}).layer,
  );

  effectTest(
    "reports the terminating signal",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertToolAvailable("podman"));
        expect(error.message).toBe("Required tool 'podman' is not available. Output: terminated by SIGKILL");
      }),
    harnessWith({kind: "signalled", signal: "SIGKILL", stdout: "", stderr: "", durationMs: 0}).layer,
  );

  effectTest(
    "reports a timed-out probe",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertToolAvailable("podman"));
        expect(error.message).toBe("Required tool 'podman' is not available. Output: timed out");
      }),
    harnessWith({kind: "timed-out", stdout: "", stderr: "", durationMs: 0}).layer,
  );

  effectTest(
    "keeps an empty spawn failure detail empty",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertToolAvailable("podman"));
        expect(error.message).toBe("Required tool 'podman' is not available. Output: ");
      }),
    harnessWith({kind: "spawn-failed", message: "", stdout: "", stderr: "", durationMs: 0}).layer,
  );
});

describe("assertNoDockerDesktopBackend", () => {
  effectTest(
    "fails when the active backend is Docker Desktop",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertNoDockerDesktopBackend());
        expect(error.message).toBe(
          "Docker Desktop is the active backend. Stop Docker Desktop and select Rancher Desktop or Podman Desktop.",
        );
      }),
    harnessWith(succeeded("Docker Desktop 4.40.0")).layer,
  );

  effectTest(
    "passes when the active backend is Rancher Desktop",
    () => assertNoDockerDesktopBackend(),
    harnessWith(succeeded("Rancher Desktop")).layer,
  );

  effectTest(
    "fails when the Docker Desktop banner is only present on stderr",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertNoDockerDesktopBackend());
        expect(error).toBeInstanceOf(ContainerRuntimeError);
      }),
    harnessWith(succeeded("", "Docker Desktop 4.40.0")).layer,
  );

  effectTest(
    "passes when the probe itself fails, since a failed probe cannot confirm a Docker Desktop banner",
    () => assertNoDockerDesktopBackend(),
    harnessWith(exited(1, "Docker Desktop is not running")).layer,
  );
});

describe("assertRancherBackend", () => {
  effectTest("accepts Rancher Desktop output", () => assertRancherBackend(), harnessWith(succeeded("Rancher Desktop 1.20.0")).layer);

  effectTest(
    "rejects Docker Desktop output",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertRancherBackend());
        expect(error.message).toBe(
          "Rancher engine selected but Docker Desktop appears to be active. Start Rancher Desktop in Moby/dockerd mode and stop Docker Desktop.",
        );
      }),
    harnessWith(succeeded("Docker Desktop 4.40.0")).layer,
  );

  effectTest(
    "rejects an unavailable Docker-compatible CLI",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertRancherBackend());
        expect(error.message).toBe("Rancher Desktop Docker-compatible CLI is not available. Output: not found");
      }),
    harnessWith(exited(1, "not found")).layer,
  );

  effectTest(
    "rejects a Docker Desktop banner reported only on stderr",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertRancherBackend());
        expect(error.message).toContain("Rancher engine selected but Docker Desktop appears to be active");
      }),
    harnessWith(succeeded("", "Docker Desktop 4.40.0")).layer,
  );
});

describe("assertPodmanBackend", () => {
  effectTest(
    "accepts a working Podman CLI and compose provider",
    () => assertPodmanBackend(),
    harnessWith(succeeded("podman version 5.4.0"), succeeded("podman-compose version 1.2.0")).layer,
  );

  effectTest(
    "rejects missing Podman",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertPodmanBackend());
        expect(error.message).toBe("Podman is not available. Output: podman missing");
      }),
    harnessWith(exited(1, "podman missing")).layer,
  );

  effectTest(
    "rejects missing Podman Compose provider",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertPodmanBackend());
        expect(error.message).toBe(
          "Podman Compose provider is not available. Configure Podman Desktop Compose support. Output: podman compose provider is not configured",
        );
      }),
    harnessWith(succeeded("podman version 5.4.0"), exited(1, "podman compose provider is not configured")).layer,
  );

  const delegationMessage =
    "Podman Compose is currently delegated to a Docker Desktop compose provider. Install podman-compose and set PODMAN_COMPOSE_PROVIDER to the podman-compose executable.";

  effectTest(
    "rejects Docker Desktop compose provider delegation",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertPodmanBackend());
        expect(error.message).toBe(delegationMessage);
      }),
    harnessWith(
      succeeded("podman version 5.8.2"),
      succeeded('Executing external compose provider "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-compose.exe"'),
    ).layer,
  );

  effectTest(
    "rejects macOS Docker Desktop compose provider delegation",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertPodmanBackend());
        expect(error.message).toBe(delegationMessage);
      }),
    harnessWith(
      succeeded("podman version 5.8.2"),
      succeeded('Executing external compose provider "/Applications/Docker.app/Contents/Resources/cli-plugins/docker-compose"'),
    ).layer,
  );

  effectTest(
    "rejects Docker Desktop compose provider delegation reported only on stderr",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(assertPodmanBackend());
        expect(error.message).toBe(delegationMessage);
      }),
    harnessWith(
      succeeded("podman version 5.8.2"),
      succeeded("", 'Executing external compose provider "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker-compose.exe"'),
    ).layer,
  );

  effectTest(
    "allows Podman Compose provider output",
    () => assertPodmanBackend(),
    harnessWith(succeeded("podman version 5.8.2"), succeeded("podman version 5.8.2\npodman-compose version 1.5.0")).layer,
  );
});

describe("warnOnExistingLocalContainers", () => {
  const colliding = harnessWith(succeeded("mssql\r\nredis\n  \nunrelated\n"));
  effectTest(
    "warns with the legacy text when known local containers already exist",
    () =>
      Effect.gen(function* () {
        // Act
        yield* warnOnExistingLocalContainers(getContainerAdapter("podman"));

        // Assert
        expect(colliding.processCalls()).toEqual([
          {request: {command: "podman", args: ["ps", "-a", "--format", "{{.Names}}"]}, options: {}},
        ]);
        expect(colliding.output()).toEqual([
          {stream: "stderr", text: "[arolariu::preflight] ⚠️ Existing local containers detected for Podman Desktop: mssql, redis\n"},
        ]);
      }),
    colliding.layer,
  );

  const quiet = harnessWith(succeeded("unrelated\n"));
  effectTest(
    "does not warn when no known container exists",
    () =>
      Effect.gen(function* () {
        yield* warnOnExistingLocalContainers(getContainerAdapter("rancher"));
        expect(quiet.output()).toEqual([]);
      }),
    quiet.layer,
  );

  const failing = harnessWith(exited(1, "error"));
  effectTest(
    "does not warn when container listing fails",
    () =>
      Effect.gen(function* () {
        yield* warnOnExistingLocalContainers(getContainerAdapter("podman"));
        expect(failing.output()).toEqual([]);
      }),
    failing.layer,
  );
});

describe("runContainerPreflight", () => {
  const rancher = harnessWith(succeeded("Docker version 27.3.1"), succeeded("Server: Moby Engine"), succeeded("v2.29.7"), succeeded());
  effectTest(
    "runs Rancher validation and compose checks in order and returns the Rancher adapter",
    () =>
      Effect.gen(function* () {
        // Act
        const adapter = yield* runContainerPreflight("rancher");

        // Assert
        expect(adapter).toBe(getContainerAdapter("rancher"));
        expect(probeLines(rancher)).toEqual([
          "docker --version",
          "docker version",
          "docker compose version",
          "docker ps -a --format {{.Names}}",
        ]);
      }),
    rancher.layer,
  );

  const podman = harnessWith(
    succeeded("podman version 5.8.2"),
    exited(1),
    succeeded("podman version 5.8.2"),
    succeeded("podman-compose version 1.5.0"),
    succeeded("podman-compose version 1.5.0"),
    succeeded("mssql\n"),
  );
  effectTest(
    "runs the advisory Docker Desktop probe and the Podman checks in order, then warns",
    () =>
      Effect.gen(function* () {
        // Act
        const adapter = yield* runContainerPreflight("podman");

        // Assert
        expect(adapter).toBe(getContainerAdapter("podman"));
        expect(probeLines(podman)).toEqual([
          "podman --version",
          "docker version",
          "podman --version",
          "podman compose version",
          "podman compose version",
          "podman ps -a --format {{.Names}}",
        ]);
        expect(podman.output()).toEqual([
          {stream: "stderr", text: "[arolariu::preflight] ⚠️ Existing local containers detected for Podman Desktop: mssql\n"},
        ]);
      }),
    podman.layer,
  );

  const dockerDesktop = harnessWith(succeeded("podman version 5.4.0"), succeeded("Docker Desktop 4.40.0"));
  effectTest(
    "rejects Docker Desktop before validating Podman",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(runContainerPreflight("podman"));
        expect(error.message).toBe(
          "Docker Desktop is the active backend. Stop Docker Desktop and select Rancher Desktop or Podman Desktop.",
        );
        expect(dockerDesktop.processCalls()).toHaveLength(2);
      }),
    dockerDesktop.layer,
  );

  const missingCompose = harnessWith(succeeded(), succeeded("Server: Moby Engine"), exited(1, "", "'compose' is not a docker command."));
  effectTest(
    "rejects an unavailable compose provider with the engine display name",
    () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(runContainerPreflight("rancher"));
        expect(error.message).toBe("Rancher Desktop Compose provider is not available. Output: 'compose' is not a docker command.");
        expect(missingCompose.processCalls()).toHaveLength(3);
      }),
    missingCompose.layer,
  );

  const interrupted = harnessWith("interrupt");
  effectTest(
    "stops without any later probe when a probe is interrupted",
    () =>
      Effect.gen(function* () {
        // Act
        const exit = yield* Effect.exit(runContainerPreflight("rancher"));

        // Assert
        expect(Exit.isFailure(exit) && Cause.hasInterrupts(exit.cause)).toBe(true);
        expect(probeLines(interrupted)).toEqual(["docker --version"]);
      }),
    interrupted.layer,
  );

  const interruptedAdvisory = harnessWith(succeeded("podman version 5.8.2"), "interrupt");
  effectTest(
    "stops at the advisory Docker Desktop probe when it is interrupted",
    () =>
      Effect.gen(function* () {
        const exit = yield* Effect.exit(runContainerPreflight("podman"));
        expect(Exit.isFailure(exit) && Cause.hasInterrupts(exit.cause)).toBe(true);
        expect(probeLines(interruptedAdvisory)).toEqual(["podman --version", "docker version"]);
      }),
    interruptedAdvisory.layer,
  );
});

describe("requiredLocalPorts", () => {
  it("includes all selfhost and Aspire fixed ports", () => {
    expect(requiredLocalPorts).toEqual([3000, 3002, 4173, 5000, 5002, 6379, 8081, 8082, 10000]);
  });
});
