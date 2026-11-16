import {describe, it, expect} from "vitest";
import {
  buildStepSummary,
  normalizePath,
  cleanMessage,
  renderHeader,
  renderScorecard,
  renderProviderCard,
  renderRulesTable,
  renderSuiteStatusRow,
  renderSuiteFailures,
  renderStatsDetails,
  renderFooter,
  classifyProvider,
  formatHumanBytes,
} from "./stepSummary.ts";
import type {Finding, HygieneReport, ProviderOutcome} from "../domain/types.ts";
import type {SuiteResult, TestSuitesPayload} from "../../../lib/testing/suites.ts";
import {context as planContext} from "../../../lib/planning/fixtures/plans.ts";
import {plan as evidencePlan, outcome as evidenceOutcome} from "../../../lib/hygiene/fixtures/outcomes.ts";
import {providerIds} from "../../../lib/hygiene/registry.ts";
import {buildVerifiedReport} from "../../../lib/hygiene/aggregate.ts";
import type {GitChangeSet} from "../../../helpers/git/index.ts";
import type {FolderSize, StatsPayload} from "../../../lib/hygiene/payloads.ts";

describe("scorecard cell safety", () => {
  it("summarizes repository-wide selection without dumping per-file planning diagnostics", () => {
    const plan = {
      ...evidencePlan(),
      diagnostics: [
        {code: "shared-input", message: "Nx shared inputs changed; running the declared full scope"},
        ...Array.from({length: 50}, (_, index) => ({
          code: "unmapped-change",
          message: `No declared project owns changed path: infra/file-${index}.json`,
        })),
      ],
    };
    const report = buildVerifiedReport(planContext(), plan, {
      outcomes: providerIds().map((id) => evidenceOutcome(plan, id)),
      issues: [],
    });
    const markdown = buildStepSummary(report);

    expect(markdown).toContain("Full validation selected because shared configuration changed.");
    expect(markdown).toContain(`${report.workflowRunUrl}#artifacts`);
    expect(markdown).not.toMatch(/shared-input|unmapped-change|No declared project|infra\/file-/);
    expect(report.plan?.diagnostics).toEqual(plan.diagnostics);
  });
  it("explains an actual workspace inspection fallback without hiding evidence errors", () => {
    const plan = {
      ...evidencePlan(),
      diagnostics: [{code: "workspace-unavailable", message: "Workspace facts worker exited with code 1"}],
    };
    const report = buildVerifiedReport(planContext(), plan, {outcomes: [], issues: []});
    const markdown = buildStepSummary(report);

    expect(markdown).toContain("Workspace inspection was unavailable; full validation selected.");
    expect(markdown).toContain("missing-outcome");
  });
  it("retains actionable runner diagnostics beyond the short finding-summary budget", () => {
    const message = `Command 'prettier' exited with code 2\n${"module path detail ".repeat(20)}SyntaxError: top-level await`;
    const markdown = renderProviderCard(makeOutcome({gateResult: "errored", error: {message}}));
    expect(markdown).toContain("SyntaxError: top-level await");
  });
  it("publishes selection/skip reasons and explicit missing evidence", () => {
    const plan = evidencePlan(true);
    const report = buildVerifiedReport(planContext(), plan, {outcomes: providerIds().map((id) => evidenceOutcome(plan, id)), issues: []});
    expect(buildStepSummary(report)).not.toContain("Selection plan");
    expect(buildStepSummary(report)).toMatch(/Skipped — no changed files/);
    const missing = buildVerifiedReport(planContext(), plan, {outcomes: [], issues: []});
    expect(buildStepSummary(missing)).toContain("missing-outcome");
  });
  it("does not label operational zero-count suites as passing", () => {
    const failed: SuiteResult = {
      name: "runner",
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      findings: [{kind: "file", severity: "error", file: "<runner>", message: "No report"}],
    };
    const passed: SuiteResult = {name: "passed", totalTests: 1, passed: 1, failed: 0, skipped: 0, findings: []};
    expect(renderSuiteStatusRow([failed, passed])).toContain("❌ **runner**");
    expect(renderSuiteFailures(failed)).toContain("No report");
  });
  it("does not let provider labels create columns or rows", () => {
    const markdown = renderScorecard(makeReport({outcomes: [makeOutcome({providerName: "a|b\nc"})]}));
    expect(markdown).toContain("a\\|b<br>c");
  });
});

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

