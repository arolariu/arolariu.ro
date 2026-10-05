// @vitest-environment node
/**
 * @fileoverview Tests for the Effect engine-aware selfhost orchestration program.
 * @module scripts/container-runtime/selfhost.test
 *
 * @remarks
 * Every case runs on the `selfhostFixture` harness (`./selfhost.testing.ts`): scripted preflight,
 * stack, and bootstrap processes, the real artifact generation over scripted taxonomy sources, scripted
 * Cosmos answers, a recording `LocalBlobStorage` layer, and an advancing test clock whose completed
 * sleeps are recorded. The characterization cases drive the real `dev selfhost` CLI path (`runCli`);
 * no module is mocked.
 */

import {readFile} from "node:fs/promises";

import {Duration, Effect, Exit, Fiber, Redacted} from "effect";
import {TestClock} from "effect/testing";
import {describe, expect, it} from "vitest";

import type {ProbeOutcome} from "../inspection/probes.ts";
import {exitCodeFor} from "../platform/exit.ts";
import type {PlatformServices} from "../platform/layers.ts";
import {effectTest, makeTestLayer} from "../platform/testing.ts";
import {getContainerAdapter} from "./adapters.ts";
import {cosmosBootstrapMaximumResponseBytes, type LocalBlobStorage} from "./selfhost.bootstrap.ts";
import {
  advancingClock,
  SELFHOST_SQL_PASSWORD,
  selfhostFixture,
  type SelfhostFixture,
  type SelfhostFixtureOptions,
} from "./selfhost.testing.ts";
import {
  buildLocalStorageBootstrapCommand,
  buildSelfhostPlan,
  getRequiredSqlPassword,
  runSelfhost,
  shouldGenerateTaxonomyArtifacts,
} from "./selfhost.ts";
import type {SelfhostAction} from "./types.ts";

const launcherCases = [
  {path: "../../infra/Local/selfhost-start.bat", action: "start", forwarding: "%*", shell: "batch"},
  {path: "../../infra/Local/selfhost-stop.bat", action: "stop", forwarding: "%*", shell: "batch"},
  {path: "../../infra/Local/selfhost-start.sh", action: "start", forwarding: '"$@"', shell: "bash"},
  {path: "../../infra/Local/selfhost-stop.sh", action: "stop", forwarding: '"$@"', shell: "bash"},
] as const;

/** Number of Podman preflight probes: tool, Docker Desktop rejection, backend x2, compose, existing containers. */
const podmanPreflightProbeCount = 6;

function exited(code: number, stderr = ""): ProbeOutcome {
  return {kind: "exited", exitCode: code, stdout: "", stderr, durationMs: 0};
}

/**
 * Formats every engine, mkcert, and dotnet process call of a fixture (the artifact `unzip` excluded).
 *
 * @param fixture - The selfhost fixture.
 * @returns `command args…` per call, in order.
 */
function formatCalls(fixture: SelfhostFixture): readonly string[] {
  return fixture.harness
    .processCalls()
    .filter((call) => call.request.command !== "unzip")
    .map((call) => [call.request.command, ...call.request.args].join(" "));
}

/**
 * Formats the process calls after the Podman preflight.
 *
 * @param fixture - The selfhost fixture.
 * @returns `command args…` per business call, in order.
 */
function businessCalls(fixture: SelfhostFixture): readonly string[] {
  return formatCalls(fixture).slice(podmanPreflightProbeCount);
}

/**
 * Reads the recorded sleeps of a fixture.
 *
 * @param fixture - The selfhost fixture.
 * @returns Every completed sleep in milliseconds, in order.
 */
function delays(fixture: SelfhostFixture): readonly unknown[] {
  return fixture.timeline().flatMap((event) => ("delay" in event ? [event["delay"]] : []));
}

/**
 * Registers a case that runs `runSelfhost(input)` (or a custom body) on a fresh fixture.
 *
 * @param name - The test name.
 * @param options - Fixture options.
 * @param body - Builds the effect from the fixture; it runs instrumented under an advancing clock.
 */
function selfhostTest(
  name: string,
  options: SelfhostFixtureOptions,
  body: (fixture: SelfhostFixture) => Effect.Effect<void, unknown, PlatformServices | LocalBlobStorage | TestClock.TestClock>,
): void {
  const fixture = selfhostFixture(options);
  effectTest(name, () => advancingClock(fixture.instrument(body(fixture))), fixture.harness.layer);
}

describe("supported selfhost launchers", () => {
  it.each(launcherCases)(
    "routes $path through the effect cli entrypoint with argument and exit-code propagation",
    async ({path, action, forwarding, shell}) => {
      const source = await readFile(new URL(path, import.meta.url), "utf8");
      const command = `node scripts/cli.ts dev selfhost ${action} ${forwarding}`;

      expect(source).not.toContain("scripts/dev-selfhost.mjs");
      expect(source).toContain(command);

      if (shell === "batch") {
        expect(source).toContain('pushd "%~dp0..\\.."');
        expect(source).toMatch(
          /node scripts\/cli\.ts dev selfhost (?:start|stop) %\*\r?\nset "EXIT_CODE=%ERRORLEVEL%"\r?\npopd\r?\nexit \/b %EXIT_CODE%/,
        );
      } else {
        expect(source).toContain("set -euo pipefail");
        expect(source).toContain('cd "$(dirname "$0")/../.."');
        expect(source.trimEnd().endsWith(command)).toBe(true);
      }
    },
  );
});

