// @vitest-environment node
/**
 * @fileoverview Contract tests for the Effect status program.
 * @module scripts/commands/status/index.test
 *
 * @remarks
 * Every test runs the status program on the in-memory harness: the repository identity is a seeded
 * `package.json`, every process answers from keyed probe outcomes (an unscripted request dies), and
 * inspection is scripted — or, for the shared-session proof, the real `InspectionLive` over scripted
 * processes. Health comes from a fake doctor program passed to `collectStatusWith` /
 * `makeStatusCommand`, except where the real `runDoctor` is composed. No repository module is
 * mocked. Only the bounded disk-probe integration tests spawn real child processes.
 */

import {readFileSync} from "node:fs";
import {mkdir, mkdtemp, rm, symlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

import {Cause, Deferred, Duration, Effect, Exit, Fiber, Tracer} from "effect";
import {afterEach, describe, expect, it} from "vitest";

import {makeRootCommand, runCli} from "../../cli.ts";
import {createRepositoryPaths} from "../../common/repository-paths.ts";
import type {ProbeOutcome} from "../../inspection/probes.ts";
import type {InspectionOutcome} from "../../inspection/types.ts";
import type {WorkspaceFacts} from "../../inspection/workspace.ts";
import {exitCodeFor, type CommandExitCode} from "../../platform/exit.ts";
import {makeNodeLayer} from "../../platform/layers.ts";
import type {SinkRecord} from "../../platform/Output.ts";
import type {ProcessRequest} from "../../platform/Process.ts";
import {makeTestLayer, repositoryFixtureRoot, runScoped, scriptedOutcomes, type TestHarness} from "../../platform/testing.ts";
import {NetworkProbeLive} from "../doctor/NetworkProbe.ts";
import type {DoctorInput, DoctorReport} from "../doctor/types.ts";
import {makeStatusCommand} from "./cli.ts";
import {
  collectDisk,
  collectStatus,
  collectStatusWith,
  renderDashboard,
  type StatusDocument,
  type StatusDoctor,
  type StatusRequirements,
} from "./index.ts";

// ============================================================================
// Fixtures
// ============================================================================

const FIXTURE_ROOT = repositoryFixtureRoot;
const FIXTURE_PATHS = createRepositoryPaths(FIXTURE_ROOT);

const GIT_BRANCH_KEY = "git rev-parse --abbrev-ref HEAD";
const GIT_SHA_KEY = "git rev-parse --short HEAD";
const GIT_LOG_TIME_KEY = "git log -1 --format=%cr";
const GIT_LOG_MSG_KEY = "git log -1 --format=%s";
const GIT_STATUS_KEY = "git status --porcelain";
const NPM_AUDIT_KEY = "npm audit --json";
const NPM_OUTDATED_KEY = "npm outdated --json";
/** The harness environment reports `/usr/bin/node` as the running executable. */
const NODE_VERSION_KEY = "/usr/bin/node --version";

const DISK_NODE_MODULES_TARGET = join(FIXTURE_ROOT, "node_modules");
const DISK_NEXT_BUILD_TARGET = join(FIXTURE_ROOT, "sites", "arolariu.ro", ".next");
const DISK_COMPONENTS_DIST_TARGET = join(FIXTURE_ROOT, "packages", "components", "dist");

const CLEAN_AUDIT_STDOUT = JSON.stringify({metadata: {vulnerabilities: {critical: 0, high: 0, moderate: 0, low: 0}}});

/** The in-memory repository identity `resolveRepositoryPaths` resolves the fixture root from. */
const IDENTITY_FILES: Readonly<Record<string, string>> = {
  [join(FIXTURE_ROOT, "package.json")]: JSON.stringify({name: "@arolariu/monorepo"}, null, 2),
};

/**
 * The disk-size probe is `<node> --eval <script> <targetPath>`. The generated script text is an
 * implementation detail tests must not duplicate, so responses/calls are keyed on the target path.
 *
 * @param targetPath - Absolute path the probe measures.
 * @returns The keyed disk-probe identity.
 */
function diskProbeKey(targetPath: string): string {
  return `disk-probe ${targetPath}`;
}

function processKey(request: Readonly<ProcessRequest>): string {
  if (request.args[0] === "--eval") {
    return diskProbeKey(request.args.at(-1) ?? "");
  }
  return [request.command, ...request.args].join(" ");
}

function succeeded(stdout: string): ProbeOutcome {
  return {kind: "succeeded", exitCode: 0, stdout, stderr: "", durationMs: 1};
}

function exited(exitCode: number, stdout = "", stderr = ""): ProbeOutcome {
  return {kind: "exited", exitCode, stdout, stderr, durationMs: 1};
}

function timedOut(): ProbeOutcome {
  return {kind: "timed-out", stdout: "", stderr: "", durationMs: 1};
}

function spawnFailed(message: string): ProbeOutcome {
  return {kind: "spawn-failed", message, stdout: "", stderr: "", durationMs: 1};
}

function signalled(): ProbeOutcome {
  return {kind: "signalled", signal: "SIGTERM", stdout: "", stderr: "", durationMs: 1};
}

function baseResponses(): Map<string, ProbeOutcome> {
  return new Map<string, ProbeOutcome>([
    [GIT_BRANCH_KEY, succeeded("main\n")],
    [GIT_SHA_KEY, succeeded("abc1234\n")],
    [GIT_LOG_TIME_KEY, succeeded("2 hours ago\n")],
    [GIT_LOG_MSG_KEY, succeeded("chore: something\n")],
    [GIT_STATUS_KEY, succeeded("")],
    [NPM_AUDIT_KEY, succeeded(CLEAN_AUDIT_STDOUT)],
    // A successful `npm outdated --json` run always writes a JSON object — "{}" when nothing is
    // outdated — never empty stdout; see the "npm outdated" regression tests below.
    [NPM_OUTDATED_KEY, succeeded("{}")],
    [NODE_VERSION_KEY, succeeded("v26.3.1\n")],
    [diskProbeKey(DISK_NODE_MODULES_TARGET), succeeded("1024")],
    [diskProbeKey(DISK_NEXT_BUILD_TARGET), succeeded("2048")],
    [diskProbeKey(DISK_COMPONENTS_DIST_TARGET), succeeded("512")],
  ]);
}

function withOverrides(overrides: Readonly<Record<string, ProbeOutcome>>): Map<string, ProbeOutcome> {
  const responses = baseResponses();
  for (const [key, value] of Object.entries(overrides)) {
    responses.set(key, value);
  }
  return responses;
}

/** The ten status probes of a JSON run, sorted. */
const JSON_PROBE_INVENTORY: readonly string[] = [
  GIT_BRANCH_KEY,
  GIT_SHA_KEY,
  GIT_LOG_TIME_KEY,
  GIT_LOG_MSG_KEY,
  GIT_STATUS_KEY,
  NPM_AUDIT_KEY,
  NPM_OUTDATED_KEY,
  diskProbeKey(DISK_NODE_MODULES_TARGET),
  diskProbeKey(DISK_NEXT_BUILD_TARGET),
  diskProbeKey(DISK_COMPONENTS_DIST_TARGET),
].toSorted();

const HEALTHY_WORKSPACE_FACTS: WorkspaceFacts = {
  projects: [
    {name: "@arolariu/components", root: "packages/components", targets: ["build"]},
    {name: "@arolariu/website", root: "sites/arolariu.ro", targets: ["build"]},
  ],
  dependencies: [{source: "@arolariu/website", target: "@arolariu/components"}],
  cycles: [],
};

function availableWorkspace(facts: WorkspaceFacts = HEALTHY_WORKSPACE_FACTS): InspectionOutcome<WorkspaceFacts> {
  return {kind: "available", value: facts, durationMs: 1};
}

const UNAVAILABLE_WORKSPACE: InspectionOutcome<WorkspaceFacts> = {
  kind: "unavailable",
  reason: "Not provided by the status fixture.",
  durationMs: 0,
};

function doctorReport(overrides: Partial<DoctorReport> = {}): DoctorReport {
  return {
    score: 92,
    grade: "A",
    summary: {passed: 3, warnings: 1, failed: 0, skipped: 2},
    checks: [],
    timestamp: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/** A fake doctor program and every input it was composed with. */
interface RecordingDoctor {
  readonly doctor: StatusDoctor;
  readonly inputs: readonly DoctorInput[];
}

/**
 * Builds a fake doctor program that records its inputs and then runs `effect`.
 *
 * @param effect - The doctor result; defaults to a healthy 92/A report.
 * @returns The fake doctor and its recorded inputs.
 */
function recordingDoctor(effect: Effect.Effect<DoctorReport> = Effect.succeed(doctorReport())): RecordingDoctor {
  const inputs: DoctorInput[] = [];
  return {
    inputs,
    doctor: (input) =>
      Effect.suspend(() => {
        inputs.push(input);
        return effect;
      }),
  };
}

/** Configures {@link statusHarness}. */
interface StatusHarnessOptions {
  /** Keyed probe outcomes; an unscripted probe dies. */
  readonly responses?: ReadonlyMap<string, ProbeOutcome>;
  /** Called before each probe answers; it may wait. */
  readonly onProbe?: (key: string) => void | Promise<void>;
  /** The scripted workspace fact; `"unscripted"` makes `inspect("workspace")` die. */
  readonly workspace?: InspectionOutcome<WorkspaceFacts> | "unscripted";
  /** Extra in-memory files. */
  readonly files?: Readonly<Record<string, string>>;
}

/**
 * Builds the harness of one status run: the repository identity, keyed probe outcomes, and a
 * scripted workspace fact (every other fact dies, which the fake doctor never reads).
 *
 * @param options - Probe outcomes, probe hook, workspace fact, and extra files.
 * @returns The harness.
 */
function statusHarness(options: Readonly<StatusHarnessOptions> = {}): TestHarness {
  const responses = options.responses ?? baseResponses();
  return makeTestLayer({
    files: {...IDENTITY_FILES, ...options.files},
    processes: [
      scriptedOutcomes(async (request) => {
        const key = processKey(request);
        await options.onProbe?.(key);
        const outcome = responses.get(key);
        if (outcome === undefined) {
          throw new Error(`Unexpected command in status test: ${key}`);
        }
        return outcome;
      }),
    ],
    inspection: options.workspace === "unscripted" ? {} : {workspace: options.workspace ?? availableWorkspace()},
    environment: {executablePath: "/usr/bin/node"},
    mode: "json",
  });
}

/**
 * Runs a status program on a harness with the live network probe.
 *
 * @param program - The status program.
 * @param harness - The harness.
 * @returns The program value.
 */
function runStatus<A>(program: Effect.Effect<A, never, StatusRequirements>, harness: TestHarness): Promise<A> {
  return runScoped(program.pipe(Effect.provide(NetworkProbeLive)), harness.layer);
}

/**
 * Collects the status document over a fake doctor.
 *
 * @param harness - The harness.
 * @param doctor - The fake doctor; defaults to a healthy 92/A report.
 * @returns The document.
 */
function collect(harness: TestHarness, doctor: StatusDoctor = recordingDoctor().doctor): Promise<StatusDocument> {
  return runStatus(collectStatusWith(doctor), harness);
}

/**
 * Runs `status` through the real CLI.
 *
 * @param argv - Arguments after the program name.
 * @param harness - The harness.
 * @param doctor - The fake doctor; defaults to a healthy 92/A report.
 * @returns The exit code.
 */
async function runStatusCli(
  argv: readonly string[],
  harness: TestHarness,
  doctor: StatusDoctor = recordingDoctor().doctor,
): Promise<CommandExitCode> {
  const exit = await Effect.runPromiseExit(runCli(argv, makeRootCommand([makeStatusCommand(doctor)])).pipe(Effect.provide(harness.layer)));
  return exitCodeFor(exit, undefined);
}

function renderedText(output: readonly SinkRecord[]): string {
  return output.map((record) => record.text).join("");
}

function probeKeys(harness: TestHarness): readonly string[] {
  return harness
    .processCalls()
    .map((call) => processKey(call.request))
    .toSorted();
}

// ============================================================================
// Doctor composition
// ============================================================================

describe("status — doctor composition", () => {
  it("composes doctor exactly once with quick, non-verbose input", async () => {
    // Arrange
    const recording = recordingDoctor();

    // Act
    await collect(statusHarness(), recording.doctor);

    // Assert
    expect(recording.inputs).toEqual([{quick: true, verbose: false}]);
  });

  it("maps the doctor report to the health section, including a failing report", async () => {
    // Arrange
    const report = doctorReport({score: 64, grade: "D", summary: {passed: 2, warnings: 3, failed: 4, skipped: 5}});

    // Act
    const document = await collect(statusHarness(), recordingDoctor(Effect.succeed(report)).doctor);

    // Assert
    expect(document.health).toEqual({score: 64, grade: "D", summary: {passed: 2, warnings: 3, failed: 4, skipped: 5}});
  });

  it("fails instead of degrading health to null when doctor dies", async () => {
    // Arrange
    const doctor = recordingDoctor(Effect.die(new Error("doctor exploded"))).doctor;

    // Act
    const exit = await runStatus(Effect.exit(collectStatusWith(doctor)), statusHarness());

    // Assert
    expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
    expect(Exit.isFailure(exit) ? String(Cause.squash(exit.cause)) : "").toMatch(/doctor exploded/u);
  });

  it("fails the status command with exit 1 and writes no status document when doctor dies", async () => {
    // Arrange
    const harness = statusHarness();
    const doctor = recordingDoctor(Effect.die(new Error("doctor exploded"))).doctor;

    // Act
    const code = await runStatusCli(["status", "--json"], harness, doctor);

    // Assert
    expect(code).toBe(1);
    const stdout = harness.output().filter((record) => record.stream === "stdout");
    expect(stdout).toHaveLength(1);
    expect(JSON.parse(stdout[0]?.text ?? "")).toMatchObject({status: "failed", kind: "internal"});
  });

  it("starts doctor concurrently with the degradation-tolerant collectors instead of after them", async () => {
    // Arrange
    const events: string[] = [];
    let openGate = (): void => undefined;
    const doctorStarted = new Promise<void>((resolve) => {
      openGate = resolve;
    });
    const harness = statusHarness({
      onProbe: async (key) => {
        events.push(`probe:start ${key}`);
        // Every probe waits for doctor: a serialized doctor would never start, and the run would hang.
        await doctorStarted;
        events.push(`probe:end ${key}`);
      },
    });
    const doctor = recordingDoctor(
      Effect.sync(() => {
        events.push("doctor:start");
        openGate();
        return doctorReport();
      }),
    ).doctor;

    // Act
    await collect(harness, doctor);

    // Assert
    const doctorStart = events.indexOf("doctor:start");
    const firstProbeSettled = events.findIndex((event) => event.startsWith("probe:end"));
    expect(doctorStart).toBeGreaterThanOrEqual(0);
    expect(firstProbeSettled).toBeGreaterThan(doctorStart);
  });

  it("interrupts the pending doctor, and finishes its finalizers, when status is interrupted", async () => {
    // Arrange
    const events: string[] = [];
    const program = Effect.gen(function* () {
      const started = yield* Deferred.make<void>();
      const doctor: StatusDoctor = () =>
        Deferred.succeed(started, undefined).pipe(
          Effect.andThen(Effect.never),
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              events.push("doctor:interrupted");
            }),
          ),
        );
      const fiber = yield* Effect.forkChild(collectStatusWith(doctor), {startImmediately: true});
      yield* Deferred.await(started);

      // Act
      yield* Fiber.interrupt(fiber);
      events.push("status:interrupted");
      return yield* Effect.exit(Fiber.join(fiber));
    });

    const exit = await runStatus(program, statusHarness());

    // Assert
    expect(Exit.isFailure(exit) && Cause.hasInterruptsOnly(exit.cause)).toBe(true);
    expect(events).toEqual(["doctor:interrupted", "status:interrupted"]);
  });
});

