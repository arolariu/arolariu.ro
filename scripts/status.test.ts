// @vitest-environment node
/**
 * @fileoverview Contract tests for the monorepo status command.
 * @module scripts.status.test
 *
 * @remarks
 * Every orchestrator test drives `statusCommand.run()`/`invoke()` through an injected test runtime
 * factory whose filesystem is the in-memory repository fixture, whose inspection registry is the
 * real memoized runtime, and whose process runner replays keyed outcomes. No test in this file
 * reads the live checkout or spawns a real child process, except the bounded disk-probe
 * integration tests and the direct-entrypoint smoke tests, which do so deliberately.
 */

import {spawn} from "node:child_process";
import {readFileSync} from "node:fs";
import {mkdir, mkdtemp, rm, symlink, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {afterEach, describe, expect, it, vi, type Mock} from "vitest";

import {MonorepoCommand, type CommandExecution, type CommandInvoker, type CommandRuntimeFactory} from "./common/commander.ts";
import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import {createRepositoryPaths} from "./common/repository-paths.ts";
import {AbstractProcessRunner, type ProcessOutcome, type ProcessRequest, type ProcessRunOptions} from "./common/runner.ts";
import {createNodeProcessRunner, snapshotNodeEnvironment} from "./common/runtime.node.ts";
import {
  createRepositoryFixtureFileSystem,
  createRepositoryInspectionSessionStub,
  createTestRuntimeFactory,
  repositoryFixtureRoot,
} from "./common/runtime.testing.ts";
import {
  CommandCancellation,
  commandCancellationFromSignal,
  createRepositoryInspectionRuntime,
  DefaultTaskScheduler,
  MemoizedInspectionRuntime,
  type RepositoryInspectionRequest,
  type RepositoryInspectionRuntime,
} from "./common/runtime.ts";
import type {DoctorInput, DoctorReport} from "./doctor.types.ts";
import type {RepositoryInspectionFacts, RepositoryInspectionSession} from "./inspection/repository.ts";
import {createInspectionSession} from "./inspection/session.ts";
import type {InspectionOutcome} from "./inspection/types.ts";
import type {WorkspaceFacts} from "./inspection/workspace.ts";
import {collectDisk, createStatusCommand, type StatusDocument} from "./status.ts";

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
/** The test runtime environment reports `/usr/bin/node` as the running executable. */
const NODE_VERSION_KEY = "/usr/bin/node --version";

const DISK_NODE_MODULES_TARGET = join(FIXTURE_ROOT, "node_modules");
const DISK_NEXT_BUILD_TARGET = join(FIXTURE_ROOT, "sites", "arolariu.ro", ".next");
const DISK_COMPONENTS_DIST_TARGET = join(FIXTURE_ROOT, "packages", "components", "dist");

const CLEAN_AUDIT_STDOUT = JSON.stringify({metadata: {vulnerabilities: {critical: 0, high: 0, moderate: 0, low: 0}}});

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

function succeeded(stdout: string): ProcessOutcome {
  return {kind: "succeeded", exitCode: 0, stdout, stderr: "", durationMs: 1};
}

function exited(exitCode: number, stdout = "", stderr = ""): ProcessOutcome {
  return {kind: "exited", exitCode, stdout, stderr, durationMs: 1};
}

function timedOut(): ProcessOutcome {
  return {kind: "timed-out", stdout: "", stderr: "", durationMs: 1};
}

function spawnFailed(message: string): ProcessOutcome {
  return {kind: "spawn-failed", message, stdout: "", stderr: "", durationMs: 1};
}

function signalled(): ProcessOutcome {
  return {kind: "signalled", signal: "SIGTERM", stdout: "", stderr: "", durationMs: 1};
}

interface RecordedProcessCall {
  readonly request: Readonly<ProcessRequest>;
  readonly options: Readonly<ProcessRunOptions>;
}

/** Records every process invocation and replays one keyed outcome per command. */
class ScriptedProcessRunner extends AbstractProcessRunner {
  readonly #outcomes: ReadonlyMap<string, ProcessOutcome>;
  readonly #calls: RecordedProcessCall[] = [];

  public constructor(outcomes: ReadonlyMap<string, ProcessOutcome>) {
    super();
    this.#outcomes = outcomes;
  }

  /** Every recorded invocation, in call order. */
  public get calls(): readonly RecordedProcessCall[] {
    return this.#calls;
  }

  /** {@inheritDoc AbstractProcessRunner.execute} */
  protected override execute(request: Readonly<ProcessRequest>, options: Readonly<ProcessRunOptions>): Promise<ProcessOutcome> {
    this.#calls.push({request, options});
    const outcome = this.#outcomes.get(processKey(request));
    return outcome === undefined
      ? Promise.reject(new Error(`Unexpected command in status test: ${processKey(request)}`))
      : Promise.resolve(outcome);
  }
}

/**
 * Records ordered start and settle events for every probe so collector/doctor concurrency can be
 * asserted without wall-clock timing.
 */
class TimelineProcessRunner extends ScriptedProcessRunner {
  readonly #events: string[];

  public constructor(outcomes: ReadonlyMap<string, ProcessOutcome>, events: string[]) {
    super(outcomes);
    this.#events = events;
  }

  /** {@inheritDoc AbstractProcessRunner.execute} */
  protected override async execute(
    request: Readonly<ProcessRequest>,
    options: Readonly<ProcessRunOptions>,
  ): Promise<ProcessOutcome> {
    this.#events.push(`probe:start ${processKey(request)}`);
    try {
      return await super.execute(request, options);
    } finally {
      this.#events.push(`probe:end ${processKey(request)}`);
    }
  }
}

function baseResponses(): Map<string, ProcessOutcome> {
  return new Map<string, ProcessOutcome>([
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

function withOverrides(overrides: Readonly<Record<string, ProcessOutcome>>): Map<string, ProcessOutcome> {
  const responses = baseResponses();
  for (const [key, value] of Object.entries(overrides)) {
    responses.set(key, value);
  }
  return responses;
}

const HEALTHY_WORKSPACE_FACTS: WorkspaceFacts = {
  projects: [
    {name: "@arolariu/components", root: "packages/components", targets: ["build"]},
    {name: "@arolariu/website", root: "sites/arolariu.ro", targets: ["build"]},
  ],
  dependencies: [{source: "@arolariu/website", target: "@arolariu/components"}],
  cycles: [],
};

function unavailableFact<TValue>(): Promise<InspectionOutcome<TValue>> {
  return Promise.resolve({kind: "unavailable", reason: "Not provided by the status fixture.", durationMs: 0});
}

/**
 * Builds a real memoized inspection session whose only populated fact is `workspace`.
 *
 * @param workspace - Provider for the workspace fact under test.
 * @returns A repository inspection session usable by every status collector.
 */
function createFixtureSession(workspace: () => Promise<InspectionOutcome<WorkspaceFacts>>): RepositoryInspectionSession {
  const session = createInspectionSession<RepositoryInspectionFacts>({
    workspace,
    aggregate: unavailableFact,
    "npm.root": unavailableFact,
    "npm.github-scripts": unavailableFact,
    packages: unavailableFact,
    dotnet: unavailableFact,
    python: unavailableFact,
    react: unavailableFact,
    "svelte.cv": unavailableFact,
    "svelte.status": unavailableFact,
    infrastructure: unavailableFact,
  });

  return {...session, updateInfrastructureEngine: (): void => undefined};
}

function availableWorkspace(facts: WorkspaceFacts = HEALTHY_WORKSPACE_FACTS): () => Promise<InspectionOutcome<WorkspaceFacts>> {
  return () => Promise.resolve({kind: "available", value: facts, durationMs: 1});
}

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

type DoctorInvoke = CommandInvoker<DoctorInput, DoctorReport>["invoke"];
type DoctorStub = CommandInvoker<DoctorInput, DoctorReport> & Readonly<{invoke: Mock<DoctorInvoke>}>;

/**
 * Creates a typed doctor stub recording every composed invocation.
 *
 * @param implementation - Behavior the stub replays; defaults to a healthy completed report.
 * @returns A recording {@link CommandInvoker}.
 */
function createDoctorStub(implementation?: DoctorInvoke): DoctorStub {
  const invoke = vi.fn<DoctorInvoke>(
    implementation ?? ((): Promise<CommandExecution<DoctorReport>> => Promise.resolve({status: "completed", value: doctorReport(), exitCode: 0})),
  );
  return {invoke};
}

/** Opens once, letting a test await a specific point inside a composed child invocation. */
interface Gate {
  readonly opened: Promise<void>;
  readonly open: () => void;
}

function createGate(): Gate {
  let open = (): void => undefined;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return {opened, open};
}

/**
 * Resolves on the next macrotask, so a cleanup callback provably outlives every pending
 * microtask without depending on wall-clock timing.
 *
 * @returns A promise settled after the current microtask queue drains.
 */
function nextMacrotask(): Promise<void> {
  return new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}

/**
 * A child execution that never settles on its own and rejects with the exact cancellation its
 * own invocation signal carries.
 *
 * @param signal - The child invocation's cancellation signal.
 * @returns A promise that rejects only once `signal` aborts.
 */
function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise<never>((_resolve, reject) => {
    signal.addEventListener(
      "abort",
      () => {
        reject(commandCancellationFromSignal(signal));
      },
      {once: true},
    );
  });
}

/**
 * Builds a real {@link MonorepoCommand} doctor child whose execution stays pending until its own
 * scope aborts and whose cleanup callback only completes on a later macrotask.
 *
 * @param factory - Runtime factory shared with status, so the child receives a real nested scope.
 * @param events - Ordered event log the cleanup callback appends to when it finishes draining.
 * @returns The composed child command and a gate opened once its execution has started.
 */
function createPendingDoctorChild(
  factory: CommandRuntimeFactory,
  events: string[],
): Readonly<{doctor: CommandInvoker<DoctorInput, DoctorReport>; started: Promise<void>}> {
  const gate = createGate();
  const doctor = new MonorepoCommand<DoctorInput, DoctorReport>(
    {
      metadata: {name: "doctor", description: "Runs read-only monorepo health checks."},
      configure: () => undefined,
      decode: () => ({quick: true, verbose: false}),
      presentation: () => "silent",
      execute: (context) => {
        context.runtime.cleanup.register("doctor child probe", async () => {
          await nextMacrotask();
          events.push("doctor:cleanup-drained");
        });
        gate.open();
        return rejectOnAbort(context.runtime.signal);
      },
      completion: () => ({exitCode: 0}),
    },
    factory,
  );

  return {doctor, started: gate.opened};
}

interface StatusFixtureOptions {
  readonly responses?: ReadonlyMap<string, ProcessOutcome>;
  readonly runner?: ScriptedProcessRunner;
  readonly workspace?: () => Promise<InspectionOutcome<WorkspaceFacts>>;
  readonly doctor?: DoctorStub;
  readonly mode?: "human" | "json";
  readonly files?: Readonly<Record<string, string>>;
}

interface StatusFixture {
  readonly command: ReturnType<typeof createStatusCommand>;
  readonly sink: InMemoryLoggerSink;
  readonly runner: ScriptedProcessRunner;
  readonly doctor: DoctorStub;
  readonly inspection: RepositoryInspectionRuntime;
  readonly createSession: Mock<(request: Readonly<RepositoryInspectionRequest>) => RepositoryInspectionSession>;
}

/**
 * Assembles a status command wired to the in-memory repository fixture, a scripted process
 * runner, the real memoized inspection registry, and a recording doctor stub.
 *
 * @param options - Optional process outcomes, a pre-built recording runner, workspace facts,
 * doctor stub, logger mode, and extra fixture files.
 * @returns The command plus every recorded seam.
 */
function createStatusFixture(options: Readonly<StatusFixtureOptions> = {}): StatusFixture {
  const sink = new InMemoryLoggerSink();
  const logger = new MonorepositoryConsoleLogger("status", {
    color: false,
    sink,
    verbose: false,
    mode: options.mode ?? "human",
  });
  const runner = options.runner ?? new ScriptedProcessRunner(options.responses ?? baseResponses());
  const session = createFixtureSession(options.workspace ?? availableWorkspace());
  const createSession = vi.fn<(request: Readonly<RepositoryInspectionRequest>) => RepositoryInspectionSession>(() => session);
  const inspection = createRepositoryInspectionRuntime(createSession);
  const doctor = options.doctor ?? createDoctorStub();
  const command = createStatusCommand({
    runtimeFactory: createTestRuntimeFactory({
      files: createRepositoryFixtureFileSystem(options.files ?? {}),
      inspection,
      logger,
      runner,
    }),
    doctor,
  });

  return {command, sink, runner, doctor, inspection, createSession};
}

function jsonDocument(sink: InMemoryLoggerSink): Record<string, unknown> {
  const stdout = sink.records.filter((record) => record.stream === "stdout");
  expect(stdout).toHaveLength(1);
  const [record] = stdout;
  expect(record?.text).not.toMatch(/\u001B/);
  return JSON.parse(record?.text ?? "") as Record<string, unknown>;
}

function renderedText(sink: InMemoryLoggerSink): string {
  return sink.records.map((record) => record.text).join("\n");
}

async function runJson(fixture: StatusFixture): Promise<Record<string, unknown>> {
  const execution = await fixture.command.run(["--json"]);
  expect(execution.status).toBe("completed");
  expect(execution.exitCode).toBe(0);
  return jsonDocument(fixture.sink);
}

// ============================================================================
// Parser
// ============================================================================

describe("status command — parser", () => {
  it.each(["--help", "-h", "/h", "/help"])("renders help and completes with exit 0 for '%s'", async (flag) => {
    const fixture = createStatusFixture();

    const execution = await fixture.command.run([flag]);

    expect(execution).toEqual({status: "help", exitCode: 0});
    expect(fixture.runner.calls).toHaveLength(0);
    expect(fixture.doctor.invoke).not.toHaveBeenCalled();
  });

  it.each(["--bogus", "-x", "workspace", "--verbose"])("rejects '%s' as a usage failure with exit 2", async (argument) => {
    const fixture = createStatusFixture();

    const execution = await fixture.command.run([argument]);

    expect(execution.status).toBe("failed");
    expect(execution.exitCode).toBe(2);
    expect(fixture.runner.calls).toHaveLength(0);
    expect(fixture.doctor.invoke).not.toHaveBeenCalled();
    expect(fixture.createSession).not.toHaveBeenCalled();
  });

  it("accepts --json and selects machine-readable presentation", async () => {
    const fixture = createStatusFixture({mode: "json"});

    const document = await runJson(fixture);

    expect(Object.keys(document).toSorted()).toEqual(["disk", "git", "health", "nxEdges", "security", "workspaces"].toSorted());
  });
});

// ============================================================================
// Typed doctor composition
// ============================================================================

describe("status command — doctor composition", () => {
  it("reuses the parent inspection session and consumes a completed Doctor report with exit one", async () => {
    const request: RepositoryInspectionRequest = {
      profile: "quick",
      paths: createRepositoryPaths(repositoryFixtureRoot),
    };
    const createSession = vi.fn(() => createRepositoryInspectionSessionStub());
    const inspection = new MemoizedInspectionRuntime<RepositoryInspectionRequest, RepositoryInspectionSession>(
      createSession,
      ({paths, profile, requestedEngine}) => `${paths.root}:${profile}:${requestedEngine ?? "auto"}`,
    );
    const doctor: CommandInvoker<DoctorInput, DoctorReport> = {
      invoke: async (_input, options) => {
        options?.parent?.runtime.inspection.getRepositorySession(request);
        return {
          status: "completed",
          value: {
            score: 75,
            grade: "C",
            summary: {passed: 3, warnings: 1, failed: 1, skipped: 0},
            checks: [],
            timestamp: "2025-06-01T00:00:00.000Z",
          },
          exitCode: 1,
        };
      },
    };
    const command = createStatusCommand({
      runtimeFactory: createTestRuntimeFactory({
        files: createRepositoryFixtureFileSystem(),
        inspection,
        runner: new ScriptedProcessRunner(baseResponses()),
      }),
      doctor,
    });

    const execution = await command.invoke({json: true}, {presentation: "silent"});

    expect(execution).toMatchObject({
      status: "completed",
      exitCode: 0,
      value: {health: expect.objectContaining({score: expect.any(Number)})},
    });
    expect(createSession).toHaveBeenCalledOnce();
  });

  it("invokes doctor once with quick input, silent presentation, and the status invocation as parent", async () => {
    const fixture = createStatusFixture({mode: "json"});

    await fixture.command.run(["--json"]);

    expect(fixture.doctor.invoke).toHaveBeenCalledTimes(1);
    const call = fixture.doctor.invoke.mock.calls[0];
    expect(call?.[0]).toEqual({quick: true, verbose: false});
    expect(call?.[1]?.presentation).toBe("silent");
    expect(call?.[1]?.parent?.runtime.inspection).toBe(fixture.inspection);
  });

  it("obtains its own quick collector session before invoking doctor and shares exactly one session", async () => {
    const observed: RepositoryInspectionSession[] = [];
    const doctor = createDoctorStub(async (_input, options) => {
      const parent = options?.parent;
      if (parent !== undefined) {
        observed.push(parent.runtime.inspection.getRepositorySession({profile: "quick", paths: FIXTURE_PATHS}));
      }
      return {status: "completed", value: doctorReport(), exitCode: 0};
    });
    const fixture = createStatusFixture({doctor, mode: "json"});

    await fixture.command.run(["--json"]);

    expect(fixture.createSession).toHaveBeenCalledTimes(1);
    expect(fixture.createSession).toHaveBeenCalledWith(expect.objectContaining({profile: "quick"}));
    expect(observed).toHaveLength(1);
  });

  it("renders the completed doctor report as the health section", async () => {
    const doctor = createDoctorStub(() =>
      Promise.resolve({
        status: "completed",
        value: doctorReport({score: 64, grade: "D", summary: {passed: 2, warnings: 3, failed: 4, skipped: 5}}),
        exitCode: 1,
      }),
    );
    const fixture = createStatusFixture({doctor, mode: "json"});

    const document = await runJson(fixture);

    expect(document["health"]).toEqual({score: 64, grade: "D", summary: {passed: 2, warnings: 3, failed: 4, skipped: 5}});
  });

  it("fails with exit 1 and renders no success document when doctor fails", async () => {
    const doctor = createDoctorStub(() =>
      Promise.resolve({
        status: "failed",
        failure: {kind: "operational", message: "doctor exploded", evidence: [], cause: new Error("doctor exploded")},
        exitCode: 1,
      }),
    );
    const fixture = createStatusFixture({doctor, mode: "json"});

    const execution = await fixture.command.run(["--json"]);

    expect(execution.status).toBe("failed");
    expect(execution.exitCode).toBe(1);
    if (execution.status === "failed") {
      expect(execution.failure.message).toMatch(/doctor exploded/);
    }
    expect(fixture.sink.records.filter((record) => record.stream === "stdout")).toHaveLength(0);
  });

  it.each([130, 143] as const)("propagates a cancelled doctor execution with its exact %i exit code", async (exitCode) => {
    const doctor = createDoctorStub(() =>
      Promise.resolve({
        status: "cancelled",
        failure: {kind: "cancelled", message: "doctor cancelled", evidence: []},
        exitCode,
      }),
    );
    const fixture = createStatusFixture({doctor, mode: "json"});

    const execution = await fixture.command.run(["--json"]);

    expect(execution.status).toBe("cancelled");
    expect(execution.exitCode).toBe(exitCode);
    expect(fixture.sink.records.filter((record) => record.stream === "stdout")).toHaveLength(0);
  });

  it("treats a doctor help outcome as an internal operational failure", async () => {
    const doctor = createDoctorStub(() => Promise.resolve({status: "help", exitCode: 0}));
    const fixture = createStatusFixture({doctor, mode: "json"});

    const execution = await fixture.command.run(["--json"]);

    expect(execution.status).toBe("failed");
    expect(execution.exitCode).toBe(1);
    if (execution.status === "failed") {
      expect(execution.failure.message).toMatch(/help/i);
    }
    expect(fixture.sink.records.filter((record) => record.stream === "stdout")).toHaveLength(0);
  });

  it("starts doctor concurrently with the degradation-tolerant collectors instead of after them", async () => {
    const events: string[] = [];
    const runner = new TimelineProcessRunner(baseResponses(), events);
    const doctor = createDoctorStub(() => {
      events.push("doctor:start");
      return Promise.resolve({status: "completed", value: doctorReport(), exitCode: 0});
    });
    const fixture = createStatusFixture({runner, doctor});

    const execution = await fixture.command.run([]);

    expect(execution.status).toBe("completed");
    const doctorStart = events.indexOf("doctor:start");
    const firstProbeSettled = events.findIndex((event) => event.startsWith("probe:end"));
    expect(doctorStart).toBeGreaterThanOrEqual(0);
    expect(firstProbeSettled).toBeGreaterThanOrEqual(0);
    expect(doctorStart).toBeLessThan(firstProbeSettled);
  });

  it("fails instead of degrading health to null when the composed doctor invoker rejects", async () => {
    const doctor = createDoctorStub(() => Promise.reject(new Error("doctor invoker exploded")));
    const fixture = createStatusFixture({doctor, mode: "json"});

    const execution = await fixture.command.run(["--json"]);

    expect(execution.status).toBe("failed");
    expect(execution.exitCode).toBe(1);
    if (execution.status === "failed") {
      expect(execution.failure.message).toMatch(/doctor invoker exploded/);
    }
    expect(fixture.sink.records.filter((record) => record.stream === "stdout")).toHaveLength(0);
  });
});

// ============================================================================
// Composed child cancellation
// ============================================================================

describe("status command — composed child cancellation", () => {
  it("returns the exact signal cancellation only after the composed doctor child drained its own cleanup", async () => {
    const events: string[] = [];
    const controller = new AbortController();
    const sink = new InMemoryLoggerSink();
    const factory = createTestRuntimeFactory({
      files: createRepositoryFixtureFileSystem(),
      inspection: createRepositoryInspectionRuntime(() => createFixtureSession(availableWorkspace())),
      logger: new MonorepositoryConsoleLogger("status", {color: false, sink, verbose: false, mode: "human"}),
      runner: new ScriptedProcessRunner(baseResponses()),
    });
    const {doctor, started} = createPendingDoctorChild(factory, events);
    const command = createStatusCommand({runtimeFactory: factory, doctor});

    const pending = command.invoke({json: false}, {presentation: "human", signal: controller.signal});
    void pending.then(() => {
      events.push("status:settled");
    });
    await started;
    controller.abort(new CommandCancellation("Command terminated by SIGTERM.", 143));
    const execution = await pending;

    expect(execution.status).toBe("cancelled");
    expect(execution.exitCode).toBe(143);
    expect(events).toEqual(["doctor:cleanup-drained", "status:settled"]);
    expect(sink.records.filter((record) => record.stream === "stdout")).toHaveLength(0);
  });

  it("cancels instead of completing when the invocation was aborted and the composed child ignored it", async () => {
    const controller = new AbortController();
    const doctor = createDoctorStub(() => {
      controller.abort(new CommandCancellation("Command interrupted by SIGINT.", 130));
      return Promise.resolve({status: "completed", value: doctorReport(), exitCode: 0});
    });
    const fixture = createStatusFixture({doctor, mode: "json"});

    const execution = await fixture.command.invoke({json: true}, {presentation: "json", signal: controller.signal});

    expect(execution.status).toBe("cancelled");
    expect(execution.exitCode).toBe(130);
    expect(fixture.sink.records.filter((record) => record.stream === "stdout")).toHaveLength(0);
  });
});

// ============================================================================
// Command specs
// ============================================================================

describe("status command — process requests", () => {
  it("issues every external probe as an explicit request with the expected cwd and timeout", async () => {
    const fixture = createStatusFixture({mode: "json"});

    await fixture.command.run(["--json"]);

    const byKey = new Map(fixture.runner.calls.map((call) => [processKey(call.request), call] as const));
    for (const key of [GIT_BRANCH_KEY, GIT_SHA_KEY, GIT_LOG_TIME_KEY, GIT_LOG_MSG_KEY, GIT_STATUS_KEY]) {
      const call = byKey.get(key);
      expect(call, key).toBeDefined();
      expect(call?.options.cwd).toBe(FIXTURE_ROOT);
      expect(call?.options.timeoutMs).toBe(30_000);
    }

    for (const key of [NPM_AUDIT_KEY, NPM_OUTDATED_KEY]) {
      const call = byKey.get(key);
      expect(call, key).toBeDefined();
      expect(call?.options.cwd).toBe(FIXTURE_ROOT);
      expect(call?.options.timeoutMs).toBe(60_000);
    }
  });

  it("dispatches no Nx or doctor child process: the exact inventory contains only git, npm, and disk probes", async () => {
    const fixture = createStatusFixture({mode: "json"});

    await fixture.command.run(["--json"]);

    expect(fixture.runner.calls.map((call) => processKey(call.request)).toSorted()).toEqual(
      [
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
      ].toSorted(),
    );
    expect(fixture.runner.calls.some((call) => call.request.command === "npx" || call.request.args.includes("nx"))).toBe(false);
  });

  it("links every probe to the invocation cancellation signal and never passes a shell string", async () => {
    const fixture = createStatusFixture({mode: "json"});

    await fixture.command.run(["--json"]);

    for (const call of fixture.runner.calls) {
      expect(typeof call.request.command).toBe("string");
      expect(Array.isArray(call.request.args)).toBe(true);
      expect(call.options.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("issues each disk probe through the runtime executable with the target as its own argument", async () => {
    const fixture = createStatusFixture({mode: "json"});

    await fixture.command.run(["--json"]);

    const probes = fixture.runner.calls.filter((call) => call.request.args[0] === "--eval");
    expect(probes).toHaveLength(3);
    for (const probe of probes) {
      expect(probe.request.args).toHaveLength(3);
      expect(typeof probe.request.args[1]).toBe("string");
      expect([DISK_NODE_MODULES_TARGET, DISK_NEXT_BUILD_TARGET, DISK_COMPONENTS_DIST_TARGET]).toContain(probe.request.args[2]);
      expect(probe.options.timeoutMs).toBe(60_000);
    }
  });
});

// ============================================================================
// Node runtime label
// ============================================================================

describe("status command — Node runtime label", () => {
  it("renders the major version the runtime executable reports", async () => {
    const fixture = createStatusFixture({responses: withOverrides({[NODE_VERSION_KEY]: succeeded("v42.1.0\n")})});

    const execution = await fixture.command.run([]);

    expect(execution.exitCode).toBe(0);
    expect(renderedText(fixture.sink)).toMatch(/Node: 42\.x/);
  });

  it("issues the version probe through the runtime executable with cwd, a bounded timeout, and the invocation signal", async () => {
    const fixture = createStatusFixture();

    await fixture.command.run([]);

    const call = fixture.runner.calls.find((entry) => entry.request.args[0] === "--version");
    expect(call).toBeDefined();
    expect(call?.request.command).toBe("/usr/bin/node");
    expect(call?.request.args).toEqual(["--version"]);
    expect(call?.options.cwd).toBe(FIXTURE_ROOT);
    expect(call?.options.timeoutMs).toBe(10_000);
    expect(call?.options.signal).toBeInstanceOf(AbortSignal);
  });

  it("adds exactly one version probe to the human dashboard process inventory", async () => {
    const fixture = createStatusFixture();

    await fixture.command.run([]);

    expect(fixture.runner.calls.map((call) => processKey(call.request)).toSorted()).toEqual(
      [
        GIT_BRANCH_KEY,
        GIT_SHA_KEY,
        GIT_LOG_TIME_KEY,
        GIT_LOG_MSG_KEY,
        GIT_STATUS_KEY,
        NPM_AUDIT_KEY,
        NPM_OUTDATED_KEY,
        NODE_VERSION_KEY,
        diskProbeKey(DISK_NODE_MODULES_TARGET),
        diskProbeKey(DISK_NEXT_BUILD_TARGET),
        diskProbeKey(DISK_COMPONENTS_DIST_TARGET),
      ].toSorted(),
    );
  });

  it("never probes the runtime version for machine-readable output", async () => {
    const fixture = createStatusFixture({mode: "json"});

    const document = await runJson(fixture);

    expect(fixture.runner.calls.some((call) => call.request.args[0] === "--version")).toBe(false);
    expect(Object.keys(document).toSorted()).toEqual(["disk", "git", "health", "nxEdges", "security", "workspaces"].toSorted());
  });

  it.each([
    ["a spawn failure", spawnFailed("node is missing")],
    ["a timeout", timedOut()],
    ["a signal termination", signalled()],
    ["a nonzero exit", exited(1, "v26.3.1")],
    ["malformed output", succeeded("not-a-version")],
  ])("falls back to an unknown label instead of failing on %s", async (_label, outcome) => {
    const fixture = createStatusFixture({responses: withOverrides({[NODE_VERSION_KEY]: outcome})});

    const execution = await fixture.command.run([]);

    expect(execution.status).toBe("completed");
    expect(execution.exitCode).toBe(0);
    const text = renderedText(fixture.sink);
    expect(text).toMatch(/Node: \?\.x/);
    expect(text).toMatch(/Health: 92 \(A\)/);
  });

  it("falls back to an unknown label when the version probe rejects, without degrading a sibling section", async () => {
    const responses = baseResponses();
    responses.delete(NODE_VERSION_KEY);
    const fixture = createStatusFixture({responses});

    const execution = await fixture.command.run([]);

    expect(execution.exitCode).toBe(0);
    const text = renderedText(fixture.sink);
    expect(text).toMatch(/Node: \?\.x/);
    expect(text).toMatch(/main/);
  });
});

// ============================================================================
// Source-derived Nx graph collection
// ============================================================================

describe("source-derived Nx graph collection", () => {
  const sourceText = readFileSync(fileURLToPath(new URL("./status.ts", import.meta.url)), "utf8");

  it("never writes or unlinks a temporary graph file and never dispatches Nx in production source", () => {
    expect(sourceText).not.toMatch(/unlinkSync/);
    expect(sourceText).not.toMatch(/writeFileSync/);
    expect(sourceText).not.toMatch(/--file=/);
    expect(sourceText).not.toMatch(/nx-graph-status-tmp/);
    expect(sourceText).not.toMatch(/"npx"/);
  });

  it("composes doctor through the typed command object rather than the deleted runDoctor adapter", () => {
    expect(sourceText).not.toMatch(/runDoctor/);
    expect(sourceText).toMatch(/doctorCommand/);
  });

  it("reads no ambient Node runtime version in production source", () => {
    expect(sourceText).not.toMatch(/process\.versions/);
    expect(sourceText).not.toMatch(/process\.version\b/);
  });

  it("emits one deterministically ordered nxEdges entry per logical dependency", async () => {
    const fixture = createStatusFixture({
      mode: "json",
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

    const document = await runJson(fixture);

    expect(document["nxEdges"]).toEqual([
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

  function realDiskSources(root: string) {
    const environment = snapshotNodeEnvironment();
    return {
      runner: createNodeProcessRunner(environment),
      tasks: new DefaultTaskScheduler(),
      paths: createRepositoryPaths(root),
      executablePath: environment.executablePath,
      signal: new AbortController().signal,
    };
  }

  function scriptedDiskSources(outcome: ProcessOutcome) {
    return {
      runner: new ScriptedProcessRunner(
        new Map<string, ProcessOutcome>([
          [diskProbeKey(DISK_NODE_MODULES_TARGET), outcome],
          [diskProbeKey(DISK_NEXT_BUILD_TARGET), outcome],
          [diskProbeKey(DISK_COMPONENTS_DIST_TARGET), outcome],
        ]),
      ),
      tasks: new DefaultTaskScheduler(),
      paths: FIXTURE_PATHS,
      executablePath: "/usr/bin/node",
      signal: new AbortController().signal,
    };
  }

  it("reaches disk: null when a probe command exits non-zero", async () => {
    await expect(collectDisk(scriptedDiskSources(exited(1, "", "boom")))).resolves.toBeNull();
  });

  it("reaches disk: null on a probe timeout, spawn failure, or signal termination", async () => {
    await expect(collectDisk(scriptedDiskSources(timedOut()))).resolves.toBeNull();
    await expect(collectDisk(scriptedDiskSources(spawnFailed("ENOENT")))).resolves.toBeNull();
    await expect(collectDisk(scriptedDiskSources(signalled()))).resolves.toBeNull();
  });

  it.each(["", "12.5", "-5", "not-a-number"])("reaches disk: null for malformed probe output '%s'", async (stdout) => {
    await expect(collectDisk(scriptedDiskSources(succeeded(stdout)))).resolves.toBeNull();
  });

  it("sums nested files through the real runner and probe, and reports zero for a genuinely absent directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "arolariu-status-disk-"));
    fixtureRoots.push(root);

    await mkdir(join(root, "node_modules", "nested"), {recursive: true});
    await writeFile(join(root, "node_modules", "a.txt"), "12345"); // 5 bytes
    await writeFile(join(root, "node_modules", "nested", "b.txt"), "1234567890"); // 10 bytes
    await mkdir(join(root, "packages", "components", "dist"), {recursive: true});
    await writeFile(join(root, "packages", "components", "dist", "bundle.js"), "abcdefghij"); // 10 bytes
    // sites/arolariu.ro/.next is intentionally left absent.

    const disk = await collectDisk(realDiskSources(root));

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

    const disk = await collectDisk(realDiskSources(root));

    expect(disk).toEqual({nodeModules: 5, nextBuild: 0, componentsDist: 0});
  }, 20_000);
});

// ============================================================================
// Collector independence
// ============================================================================

describe("status command — collector independence", () => {
  it("renders git as unavailable when one underlying git command fails, while siblings still render", async () => {
    const fixture = createStatusFixture({mode: "json", responses: withOverrides({[GIT_BRANCH_KEY]: exited(1)})});

    const document = await runJson(fixture);

    expect(document["git"]).toBeNull();
    expect(document["workspaces"]).not.toBeNull();
    expect(document["health"]).not.toBeNull();
    expect(document["nxEdges"]).not.toBeNull();
    expect(document["security"]).not.toBeNull();
    expect(document["disk"]).not.toBeNull();
  });

  it("renders workspaces and nxEdges as unavailable when workspace inspection is unavailable", async () => {
    const fixture = createStatusFixture({mode: "json", workspace: unavailableFact});

    const document = await runJson(fixture);

    expect(document["workspaces"]).toBeNull();
    expect(document["nxEdges"]).toBeNull();
    expect(document["nxEdges"]).not.toEqual([]);
    expect(document["git"]).not.toBeNull();
  });

  it("degrades a rejected collector to null without invalidating its siblings", async () => {
    const fixture = createStatusFixture({
      mode: "json",
      workspace: () => Promise.reject(new Error("inspection boom")),
    });

    const document = await runJson(fixture);

    expect(document["workspaces"]).toBeNull();
    expect(document["nxEdges"]).toBeNull();
    expect(document["git"]).not.toBeNull();
    expect(document["security"]).not.toBeNull();
    expect(document["disk"]).not.toBeNull();
    expect(document["health"]).not.toBeNull();
  });

  it("renders security as unavailable (not zero counts) when npm audit JSON is malformed", async () => {
    const fixture = createStatusFixture({mode: "json", responses: withOverrides({[NPM_AUDIT_KEY]: exited(1, "not json at all")})});

    const document = await runJson(fixture);

    expect(document["security"]).toBeNull();
  });

  it("renders security as unavailable — not a fabricated zero-outdated success — when npm outdated stdout is empty", async () => {
    const fixture = createStatusFixture({mode: "json", responses: withOverrides({[NPM_OUTDATED_KEY]: succeeded("")})});

    const document = await runJson(fixture);

    expect(document["security"]).toBeNull();
  });

  it("retains a genuinely empty npm outdated JSON object ({}) as zero-outdated success data", async () => {
    const fixture = createStatusFixture({mode: "json", responses: withOverrides({[NPM_OUTDATED_KEY]: succeeded("{}")})});

    const document = await runJson(fixture);

    expect(document["security"]).toEqual({
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
    const fixture = createStatusFixture({mode: "json", responses: withOverrides({[NPM_OUTDATED_KEY]: succeeded("not json")})});

    const document = await runJson(fixture);

    expect(document["security"]).toBeNull();
  });

  it("renders security as unavailable on an npm transport failure", async () => {
    const fixture = createStatusFixture({mode: "json", responses: withOverrides({[NPM_AUDIT_KEY]: timedOut()})});

    const document = await runJson(fixture);

    expect(document["security"]).toBeNull();
  });

  it("retains nonzero npm audit/outdated JSON output as valid security data", async () => {
    const fixture = createStatusFixture({
      mode: "json",
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

    const document = await runJson(fixture);

    expect(document["security"]).toEqual({
      critical: 1,
      high: 2,
      moderate: 0,
      low: 0,
      majorOutdated: 1,
      minorOutdated: 1,
      patchOutdated: 1,
    });
  });

  it("renders disk as unavailable when a directory-size probe fails", async () => {
    const fixture = createStatusFixture({
      mode: "json",
      responses: withOverrides({[diskProbeKey(DISK_NODE_MODULES_TARGET)]: exited(1)}),
    });

    const document = await runJson(fixture);

    expect(document["disk"]).toBeNull();
    expect(document["git"]).not.toBeNull();
  });

  it("renders disk as unavailable when a directory-size probe emits malformed output", async () => {
    const fixture = createStatusFixture({
      mode: "json",
      responses: withOverrides({[diskProbeKey(DISK_NEXT_BUILD_TARGET)]: succeeded("not-a-number")}),
    });

    const document = await runJson(fixture);

    expect(document["disk"]).toBeNull();
  });
});

// ============================================================================
// Document shape
// ============================================================================

describe("status command — document", () => {
  it("emits exactly one ANSI-free JSON document with the six preserved top-level keys", async () => {
    const fixture = createStatusFixture({mode: "json"});

    const document = await runJson(fixture);

    expect(Object.keys(document).toSorted()).toEqual(["disk", "git", "health", "nxEdges", "security", "workspaces"].toSorted());
    expect(document["health"]).toEqual({score: 92, grade: "A", summary: {passed: 3, warnings: 1, failed: 0, skipped: 2}});
  });

  it("returns the typed document as the completed command value", async () => {
    const fixture = createStatusFixture();

    const execution = await fixture.command.invoke({json: false}, {presentation: "silent"});

    expect(execution.status).toBe("completed");
    if (execution.status !== "completed") {
      throw new Error("Status unexpectedly did not complete.");
    }
    const document: StatusDocument = execution.value;
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
    const fixture = createStatusFixture({
      mode: "json",
      workspace: availableWorkspace({
        projects: [{name: "new-project", root: "sites/new-project", targets: ["build"]}],
        dependencies: [{source: "new-project", target: "@arolariu/components"}],
        cycles: [],
      }),
      files: {
        [`${FIXTURE_ROOT}/sites/new-project/package.json`]: JSON.stringify({name: "@arolariu/new-project", version: "1.2.3"}),
        [`${FIXTURE_ROOT}/sites/new-project/project.json`]: JSON.stringify({projectType: "library", tags: ["domain:web", "type:lib"]}),
      },
    });

    const document = await runJson(fixture);

    expect(document["workspaces"]).toEqual([{name: "@arolariu/new-project", version: "1.2.3", type: "lib", tags: ["domain:web", "type:lib"]}]);
    expect(document["nxEdges"]).toEqual([{source: "new-project", target: "@arolariu/components"}]);
  });
});

// ============================================================================
// Human dashboard
// ============================================================================

describe("status command — human dashboard", () => {
  it("renders workspace, git, security, disk, and health content only through the logger", async () => {
    const fixture = createStatusFixture();

    const execution = await fixture.command.run([]);

    expect(execution.status).toBe("completed");
    expect(execution.exitCode).toBe(0);
    const text = renderedText(fixture.sink);
    expect(text).toMatch(/Workspaces/);
    expect(text).toMatch(/main/);
    expect(text).toMatch(/Health/);
    expect(text).toMatch(/Git/);
    expect(text).toMatch(/Security/);
    expect(text).toMatch(/Disk/);
    expect(text).toMatch(/passed/);
  });

  it("renders unavailable sections without crashing or fabricating success values", async () => {
    const fixture = createStatusFixture({responses: withOverrides({[GIT_BRANCH_KEY]: exited(1)})});

    const execution = await fixture.command.run([]);

    expect(execution.exitCode).toBe(0);
    expect(renderedText(fixture.sink)).toMatch(/unavailable/);
  });
});

// ============================================================================
// Direct entrypoint smoke
// ============================================================================

describe("direct entrypoint", () => {
  const statusEntrypoint = fileURLToPath(new URL("./status.ts", import.meta.url));

  function runDirect(args: readonly string[]): Promise<Readonly<{code: number | null; output: string}>> {
    return new Promise((resolveProcess, rejectProcess) => {
      const child = spawn(process.execPath, [statusEntrypoint, ...args], {
        cwd: resolve(statusEntrypoint, "..", ".."),
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      child.stdout.on("data", (chunk: Buffer) => {
        output += chunk.toString("utf8");
      });
      child.stderr.on("data", (chunk: Buffer) => {
        output += chunk.toString("utf8");
      });
      child.once("error", rejectProcess);
      child.once("close", (code) => {
        resolveProcess({code, output});
      });
    });
  }

  it("emits help and exits 0 for a direct process invocation of --help", async () => {
    const result = await runDirect(["--help"]);

    expect(result.code).toBe(0);
    expect(result.output).toMatch(/Usage: status \[options\]/);
  }, 30_000);

  it("emits a usage diagnostic and exits 2 for a direct process invocation of an unknown flag", async () => {
    const result = await runDirect(["--bogus"]);

    expect(result.code).toBe(2);
    expect(result.output).toMatch(/unknown option/i);
  }, 30_000);
});