describe("buildSelfhostPlan", () => {
  it("builds a Rancher-only start plan", () => {
    const plan = buildSelfhostPlan({action: "start", adapter: getContainerAdapter("rancher")});

    expect(plan.map((command) => command.command)).toEqual(["docker", "docker", "docker", "docker"]);
    expect(plan.map((command) => command.args.join(" "))).toEqual([
      "compose -f Management/docker-compose.yml up -d",
      "compose -f Storage/docker-compose.yml --profile selfhost up -d",
      "compose -f Backend/docker-compose.yml up -d",
      "compose -f Frontend/docker-compose.yml up -d",
    ]);
  });

  it("builds a Podman-only stop plan", () => {
    const plan = buildSelfhostPlan({action: "stop", adapter: getContainerAdapter("podman")});

    expect(plan.map((command) => command.command)).toEqual(["podman", "podman", "podman", "podman"]);
    expect(plan.map((command) => command.args.join(" "))).toEqual([
      "compose -f Frontend/docker-compose.yml down",
      "compose -f Backend/docker-compose.yml down",
      "compose -f Storage/docker-compose.yml down",
      "compose -f Management/docker-compose.yml down",
    ]);
  });

  it("builds engine-owned logs commands", () => {
    const plan = buildSelfhostPlan({action: "logs", adapter: getContainerAdapter("podman")});

    expect(plan.map((command) => [command.command, command.args.join(" ")])).toEqual([
      ["podman", "logs --tail 100 exp-arolariu-ro"],
      ["podman", "logs --tail 100 api-arolariu-ro"],
      ["podman", "logs --tail 100 website-arolariu-ro"],
    ]);
  });
});

describe("buildLocalStorageBootstrapCommand", () => {
  it("uses the shared .NET local storage provisioner", () => {
    expect(buildLocalStorageBootstrapCommand()).toEqual({
      command: "dotnet",
      args: ["run", "--project", "../../tooling/LocalDevelopment.Bootstrap", "--", "--ensure-storage-only"],
    });
  });
});

describe("shouldGenerateTaxonomyArtifacts", () => {
  it("generates artifacts before selfhost start", () => {
    expect(shouldGenerateTaxonomyArtifacts("start")).toBe(true);
  });

  it.each(["stop", "logs"] as const)("does not generate artifacts for %s", (action: SelfhostAction) => {
    expect(shouldGenerateTaxonomyArtifacts(action)).toBe(false);
  });
});

describe("getRequiredSqlPassword", () => {
  effectTest(
    "reads the SQL password from the environment as a redacted value",
    () =>
      Effect.gen(function* () {
        // Act
        const password = yield* getRequiredSqlPassword;

        // Assert
        expect(Redacted.value(password)).toBe(SELFHOST_SQL_PASSWORD);
        expect(String(password)).not.toContain(SELFHOST_SQL_PASSWORD);
      }),
    makeTestLayer({environment: {variables: {MSSQL_SA_PASSWORD: SELFHOST_SQL_PASSWORD}}}).layer,
  );

  for (const value of [undefined, "", "   "]) {
    effectTest(
      `rejects a missing or blank SQL password (${JSON.stringify(value)})`,
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(getRequiredSqlPassword);

          // Assert
          expect(error).toMatchObject({
            _tag: "ContainerRuntimeError",
            message:
              "MSSQL_SA_PASSWORD environment variable is required for selfhost SQL bootstrap. Set it in your shell/session environment only; do not commit it to .env files, launch profiles, or source control.",
          });
        }),
      makeTestLayer({environment: {variables: value === undefined ? {} : {MSSQL_SA_PASSWORD: value}}}).layer,
    );
  }
});