// ============================================================================
// Shared inspection session (real InspectionLive)
// ============================================================================

describe("status — shared inspection session", () => {
  it("shares one inspection session with doctor: each provider runs once under the real quick doctor", async () => {
    // Arrange
    const providerRuns: Record<string, number> = {};
    const tracer = Tracer.make({
      span: (options) => {
        if (options.name.startsWith("inspection.")) {
          const key = options.name.slice("inspection.".length);
          providerRuns[key] = (providerRuns[key] ?? 0) + 1;
        }
        return new Tracer.NativeSpan(options);
      },
    });
    const responses = baseResponses();
    const harness = makeTestLayer({
      files: IDENTITY_FILES,
      // Status probes answer from the base responses; every provider and doctor probe fails to spawn.
      processes: [
        scriptedOutcomes((request) => {
          const key = processKey(request);
          return responses.get(key) ?? spawnFailed(`${request.command} is not installed`);
        }),
      ],
      environment: {platform: "linux", architecture: "x64", executablePath: "/usr/bin/node", isCI: true},
    });
    const program = Effect.scoped(collectStatus).pipe(Effect.provide(NetworkProbeLive), Effect.provide(harness.layer));

    // Act
    const document = await Effect.runPromise(program.pipe(Effect.withTracer(tracer)));

    // Assert
    expect(providerRuns).toEqual({
      workspace: 1,
      aggregate: 1,
      "npm.root": 1,
      "npm.github-scripts": 1,
      packages: 1,
      dotnet: 1,
      python: 1,
      react: 1,
      "svelte.cv": 1,
      "svelte.status": 1,
      infrastructure: 1,
    });
    const calls = harness.processCalls().map((call) => `${processKey(call.request)} @ ${call.options.cwd ?? ""}`);
    expect(new Set(calls).size).toBe(calls.length);
    expect(probeKeys(harness)).toEqual(expect.arrayContaining([...JSON_PROBE_INVENTORY, "git --version", "npm config get cache"]));
    expect(document.workspaces).toBeNull();
    expect(document.health).toEqual({score: 6, grade: "F", summary: {passed: 1, warnings: 2, failed: 38, skipped: 18}});
    expect(document.git).toEqual({
      branch: "main",
      sha: "abc1234",
      lastCommitTime: "2 hours ago",
      lastCommitMsg: "chore: something",
      dirtyFiles: 0,
    });
  });
});

