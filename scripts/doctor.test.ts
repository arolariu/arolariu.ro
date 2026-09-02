// @vitest-environment node
/**
 * @fileoverview Contract tests for the read-only doctor command.
 * @module scripts.doctor.test
 *
 * @remarks
 * Every orchestrator test drives `doctorCommand.invoke()`/`run()` through an injected test
 * runtime factory whose filesystem is the in-memory repository fixture and whose inspection
 * registry hands out a deterministic session. No test in this file reads the live checkout,
 * spawns a real probe, or reaches a real network; only the direct-entrypoint smoke tests spawn
 * the real CLI.
 */

import {spawn} from "node:child_process";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {afterEach, describe, expect, it, vi, type Mock} from "vitest";

const {renderDoctorReportMock} = vi.hoisted(() => ({
  renderDoctorReportMock: vi.fn(),
}));

vi.mock("./doctor.reporter.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./doctor.reporter.ts")>();
  renderDoctorReportMock.mockImplementation(actual.renderDoctorReport);
  return {
    ...actual,
    renderDoctorReport: renderDoctorReportMock,
  };
});

import type {CommandExecution, CommandRuntimeFactory} from "./common/commander.ts";
import {
  createHttpResponse,
  createRepositoryFixtureFileSystem,
  createTestRuntimeFactory,
  repositoryFixtureRoot,
} from "./common/runtime.testing.ts";
import {
  HttpError,
  type Clock,
  type GetOnlyHttpClient,
  type RepositoryInspectionRequest,
  type RepositoryInspectionRuntime,
} from "./common/runtime.ts";
import {computeHealthScore, diagnosticWeights} from "./doctor.reporter.ts";
import {createBoundedNetworkProbe, createDoctorCommand, doctorModules, runDoctor} from "./doctor.ts";
import type {DiagnosticModule, DiagnosticModuleId, DiagnosticResult, DoctorContext, DoctorInput, DoctorReport} from "./doctor.types.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";

const expectedModuleOrder: readonly DiagnosticModuleId[] = ["workspace", "dotnet", "react", "svelte", "python", "infrastructure"];

/** One representative, already-registered diagnostic id per module, reused across fake fixtures. */
const REPRESENTATIVE_ID: Readonly<Record<DiagnosticModuleId, string>> = {
  workspace: "workspace.repository-root",
  dotnet: "dotnet.executable",
  react: "react.packages",
  svelte: "svelte.cv.packages",
  python: "python.runtime",
  infrastructure: "infrastructure.selection",
};

function passCheck(id: string, module: DiagnosticModuleId): DiagnosticResult {
  return {
    id,
    module,
    name: id,
    status: "pass",
    summary: `${id} is healthy.`,
    evidence: [],
    potentialCauses: [],
    fixes: [],
    durationMs: 1,
  };
}

function failCheck(id: string, module: DiagnosticModuleId): DiagnosticResult {
  return {
    id,
    module,
    name: id,
    status: "fail",
    summary: `${id} failed.`,
    evidence: [`${id} evidence`],
    rootCause: `${id} root cause`,
    potentialCauses: [],
    fixes: [{description: `Fix ${id}.`}],
    durationMs: 1,
  };
}

function skippedCheck(id: string, module: DiagnosticModuleId): DiagnosticResult {
  return {
    id,
    module,
    name: id,
    status: "skipped",
    summary: `${id} was skipped.`,
    evidence: [],
    potentialCauses: [],
    fixes: [],
    durationMs: 0,
  };
}

function doctorInput(patch: Partial<DoctorInput> = {}): DoctorInput {
  return {verbose: false, quick: false, ...patch};
}

/**
 * Creates one fake diagnostic module per bounded context, each recording its invocation and
 * returning one representative passing check by default.
 *
 * @param overrides - Per-module `run` replacements for the modules under test.
 * @returns The fake modules in fixed order plus their recorded `run` mocks.
 */
