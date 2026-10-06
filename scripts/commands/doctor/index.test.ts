// @vitest-environment node
/**
 * @fileoverview Contract tests for the read-only Effect doctor program.
 * @module scripts/commands/doctor/index.test
 *
 * @remarks
 * Every test runs {@link runDoctor} (or {@link runDoctorWith} over fake modules) on the in-memory
 * harness: the repository fixture is a seeded in-memory `package.json`, inspection is scripted (or a
 * recording `Inspection` layer when a test counts session requests), processes and HTTP are
 * scripted, and the network probe is the live layer over the harness `HttpClient`. No test reads
 * the live checkout, spawns a real probe, or reaches a real network, and no repository module is
 * mocked: the human output is the real renderer writing to the harness sink.
 */

import {join} from "node:path";

import {Cause, Duration, Effect, Exit, Layer} from "effect";
import {TestClock} from "effect/testing";
import {describe, expect, it} from "vitest";

import type {RepositoryRootNotFound} from "../../common/repository-paths.ts";
import {Inspection} from "../../inspection/Inspection.ts";
import type {RepositoryInspectionKey, RepositoryInspectionRequest, RepositoryInspectionSession} from "../../inspection/repository.ts";
import type {InspectionOutcome} from "../../inspection/types.ts";
import {ReportedFailure} from "../../platform/exit.ts";
import type {PlatformServices} from "../../platform/layers.ts";
import type {OutputMode, SinkRecord} from "../../platform/Output.ts";
import {
  makeTestLayer,
  repositoryFixtureRoot,
  runScoped,
  scriptedOutcomes,
  type ScriptedHttp,
  type ScriptedInspection,
  type TestHarness,
} from "../../platform/testing.ts";
import {renderDoctorCompletion} from "./cli.ts";
import {doctorModules, hasFailedDiagnostics, runDoctor, runDoctorWith} from "./index.ts";
import {NetworkProbeLive} from "./NetworkProbe.ts";
import {computeHealthScore, diagnosticWeights} from "./reporter.ts";
import type {
  DiagnosticModule,
  DiagnosticModuleId,
  DiagnosticResult,
  DoctorContext,
  DoctorInput,
  DoctorReport,
  DoctorRequirements,
} from "./types.ts";

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

/** Wall-clock time every report timestamp is stamped with. */
const FIXTURE_TIME = Date.parse("2025-01-01T00:00:00.000Z");

/** The in-memory repository identity `resolveRepositoryPaths` resolves the fixture root from. */
const FIXTURE_FILES: Readonly<Record<string, string>> = {
  [join(repositoryFixtureRoot, "package.json")]: JSON.stringify({name: "@arolariu/monorepo"}, null, 2),
};

const STUBBED: InspectionOutcome<never> = {kind: "unavailable", reason: "Inspection is stubbed in tests.", durationMs: 0};

/** Every inspection fact reported unavailable, as the legacy test runtime's stubbed session did. */
const ALL_UNAVAILABLE: ScriptedInspection = {
  workspace: STUBBED,
  aggregate: STUBBED,
  "npm.root": STUBBED,
  "npm.github-scripts": STUBBED,
  packages: STUBBED,
  dotnet: STUBBED,
  python: STUBBED,
  react: STUBBED,
  "svelte.cv": STUBBED,
  "svelte.status": STUBBED,
  infrastructure: STUBBED,
};

