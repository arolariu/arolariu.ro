import {describe, expect, it} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger, type MonorepositoryLogger} from "./common/logger.ts";
import type {DiagnosticResult, DoctorReport, DoctorInput} from "./doctor.types.ts";
import {
  computeHealthScore,
  createDoctorReport,
  diagnosticWeights,
  gradeFromScore,
  renderDoctorReport,
  summarizeDiagnostics,
} from "./doctor.reporter.ts";

const stableDiagnosticIds = [
  "workspace.repository-root",
  "workspace.git",
  "workspace.node-sources",
  "workspace.node-runtime",
  "workspace.npm-runtime",
  "workspace.root-dependencies",
  "workspace.github-scripts-dependencies",
  "workspace.npm-cache",
  "workspace.nx-projects",
  "workspace.nx-graph",
  "workspace.config-files",
  "workspace.generated-artifacts",
  "workspace.host-capacity",
  "workspace.npm-audit",
  "workspace.npm-outdated",
  "dotnet.executable",
  "dotnet.sdk-inventory",
  "dotnet.host",
  "dotnet.workloads",
  "dotnet.nuget-state",
  "dotnet.solution",
  "dotnet.local-tools",
  "dotnet.https-certificate",
  "dotnet.apphost",
  "dotnet.nuget-feed",
  "react.packages",
  "react.workspace-link",
  "react.environment",
  "react.i18n",
  "react.taxonomy-and-licenses",
  "react.playwright",
  "react.framework-config",
  "svelte.cv.packages",
  "svelte.cv.node-engine",
  "svelte.cv.scripts",
  "svelte.cv.generated-state",
  "svelte.cv.adapter",
  "svelte.status.packages",
  "svelte.status.node-engine",
  "svelte.status.scripts",
  "svelte.status.generated-state",
  "svelte.status.adapter",
  "python.runtime",
  "python.virtual-environment",
  "python.pip",
  "python.requirements",
  "python.conflicts",
  "python.configuration",
  "python.pypi",
  "infrastructure.selection",
  "infrastructure.cli",
  "infrastructure.backend",
  "infrastructure.compose",
  "infrastructure.docker-conflict",
  "infrastructure.socket-context",
  "infrastructure.ports",
  "infrastructure.certificates",
  "infrastructure.manifests",
  "infrastructure.containers",
  "workspace.module-error",
  "dotnet.module-error",
  "react.module-error",
  "svelte.module-error",
  "python.module-error",
  "infrastructure.module-error",
] as const;

const moduleOrder = ["Workspace", ".NET", "React", "Svelte", "Python", "Infrastructure"] as const;

function createDiagnostic(
  overrides: Readonly<{
    id: string;
    module: DiagnosticResult["module"];
    name: string;
    status?: DiagnosticResult["status"];
    summary?: string;
    evidence?: readonly string[];
    rootCause?: string;
    potentialCauses?: DiagnosticResult["potentialCauses"];
    fixes?: DiagnosticResult["fixes"];
    durationMs?: number;
  }>,
): DiagnosticResult {
  return {
    id: overrides.id,
    module: overrides.module,
    name: overrides.name,
    status: overrides.status ?? "pass",
    summary: overrides.summary ?? `${overrides.name} summary.`,
    evidence: overrides.evidence ?? [],
    rootCause: overrides.rootCause,
    potentialCauses: overrides.potentialCauses ?? [],
    fixes: overrides.fixes ?? [],
    durationMs: overrides.durationMs ?? 5,
  };
}

function createLogger(options: Readonly<{json?: boolean; color?: boolean}> = {}): Readonly<{
  sink: InMemoryLoggerSink;
  logger: MonorepositoryLogger;
}> {
  const sink = new InMemoryLoggerSink();
  const logger = new MonorepositoryConsoleLogger("doctor", {
    mode: options.json === true ? "human" : "human",
    color: options.color ?? false,
    sink,
  });

  return {sink, logger};
}

