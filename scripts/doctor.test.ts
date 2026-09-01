// @vitest-environment node
/**
 * @fileoverview Contract tests for the modular doctor CLI orchestrator.
 * @module scripts.doctor.test
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

import {InMemoryLoggerSink, MonorepositoryConsoleLogger} from "./common/logger.ts";
import {createRepositoryPaths, type RepositoryPaths} from "./common/repository-paths.ts";
import type {RepositoryRequirements} from "./common/requirements.ts";
import {computeHealthScore, diagnosticWeights} from "./doctor.reporter.ts";
import {createBoundedNetworkProbe, doctorModules, main, parseDoctorOptions, runDoctor, type DoctorDependencies} from "./doctor.ts";
import type {
  DiagnosticCommandRunner,
  DiagnosticModule,
  DiagnosticModuleId,
  DiagnosticNetworkProbe,
  DiagnosticResult,
  DoctorContext,
  DoctorRunOptions,
} from "./doctor.types.ts";
import type {RepositoryInspectionSession} from "./inspection/repository.ts";
import type {InspectionOutcome} from "./inspection/types.ts";

const MODULE_ORDER: readonly DiagnosticModuleId[] = ["workspace", "dotnet", "react", "svelte", "python", "infrastructure"];

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

function doctorOptions(patch: Partial<DoctorRunOptions> = {}): DoctorRunOptions {
  return {
    verbose: false,
    quick: false,
    ...patch,
  };
}

/**
 * Creates one fake diagnostic module per bounded context, each recording its
 * invocation and returning one representative passing check by default.
 *
 * @param overrides - Per-module `run` replacements for the modules under test.
 * @returns The fake modules in fixed order plus their recorded `run` mocks.
 */
function createFakeModules(overrides: Partial<Record<DiagnosticModuleId, DiagnosticModule["run"]>> = {}): Readonly<{
  modules: readonly DiagnosticModule[];
  calls: Readonly<Record<DiagnosticModuleId, Mock<DiagnosticModule["run"]>>>;
}> {
  const calls = {} as Record<DiagnosticModuleId, Mock<DiagnosticModule["run"]>>;
  const modules = MODULE_ORDER.map((id): DiagnosticModule => {
    const defaultRun: DiagnosticModule["run"] = async () => [passCheck(REPRESENTATIVE_ID[id], id)];
    const run = vi.fn<DiagnosticModule["run"]>(overrides[id] ?? defaultRun);
    calls[id] = run;
    return {id, title: id, run};
  });

  return {modules, calls};
}

const FIXED_REPOSITORY_PATHS: RepositoryPaths = createRepositoryPaths(resolve("C:\\fixture\\arolariu.ro"));

const FIXED_REPOSITORY_REQUIREMENTS: RepositoryRequirements = {
  node: {major: 24, minor: 0, patch: 0},
  npm: {major: 11, minor: 0, patch: 0},
  dotnet: {major: 10, minor: 0, patch: 0},
  python: {major: 3, minor: 12, patch: 0},
  packages: new Map(),
};

const noopRunner: DiagnosticCommandRunner = {
  run: vi.fn(async () => {
    throw new Error("Doctor test runner should not be invoked by a fake module.");
  }),
};

const noopNetwork: DiagnosticNetworkProbe = {
  get: vi.fn(async () => {
    throw new Error("Doctor test network probe should not be invoked by a fake module.");
  }),
};

/** Fake inspection session that resolves to unavailable for all keys. */
function createFakeInspectionSession(): RepositoryInspectionSession {
  return {
    inspect: async <Key extends string>(_key: Key): Promise<InspectionOutcome<unknown>> => ({
      kind: "unavailable" as const,
      reason: "Fake test session",
      durationMs: 0,
    }),
    invalidate: (): void => {},
    updateInfrastructureEngine: (): void => {},
  };
}

/** Fixed, deterministic runtime seam shared by every orchestrator test so it never reads the live checkout or a real network. */
function fixedRuntimeDependencies(): Readonly<
  Pick<
    DoctorDependencies,
    | "resolveRepositoryPaths"
    | "loadRepositoryRequirements"
    | "runner"
    | "network"
    | "platform"
    | "arch"
    | "env"
    | "now"
    | "timestamp"
    | "inspection"
  >