function passCheck(id: string, module: DiagnosticModuleId): DiagnosticResult {
  return {id, module, name: id, status: "pass", summary: `${id} is healthy.`, evidence: [], potentialCauses: [], fixes: [], durationMs: 1};
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

type ModuleRun = DiagnosticModule["run"];

/**
 * Creates one fake diagnostic module per bounded context, each recording the context it ran with
 * and returning one representative passing check by default.
 *
 * @param overrides - Per-module `run` replacements.
 * @param facts - Per-module declared inspection facts the run must prewarm.
 * @returns The fake modules in fixed order and the contexts each received.
 */
function createFakeModules(
  overrides: Partial<Record<DiagnosticModuleId, ModuleRun>> = {},
  facts: Partial<Record<DiagnosticModuleId, readonly RepositoryInspectionKey[]>> = {},
): Readonly<{modules: readonly DiagnosticModule[]; contexts: Readonly<Record<DiagnosticModuleId, DoctorContext[]>>}> {
  const contexts = Object.fromEntries(expectedModuleOrder.map((id) => [id, [] as DoctorContext[]])) as Record<
    DiagnosticModuleId,
    DoctorContext[]
  >;
  const modules = expectedModuleOrder.map((id): DiagnosticModule => {
    const run = overrides[id] ?? ((): ReturnType<ModuleRun> => Effect.succeed([passCheck(REPRESENTATIVE_ID[id], id)]));
    const declaredFacts = facts[id];
    return {
      id,
      title: id,
      ...(declaredFacts === undefined ? {} : {facts: declaredFacts}),
      run: (context) =>
        Effect.suspend(() => {
          contexts[id].push(context);
          return run(context);
        }),
    };
  });
  return {modules, contexts};
}

/** Options of one {@link doctorLayer}. */
interface DoctorLayerOptions {
  readonly mode?: OutputMode;
  readonly http?: readonly ScriptedHttp[];
  readonly inspection?: Layer.Layer<Inspection>;
  readonly clock?: "test" | "live";
  readonly variables?: Readonly<Record<string, string>>;
}

/**
 * Builds the harness and the layer every doctor run needs: the platform harness (all facts
 * unavailable, every process succeeding with empty output), the live network probe over the
 * harness `HttpClient`, and optionally a replacement `Inspection` layer.
 *
 * @param options - Output mode, scripted HTTP, inspection replacement, and clock.
 * @returns The harness and the layer.
 */
function doctorLayer(
  options: DoctorLayerOptions = {},
): Readonly<{harness: TestHarness<PlatformServices>; layer: Layer.Layer<DoctorRequirements | Inspection>}> {
  const harness = makeTestLayer({
    files: FIXTURE_FILES,
    inspection: ALL_UNAVAILABLE,
    processes: [scriptedOutcomes(() => ({kind: "succeeded", exitCode: 0, stdout: "", stderr: "", durationMs: 0}))],
    http: options.http ?? [],
    environment: {platform: "linux", architecture: "x64", executablePath: "/usr/bin/node", isCI: true, variables: options.variables ?? {}},
    mode: options.mode ?? "silent",
    context: "doctor",
    clock: "live",
  });
  const base = NetworkProbeLive.pipe(Layer.provideMerge(harness.layer));
  return {harness, layer: options.inspection === undefined ? base : Layer.merge(base, options.inspection)};
}

/**
 * Runs a doctor program at the fixture time (on the test clock) and returns its exit.
 *
 * @param program - The doctor program.
 * @param layer - The doctor layer.
 * @returns The program exit.
 */
async function runExit<A, E>(
  program: Effect.Effect<A, E, DoctorRequirements | Inspection>,
  layer: Layer.Layer<DoctorRequirements | Inspection>,
): Promise<Exit.Exit<A, E>> {
  return runScoped(Effect.exit(Effect.andThen(TestClock.setTime(FIXTURE_TIME), program)), Layer.merge(layer, TestClock.layer()));
}

/**
 * Runs the doctor over fake modules and returns the report.
 *
 * @param modules - The modules to run.
 * @param input - Typed doctor input.
 * @param options - Layer options.
 * @returns The report.
 */
async function runFakeDoctor(
  modules: readonly DiagnosticModule[],
  input: DoctorInput = doctorInput(),
  options: DoctorLayerOptions = {},
): Promise<DoctorReport> {
  const {layer} = doctorLayer(options);
  const exit = await runExit(runDoctorWith(modules)(input), layer);
  if (Exit.isFailure(exit)) {
    throw Cause.squash(exit.cause);
  }
  return exit.value;
}

/** Records every session request while returning the exact same session instance every time. */
function recordingInspection(session: RepositoryInspectionSession): Readonly<{
  layer: Layer.Layer<Inspection>;
  requests: readonly RepositoryInspectionRequest[];
}> {
  const requests: RepositoryInspectionRequest[] = [];
  const layer = Layer.succeed(
    Inspection,
    Inspection.of({
      session: (request) =>
        Effect.sync(() => {
          requests.push(request);
          return session;
        }),
    }),
  );
  return {layer, requests};
}

/**
 * A session that answers every fact through `inspect`.
 *
 * @param inspect - Answers one fact.
 * @returns The session.
 */
function fixtureSession(inspect: (key: RepositoryInspectionKey) => Effect.Effect<InspectionOutcome<unknown>>): RepositoryInspectionSession {
  return {
    inspect: inspect as RepositoryInspectionSession["inspect"],
    invalidate: () => Effect.void,
    updateInfrastructureEngine: () => Effect.void,
  };
}

describe("doctorModules", () => {
  it("declares the exact required module order", () => {
    expect(doctorModules.map((module) => module.id)).toEqual(expectedModuleOrder);
  });
});

describe("runDoctor", () => {
  it("fails with RepositoryRootNotFound before any module runs outside a repository", async () => {
    // Arrange
    const {modules, contexts} = createFakeModules();
    const harness = makeTestLayer({inspection: ALL_UNAVAILABLE, mode: "silent", context: "doctor", clock: "live"});

    // Act
    const exit = await runExit(runDoctorWith(modules)(doctorInput()), NetworkProbeLive.pipe(Layer.provideMerge(harness.layer)));

    // Assert
    expect(Exit.isFailure(exit) ? Cause.squash(exit.cause) : undefined).toMatchObject({
      _tag: "RepositoryRootNotFound",
      message: "Unable to locate repository root for @arolariu/monorepo",
    });
    for (const moduleId of expectedModuleOrder) {
      expect(contexts[moduleId]).toEqual([]);
    }
  });

  it.each([
    ["default", doctorInput()],
    ["quick", doctorInput({quick: true})],
  ] as const)("runs every module exactly once with the exact %s input", async (_label, input) => {
    // Arrange
    const {modules, contexts} = createFakeModules();

    // Act
    const report = await runFakeDoctor(modules, input);

    // Assert
    for (const moduleId of expectedModuleOrder) {
      expect(contexts[moduleId]).toHaveLength(1);
      expect(contexts[moduleId][0]?.options).toEqual(input);
    }
    expect(report.checks.map(({module}) => module)).toEqual(expectedModuleOrder);
  });

  it("flattens results into the fixed module order regardless of completion time", async () => {
    // Arrange
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
        (): ReturnType<ModuleRun> => Effect.as(Effect.sleep(Duration.millis(delayMsById[id])), [passCheck(REPRESENTATIVE_ID[id], id)]),
      ]),
    ) as Partial<Record<DiagnosticModuleId, ModuleRun>>;
    const {modules} = createFakeModules(overrides);
    const {layer} = doctorLayer();

    // Act
    const report = await runScoped(runDoctorWith(modules)(doctorInput()), layer);

    // Assert
    expect(report.checks.map((check) => check.module)).toEqual(expectedModuleOrder);
  });

  it("reports a failed check as the business-negative result", async () => {
    // Arrange
    const {modules} = createFakeModules({python: () => Effect.succeed([failCheck("python.runtime", "python")])});

    // Act
    const report = await runFakeDoctor(modules);

    // Assert
    expect(report.summary.failed).toBe(1);
    expect(hasFailedDiagnostics(report)).toBe(true);
  });

  it("maps a module defect to a failing row without stopping its siblings", async () => {
    // Arrange
    const {modules} = createFakeModules({dotnet: () => Effect.die(new Error("dotnet probe exploded"))});

    // Act
    const report = await runFakeDoctor(modules);

    // Assert
    expect(report.checks).toHaveLength(6);
    expect(report.checks.find((check) => check.id === "dotnet.module-error")).toEqual({
      id: "dotnet.module-error",
      module: "dotnet",
      name: "dotnet module error",
      status: "fail",
      summary: "The dotnet diagnostic module failed unexpectedly and could not complete its checks.",
      evidence: ["dotnet probe exploded"],
      rootCause: "An unhandled exception was thrown while running the dotnet diagnostic module.",
      potentialCauses: [],
      fixes: [{description: "Investigate the dotnet module failure captured in evidence, then rerun doctor."}],
      durationMs: 0,
    });
    for (const id of ["workspace.repository-root", "react.packages", "svelte.cv.packages", "python.runtime", "infrastructure.selection"]) {
      expect(report.checks.some((check) => check.id === id)).toBe(true);
    }
  });

  it("normalizes multiple independent module defects without stopping remaining siblings", async () => {
    // Arrange
    const {modules} = createFakeModules({
      workspace: () => Effect.die(new Error("workspace probe exploded")),
      python: () =>
        Effect.sync(() => {
          throw new Error("python probe exploded");
        }),
    });

    // Act
    const report = await runFakeDoctor(modules);

    // Assert
    expect(report.checks).toHaveLength(6);
    expect(report.checks.find((check) => check.id === "workspace.module-error")?.status).toBe("fail");
    expect(report.checks.find((check) => check.id === "python.module-error")?.evidence).toEqual(["python probe exploded"]);
    expect(report.checks.filter((check) => check.status === "pass")).toHaveLength(4);
  });

  it.each([
    ["an empty-message Error", "dotnet", new Error(), ["The dotnet diagnostic module threw an error without a usable message."]],
    ["an empty string", "react", "", ["The react diagnostic module threw an error without a usable message."]],
    ["an ANSI-bearing Error", "svelte", new Error("\u001B[31msvelte boom\u001B[0m"), ["svelte boom"]],
    ["an ANSI-bearing error-shaped object", "python", {message: "\u001B[31mpython boom\u001B[0m"}, ["python boom"]],
    ["a non-object value", "infrastructure", 42, ["42"]],
  ] as const)("normalizes %s defect into stable non-empty evidence", async (_label, moduleId, defect, evidence) => {
    // Arrange
    const {modules} = createFakeModules({[moduleId]: () => Effect.die(defect)});

    // Act
    const report = await runFakeDoctor(modules);

    // Assert
    expect(report.checks).toHaveLength(6);
    expect(report.checks.find((check) => check.id === `${moduleId}.module-error`)?.evidence).toEqual(evidence);
  });

  it.each([
    ["two different modules", {react: (): ReturnType<ModuleRun> => Effect.succeed([passCheck("workspace.repository-root", "react")])}],
    [
      "the same module",
      {
        workspace: (): ReturnType<ModuleRun> =>
          Effect.succeed([passCheck("workspace.repository-root", "workspace"), passCheck("workspace.repository-root", "workspace")]),
      },
    ],
  ] as const)("dies for duplicate result ids emitted by %s", async (_label, overrides) => {
    // Arrange
    const {modules} = createFakeModules(overrides);
    const {layer} = doctorLayer();

    // Act
    const exit = await runExit(runDoctorWith(modules)(doctorInput()), layer);

    // Assert
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(Cause.hasDies(exit.cause)).toBe(true);
      expect(String(Cause.squash(exit.cause))).toMatch(/duplicate/i);
    }
  });

  it("stamps the report with the clock timestamp", async () => {
    // Act
    const report = await runFakeDoctor(createFakeModules().modules);

    // Assert
    expect(report.timestamp).toBe("2025-01-01T00:00:00.000Z");
  });

  it("hands every module the exact same session and only read-only data", async () => {
    // Arrange
    const session = fixtureSession(() => Effect.succeed(STUBBED));
    const inspection = recordingInspection(session);
    const {modules, contexts} = createFakeModules();

    // Act
    await runFakeDoctor(modules, doctorInput(), {inspection: inspection.layer});

    // Assert
    expect(inspection.requests).toHaveLength(1);
    for (const moduleId of expectedModuleOrder) {
      expect(contexts[moduleId][0]?.inspection).toBe(session);
    }
    const context = contexts.workspace[0];
    expect(Object.keys(context ?? {}).toSorted()).toEqual(["inspection", "options", "paths", "probes", "requirements"]);
    expect(context?.paths.root).toBe(repositoryFixtureRoot);
  });

  it.each([
    ["full", doctorInput(), "full"],
    ["quick", doctorInput({quick: true}), "quick"],
  ] as const)("requests a %s inspection profile for the repository root", async (_label, input, profile) => {
    // Arrange
    const inspection = recordingInspection(fixtureSession(() => Effect.succeed(STUBBED)));

    // Act
    await runFakeDoctor(createFakeModules().modules, input, {inspection: inspection.layer});

    // Assert
    expect(inspection.requests).toHaveLength(1);
    expect(inspection.requests[0]?.profile).toBe(profile);
    expect(inspection.requests[0]?.paths.root).toBe(repositoryFixtureRoot);
  });

  it("prewarms aggregate inspection exactly once in full mode and never in quick mode", async () => {
    // Arrange
    const requested: RepositoryInspectionKey[] = [];
    const session = fixtureSession((key) =>
      Effect.sync(() => {
        requested.push(key);
        return STUBBED;
      }),
    );

    // Act
    await runFakeDoctor(createFakeModules().modules, doctorInput(), {inspection: recordingInspection(session).layer});
    const full = [...requested];
    requested.length = 0;
    await runFakeDoctor(createFakeModules().modules, doctorInput({quick: true}), {inspection: recordingInspection(session).layer});

    // Assert
    expect(full.filter((key) => key === "aggregate")).toHaveLength(1);
    expect(requested.filter((key) => key === "aggregate")).toHaveLength(0);
  });

  it("ignores a prewarm defect no module consumes", async () => {
    // Arrange
    const session = fixtureSession(() => Effect.die(new Error("Repository inspection was cancelled.")));

    // Act
    const report = await runFakeDoctor(createFakeModules().modules, doctorInput(), {inspection: recordingInspection(session).layer});

    // Assert
    expect(report.checks.every((check) => check.status === "pass")).toBe(true);
  });

  it("starts every module-declared fact before the first module runs", async () => {
    // Arrange
    const requested: RepositoryInspectionKey[] = [];
    let requestedWhenModulesStarted: readonly RepositoryInspectionKey[] = [];
    const session = fixtureSession((key) =>
      Effect.sync(() => {
        requested.push(key);
        return STUBBED;
      }),
    );
    const {modules} = createFakeModules(
      {
        workspace: () =>
          Effect.sync(() => {
            requestedWhenModulesStarted = [...requested];
            return [passCheck(REPRESENTATIVE_ID.workspace, "workspace")];
          }),
      },
      {workspace: ["workspace", "npm.root", "npm.github-scripts"], svelte: ["svelte.cv", "svelte.status"]},
    );

    // Act
    await runFakeDoctor(modules, doctorInput(), {inspection: recordingInspection(session).layer});

    // Assert
    expect(requestedWhenModulesStarted).toEqual(["aggregate", "workspace", "npm.root", "npm.github-scripts", "svelte.cv", "svelte.status"]);
  });

  it("never swallows a prewarmed fact defect the declaring module consumes", async () => {
    // Arrange
    const session = fixtureSession(() => Effect.die(new Error("Repository inspection was cancelled.")));
    const {modules} = createFakeModules(
      {
        workspace: (context) => Effect.as(context.inspection.inspect("workspace"), [passCheck(REPRESENTATIVE_ID.workspace, "workspace")]),
      },
      {workspace: ["workspace", "npm.root"]},
    );

    // Act
    const report = await runFakeDoctor(modules, doctorInput(), {inspection: recordingInspection(session).layer});

    // Assert
    const crashRow = report.checks.find((check) => check.id === "workspace.module-error");
    expect(crashRow?.status).toBe("fail");
    expect(crashRow?.evidence).toEqual(["Repository inspection was cancelled."]);
  });
});