function createFakeModules(overrides: Partial<Record<DiagnosticModuleId, DiagnosticModule["run"]>> = {}): Readonly<{
  modules: readonly DiagnosticModule[];
  calls: Readonly<Record<DiagnosticModuleId, Mock<DiagnosticModule["run"]>>>;
}> {
  const calls = {} as Record<DiagnosticModuleId, Mock<DiagnosticModule["run"]>>;
  const modules = expectedModuleOrder.map((id): DiagnosticModule => {
    const defaultRun: DiagnosticModule["run"] = async () => [passCheck(REPRESENTATIVE_ID[id], id)];
    const run = vi.fn<DiagnosticModule["run"]>(overrides[id] ?? defaultRun);
    calls[id] = run;
    return {id, title: id, run};
  });

  return {modules, calls};
}

/** Deterministic inspection session that reports every fact as unavailable. */
function createFixtureSession(inspect?: (key: string) => Promise<InspectionOutcome<unknown>>): RepositoryInspectionSession {
  const inspectImplementation =
    inspect ?? (async (): Promise<InspectionOutcome<unknown>> => ({kind: "unavailable", reason: "Doctor test session.", durationMs: 0}));

  return {
    inspect: inspectImplementation as unknown as RepositoryInspectionSession["inspect"],
    invalidate: (): void => undefined,
    updateInfrastructureEngine: (): void => undefined,
  } as RepositoryInspectionSession;
}

interface DoctorFixtureInspection {
  readonly inspection: RepositoryInspectionRuntime;
  readonly requests: readonly Readonly<RepositoryInspectionRequest>[];
  readonly sessions: readonly RepositoryInspectionSession[];
}

/** Records every session request while returning the exact same session instance every time. */
function createFixtureInspection(session: RepositoryInspectionSession = createFixtureSession()): DoctorFixtureInspection {
  const requests: Readonly<RepositoryInspectionRequest>[] = [];
  const sessions: RepositoryInspectionSession[] = [];

  return {
    inspection: {
      getRepositorySession: (request: Readonly<RepositoryInspectionRequest>): RepositoryInspectionSession => {
        requests.push(request);
        sessions.push(session);
        return session;
      },
    },
    get requests(): readonly Readonly<RepositoryInspectionRequest>[] {
      return requests;
    },
    get sessions(): readonly RepositoryInspectionSession[] {
      return sessions;
    },
  };
}

/** Builds the hermetic runtime factory every orchestrator test uses. */
function createFixtureRuntimeFactory(inspection: RepositoryInspectionRuntime): CommandRuntimeFactory {
  return createTestRuntimeFactory({files: createRepositoryFixtureFileSystem(), inspection});
}

interface DoctorFixture {
  readonly command: ReturnType<typeof createDoctorCommand>;
  readonly calls: Readonly<Record<DiagnosticModuleId, Mock<DiagnosticModule["run"]>>>;
  readonly inspection: DoctorFixtureInspection;
}

/**
 * Assembles a doctor command wired to fake modules, the in-memory repository fixture, and a
 * deterministic inspection registry.
 *
 * @param input - Optional module overrides and inspection session replacement.
 * @returns The command plus its recorded module and inspection seams.
 */
function createDoctorFixture(
  input: Readonly<{
    overrides?: Partial<Record<DiagnosticModuleId, DiagnosticModule["run"]>>;
    session?: RepositoryInspectionSession;
  }> = {},
): DoctorFixture {
  const {modules, calls} = createFakeModules(input.overrides ?? {});
  const inspection = createFixtureInspection(input.session ?? createFixtureSession());
  const command = createDoctorCommand({runtimeFactory: createFixtureRuntimeFactory(inspection.inspection), modules});
  return {command, calls, inspection};
}

function expectCompleted(execution: CommandExecution<DoctorReport>): DoctorReport {
  expect(execution.status).toBe("completed");
  if (execution.status !== "completed") {
    throw new Error("Doctor did not complete.");
  }
  return execution.value;
}

function moduleContext(call: Mock<DiagnosticModule["run"]>): DoctorContext {
  const [context] = call.mock.calls[0] as [DoctorContext];
  return context;
}

afterEach(() => {
  vi.restoreAllMocks();
  renderDoctorReportMock.mockClear();
});

describe("doctorModules", () => {
  it("declares the exact required module order", () => {
    expect(doctorModules.map((module) => module.id)).toEqual(expectedModuleOrder);
  });
});