function makeStatsReport(
  changes: GitChangeSet = {
    scope: "known",
    baseSha: "b".repeat(40),
    headSha: "a".repeat(40),
    entries: [
      ...Array.from({length: 19}, (_, index) => ({kind: "added" as const, path: `sites/arolariu.ro/new-${index}.md`})),
      {kind: "modified", path: "sites/arolariu.ro/README.md"},
      {kind: "modified", path: "sites/arolariu.ro/DESIGN_SYSTEM.md"},
    ],
  },
  bundleSizes: readonly FolderSize[] = [{folder: "sites/arolariu.ro", mainTotal: 18398102, headTotal: 19414019}],
): HygieneReport {
  const payload: StatsPayload = {
    filesChanged: 21,
    linesAdded: 1435,
    linesDeleted: 502,
    topExtensions: [
      {extension: "webp", count: 16},
      {extension: "md", count: 5},
    ],
    topDirectories: [{directory: "sites", count: 21}],
    bundleSizes,
  };
  return makeReport({
    plan: {...evidencePlan(), changes},
    outcomes: [
      makeOutcome({
        providerId: "stats",
        providerName: "Statistics",
        payload,
        findings: bundleSizes
          .filter((folder) => folder.mainTotal !== folder.headTotal)
          .map((folder) => ({
            kind: "comparison",
            severity: "info",
            name: `bundle.${folder.folder}`,
            baseValue: folder.mainTotal,
            headValue: folder.headTotal,
            diff: folder.headTotal - folder.mainTotal,
            unit: "B",
            message: "",
          })),
      }),
    ],
  });
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
    expect(normalizePath("D:\\a\\arolariu.ro\\sites\\arolariu.ro\\src\\foo.ts")).toBe("sites/arolariu.ro/src/foo.ts");
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
  it("formats bytes", () => {
    expect(formatHumanBytes(512)).toBe("512 B");
  });
  it("formats kilobytes", () => {
    expect(formatHumanBytes(2048)).toBe("2.0 KiB");
  });
  it("formats megabytes", () => {
    expect(formatHumanBytes(5_242_880)).toBe("5.0 MiB");
  });
  it("preserves sign for negative", () => {
    expect(formatHumanBytes(-2048)).toBe("-2.0 KiB");
  });
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
  it("renders compact provider pass counts with total duration", () => {
    const report = makeReport({
      outcomes: [makeOutcome({gateResult: "passed"}), makeOutcome({gateResult: "passed"}), makeOutcome({gateResult: "failed"})],
    });
    expect(renderHeader(report)).toMatch(/2 passed/);
    expect(renderHeader(report)).toMatch(/1 failed/);
    expect(renderHeader(report)).toMatch(/300ms/);
  });
  it("renders total findings counts broken down", () => {
    const report = makeReport({
      outcomes: [
        makeOutcome({
          findings: [lineFinding({severity: "error"}), lineFinding({severity: "warning"}), lineFinding({severity: "info"})],
        }),
      ],
    });
    const out = renderHeader(report);
    expect(out).toMatch(/1 informational finding/);
    expect(out).toMatch(/1 errors?/);
    expect(out).toMatch(/1 warnings?/);
  });
  it("excludes MetricFindings from the findings count", () => {
    const metricFinding: Finding = {
      kind: "metric",
      severity: "info",
      name: "diff.churn",
      value: 42,
      unit: "lines",
      message: "42 lines changed",
    };
    const report = makeReport({
      outcomes: [makeOutcome({findings: [metricFinding]})],
    });
    expect(renderHeader(report)).toContain("0 errors · 0 warnings");
    expect(renderHeader(report)).not.toContain("42");
  });
});