describe("doctor characterization (legacy baseline for the effect migration)", () => {
  /** The exact six rows the healthy fake-module fixture reports, in module order. */
  const HEALTHY_ROWS: readonly DiagnosticResult[] = expectedModuleOrder.map((id) => passCheck(REPRESENTATIVE_ID[id], id));

  const FAILING_PYTHON_ROW: DiagnosticResult = {
    id: "python.runtime",
    module: "python",
    name: "python.runtime",
    status: "fail",
    summary: "python.runtime failed.",
    evidence: ["python.runtime evidence"],
    rootCause: "python.runtime root cause",
    potentialCauses: [],
    fixes: [{description: "Fix python.runtime."}],
    durationMs: 1,
  };

  const HEALTHY_REPORT: DoctorReport = {
    score: 100,
    grade: "A+",
    summary: {passed: 6, warnings: 0, failed: 0, skipped: 0},
    checks: HEALTHY_ROWS,
    timestamp: "2025-01-01T00:00:00.000Z",
  };

  const FAILING_REPORT: DoctorReport = {
    score: 82,
    grade: "B",
    summary: {passed: 5, warnings: 0, failed: 1, skipped: 0},
    checks: HEALTHY_ROWS.map((row) => (row.id === "python.runtime" ? FAILING_PYTHON_ROW : row)),
    timestamp: "2025-01-01T00:00:00.000Z",
  };

  const HEALTHY_HUMAN_LINES: readonly string[] = [
    "🩺 arolariu.ro Workspace Doctor",
    "Summary: 6 passed, 0 warnings, 0 failures, 0 skipped",
    "",
    "╭─────────────────────────────────────────╮",
    "│  🏥 Health Score: 100/100  Grade: A+  │",
    "╰─────────────────────────────────────────╯",
    "",
    "Workspace",
    "",
    "✅ workspace.repository-root — workspace.repository-root is healthy.",
    "",
    ".NET",
    "",
    "✅ dotnet.executable — dotnet.executable is healthy.",
    "",
    "React",
    "",
    "✅ react.packages — react.packages is healthy.",
    "",
    "Svelte",
    "",
    "✅ svelte.cv.packages — svelte.cv.packages is healthy.",
    "",
    "Python",
    "",
    "✅ python.runtime — python.runtime is healthy.",
    "",
    "Infrastructure",
    "",
    "✅ infrastructure.selection — infrastructure.selection is healthy.",
  ];

  const FAILING_HUMAN_LINES: readonly string[] = [
    "🩺 arolariu.ro Workspace Doctor",
    "Summary: 5 passed, 0 warnings, 1 failure, 0 skipped",
    "",
    "╭─────────────────────────────────────────╮",
    "│  🏥 Health Score: 82/100  Grade: B  │",
    "╰─────────────────────────────────────────╯",
    "",
    "Workspace",
    "",
    "✅ workspace.repository-root — workspace.repository-root is healthy.",
    "",
    ".NET",
    "",
    "✅ dotnet.executable — dotnet.executable is healthy.",
    "",
    "React",
    "",
    "✅ react.packages — react.packages is healthy.",
    "",
    "Svelte",
    "",
    "✅ svelte.cv.packages — svelte.cv.packages is healthy.",
    "",
    "Python",
    "",
    "⛔ python.runtime — python.runtime failed.",
    "    Evidence:",
    "      - python.runtime evidence",
    "    Root cause: python.runtime root cause",
    "    Suggested fixes:",
    "      1. Fix python.runtime.",
    "",
    "Infrastructure",
    "",
    "✅ infrastructure.selection — infrastructure.selection is healthy.",
  ];

  function stdoutLines(lines: readonly string[]): readonly SinkRecord[] {
    return lines.map((text) => ({stream: "stdout", text: `${text}\n`}));
  }

  /**
   * Runs the fake-module doctor plus its CLI completion in one output mode.
   *
   * @param mode - Output mode.
   * @param failing - Whether python reports a failed row.
   * @returns The run exit (the report, or `ReportedFailure`) and every sink record.
   */
  async function runCompletion(
    mode: OutputMode,
    failing: boolean,
  ): Promise<Readonly<{exit: Exit.Exit<DoctorReport, ReportedFailure | RepositoryRootNotFound>; output: readonly SinkRecord[]}>> {
    const {modules} = createFakeModules(failing ? {python: () => Effect.succeed([failCheck("python.runtime", "python")])} : {});
    const {harness, layer} = doctorLayer({mode});
    const input = doctorInput();
    const exit = await runExit(
      Effect.flatMap(runDoctorWith(modules)(input), (report) => Effect.as(renderDoctorCompletion(report, input), report)),
      layer,
    );
    return {exit, output: harness.output()};
  }

  it.each([
    ["healthy", false, HEALTHY_REPORT, HEALTHY_HUMAN_LINES],
    ["failing", true, FAILING_REPORT, FAILING_HUMAN_LINES],
  ] as const)("characterizes the exact %s human report, score, grade, and exit", async (_label, failing, report, lines) => {
    // Act
    const {exit, output} = await runCompletion("human", failing);

    // Assert
    expect(exit).toEqual(
      failing ? Exit.fail(new ReportedFailure({exitCode: 1, message: "Doctor found 1 failing diagnostic(s)."})) : Exit.succeed(report),
    );
    expect(output).toEqual(stdoutLines(lines));
  });

  it.each([
    ["healthy", false, HEALTHY_REPORT],
    ["failing", true, FAILING_REPORT],
  ] as const)("characterizes the exact %s --json document and exit", async (_label, failing, report) => {
    // Act
    const {exit, output} = await runCompletion("json", failing);

    // Assert
    expect(Exit.isSuccess(exit)).toBe(!failing);
    expect(output).toEqual([{stream: "stdout", text: `${JSON.stringify(report, null, 2)}\n`}]);
  });

  describe("quick mode over the real modules with every inspection fact unavailable", () => {
    /** Exact `id:status` rows each real module reports for the all-unavailable fixture. */
    const QUICK_ROWS_BY_MODULE: Readonly<Record<DiagnosticModuleId, readonly string[]>> = {
      workspace: [
        "workspace.repository-root:pass",
        "workspace.git:fail",
        "workspace.node-sources:fail",
        "workspace.node-runtime:skipped",
        "workspace.npm-runtime:skipped",
        "workspace.root-dependencies:fail",
        "workspace.github-scripts-dependencies:fail",
        "workspace.npm-cache:fail",
        "workspace.nx-projects:fail",
        "workspace.nx-graph:fail",
        "workspace.config-files:fail",
        "workspace.generated-artifacts:fail",
        "workspace.host-capacity:skipped",
        "workspace.npm-audit:skipped",
        "workspace.npm-outdated:skipped",
      ],
      dotnet: [
        "dotnet.executable:fail",
        "dotnet.sdk-inventory:skipped",
        "dotnet.host:fail",
        "dotnet.workloads:fail",
        "dotnet.nuget-state:fail",
        "dotnet.solution:fail",
        "dotnet.local-tools:fail",
        "dotnet.https-certificate:fail",
        "dotnet.apphost:fail",
        "dotnet.nuget-feed:skipped",
      ],
      react: [
        "react.packages:skipped",
        "react.workspace-link:fail",
        "react.environment:fail",
        "react.i18n:fail",
        "react.taxonomy-and-licenses:fail",
        "react.playwright:skipped",
        "react.framework-config:fail",
      ],
      svelte: [
        "svelte.cv.packages:fail",
        "svelte.cv.node-engine:skipped",
        "svelte.cv.scripts:fail",
        "svelte.cv.generated-state:fail",
        "svelte.cv.adapter:fail",
        "svelte.status.packages:fail",
        "svelte.status.node-engine:skipped",
        "svelte.status.scripts:fail",
        "svelte.status.generated-state:fail",
        "svelte.status.adapter:fail",
      ],
      python: [
        "python.runtime:fail",
        "python.virtual-environment:fail",
        "python.pip:fail",
        "python.requirements:fail",
        "python.conflicts:fail",
        "python.configuration:fail",
        "python.pypi:skipped",
      ],
      infrastructure: [
        "infrastructure.selection:fail",
        "infrastructure.cli:skipped",
        "infrastructure.backend:skipped",
        "infrastructure.compose:skipped",
        "infrastructure.docker-conflict:skipped",
        "infrastructure.socket-context:skipped",
        "infrastructure.ports:fail",
        "infrastructure.certificates:fail",
        "infrastructure.manifests:fail",
        "infrastructure.containers:skipped",
      ],
    };

    /** Every rendered skipped row, in report order; the network rows are NuGet and PyPI. */
    const QUICK_SKIPPED_LINES: readonly string[] = [
      "⏭️ Node.js runtime — Runtime comparison was skipped because requirement sources are invalid.",
      "⏭️ npm runtime — Runtime comparison was skipped because requirement sources are invalid.",
      "⏭️ Host capacity — Host capacity inspection was skipped in quick mode.",
      "⏭️ npm audit — Remote npm audit was skipped in quick mode.",
      "⏭️ Outdated npm packages — Remote package freshness was skipped in quick mode.",
      "⏭️ Installed SDK inventory — SDK comparison was skipped because requirement sources are invalid.",
      "⏭️ NuGet feed reachability — NuGet feed reachability was skipped in quick mode.",
      "⏭️ React ecosystem packages — Package comparison was skipped because requirement sources are invalid.",
      "⏭️ Playwright browser inventory — Playwright inventory comparison was skipped because requirement sources are invalid.",
      "⏭️ @arolariu/cv: SvelteKit Node.js engine compatibility — Node engine compatibility was skipped because root requirement sources are invalid.",
      "⏭️ @arolariu/status: SvelteKit Node.js engine compatibility — Node engine compatibility was skipped because root requirement sources are invalid.",
      "⏭️ PyPI reachability — PyPI reachability was skipped in quick mode.",
      "⏭️ Container CLI — Container CLI check was skipped because engine selection failed.",
      "⏭️ Container backend — Backend check was skipped because engine selection failed.",
      "⏭️ Compose provider — Compose check was skipped because engine selection failed.",
      "⏭️ Docker Desktop conflict — Docker Desktop conflict check was skipped because engine selection failed.",
      "⏭️ Socket and context state — Socket/context check was skipped because engine selection failed.",
      "⏭️ Known local containers — Container inventory check was skipped because engine selection failed.",
    ];

    it("quick mode performs no network requests: the network rows are skipped, and every per-module result and the score are pinned", async () => {
      // Arrange: zero scripted HTTP, so any request would die.
      const {harness, layer} = doctorLayer({mode: "human"});
      const input = doctorInput({quick: true});

      // Act
      const exit = await runExit(
        Effect.flatMap(runDoctor(input), (report) => Effect.as(Effect.exit(renderDoctorCompletion(report, input)), report)),
        layer,
      );

      // Assert
      expect(Exit.isSuccess(exit)).toBe(true);
      if (!Exit.isSuccess(exit)) {
        return;
      }
      const report = exit.value;
      expect(harness.httpCalls()).toEqual([]);
      expect({score: report.score, grade: report.grade, summary: report.summary, timestamp: report.timestamp}).toEqual({
        score: 3,
        grade: "F",
        summary: {passed: 1, warnings: 0, failed: 40, skipped: 18},
        timestamp: "2025-01-01T00:00:00.000Z",
      });
      for (const moduleId of expectedModuleOrder) {
        expect(report.checks.filter((check) => check.module === moduleId).map((check) => `${check.id}:${check.status}`)).toEqual(
          QUICK_ROWS_BY_MODULE[moduleId],
        );
      }
      expect(report.checks.filter((check) => check.id === "dotnet.nuget-feed" || check.id === "python.pypi")).toEqual([
        {
          id: "dotnet.nuget-feed",
          module: "dotnet",
          name: "NuGet feed reachability",
          status: "skipped",
          summary: "NuGet feed reachability was skipped in quick mode.",
          evidence: ["--quick intentionally skips network reachability probes."],
          potentialCauses: [],
          fixes: [],
          durationMs: 0,
        },
        {
          id: "python.pypi",
          module: "python",
          name: "PyPI reachability",
          status: "skipped",
          summary: "PyPI reachability was skipped in quick mode.",
          evidence: ["--quick intentionally skips network reachability probes."],
          potentialCauses: [],
          fixes: [],
          durationMs: 0,
        },
      ]);
      const output = harness.output();
      expect(output.slice(0, 6)).toEqual(
        stdoutLines([
          "🩺 arolariu.ro Workspace Doctor",
          "Summary: 1 passed, 0 warnings, 40 failures, 18 skipped",
          "",
          "╭─────────────────────────────────────────╮",
          "│  🏥 Health Score: 3/100  Grade: F  │",
          "╰─────────────────────────────────────────╯",
        ]),
      );
      expect(output.filter((record) => record.text.startsWith("⏭️"))).toEqual(stdoutLines(QUICK_SKIPPED_LINES));
      expect(output.every((record) => record.stream === "stdout")).toBe(true);
    });

    it("issues exactly the NuGet and PyPI GET probes in full mode", async () => {
      // Arrange
      const {harness, layer} = doctorLayer({http: [{match: () => true, respond: {status: 200, body: ""}}]});

      // Act
      const exit = await runExit(runDoctor(doctorInput()), layer);

      // Assert
      expect(Exit.isSuccess(exit)).toBe(true);
      // Modules run concurrently, so only the set of probes is pinned, not their interleaving.
      expect(
        harness
          .httpCalls()
          .map((request) => `${request.method} ${request.url}`)
          .toSorted(),
      ).toEqual(["GET https://api.nuget.org/v3/index.json", "GET https://pypi.org/pypi/pip/json"]);
    });
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