describe("runSelfhost start", () => {
  selfhostTest("runs preflight, then the exact engine-owned stack and bootstrap commands in order", {}, (fixture) =>
    Effect.gen(function* () {
      // Act
      const result = yield* runSelfhost({action: "start", engine: "podman"});

      // Assert
      expect(result).toEqual({action: "start", engine: "podman", stacks: ["management", "storage", "profile", "backend", "frontend"]});
      expect(businessCalls(fixture)).toEqual([
        "podman compose -f Management/docker-compose.yml up -d",
        "podman compose -f Storage/docker-compose.yml --profile selfhost up -d",
        "podman exec -e SQLCMDPASSWORD mssql /opt/mssql-tools/bin/sqlcmd -C -S localhost -U sa -d master -i /usr/sql/sqlSchema.sql -No",
        "dotnet run --project ../../tooling/LocalDevelopment.Bootstrap -- --ensure-storage-only",
        "podman compose -f Backend/docker-compose.yml up -d",
        "podman compose -f Frontend/docker-compose.yml up -d",
      ]);
      expect(fixture.harness.processCalls().at(-1)?.options).toEqual({cwd: "infra/Local", output: "tee", echo: false});
    }),
  );

  selfhostTest("waits 10 seconds for storage readiness and 3 seconds after each stack operation", {}, (fixture) =>
    Effect.gen(function* () {
      // Act
      yield* runSelfhost({action: "start", engine: "podman"});

      // Assert
      expect(delays(fixture)).toEqual([3_000, 10_000, 3_000, 3_000, 3_000]);
    }),
  );

  selfhostTest("bootstraps SQL, Cosmos, Azurite, and local storage in order after the storage wait", {}, (fixture) =>
    Effect.gen(function* () {
      // Act
      yield* runSelfhost({action: "start", engine: "podman"});

      // Assert
      const steps = fixture
        .timeline()
        .map((event) => event["process"] ?? event["http"] ?? event["blob"] ?? ("delay" in event ? "delay" : event["fs"]));
      const storage = steps.indexOf("delay", steps.indexOf("delay") + 1);
      expect(steps.slice(storage, storage + 9)).toEqual([
        "delay",
        "podman",
        "POST",
        "POST",
        "POST",
        "connect",
        "ensureContainer",
        "applyCorsPolicy",
        "dotnet",
      ]);
      expect(fixture.harness.processCalls().find((call) => call.request.command === "dotnet")?.options.env).toEqual({
        DOTNET_ENVIRONMENT: "Development",
        INFRA: "local",
        ConnectionStrings__blobs: "UseDevelopmentStorage=true",
        ConnectionStrings__queues: "UseDevelopmentStorage=true",
      });
    }),
  );

  selfhostTest("generates taxonomy artifacts silently, once, after preflight and before any stack command", {}, (fixture) =>
    Effect.gen(function* () {
      // Act
      yield* runSelfhost({action: "start", engine: "podman"});

      // Assert
      const commands = fixture.harness.processCalls().map((call) => call.request.command);
      expect(commands.filter((command) => command === "unzip")).toHaveLength(1);
      expect(commands.indexOf("unzip")).toBe(podmanPreflightProbeCount);
      expect(fixture.harness.httpCalls()).toHaveLength(3);
      expect(fixture.harness.output().some((record) => record.text.includes("artifact"))).toBe(false);
    }),
  );

  selfhostTest("stops before any stack command when the artifact prerequisite fails", {taxonomy: "unavailable"}, (fixture) =>
    Effect.gen(function* () {
      // Act
      const error = yield* Effect.flip(runSelfhost({action: "start", engine: "podman"}));

      // Assert
      expect(error._tag).toBe("TaxonomySourceUnavailable");
      expect(formatCalls(fixture)).toHaveLength(podmanPreflightProbeCount);
      expect(fixture.traefik()).toBeNull();
    }),
  );

  selfhostTest("requires the SQL password before starting any stack", {variables: {}}, (fixture) =>
    Effect.gen(function* () {
      // Act
      const error = yield* Effect.flip(runSelfhost({action: "start", engine: "podman"}));

      // Assert
      expect(error).toMatchObject({_tag: "ContainerRuntimeError"});
      expect(error.message).toContain("MSSQL_SA_PASSWORD environment variable is required");
      expect(formatCalls(fixture)).toHaveLength(podmanPreflightProbeCount);
      expect(fixture.cosmosCalls()).toEqual([]);
      expect(fixture.traefik()).toBeNull();
    }),
  );

  selfhostTest("writes the generated Traefik config and keeps it as requested persistent state", {}, (fixture) =>
    Effect.gen(function* () {
      // Act
      yield* runSelfhost({action: "start", engine: "podman"});

      // Assert
      expect(fixture.traefik()).toContain("website-localhost");
    }),
  );

  selfhostTest(
    "keeps started stacks and the generated Traefik config when a later stack fails",
    {
      process: (_command, args) =>
        args.includes("Frontend/docker-compose.yml") ? exited(1, "frontend stack refused to start") : succeededAnswer(),
    },
    (fixture) =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(runSelfhost({action: "start", engine: "podman"}));

        // Assert
        expect(error._tag).toBe("ProcessExited");
        expect(fixture.traefik()).not.toBeNull();
        expect(businessCalls(fixture).some((call) => call.includes("down"))).toBe(false);
        expect(businessCalls(fixture)).toHaveLength(6);
      }),
  );

  selfhostTest(
    "fails with a step-only message when the SQL schema bootstrap fails",
    {process: (_command, args) => (args.includes("/opt/mssql-tools/bin/sqlcmd") ? exited(1) : succeededAnswer())},
    (fixture) =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(runSelfhost({action: "start", engine: "podman"}));

        // Assert
        expect(error).toMatchObject({
          _tag: "ContainerRuntimeError",
          message: "SQL Server schema bootstrap failed: podman exec mssql sqlcmd exited with code 1.",
        });
        expect(fixture.cosmosCalls()).toEqual([]);
      }),
  );

  for (const [answer, expected] of [
    [{kind: "signalled", signal: "SIGKILL", stdout: "", stderr: "", durationMs: 0}, "was terminated by SIGKILL."],
    [{kind: "spawn-failed", message: "spawn podman ENOENT", stdout: "", stderr: "", durationMs: 0}, "failed to start."],
    [{kind: "timed-out", stdout: "", stderr: "", durationMs: 0}, "timed out."],
  ] as const satisfies readonly (readonly [ProbeOutcome, string])[]) {
    selfhostTest(
      `describes a ${answer.kind} SQL schema bootstrap without its command line`,
      {process: (_command, args) => (args.includes("/opt/mssql-tools/bin/sqlcmd") ? answer : succeededAnswer())},
      () =>
        Effect.gen(function* () {
          // Act
          const error = yield* Effect.flip(runSelfhost({action: "start", engine: "podman"}));

          // Assert
          expect(error.message).toBe(`SQL Server schema bootstrap failed: podman exec mssql sqlcmd ${expected}`);
        }),
    );
  }

  selfhostTest(
    "bounds the cosmos bootstrap response",
    {cosmos: () => ({status: 201, body: "x".repeat(cosmosBootstrapMaximumResponseBytes + 1)})},
    (fixture) =>
      Effect.gen(function* () {
        // Act
        const error = yield* Effect.flip(runSelfhost({action: "start", engine: "podman"}));

        // Assert
        expect(error).toMatchObject({
          _tag: "ContainerRuntimeError",
          message:
            "Cosmos bootstrap failed. Ensure the cosmosdb container is running and reachable at http://localhost:8081. Original error: Response exceeded the 65536 byte limit.",
        });
        expect(fixture.cosmosCalls()).toEqual(["/dbs"]);
      }),
  );

  {
    const fixture = selfhostFixture({cosmos: () => "never"});
    effectTest(
      "stops the bootstrap immediately and keeps the Traefik config when interrupted",
      () =>
        Effect.gen(function* () {
          // Arrange
          const fiber = yield* forkStartUntil(fixture, () => fixture.cosmosCalls().length > 0);
          yield* TestClock.adjust(Duration.seconds(6));

          // Act
          const exit = yield* Fiber.interrupt(fiber).pipe(Effect.andThen(Fiber.await(fiber)));
          yield* TestClock.adjust(Duration.seconds(30));

          // Assert
          expect(Exit.hasInterrupts(exit)).toBe(true);
          expect(fixture.cosmosCalls()).toEqual(["/dbs"]);
          expect(fixture.timeline().some((event) => "blob" in event)).toBe(false);
          expect(formatCalls(fixture).some((call) => call.startsWith("dotnet"))).toBe(false);
          // Requested persistent state, as in the legacy command: no compensating cleanup.
          expect(fixture.traefik()).not.toBeNull();
        }),
      fixture.harness.layer,
    );
  }

  {
    const fixture = selfhostFixture();
    effectTest(
      "stops during the storage readiness wait when interrupted",
      () =>
        Effect.gen(function* () {
          // Arrange
          const fiber = yield* forkStartUntil(fixture, () =>
            formatCalls(fixture).some((call) => call.includes("Storage/docker-compose.yml")),
          );
          yield* TestClock.adjust(Duration.seconds(5));

          // Act
          const exit = yield* Fiber.interrupt(fiber).pipe(Effect.andThen(Fiber.await(fiber)));
          yield* TestClock.adjust(Duration.seconds(30));

          // Assert
          expect(Exit.hasInterrupts(exit)).toBe(true);
          expect(businessCalls(fixture)).toEqual([
            "podman compose -f Management/docker-compose.yml up -d",
            "podman compose -f Storage/docker-compose.yml --profile selfhost up -d",
          ]);
          expect(fixture.cosmosCalls()).toEqual([]);
          expect(delays(fixture)).toEqual([3_000]);
        }),
      fixture.harness.layer,
    );
  }
});

