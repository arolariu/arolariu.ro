import {describe, it, expect} from "vitest";
import {
  buildStepSummary,
  normalizePath,
  cleanMessage,
  renderHeader,
  renderKpiCards,
  renderOverviewTable,
  renderProviderCard,
  renderRulesTable,
  renderSuiteChipRow,
  renderSuiteFailures,
  renderStatsCallout,
  renderFooter,
  classifyProvider,
  formatHumanBytes,
} from "./stepSummary.ts";
import type {Finding, HygieneReport, ProviderOutcome} from "../domain/types.ts";

// Local SuiteResult/TestSuitesPayload shapes used only by these tests; they
// must match the structural shape defined inside stepSummary.ts (and the
// real types in providers/_testHelpers.ts).
interface SuiteResult {
  readonly name: string;
  readonly totalTests: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly durationMs?: number;
  readonly findings: readonly Finding[];
}
interface TestSuitesPayload {
  readonly totalTests: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly suites: readonly SuiteResult[];
}

function makeOutcome<P = unknown>(o: Partial<ProviderOutcome<P>>): ProviderOutcome<P> {
  return {
    providerId: "x",
    providerName: "X",
    providerIcon: "🟦",
    gate: {kind: "blocking", blockOn: "error"},
    gateResult: "passed",
    durationMs: 100,
    startedAt: "2026-05-30T00:00:00.000Z",
    finishedAt: "2026-05-30T00:00:00.100Z",
    payload: null as unknown as P,
    findings: [],
    error: null,
    ...o,
  };
}

function makeReport(overrides: Partial<HygieneReport> = {}): HygieneReport {
  return {
    schemaVersion: "3",
    commitSha: "abc1234567890",
    prNumber: 42,
    workflowRunId: "12345",
    workflowRunUrl: "https://github.com/x/y/actions/runs/12345",
    generatedAt: "2026-05-30T00:00:00.000Z",
    overallResult: "passed",
    outcomes: [],
    ...overrides,
  };
}

function lineFinding(over: Partial<Finding & {kind: "line"}> = {}): Finding {
  return {
    kind: "line",
    severity: "error",
    file: "src/x.ts",
    line: 1,
    column: 1,
    message: "bad",
    ...over,
  } as Finding;
}

describe("normalizePath", () => {
  it("strips GitHub Actions runner workspace prefix", () => {
    expect(normalizePath("/home/runner/work/repo/repo/src/foo.ts")).toBe("src/foo.ts");
  });
  it("returns repo-relative paths unchanged", () => {
    expect(normalizePath("src/foo.ts")).toBe("src/foo.ts");
  });
  it("normalizes Windows-style workspace paths", () => {
    expect(normalizePath("D:\\a\\arolariu.ro\\sites\\arolariu.ro\\src\\foo.ts"))
      .toBe("sites/arolariu.ro/src/foo.ts");
  });
});

describe("cleanMessage", () => {
  it("strips ANSI codes", () => {
    expect(cleanMessage("\u001b[31mred\u001b[0m text")).toBe("red text");
  });
  it("filters node_modules stack frames", () => {
    const msg = "AssertionError: nope\n  at /a/node_modules/vitest/x.js:1\n  at user.ts:2";
    expect(cleanMessage(msg)).toContain("user.ts");
    expect(cleanMessage(msg)).not.toContain("node_modules");
  });
  it("caps at 240 chars with ellipsis", () => {
    const long = "x".repeat(500);
    expect(cleanMessage(long)).toHaveLength(240);
    expect(cleanMessage(long).endsWith("…")).toBe(true);
  });
});

describe("classifyProvider", () => {
  it("classifies format and lint as 'lint'", () => {
    expect(classifyProvider("format")).toBe("lint");
    expect(classifyProvider("lint")).toBe("lint");
  });
  it("classifies all three test providers as 'test'", () => {
    expect(classifyProvider("test-typescript")).toBe("test");
    expect(classifyProvider("test-dotnet")).toBe("test");
    expect(classifyProvider("test-python")).toBe("test");
  });
  it("classifies stats as 'stats'", () => {
    expect(classifyProvider("stats")).toBe("stats");
  });
  it("falls back to 'lint' for unknown providers", () => {
    expect(classifyProvider("brand-new")).toBe("lint");
  });
});