function createOptions(overrides: Readonly<Partial<DoctorInput>> = {}): DoctorInput {
  return {
    verbose: false,
    quick: false,
    ...overrides,
  };
}

function createValidReport(): DoctorReport {
  return createDoctorReport(
    [
      createDiagnostic({
        id: "workspace.repository-root",
        module: "workspace",
        name: "Repository root",
        status: "pass",
        summary: "Repository root detected.",
        evidence: ["PASS EVIDENCE"],
      }),
      createDiagnostic({
        id: "react.environment",
        module: "react",
        name: "React environment",
        status: "warn",
        summary: "Environment is degraded.",
        evidence: ["WARN EVIDENCE"],
        potentialCauses: [
          {cause: "Low-confidence cause.", confidence: "low"},
          {cause: "High-confidence cause.", confidence: "high"},
          {cause: "Medium-confidence cause.", confidence: "medium"},
        ],
        fixes: [{description: "First warning fix.", command: "echo warn-one"}, {description: "Second warning fix."}],
        durationMs: 20,
      }),
      createDiagnostic({
        id: "python.configuration",
        module: "python",
        name: "Python configuration",
        status: "fail",
        summary: "Configuration is invalid.",
        evidence: ["FAIL EVIDENCE"],
        rootCause: "The JSON configuration file is malformed.",
        fixes: [
          {
            description: "Rewrite the invalid configuration.",
            command: "node -e \"throw new Error('should-not-run')\"",
          },
          {description: "Re-run the doctor after fixing the file."},
        ],
        durationMs: 30,
      }),
      createDiagnostic({
        id: "infrastructure.containers",
        module: "infrastructure",
        name: "Infrastructure containers",
        status: "skipped",
        summary: "Skipped in CI.",
        durationMs: 0,
      }),
    ],
    "2026-08-30T01:23:45.000Z",
  );
}

function createWarnDiagnostic(
  overrides: Readonly<{
    evidence?: readonly string[];
    rootCause?: string;
    potentialCauses?: DiagnosticResult["potentialCauses"];
    fixes?: DiagnosticResult["fixes"];
  }> = {},
): DiagnosticResult {
  return createDiagnostic({
    id: "react.environment",
    module: "react",
    name: "React environment",
    status: "warn",
    summary: "Environment is degraded.",
    evidence: overrides.evidence ?? ["WARN EVIDENCE"],
    rootCause: overrides.rootCause,
    potentialCauses: overrides.potentialCauses ?? [{cause: "Missing runtime dependency.", confidence: "high"}],
    fixes: overrides.fixes ?? [{description: "Restore the missing runtime dependency."}],
    durationMs: 20,
  });
}

function createFailDiagnostic(
  overrides: Readonly<{
    evidence?: readonly string[];
    rootCause?: string;
    potentialCauses?: DiagnosticResult["potentialCauses"];
    fixes?: DiagnosticResult["fixes"];
  }> = {},
): DiagnosticResult {
  return createDiagnostic({
    id: "python.configuration",
    module: "python",
    name: "Python configuration",
    status: "fail",
    summary: "Configuration is invalid.",
    evidence: overrides.evidence ?? ["FAIL EVIDENCE"],
    rootCause: "rootCause" in overrides ? overrides.rootCause : "The JSON configuration file is malformed.",
    potentialCauses: overrides.potentialCauses ?? [],
    fixes: overrides.fixes ?? [{description: "Rewrite the invalid configuration."}],
    durationMs: 30,
  });
}