/**
 * Forks an instrumented `runSelfhost({action: "start"})` and advances the test clock until `ready`.
 *
 * @param fixture - The selfhost fixture.
 * @param ready - Decides when the run reached the step under test.
 * @returns The running fiber.
 */
function forkStartUntil(
  fixture: SelfhostFixture,
  ready: () => boolean,
): Effect.Effect<Fiber.Fiber<unknown, unknown>, never, PlatformServices | TestClock.TestClock> {
  return Effect.gen(function* () {
    const fiber = yield* Effect.forkChild(fixture.instrument(runSelfhost({action: "start", engine: "podman"})));
    while (!ready()) {
      yield* TestClock.adjust(Duration.millis(500));
      yield* Effect.promise(() => new Promise<void>((settle) => setTimeout(settle, 0)));
    }
    return fiber;
  });
}

describe("runSelfhost HTTPS certificates", () => {
  selfhostTest("generates trusted localhost certificates through mkcert when they are missing", {files: {}}, (fixture) =>
    Effect.gen(function* () {
      // Act
      yield* runSelfhost({action: "start", engine: "podman"});

      // Assert
      expect(businessCalls(fixture).slice(0, 3)).toEqual([
        "mkcert --version",
        "mkcert -install",
        "mkcert -key-file Management/certs/local-key.pem -cert-file Management/certs/local-cert.pem localhost *.localhost",
      ]);
      const calls = fixture.harness.processCalls().filter((call) => call.request.command === "mkcert");
      expect(calls.map((call) => call.options)).toEqual([
        {},
        {cwd: "infra/Local", output: "tee", echo: false},
        {cwd: "infra/Local", output: "tee", echo: false},
      ]);
      expect(fixture.timeline().filter((event) => event["fs"] === "makeDirectory")[0]).toEqual({
        fs: "makeDirectory",
        path: "infra/Local/Management/certs",
        options: {recursive: true},
      });
    }),
  );

  selfhostTest(
    "warns and continues with Traefik defaults when mkcert is unavailable",
    {files: {}, process: (command) => (command === "mkcert" ? exited(1, "mkcert: command not found") : succeededAnswer())},
    (fixture) =>
      Effect.gen(function* () {
        // Act
        const result = yield* runSelfhost({action: "start", engine: "podman"});

        // Assert
        expect(result.action).toBe("start");
        expect(businessCalls(fixture)).toEqual([
          "mkcert --version",
          "podman compose -f Management/docker-compose.yml up -d",
          "podman compose -f Storage/docker-compose.yml --profile selfhost up -d",
          "podman exec -e SQLCMDPASSWORD mssql /opt/mssql-tools/bin/sqlcmd -C -S localhost -U sa -d master -i /usr/sql/sqlSchema.sql -No",
          "dotnet run --project ../../tooling/LocalDevelopment.Bootstrap -- --ensure-storage-only",
          "podman compose -f Backend/docker-compose.yml up -d",
          "podman compose -f Frontend/docker-compose.yml up -d",
        ]);
        expect(fixture.harness.output().some((record) => record.text.includes("mkcert is not available"))).toBe(true);
      }),
  );
});

