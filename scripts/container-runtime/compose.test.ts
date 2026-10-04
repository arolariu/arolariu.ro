// @vitest-environment node
/**
 * @fileoverview Tests for the Effect Compose program.
 * @module scripts/container-runtime/compose.test
 *
 * @remarks
 * Every case runs on `makeTestLayer`: an in-memory filesystem seeded with the repository
 * `package.json`, scripted preflight and Compose processes, and a recording sink. The
 * characterization cases drive the real `containers compose` CLI path (`runCli`), so they pin the
 * exit code, the rendered lines, the JSON document, and every process call; no module is mocked.
 */

import {Effect, Exit, Fiber} from "effect";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../cli.ts";
import {makeContainersCommand} from "../commands/containers/cli.ts";
import type {ProbeOutcome} from "../inspection/probes.ts";
import {exitCodeFor} from "../platform/exit.ts";
import {effectTest, makeTestLayer, scriptedOutcomes, type ScriptedProcess, type TestHarness} from "../platform/testing.ts";
import {getContainerAdapter} from "./adapters.ts";
import {buildComposeCommand, runCompose} from "./compose.ts";

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
 * Builds a harness for one Compose run.
 *
 * @param outcomes - Scripted process outcomes in call order.
 * @returns The harness.
 */
function composeHarness(outcomes: readonly ProbeOutcome[] = []): TestHarness {
  return makeTestLayer({context: "compose", files: WORKSPACE_FILES, processes: [queued(outcomes)]});
}

/** Projects every recorded process call into plain values. */
function projectCalls(harness: TestHarness): readonly unknown[] {
  return harness.processCalls().map(({request, options}) => ({command: request.command, args: [...request.args], options}));
}

/** Projects every rendered record, without its trailing newline. */
function projectOutput(harness: TestHarness): readonly unknown[] {
  return harness.output().map((record) => ({stream: record.stream, text: record.text.replace(/\n$/u, "")}));
}

describe("buildComposeCommand", () => {
  effectTest(
    "routes compose files through Podman",
    () =>
      Effect.sync(() => {
        const command = buildComposeCommand(getContainerAdapter("podman"), {
          file: "infra/Local/Storage/docker-compose.yml",
          args: ["up", "-d"],
        });

        expect(command).toEqual({
          command: "podman",
          args: ["compose", "-f", "infra/Local/Storage/docker-compose.yml", "up", "-d"],
        });
      }),
    makeTestLayer().layer,
  );
});

describe("runCompose", () => {
  {
    const harness = composeHarness();
    effectTest(
      "preserves pass-through argument order and bytes with tee output",
      () =>
        Effect.gen(function* () {
          // Act
          const result = yield* runCompose({
            engine: "podman",
            file: "infra\\Local\\Storage\\docker-compose.yml",
            passthrough: ["up", "-d"],
          });

          // Assert
          expect(result).toEqual({engine: "podman", file: "infra\\Local\\Storage\\docker-compose.yml", passthrough: ["up", "-d"]});
          expect(harness.processCalls().at(-1)).toEqual({
            request: {command: "podman", args: ["compose", "-f", "infra\\Local\\Storage\\docker-compose.yml", "up", "-d"]},
            options: {output: "tee", echo: false},
          });
        }),
      harness.layer,
    );
  }

  {
    const harness = composeHarness([...rancherPreflightOutcomes, succeeded("compose stdout\n")]);
    effectTest(
      "runs preflight before invoking Compose, then echoes the command and tees its output",
      () =>
        Effect.gen(function* () {
          // Act
          const result = yield* runCompose({
            engine: "rancher",
            file: "infra/Local/Storage/docker-compose.yml",
            passthrough: ["up", "-d", "--remove-orphans"],
          });

          // Assert
          expect(result).toEqual({
            engine: "rancher",
            file: "infra/Local/Storage/docker-compose.yml",
            passthrough: ["up", "-d", "--remove-orphans"],
          });
          expect(harness.processCalls().map((call) => call.request.command)).toEqual(["docker", "docker", "docker", "docker", "docker"]);
          expect(projectOutput(harness)).toEqual([
            {stream: "stdout", text: "$ docker compose -f infra/Local/Storage/docker-compose.yml up -d --remove-orphans"},
            {stream: "stdout", text: "compose stdout"},
          ]);
        }),
      harness.layer,
    );
  }

  {
    const harness = composeHarness([...rancherPreflightOutcomes, exited(1)]);
    effectTest(
      "fails with ProcessExited when Compose exits with a nonzero code",
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(runCompose({engine: "rancher", file: "docker-compose.yml", passthrough: ["up", "-d"]}));

          // Assert
          expect(error._tag).toBe("ProcessExited");
        }),
      harness.layer,
    );
  }

  {
    const preflight = [...rancherPreflightOutcomes];
    const harness = makeTestLayer({
      files: WORKSPACE_FILES,
      processes: [
        {match: (request) => request.args[0] === "compose" && request.args[1] === "-f", respond: () => Effect.never},
        queued(preflight),
      ],
    });
    effectTest(
      "interrupts Compose itself when the invocation is interrupted",
      () =>
        Effect.gen(function* () {
          // Arrange
          const fiber = yield* Effect.forkChild(runCompose({engine: "rancher", file: "docker-compose.yml", passthrough: ["up", "-d"]}));
          while (harness.processCalls().length < 5) {
            yield* Effect.yieldNow;
          }

          // Act
          const exit = yield* Fiber.interrupt(fiber).pipe(Effect.andThen(Fiber.await(fiber)));

          // Assert
          expect(Exit.hasInterrupts(exit)).toBe(true);
          expect(harness.processCalls()).toHaveLength(5);
        }),
      harness.layer,
    );
  }
});