describe("formatHumanBytes", () => {
  it("formats bytes", () => { expect(formatHumanBytes(512)).toBe("512 B"); });
  it("formats kilobytes", () => { expect(formatHumanBytes(2048)).toBe("2.0 KB"); });
  it("formats megabytes", () => { expect(formatHumanBytes(5_242_880)).toBe("5.0 MB"); });
  it("preserves sign for negative", () => { expect(formatHumanBytes(-2048)).toBe("-2.0 KB"); });
});

describe("renderHeader", () => {
  it("includes the title", () => {
    expect(renderHeader(makeReport())).toMatch(/Hygiene Check/);
  });
  it("shows ✅ Passed verdict when overallResult is passed", () => {
    expect(renderHeader(makeReport({overallResult: "passed"}))).toMatch(/✅ Passed/);
  });
  it("shows ❌ Failed verdict when overallResult is failed", () => {
    expect(renderHeader(makeReport({overallResult: "failed"}))).toMatch(/❌ Failed/);
  });
  it("includes the short commit sha", () => {
    expect(renderHeader(makeReport({commitSha: "abcdef1234567890"}))).toMatch(/abcdef1/);
  });
  it("renders provider counts (X of Y providers passed · K failed)", () => {
    const report = makeReport({
      outcomes: [
        makeOutcome({gateResult: "passed"}),
        makeOutcome({gateResult: "passed"}),
        makeOutcome({gateResult: "failed"}),
      ],
    });
    expect(renderHeader(report)).toMatch(/2 of 3 providers passed/);
    expect(renderHeader(report)).toMatch(/1 failed/);
  });
  it("renders total findings counts broken down", () => {
    const report = makeReport({
      outcomes: [
        makeOutcome({
          findings: [
            lineFinding({severity: "error"}),
            lineFinding({severity: "warning"}),
            lineFinding({severity: "info"}),
          ],
        }),
      ],
    });
    const out = renderHeader(report);
    expect(out).toMatch(/3 findings/);
    expect(out).toMatch(/1 errors?/);
    expect(out).toMatch(/1 warnings?/);
  });
  it("excludes MetricFindings from the findings count", () => {
    const metricFinding: Finding = {kind: "metric", severity: "info", name: "diff.churn", value: 42, unit: "lines", message: "42 lines changed"};
    const report = makeReport({
      outcomes: [makeOutcome({findings: [metricFinding]})],
    });
    expect(renderHeader(report)).toMatch(/0 findings/);
  });
});

describe("renderKpiCards", () => {
  it("renders four KPI cards", () => {
    const html = renderKpiCards(makeReport());
    expect(html).toMatch(/Findings/);
    expect(html).toMatch(/Errors/);
    expect(html).toMatch(/Warnings/);
    expect(html).toMatch(/Wall time/);
  });
  it("uses bold error count when there are errors", () => {
    const report = makeReport({
      outcomes: [makeOutcome({findings: [lineFinding({severity: "error"})]})],
    });
    expect(renderKpiCards(report)).toMatch(/\*\*1\*\* ❌/);
  });
  it("sums wall time across all providers", () => {
    const report = makeReport({
      outcomes: [
        makeOutcome({durationMs: 30_000}),
        makeOutcome({durationMs: 60_000}),
      ],
    });
    expect(renderKpiCards(report)).toMatch(/1m30s/);
  });
});

describe("renderOverviewTable", () => {
  it("renders one row per outcome in registry order", () => {
    const report = makeReport({
      outcomes: [
        makeOutcome({providerId: "format", providerName: "Prettier", providerIcon: "🎨"}),
        makeOutcome({providerId: "lint", providerName: "ESLint", providerIcon: "🔍", gateResult: "failed",
          findings: [lineFinding()]}),
      ],
    });
    const md = renderOverviewTable(report);
    expect(md).toMatch(/Prettier/);
    expect(md).toMatch(/ESLint/);
    expect(md.indexOf("Prettier")).toBeLessThan(md.indexOf("ESLint"));
  });
  it("renders '—' for zero-finding rows", () => {
    const report = makeReport({outcomes: [makeOutcome({findings: []})]});
    expect(renderOverviewTable(report)).toMatch(/—/);
  });
  it("renders bold finding count for non-zero rows", () => {
    const report = makeReport({
      outcomes: [makeOutcome({findings: [lineFinding(), lineFinding()]})],
    });
    expect(renderOverviewTable(report)).toMatch(/\*\*2\*\*/);
  });
  it("renders '—' for rows with only MetricFindings", () => {
    const metricFinding: Finding = {kind: "metric", severity: "info", name: "diff.churn", value: 10, unit: "lines", message: "10 lines"};
    const report = makeReport({outcomes: [makeOutcome({findings: [metricFinding]})]});
    expect(renderOverviewTable(report)).toMatch(/—/);
  });
  it("renders 💥 emoji for errored providers", () => {
    const report = makeReport({outcomes: [makeOutcome({gateResult: "errored"})]});
    expect(renderOverviewTable(report)).toMatch(/💥/);
  });
});