describe("runSelfhost stop", () => {
  selfhostTest(
    "stops stacks in reverse order, removes the generated Traefik config, and skips artifacts and bootstrap",
    {variables: {}, files: {"infra/Local/Management/traefik/dynamic/selfhost-services.yml": "generated"}},
    (fixture) =>
      Effect.gen(function* () {
        // Act
        const result = yield* runSelfhost({action: "stop", engine: "podman"});

        // Assert
        expect(result).toEqual({action: "stop", engine: "podman", stacks: ["frontend", "backend", "storage", "management"]});
        expect(businessCalls(fixture)).toEqual([
          "podman compose -f Frontend/docker-compose.yml down",
          "podman compose -f Backend/docker-compose.yml down",
          "podman compose -f Storage/docker-compose.yml down",
          "podman compose -f Management/docker-compose.yml down",
        ]);
        expect(delays(fixture)).toEqual([3_000, 3_000, 3_000, 3_000]);
        expect(fixture.harness.httpCalls()).toEqual([]);
        expect(fixture.cosmosCalls()).toEqual([]);
        expect(fixture.traefik()).toBeNull();
      }),
  );
});

describe("runSelfhost logs", () => {
  selfhostTest("tails the exact logs targets without waits, artifacts, bootstrap, or Traefik changes", {}, (fixture) =>
    Effect.gen(function* () {
      // Act
      const result = yield* runSelfhost({action: "logs", engine: "podman"});

      // Assert
      expect(result).toEqual({action: "logs", engine: "podman", stacks: ["profile", "backend", "frontend"]});
      expect(businessCalls(fixture)).toEqual([
        "podman logs --tail 100 exp-arolariu-ro",
        "podman logs --tail 100 api-arolariu-ro",
        "podman logs --tail 100 website-arolariu-ro",
      ]);
      expect(delays(fixture)).toEqual([]);
      expect(fixture.harness.httpCalls()).toEqual([]);
      expect(fixture.traefik()).toBeNull();
    }),
  );
});

describe("runSelfhost engine selection", () => {
  selfhostTest(
    "resolves the engine from the environment when no override is supplied",
    {variables: {AROLARIU_CONTAINER_ENGINE: "rancher"}},
    (fixture) =>
      Effect.gen(function* () {
        // Act
        const result = yield* runSelfhost({action: "logs"});

        // Assert
        expect(result.engine).toBe("rancher");
        expect(formatCalls(fixture).at(-1)).toBe("docker logs --tail 100 website-arolariu-ro");
      }),
  );

  selfhostTest("rejects the deprecated docker engine value without running anything", {}, (fixture) =>
    Effect.gen(function* () {
      // Act
      const error = yield* Effect.flip(runSelfhost({action: "logs", engine: "docker" as never}));

      // Assert
      expect(error.message).toContain("Docker Desktop is deprecated");
      expect(fixture.harness.processCalls()).toHaveLength(0);
    }),
  );
});

/**
 * A successful process answer with empty output.
 *
 * @returns The outcome.
 */
function succeededAnswer(): ProbeOutcome {
  return {kind: "succeeded", exitCode: 0, stdout: "", stderr: "", durationMs: 0};
}

// ============================================================================
// Characterization (R1 pins, now through the Effect `dev selfhost` CLI path)
// ============================================================================

