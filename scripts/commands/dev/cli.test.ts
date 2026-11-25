// @vitest-environment node
/**
 * @fileoverview Tests for the effect/cli `dev` command group.
 * @module scripts/commands/dev/cli.test
 *
 * @remarks
 * Each case runs a real `runCli` invocation on the in-memory harness. `dev aspire` runs the Effect
 * program over scripted processes (the repository `package.json` is seeded for engine selection);
 * `dev selfhost` runs the Effect program on the `selfhostFixture` harness, whose recording
 * `LocalBlobStorage` layer stands in for the Azure Blob SDK. No module is mocked.
 */

import {Effect} from "effect";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import {SELFHOST_SQL_PASSWORD, selfhostFixture} from "../../container-runtime/selfhost.testing.ts";
import {beginWorktreeLaunch, recordWorktreeOwnership, worktreeProcessReceipt} from "../../container-runtime/worktreeAspire.ts";
import {claimWorktreeLaunch, publishWorktreeJson, readWorktreeJson, WorktreePlatform} from "../../container-runtime/worktreeLease.ts";
import {leaseFixture} from "../../container-runtime/worktreeLease.testing.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import {makeTestLayer, type RecordedProcessCall} from "../../platform/testing.ts";
import {makeDevCommand} from "./cli.ts";

/** Outcome of one `dev aspire` invocation and its process calls. */
interface DevRun {
  readonly code: CommandExitCode;
  readonly calls: readonly RecordedProcessCall[];
}

/**
 * Runs `dev aspire` against `argv`; every process succeeds with no output.
 *
 * @param argv - Arguments after the program name.
 * @param variables - Environment variables of the harness.
 * @returns The exit code and the recorded process calls.
 */
async function run(argv: readonly string[], variables: Readonly<Record<string, string>> = {}): Promise<DevRun> {
  const harness = makeTestLayer({
    files: {"package.json": JSON.stringify({name: "@arolariu/monorepo"})},
    environment: {variables},
    processes: [{match: () => true, respond: {stdout: "", stderr: "", durationMs: 0}}],
  });
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeDevCommand()])).pipe(Effect.provide(harness.layer)));
  return {code: exitCodeFor(exit, undefined), calls: harness.processCalls()};
}

/**
 * Runs `dev selfhost` against `argv` on a selfhost fixture.
 *
 * @param argv - Arguments after the program name.
 * @returns The exit code, the formatted engine calls, and the rendered lines.
 */
async function runSelfhostCli(argv: readonly string[]): Promise<{
  readonly code: CommandExitCode;
  readonly calls: readonly string[];
  readonly lines: readonly string[];
}> {
  const fixture = selfhostFixture({variables: {MSSQL_SA_PASSWORD: SELFHOST_SQL_PASSWORD, AROLARIU_CONTAINER_ENGINE: "podman"}});
  const exit = await fixture.runCli(argv);
  return {
    code: exitCodeFor(exit, undefined),
    calls: fixture.harness
      .processCalls()
      .filter((call) => call.request.command !== "unzip")
      .map((call) => [call.request.command, ...call.request.args].join(" ")),
    lines: fixture.harness.output().map((record) => record.text.trimEnd()),
  };
}