describe("createBoundedNetworkProbe", () => {
  function fixedClock(values: readonly number[]): Clock {
    const remaining = [...values];
    return {
      monotonicNow: (): number => remaining.shift() ?? 0,
      isoTimestamp: (): string => "2026-08-29T00:00:00.000Z",
      delay: (): Promise<void> => Promise.resolve(),
    };
  }

  it("captures status, statusCode, body, and duration for a reachable response", async () => {
    const get = vi.fn<GetOnlyHttpClient["get"]>(async () => createHttpResponse(200, "reachable-body"));
    const probe = createBoundedNetworkProbe({get} satisfies GetOnlyHttpClient, fixedClock([100, 140]));

    const result = await probe.get(new URL("https://example.com/probe"), 4_000);

    expect(result).toEqual({status: "reachable", statusCode: 200, durationMs: 40, body: "reachable-body"});
    expect(get).toHaveBeenCalledTimes(1);
    const request = get.mock.calls[0]?.[0];
    expect(request).toBeDefined();
    if (request === undefined) throw new Error("The GET-only client was never called.");
    expect(request.url.href).toBe("https://example.com/probe");
    expect(request.timeoutMs).toBe(4_000);
  });

  it("classifies a timeout abort as unavailable, distinct from an unexpected error", async () => {
    const url = new URL("https://example.com/probe");
    const get = vi.fn<GetOnlyHttpClient["get"]>(async () => {
      throw new HttpError(
        "HTTP request failed: timed out",
        {url, method: "GET"},
        {
          cause: new DOMException("The operation timed out.", "TimeoutError"),
        },
      );
    });

    const result = await createBoundedNetworkProbe({get} satisfies GetOnlyHttpClient, fixedClock([0, 10])).get(url, 10);

    expect(result.status).toBe("unavailable");
    expect(result.error).toMatch(/timed out/i);
    expect(result.statusCode).toBeUndefined();
    expect(result.body).toBeUndefined();
    expect(result.durationMs).toBe(10);
  });

  it("classifies an unreachable network failure as unavailable", async () => {
    const url = new URL("https://example.com/probe");
    const get = vi.fn<GetOnlyHttpClient["get"]>(async () => {
      throw new HttpError("HTTP request failed: fetch failed", {url, method: "GET"}, {cause: new TypeError("fetch failed")});
    });

    const result = await createBoundedNetworkProbe({get} satisfies GetOnlyHttpClient, fixedClock([0, 1])).get(url, 10);

    expect(result.status).toBe("unavailable");
    expect(result.error).toMatch(/could not reach/i);
  });

  it("classifies an unexpected non-network failure as error, not unavailable", async () => {
    const get = vi.fn<GetOnlyHttpClient["get"]>(async () => {
      throw new Error("boom");
    });

    const result = await createBoundedNetworkProbe({get} satisfies GetOnlyHttpClient, fixedClock([0, 1])).get(
      new URL("https://example.com/probe"),
      10,
    );

    expect(result.status).toBe("error");
    expect(result.error).toMatch(/unexpectedly/i);
  });

  it("never sends a request body or a mutating method through the GET-only client", async () => {
    const get = vi.fn<GetOnlyHttpClient["get"]>(async () => createHttpResponse(204, ""));
    const probe = createBoundedNetworkProbe({get} satisfies GetOnlyHttpClient, fixedClock([0, 1]));

    await probe.get(new URL("https://example.com/probe"), 500);

    const [request] = get.mock.calls[0] as [Readonly<Record<string, unknown>>];
    expect(request["method"]).toBeUndefined();
    expect(request["body"]).toBeUndefined();
  });
});

