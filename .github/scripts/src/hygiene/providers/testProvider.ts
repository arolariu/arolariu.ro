/**
 * @fileoverview Vitest test check provider.
 * @module github/scripts/src/hygiene/providers/testProvider
 *
 * @remarks
 * Runs `npx vitest run --reporter=json` and parses the structured output.
 * Reads coverage-summary.json (if present) for MetricFindings.
 */

import * as exec from "@actions/exec";
import fs from "node:fs/promises";
import * as path from "node:path";
import type {CheckProvider, ProviderRunInput, ProviderRunOutput, Schema} from "../domain/provider.ts";
import type {Finding, LineFinding, MetricFinding, Severity} from "../domain/types.ts";

export interface VitestAssertion {
  readonly fullName: string;
  readonly status: "passed" | "failed" | "pending" | "skipped" | "todo";
  readonly failureMessages: readonly string[];
  readonly location?: {readonly line: number; readonly column: number};
}

export interface VitestTestFile {
  readonly name: string;
  readonly status: "passed" | "failed";
  readonly assertionResults: readonly VitestAssertion[];
}

export interface VitestJsonReport {
  readonly numTotalTests: number;
  readonly numPassedTests: number;
  readonly numFailedTests: number;
  readonly numPendingTests: number;
  readonly testResults: readonly VitestTestFile[];
}

export interface CoverageMetric {
  readonly total: number;
  readonly covered: number;
  readonly pct: number;
}

export interface CoverageSummary {
  readonly lines: CoverageMetric;
  readonly statements: CoverageMetric;
  readonly functions: CoverageMetric;
  readonly branches: CoverageMetric;
}

export interface TestPayload {
  readonly totalTests: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly coverage: CoverageSummary | null;
}

/** Coverage thresholds (matches the 85%+ target from AGENTS.md). */
const COVERAGE_THRESHOLD = 85;

const schema: Schema<TestPayload> = {
  parse(data: unknown): TestPayload {
    if (typeof data !== "object" || data === null) throw new Error("payload not object");
    const r = data as Record<string, unknown>;
    return {
      totalTests: Number(r["totalTests"] ?? 0),
      passed: Number(r["passed"] ?? 0),
      failed: Number(r["failed"] ?? 0),
      skipped: Number(r["skipped"] ?? 0),
      coverage: (r["coverage"] as CoverageSummary | null) ?? null,
    };
  },
};

/**
 * Parses a Vitest --reporter=json output into findings + summary stats.
 * Each failed assertion becomes one LineFinding.
 */
export function parseVitestJsonReport(report: VitestJsonReport): {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  findings: Finding[];
} {
  const findings: Finding[] = [];
  for (const file of report.testResults) {
    for (const assertion of file.assertionResults) {
      if (assertion.status === "failed") {
        const message = `${assertion.fullName}: ${assertion.failureMessages.join(" / ")}`;
        const f: LineFinding = {
          kind: "line",
          severity: "error",
          file: file.name,
          line: assertion.location?.line ?? 1,
          column: assertion.location?.column ?? 1,
          message,
          ruleId: "vitest/test-failure",
        };
        findings.push(f);
      }
    }
  }
  return {
    totalTests: report.numTotalTests,
    passed: report.numPassedTests,
    failed: report.numFailedTests,
    skipped: report.numPendingTests,
    findings,
  };
}

function coverageMetricFinding(name: string, metric: CoverageMetric): MetricFinding {
  const severity: Severity = metric.pct < COVERAGE_THRESHOLD ? "warning" : "info";
  return {
    kind: "metric",
    severity,
    name: `coverage.${name}`,
    value: metric.pct,
    threshold: COVERAGE_THRESHOLD,
    unit: "%",
    message: `${name} coverage: ${metric.pct.toFixed(2)}% (threshold ${COVERAGE_THRESHOLD}%)`,
  };
}

async function readCoverageSummary(workspaceRoot: string): Promise<CoverageSummary | null> {
  const summaryPath = path.join(workspaceRoot, "coverage", "vitest", "coverage-summary.json");
  try {
    const content = await fs.readFile(summaryPath, "utf-8");
    const parsed = JSON.parse(content) as {total: CoverageSummary};
    return parsed.total;
  } catch {
    return null;
  }
}

export const testProvider: CheckProvider<TestPayload> = {
  id: "test",
  name: "Vitest",
  icon: "🧪",
  defaultGate: {kind: "blocking", blockOn: "error"},
  payloadSchema: schema,
  applicableTo: () => true,
  async run(input: ProviderRunInput): Promise<ProviderRunOutput<TestPayload>> {
    const result = await exec.getExecOutput(
      "npm",
      ["run", "test:unit", "--", "--reporter=json"],
      {cwd: input.workspaceRoot, ignoreReturnCode: true, silent: true},
    );

    let report: VitestJsonReport;
    try {
      // Vitest may emit non-JSON noise before the JSON; extract the last JSON object.
      const match = result.stdout.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
      if (!match) throw new Error("no JSON object with testResults found");
      report = JSON.parse(match[0]) as VitestJsonReport;
    } catch (err) {
      throw new Error(
        `Failed to parse Vitest JSON report: ${(err as Error).message}. ` +
        `exit ${result.exitCode}. stderr: ${result.stderr.substring(0, 500)}`,
      );
    }

    const {totalTests, passed, failed, skipped, findings: testFindings} = parseVitestJsonReport(report);
    const coverage = await readCoverageSummary(input.workspaceRoot);
    const coverageFindings: Finding[] = coverage
      ? [
          coverageMetricFinding("lines", coverage.lines),
          coverageMetricFinding("statements", coverage.statements),
          coverageMetricFinding("functions", coverage.functions),
          coverageMetricFinding("branches", coverage.branches),
        ]
      : [];

    return {
      payload: {totalTests, passed, failed, skipped, coverage},
      findings: [...testFindings, ...coverageFindings],
    };
  },
};