describe("dev command", () => {
  it.each([
    ["dev", "worktree"],
    ["dev", "aspire", "worktree"],
  ])("reports blocked worktree preflight as one JSON document (%s)", async (...prefix) => {
    const harness = makeTestLayer({environment: {platform: "win32", cwd: "C:/repo"}});
    const argv = [...prefix, "preflight", "--engine", "podman", "--expected-root", "C:/missing", "--json"];

    const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeDevCommand()])).pipe(Effect.provide(harness.layer)));

    expect(exitCodeFor(exit, undefined)).toBe(1);
    const stdout = harness
      .output()
      .filter((record) => record.stream === "stdout")
      .map((record) => record.text);
    expect(stdout).toHaveLength(1);
    expect(JSON.parse(stdout.join(""))).toMatchObject({
      status: "blocked",
      checkout: null,
      capabilities: [{id: "checkout", status: "blocked"}],
    });
    expect(harness.processCalls()).toEqual([]);
  });

  it.each([[], ["--engine", "rancher"]])("requires explicit Podman for worktree preflight", async (...engine) => {
    const result = await run(["dev", "worktree", "preflight", ...engine], {AROLARIU_CONTAINER_ENGINE: "podman"});

    expect(result.code).toBe(2);
    expect(result.calls).toEqual([]);
  });

  it.each([
    ["status", ["dev", "worktree"]],
    ["stop", ["dev", "worktree"]],
    ["status", ["dev", "aspire", "worktree"]],
    ["stop", ["dev", "aspire", "worktree"]],
  ] as const)("blocks scoped %s outside an observed checkout (%j)", async (action, prefix) => {
    const harness = makeTestLayer({environment: {platform: "linux"}});
    const exit = await Effect.runPromiseExit(
      runCli([...prefix, action, "--engine", "podman", "--json"], makeRootCommand([makeDevCommand()])).pipe(Effect.provide(harness.layer)),
    );
    expect(exitCodeFor(exit, undefined)).toBe(1);
    const stdout = harness.output().filter(({stream}) => stream === "stdout");
    expect(stdout).toHaveLength(1);
    expect(JSON.parse(stdout[0]?.text ?? "")).toMatchObject({status: "blocked"});
    expect(harness.processCalls()).toEqual([]);
  });

  it.each([
    ["start", "--engine", "podman"],
    ["stop", "--engine", "podman", "--pid", "1234"],
    ["stop", "--engine", "podman", "--expected-root", "C:/another-worktree"],
    ["status", "--engine", "rancher"],
  ])("rejects unsupported scoped action or authority flags (%s)", async (...args) => {
    const result = await run(["dev", "worktree", ...args]);
    expect(result.code).toBe(2);
    expect(result.calls).toEqual([]);
  });

  it("does not expose scoped start through the npm dev alias", async () => {
    const result = await run(["dev", "aspire", "worktree", "start", "--engine", "podman"]);
    expect(result.code).toBe(2);
    expect(result.calls).toEqual([]);
  });

  it.each([
    ["--json", "worktree", "--verbose", "preflight", "--engine", "podman"],
    ["--json", "worktree", "--log-level", "warn", "preflight", "--engine", "podman"],
    ["--log-level", "none", "worktree", "status", "--json", "--engine=podman"],
    ["--verbose=false", "worktree", "--log-level=none", "stop", "--engine", "podman", "--json"],
    ["worktree", "preflight", "--engine", "podman", "--verbose", "--json"],
  ])("routes the npm worktree alias with global flags (%j)", async (...args) => {
    const harness = makeTestLayer({environment: {platform: "linux"}});
    const exit = await Effect.runPromiseExit(
      runCli(["dev", "aspire", ...args], makeRootCommand([makeDevCommand()])).pipe(Effect.provide(harness.layer)),
    );
    expect(exitCodeFor(exit, undefined)).toBe(1);
    const stdout = harness.output().filter(({stream}) => stream === "stdout");
    expect(stdout).toHaveLength(1);
    expect(JSON.parse(stdout[0]?.text ?? "")).toMatchObject({status: "blocked"});
    expect(harness.processCalls()).toEqual([]);
  });

  it.each([
    {args: ["--verbose", "worktree", "--help"], usage: "worktree <subcommand>", flag: "preflight"},
    {args: ["worktree", "--json", "stop", "-h"], usage: "worktree stop", flag: "--expected-run"},
    {args: ["--help", "worktree", "preflight"], usage: "worktree preflight", flag: "--expected-root"},
  ])("shows scoped help through the npm worktree alias ($usage)", async ({args, usage, flag}) => {
    const harness = makeTestLayer();
    const exit = await Effect.runPromiseExit(
      runCli(["dev", "aspire", ...args], makeRootCommand([makeDevCommand()])).pipe(Effect.provide(harness.layer)),
    );
    expect(exitCodeFor(exit, undefined)).toBe(0);
    const output = harness
      .output()
      .map(({text}) => text)
      .join("");
    expect(output).toContain(usage);
    expect(output).toContain(flag);
    expect(harness.processCalls()).toEqual([]);
  });

  it.each([
    ["--verbose", "worktree", "start", "--engine", "podman"],
    ["--json", "worktree", "--unknown", "status", "--engine", "podman"],
    ["--json=maybe", "worktree", "status", "--engine", "podman"],
    ["--log-level", "worktree", "status", "--engine", "podman"],
    ["--engine", "podman", "worktree", "status"],
    ["worktree", "stop", "--engine"],
    ["worktree", "status", "--engine", "podman", "extra"],
    ["--", "worktree", "status"],
  ])("rejects malformed npm worktree arguments without invoking legacy Aspire (%j)", async (...args) => {
    const result = await run(["dev", "aspire", ...args], {AROLARIU_CONTAINER_ENGINE: "podman"});
    expect(result.code).toBe(2);
    expect(result.calls).toEqual([]);
  });

  it.each(["b".repeat(32), "not-an-id?token=fake-token"])(
    "keeps guarded worktree stop blocked without verified authority",
    async (runId) => {
      const harness = makeTestLayer({environment: {platform: "linux"}});
      const argv = ["dev", "aspire", "worktree", "stop", "--engine", "podman", "--expected-run", runId, "--json"];

      const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeDevCommand()])).pipe(Effect.provide(harness.layer)));

      expect(exitCodeFor(exit, undefined)).toBe(1);
      const stdout = harness.output().filter(({stream}) => stream === "stdout");
      expect(stdout).toHaveLength(1);
      expect(JSON.parse(stdout[0]?.text ?? "")).toEqual({status: "blocked", reason: expect.any(String)});
      expect(stdout[0]?.text).not.toMatch(/fake-token|stopCommand|https?:/);
      expect(harness.processCalls()).toEqual([]);
    },
  );

  it.each(["absent", "matching", "stale"])("applies the expected-run guard in a canonical owned scope (%s)", async (guard) => {
    const fixture = await leaseFixture();
    try {
      const supervisor = {pid: 100, started: "638500000000000000", image: "offline-supervisor.exe"};
      const dispatchChecks: string[] = [];
      const processChecks: number[] = [];
      let observedProcess: typeof supervisor | null = supervisor;
      const platform = {
        ...fixture.platform,
        containers: {
          verifyCompleteDispatch: async ({runId}: {runId: string}) => {
            dispatchChecks.push(runId);
            return true;
          },
          inspect: async () => {
            throw new Error("No containers in the fixture");
          },
          removeExact: async () => {
            throw new Error("No removals authorized");
          },
        },
        processIdentity: async (pid: number) => {
          processChecks.push(pid);
          return observedProcess;
        },
      };
      const runScoped = <A, E>(effect: Effect.Effect<A, E, WorktreePlatform>) =>
        Effect.runPromise(effect.pipe(Effect.provideService(WorktreePlatform, platform)));
      const lease = await runScoped(claimWorktreeLaunch(fixture.checkout));
      const stage = await runScoped(beginWorktreeLaunch(lease));
      const receipt = worktreeProcessReceipt(lease, supervisor);
      const processPath = join(stage.directory, "process.json");
      const exitPath = join(stage.directory, "exit.json");
      const leasePath = join(fixture.directory, lease.scopeId, "lease.json");
      await publishWorktreeJson(processPath, {...receipt, boundPorts: lease.ports});
      await runScoped(recordWorktreeOwnership(lease, {phase: "owned", processIdentity: supervisor, boundPorts: lease.ports}));
      const files = [leasePath, stage.descriptor, processPath];
      const original = await Promise.all(files.map((path) => readFile(path)));
      dispatchChecks.length = processChecks.length = 0;
      if (guard !== "stale") {
        // Positively acknowledged prior cooperative shutdown; no actual child process is involved.
        await publishWorktreeJson(exitPath, {...receipt, reason: "stop"});
        observedProcess = null;
      }
      const staleId = `${lease.runId[0] === "b" ? "a" : "b"}${lease.runId.slice(1)}`;
      const flag = guard === "absent" ? [] : ["--expected-run", guard === "matching" ? lease.runId : staleId];
      const argv = ["dev", "aspire", "worktree", "stop", "--engine", "podman", "--json", ...flag];
      const harness = makeTestLayer({environment: {platform: "linux"}});
      const options = {worktreePlatform: Effect.succeed(platform)};
      const exit = await Effect.runPromiseExit(
        runCli(argv, makeRootCommand([makeDevCommand(options)])).pipe(Effect.provide(harness.layer)),
      );
      const stdout = harness.output().filter(({stream}) => stream === "stdout");

      expect(harness.processCalls()).toEqual([]);
      expect(stdout).toHaveLength(1);
      expect(await readWorktreeJson(join(stage.directory, "stop.json"))).toBeUndefined();
      if (guard === "stale") {
        expect(exitCodeFor(exit, undefined)).toBe(1);
        expect(JSON.parse(stdout[0]?.text ?? "")).toEqual({status: "blocked", reason: "The expected scoped run is not current."});
        expect(dispatchChecks).toEqual([]);
        expect(processChecks).toEqual([]);
        expect(await readWorktreeJson(exitPath)).toBeUndefined();
        expect(await Promise.all(files.map((path) => readFile(path)))).toEqual(original);
      } else {
        expect(exitCodeFor(exit, undefined)).toBe(0);
        expect(JSON.parse(stdout[0]?.text ?? "")).toEqual({status: "stopped", runId: lease.runId, preservedVolumes: lease.volumes});
        expect(dispatchChecks).toEqual([lease.runId]);
        expect(processChecks).toEqual([supervisor.pid]);
        expect(await readWorktreeJson(leasePath)).toBeUndefined();
      }
    } finally {
      await fixture.dispose();
    }
  });

  it("maps aspire engine", async () => {
    // Arrange
    const argv = ["dev", "aspire", "--log-level", "warn", "--engine", "rancher", "--verbose"];

    // Act
    const result = await run(argv, {AROLARIU_CONTAINER_ENGINE: "podman", ASPIRE_CONTAINER_RUNTIME: "podman"});

    // Assert
    expect(result.code).toBe(0);
    expect(result.calls[0]?.request).toEqual({command: "docker", args: ["--version"]});
    expect(result.calls.at(-1)?.request).toEqual({command: "dotnet", args: ["run", "--project", "tooling/src/AppHost"]});
    expect(result.calls.at(-1)?.options.env?.["ASPIRE_CONTAINER_RUNTIME"]).toBe("docker");
    expect(result.calls.at(-1)?.options.env?.["DOTNET_ASPIRE_CONTAINER_RUNTIME"]).toBe("docker");
  });

  it("omits the aspire engine when absent, so the environment selects it", async () => {
    // Arrange
    const argv = ["dev", "aspire"];

    // Act
    const result = await run(argv, {AROLARIU_CONTAINER_ENGINE: "podman"});

    // Assert
    expect(result.code).toBe(0);
    expect(result.calls[0]?.request).toEqual({command: "podman", args: ["--version"]});
    expect(result.calls.at(-1)?.options.env?.["ASPIRE_CONTAINER_RUNTIME"]).toBe("podman");
    expect(result.calls.at(-1)?.options.env?.["DOTNET_ASPIRE_CONTAINER_RUNTIME"]).toBe("podman");
  });

  it("defaults selfhost to start, with the engine from the environment", async () => {
    // Arrange
    const argv = ["dev", "selfhost"];

    // Act
    const result = await runSelfhostCli(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.calls[0]).toBe("podman --version");
    expect(result.calls).toContain("podman compose --podman-build-args=--format=docker -f Management/docker-compose.yml up -d");
    expect(result.lines.at(-1)).toBe("[arolariu::selfhost] ✅ Selfhost start completed for engine 'podman'.");
  });

  it("maps selfhost logs and the explicit engine", async () => {
    // Arrange
    const argv = ["dev", "selfhost", "logs", "--engine", "rancher"];

    // Act
    const result = await runSelfhostCli(argv);

    // Assert
    expect(result.code).toBe(0);
    expect(result.calls.slice(-3)).toEqual([
      "docker logs --tail 100 exp-arolariu-ro",
      "docker logs --tail 100 api-arolariu-ro",
      "docker logs --tail 100 website-arolariu-ro",
    ]);
    expect(result.lines.at(-1)).toBe("[arolariu::selfhost] ✅ Selfhost logs completed for engine 'rancher'.");
  });

  it("rejects an unknown selfhost action", async () => {
    // Arrange
    const argv = ["dev", "selfhost", "restart"];

    // Act
    const result = await runSelfhostCli(argv);

    // Assert
    expect(result.code).toBe(2);
    expect(result.calls).toEqual([]);
  });
});