describe("doctorCommand.invoke", () => {
  it.each([
    ["default", doctorInput()],
    ["quick", doctorInput({quick: true})],
  ] as const)("invokes every module exactly once with the exact %s input", async (_label, input) => {
    const fixture = createDoctorFixture();

    const execution = await fixture.command.invoke(input, {presentation: "silent"});

    const report = expectCompleted(execution);
    expect(execution.exitCode).toBe(0);
    for (const moduleId of expectedModuleOrder) {
      expect(fixture.calls[moduleId]).toHaveBeenCalledTimes(1);
      expect(moduleContext(fixture.calls[moduleId]).options).toEqual(input);
    }
    expect(report.checks).toHaveLength(6);
    expect(report.checks.map(({module}) => module)).toEqual(expectedModuleOrder);
  });

  it("flattens results into the fixed module order regardless of completion time", async () => {
    const delayMsById: Readonly<Record<DiagnosticModuleId, number>> = {
      workspace: 15,
      dotnet: 1,
      react: 25,
      svelte: 5,
      python: 20,
      infrastructure: 1,
    };
    const overrides = Object.fromEntries(
      expectedModuleOrder.map((id) => [
        id,
        async (): Promise<readonly DiagnosticResult[]> => {
          await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMsById[id]));
          return [passCheck(REPRESENTATIVE_ID[id], id)];
        },
      ]),
    ) as Partial<Record<DiagnosticModuleId, DiagnosticModule["run"]>>;
    const fixture = createDoctorFixture({overrides});

    const report = expectCompleted(await fixture.command.invoke(doctorInput(), {presentation: "silent"}));

    expect(report.checks.map((check) => check.module)).toEqual(expectedModuleOrder);
  });

  it("completes with exit code 1 when the report contains a failed check", async () => {
    const fixture = createDoctorFixture({
      overrides: {python: async () => [failCheck("python.runtime", "python")]},
    });

    const execution = await fixture.command.invoke(doctorInput(), {presentation: "silent"});

    const report = expectCompleted(execution);
    expect(execution.exitCode).toBe(1);
    expect(report.summary.failed).toBe(1);
  });

  it("normalizes one module crash into a single fail row without stopping its siblings", async () => {
    const fixture = createDoctorFixture({
      overrides: {
        dotnet: async () => {
          throw new Error("dotnet probe exploded");
        },
      },
    });

    const execution = await fixture.command.invoke(doctorInput(), {presentation: "silent"});
    const report = expectCompleted(execution);

    expect(execution.exitCode).toBe(1);
    expect(report.checks).toHaveLength(6);
    const crashRow = report.checks.find((check) => check.id === "dotnet.module-error");
    expect(crashRow?.module).toBe("dotnet");
    expect(crashRow?.status).toBe("fail");
    expect(crashRow?.evidence).toContain("dotnet probe exploded");
    expect(crashRow?.fixes.length).toBeGreaterThan(0);
    expect((crashRow?.rootCause !== undefined) !== (crashRow?.potentialCauses.length !== 0)).toBe(true);
    expect(report.checks.some((check) => check.id === "workspace.repository-root")).toBe(true);
    expect(report.checks.some((check) => check.id === "react.packages")).toBe(true);
    expect(report.checks.some((check) => check.id === "svelte.cv.packages")).toBe(true);
    expect(report.checks.some((check) => check.id === "python.runtime")).toBe(true);
    expect(report.checks.some((check) => check.id === "infrastructure.selection")).toBe(true);
  });

  it("normalizes multiple independent module crashes without stopping remaining siblings", async () => {
    const fixture = createDoctorFixture({
      overrides: {
        workspace: async () => {
          throw new Error("workspace probe exploded");
        },
        python: async () => {
          throw new Error("python probe exploded");
        },
      },
    });

    const report = expectCompleted(await fixture.command.invoke(doctorInput(), {presentation: "silent"}));

    expect(report.checks).toHaveLength(6);
    expect(report.checks.find((check) => check.id === "workspace.module-error")?.status).toBe("fail");
    expect(report.checks.find((check) => check.id === "python.module-error")?.status).toBe("fail");
    expect(report.checks.filter((check) => check.status === "pass")).toHaveLength(4);
  });

  it("normalizes an empty-message Error crash into a stable non-empty evidence entry", async () => {
    const fixture = createDoctorFixture({
      overrides: {
        dotnet: async () => {
          throw new Error();
        },
      },
    });

    const report = expectCompleted(await fixture.command.invoke(doctorInput(), {presentation: "silent"}));

    expect(report.checks).toHaveLength(6);
    const crashRow = report.checks.find((check) => check.id === "dotnet.module-error");
    expect(crashRow?.status).toBe("fail");
    expect(crashRow?.evidence).toHaveLength(1);
    expect(crashRow?.evidence[0]?.trim().length).toBeGreaterThan(0);
    expect(report.checks.some((check) => check.id === "workspace.repository-root")).toBe(true);
  });

  it("normalizes an empty-string throw crash into a stable non-empty evidence entry", async () => {
    const fixture = createDoctorFixture({
      overrides: {
        react: async () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- exercising a non-Error thrown value on purpose.
          throw "";
        },
      },
    });

    const report = expectCompleted(await fixture.command.invoke(doctorInput(), {presentation: "silent"}));

    expect(report.checks).toHaveLength(6);
    const crashRow = report.checks.find((check) => check.id === "react.module-error");
    expect(crashRow?.status).toBe("fail");
    expect(crashRow?.evidence).toHaveLength(1);
    expect(crashRow?.evidence[0]?.trim().length).toBeGreaterThan(0);
    expect(report.checks.some((check) => check.id === "workspace.repository-root")).toBe(true);
  });

  it("strips ANSI escape sequences from an Error crash message before it becomes evidence", async () => {
    const fixture = createDoctorFixture({
      overrides: {
        svelte: async () => {
          throw new Error("\u001B[31msvelte boom\u001B[0m");
        },
      },
    });

    const report = expectCompleted(await fixture.command.invoke(doctorInput(), {presentation: "silent"}));

    const crashRow = report.checks.find((check) => check.id === "svelte.module-error");
    expect(crashRow?.evidence).toEqual(["svelte boom"]);
    expect(crashRow?.evidence[0]).not.toMatch(/\u001B/);
  });

  it("strips ANSI escape sequences from a safe error-shaped object crash without an unsafe cast", async () => {
    const fixture = createDoctorFixture({
      overrides: {
        python: async () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- exercising a safe error-shaped non-Error object.
          throw {message: "\u001B[31mpython boom\u001B[0m"};
        },
      },
    });

    const report = expectCompleted(await fixture.command.invoke(doctorInput(), {presentation: "silent"}));

    expect(report.checks.find((check) => check.id === "python.module-error")?.evidence).toEqual(["python boom"]);
  });

  it("normalizes a non-Error, non-object unknown thrown value into a stable evidence entry", async () => {
    const fixture = createDoctorFixture({
      overrides: {
        infrastructure: async () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- exercising a non-Error thrown value on purpose.
          throw 42;
        },
      },
    });

    const report = expectCompleted(await fixture.command.invoke(doctorInput(), {presentation: "silent"}));

    expect(report.checks.find((check) => check.id === "infrastructure.module-error")?.evidence).toEqual(["42"]);
  });

  it.each([
    ["two different modules", {react: async (): Promise<readonly DiagnosticResult[]> => [passCheck("workspace.repository-root", "react")]}],
    [
      "the same module",
      {
        workspace: async (): Promise<readonly DiagnosticResult[]> => [
          passCheck("workspace.repository-root", "workspace"),
          passCheck("workspace.repository-root", "workspace"),
        ],
      },
    ],
  ] as const)("fails the invocation for duplicate result ids emitted by %s", async (_label, overrides) => {
    const fixture = createDoctorFixture({overrides});

    const execution = await fixture.command.invoke(doctorInput(), {presentation: "silent"});

    expect(execution.status).toBe("failed");
    if (execution.status !== "failed") {
      throw new Error("Doctor unexpectedly completed with duplicate diagnostic ids.");
    }
    expect(execution.failure.message).toMatch(/duplicate/i);
    expect(renderDoctorReportMock).not.toHaveBeenCalled();
  });

  it("records the runtime clock timestamp on the report", async () => {
    const fixture = createDoctorFixture();

    const report = expectCompleted(await fixture.command.invoke(doctorInput(), {presentation: "silent"}));

    expect(report.timestamp).toBe("2025-01-01T00:00:00.000Z");
  });

  it("hands every module the exact same runtime-owned inspection session", async () => {
    const fixture = createDoctorFixture();

    await fixture.command.invoke(doctorInput(), {presentation: "silent"});

    expect(fixture.inspection.requests).toHaveLength(1);
    const [session] = fixture.inspection.sessions;
    for (const moduleId of expectedModuleOrder) {
      expect(moduleContext(fixture.calls[moduleId]).inspection).toBe(session);
    }
  });

  it.each([
    ["full", doctorInput(), "full"],
    ["quick", doctorInput({quick: true}), "quick"],
  ] as const)("requests a %s inspection profile for the repository root", async (_label, input, profile) => {
    const fixture = createDoctorFixture();

    await fixture.command.invoke(input, {presentation: "silent"});

    expect(fixture.inspection.requests).toHaveLength(1);
    expect(fixture.inspection.requests[0]?.profile).toBe(profile);
    expect(fixture.inspection.requests[0]?.paths.root).toBe(repositoryFixtureRoot);
  });

  it("prewarms aggregate inspection exactly once in full mode and never in quick mode", async () => {
    const inspect = vi.fn(async (_key: string): Promise<InspectionOutcome<unknown>> => ({
      kind: "unavailable",
      reason: "Doctor test session.",
      durationMs: 0,
    }));
    const fullFixture = createDoctorFixture({session: createFixtureSession(inspect)});

    await fullFixture.command.invoke(doctorInput(), {presentation: "silent"});
    expect(inspect.mock.calls.filter(([key]) => key === "aggregate")).toHaveLength(1);

    inspect.mockClear();
    const quickFixture = createDoctorFixture({session: createFixtureSession(inspect)});
    await quickFixture.command.invoke(doctorInput({quick: true}), {presentation: "silent"});
    expect(inspect.mock.calls.filter(([key]) => key === "aggregate")).toHaveLength(0);
  });

  it("never leaves the aggregate prewarm rejection unhandled when inspection is cancelled", async () => {
    const unhandled: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      const fixture = createDoctorFixture({
        session: createFixtureSession(async (): Promise<InspectionOutcome<unknown>> => {
          throw new Error("Repository inspection was cancelled.");
        }),
      });

      const execution = await fixture.command.invoke(doctorInput(), {presentation: "silent"});
      expectCompleted(execution);

      await new Promise((resolveTick) => setTimeout(resolveTick, 10));
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }
  });

  it("hands modules only read-only capabilities", async () => {
    const fixture = createDoctorFixture();

    await fixture.command.invoke(doctorInput(), {presentation: "silent"});

    const context = moduleContext(fixture.calls["workspace"]);
    expect(Object.keys(context).toSorted()).toEqual([
      "clock",
      "environment",
      "files",
      "inspection",
      "logger",
      "network",
      "options",
      "paths",
      "probes",
      "requirements",
    ]);
    for (const mutation of ["writeText", "writeBytes", "remove", "createDirectory", "move", "copy"]) {
      expect(mutation in context.files).toBe(false);
    }
    expect(context.paths.root).toBe(repositoryFixtureRoot);
    expect(typeof context.clock.monotonicNow()).toBe("number");
    expect(context.environment.variables).toBeDefined();
  });

  it("renders the report exactly once in human presentation", async () => {
    const fixture = createDoctorFixture();

    await fixture.command.invoke(doctorInput(), {presentation: "human"});

    expect(renderDoctorReportMock).toHaveBeenCalledTimes(1);
    const [report] = renderDoctorReportMock.mock.calls[0] as [unknown];
    expect(report).toHaveProperty("score");
    expect(report).toHaveProperty("grade");
  });

  it("never renders the report in silent presentation", async () => {
    const fixture = createDoctorFixture();

    await fixture.command.invoke(doctorInput(), {presentation: "silent"});

    expect(renderDoctorReportMock).not.toHaveBeenCalled();
  });
});