// ============================================================================
// Command specs
// ============================================================================

describe("status — process requests", () => {
  it("issues every external probe as an explicit request with the expected cwd and timeout", async () => {
    // Arrange
    const harness = statusHarness();

    // Act
    await collect(harness);

    // Assert
    const byKey = new Map(harness.processCalls().map((call) => [processKey(call.request), call] as const));
    for (const key of [GIT_BRANCH_KEY, GIT_SHA_KEY, GIT_LOG_TIME_KEY, GIT_LOG_MSG_KEY, GIT_STATUS_KEY]) {
      const call = byKey.get(key);
      expect(call, key).toBeDefined();
      expect(call?.options.cwd).toBe(FIXTURE_ROOT);
      expect(Duration.toMillis(call?.options.timeout ?? 0)).toBe(30_000);
    }

    for (const key of [NPM_AUDIT_KEY, NPM_OUTDATED_KEY]) {
      const call = byKey.get(key);
      expect(call, key).toBeDefined();
      expect(call?.options.cwd).toBe(FIXTURE_ROOT);
      expect(Duration.toMillis(call?.options.timeout ?? 0)).toBe(60_000);
      expect(call?.options.failureOutput).toBe("full");
    }
  });

  it("dispatches no Nx or doctor child process: the exact inventory contains only git, npm, and disk probes", async () => {
    // Arrange
    const harness = statusHarness();

    // Act
    await collect(harness);

    // Assert
    expect(probeKeys(harness)).toEqual(JSON_PROBE_INVENTORY);
    expect(harness.processCalls().some((call) => call.request.command === "npx" || call.request.args.includes("nx"))).toBe(false);
  });

  it("never passes a shell string", async () => {
    // Arrange
    const harness = statusHarness();

    // Act
    await collect(harness);

    // Assert
    for (const call of harness.processCalls()) {
      expect(typeof call.request.command).toBe("string");
      expect(Array.isArray(call.request.args)).toBe(true);
      expect(call.request.command).not.toMatch(/\s/u);
    }
  });

  it("issues each disk probe through the runtime executable with the target as its own argument", async () => {
    // Arrange
    const harness = statusHarness();

    // Act
    await collect(harness);

    // Assert
    const probes = harness.processCalls().filter((call) => call.request.args[0] === "--eval");
    expect(probes).toHaveLength(3);
    for (const probe of probes) {
      expect(probe.request.command).toBe("/usr/bin/node");
      expect(probe.request.args).toHaveLength(3);
      expect(typeof probe.request.args[1]).toBe("string");
      expect([DISK_NODE_MODULES_TARGET, DISK_NEXT_BUILD_TARGET, DISK_COMPONENTS_DIST_TARGET]).toContain(probe.request.args[2]);
      expect(Duration.toMillis(probe.options.timeout ?? 0)).toBe(60_000);
    }
  });
});