describe("renderRulesTable", () => {
  it("returns empty string when no findings have a ruleId", () => {
    const findings: Finding[] = [lineFinding()];
    expect(renderRulesTable(findings, 5)).toBe("");
  });
  it("groups by ruleId and sorts by count desc", () => {
    const findings: Finding[] = [
      lineFinding({ruleId: "a"}),
      lineFinding({ruleId: "b"}),
      lineFinding({ruleId: "b"}),
      lineFinding({ruleId: "b"}),
    ];
    const md = renderRulesTable(findings, 5);
    expect(md.indexOf("`b`")).toBeLessThan(md.indexOf("`a`"));
    expect(md).toMatch(/`b` \| 3/);
    expect(md).toMatch(/`a` \| 1/);
  });
  it("caps at the provided limit", () => {
    const findings: Finding[] = ["a","b","c","d","e","f","g"].map((id) => lineFinding({ruleId: id}));
    const md = renderRulesTable(findings, 3);
    const rows = md.split("\n").filter((l) => /^\|\s*`/.test(l));
    expect(rows).toHaveLength(3);
  });
});

describe("renderSuiteChipRow", () => {
  function suite(name: string, failed = 0): SuiteResult {
    return {name, totalTests: 1, passed: failed === 0 ? 1 : 0, failed, skipped: 0, findings: []};
  }
  it("returns empty string for single-suite providers", () => {
    expect(renderSuiteChipRow([suite("only")])).toBe("");
  });
  it("renders a chip for every suite when 2+", () => {
    const html = renderSuiteChipRow([suite("a", 1), suite("b"), suite("c")]);
    expect(html).toMatch(/a/);
    expect(html).toMatch(/b/);
    expect(html).toMatch(/c/);
  });
  it("colors failing suites red and passing suites green", () => {
    const html = renderSuiteChipRow([suite("bad", 2), suite("good")]);
    expect(html).toMatch(/❌.*bad/);
    expect(html).toMatch(/✅.*good/);
  });
  it("orders failed suites before passed suites", () => {
    const html = renderSuiteChipRow([suite("zgood"), suite("abad", 1)]);
    expect(html.indexOf("abad")).toBeLessThan(html.indexOf("zgood"));
  });
  it("escapes HTML in suite names", () => {
    const suites: SuiteResult[] = [
      {name: "evil</span>", totalTests: 1, passed: 0, failed: 1, skipped: 0, findings: []},
      {name: "good", totalTests: 1, passed: 1, failed: 0, skipped: 0, findings: []},
    ];
    const html = renderSuiteChipRow(suites);
    expect(html).toContain("evil&lt;/span&gt;");
    expect(html).not.toMatch(/evil<\/span>/);
  });
});

describe("renderSuiteFailures", () => {
  function suiteWithFailures(name: string, failureCount: number): SuiteResult {
    const findings: Finding[] = [];
    for (let i = 0; i < failureCount; i++) {
      findings.push(lineFinding({
        suite: name,
        message: `failure ${i}`,
        file: `t${i}.ts`,
        line: i + 1,
      }));
    }
    return {name, totalTests: 100, passed: 100 - failureCount, failed: failureCount, skipped: 0, findings};
  }
  it("renders a heading with failed/of total counts", () => {
    const md = renderSuiteFailures(suiteWithFailures("scripts", 2));
    expect(md).toMatch(/`scripts`/);
    expect(md).toMatch(/2 failed of 100/);
  });
  it("renders one row per failing test", () => {
    const md = renderSuiteFailures(suiteWithFailures("scripts", 3));
    expect((md.match(/❌/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
  it("collapses error messages inside <details>", () => {
    const md = renderSuiteFailures(suiteWithFailures("scripts", 1));
    expect(md).toMatch(/<details>/);
    expect(md).toMatch(/<summary>/);
    expect(md).toMatch(/failure 0/);
  });
  it("caps at 10 rows with overflow line", () => {
    const md = renderSuiteFailures(suiteWithFailures("scripts", 25));
    const rows = (md.match(/❌/g) ?? []).length;
    expect(rows).toBe(10);
    expect(md).toMatch(/\+ 15 more failing tests — see artifact/);
  });
  it("returns empty string for a passing suite", () => {
    const s: SuiteResult = {name: "p", totalTests: 10, passed: 10, failed: 0, skipped: 0, findings: []};
    expect(renderSuiteFailures(s)).toBe("");
  });
  it("handles error messages containing triple-backtick fences without breaking layout", () => {
    const findings: Finding[] = [{
      kind: "line",
      severity: "error",
      file: "t.ts",
      line: 1,
      column: 1,
      message: "Expected:\n```ts\nconst x = 1;\n```\nReceived: undefined",
      suite: "scripts",
    }];
    const suite: SuiteResult = {name: "scripts", totalTests: 1, passed: 0, failed: 1, skipped: 0, findings};
    const md = renderSuiteFailures(suite);
    expect(md).toMatch(/````+\s*\n.*Expected:.*\n.*```ts/s);
  });
  it("escapes HTML in test names to prevent tag injection", () => {
    const findings: Finding[] = [{
      kind: "line",
      severity: "error",
      file: "evil</details>.ts",
      line: 1,
      column: 1,
      message: "boom",
      suite: "scripts",
    }];
    const suite: SuiteResult = {name: "scripts", totalTests: 1, passed: 0, failed: 1, skipped: 0, findings};
    const md = renderSuiteFailures(suite);
    expect(md).toContain("&lt;/details&gt;");
    expect(md).not.toMatch(/evil<\/details>\.ts/);
  });
});