/**
 * Runs `dev selfhost <action> --engine rancher` once through the real CLI path.
 *
 * @param action - Selfhost action.
 * @param options - Fixture options.
 * @param flags - Extra global flags (`--json`, `--verbose`).
 * @returns The exit code, rendered output, ordered timeline, taxonomy request count, Traefik bytes,
 * and where the SQL password appeared in process arguments.
 */
async function characterizeSelfhost(
  action: SelfhostAction,
  options: SelfhostFixtureOptions = {},
  flags: readonly string[] = [],
): Promise<Readonly<Record<string, unknown>>> {
  const fixture = selfhostFixture(options);

  const exit = await fixture.runCli(["dev", "selfhost", action, "--engine", "rancher", ...flags]);

  const output = fixture.harness.output().map((record) => ({stream: record.stream, text: record.text.replace(/\n$/u, "")}));
  expect(JSON.stringify(output).includes(SELFHOST_SQL_PASSWORD)).toBe(false);
  return {
    exitCode: exitCodeFor(exit, undefined),
    output,
    timeline: fixture.timeline(),
    taxonomyRequests: fixture.harness.httpCalls().length,
    traefik: fixture.traefik(),
    passwordArgs: fixture.harness
      .processCalls()
      .filter((call) => call.request.command !== "unzip")
      .flatMap((call, index) =>
        call.request.args.flatMap((arg, position) =>
          arg.includes(SELFHOST_SQL_PASSWORD)
            ? [
                {
                  call: index,
                  index: position,
                  command: call.request.command,
                  flag: call.request.args[position - 1],
                  exact: arg === SELFHOST_SQL_PASSWORD,
                },
              ]
            : [],
        ),
      ),
  };
}

/** Recorded options of the full-output preflight probes. */
const PROBE = {failureOutput: "full"} as const;

/** Recorded options of every echoed, tee'd selfhost command. */
const TEE = {cwd: "infra/Local", output: "tee", echo: false} as const;

/** The Rancher preflight probes. */
const RANCHER_PREFLIGHT = [
  {process: "docker", args: ["--version"], options: PROBE},
  {process: "docker", args: ["version"], options: PROBE},
  {process: "docker", args: ["compose", "version"], options: PROBE},
  {process: "docker", args: ["ps", "-a", "--format", "{{.Names}}"], options: {}},
] as const;

/** The artifact generation's archive extraction (the legacy nested artifacts invocation). */
const ARTIFACTS = {process: "unzip", args: ["-qq", "<archive>", "-d", "<directory>"], options: {output: "capture"}} as const;

/** The atomic Traefik write (the legacy `createDirectory` + `writeText`). */
const TRAEFIK_WRITE = [
  {fs: "makeDirectory", path: "<traefik-dir>", options: {recursive: true}},
  {fs: "writeFileString", path: "<traefik-tmp>", length: 1310},
  {fs: "rename", from: "<traefik-tmp>", to: "<traefik-config>"},
] as const;

/** The SQL schema bootstrap: the password travels only in the engine client's `SQLCMDPASSWORD` (projected). */
const SQLCMD = {
  process: "docker",
  args: [
    "exec",
    "-e",
    "SQLCMDPASSWORD",
    "mssql",
    "/opt/mssql-tools/bin/sqlcmd",
    "-C",
    "-S",
    "localhost",
    "-U",
    "sa",
    "-d",
    "master",
    "-i",
    "/usr/sql/sqlSchema.sql",
    "-No",
  ],
  options: {cwd: "infra/Local", env: {SQLCMDPASSWORD: "<sql-password>"}, output: "tee", echo: false},
} as const;

/** The three Cosmos provisioning requests. */
const COSMOS = [
  {
    http: "POST",
    url: "http://localhost:8081/dbs",
    headers: {"Content-Type": "application/json"},
    body: '{"id":"primary"}',
  },
  {
    http: "POST",
    url: "http://localhost:8081/dbs/primary/colls",
    headers: {"Content-Type": "application/json"},
    body: '{"id":"invoices","partitionKey":{"paths":["/UserIdentifier"],"kind":"Hash"}}',
  },
  {
    http: "POST",
    url: "http://localhost:8081/dbs/primary/colls",
    headers: {"Content-Type": "application/json"},
    body: '{"id":"merchants","partitionKey":{"paths":["/ParentCompanyId"],"kind":"Hash"}}',
  },
] as const;

/** The successful start timeline from preflight to the last stack pause. */
const START_TIMELINE = [
  ...RANCHER_PREFLIGHT,
  ARTIFACTS,
  ...TRAEFIK_WRITE,
  {process: "docker", args: ["compose", "-f", "Management/docker-compose.yml", "up", "-d"], options: TEE},
  {delay: 3000},
  {process: "docker", args: ["compose", "-f", "Storage/docker-compose.yml", "--profile", "selfhost", "up", "-d"], options: TEE},
  {delay: 10000},
  SQLCMD,
  ...COSMOS,
  {blob: "connect", connectionString: "UseDevelopmentStorage=true"},
  {blob: "ensureContainer", name: "invoices"},
  {blob: "applyCorsPolicy"},
  {
    process: "dotnet",
    args: ["run", "--project", "../../tooling/LocalDevelopment.Bootstrap", "--", "--ensure-storage-only"],
    options: {
      ...TEE,
      env: {
        DOTNET_ENVIRONMENT: "Development",
        INFRA: "local",
        ConnectionStrings__blobs: "UseDevelopmentStorage=true",
        ConnectionStrings__queues: "UseDevelopmentStorage=true",
      },
    },
  },
  {delay: 3000},
  {process: "docker", args: ["compose", "-f", "Backend/docker-compose.yml", "up", "-d"], options: TEE},
  {delay: 3000},
  {process: "docker", args: ["compose", "-f", "Frontend/docker-compose.yml", "up", "-d"], options: TEE},
  {delay: 3000},
];