// ============================================================================
// Node runtime label
// ============================================================================

describe("status — Node runtime label", () => {
  it("renders the major version the runtime executable reports", async () => {
    // Arrange
    const harness = statusHarness({responses: withOverrides({[NODE_VERSION_KEY]: succeeded("v42.1.0\n")})});

    // Act
    const code = await runStatusCli(["status"], harness);

    // Assert
    expect(code).toBe(0);
    expect(renderedText(harness.output())).toMatch(/Node: 42\.x/u);
  });

  it("issues the version probe through the runtime executable with cwd and a bounded timeout", async () => {
    // Arrange
    const harness = statusHarness();

    // Act
    await runStatusCli(["status"], harness);

    // Assert
    const call = harness.processCalls().find((entry) => entry.request.args[0] === "--version");
    expect(call?.request).toEqual({command: "/usr/bin/node", args: ["--version"]});
    expect(call?.options.cwd).toBe(FIXTURE_ROOT);
    expect(Duration.toMillis(call?.options.timeout ?? 0)).toBe(10_000);
  });

  it("adds exactly one version probe to the human dashboard process inventory", async () => {
    // Arrange
    const harness = statusHarness();

    // Act
    await runStatusCli(["status"], harness);

    // Assert
    expect(probeKeys(harness)).toEqual([...JSON_PROBE_INVENTORY, NODE_VERSION_KEY].toSorted());
  });

  it("never probes the runtime version for machine-readable output", async () => {
    // Arrange
    const harness = statusHarness();

    // Act
    const code = await runStatusCli(["status", "--json"], harness);

    // Assert
    expect(code).toBe(0);
    expect(probeKeys(harness)).toEqual(JSON_PROBE_INVENTORY);
  });

  it.each([
    ["a spawn failure", spawnFailed("node is missing")],
    ["a timeout", timedOut()],
    ["a signal termination", signalled()],
    ["a nonzero exit", exited(1, "v26.3.1")],
    ["malformed output", succeeded("not-a-version")],
  ])("falls back to an unknown label instead of failing on %s", async (_label, outcome) => {
    // Arrange
    const harness = statusHarness({responses: withOverrides({[NODE_VERSION_KEY]: outcome})});

    // Act
    const code = await runStatusCli(["status"], harness);

    // Assert
    expect(code).toBe(0);
    const text = renderedText(harness.output());
    expect(text).toMatch(/Node: \?\.x/u);
    expect(text).toMatch(/Health: 92 \(A\)/u);
  });

  it("falls back to an unknown label when the version probe dies, without degrading a sibling section", async () => {
    // Arrange
    const responses = baseResponses();
    responses.delete(NODE_VERSION_KEY);
    const harness = statusHarness({responses});

    // Act
    const code = await runStatusCli(["status"], harness);

    // Assert
    expect(code).toBe(0);
    const text = renderedText(harness.output());
    expect(text).toMatch(/Node: \?\.x/u);
    expect(text).toMatch(/Branch: main @ abc1234/u);
  });
});