describe("doctorCommand.run", () => {
  it.each(["--help", "-h", "/h", "/help", "/?"])("renders help and exits 0 for '%s'", async (flag) => {
    const fixture = createDoctorFixture();

    const execution = await fixture.command.run([flag]);

    expect(execution.status).toBe("help");
    expect(execution.exitCode).toBe(0);
    for (const moduleId of expectedModuleOrder) {
      expect(fixture.calls[moduleId]).not.toHaveBeenCalled();
    }
  });

  it.each([
    ["--verbose", {verbose: true, quick: false}],
    ["-v", {verbose: true, quick: false}],
    ["/v", {verbose: true, quick: false}],
    ["--quick", {verbose: false, quick: true}],
    ["/q", {verbose: false, quick: true}],
  ] as const)("decodes '%s' into typed doctor input", async (flag, expected) => {
    const fixture = createDoctorFixture();

    await fixture.command.run([flag]);

    expect(moduleContext(fixture.calls["workspace"]).options).toEqual(expected);
  });

  it("decodes every flag together", async () => {
    const fixture = createDoctorFixture();

    await fixture.command.run(["/q", "/v"]);

    expect(moduleContext(fixture.calls["workspace"]).options).toEqual({quick: true, verbose: true});
  });

  it.each(["--ci", "--json", "--score", "--bogus", "workspace"])("rejects '%s' as a usage failure", async (argument) => {
    const fixture = createDoctorFixture();

    const execution = await fixture.command.run([argument]);

    expect(execution.status).toBe("failed");
    expect(execution.exitCode).toBe(2);
    for (const moduleId of expectedModuleOrder) {
      expect(fixture.calls[moduleId]).not.toHaveBeenCalled();
    }
  });
});