describe("execution-aware timing", () => {
  it.each([
    [0, "0ms"],
    [100, "100ms"],
    [891.1209309999999, "891.121ms"],
    [305.10104, "305.101ms"],
    [0.0017460000000255604, "0.002ms"],
    [999.9999, "1s"],
    [1250, "1.25s"],
    [1499.4999, "1.499s"],
    [59999.9999, "1m00s"],
    [119999.9999, "2m00s"],
    [215292.873714, "3m35.293s"],
  ])("formats %s milliseconds as %s in the check table", (durationMs, expected) => {
    expect(renderScorecard(makeReport({outcomes: [makeOutcome({durationMs})]}))).toContain(`| ${expected} |`);
  });

  it("rounds the overview directly in displayed units without a second rounding increment", () => {
    expect(renderHeader(makeReport({outcomes: [makeOutcome({durationMs: 1499.9999})]}))).toContain("**1s**");
  });

  it("counts executed passes separately and excludes skipped bookkeeping from the whole-number overview", () => {
    const plan = evidencePlan(true);
    const skipped = (["lint", "test-dotnet", "test-python"] as const).map((id) => ({
      ...evidenceOutcome(plan, id),
      durationMs: 10000,
    }));
    const report = makeReport({
      plan,
      outcomes: [891.120931, 215292.873714, 305.10104].map((durationMs) => makeOutcome({durationMs})).concat(skipped),
    });
    const header = renderHeader(report);
    expect(header).toContain("3 passed");
    expect(header).toContain("3 skipped");
    expect(header).toContain("3m36s");
    expect(header).not.toContain("6/6");
    expect(header).not.toContain("3m36.");
  });

  it("shows skipped checks with their actual reason and no execution time", () => {
    const plan = evidencePlan(true);
    const skipped = {...evidenceOutcome(plan, "lint"), skipReason: "No affected inputs for this provider"};
    const markdown = renderScorecard(makeReport({plan, outcomes: [skipped]}));
    expect(markdown).toContain("| ⏭️ SKIP | Skipped — no changed files affect this check | — |");
    expect(markdown).not.toMatch(/PASS|planned skip/);
  });

  it("falls back to the matching plan reason without inventing a missing reason", () => {
    const plan = evidencePlan(true);
    const {skipReason: _reason, ...skipped} = evidenceOutcome(plan, "lint");
    expect(renderScorecard(makeReport({plan, outcomes: [skipped]}))).toContain("Skipped — no changed files");
    expect(renderScorecard(makeReport({outcomes: [skipped]}))).toContain("Skipped — reason unavailable");
  });

  it("escapes unfamiliar skip reasons and preserves their meaning", () => {
    const skipped = {...evidenceOutcome(evidencePlan(true), "lint"), skipReason: "Manual | choice\n<details>"};
    expect(renderScorecard(makeReport({outcomes: [skipped]}))).toContain("Manual \\| choice<br>&lt;details&gt;");
  });

  it("never hides an evidence error behind a skip or marks an all-skipped report as executed passes", () => {
    const plan = evidencePlan(true);
    const report = buildVerifiedReport(planContext(), plan, {outcomes: providerIds().map((id) => evidenceOutcome(plan, id)), issues: []});
    expect(renderHeader(report)).toContain("0 passed");
    expect(renderHeader(report)).toContain("6 skipped");
    const broken = {...evidenceOutcome(plan, "lint"), gateResult: "errored" as const};
    expect(renderScorecard(makeReport({outcomes: [broken]}))).toContain("| 💥 ERROR | runner error |");
    expect(renderScorecard(makeReport({outcomes: [broken]}))).not.toContain("SKIP");
  });

  it("reports advisory and cancelled execution without claiming success", () => {
    const cancelled = {...evidenceOutcome(evidencePlan(), "lint"), executionStatus: "cancelled" as const, gateResult: "failed" as const};
    const report = makeReport({outcomes: [makeOutcome({gateResult: "advisory"}), cancelled]});
    expect(renderHeader(report)).toContain("1 advisory");
    expect(renderHeader(report)).toContain("1 failed");
    expect(renderScorecard(report)).toContain("cancelled");
  });
});