// ============================================================================
// Source-derived Nx graph collection
// ============================================================================

describe("source-derived Nx graph collection", () => {
  const sourceText = readFileSync(fileURLToPath(new URL("./index.ts", import.meta.url)), "utf8");

  it("never writes or unlinks a temporary graph file and never dispatches Nx in production source", () => {
    expect(sourceText).not.toMatch(/unlinkSync/u);
    expect(sourceText).not.toMatch(/writeFileSync/u);
    expect(sourceText).not.toMatch(/--file=/u);
    expect(sourceText).not.toMatch(/nx-graph-status-tmp/u);
    expect(sourceText).not.toMatch(/"npx"/u);
  });

  it("composes runDoctor directly rather than through a legacy command invoker", () => {
    expect(sourceText).toMatch(/runDoctor/u);
    expect(sourceText).not.toMatch(/doctorCommand|makeDoctorInvoker|\.invoke\(/u);
  });

  it("reads no ambient Node runtime version in production source", () => {
    expect(sourceText).not.toMatch(/process\.versions/u);
    expect(sourceText).not.toMatch(/process\.version\b/u);
  });

  it("emits one deterministically ordered nxEdges entry per logical dependency", async () => {
    // Arrange
    const harness = statusHarness({
      workspace: availableWorkspace({
        projects: [],
        dependencies: [
          {source: "@scope/z", target: "@scope/a"},
          {source: "@scope/a", target: "@scope/c"},
          {source: "@scope/z", target: "@scope/a"},
          {source: "@scope/a", target: "@scope/b"},
        ],
        cycles: [],
      }),
    });

    // Act
    const document = await collect(harness);

    // Assert
    expect(document.nxEdges).toEqual([
      {source: "@scope/a", target: "@scope/b"},
      {source: "@scope/a", target: "@scope/c"},
      {source: "@scope/z", target: "@scope/a"},
    ]);
  });
});

// ============================================================================
// collectDisk — bounded, out-of-process directory-size probe
// ============================================================================

describe("collectDisk", () => {
  const fixtureRoots: string[] = [];

  afterEach(async () => {
    for (const root of fixtureRoots.splice(0)) {
      // eslint-disable-next-line no-await-in-loop -- bounded fixture cleanup.
      await rm(root, {recursive: true, force: true});
    }
  });

  function scriptedDisk(outcome: ProbeOutcome): Promise<unknown> {
    const harness = statusHarness({
      responses: new Map<string, ProbeOutcome>([
        [diskProbeKey(DISK_NODE_MODULES_TARGET), outcome],
        [diskProbeKey(DISK_NEXT_BUILD_TARGET), outcome],
        [diskProbeKey(DISK_COMPONENTS_DIST_TARGET), outcome],
      ]),
    });
    return runScoped(collectDisk(FIXTURE_PATHS), harness.layer);
  }

  function realDisk(root: string): Promise<unknown> {
    const layer = makeNodeLayer({mode: "silent", verbose: false, color: false, context: "test"});
    return Effect.runPromise(collectDisk(createRepositoryPaths(root)).pipe(Effect.provide(layer)));
  }

  it("reaches disk: null when a probe command exits non-zero", async () => {
    await expect(scriptedDisk(exited(1, "", "boom"))).resolves.toBeNull();
  });

  it("reaches disk: null on a probe timeout, spawn failure, or signal termination", async () => {
    await expect(scriptedDisk(timedOut())).resolves.toBeNull();
    await expect(scriptedDisk(spawnFailed("ENOENT"))).resolves.toBeNull();
    await expect(scriptedDisk(signalled())).resolves.toBeNull();
  });

  it.each(["", "12.5", "-5", "not-a-number"])("reaches disk: null for malformed probe output '%s'", async (stdout) => {
    await expect(scriptedDisk(succeeded(stdout))).resolves.toBeNull();
  });

  it("sums nested files through the real process and probe, and reports zero for a genuinely absent directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "arolariu-status-disk-"));
    fixtureRoots.push(root);

    await mkdir(join(root, "node_modules", "nested"), {recursive: true});
    await writeFile(join(root, "node_modules", "a.txt"), "12345"); // 5 bytes
    await writeFile(join(root, "node_modules", "nested", "b.txt"), "1234567890"); // 10 bytes
    await mkdir(join(root, "packages", "components", "dist"), {recursive: true});
    await writeFile(join(root, "packages", "components", "dist", "bundle.js"), "abcdefghij"); // 10 bytes
    // sites/arolariu.ro/.next is intentionally left absent.

    const disk = await realDisk(root);

    expect(disk).toEqual({nodeModules: 15, nextBuild: 0, componentsDist: 10});
  }, 20_000);

  it("skips a directory junction/symlink entry instead of recursing into it", async () => {
    const root = await mkdtemp(join(tmpdir(), "arolariu-status-disk-symlink-"));
    fixtureRoots.push(root);

    const realTarget = join(root, "real-target");
    await mkdir(realTarget, {recursive: true});
    await writeFile(join(realTarget, "big.txt"), "x".repeat(10_000));
    await mkdir(join(root, "node_modules"), {recursive: true});
    await writeFile(join(root, "node_modules", "a.txt"), "12345"); // 5 bytes

    try {
      await symlink(realTarget, join(root, "node_modules", "linked"), "junction");
    } catch {
      // Cross-platform/privilege limitation: fall back to a direct proof of the fixed probe
      // logic (nested summation without the symlink) instead of the symlink-skip behavior.
    }

    const disk = await realDisk(root);

    expect(disk).toEqual({nodeModules: 5, nextBuild: 0, componentsDist: 0});
  }, 20_000);
});