describe("runDoctor compatibility adapter", () => {
  it("returns the typed report for the injected inspection session and repository paths", async () => {
    const session = createFixtureSession();
    const {modules, calls} = createFakeModules();

    const report = await runDoctor(doctorInput({quick: true}), {inspection: session, modules});

    expect(report.checks.map((check) => check.module)).toEqual(expectedModuleOrder);
    expect(report.summary.passed).toBe(6);
    for (const moduleId of expectedModuleOrder) {
      expect(moduleContext(calls[moduleId]).inspection).toBe(session);
    }
  });

  it("propagates report validation failures to the caller", async () => {
    const {modules} = createFakeModules({
      react: async () => [passCheck("workspace.repository-root", "react")],
    });

    await expect(runDoctor(doctorInput({quick: true}), {inspection: createFixtureSession(), modules})).rejects.toThrow(/duplicate/i);
  });
});

describe("module-error weighting", () => {
  const workspaceOrdinaryIds = Object.keys(diagnosticWeights).filter(
    (id) => id.startsWith("workspace.") && id !== "workspace.module-error",
  );
  const otherModulesPassing: readonly DiagnosticResult[] = [
    passCheck("dotnet.executable", "dotnet"),
    passCheck("react.packages", "react"),
    passCheck("svelte.cv.packages", "svelte"),
    passCheck("python.runtime", "python"),
    passCheck("infrastructure.selection", "infrastructure"),
  ];

  it("weighs a module crash as the sum of its module's ordinary weights", () => {
    const expectedWeight = workspaceOrdinaryIds.reduce((total, id) => total + (diagnosticWeights[id] ?? 0), 0);

    expect(diagnosticWeights["workspace.module-error"]).toBe(expectedWeight);
    expect(diagnosticWeights["workspace.module-error"]).toBe(135);
    expect(diagnosticWeights["dotnet.module-error"]).toBe(92);
    expect(diagnosticWeights["react.module-error"]).toBe(64);
    expect(diagnosticWeights["svelte.module-error"]).toBe(84);
    expect(diagnosticWeights["python.module-error"]).toBe(66);
    expect(diagnosticWeights["infrastructure.module-error"]).toBe(90);
  });

  it("scores a crashed module identically to every one of its checks explicitly failing", () => {
    const crashScenario = computeHealthScore([failCheck("workspace.module-error", "workspace"), ...otherModulesPassing]);
    const fullFailureScenario = computeHealthScore([
      ...workspaceOrdinaryIds.map((id) => failCheck(id, "workspace")),
      ...otherModulesPassing,
    ]);

    expect(crashScenario).toBe(fullFailureScenario);
  });

  it("does not shrink the score denominator the way skipping the crashed module's checks would", () => {
    const crashScenario = computeHealthScore([failCheck("workspace.module-error", "workspace"), ...otherModulesPassing]);
    const denominatorShrinkScenario = computeHealthScore([
      ...workspaceOrdinaryIds.map((id) => skippedCheck(id, "workspace")),
      ...otherModulesPassing,
    ]);

    expect(denominatorShrinkScenario).toBeGreaterThan(crashScenario);
  });
});

describe("direct entrypoint", () => {
  const doctorEntrypoint = fileURLToPath(new URL("./doctor.ts", import.meta.url));

  function runDirect(args: readonly string[]): Promise<Readonly<{code: number | null; output: string}>> {
    return new Promise((resolveProcess, rejectProcess) => {
      const child = spawn(process.execPath, [doctorEntrypoint, ...args], {
        cwd: resolve(doctorEntrypoint, "..", ".."),
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
    expect(result.output).toMatch(/Usage:/);
  });

  it("emits a usage diagnostic and exits 2 for a direct process invocation of an unknown flag", async () => {
    const result = await runDirect(["--bogus"]);

    expect(result.code).toBe(2);
    expect(result.output).toMatch(/unknown option/i);
  });
});