describe("renderScorecard", () => {
  it("renders the GitHub-safe scorecard columns", () => {
    const md = renderScorecard(makeReport());

    expect(md).toMatch(/\| Check \| Result \| Signal \| Time \|/);
    expect(md).toMatch(/\|---\|:---:\|---\|---:\|/);
  });

  it("renders one row per provider in registry order", () => {
    const report = makeReport({
      outcomes: [
        makeOutcome({
          providerId: "lint",
          providerName: "ESLint",
          providerIcon: "🔍",
          gateResult: "failed",
          findings: [lineFinding({ruleId: "no-unused"})],
        }),
        makeOutcome({providerId: "format", providerName: "Prettier", providerIcon: "🎨"}),
      ],
    });
    const md = renderScorecard(report);

    expect(md).toMatch(/Prettier/);
    expect(md).toMatch(/ESLint/);
    const providerRows = md.split("\n").filter((line: string) => /^\| (?!Check \|)[^|-]/.test(line));
    expect(providerRows).toHaveLength(2);
    expect(md.indexOf("Prettier")).toBeLessThan(md.indexOf("ESLint"));
  });

  it("uses clean as the signal for passing providers with no findings", () => {
    const report = makeReport({
      outcomes: [makeOutcome({providerName: "Prettier", findings: []})],
    });

    expect(renderScorecard(report)).toMatch(/\| 🟦 Prettier \| ✅ PASS \| clean \|/);
  });

  it("escapes provider labels in scorecard rows", () => {
    const report = makeReport({
      outcomes: [
        makeOutcome({
          providerIcon: "<svg>",
          providerName: "Provider <script>alert('x')</script> & Co",
        }),
      ],
    });

    const md = renderScorecard(report);

    expect(md).toContain("| &lt;svg&gt; Provider &lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; Co | ✅ PASS | clean |");
    expect(md).not.toContain("<script>");
    expect(md).not.toContain("<svg>");
  });

  it("summarizes failed lint providers with finding count and top rule", () => {
    const report = makeReport({
      outcomes: [
        makeOutcome({
          providerId: "lint",
          providerName: "ESLint",
          providerIcon: "🔍",
          gateResult: "failed",
          findings: [
            lineFinding({ruleId: "react-hooks/exhaustive-deps"}),
            lineFinding({ruleId: "react-hooks/exhaustive-deps"}),
            lineFinding({ruleId: "@typescript-eslint/no-unused-vars"}),
          ],
        }),
      ],
    });
    const md = renderScorecard(report);

    expect(md).toMatch(/\*\*3 findings\*\*/);
    expect(md).toMatch(/top: `react-hooks\/exhaustive-deps`/);
  });

  it("summarizes errored providers as runner errors", () => {
    const report = makeReport({
      outcomes: [makeOutcome({providerName: "ESLint", gateResult: "errored"})],
    });

    expect(renderScorecard(report)).toMatch(/\| 🟦 ESLint \| 💥 ERROR \| runner error \|/);
  });

  it("excludes MetricFindings from scorecard finding counts", () => {
    const metricFinding: Finding = {
      kind: "metric",
      severity: "info",
      name: "diff.churn",
      value: 10,
      unit: "lines",
      message: "10 lines",
    };
    const report = makeReport({
      outcomes: [makeOutcome({findings: [metricFinding]})],
    });

    expect(renderScorecard(report)).not.toMatch(/findings/);
    expect(renderScorecard(report)).toMatch(/clean/);
  });

  it("distinguishes legacy folder comparisons from unavailable file counts and sums all deltas", () => {
    const report = makeReport({
      outcomes: [
        makeOutcome({
          providerId: "stats",
          providerName: "Bundle stats",
          providerIcon: "📦",
          findings: [
            {kind: "comparison", severity: "info", name: "small", baseValue: 1000, headValue: 2024, diff: 1024, unit: "B", message: ""},
            {kind: "comparison", severity: "info", name: "large", baseValue: 1000, headValue: 5096, diff: 4096, unit: "B", message: ""},
          ],
        }),
      ],
    });

    expect(renderScorecard(report)).toContain("File changes unavailable");
    expect(renderScorecard(report)).toContain("+5.0 KiB");
    expect(renderScorecard(report)).toContain("2 folders changed");
    expect(renderScorecard(report)).not.toContain("files changed");
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
    const findings: Finding[] = ["a", "b", "c", "d", "e", "f", "g"].map((id) => lineFinding({ruleId: id}));
    const md = renderRulesTable(findings, 3);
    const rows = md.split("\n").filter((l) => /^\|\s*`/.test(l));
    expect(rows).toHaveLength(3);
  });
});

describe("renderSuiteStatusRow", () => {
  function suite(name: string, failed = 0): SuiteResult {
    return {name, totalTests: 1, passed: failed === 0 ? 1 : 0, failed, skipped: 0, findings: []};
  }
  it("returns empty string for single-suite providers", () => {
    expect(renderSuiteStatusRow([suite("only")])).toBe("");
  });
  it("renders a status token for every suite when 2+", () => {
    const html = renderSuiteStatusRow([suite("a", 1), suite("b"), suite("c")]);
    expect(html).toMatch(/a/);
    expect(html).toMatch(/b/);
    expect(html).toMatch(/c/);
  });
  it("marks failing suites red and passing suites green", () => {
    const html = renderSuiteStatusRow([suite("bad", 2), suite("good")]);
    expect(html).toMatch(/❌.*bad/);
    expect(html).toMatch(/✅.*good/);
  });
  it("orders failed suites before passed suites", () => {
    const html = renderSuiteStatusRow([suite("zgood"), suite("abad", 1)]);
    expect(html.indexOf("abad")).toBeLessThan(html.indexOf("zgood"));
  });
  it("escapes HTML in suite names", () => {
    const suites: SuiteResult[] = [
      {name: "evil</span>", totalTests: 1, passed: 0, failed: 1, skipped: 0, findings: []},
      {name: "good", totalTests: 1, passed: 1, failed: 0, skipped: 0, findings: []},
    ];
    const html = renderSuiteStatusRow(suites);
    expect(html).toContain("evil&lt;/span&gt;");
    expect(html).not.toMatch(/evil<\/span>/);
  });
});

describe("renderSuiteFailures", () => {
  function suiteWithFailures(name: string, failureCount: number): SuiteResult {
    const findings: Finding[] = [];
    for (let i = 0; i < failureCount; i++) {
      findings.push(
        lineFinding({
          suite: name,
          message: `failure ${i}`,
          file: `t${i}.ts`,
          line: i + 1,
        }),
      );
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
    const findings: Finding[] = [
      {
        kind: "line",
        severity: "error",
        file: "t.ts",
        line: 1,
        column: 1,
        message: "Expected:\n```ts\nconst x = 1;\n```\nReceived: undefined",
        suite: "scripts",
      },
    ];
    const suite: SuiteResult = {name: "scripts", totalTests: 1, passed: 0, failed: 1, skipped: 0, findings};
    const md = renderSuiteFailures(suite);
    expect(md).toMatch(/````+\s*\n.*Expected:.*\n.*```ts/s);
  });
  it("escapes HTML in test names to prevent tag injection", () => {
    const findings: Finding[] = [
      {
        kind: "line",
        severity: "error",
        file: "evil</details>.ts",
        line: 1,
        column: 1,
        message: "boom",
        suite: "scripts",
      },
    ];
    const suite: SuiteResult = {name: "scripts", totalTests: 1, passed: 0, failed: 1, skipped: 0, findings};
    const md = renderSuiteFailures(suite);
    expect(md).toContain("&lt;/details&gt;");
    expect(md).not.toMatch(/evil<\/details>\.ts/);
  });
});