// ============================================================================
// Collector independence
// ============================================================================

describe("status — collector independence", () => {
  it("maps an unavailable collector to null: a git spawn failure makes only git null", async () => {
    // Arrange
    const harness = statusHarness({responses: withOverrides({[GIT_BRANCH_KEY]: spawnFailed("git is not installed")})});

    // Act
    const document = await collect(harness);

    // Assert
    expect(document.git).toBeNull();
    expect(document.workspaces).not.toBeNull();
    expect(document.nxEdges).not.toBeNull();
    expect(document.security).not.toBeNull();
    expect(document.disk).not.toBeNull();
    expect(document.health).not.toBeNull();
  });

  it("renders git as unavailable when one underlying git command fails, while siblings still render", async () => {
    // Arrange
    const harness = statusHarness({responses: withOverrides({[GIT_BRANCH_KEY]: exited(1)})});

    // Act
    const document = await collect(harness);

    // Assert
    expect(document.git).toBeNull();
    expect(document.workspaces).not.toBeNull();
    expect(document.health).not.toBeNull();
    expect(document.nxEdges).not.toBeNull();
    expect(document.security).not.toBeNull();
    expect(document.disk).not.toBeNull();
  });

  it("renders workspaces and nxEdges as unavailable when workspace inspection is unavailable", async () => {
    // Arrange
    const harness = statusHarness({workspace: UNAVAILABLE_WORKSPACE});

    // Act
    const document = await collect(harness);

    // Assert
    expect(document.workspaces).toBeNull();
    expect(document.nxEdges).toBeNull();
    expect(document.nxEdges).not.toEqual([]);
    expect(document.git).not.toBeNull();
  });

  it("degrades a dying collector to null without invalidating its siblings", async () => {
    // Arrange
    const harness = statusHarness({workspace: "unscripted"});

    // Act
    const document = await collect(harness);

    // Assert
    expect(document.workspaces).toBeNull();
    expect(document.nxEdges).toBeNull();
    expect(document.git).not.toBeNull();
    expect(document.security).not.toBeNull();
    expect(document.disk).not.toBeNull();
    expect(document.health).not.toBeNull();
  });

  it("renders security as unavailable (not zero counts) when npm audit JSON is malformed", async () => {
    const document = await collect(statusHarness({responses: withOverrides({[NPM_AUDIT_KEY]: exited(1, "not json at all")})}));

    expect(document.security).toBeNull();
  });

  it("renders security as unavailable — not a fabricated zero-outdated success — when npm outdated stdout is empty", async () => {
    const document = await collect(statusHarness({responses: withOverrides({[NPM_OUTDATED_KEY]: succeeded("")})}));

    expect(document.security).toBeNull();
  });

  it("retains a genuinely empty npm outdated JSON object ({}) as zero-outdated success data", async () => {
    const document = await collect(statusHarness({responses: withOverrides({[NPM_OUTDATED_KEY]: succeeded("{}")})}));

    expect(document.security).toEqual({
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      majorOutdated: 0,
      minorOutdated: 0,
      patchOutdated: 0,
    });
  });

  it("renders security as unavailable when npm outdated JSON is malformed", async () => {
    const document = await collect(statusHarness({responses: withOverrides({[NPM_OUTDATED_KEY]: succeeded("not json")})}));

    expect(document.security).toBeNull();
  });

  it("renders security as unavailable on an npm transport failure", async () => {
    const document = await collect(statusHarness({responses: withOverrides({[NPM_AUDIT_KEY]: timedOut()})}));

    expect(document.security).toBeNull();
  });

  it("retains nonzero npm audit/outdated JSON output as valid security data", async () => {
    // Arrange
    const harness = statusHarness({
      responses: withOverrides({
        [NPM_AUDIT_KEY]: exited(1, JSON.stringify({metadata: {vulnerabilities: {critical: 1, high: 2, moderate: 0, low: 0}}})),
        [NPM_OUTDATED_KEY]: exited(
          1,
          JSON.stringify({
            major: {current: "1.0.0", latest: "2.0.0"},
            minor: {current: "1.1.0", latest: "1.2.0"},
            patch: {current: "1.1.1", latest: "1.1.2"},
          }),
        ),
      }),
    });

    // Act
    const document = await collect(harness);

    // Assert
    expect(document.security).toEqual({
      critical: 1,
      high: 2,
      moderate: 0,
      low: 0,
      majorOutdated: 1,
      minorOutdated: 1,
      patchOutdated: 1,
    });
  });

  it.each([
    ["a non-object audit payload", NPM_AUDIT_KEY, "[]"],
    ["audit metadata that is not an object", NPM_AUDIT_KEY, JSON.stringify({metadata: 1})],
    ["audit vulnerabilities that are not an object", NPM_AUDIT_KEY, JSON.stringify({metadata: {vulnerabilities: null}})],
    ["a negative severity count", NPM_AUDIT_KEY, JSON.stringify({metadata: {vulnerabilities: {high: -1}}})],
    ["a non-object outdated payload", NPM_OUTDATED_KEY, "[]"],
  ])("renders security as unavailable for %s", async (_label, key, stdout) => {
    const document = await collect(statusHarness({responses: withOverrides({[key]: succeeded(stdout)})}));

    expect(document.security).toBeNull();
  });

  it("counts missing severities as zero and skips malformed outdated entries", async () => {
    // Arrange
    const harness = statusHarness({
      responses: withOverrides({
        [NPM_AUDIT_KEY]: succeeded(JSON.stringify({metadata: {vulnerabilities: {low: 4}}})),
        [NPM_OUTDATED_KEY]: succeeded(
          JSON.stringify({
            broken: "x",
            partial: {current: "1.0.0"},
            major: {current: "1.0.0", latest: "2.0.0"},
            patch: {current: "1.0.0", latest: "1.0.1"},
          }),
        ),
      }),
    });

    // Act
    const document = await collect(harness);

    // Assert
    expect(document.security).toEqual({
      critical: 0,
      high: 0,
      moderate: 0,
      low: 4,
      majorOutdated: 1,
      minorOutdated: 0,
      patchOutdated: 1,
    });
  });

  it("truncates a last commit message longer than sixty characters", async () => {
    // Arrange
    const harness = statusHarness({responses: withOverrides({[GIT_LOG_MSG_KEY]: succeeded(`${"x".repeat(70)}\n`)})});

    // Act
    const document = await collect(harness);

    // Assert
    expect(document.git?.lastCommitMsg).toBe(`${"x".repeat(57)}...`);
  });

  it("renders disk as unavailable when a directory-size probe fails", async () => {
    const document = await collect(statusHarness({responses: withOverrides({[diskProbeKey(DISK_NODE_MODULES_TARGET)]: exited(1)})}));

    expect(document.disk).toBeNull();
    expect(document.git).not.toBeNull();
  });

  it("renders disk as unavailable when a directory-size probe emits malformed output", async () => {
    const document = await collect(
      statusHarness({responses: withOverrides({[diskProbeKey(DISK_NEXT_BUILD_TARGET)]: succeeded("not-a-number")})}),
    );

    expect(document.disk).toBeNull();
  });
});