const invalidDetailedDiagnosticCases = [
  {
    title: "warn diagnostics without evidence",
    diagnostic: createWarnDiagnostic({evidence: []}),
    error: "Doctor diagnostic 'react.environment' with status 'warn' must include at least one evidence entry.",
  },
  {
    title: "warn diagnostics without suggested fixes",
    diagnostic: createWarnDiagnostic({fixes: []}),
    error: "Doctor diagnostic 'react.environment' with status 'warn' must include at least one suggested fix.",
  },
  {
    title: "warn diagnostics without any diagnosis form",
    diagnostic: createWarnDiagnostic({
      rootCause: undefined,
      potentialCauses: [],
    }),
    error:
      "Doctor diagnostic 'react.environment' with status 'warn' must include exactly one diagnosis form: rootCause or potentialCauses.",
  },
  {
    title: "warn diagnostics with both diagnosis forms",
    diagnostic: createWarnDiagnostic({
      rootCause: "A direct root cause is already known.",
      potentialCauses: [{cause: "A second possible cause.", confidence: "medium"}],
    }),
    error:
      "Doctor diagnostic 'react.environment' with status 'warn' must include exactly one diagnosis form: rootCause or potentialCauses.",
  },
  {
    title: "fail diagnostics without evidence",
    diagnostic: createFailDiagnostic({evidence: []}),
    error: "Doctor diagnostic 'python.configuration' with status 'fail' must include at least one evidence entry.",
  },
  {
    title: "fail diagnostics without suggested fixes",
    diagnostic: createFailDiagnostic({fixes: []}),
    error: "Doctor diagnostic 'python.configuration' with status 'fail' must include at least one suggested fix.",
  },
  {
    title: "fail diagnostics without any diagnosis form",
    diagnostic: createFailDiagnostic({
      rootCause: undefined,
      potentialCauses: [],
    }),
    error:
      "Doctor diagnostic 'python.configuration' with status 'fail' must include exactly one diagnosis form: rootCause or potentialCauses.",
  },
  {
    title: "fail diagnostics with both diagnosis forms",
    diagnostic: createFailDiagnostic({
      potentialCauses: [{cause: "A second possible cause.", confidence: "medium"}],
    }),
    error:
      "Doctor diagnostic 'python.configuration' with status 'fail' must include exactly one diagnosis form: rootCause or potentialCauses.",
  },
] as const;

describe("doctor report semantic validation", () => {
  it.each(invalidDetailedDiagnosticCases)("rejects $title", ({diagnostic, error}) => {
    expect(() => createDoctorReport([diagnostic], "2026-08-30T01:23:45.000Z")).toThrow(error);
  });
});

/**
 * Reads a declared diagnostic weight, failing loudly when the id is not registered.
 *
 * @param id - Stable diagnostic id.
 * @returns The declared weight for that id.
 */
function weightOf(id: string): number {
  const weight = diagnosticWeights[id];
  if (weight === undefined) {
    throw new Error(`Diagnostic id '${id}' has no declared weight.`);
  }
  return weight;
}

