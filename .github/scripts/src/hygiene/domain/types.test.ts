import {describe, it, expect, expectTypeOf} from "vitest";
import {
  type Finding,
  type Severity,
  type Gate,
  type ProviderOutcome,
  isLineFinding,
  isFileFinding,
  isMetricFinding,
  isComparisonFinding,
  isTabularFinding,
  severityRank,
  evaluateGate,
} from "./types.ts";

describe("Severity ranking", () => {
  it("orders severities low-to-high", () => {
    expect(severityRank("info")).toBe(0);
    expect(severityRank("notice")).toBe(1);
    expect(severityRank("warning")).toBe(2);
    expect(severityRank("error")).toBe(3);
    expect(severityRank("critical")).toBe(4);
  });

  it("allows comparison", () => {
    expect(severityRank("error") > severityRank("warning")).toBe(true);
  });
});

describe("Finding discriminated union", () => {
  const lineFinding: Finding = {
    kind: "line",
    severity: "error",
    file: "src/foo.ts",
    line: 10,
    column: 5,
    message: "Unused variable",
    ruleId: "no-unused-vars",
  };

  const fileFinding: Finding = {
    kind: "file",
    severity: "warning",
    file: "src/bar.ts",
    message: "File needs formatting",
  };

  const metricFinding: Finding = {
    kind: "metric",
    severity: "notice",
    name: "coverage.lines",
    value: 87.5,
    threshold: 85,
    unit: "%",
    message: "Line coverage 87.5% (threshold 85%)",
  };

  const comparisonFinding: Finding = {
    kind: "comparison",
    severity: "info",
    name: "bundle.sites/arolariu.ro",
    baseValue: 1024,
    headValue: 2048,
    diff: 1024,
    unit: "bytes",
    message: "Bundle grew by 1024 bytes",
  };

  const tabularFinding: Finding = {
    kind: "tabular",
    severity: "info",
    name: "extension-distribution",
    columns: ["extension", "count"],
    rows: [["ts", 42], ["tsx", 17]],
    message: "Top extensions in changed files",
  };

  it("isLineFinding narrows correctly", () => {
    if (isLineFinding(lineFinding)) {
      expectTypeOf(lineFinding.line).toBeNumber();
      expectTypeOf(lineFinding.file).toBeString();
    } else {
      throw new Error("Should have narrowed");
    }
    expect(isLineFinding(fileFinding)).toBe(false);
  });

  it("isFileFinding narrows correctly", () => {
    expect(isFileFinding(fileFinding)).toBe(true);
    expect(isFileFinding(lineFinding)).toBe(false);
  });

  it("isMetricFinding narrows correctly", () => {
    expect(isMetricFinding(metricFinding)).toBe(true);
    expect(isMetricFinding(comparisonFinding)).toBe(false);
  });

  it("isComparisonFinding narrows correctly", () => {
    expect(isComparisonFinding(comparisonFinding)).toBe(true);
    expect(isComparisonFinding(metricFinding)).toBe(false);
  });

  it("isTabularFinding narrows correctly", () => {
    expect(isTabularFinding(tabularFinding)).toBe(true);
    expect(isTabularFinding(lineFinding)).toBe(false);
  });
});

describe("evaluateGate", () => {
  const lineErr: Finding = {kind: "line", severity: "error", file: "a.ts", line: 1, column: 1, message: "x"};
  const lineWarn: Finding = {kind: "line", severity: "warning", file: "a.ts", line: 1, column: 1, message: "x"};
  const lineInfo: Finding = {kind: "line", severity: "info", file: "a.ts", line: 1, column: 1, message: "x"};

  it("blocking gate fails when any finding meets blockOn severity", () => {
    const gate: Gate = {kind: "blocking", blockOn: "error"};
    expect(evaluateGate(gate, [lineErr])).toBe("failed");
    expect(evaluateGate(gate, [lineWarn])).toBe("passed");
    expect(evaluateGate(gate, [])).toBe("passed");
  });

  it("blocking gate at warning fails on warning OR higher", () => {
    const gate: Gate = {kind: "blocking", blockOn: "warning"};
    expect(evaluateGate(gate, [lineErr])).toBe("failed");
    expect(evaluateGate(gate, [lineWarn])).toBe("failed");
    expect(evaluateGate(gate, [lineInfo])).toBe("passed");
  });

  it("advisory gate never fails but reports highest severity", () => {
    const gate: Gate = {kind: "advisory"};
    expect(evaluateGate(gate, [lineErr])).toBe("advisory");
    expect(evaluateGate(gate, [])).toBe("passed");
  });

  it("informational gate is always passed", () => {
    const gate: Gate = {kind: "informational"};
    expect(evaluateGate(gate, [lineErr])).toBe("passed");
    expect(evaluateGate(gate, [])).toBe("passed");
  });
});

describe("ProviderOutcome shape", () => {
  it("encodes failure with findings", () => {
    const outcome: ProviderOutcome<{count: number}> = {
      providerId: "lint",
      providerName: "ESLint",
      providerIcon: "🔍",
      gate: {kind: "blocking", blockOn: "error"},
      gateResult: "failed",
      durationMs: 1234,
      startedAt: "2026-05-30T00:00:00.000Z",
      finishedAt: "2026-05-30T00:00:01.234Z",
      payload: {count: 2},
      findings: [
        {kind: "line", severity: "error", file: "a.ts", line: 1, column: 1, message: "x"},
        {kind: "line", severity: "error", file: "b.ts", line: 2, column: 2, message: "y"},
      ],
      error: null,
    };
    expect(outcome.findings).toHaveLength(2);
    expect(outcome.gateResult).toBe("failed");
  });

  it("encodes error state", () => {
    const outcome: ProviderOutcome<null> = {
      providerId: "format",
      providerName: "Prettier",
      providerIcon: "🎨",
      gate: {kind: "blocking", blockOn: "error"},
      gateResult: "errored",
      durationMs: 50,
      startedAt: "2026-05-30T00:00:00.000Z",
      finishedAt: "2026-05-30T00:00:00.050Z",
      payload: null,
      findings: [],
      error: {message: "prettier exploded", stack: "...stack..."},
    };
    expect(outcome.gateResult).toBe("errored");
    expect(outcome.error?.message).toBe("prettier exploded");
  });
});
