// @vitest-environment node
/**
 * @fileoverview Tests for the Effect Aspire AppHost startup program.
 * @module scripts/container-runtime/aspire.test
 *
 * @remarks
 * Every case runs on `makeTestLayer`: an in-memory filesystem seeded with the repository
 * `package.json`, scripted preflight and AppHost processes, and a recording sink. The
 * characterization cases drive the real `dev aspire` CLI path (`runCli`), so they pin the exit
 * code, the rendered lines, the JSON document, and every process call; no module is mocked.
 */

import {Effect, Exit, Fiber} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../cli.ts";
import {makeDevCommand} from "../commands/dev/cli.ts";
import type {ProbeOutcome} from "../inspection/probes.ts";
import {exitCodeFor} from "../platform/exit.ts";
import {effectTest, makeTestLayer, scriptedOutcomes, type ScriptedProcess, type TestHarness} from "../platform/testing.ts";
import {getContainerAdapter} from "./adapters.ts";
import {buildAspireCommand, runAspire} from "./aspire.ts";

/** Repository identity the engine selection discovers the root from. */
const WORKSPACE_FILES: Readonly<Record<string, string>> = {"package.json": JSON.stringify({name: "@arolariu/monorepo"})};

function succeeded(stdout = ""): ProbeOutcome {
  return {kind: "succeeded", exitCode: 0, stdout, stderr: "", durationMs: 0};
}

function exited(code: number, stdout = "", stderr = ""): ProbeOutcome {
  return {kind: "exited", exitCode: code, stdout, stderr, durationMs: 0};
}

/**
 * Scripts every process call with the next queued outcome; an exhausted queue succeeds with no output.
 *
 * @param outcomes - Outcomes in call order.
 * @returns The catch-all script.
 */
function queued(outcomes: readonly ProbeOutcome[]): ScriptedProcess {
  const queue = [...outcomes];
  return scriptedOutcomes(() => queue.shift() ?? succeeded());
}

/** One `succeeded` outcome per Rancher preflight probe: tool, backend, compose, existing containers. */
const rancherPreflightOutcomes: readonly ProbeOutcome[] = [succeeded(), succeeded(), succeeded(), succeeded()];

/**
 * Builds a harness for one Aspire run.
 *
 * @param outcomes - Scripted process outcomes in call order.
 * @param options - Extra seeded files and environment variables.
 * @returns The harness.
 */
function aspireHarness(
  outcomes: readonly ProbeOutcome[],
  options: {readonly files?: Readonly<Record<string, string>>; readonly variables?: Readonly<Record<string, string>>} = {},
): TestHarness {
  return makeTestLayer({
    context: "aspire",
    files: {...WORKSPACE_FILES, ...options.files},
    environment: {variables: options.variables ?? {}},
    processes: [queued(outcomes)],
  });
}

/** Projects every recorded process call into plain values. */
function projectCalls(harness: TestHarness): readonly unknown[] {
  return harness.processCalls().map(({request, options}) => ({command: request.command, args: [...request.args], options}));
}

/** Projects every rendered record, without its trailing newline. */
function projectOutput(harness: TestHarness): readonly unknown[] {
  return harness.output().map((record) => ({stream: record.stream, text: record.text.replace(/\n$/u, "")}));
}

describe("buildAspireCommand", () => {
  effectTest(
    "sets the Rancher Aspire runtime over the supplied base environment",
    () =>
      Effect.sync(() => {
        const command = buildAspireCommand(getContainerAdapter("rancher"), {EXISTING: "value"});

        expect(command.command).toBe("dotnet");
        expect(command.args).toEqual(["run", "--project", "tooling/src/AppHost"]);
        expect(command.env).toEqual({EXISTING: "value", DOTNET_ASPIRE_CONTAINER_RUNTIME: "docker"});
      }),
    makeTestLayer().layer,
  );

  effectTest(
    "sets the Podman Aspire runtime",
    () =>
      Effect.sync(() => {
        const command = buildAspireCommand(getContainerAdapter("podman"), {});

        expect(command.env["DOTNET_ASPIRE_CONTAINER_RUNTIME"]).toBe("podman");
      }),
    makeTestLayer().layer,
  );
});