describe("renderStatsDetails", () => {
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
    expect(renderStatsDetails(o)).toBeNull();
  });
  it("renders collapsed details with a GFM table when there are comparison findings", () => {
    const o = makeOutcome({
      providerId: "stats",
      findings: [comparison("a", 1000, 2000)],
    });
    const md = renderStatsDetails(o);

    expect(md).not.toBeNull();
    expect(md!).toMatch(/<details>/);
    expect(md!).not.toMatch(/<details open>/);
    expect(md!).toContain("Git-tracked folder size");
    expect(md!).toContain("| 📁 Folder | 🏠 Main | 🚀 PR head | ⚖️ Change | 📊 Relative |");
  });
  it("uses positive sign for size increases", () => {
    const o = makeOutcome({
      providerId: "stats",
      findings: [comparison("grew", 1000, 2024)],
    });
    expect(renderStatsDetails(o)!).toContain("📈 +1.0 KiB");
  });
  it("uses negative sign for size decreases", () => {
    const o = makeOutcome({
      providerId: "stats",
      findings: [comparison("shrunk", 2024, 1000)],
    });
    expect(renderStatsDetails(o)!).toContain("📉 -1.0 KiB");
  });
  it("escapes HTML in comparison names", () => {
    const o = makeOutcome({
      providerId: "stats",
      findings: [
        {
          kind: "comparison",
          severity: "info",
          name: "evil<script>name",
          baseValue: 1,
          headValue: 2,
          diff: 1,
          unit: "B",
          message: "",
        },
      ],
    });
    const md = renderStatsDetails(o)!;
    expect(md).toContain("evil&lt;script&gt;name");
  });
});