// ============================================================================
// Document shape
// ============================================================================

describe("status — document", () => {
  it("emits exactly one ANSI-free JSON document with the six preserved top-level keys", async () => {
    // Arrange
    const harness = statusHarness();

    // Act
    const code = await runStatusCli(["status", "--json"], harness);

    // Assert
    expect(code).toBe(0);
    const stdout = harness.output().filter((record) => record.stream === "stdout");
    expect(stdout).toHaveLength(1);
    expect(stdout[0]?.text).not.toMatch(/\u001B/u);
    const document = JSON.parse(stdout[0]?.text ?? "") as Record<string, unknown>;
    expect(Object.keys(document)).toEqual(["workspaces", "nxEdges", "git", "security", "disk", "health"]);
    expect(document["health"]).toEqual({score: 92, grade: "A", summary: {passed: 3, warnings: 1, failed: 0, skipped: 2}});
  });

  it("returns the typed document as the program value", async () => {
    // Act
    const document = await collect(statusHarness());

    // Assert
    expect(document.git).toEqual({
      branch: "main",
      sha: "abc1234",
      lastCommitTime: "2 hours ago",
      lastCommitMsg: "chore: something",
      dirtyFiles: 0,
    });
    expect(document.disk).toEqual({nodeModules: 1024, nextBuild: 2048, componentsDist: 512});
  });

  it("derives workspace metadata from the inspection session and repository manifests", async () => {
    // Arrange
    const harness = statusHarness({
      workspace: availableWorkspace({
        projects: [{name: "new-project", root: "sites/new-project", targets: ["build"]}],
        dependencies: [{source: "new-project", target: "@arolariu/components"}],
        cycles: [],
      }),
      files: {
        [join(FIXTURE_ROOT, "sites", "new-project", "package.json")]: JSON.stringify({name: "@arolariu/new-project", version: "1.2.3"}),
        [join(FIXTURE_ROOT, "sites", "new-project", "project.json")]: JSON.stringify({
          projectType: "library",
          tags: ["domain:web", "type:lib"],
        }),
      },
    });

    // Act
    const document = await collect(harness);

    // Assert
    expect(document.workspaces).toEqual([{name: "@arolariu/new-project", version: "1.2.3", type: "lib", tags: ["domain:web", "type:lib"]}]);
    expect(document.nxEdges).toEqual([{source: "new-project", target: "@arolariu/components"}]);
  });
});

// ============================================================================
// Human dashboard
// ============================================================================