describe("renderStatsCallout", () => {
  function comparison(name: string, baseValue: number, headValue: number): Finding {
    return {
      kind: "comparison",
      severity: "info",
      name,
      baseValue,
      headValue,
      diff: headValue - baseValue,
      unit: "B",
      message: "",
    };
  }
  it("returns null when there are no comparison findings", () => {
    const o = makeOutcome({providerId: "stats", findings: []});
    expect(renderStatsCallout(o)).toBeNull();
  });
  it("renders a callout with GFM table when there are comparison findings", () => {
    const o = makeOutcome({
      providerId: "stats",
      findings: [comparison("a", 1000, 2000)],
    });
    const html = renderStatsCallout(o);
    expect(html).not.toBeNull();
    expect(html!).toMatch(/Bundle stats/);
    expect(html!).toMatch(/\| File \| Before \| After \| Diff \|/);
  });
  it("uses positive sign for size increases", () => {
    const o = makeOutcome({
      providerId: "stats",
      findings: [comparison("grew", 1000, 2024)],
    });
    expect(renderStatsCallout(o)!).toMatch(/\+1\.0 KB/);
  });
  it("uses negative sign for size decreases", () => {
    const o = makeOutcome({
      providerId: "stats",
      findings: [comparison("shrunk", 2024, 1000)],
    });
    expect(renderStatsCallout(o)!).toMatch(/-1\.0 KB/);
  });
  it("escapes HTML in comparison names", () => {
    const o = makeOutcome({
      providerId: "stats",
      findings: [{
        kind: "comparison",
        severity: "info",
        name: "evil<script>name",
        baseValue: 1, headValue: 2, diff: 1, unit: "B", message: "",
      }],
    });
    const html = renderStatsCallout(o)!;
    expect(html).toContain("evil&lt;script&gt;name");
  });
});