/** The generated Traefik file bytes. */
const TRAEFIK_CONFIG =
  "http:\n  routers:\n    traefik-localhost:\n      rule: Host(`traefik.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: api@internal\n    website-localhost:\n      rule: Host(`website.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: website\n    api-localhost:\n      rule: Host(`api.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: api\n    health-localhost:\n      rule: Host(`health.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: healthchecks\n    cosmosdb-localhost:\n      rule: Host(`cosmosdb.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: cosmosdb\n    azurite-blob-localhost:\n      rule: Host(`azurite-blob.localhost`)\n      entryPoints:\n        - websecure\n      tls: {}\n      service: azurite-blob\n  services:\n    website:\n      loadBalancer:\n        servers:\n          - url: http://website:3000\n    api:\n      loadBalancer:\n        servers:\n          - url: http://api:8080\n    healthchecks:\n      loadBalancer:\n        servers:\n          - url: http://healthchecks:8000\n    cosmosdb:\n      loadBalancer:\n        servers:\n          - url: http://cosmosdb:8081\n    azurite-blob:\n      loadBalancer:\n        servers:\n          - url: http://azurite:10000\n";

/** The SQL password never reaches an argument vector. */
const PASSWORD_ARGS: readonly unknown[] = [];

/** The echo line of the SQL schema bootstrap. */
const SQLCMD_ECHO =
  "$ docker exec -e SQLCMDPASSWORD mssql /opt/mssql-tools/bin/sqlcmd -C -S localhost -U sa -d master -i /usr/sql/sqlSchema.sql -No";