describe("runAspire", () => {
  {
    const harness = aspireHarness([...rancherPreflightOutcomes, succeeded()], {variables: {HOME: "/home/fixture"}});
    effectTest(
      "resolves the requested engine, runs preflight, and starts AppHost with inherited output",
      () =>
        Effect.gen(function* () {
          // Act
          const result = yield* runAspire({engine: "rancher"});

          // Assert
          expect(result).toEqual({engine: "rancher"});
          expect(harness.processCalls().at(-1)).toEqual({
            request: {command: "dotnet", args: ["run", "--project", "tooling/src/AppHost"]},
            options: {env: {HOME: "/home/fixture", DOTNET_ASPIRE_CONTAINER_RUNTIME: "docker"}, output: "inherit"},
          });
        }),
      harness.layer,
    );
  }

  {
    const harness = aspireHarness([
      succeeded(), // podman --version (assertToolAvailable)
      succeeded(), // docker version (assertNoDockerDesktopBackend)
      succeeded(), // podman --version (assertPodmanBackend)
      succeeded("podman-compose version 1.5.0"), // podman compose version (assertPodmanBackend)
      succeeded("podman-compose version 1.5.0"), // podman compose version (compose provider check)
      succeeded(), // podman ps -a (warnOnExistingLocalContainers)
      succeeded(), // dotnet run
    ]);
    effectTest(
      "runs Podman preflight before starting AppHost",
      () =>
        Effect.gen(function* () {
          // Act
          const result = yield* runAspire({engine: "podman"});

          // Assert
          expect(result).toEqual({engine: "podman"});
          expect(harness.processCalls().map((call) => call.request.command)).toEqual([
            "podman",
            "docker",
            "podman",
            "podman",
            "podman",
            "podman",
            "dotnet",
          ]);
          expect(harness.processCalls().at(-1)?.options.env?.["DOTNET_ASPIRE_CONTAINER_RUNTIME"]).toBe("podman");
        }),
      harness.layer,
    );
  }

  {
    const harness = aspireHarness([...rancherPreflightOutcomes, exited(1)]);
    effectTest(
      "fails with ProcessExited when AppHost exits with a nonzero code",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(runAspire({engine: "rancher"}));

          // Assert
          expect(error._tag).toBe("ProcessExited");
          expect(error._tag === "ProcessExited" ? error.exitCode : undefined).toBe(1);
        }),
      harness.layer,
    );
  }

  {
    const harness = aspireHarness([succeeded("docker version 27.0"), succeeded("Docker Desktop 4.40.0")]);
    effectTest(
      "rejects Docker Desktop before starting AppHost",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(runAspire({engine: "rancher"}));

          // Assert
          expect(error._tag).toBe("ContainerRuntimeError");
          expect(error.message).toContain("Docker Desktop appears to be active");
          expect(harness.processCalls()).toHaveLength(2);
        }),
      harness.layer,
    );
  }

  {
    const harness = aspireHarness([...rancherPreflightOutcomes, succeeded()], {
      files: {".arolariu/tooling.local.json": JSON.stringify({schemaVersion: 1, containerEngine: "rancher"})},
    });
    effectTest(
      "resolves the persisted engine through the repository configuration when no engine is requested",
      () =>
        Effect.gen(function* () {
          // Act
          const result = yield* runAspire({});

          // Assert
          expect(result).toEqual({engine: "rancher"});
          expect(harness.processCalls()[0]?.request).toEqual({command: "docker", args: ["--version"]});
        }),
      harness.layer,
    );
  }

  {
    const harness = aspireHarness([]);
    effectTest(
      "rejects the deprecated docker engine value before any process runs",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(runAspire({engine: "docker" as never}));

          // Assert
          expect(error._tag).toBe("ContainerRuntimeError");
          expect(error.message).toBe("Docker Desktop is deprecated for this repository. Select --engine rancher or --engine podman.");
          expect(harness.processCalls()).toHaveLength(0);
        }),
      harness.layer,
    );
  }

  {
    const harness = makeTestLayer({
      files: WORKSPACE_FILES,
      processes: [{match: () => true, respond: () => Effect.never}],
    });
    effectTest(
      "stops before starting AppHost when preflight is interrupted",
      () =>
        Effect.gen(function* () {
          // Arrange
          const fiber = yield* Effect.forkChild(runAspire({engine: "rancher"}));
          while (harness.processCalls().length === 0) {
            yield* Effect.yieldNow;
          }

          // Act
          const exit = yield* Fiber.interrupt(fiber).pipe(Effect.andThen(Fiber.await(fiber)));

          // Assert
          expect(Exit.hasInterrupts(exit)).toBe(true);
          expect(harness.processCalls()).toHaveLength(1);
        }),
      harness.layer,
    );
  }
});