describe("doctor reporter scoring", () => {
  it("defines explicit stable weights for every Task 3-8 diagnostic id", () => {
    expect(Object.keys(diagnosticWeights).toSorted()).toEqual([...stableDiagnosticIds].toSorted());
    expect(diagnosticWeights["workspace.node-runtime"]).toBeGreaterThan(diagnosticWeights["workspace.npm-outdated"]);
    expect(diagnosticWeights["dotnet.executable"]).toBeGreaterThan(diagnosticWeights["dotnet.nuget-feed"]);
    expect(diagnosticWeights["python.runtime"]).toBeGreaterThan(diagnosticWeights["python.pypi"]);
    expect(diagnosticWeights["infrastructure.selection"]).toBeGreaterThan(diagnosticWeights["infrastructure.containers"]);
  });

  it("summarizes diagnostic statuses", () => {
    const summary = summarizeDiagnostics([
      createDiagnostic({id: "workspace.repository-root", module: "workspace", name: "Repository root", status: "pass"}),
      createDiagnostic({id: "workspace.git", module: "workspace", name: "Git status", status: "warn"}),
      createDiagnostic({id: "workspace.node-runtime", module: "workspace", name: "Node runtime", status: "fail"}),
      createDiagnostic({id: "workspace.npm-runtime", module: "workspace", name: "npm runtime", status: "skipped"}),
    ]);

    expect(summary).toEqual({
      passed: 1,
      warnings: 1,
      failed: 1,
      skipped: 1,
    });
  });

  it("awards full, half, zero, and excluded weight by diagnostic status", () => {
    const checks = [
      createDiagnostic({id: "workspace.node-runtime", module: "workspace", name: "Node runtime", status: "pass"}),
      createDiagnostic({id: "workspace.root-dependencies", module: "workspace", name: "Root dependencies", status: "warn"}),
      createDiagnostic({id: "workspace.git", module: "workspace", name: "Git status", status: "fail"}),
      createDiagnostic({id: "workspace.npm-audit", module: "workspace", name: "npm audit", status: "skipped"}),
    ];

    const expected = Math.round(
      ((weightOf("workspace.node-runtime") + weightOf("workspace.root-dependencies") * 0.5)
        / (weightOf("workspace.node-runtime") + weightOf("workspace.root-dependencies") + weightOf("workspace.git")))
        * 100,
    );

    expect(computeHealthScore(checks)).toBe(expected);
  });

  it("returns 100 when every diagnostic is skipped", () => {
    expect(
      computeHealthScore([
        createDiagnostic({id: "workspace.repository-root", module: "workspace", name: "Repository root", status: "skipped"}),
        createDiagnostic({id: "dotnet.executable", module: "dotnet", name: ".NET executable", status: "skipped"}),
      ]),
    ).toBe(100);
  });

  it("rejects duplicate diagnostic ids while scoring", () => {
    expect(() =>
      computeHealthScore([
        createDiagnostic({id: "workspace.git", module: "workspace", name: "Git status", status: "pass"}),
        createDiagnostic({id: "workspace.git", module: "workspace", name: "Git status duplicate", status: "warn"}),
      ]),
    ).toThrow("Duplicate diagnostic id 'workspace.git'.");
  });

  it("rejects unknown diagnostic ids while scoring", () => {
    expect(() =>
      computeHealthScore([createDiagnostic({id: "workspace.unknown", module: "workspace", name: "Unknown check", status: "pass"})]),
    ).toThrow("Unknown diagnostic id 'workspace.unknown'.");
  });

  it("preserves the legacy doctor grade thresholds exactly", () => {
    expect(gradeFromScore(95)).toBe("A+");
    expect(gradeFromScore(94)).toBe("A");
    expect(gradeFromScore(90)).toBe("A");
    expect(gradeFromScore(89)).toBe("B");
    expect(gradeFromScore(80)).toBe("B");
    expect(gradeFromScore(79)).toBe("C");
    expect(gradeFromScore(70)).toBe("C");
    expect(gradeFromScore(69)).toBe("D");
    expect(gradeFromScore(60)).toBe("D");
    expect(gradeFromScore(59)).toBe("F");
  });
});

