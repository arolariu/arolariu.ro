import {describe, it, expect} from "vitest";
import {buildStepSummary, formatFinding, findingsBlock} from "./stepSummary.ts";
import type {Finding, HygieneReport, ProviderOutcome} from "../domain/types.ts";

function makeOutcome(o: Partial<ProviderOutcome<unknown>>): ProviderOutcome<unknown> {
  return {
    providerId: "x", providerName: "X", providerIcon: "🟦",
    gate: {kind: "blocking", blockOn: "error"},
    gateResult: "passed",
    durationMs: 100,
    startedAt: "2026-05-30T00:00:00.000Z",
    finishedAt: "2026-05-30T00:00:00.100Z",
    payload: null, findings: [], error: null,
    ...o,
  };
}

const report: HygieneReport = {
  schemaVersion: "3", commitSha: "abc1234", prNumber: 42,
  workflowRunId: "1", workflowRunUrl: "https://x/1",
  generatedAt: "2026-05-30T00:00:00.000Z",
  overallResult: "passed",
  outcomes: [
    makeOutcome({providerId: "format", providerName: "Prettier", providerIcon: "🎨"}),
    makeOutcome({providerId: "lint", providerName: "ESLint", providerIcon: "🔍", gateResult: "failed",
      findings: [{kind: "line", severity: "error", file: "x.ts", line: 1, column: 1, message: "bad"}]}),
  ],
};

describe("buildStepSummary", () => {
  it("includes a header with overall result", () => {
    const md = buildStepSummary(report);
    expect(md).toMatch(/Code Hygiene/);
    expect(md).toMatch(/passed/i);
  });

  it("includes a table row per provider", () => {
    const md = buildStepSummary(report);
    expect(md).toMatch(/Prettier/);
    expect(md).toMatch(/ESLint/);
  });

  it("shows finding count per provider", () => {
    const md = buildStepSummary(report);
    expect(md).toMatch(/1 finding/);
  });

  it("displays errored providers prominently", () => {
    const errReport: HygieneReport = {
      ...report,
      overallResult: "errored",
      outcomes: [makeOutcome({gateResult: "errored", error: {message: "boom"}})],
    };
    const md = buildStepSummary(errReport);
    expect(md).toMatch(/boom/);
  });

  it("renders a 'Findings details' section listing the actual findings", () => {
    const md = buildStepSummary(report);
    expect(md).toMatch(/Findings details/);
    // Should include the actual file:line:col + message of the lint finding
    expect(md).toContain("x.ts:1:1");
    expect(md).toContain("bad");
  });

  it("caps line findings at top 25 with a 'showing X of Y' note", () => {
    const many: Finding[] = Array.from({length: 60}, (_, i) => ({
      kind: "line" as const,
      severity: "error" as const,
      file: `src/file-${String(i).padStart(3, "0")}.ts`,
      line: i + 1,
      column: 1,
      message: `issue ${i}`,
      ruleId: "test/rule",
    }));
    const r: HygieneReport = {
      ...report,
      outcomes: [makeOutcome({providerId: "lint", gateResult: "failed", findings: many})],
    };
    const md = buildStepSummary(r);
    expect(md).toContain("Showing top 25 of 60 findings");
    // First finding by alpha-sorted name should be present
    expect(md).toContain("src/file-000.ts:1:1");
    // Last finding (file-059) should NOT appear because cap=25 with alpha sort
    expect(md).not.toContain("src/file-059.ts");
  });

  it("opens findings details for failed providers, collapses passed providers", () => {
    const r: HygieneReport = {
      ...report,
      outcomes: [
        makeOutcome({providerId: "lint", providerName: "ESLint", providerIcon: "🔍", gateResult: "failed", findings: [
          {kind: "line", severity: "error", file: "a.ts", line: 1, column: 1, message: "x"},
        ]}),
        makeOutcome({providerId: "stats", providerName: "Stats", providerIcon: "📊", gateResult: "passed", findings: [
          {kind: "metric", severity: "info", name: "churn", value: 42, message: "lines changed"},
        ]}),
      ],
    };
    const md = buildStepSummary(r);
    // Failed provider's <details> should be open
    expect(md).toMatch(/<details open>\s*<summary>[^<]*ESLint/);
    // Stats provider's details should be closed (no `open` attr)
    expect(md).toMatch(/<details>\s*<summary>[^<]*Stats/);
    // Both findings should be rendered
    expect(md).toContain("a.ts:1:1");
    expect(md).toContain("churn");
  });
});

describe("formatFinding", () => {
  it("formats a LineFinding with rule id", () => {
    const out = formatFinding({
      kind: "line", severity: "error",
      file: "src/foo.ts", line: 10, column: 5, message: "bad", ruleId: "no-unused",
    });
    expect(out).toContain("src/foo.ts:10:5");
    expect(out).toContain("no-unused");
    expect(out).toContain("bad");
  });

  it("formats a FileFinding", () => {
    const out = formatFinding({
      kind: "file", severity: "warning", file: "src/foo.ts", message: "unformatted",
    });
    expect(out).toContain("src/foo.ts");
    expect(out).toContain("unformatted");
  });

  it("formats a MetricFinding with threshold + unit", () => {
    const out = formatFinding({
      kind: "metric", severity: "warning",
      name: "coverage.lines", value: 70, threshold: 85, unit: "%", message: "below target",
    });
    expect(out).toContain("coverage.lines");
    expect(out).toContain("70%");
    expect(out).toContain("threshold 85%");
  });

  it("formats a ComparisonFinding with diff sign", () => {
    const positive = formatFinding({
      kind: "comparison", severity: "info",
      name: "bundle.x", baseValue: 1000, headValue: 1500, diff: 500, unit: "bytes", message: "grew",
    });
    expect(positive).toContain("1000bytes → 1500bytes (+500bytes)");
    const negative = formatFinding({
      kind: "comparison", severity: "info",
      name: "bundle.y", baseValue: 500, headValue: 400, diff: -100, unit: "bytes", message: "shrunk",
    });
    expect(negative).toContain("(-100bytes)");
  });

  it("formats a TabularFinding with row count", () => {
    const out = formatFinding({
      kind: "tabular", severity: "info",
      name: "top extensions", columns: ["ext", "count"], rows: [["ts", 10], ["tsx", 5]],
      message: "diff",
    });
    expect(out).toContain("top extensions");
    expect(out).toContain("2 row(s)");
  });
});

describe("findingsBlock", () => {
  it("returns '_No findings._' when outcome has none", () => {
    const out = findingsBlock(makeOutcome({findings: []}));
    expect(out).toContain("No findings");
  });

  it("sorts findings by severity (critical first, info last)", () => {
    const findings: Finding[] = [
      {kind: "metric", severity: "info", name: "low", value: 1, message: ""},
      {kind: "line", severity: "critical", file: "a.ts", line: 1, column: 1, message: "high"},
      {kind: "line", severity: "warning", file: "b.ts", line: 2, column: 2, message: "mid"},
    ];
    const out = findingsBlock(makeOutcome({findings}));
    // Critical should appear before warning, which appears before info
    const critIdx = out.indexOf("a.ts:1:1");
    const warnIdx = out.indexOf("b.ts:2:2");
    const infoIdx = out.indexOf("low");
    expect(critIdx).toBeGreaterThan(-1);
    expect(critIdx).toBeLessThan(warnIdx);
    expect(warnIdx).toBeLessThan(infoIdx);
  });
});