describe("status — human dashboard", () => {
  it("renders workspace, git, security, disk, and health content only through the presenter", async () => {
    // Arrange
    const harness = statusHarness();

    // Act
    const code = await runStatusCli(["status"], harness);

    // Assert
    expect(code).toBe(0);
    const text = renderedText(harness.output());
    expect(text).toMatch(/Workspaces/u);
    expect(text).toMatch(/main/u);
    expect(text).toMatch(/Health/u);
    expect(text).toMatch(/Git/u);
    expect(text).toMatch(/Security/u);
    expect(text).toMatch(/Disk/u);
    expect(text).toMatch(/passed/u);
  });

  it("renders unavailable sections and isolated projects without crashing or fabricating success values", async () => {
    // Arrange
    const harness = statusHarness({
      responses: withOverrides({[GIT_BRANCH_KEY]: exited(1), [NPM_AUDIT_KEY]: timedOut(), [diskProbeKey(DISK_NEXT_BUILD_TARGET)]: exited(1)}),
      workspace: availableWorkspace({...HEALTHY_WORKSPACE_FACTS, projects: [...HEALTHY_WORKSPACE_FACTS.projects, {name: "lonely", root: "lonely", targets: []}]}),
    });

    // Act
    const code = await runStatusCli(["status"], harness);

    // Assert
    expect(code).toBe(0);
    const lines = renderedText(harness.output()).split("\n");
    expect(lines).toContain("Branch: unavailable  │  Node: 26.x  │  Health: 92 (A)");
    expect(lines).toContain("lonely (isolated)");
    expect(lines.filter((line) => line === "unavailable")).toHaveLength(3);
  });

  it("renders an empty dependency graph and a dirty working tree", async () => {
    // Arrange
    const harness = statusHarness({
      responses: withOverrides({[GIT_STATUS_KEY]: succeeded(" M a.ts\n?? b.ts\n")}),
      workspace: availableWorkspace({...HEALTHY_WORKSPACE_FACTS, dependencies: []}),
    });

    // Act
    await runStatusCli(["status"], harness);

    // Assert
    const lines = renderedText(harness.output()).split("\n");
    expect(lines).toContain("No inter-project dependencies found");
    expect(lines).toContain("Working tree: 2 files modified");
  });

  it("renders an unavailable health label and graph without workspaces when given such a document", async () => {
    // Arrange
    const harness = makeTestLayer({mode: "human"});
    const document: StatusDocument = {
      workspaces: null,
      nxEdges: [{source: "@arolariu/website", target: "@arolariu/components"}],
      git: null,
      security: null,
      disk: null,
      health: null,
    };

    // Act
    await runScoped(renderDashboard(document, "?"), harness.layer);

    // Assert
    const lines = renderedText(harness.output()).split("\n");
    expect(lines[1]).toBe("Branch: unavailable  │  Node: ?.x  │  Health: unavailable");
    expect(lines.some((line) => line.startsWith("Health summary"))).toBe(false);
    expect(lines).toContain("components ← website");
    expect(lines.some((line) => line.endsWith("(isolated)"))).toBe(false);
  });

  it("groups inbound dependencies per target and renders singular counts", async () => {
    // Arrange
    const harness = statusHarness({
      responses: withOverrides({[GIT_STATUS_KEY]: succeeded(" M a.ts\n")}),
      workspace: availableWorkspace({
        projects: [{name: "@arolariu/api", root: "sites/api.arolariu.ro", targets: []}],
        dependencies: [
          {source: "@arolariu/website", target: "@arolariu/components"},
          {source: "@arolariu/cv", target: "@arolariu/components"},
        ],
        cycles: [],
      }),
      files: {
        [join(FIXTURE_ROOT, "sites", "api.arolariu.ro", "project.json")]: JSON.stringify({name: "@arolariu/api", projectType: "application", tags: ["domain:backend", "type:app"]}),
      },
    });
    const report = doctorReport({summary: {passed: 1, warnings: 2, failed: 1, skipped: 0}});

    // Act
    await runStatusCli(["status"], harness, recordingDoctor(Effect.succeed(report)).doctor);

    // Assert
    const lines = renderedText(harness.output()).split("\n");
    expect(lines).toContain("Health summary: 1 passed, 2 warnings, 1 failure, 0 skipped");
    expect(lines).toContain("components ← cv, website");
    expect(lines.some((line) => /^api\s+—\s+app\s+backend$/u.test(line))).toBe(true);
    expect(lines).toContain("api (isolated)");
    expect(lines).toContain("Working tree: 1 file modified");
  });
});

// ============================================================================
// Characterization (legacy baseline for the effect migration)
// ============================================================================

describe("status — characterization", () => {
  const EXPECTED_DOCUMENT: StatusDocument = {
    workspaces: [
      {name: "@arolariu/components", version: "—", type: "unknown", tags: []},
      {name: "@arolariu/website", version: "—", type: "unknown", tags: []},
    ],
    nxEdges: [{source: "@arolariu/website", target: "@arolariu/components"}],
    git: {branch: "main", sha: "abc1234", lastCommitTime: "2 hours ago", lastCommitMsg: "chore: something", dirtyFiles: 0},
    security: {critical: 0, high: 0, moderate: 0, low: 0, majorOutdated: 0, minorOutdated: 0, patchOutdated: 0},
    disk: {nodeModules: 1024, nextBuild: 2048, componentsDist: 512},
    health: {score: 92, grade: "A", summary: {passed: 3, warnings: 1, failed: 0, skipped: 2}},
  };

  const EXPECTED_DASHBOARD_LINES: readonly string[] = [
    "🏠 arolariu.ro monorepo status",
    "Branch: main  │  Node: 26.x  │  Health: 92 (A)",
    "Health summary: 3 passed, 1 warning, 0 failures, 2 skipped",
    "",
    "📦 Workspaces",
    "",
    "Package     Version  Type     Tags",
    "----------  -------  -------  ----",
    "components  —        unknown  ",
    "website     —        unknown  ",
    "",
    "🔗 Dependency Graph",
    "",
    "components ← website",
    "",
    "📋 Git",
    "",
    "Branch: main @ abc1234",
    'Last: 2 hours ago — "chore: something"',
    "Working tree: clean",
    "",
    "🔒 Security & Dependencies",
    "",
    "Audit:    0 critical, 0 high, 0 moderate",
    "Outdated: 0 major, 0 minor, 0 patch",
    "",
    "💾 Disk Usage",
    "",
    "node_modules: 1.00 KB  │  .next: 2.00 KB  │  dist: 512 B",
  ];

  it("characterizes the exact document value", async () => {
    await expect(collect(statusHarness())).resolves.toEqual(EXPECTED_DOCUMENT);
  });

  it("emits one JSON document: the exact R1 document on stdout, exit 0", async () => {
    // Arrange
    const harness = statusHarness();

    // Act
    const code = await runStatusCli(["status", "--json"], harness);

    // Assert
    expect(code).toBe(0);
    expect(harness.output()).toEqual([{stream: "stdout", text: `${JSON.stringify(EXPECTED_DOCUMENT, null, 2)}\n`}]);
  });

  it("characterizes the exact human dashboard text and exit code", async () => {
    // Arrange
    const harness = statusHarness();

    // Act
    const code = await runStatusCli(["status"], harness);

    // Assert
    expect(code).toBe(0);
    expect(harness.output()).toEqual(EXPECTED_DASHBOARD_LINES.map((text) => ({stream: "stdout", text: `${text}\n`})));
  });

  it("keeps exit 0 when doctor reports failing checks: health is data", async () => {
    // Arrange
    const harness = statusHarness();
    const failing = doctorReport({score: 8, grade: "F", summary: {passed: 3, warnings: 0, failed: 38, skipped: 18}});

    // Act
    const code = await runStatusCli(["status", "--json"], harness, recordingDoctor(Effect.succeed(failing)).doctor);

    // Assert
    expect(code).toBe(0);
  });
});
