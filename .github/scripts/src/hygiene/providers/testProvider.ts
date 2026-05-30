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

/**
 * Extracts the last balanced JSON object from a stdout stream that contains a
 * Vitest `--reporter=json` report. Robust against:
 *   - Non-JSON preamble or trailer noise from npm / nx
 *   - Multiple concatenated JSON reports (one per project under `nx run-many`),
 *     in which case we want the LAST one
 *   - Curly braces appearing inside JSON-encoded strings (those don't affect depth)
 *
 * Returns `null` when no valid JSON object containing `testResults` is found.
 */
export function extractLastVitestReport(stdout: string): VitestJsonReport | null {
  const candidates: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escape = false;
  for (let i = 0; i < stdout.length; i++) {
    const ch = stdout[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (inString) {
      if (ch === "\"") inString = false;
      continue;
    }
    if (ch === "\"") { inString = true; continue; }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        candidates.push(stdout.slice(start, i + 1));
        start = -1;
      }
    }
  }
  for (let i = candidates.length - 1; i >= 0; i--) {
    const blob = candidates[i];
    if (!blob) continue;
    try {
      const parsed = JSON.parse(blob) as Partial<VitestJsonReport>;
      if (Array.isArray(parsed.testResults)) {
        return parsed as VitestJsonReport;
      }
    } catch {
      // Skip non-Vitest JSON blobs.
    }
  }
  return null;
}

export const testProvider: CheckProvider<TestPayload> = {
  id: "test",
  name: "Vitest",
  icon: "🧪",
  defaultGate: {kind: "blocking", blockOn: "error"},
  payloadSchema: schema,
  applicableTo: () => true,
  async run(input: ProviderRunInput): Promise<ProviderRunOutput<TestPayload>> {
    // v3.0 scope: run the .github/scripts Vitest suite only.
    //
    // The repo's root `npm run test:unit` invokes `nx run-many --target=test
    // --configuration=unit --all`, which includes the @arolariu/api (.NET) and
    // @arolariu/exp (Python) projects. Those don't run via Vitest and their nx
    // targets fail in the hygiene job (no .NET / Python toolchain installed),
    // which means no Vitest JSON report ever reaches stdout. Scoping to
    // .github/scripts gives us a reliable, fast Vitest run that validates the
    // hygiene system's own tests.
    //
    // v3.1 will expand to aggregate website / components / cv / status Vitest
    // outputs via per-project runs and a multi-report extractor.
    const scriptsDir = path.join(input.workspaceRoot, ".github", "scripts");
    const result = await exec.getExecOutput(
      "npx",
      ["vitest", "run", "--reporter=json"],
      {cwd: scriptsDir, ignoreReturnCode: true, silent: true},
    );

    let report: VitestJsonReport;
    try {
      const parsed = extractLastVitestReport(result.stdout);
      if (!parsed) throw new Error("no JSON object with testResults found");
      report = parsed;
    } catch (err) {
      throw new Error(
        `Failed to parse Vitest JSON report: ${(err as Error).message}. ` +
        `exit ${result.exitCode}. stderr: ${result.stderr.substring(0, 500)}`,
      );
    }

    const {totalTests, passed, failed, skipped, findings: testFindings} = parseVitestJsonReport(report);
    const coverage = await readCoverageSummary(scriptsDir);
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