describe("doctor report rendering", () => {
  it("renders human output in module order with concise passing rows and expanded warn/fail detail", () => {
    const report = createDoctorReport(
      [
        createDiagnostic({
          id: "workspace.repository-root",
          module: "workspace",
          name: "Repository root",
          status: "pass",
          summary: "Repository root detected.",
          evidence: ["PASS EVIDENCE OMITTED"],
        }),
        createDiagnostic({
          id: "dotnet.executable",
          module: "dotnet",
          name: ".NET executable",
          status: "pass",
          summary: ".NET is installed.",
          evidence: ["DOTNET PASS EVIDENCE OMITTED"],
        }),
        createDiagnostic({
          id: "react.environment",
          module: "react",
          name: "React environment",
          status: "warn",
          summary: "Environment is degraded.",
          evidence: ["WARN EVIDENCE INCLUDED"],
          potentialCauses: [
            {cause: "Low-confidence cause.", confidence: "low"},
            {cause: "High-confidence cause.", confidence: "high"},
            {cause: "Medium-confidence cause.", confidence: "medium"},
          ],
          fixes: [
            {description: "First warning fix.", command: "echo warn-one"},
            {description: "Second warning fix.", command: "echo warn-two"},
          ],
        }),
        createDiagnostic({
          id: "svelte.cv.packages",
          module: "svelte",
          name: "Svelte CV packages",
          status: "pass",
          summary: "Packages are installed.",
          evidence: ["SVELTE PASS EVIDENCE OMITTED"],
        }),
        createDiagnostic({
          id: "python.configuration",
          module: "python",
          name: "Python configuration",
          status: "fail",
          summary: "Configuration is invalid.",
          evidence: ["FAIL EVIDENCE INCLUDED"],
          rootCause: "The configuration file is malformed.",
          fixes: [
            {
              description: "Rewrite the invalid configuration.",
              command: "node -e \"throw new Error('should-not-run')\"",
            },
            {description: "Re-run the doctor after fixing the file."},
          ],
        }),
        createDiagnostic({
          id: "infrastructure.selection",
          module: "infrastructure",
          name: "Container engine selection",
          status: "skipped",
          summary: "Skipped in CI.",
        }),
      ],
      "2026-08-30T01:23:45.000Z",
    );
    const {sink, logger} = createLogger();

    renderDoctorReport(report, createOptions(), logger);

    const rendered = sink.records.map((record) => record.text).join("\n");

    expect(rendered).toContain("Repository root");
    expect(rendered).not.toContain("PASS EVIDENCE OMITTED");
    expect(rendered).toContain("WARN EVIDENCE INCLUDED");
    expect(rendered).toContain("FAIL EVIDENCE INCLUDED");
    expect(rendered).toContain("Potential causes:");
    expect(rendered.indexOf("High-confidence cause.")).toBeLessThan(rendered.indexOf("Medium-confidence cause."));
    expect(rendered.indexOf("Medium-confidence cause.")).toBeLessThan(rendered.indexOf("Low-confidence cause."));
    expect(rendered).toContain("Root cause: The configuration file is malformed.");
    expect(rendered).toContain("1. First warning fix.");
    expect(rendered).toContain("2. Second warning fix.");
    expect(rendered).toContain("$ echo warn-one");
    expect(rendered).toContain("$ node -e \"throw new Error('should-not-run')\"");
    expect(rendered).toContain("Health Score");

    const headingIndexes = moduleOrder.map((heading) => rendered.indexOf(heading));
    expect(headingIndexes.every((index) => index >= 0)).toBe(true);
    for (const [index, headingIndex] of headingIndexes.entries()) {
      const nextHeadingIndex = headingIndexes[index + 1];
      if (nextHeadingIndex !== undefined) {
        expect(headingIndex).toBeLessThan(nextHeadingIndex);
      }
    }
  });

  it("renders passing evidence only when verbose output is enabled", () => {
    const report = createDoctorReport(
      [
        createDiagnostic({
          id: "workspace.repository-root",
          module: "workspace",
          name: "Repository root",
          status: "pass",
          summary: "Repository root detected.",
          evidence: ["PASS EVIDENCE INCLUDED"],
        }),
      ],
      "2026-08-30T01:23:45.000Z",
    );
    const {sink, logger} = createLogger();

    renderDoctorReport(report, createOptions({verbose: true}), logger);

    expect(sink.records.map((record) => record.text).join("\n")).toContain("PASS EVIDENCE INCLUDED");
  });

  it("truncates oversized evidence entries in the report pipeline", () => {
    const oversizedEvidence = [
      "stdout: {",
      ...Array.from({length: 100}, (_, index) => `  \"package-${String(index)}\": {\"version\":\"1.0.0\"},`),
      "}",
    ].join("\n");
    const report = createDoctorReport(
      [
        createDiagnostic({
          id: "react.packages",
          module: "react",
          name: "React ecosystem packages",
          status: "fail",
          summary: "One package is invalid.",
          evidence: [oversizedEvidence, "react@18 does not match react@19."],
          rootCause: "react has the wrong installed version.",
          fixes: [{description: "Reinstall dependencies."}],
        }),
      ],
      "2026-08-30T01:23:45.000Z",
    );

    // The report pipeline bounds evidence: oversized entries (>500 chars) are truncated.
    const reactCheck = report.checks.find((c) => c.id === "react.packages");
    expect(reactCheck).toBeDefined();
    for (const entry of reactCheck!.evidence) {
      expect(entry.length).toBeLessThanOrEqual(500);
    }
    // The original oversized entry is truncated; the second entry is preserved.
    expect(reactCheck!.evidence.some((e) => e.includes("react@18 does not match react@19."))).toBe(true);

    // Render still works for both modes.
    const standard = createLogger();
    const verbose = createLogger();
    renderDoctorReport(report, createOptions(), standard.logger);
    renderDoctorReport(report, createOptions({verbose: true}), verbose.logger);
    const standardOutput = standard.sink.records.map((record) => record.text).join("\n");
    const verboseOutput = verbose.sink.records.map((record) => record.text).join("\n");
    expect(standardOutput).toContain("react@18 does not match react@19.");
    expect(verboseOutput).toContain("react@18 does not match react@19.");
  });

  it("bounds the number of human evidence entries unless verbose output is enabled", () => {
    // Normal-mode report bounds evidence to 5 entries.
    const normalReport = createDoctorReport(
      [
        createDiagnostic({
          id: "workspace.root-dependencies",
          module: "workspace",
          name: "Root dependencies",
          status: "fail",
          summary: "Many dependency problems were reported.",
          evidence: Array.from({length: 20}, (_, index) => `npm problem ${String(index + 1)}`),
          potentialCauses: [{cause: "The dependency tree is invalid.", confidence: "high"}],
          fixes: [{description: "Run setup."}],
        }),
      ],
      "2026-08-30T01:23:45.000Z",
      {verbose: false},
    );
    // Verbose-mode report bounds evidence to 20 entries (all retained).
    const verboseReport = createDoctorReport(
      [
        createDiagnostic({
          id: "workspace.root-dependencies",
          module: "workspace",
          name: "Root dependencies",
          status: "fail",
          summary: "Many dependency problems were reported.",
          evidence: Array.from({length: 20}, (_, index) => `npm problem ${String(index + 1)}`),
          potentialCauses: [{cause: "The dependency tree is invalid.", confidence: "high"}],
          fixes: [{description: "Run setup."}],
        }),
      ],
      "2026-08-30T01:23:45.000Z",
      {verbose: true},
    );
    const standard = createLogger();
    const verbose = createLogger();

    renderDoctorReport(normalReport, createOptions(), standard.logger);
    renderDoctorReport(verboseReport, createOptions({verbose: true}), verbose.logger);

    const standardOutput = standard.sink.records.map((record) => record.text).join("\n");
    const verboseOutput = verbose.sink.records.map((record) => record.text).join("\n");
    // Normal mode: report pipeline bounded to 5, last item is the omission summary.
    expect(standardOutput).toContain("npm problem 4");
    expect(standardOutput).not.toContain("npm problem 5");
    expect(standardOutput).toContain("additional evidence entries omitted");
    // Verbose mode: all 20 entries retained.
    expect(verboseOutput).toContain("npm problem 20");
    expect(verboseOutput).not.toContain("additional evidence entries omitted");
  });

  it("always renders the score box", () => {
    const report = createValidReport();
    const {sink, logger} = createLogger();

    renderDoctorReport(report, createOptions(), logger);

    expect(sink.records.map((record) => record.text).join("\n")).toContain("Health Score");
  });
});