describe("renderProviderCard", () => {
  it("renders nothing for passed providers", () => {
    const o = makeOutcome({gateResult: "passed", providerName: "Prettier"});
    expect(renderProviderCard(o)).toBe("");
  });
  it("renders an H2 with the FAIL pill for failed providers", () => {
    const o = makeOutcome({
      providerId: "lint",
      providerName: "ESLint",
      providerIcon: "🔍",
      gateResult: "failed",
      findings: [lineFinding({ruleId: "no-unused"})],
    });
    const md = renderProviderCard(o);
    expect(md).toMatch(/## 🔍 ESLint/);
    expect(md).toMatch(/FAIL/);
  });
  it("renders ERROR pill for errored providers", () => {
    const o = makeOutcome({
      providerId: "lint",
      providerName: "ESLint",
      providerIcon: "🔍",
      gateResult: "errored",
      error: {message: "runner blew up"},
    });
    expect(renderProviderCard(o)).toMatch(/ERROR/);
  });
  it("includes the top rules table for lint providers with rules", () => {
    const o = makeOutcome({
      providerId: "lint",
      providerName: "ESLint",
      providerIcon: "🔍",
      gateResult: "failed",
      findings: [lineFinding({ruleId: "a"}), lineFinding({ruleId: "a"}), lineFinding({ruleId: "b"})],
    });
    const md = renderProviderCard(o);
    expect(md).toMatch(/Top rules/);
    expect(md).toMatch(/`a`/);
  });
  it("includes suite chip row + suite failures for test providers with 2+ suites", () => {
    const payload: TestSuitesPayload = {
      totalTests: 200, passed: 198, failed: 2, skipped: 0,
      suites: [
        {name: "scripts", totalTests: 100, passed: 98, failed: 2, skipped: 0, findings: [
          lineFinding({suite: "scripts", message: "boom"}),
          lineFinding({suite: "scripts", message: "bang"}),
        ]},
        {name: "website", totalTests: 100, passed: 100, failed: 0, skipped: 0, findings: []},
      ],
    };
    const o = makeOutcome<TestSuitesPayload>({
      providerId: "test-typescript",
      providerName: "TypeScript Unit Tests",
      providerIcon: "🟦",
      gateResult: "failed",
      findings: payload.suites.flatMap((s) => s.findings),
      payload,
    });
    const md = renderProviderCard(o as ProviderOutcome<unknown>);
    expect(md).toMatch(/❌.*scripts/);
    expect(md).toMatch(/✅.*website/);
    expect(md).toMatch(/2 failed of 100/);
    expect(md).toMatch(/<details>/);
  });
  it("includes pointer to artifact for lint providers", () => {
    const o = makeOutcome({
      providerId: "lint",
      providerName: "ESLint",
      providerIcon: "🔍",
      gateResult: "failed",
      findings: [lineFinding({ruleId: "a"})],
    });
    expect(renderProviderCard(o)).toMatch(/artifact/i);
  });
  it("escapes HTML in errored provider error messages via fence-safe block", () => {
    const o = makeOutcome({
      providerId: "lint",
      providerName: "ESLint",
      providerIcon: "🔍",
      gateResult: "errored",
      error: {message: "log contains ``` fenced ``` block"},
    });
    const md = renderProviderCard(o);
    expect(md).toMatch(/````+\s*\nlog contains/);
  });
});

describe("renderFooter", () => {
  it("includes the workflow run link", () => {
    expect(renderFooter(makeReport({workflowRunUrl: "https://x/123"}))).toMatch(/https:\/\/x\/123/);
  });
  it("mentions hygiene v3", () => {
    expect(renderFooter(makeReport())).toMatch(/Hygiene v3/);
  });
});

describe("buildStepSummary", () => {
  it("includes header, KPI cards, overview table, and footer", () => {
    const md = buildStepSummary(makeReport());
    expect(md).toMatch(/Hygiene Check/);
    expect(md).toMatch(/Findings/);
    expect(md).toMatch(/\| Provider \|/);
    expect(md).toMatch(/Hygiene v3/);
  });
  it("does not render a card for passing providers", () => {
    const report = makeReport({
      outcomes: [makeOutcome({providerName: "Prettier", gateResult: "passed"})],
    });
    const md = buildStepSummary(report);
    expect(md).not.toMatch(/## .*Prettier/);
  });
  it("renders failed providers in registry order before stats callout", () => {
    const report = makeReport({
      outcomes: [
        makeOutcome({providerId: "lint", providerName: "ESLint", providerIcon: "🔍", gateResult: "failed",
          findings: [lineFinding({ruleId: "x"})]}),
        makeOutcome({providerId: "stats", providerName: "Statistics", providerIcon: "📊",
          findings: [{kind: "comparison", severity: "info", name: "bundle", baseValue: 1, headValue: 2, diff: 1, unit: "B", message: ""}]}),
      ],
    });
    const md = buildStepSummary(report);
    expect(md.indexOf("ESLint")).toBeLessThan(md.indexOf("Bundle stats"));
  });
  it("suppresses stats callout when no comparison findings", () => {
    const report = makeReport({
      outcomes: [makeOutcome({providerId: "stats", findings: []})],
    });
    expect(buildStepSummary(report)).not.toMatch(/Bundle stats/);
  });
});