// ============================================================================
// Characterization (R1 pins, now through the Effect `containers compose` CLI path)
// ============================================================================

/**
 * Runs `containers compose` once through the real CLI path.
 *
 * @param engine - Requested engine.
 * @param json - Whether to pass `--json`.
 * @param outcomes - Scripted preflight and Compose outcomes.
 * @returns The exit code, projected process calls, and rendered output.
 */
async function characterizeCompose(engine: "rancher" | "podman", json: boolean, outcomes: readonly ProbeOutcome[] = []): Promise<unknown> {
  const harness = composeHarness(outcomes);
  const argv = [
    "containers",
    "compose",
    "--file",
    "infra/Local/Storage/docker-compose.yml",
    "--engine",
    engine,
    ...(json ? ["--json"] : []),
    "--",
    "--profile",
    "selfhost",
    "up",
    "-d",
    "--remove-orphans",
  ];

  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeContainersCommand()])).pipe(Effect.provide(harness.layer)));

  return {exitCode: exitCodeFor(exit, undefined), calls: projectCalls(harness), output: projectOutput(harness)};
}

/** Recorded options of the full-output preflight probes. */
const PROBE = {failureOutput: "full"} as const;

/** Recorded options of the echoed, tee'd engine command. */
const TEE = {output: "tee", echo: false} as const;

describe("containers compose characterization", () => {
  it("rancher (human): preflight, then exactly [-f, file, ...passthrough] through the engine adapter", async () => {
    expect(await characterizeCompose("rancher", false)).toEqual({
      exitCode: 0,
      calls: [
        {command: "docker", args: ["--version"], options: PROBE},
        {command: "docker", args: ["version"], options: PROBE},
        {command: "docker", args: ["compose", "version"], options: PROBE},
        {command: "docker", args: ["ps", "-a", "--format", "{{.Names}}"], options: {}},
        {
          command: "docker",
          args: ["compose", "-f", "infra/Local/Storage/docker-compose.yml", "--profile", "selfhost", "up", "-d", "--remove-orphans"],
          options: TEE,
        },
      ],
      output: [
        {
          stream: "stdout",
          text: "$ docker compose -f infra/Local/Storage/docker-compose.yml --profile selfhost up -d --remove-orphans",
        },
        {
          stream: "stdout",
          text: "[arolariu::compose] ✅ Compose completed for 'infra/Local/Storage/docker-compose.yml' with engine 'rancher'.",
        },
      ],
    });
  });

  // Intentional change (cohort 6 ledger): legacy ran Compose and then failed with exit 1
  // ("selected JSON presentation without a JSON document"); the Effect command writes the result
  // as the single JSON document and exits per the business result.
  it("podman (json): Compose runs, then the result is the single JSON document and the exit code is 0", async () => {
    expect(await characterizeCompose("podman", true)).toEqual({
      exitCode: 0,
      calls: [
        {command: "podman", args: ["--version"], options: PROBE},
        {command: "docker", args: ["version"], options: PROBE},
        {command: "podman", args: ["--version"], options: PROBE},
        {command: "podman", args: ["compose", "version"], options: PROBE},
        {command: "podman", args: ["compose", "version"], options: PROBE},
        {command: "podman", args: ["ps", "-a", "--format", "{{.Names}}"], options: {}},
        {
          command: "podman",
          args: ["compose", "-f", "infra/Local/Storage/docker-compose.yml", "--profile", "selfhost", "up", "-d", "--remove-orphans"],
          options: TEE,
        },
      ],
      output: [
        {
          stream: "stdout",
          text: JSON.stringify(
            {
              engine: "podman",
              file: "infra/Local/Storage/docker-compose.yml",
              passthrough: ["--profile", "selfhost", "up", "-d", "--remove-orphans"],
            },
            null,
            2,
          ),
        },
      ],
    });
  });

  it("Compose exit: the tee'd output once, then one diagnostic without evidence, exit 1", async () => {
    expect(
      await characterizeCompose("rancher", false, [...rancherPreflightOutcomes, exited(2, "", "service 'x' failed to build\n")]),
    ).toMatchObject({
      exitCode: 1,
      output: [
        {
          stream: "stdout",
          text: "$ docker compose -f infra/Local/Storage/docker-compose.yml --profile selfhost up -d --remove-orphans",
        },
        {stream: "stderr", text: "service 'x' failed to build"},
        {stream: "stderr", text: "[arolariu::compose] ⛔ docker exited with code 2"},
      ],
    });
  });
});
