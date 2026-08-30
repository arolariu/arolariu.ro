import {describe, expect, it} from "vitest";

import {InMemoryLoggerSink, MonorepositoryConsoleLogger, type MonorepositoryLogger} from "./common/logger.ts";
import type {DiagnosticResult, DoctorOptions, DoctorReportV1} from "./doctor.types.ts";
import {
  computeHealthScore,
  createDoctorReport,
  diagnosticWeights,
  gradeFromScore,
  parseDoctorReport,
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

function createOptions(overrides: Readonly<Partial<DoctorOptions>> = {}): DoctorOptions {
  return {
    verbose: false,
    ci: false,
    score: false,
    json: false,
    quick: false,
    help: false,
    ...overrides,
  };
}

function createValidReport(): DoctorReportV1 {
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
        fixes: [
          {description: "First warning fix.", command: "echo warn-one"},
          {description: "Second warning fix."},
        ],
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
      (
        (
          diagnosticWeights["workspace.node-runtime"]
          + (diagnosticWeights["workspace.root-dependencies"] * 0.5)
        )
        / (
          diagnosticWeights["workspace.node-runtime"]
          + diagnosticWeights["workspace.root-dependencies"]
          + diagnosticWeights["workspace.git"]
        )
      ) * 100,
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
      computeHealthScore([
        createDiagnostic({id: "workspace.unknown", module: "workspace", name: "Unknown check", status: "pass"}),
      ]),
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

describe("doctor report parsing", () => {
  it("parses a valid version 1 doctor report", () => {
    const report = createValidReport();

    expect(parseDoctorReport(report)).toEqual(report);
  });

  it("rejects unsupported schema versions explicitly", () => {
    expect(() =>
      parseDoctorReport({
        schemaVersion: 2,
        score: 100,
      }),
    ).toThrow("Unsupported doctor report schemaVersion '2'. Expected version 1.");
  });

  it("rejects unknown schemas that omit schemaVersion", () => {
    expect(() =>
      parseDoctorReport({
        score: 100,
      }),
    ).toThrow("Unsupported doctor report schemaVersion 'undefined'. Expected version 1.");
  });

  it("rejects non-finite numeric values, invalid unions, and malformed timestamps", () => {
    expect(() =>
      parseDoctorReport({
        schemaVersion: 1,
        score: Number.POSITIVE_INFINITY,
        grade: "A+",
        summary: {
          passed: 1,
          warnings: 0,
          failed: 0,
          skipped: 0,
        },
        checks: [],
        timestamp: "2026-08-30T01:23:45.000Z",
      }),
    ).toThrow("Doctor report score must be a finite number between 0 and 100.");

    expect(() =>
      parseDoctorReport({
        schemaVersion: 1,
        score: 100,
        grade: "A+",
        summary: {
          passed: 1,
          warnings: 0,
          failed: 0,
          skipped: 0,
        },
        checks: [
          {
            id: "workspace.repository-root",
            module: "workspace",
            name: "Repository root",
            status: "broken",
            summary: "Repository root detected.",
            evidence: [],
            potentialCauses: [],
            fixes: [],
            durationMs: 5,
          },
        ],
        timestamp: "2026-08-30T01:23:45.000Z",
      }),
    ).toThrow("Doctor diagnostic status must be one of: pass, warn, fail, skipped.");

    expect(() =>
      parseDoctorReport({
        schemaVersion: 1,
        score: 100,
        grade: "A+",
        summary: {
          passed: 1,
          warnings: 0,
          failed: 0,
          skipped: 0,
        },
        checks: [
          {
            id: "workspace.repository-root",
            module: "unknown",
            name: "Repository root",
            status: "pass",
            summary: "Repository root detected.",
            evidence: [],
            potentialCauses: [],
            fixes: [],
            durationMs: 5,
          },
        ],
        timestamp: "2026-08-30T01:23:45.000Z",
      }),
    ).toThrow("Doctor diagnostic module must be one of: workspace, dotnet, react, svelte, python, infrastructure.");

    expect(() =>
      parseDoctorReport({
        schemaVersion: 1,
        score: 100,
        grade: "A+",
        summary: {
          passed: 1,
          warnings: 0,
          failed: 0,
          skipped: 0,
        },
        checks: [
          {
            id: "workspace.repository-root",
            module: "workspace",
            name: "Repository root",
            status: "pass",
            summary: "Repository root detected.",
            evidence: [],
            potentialCauses: [{cause: "Unknown cause.", confidence: "certain"}],
            fixes: [],
            durationMs: 5,
          },
        ],
        timestamp: "not-a-timestamp",
      }),
    ).toThrow("Doctor diagnostic confidence must be one of: high, medium, low.");
  });

  it("rejects duplicate and unknown diagnostic ids while parsing", () => {
    const report = createValidReport();

    expect(() =>
      parseDoctorReport({
        ...report,
        checks: [
          report.checks[0],
          {
            ...report.checks[0],
            name: "Duplicate repository root",
          },
        ],
        summary: {
          passed: 2,
          warnings: 0,
          failed: 0,
          skipped: 0,
        },
        score: 100,
        grade: "A+",
      }),
    ).toThrow("Duplicate diagnostic id 'workspace.repository-root'.");

    expect(() =>
      parseDoctorReport({
        ...report,
        checks: [
          {
            ...report.checks[0],
            id: "workspace.unknown",
          },
        ],
        summary: {
          passed: 1,
          warnings: 0,
          failed: 0,
          skipped: 0,
        },
        score: 100,
        grade: "A+",
      }),
    ).toThrow("Unknown diagnostic id 'workspace.unknown'.");
  });

  it("rejects ANSI escape sequences anywhere in the payload", () => {
    const report = createValidReport();

    expect(() =>
      parseDoctorReport({
        ...report,
        checks: [
          {
            ...report.checks[0],
            summary: "\u001B[31mansi summary\u001B[0m",
          },
        ],
        summary: {
          passed: 1,
          warnings: 0,
          failed: 0,
          skipped: 0,
        },
        score: 100,
        grade: "A+",
      }),
    ).toThrow("Doctor report strings must not contain ANSI escape sequences.");
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
    expect(rendered).not.toContain("Health Score");

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

  it("renders the score box only when score output is requested", () => {
    const report = createValidReport();
    const {sink, logger} = createLogger();

    renderDoctorReport(report, createOptions({score: true}), logger);

    expect(sink.records.map((record) => record.text).join("\n")).toContain("Health Score");
  });

  it("emits exactly one JSON document with no human records or ANSI escapes", () => {
    const report = createValidReport();
    const {sink, logger} = createLogger({color: true});

    renderDoctorReport(report, createOptions({json: true}), logger);

    expect(sink.records).toHaveLength(1);
    expect(sink.records[0]?.stream).toBe("stdout");
    expect(sink.records[0]?.write).toBe(false);
    expect(sink.records[0]?.text).not.toMatch(/\u001B/u);
    expect(JSON.parse(sink.records[0]?.text ?? "null")).toEqual(report);
  });
});