// ============================================================================
// Characterization (R1 pins, now through the Effect `dev aspire` CLI path)
// ============================================================================

/**
 * Runs `dev aspire` once through the real CLI path.
 *
 * @param engine - Requested engine.
 * @param outcomes - Scripted preflight and AppHost outcomes.
 * @param json - Whether to pass `--json`.
 * @returns The exit code, projected process calls, and rendered output.
 */
async function characterizeAspire(engine: "rancher" | "podman", outcomes: readonly ProbeOutcome[], json = false): Promise<unknown> {
  const harness = aspireHarness(outcomes, {variables: {HOME: "/home/fixture"}});
  const argv = ["dev", "aspire", "--engine", engine, ...(json ? ["--json"] : [])];

  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeDevCommand()])).pipe(Effect.provide(harness.layer)));

  return {exitCode: exitCodeFor(exit, undefined), calls: projectCalls(harness), output: projectOutput(harness)};
}

/** Recorded options of the full-output preflight probes. */
const PROBE = {failureOutput: "full"} as const;

describe("dev aspire characterization", () => {
  it("rancher: preflight calls in order, then AppHost with the merged environment and inherited output", async () => {
    const result = await characterizeAspire("rancher", [
      succeeded("Docker version 27.3.1"),
      succeeded("Server: Moby Engine"),
      succeeded("Docker Compose version v2.29.7"),
      succeeded("traefik\nredis\nunrelated\n"),
      succeeded(),
    ]);

    expect(result).toEqual({
      exitCode: 0,
      calls: [
        {command: "docker", args: ["--version"], options: PROBE},
        {command: "docker", args: ["version"], options: PROBE},
        {command: "docker", args: ["compose", "version"], options: PROBE},
        {command: "docker", args: ["ps", "-a", "--format", "{{.Names}}"], options: {}},
        {
          command: "dotnet",
          args: ["run", "--project", "tooling/src/AppHost"],
          options: {
            env: {
              HOME: "/home/fixture",
              DOTNET_ASPIRE_CONTAINER_RUNTIME: "docker",
            },
            output: "inherit",
          },
        },
      ],
      output: [
        {
          stream: "stderr",
          text: "[arolariu::aspire::preflight] ⚠️ Existing local containers detected for Rancher Desktop: traefik, redis",
        },
        {
          stream: "stdout",
          text: "[arolariu::aspire] ✅ Aspire AppHost exited successfully for engine 'rancher'.",
        },
      ],
    });
  });

  it("podman: preflight calls in order, then AppHost with the podman runtime and inherited output", async () => {
    const result = await characterizeAspire("podman", [
      succeeded("podman version 5.2.0"),
      exited(1),
      succeeded("podman version 5.2.0"),
      succeeded("podman-compose version 1.5.0"),
      succeeded("podman-compose version 1.5.0"),
      succeeded(""),
      succeeded(),
    ]);

    expect(result).toEqual({
      exitCode: 0,
      calls: [
        {command: "podman", args: ["--version"], options: PROBE},
        {command: "docker", args: ["version"], options: PROBE},
        {command: "podman", args: ["--version"], options: PROBE},
        {command: "podman", args: ["compose", "version"], options: PROBE},
        {command: "podman", args: ["compose", "version"], options: PROBE},
        {command: "podman", args: ["ps", "-a", "--format", "{{.Names}}"], options: {}},
        {
          command: "dotnet",
          args: ["run", "--project", "tooling/src/AppHost"],
          options: {
            env: {
              HOME: "/home/fixture",
              DOTNET_ASPIRE_CONTAINER_RUNTIME: "podman",
            },
            output: "inherit",
          },
        },
      ],
      output: [
        {
          stream: "stdout",
          text: "[arolariu::aspire] ✅ Aspire AppHost exited successfully for engine 'podman'.",
        },
      ],
    });
  });

  // Intentional change (cohort 6 ledger): legacy ran AppHost and then failed with exit 1
  // ("selected JSON presentation without a JSON document"); the Effect command writes the result
  // as the single JSON document and exits per the business result.
  it("rancher (json): AppHost runs, then the result is the single JSON document and the exit code is 0", async () => {
    const result = await characterizeAspire(
      "rancher",
      [
        succeeded("Docker version 27.3.1"),
        succeeded("Server: Moby Engine"),
        succeeded("Docker Compose version v2.29.7"),
        succeeded(""),
        succeeded(),
      ],
      true,
    );

    expect(result).toEqual({
      exitCode: 0,
      calls: [
        {command: "docker", args: ["--version"], options: PROBE},
        {command: "docker", args: ["version"], options: PROBE},
        {command: "docker", args: ["compose", "version"], options: PROBE},
        {command: "docker", args: ["ps", "-a", "--format", "{{.Names}}"], options: {}},
        {
          command: "dotnet",
          args: ["run", "--project", "tooling/src/AppHost"],
          options: {
            env: {
              HOME: "/home/fixture",
              DOTNET_ASPIRE_CONTAINER_RUNTIME: "docker",
            },
            output: "inherit",
          },
        },
      ],
      output: [{stream: "stdout", text: '{\n  "engine": "rancher"\n}'}],
    });
  });

  it("AppHost exit: one diagnostic without repeating the child output, exit 1", async () => {
    const result = await characterizeAspire("rancher", [...rancherPreflightOutcomes, exited(3, "apphost stdout", "apphost stderr")]);

    expect(result).toMatchObject({
      exitCode: 1,
      output: [{stream: "stderr", text: "[arolariu::aspire] ⛔ dotnet exited with code 3"}],
    });
  });

  it("AppHost exit (json): exactly one stdout failure document with the evidence, exit 1", async () => {
    const result = await characterizeAspire("rancher", [...rancherPreflightOutcomes, exited(3, "apphost stdout", "apphost stderr")], true);

    expect(result).toMatchObject({
      exitCode: 1,
      output: [
        {
          stream: "stdout",
          text: JSON.stringify(
            {
              status: "failed",
              kind: "operational",
              message: "dotnet exited with code 3",
              evidence: ["dotnet run --project tooling/src/AppHost exited with code 3", "stdout: apphost stdout", "stderr: apphost stderr"],
            },
            null,
            2,
          ),
        },
        {stream: "stderr", text: "dotnet exited with code 3"},
      ],
    });
  });

  it("preflight failure: rendered by the root renderer, exit 1, AppHost never starts", async () => {
    const result = await characterizeAspire("rancher", [exited(127, "", "docker: not found")]);

    expect(result).toEqual({
      exitCode: 1,
      calls: [{command: "docker", args: ["--version"], options: PROBE}],
      output: [
        {
          stream: "stderr",
          text: "[arolariu::cli] ⛔ Required tool 'docker' is not available. Output: docker: not found",
        },
      ],
    });
  });
});