> {
  let tick = 0;
  return {
    resolveRepositoryPaths: () => FIXED_REPOSITORY_PATHS,
    loadRepositoryRequirements: async () => ({status: "valid", requirements: FIXED_REPOSITORY_REQUIREMENTS}),
    runner: noopRunner,
    network: noopNetwork,
    platform: "win32",
    arch: "x64",
    env: {},
    now: () => (tick += 1),
    timestamp: () => "2026-08-29T00:00:00.000Z",
    inspection: createFakeInspectionSession(),
  };
}

function createLogger(mode?: "human" | "json"): Readonly<{logger: MonorepositoryConsoleLogger; sink: InMemoryLoggerSink}> {
  const sink = new InMemoryLoggerSink();
  const logger = new MonorepositoryConsoleLogger("doctor", {
    color: false,
    sink,
    verbose: false,
    ...(mode === undefined ? {} : {mode}),
  });
  return {logger, sink};
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  renderDoctorReportMock.mockClear();
});

describe("doctorModules", () => {
  it("declares the exact required module order", () => {
    expect(doctorModules.map((module) => module.id)).toEqual(MODULE_ORDER);
  });
});

describe("parseDoctorOptions", () => {
  it("returns every flag disabled by default", () => {
    expect(parseDoctorOptions([])).toEqual(doctorOptions());
  });

  it.each([
    ["--verbose", "verbose"],
    ["-v", "verbose"],
    ["/v", "verbose"],
    ["--quick", "quick"],
    ["/q", "quick"],
  ] as const)("enables '%s'", (flag, key) => {
    expect(parseDoctorOptions([flag])[key]).toBe(true);
  });

  it("enables every flag and alias together", () => {
    expect(parseDoctorOptions(["--verbose", "--quick"])).toEqual(doctorOptions({verbose: true, quick: true}));
  });

  it("returns {quick: true, verbose: true} for ['/q', '/v']", () => {
    expect(parseDoctorOptions(["/q", "/v"])).toEqual({quick: true, verbose: true});
  });

  it.each(["--ci", "--json", "--score"])("rejects removed flag '%s' as an unknown option returning 1", (flag) => {
    expect(() => parseDoctorOptions([flag])).toThrow(/unknown doctor option/i);
  });

  it("rejects an unknown flag", () => {
    expect(() => parseDoctorOptions(["--bogus"])).toThrow(/unknown doctor option/i);
  });

  it("rejects a bare positional argument", () => {
    expect(() => parseDoctorOptions(["workspace"])).toThrow(/unknown doctor option/i);
  });
});

describe("createBoundedNetworkProbe", () => {
  it("captures status, statusCode, body, and duration for a reachable response", async () => {
    const response = {
      status: 200,
      text: vi.fn(async () => "reachable-body"),
    };
    const fetchMock = vi.fn(async (_url: URL, _init: {signal: AbortSignal}): Promise<unknown> => response);
    vi.stubGlobal("fetch", fetchMock);
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const now = vi.fn<() => number>().mockReturnValueOnce(100).mockReturnValueOnce(140);

    const probe = createBoundedNetworkProbe(now);
    const result = await probe.get(new URL("https://example.com/probe"), 4_000);

    expect(result).toEqual({status: "reachable", statusCode: 200, durationMs: 40, body: "reachable-body"});
    expect(timeoutSpy).toHaveBeenCalledWith(4_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [URL, {signal: AbortSignal}];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("classifies a timeout abort as unavailable, distinct from an unexpected error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("The operation timed out.", "TimeoutError");
      }),
    );
    const now = vi.fn<() => number>().mockReturnValueOnce(0).mockReturnValueOnce(10);

    const result = await createBoundedNetworkProbe(now).get(new URL("https://example.com/probe"), 10);

    expect(result.status).toBe("unavailable");
    expect(result.error).toMatch(/timed out/i);
    expect(result.statusCode).toBeUndefined();
    expect(result.body).toBeUndefined();
    expect(result.durationMs).toBe(10);
  });

  it("classifies an unreachable network failure as unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    const result = await createBoundedNetworkProbe(() => 1).get(new URL("https://example.com/probe"), 10);

    expect(result.status).toBe("unavailable");
    expect(result.error).toMatch(/could not reach/i);
  });

  it("classifies an unexpected non-network failure as error, not unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("boom");
      }),
    );

    const result = await createBoundedNetworkProbe(() => 1).get(new URL("https://example.com/probe"), 10);

    expect(result.status).toBe("error");
    expect(result.error).toMatch(/unexpectedly/i);
  });
});