describe("dev selfhost characterization", () => {
  it("start: preflight, artifacts, certificates, Traefik file, ordered stacks, bootstrap, and success line", async () => {
    expect(await characterizeSelfhost("start")).toEqual({
      exitCode: 0,
      output: [
        {stream: "stdout", text: "$ docker compose -f Management/docker-compose.yml up -d"},
        {stream: "stdout", text: "$ docker compose -f Storage/docker-compose.yml --profile selfhost up -d"},
        {stream: "stdout", text: SQLCMD_ECHO},
        {stream: "stdout", text: "$ dotnet run --project ../../tooling/LocalDevelopment.Bootstrap -- --ensure-storage-only"},
        {stream: "stdout", text: "$ docker compose -f Backend/docker-compose.yml up -d"},
        {stream: "stdout", text: "$ docker compose -f Frontend/docker-compose.yml up -d"},
        {stream: "stdout", text: "[arolariu::selfhost] ✅ Selfhost start completed for engine 'rancher'."},
      ],
      timeline: START_TIMELINE,
      taxonomyRequests: 3,
      traefik: TRAEFIK_CONFIG,
      passwordArgs: PASSWORD_ARGS,
    });
  });

  // Intentional change (cohort 6 ruling): an unreported typed failure renders through the root
  // renderer as `[arolariu::cli] ⛔ …` (legacy: `[arolariu::selfhost] ⛔ …`); the message is unchanged.
  it("start with a failing Cosmos bootstrap: exit 1, the message, and no compensating cleanup", async () => {
    expect(
      await characterizeSelfhost("start", {
        cosmos: (path) => (path === "/dbs" ? {status: 503, body: "emulator starting"} : {status: 201, body: "{}"}),
      }),
    ).toEqual({
      exitCode: 1,
      output: [
        {stream: "stdout", text: "$ docker compose -f Management/docker-compose.yml up -d"},
        {stream: "stdout", text: "$ docker compose -f Storage/docker-compose.yml --profile selfhost up -d"},
        {stream: "stdout", text: SQLCMD_ECHO},
        {
          stream: "stderr",
          text: "[arolariu::cli] ⛔ Cosmos bootstrap failed. Ensure the cosmosdb container is running and reachable at http://localhost:8081. Original error: Cosmos bootstrap failed for http://localhost:8081/dbs: HTTP 503 emulator starting",
        },
      ],
      timeline: [
        ...RANCHER_PREFLIGHT,
        ARTIFACTS,
        ...TRAEFIK_WRITE,
        {process: "docker", args: ["compose", "-f", "Management/docker-compose.yml", "up", "-d"], options: TEE},
        {delay: 3000},
        {process: "docker", args: ["compose", "-f", "Storage/docker-compose.yml", "--profile", "selfhost", "up", "-d"], options: TEE},
        {delay: 10000},
        SQLCMD,
        COSMOS[0],
      ],
      taxonomyRequests: 3,
      traefik: TRAEFIK_CONFIG,
      passwordArgs: PASSWORD_ARGS,
    });
  });

  it("start without MSSQL_SA_PASSWORD: exit 1 before any stack command", async () => {
    expect(await characterizeSelfhost("start", {variables: {}})).toEqual({
      exitCode: 1,
      output: [
        {
          stream: "stderr",
          text: "[arolariu::cli] ⛔ MSSQL_SA_PASSWORD environment variable is required for selfhost SQL bootstrap. Set it in your shell/session environment only; do not commit it to .env files, launch profiles, or source control.",
        },
      ],
      timeline: [...RANCHER_PREFLIGHT, ARTIFACTS],
      taxonomyRequests: 3,
      traefik: null,
      passwordArgs: [],
    });
  });

  it("stop: reverse-order compose down, then the Traefik file removal", async () => {
    expect(
      await characterizeSelfhost("stop", {
        files: {"infra/Local/Management/traefik/dynamic/selfhost-services.yml": "generated traefik config"},
      }),
    ).toEqual({
      exitCode: 0,
      output: [
        {stream: "stdout", text: "$ docker compose -f Frontend/docker-compose.yml down"},
        {stream: "stdout", text: "$ docker compose -f Backend/docker-compose.yml down"},
        {stream: "stdout", text: "$ docker compose -f Storage/docker-compose.yml down"},
        {stream: "stdout", text: "$ docker compose -f Management/docker-compose.yml down"},
        {stream: "stdout", text: "[arolariu::selfhost] ✅ Selfhost stop completed for engine 'rancher'."},
      ],
      timeline: [
        ...RANCHER_PREFLIGHT,
        {process: "docker", args: ["compose", "-f", "Frontend/docker-compose.yml", "down"], options: TEE},
        {delay: 3000},
        {process: "docker", args: ["compose", "-f", "Backend/docker-compose.yml", "down"], options: TEE},
        {delay: 3000},
        {process: "docker", args: ["compose", "-f", "Storage/docker-compose.yml", "down"], options: TEE},
        {delay: 3000},
        {process: "docker", args: ["compose", "-f", "Management/docker-compose.yml", "down"], options: TEE},
        {delay: 3000},
        {fs: "remove", path: "<traefik-config>", options: {force: true}},
      ],
      taxonomyRequests: 0,
      traefik: null,
      passwordArgs: [],
    });
  });

  it("logs: engine-owned logs commands without delays, artifacts, or Traefik changes", async () => {
    expect(await characterizeSelfhost("logs")).toEqual({
      exitCode: 0,
      output: [
        {stream: "stdout", text: "$ docker logs --tail 100 exp-arolariu-ro"},
        {stream: "stdout", text: "$ docker logs --tail 100 api-arolariu-ro"},
        {stream: "stdout", text: "$ docker logs --tail 100 website-arolariu-ro"},
        {stream: "stdout", text: "[arolariu::selfhost] ✅ Selfhost logs completed for engine 'rancher'."},
      ],
      timeline: [
        ...RANCHER_PREFLIGHT,
        {process: "docker", args: ["logs", "--tail", "100", "exp-arolariu-ro"], options: TEE},
        {process: "docker", args: ["logs", "--tail", "100", "api-arolariu-ro"], options: TEE},
        {process: "docker", args: ["logs", "--tail", "100", "website-arolariu-ro"], options: TEE},
      ],
      taxonomyRequests: 0,
      traefik: null,
      passwordArgs: [],
    });
  });

  // Intentional change (cohort 6 ledger): legacy started and bootstrapped every stack, then failed
  // with exit 1 ("selected JSON presentation without a JSON document"); the Effect command writes the
  // result as the single JSON document and exits 0.
  it("start (json): every stack starts and bootstrap runs, then the result is the single JSON document and the exit code is 0", async () => {
    expect(await characterizeSelfhost("start", {}, ["--json"])).toEqual({
      exitCode: 0,
      output: [
        {
          stream: "stdout",
          text: JSON.stringify(
            {action: "start", engine: "rancher", stacks: ["management", "storage", "profile", "backend", "frontend"]},
            null,
            2,
          ),
        },
      ],
      timeline: START_TIMELINE,
      taxonomyRequests: 3,
      traefik: TRAEFIK_CONFIG,
      passwordArgs: PASSWORD_ARGS,
    });
  });

  it("stack exit: one diagnostic without evidence, exit 1", async () => {
    expect(
      await characterizeSelfhost("logs", {
        process: (_command, args) => (args.includes("api-arolariu-ro") ? exited(4, "no such container") : succeededAnswer()),
      }),
    ).toMatchObject({
      exitCode: 1,
      output: [
        {stream: "stdout", text: "$ docker logs --tail 100 exp-arolariu-ro"},
        {stream: "stdout", text: "$ docker logs --tail 100 api-arolariu-ro"},
        {stream: "stderr", text: "no such container"},
        {stream: "stderr", text: "[arolariu::selfhost] ⛔ docker exited with code 4"},
      ],
    });
  });
});