describe("renderProviderCard", () => {
  it("renders nothing for passed providers", () => {
    const o = makeOutcome({gateResult: "passed", providerName: "Prettier"});
    expect(renderProviderCard(o)).toBe("");
  });
  it("renders collapsed details for failed providers", () => {
    const o = makeOutcome({
      providerId: "lint",
      providerName: "ESLint",
      providerIcon: "🔍",
      gateResult: "failed",
      findings: [lineFinding({ruleId: "no-unused"})],
    });
    const md = renderProviderCard(o);

    expect(md).toMatch(/<details>/);
    expect(md).not.toMatch(/<details open>/);
    expect(md).toMatch(/<summary>🔍 ESLint · FAIL · 1 finding<\/summary>/);
  });
  it("renders collapsed details for errored providers", () => {
    const o = makeOutcome({
      providerId: "lint",
      providerName: "ESLint",
      providerIcon: "🔍",
      gateResult: "errored",
      error: {message: "runner blew up"},
    });
    const md = renderProviderCard(o);

    expect(md).toMatch(/<details>/);
    expect(md).not.toMatch(/<details open>/);
    expect(md).toMatch(/<summary>🔍 ESLint · ERROR · runner error<\/summary>/);
    expect(md).toMatch(/runner blew up/);
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
  it("includes suite status row + suite failures for test providers with 2+ suites", () => {
    const payload: TestSuitesPayload = {
      totalTests: 200,
      passed: 198,
      failed: 2,
      skipped: 0,
      suites: [
        {
          name: "scripts",
          totalTests: 100,
          passed: 98,
          failed: 2,
          skipped: 0,
          findings: [lineFinding({suite: "scripts", message: "boom"}), lineFinding({suite: "scripts", message: "bang"})],
        },
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
  it("includes header, scorecard, and footer", () => {
    const md = buildStepSummary(makeReport());

    expect(md).toMatch(/Hygiene Check/);
    expect(md).toMatch(/\| Check \| Result \| Signal \| Time \|/);
    expect(md).toMatch(/Hygiene v3/);
  });

  it("does not render details for passing providers", () => {
    const report = makeReport({
      outcomes: [makeOutcome({providerName: "Prettier", gateResult: "passed"})],
    });
    const md = buildStepSummary(report);

    expect(md).not.toMatch(/<details>/);
  });

  it("renders provider details before stats details", () => {
    const report = makeReport({
      outcomes: [
        makeOutcome({
          providerId: "lint",
          providerName: "ESLint",
          providerIcon: "🔍",
          gateResult: "failed",
          findings: [lineFinding({ruleId: "x"})],
        }),
        makeOutcome({
          providerId: "stats",
          providerName: "Statistics",
          providerIcon: "📊",
          findings: [{kind: "comparison", severity: "info", name: "bundle", baseValue: 1, headValue: 2, diff: 1, unit: "B", message: ""}],
        }),
      ],
    });
    const md = buildStepSummary(report);
    const providerIndex = md.indexOf("ESLint · FAIL");
    const statsIndex = md.indexOf("Git-tracked folder size");

    expect(providerIndex).toBeGreaterThanOrEqual(0);
    expect(statsIndex).toBeGreaterThanOrEqual(0);
    expect(providerIndex).toBeLessThan(statsIndex);
  });

  it("suppresses stats details when no comparison findings exist", () => {
    const report = makeReport({
      outcomes: [makeOutcome({providerId: "stats", findings: []})],
    });

    expect(buildStepSummary(report)).not.toMatch(/Git-tracked folder size/);
  });
});

describe("file changes and tracked footprint", () => {
  it("reports all 21 source changes independently of the single folder comparison", () => {
    const markdown = buildStepSummary(makeStatsReport());
    expect(markdown).toContain("**21 files** · 19 added · 2 modified · 0 deleted");
    expect(markdown).toContain("1 folder changed");
    expect(markdown).not.toContain("1 file changed");
    expect(markdown).toContain("+1,435 / −502 lines");
    expect(markdown).toContain("16");
    expect(markdown).toContain("webp");
    expect(markdown).toContain("5");
    expect(markdown).toContain("md");
    expect(markdown).toContain("| 🆕 Added | ✏️ Modified | 🗑️ Deleted | 🗂️ Total |");
    expect(markdown).toContain("| 19 | 2 | 0 | 21 |");
  });

  describe("infographic composition", () => {
    it("renders the verified run as a compact shared scorecard with collapsible details", () => {
      const report = makeStatsReport();
      const plan = {...evidencePlan(), mode: "affected" as const, changes: report.plan?.changes ?? evidencePlan().changes};
      const skippedPlan = evidencePlan(true);
      const stats = report.outcomes[0];
      if (!stats) throw new Error("Missing statistics fixture");
      const sample = makeReport({
        plan,
        outcomes: [
          {...evidenceOutcome(plan, "format"), durationMs: 891.120931},
          {...evidenceOutcome(skippedPlan, "lint"), skipReason: "No affected inputs for this provider"},
          {
            ...evidenceOutcome(plan, "test-typescript"),
            durationMs: 215292.873714,
            payload: {totalTests: 6001, passed: 5997, failed: 0, skipped: 4, suites: []},
          },
          evidenceOutcome(skippedPlan, "test-dotnet"),
          evidenceOutcome(skippedPlan, "test-python"),
          {...stats, durationMs: 305.10104},
        ],
      });
      const markdown = buildStepSummary(sample);
      expect(markdown).toContain("| ✅ Executed checks | ⏭️ Skipped checks | 🚦 Diagnostics | ⏱️ Provider time |");
      expect(markdown).toContain("3 passed");
      expect(markdown).toContain("3 skipped");
      expect(markdown).toContain("3m36s");
      expect(markdown).toContain("**5,997 passed** · 4 tests skipped");
      expect(markdown).toContain("1 informational measurement");
      expect(markdown).toContain("Scope **affected**");
      expect(markdown).toContain(`Plan \`${plan.id.slice(0, 12)}\``);
      expect(markdown).toContain(`${sample.workflowRunUrl}#artifacts`);
      expect(markdown).not.toMatch(/planned skip|Selection plan|Bundle stats|\n{4,}|<details open>/);
      expect(markdown.indexOf("Check results")).toBeLessThan(markdown.indexOf("Change breakdown"));
      expect(markdown.indexOf("Change breakdown")).toBeLessThan(markdown.indexOf("Git-tracked folder size"));
    });

    it("retains reused evidence and bounded verification errors without a selection dump", () => {
      const plan = evidencePlan();
      const report = makeReport({
        plan,
        workflowRunAttempt: 2,
        outcomes: [evidenceOutcome(plan, "lint")],
        evidenceIssues: Array.from({length: 51}, (_, index) => ({code: `issue-${index}`, message: "Bad <evidence>", providerId: "lint"})),
      });
      const markdown = buildStepSummary(report);
      expect(markdown).toContain("Reused `lint` from compatible attempt 1");
      expect(markdown).toContain("Evidence verification issues");
      expect(markdown).toContain("issue-49");
      expect(markdown).not.toContain("issue-50");
      expect(markdown).toContain("1 more issue(s)");
      expect(markdown).toContain("Bad &lt;evidence&gt;");
      expect(markdown).not.toContain("Selection plan");
    });

    it("retains explicit full-scope selection without hiding it as a no-change skip", () => {
      const plan = {...evidencePlan(), mode: "full" as const, diagnostics: [{code: "full-requested", message: "Explicit full request"}]};
      const markdown = buildStepSummary(makeReport({plan}));
      expect(markdown).toContain("Scope **full**");
      expect(markdown).toContain("Full validation was explicitly requested.");
      expect(markdown).not.toContain("Skipped —");
    });
  });

  it("shows exact main-based bytes without making a production bundle claim", () => {
    const markdown = buildStepSummary(makeStatsReport());
    expect(markdown).toContain("+992.1 KiB");
    expect(markdown).toContain("18,398,102");
    expect(markdown).toContain("19,414,019");
    expect(markdown).toContain("+1,015,917 B");
    expect(markdown).toContain("+5.5%");
    expect(markdown).toContain("vs `main`");
    expect(markdown).toContain("not a production bundle");
    expect(markdown).toContain("documentation and screenshots");
    expect(markdown).not.toContain("bundle.sites");
  });

  it("counts rename and other statuses once each rather than counting both paths", () => {
    const markdown = buildStepSummary(
      makeStatsReport({
        scope: "known",
        baseSha: "b".repeat(40),
        headSha: "a".repeat(40),
        entries: [
          {kind: "added", path: "new.ts"},
          {kind: "modified", path: "changed.ts"},
          {kind: "deleted", path: "old.ts"},
          {kind: "renamed", path: "renamed.ts", previousPath: "before.ts"},
          {kind: "copied", path: "copy.ts", previousPath: "original.ts"},
          {kind: "type-changed", path: "link"},
          {kind: "unmerged", path: "conflict.ts"},
        ],
      }),
    );
    expect(markdown).toContain("**7 files** · 1 added · 1 modified · 1 deleted · 1 renamed · 1 copied · 1 type-changed · 1 unmerged");
    expect(markdown).not.toContain("21 files");
  });

  it("distinguishes unknown and legacy breakdowns from known empty changes", () => {
    const report = makeStatsReport({scope: "unknown", reason: "Git unavailable"});
    expect(renderScorecard(report)).toContain("21 files");
    expect(renderScorecard(report)).toContain("status breakdown unavailable");
    expect(renderScorecard(report)).not.toContain("0 deleted");
    const {plan: _plan, ...legacy} = report;
    expect(renderScorecard(legacy)).toContain("status breakdown unavailable");
    const empty = makeStatsReport({scope: "known", baseSha: "b".repeat(40), headSha: "a".repeat(40), entries: []});
    expect(renderScorecard(empty)).toContain("**0 files** · 0 added · 0 modified · 0 deleted");
  });

  it("sums offsetting folder changes without claiming there were no folder changes", () => {
    const report = makeStatsReport(undefined, [
      {folder: "sites/a", mainTotal: 1000, headTotal: 2024},
      {folder: "sites/b", mainTotal: 2024, headTotal: 1000},
    ]);
    expect(renderScorecard(report)).toContain("net = 0 B");
    expect(renderScorecard(report)).toContain("2 folders changed");
    const markdown = buildStepSummary(report);
    expect(markdown).toContain("📈 +1.0 KiB");
    expect(markdown).toContain("📉 -1.0 KiB");
  });

  it("distinguishes no measurements from unchanged measured folders", () => {
    expect(renderScorecard(makeStatsReport(undefined, []))).toContain("No tracked-folder measurements");
    const report = makeStatsReport(undefined, [{folder: "sites/a", mainTotal: 10, headTotal: 10}]);
    expect(renderScorecard(report)).toContain("0 folders changed");
    const markdown = buildStepSummary(report);
    expect(markdown).toContain("↔️ 0 B");
    expect(markdown).toContain("| 0% |");
  });

  it("handles positive growth from zero and zero-to-zero without infinite percentages", () => {
    const report = makeStatsReport(undefined, [
      {folder: "sites/new", mainTotal: 0, headTotal: 100},
      {folder: "sites/empty", mainTotal: 0, headTotal: 0},
    ]);
    const markdown = buildStepSummary(report);
    expect(markdown).toContain("| new |");
    expect(markdown).toContain("| 0% |");
    expect(markdown).not.toMatch(/Infinity|NaN/);
  });

  it("escapes file-type and folder evidence and rejects malformed non-null stats payloads", () => {
    const report = makeStatsReport(undefined, [{folder: "sites/a|b\n<script>", mainTotal: 10, headTotal: 20}]);
    expect(buildStepSummary(report)).toContain("sites/a\\|b<br>&lt;script&gt;");
    expect(() => buildStepSummary(makeReport({outcomes: [makeOutcome({providerId: "stats", payload: {filesChanged: "21"}})]}))).toThrow();
  });
});