describe("runDoctor", () => {
  it.each([
    ["default", doctorOptions()],
    ["quick", doctorOptions({quick: true})],
  ] as const)("invokes every module exactly once with the exact %s options", async (_label, options) => {
    const {modules, calls} = createFakeModules();

    const report = await runDoctor(options, {...fixedRuntimeDependencies(), modules});

    for (const moduleId of MODULE_ORDER) {
      expect(calls[moduleId]).toHaveBeenCalledTimes(1);
      const [context] = calls[moduleId].mock.calls[0] as [DoctorContext];
      expect(context.options).toEqual(options);
    }
    expect(report.checks).toHaveLength(6);
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
      MODULE_ORDER.map((id) => [
        id,
        async (): Promise<readonly DiagnosticResult[]> => {
          await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMsById[id]));
          return [passCheck(REPRESENTATIVE_ID[id], id)];
        },
      ]),
    ) as Partial<Record<DiagnosticModuleId, DiagnosticModule["run"]>>;
    const {modules} = createFakeModules(overrides);

    const report = await runDoctor(doctorOptions(), {...fixedRuntimeDependencies(), modules});

    expect(report.checks.map((check) => check.module)).toEqual(MODULE_ORDER);
  });

  it("normalizes one module crash into a single fail row without stopping its siblings", async () => {
    const {modules} = createFakeModules({
      dotnet: async () => {
        throw new Error("dotnet probe exploded");
      },
    });

    const report = await runDoctor(doctorOptions(), {...fixedRuntimeDependencies(), modules});

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
    const {modules} = createFakeModules({
      workspace: async () => {
        throw new Error("workspace probe exploded");
      },
      python: async () => {
        throw new Error("python probe exploded");
      },
    });

    const report = await runDoctor(doctorOptions(), {...fixedRuntimeDependencies(), modules});

    expect(report.checks).toHaveLength(6);
    expect(report.checks.find((check) => check.id === "workspace.module-error")?.status).toBe("fail");
    expect(report.checks.find((check) => check.id === "python.module-error")?.status).toBe("fail");
    expect(report.checks.filter((check) => check.status === "pass")).toHaveLength(4);
  });

  it("normalizes an empty-message Error crash into a stable non-empty evidence entry without aborting the report", async () => {
    const {modules} = createFakeModules({
      dotnet: async () => {
        throw new Error();
      },
    });

    const report = await runDoctor(doctorOptions(), {...fixedRuntimeDependencies(), modules});

    expect(report.checks).toHaveLength(6);
    const crashRow = report.checks.find((check) => check.id === "dotnet.module-error");
    expect(crashRow?.status).toBe("fail");
    expect(crashRow?.evidence).toHaveLength(1);
    expect(crashRow?.evidence[0]?.trim().length).toBeGreaterThan(0);
    expect(report.checks.some((check) => check.id === "workspace.repository-root")).toBe(true);
    expect(report.checks.some((check) => check.id === "react.packages")).toBe(true);
    expect(report.checks.some((check) => check.id === "svelte.cv.packages")).toBe(true);
    expect(report.checks.some((check) => check.id === "python.runtime")).toBe(true);
    expect(report.checks.some((check) => check.id === "infrastructure.selection")).toBe(true);
  });

  it("normalizes an empty-string throw crash into a stable non-empty evidence entry without aborting the report", async () => {
    const {modules} = createFakeModules({
      react: async () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- exercising a non-Error thrown value on purpose.
        throw "";
      },
    });

    const report = await runDoctor(doctorOptions(), {...fixedRuntimeDependencies(), modules});

    expect(report.checks).toHaveLength(6);
    const crashRow = report.checks.find((check) => check.id === "react.module-error");
    expect(crashRow?.status).toBe("fail");
    expect(crashRow?.evidence).toHaveLength(1);
    expect(crashRow?.evidence[0]?.trim().length).toBeGreaterThan(0);
    expect(report.checks.some((check) => check.id === "workspace.repository-root")).toBe(true);
  });

  it("strips ANSI escape sequences from an Error crash message before it becomes evidence", async () => {
    const {modules} = createFakeModules({
      svelte: async () => {
        throw new Error("\u001B[31msvelte boom\u001B[0m");
      },
    });

    const report = await runDoctor(doctorOptions(), {...fixedRuntimeDependencies(), modules});

    expect(report.checks).toHaveLength(6);
    const crashRow = report.checks.find((check) => check.id === "svelte.module-error");
    expect(crashRow?.status).toBe("fail");
    expect(crashRow?.evidence).toEqual(["svelte boom"]);
    expect(crashRow?.evidence[0]).not.toMatch(/\u001B/);
    expect(report.checks.some((check) => check.id === "workspace.repository-root")).toBe(true);
  });

  it("strips ANSI escape sequences from a safe error-shaped object crash without an unsafe cast", async () => {
    const {modules} = createFakeModules({
      python: async () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- exercising a safe error-shaped non-Error object.
        throw {message: "\u001B[31mpython boom\u001B[0m"};
      },
    });

    const report = await runDoctor(doctorOptions(), {...fixedRuntimeDependencies(), modules});

    expect(report.checks).toHaveLength(6);
    const crashRow = report.checks.find((check) => check.id === "python.module-error");
    expect(crashRow?.status).toBe("fail");
    expect(crashRow?.evidence).toEqual(["python boom"]);
    expect(report.checks.some((check) => check.id === "workspace.repository-root")).toBe(true);
  });

  it("normalizes a non-Error, non-object unknown thrown value into a stable evidence entry", async () => {
    const {modules} = createFakeModules({
      infrastructure: async () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- exercising a non-Error thrown value on purpose.
        throw 42;
      },
    });

    const report = await runDoctor(doctorOptions(), {...fixedRuntimeDependencies(), modules});

    expect(report.checks).toHaveLength(6);
    const crashRow = report.checks.find((check) => check.id === "infrastructure.module-error");
    expect(crashRow?.status).toBe("fail");
    expect(crashRow?.evidence).toEqual(["42"]);
    expect(report.checks.some((check) => check.id === "workspace.repository-root")).toBe(true);
  });

  it("rejects duplicate result ids emitted by two different modules", async () => {
    const {modules} = createFakeModules({
      react: async () => [passCheck("workspace.repository-root", "react")],
    });

    await expect(runDoctor(doctorOptions(), {...fixedRuntimeDependencies(), modules})).rejects.toThrow(/duplicate/i);
  });

  it("rejects duplicate result ids emitted by the same module", async () => {
    const {modules} = createFakeModules({
      workspace: async () => [passCheck("workspace.repository-root", "workspace"), passCheck("workspace.repository-root", "workspace")],
    });

    await expect(runDoctor(doctorOptions(), {...fixedRuntimeDependencies(), modules})).rejects.toThrow(/duplicate/i);
  });

  it("records the injected report timestamp", async () => {
    const {modules} = createFakeModules();

    const report = await runDoctor(doctorOptions(), {
      ...fixedRuntimeDependencies(),
      modules,
      timestamp: () => "2030-01-01T00:00:00.000Z",
    });

    expect(report.timestamp).toBe("2030-01-01T00:00:00.000Z");
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
    const expectedWeight = workspaceOrdinaryIds.reduce((total, id) => total + diagnosticWeights[id], 0);

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

describe("main", () => {
  it("renders help and returns 0 without any repository or module work", async () => {
    const {logger, sink} = createLogger();
    const resolvePaths = vi.fn((): RepositoryPaths => {
      throw new Error("must not resolve repository paths for --help");
    });

    await expect(main(["--help"], {logger, resolveRepositoryPaths: resolvePaths})).resolves.toBe(0);

    expect(resolvePaths).not.toHaveBeenCalled();
    expect(sink.records.some((record) => record.text.includes("Usage:"))).toBe(true);
  });

  it("supports the -h short alias for help", async () => {
    await expect(main(["-h"])).resolves.toBe(0);
  });

  it("supports the /h help alias", async () => {
    await expect(main(["/h"])).resolves.toBe(0);
  });

  it("supports the /? help alias", async () => {
    await expect(main(["/?"])).resolves.toBe(0);
  });

  it("short-circuits help even when combined with an otherwise-unknown flag", async () => {
    const resolvePaths = vi.fn((): RepositoryPaths => {
      throw new Error("must not resolve repository paths for help");
    });
    await expect(main(["/h", "--bogus"], {resolveRepositoryPaths: resolvePaths})).resolves.toBe(0);
    expect(resolvePaths).not.toHaveBeenCalled();
  });

  it.each(["--ci", "--json", "--score"])("returns 1 for removed flag '%s'", async (flag) => {
    const {logger, sink} = createLogger();
    await expect(main([flag], {logger})).resolves.toBe(1);
    expect(sink.records.map((record) => record.text).join("\n")).toMatch(/unknown doctor option/i);
  });

  it("returns 1 and renders the option error for an unknown flag", async () => {
    const {logger, sink} = createLogger();

    await expect(main(["--bogus"], {logger})).resolves.toBe(1);

    expect(sink.records.map((record) => record.text).join("\n")).toMatch(/unknown doctor option/i);
  });

  it("exits 0 when every module passes", async () => {
    const {logger} = createLogger();
    const {modules} = createFakeModules();

    await expect(main([], {...fixedRuntimeDependencies(), modules, logger})).resolves.toBe(0);
  });

  it("exits 1 when any check fails", async () => {
    const {logger} = createLogger();
    const {modules} = createFakeModules({
      python: async () => [failCheck("python.runtime", "python")],
    });

    await expect(main([], {...fixedRuntimeDependencies(), modules, logger})).resolves.toBe(1);
  });

  it("calls renderDoctorReport exactly once", async () => {
    const {logger} = createLogger();
    const {modules} = createFakeModules();

    await main([], {...fixedRuntimeDependencies(), modules, logger});

    expect(renderDoctorReportMock).toHaveBeenCalledTimes(1);
  });

  it("always renders the score in the report output", async () => {
    const {modules} = createFakeModules();
    const sink = new InMemoryLoggerSink();
    const logger = new MonorepositoryConsoleLogger("doctor", {color: false, sink, verbose: false});

    await main([], {...fixedRuntimeDependencies(), modules, logger});

    // renderDoctorReport is called by main; check the mock was called
    expect(renderDoctorReportMock).toHaveBeenCalledTimes(1);
    // The report passed to renderDoctorReport should have a score
    const [report] = renderDoctorReportMock.mock.calls[0] as [unknown];
    expect(report).toHaveProperty("score");
    expect(report).toHaveProperty("grade");
  });

  it("returns 1, renders no report, and writes one non-empty human stderr error for a context-resolution failure", async () => {
    const {logger, sink} = createLogger();
    const {modules} = createFakeModules();
    const resolvePaths = vi.fn((): RepositoryPaths => {
      throw new Error("context assembly boom");
    });

    const exitCode = await main([], {...fixedRuntimeDependencies(), modules, logger, resolveRepositoryPaths: resolvePaths});

    expect(exitCode).toBe(1);
    expect(renderDoctorReportMock).not.toHaveBeenCalled();
    const errorRecords = sink.records.filter((record) => record.stream === "stderr");
    expect(errorRecords).toHaveLength(1);
    expect(errorRecords[0]?.text).toMatch(/context assembly boom/);
  });

  it("returns 1, renders no report, and writes one non-empty human stderr error for a report-validation failure", async () => {
    const {logger, sink} = createLogger();
    const {modules} = createFakeModules({
      react: async () => [passCheck("workspace.repository-root", "react")],
    });

    const exitCode = await main([], {...fixedRuntimeDependencies(), modules, logger});

    expect(exitCode).toBe(1);
    expect(renderDoctorReportMock).not.toHaveBeenCalled();
    const errorRecords = sink.records.filter((record) => record.stream === "stderr");
    expect(errorRecords).toHaveLength(1);
    expect(errorRecords[0]?.text).toMatch(/duplicate/i);
  });

  it("normalizes an empty-message fatal error into non-empty, ANSI-free stderr text", async () => {
    const {logger, sink} = createLogger();
    const {modules} = createFakeModules();
    const resolvePaths = vi.fn((): RepositoryPaths => {
      throw new Error();
    });

    const exitCode = await main([], {...fixedRuntimeDependencies(), modules, logger, resolveRepositoryPaths: resolvePaths});

    expect(exitCode).toBe(1);
    const errorRecords = sink.records.filter((record) => record.stream === "stderr");
    expect(errorRecords).toHaveLength(1);
    expect(errorRecords[0]?.text.trim().length).toBeGreaterThan(0);
    expect(errorRecords[0]?.text).not.toMatch(/\u001B/);
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

  it("emits a diagnostic and exits 1 for a direct process invocation of an unknown flag", async () => {
    const result = await runDirect(["--bogus"]);

    expect(result.code).toBe(1);
    expect(result.output).toMatch(/unknown doctor option/i);
  });
});
