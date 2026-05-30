/**
 * @fileoverview Step Summary projection — builds the GitHub PR comment.
 * @module github/scripts/src/hygiene/projections/stepSummary
 *
 * @remarks
 * Failure-focused redesign (2026-05-30). The comment is composed top-to-bottom
 * by render helpers; each is a pure function returning a markdown string.
 *
 * Reading order: header → KPI cards → overview table → per-provider failure
 * cards (in registry order; passing providers omitted) → stats info-callout
 * (only when non-zero changes) → footer.
 */

import * as core from "@actions/core";
import {CommentBuilder} from "../../../helpers/comments/index.ts";
import {
  type Finding,
  type GateResult,
  type HygieneReport,
  type ProviderOutcome,
  type Severity,
} from "../domain/types.ts";

// Structural redeclaration of SuiteResult / TestSuitesPayload (the real types
// live in providers/_testHelpers.ts; importing from there would create a
// projection→providers dependency we want to avoid).
interface SuiteResultLike {
  readonly name: string;
  readonly totalTests: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly durationMs?: number;
  readonly findings: readonly Finding[];
}

interface TestSuitesPayloadLike {
  readonly totalTests: number;
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly suites: readonly SuiteResultLike[];
}

const TOP_RULES_LIMIT = 5;
const MAX_FAILING_TESTS_PER_SUITE = 10;
const MAX_MESSAGE_LENGTH = 240;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fenceSafe(content: string): string {
  let maxRun = 0;
  const matches = content.match(/`+/g);
  if (matches) {
    for (const m of matches) {
      if (m.length > maxRun) maxRun = m.length;
    }
  }
  const fence = "`".repeat(Math.max(3, maxRun + 1));
  return `${fence}\n${content}\n${fence}`;
}

function severityIcon(s: Severity): string {
  switch (s) {
    case "critical": return "🟥";
    case "error": return "🔴";
    case "warning": return "🟡";
    case "notice": return "🔵";
    case "info": return "⚪";
  }
}
// Suppress unused-locals; this helper is retained for future use by the
// per-finding rendering path and the test suite does not exercise it.
void severityIcon;

function resultVerdict(r: GateResult): string {
  switch (r) {
    case "passed": return "✅ Passed";
    case "advisory": return "ℹ️ Advisory";
    case "failed": return "❌ Failed";
    case "errored": return "💥 Errored";
  }
}

function resultPill(r: GateResult): string {
  switch (r) {
    case "passed": return "PASS";
    case "advisory": return "ADVISORY";
    case "failed": return "FAIL";
    case "errored": return "ERROR";
  }
}

function resultEmoji(r: GateResult): string {
  switch (r) {
    case "passed": return "✅";
    case "advisory": return "ℹ️";
    case "failed": return "❌";
    case "errored": return "💥";
  }
}

// MetricFindings are internal statistics (e.g. churn), not actionable code
// quality issues. Exclude them from all user-facing findings counts so the
// comment doesn't show phantom findings with no corresponding body section.
function visibleFindings(findings: readonly Finding[]): readonly Finding[] {
  return findings.filter((f) => f.kind !== "metric");
}

function formatDurationMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m${s.toString().padStart(2, "0")}s`;
}

export function formatHumanBytes(bytes: number): string {
  const sign = bytes < 0 ? "-" : "";
  const abs = Math.abs(bytes);
  if (abs < 1024) return `${sign}${abs} B`;
  if (abs < 1024 * 1024) return `${sign}${(abs / 1024).toFixed(1)} KB`;
  return `${sign}${(abs / (1024 * 1024)).toFixed(1)} MB`;
}

function countBySeverity(findings: readonly Finding[]): {errors: number; warnings: number; infos: number} {
  let errors = 0, warnings = 0, infos = 0;
  for (const f of findings) {
    if (f.severity === "error" || f.severity === "critical") errors++;
    else if (f.severity === "warning") warnings++;
    else infos++;
  }
  return {errors, warnings, infos};
}

export function normalizePath(file: string): string {
  const runnerMatch = file.match(/^\/home\/runner\/work\/[^/]+\/[^/]+\/(.*)$/);
  if (runnerMatch?.[1]) return runnerMatch[1];
  const wsMatch = file.match(/^(?:[A-Za-z]:)?[\\/](?:.*?[\\/])?(arolariu\.ro)[\\/](.*)$/);
  if (wsMatch?.[2]) return wsMatch[2].replace(/\\/g, "/");
  return file;
}

export function cleanMessage(msg: string): string {
  let cleaned = msg.replace(/\u001b\[[0-9;]*m/g, "");
  cleaned = cleaned
    .split("\n")
    .filter((line) => !/^\s*at\s+(file:\/\/\/.*node_modules|\/.*node_modules)/.test(line))
    .join("\n")
    .trim();
  if (cleaned.length > MAX_MESSAGE_LENGTH) {
    cleaned = cleaned.substring(0, MAX_MESSAGE_LENGTH - 1).trimEnd() + "…";
  }
  return cleaned;
}

export type ProviderCategory = "lint" | "test" | "stats";

export function classifyProvider(id: string): ProviderCategory {
  if (id === "stats") return "stats";
  if (id.startsWith("test-")) return "test";
  return "lint";
}

export function renderHeader(report: HygieneReport): string {
  const passed = report.outcomes.filter((o) => o.gateResult === "passed").length;
  const failed = report.outcomes.filter((o) => o.gateResult === "failed").length;
  const errored = report.outcomes.filter((o) => o.gateResult === "errored").length;
  const total = report.outcomes.length;

  let allFindings: Finding[] = [];
  for (const o of report.outcomes) allFindings = allFindings.concat(visibleFindings(o.findings) as Finding[]);
  const {errors, warnings, infos} = countBySeverity(allFindings);

  const lines: string[] = [];
  lines.push(`## 🩺 Hygiene Check`);
  lines.push("");
  const verdictParts: string[] = [`**${resultVerdict(report.overallResult)}**`, `${passed} of ${total} providers passed`];
  if (failed > 0) verdictParts.push(`${failed} failed`);
  if (errored > 0) verdictParts.push(`${errored} errored`);
  lines.push(`> ${verdictParts.join(" · ")}`);
  lines.push(`> ${allFindings.length} findings — ${errors} errors · ${warnings} warnings · ${infos} info`);
  lines.push(`> Commit \`${report.commitSha.substring(0, 7)}\` · [view run](${report.workflowRunUrl})`);
  return lines.join("\n");
}

export function renderKpiCards(report: HygieneReport): string {
  let allFindings: Finding[] = [];
  let totalDuration = 0;
  for (const o of report.outcomes) {
    allFindings = allFindings.concat(visibleFindings(o.findings) as Finding[]);
    totalDuration += o.durationMs;
  }
  const {errors, warnings} = countBySeverity(allFindings);

  const findingsColor = "#57606a";
  const errorsColor = errors > 0 ? "#cf222e" : "#57606a";
  const warningsColor = warnings > 0 ? "#9a6700" : "#57606a";
  const timeColor = "#57606a";

  function card(num: string, label: string, color: string): string {
    return [
      `<div style="flex:1;min-width:130px;padding:10px 12px;background:#f6f8fa;border:1px solid #d8dee4;border-radius:6px;text-align:center;">`,
      `<div style="font-size:22px;font-weight:700;line-height:1;margin-bottom:3px;font-variant-numeric:tabular-nums;color:${color};">${num}</div>`,
      `<div style="font-size:10.5px;color:#57606a;text-transform:uppercase;letter-spacing:0.4px;">${label}</div>`,
      `</div>`,
    ].join("");
  }

  return [
    `<div style="display:flex;gap:10px;margin:10px 0 14px;flex-wrap:wrap;">`,
    card(String(allFindings.length), "Findings", findingsColor),
    card(String(errors), "Errors", errorsColor),
    card(String(warnings), "Warnings", warningsColor),
    card(formatDurationMs(totalDuration), "Wall time", timeColor),
    `</div>`,
  ].join("");
}

export function renderOverviewTable(report: HygieneReport): string {
  const header = `| Provider | Status | Findings | Time |\n|---|:---:|---:|---:|`;
  const rows = report.outcomes.map((o) => {
    const visible = visibleFindings(o.findings);
    const findingsCell = visible.length === 0 ? "—" : `**${visible.length}**`;
    return `| ${o.providerIcon} ${o.providerName} | ${resultEmoji(o.gateResult)} | ${findingsCell} | ${formatDurationMs(o.durationMs)} |`;
  });
  return [header, ...rows].join("\n");
}

export function renderRulesTable(findings: readonly Finding[], limit: number): string {
  const counts = new Map<string, number>();
  for (const f of findings) {
    const ruleId = (f.kind === "line" || f.kind === "file") ? f.ruleId : undefined;
    if (!ruleId) continue;
    counts.set(ruleId, (counts.get(ruleId) ?? 0) + 1);
  }
  if (counts.size === 0) return "";

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  const header = `| Rule | Count |\n|---|---:|`;
  const rows = sorted.map(([rule, count]) => `| \`${rule}\` | ${count} |`);
  return [header, ...rows].join("\n");
}

export function renderSuiteChipRow(suites: readonly SuiteResultLike[]): string {
  if (suites.length < 2) return "";

  const failed = suites.filter((s) => s.failed > 0).slice().sort((a, b) => a.name.localeCompare(b.name));
  const passed = suites.filter((s) => s.failed === 0).slice().sort((a, b) => a.name.localeCompare(b.name));

  const chips: string[] = [];
  for (const s of failed) {
    chips.push(
      `<span style="background:#ffebe9;border:1px solid #ffcecb;color:#cf222e;font-weight:600;padding:1px 7px;border-radius:10px;font-size:11px;">❌ ${escapeHtml(s.name)}</span>`,
    );
  }
  for (const s of passed) {
    chips.push(
      `<span style="background:#f6f8fa;border:1px solid #d8dee4;color:#1a7f37;padding:1px 7px;border-radius:10px;font-size:11px;">✅ ${escapeHtml(s.name)}</span>`,
    );
  }
  return `<div style="display:inline-flex;gap:4px;margin:4px 0 8px;flex-wrap:wrap;">${chips.join("")}</div>`;
}

export function renderSuiteFailures(suite: SuiteResultLike): string {
  if (suite.failed === 0) return "";

  const lines: string[] = [];
  lines.push(`#### \`${suite.name}\` · ${suite.failed} failed of ${suite.totalTests}`);
  lines.push("");

  const failingFindings = suite.findings.filter(
    (f) => (f.severity === "error" || f.severity === "critical"),
  );
  const shown = failingFindings.slice(0, MAX_FAILING_TESTS_PER_SUITE);

  for (const f of shown) {
    let testName = "(unknown test)";
    if (f.kind === "line") {
      testName = `${normalizePath(f.file)}:${f.line}`;
    } else if (f.kind === "file") {
      testName = normalizePath(f.file);
    }
    const summary = `❌ \`${escapeHtml(testName)}\``;
    const errMsg = "message" in f ? cleanMessage(f.message) : "(no message)";
    lines.push(`<div>${summary}`);
    lines.push(`<details><summary>error</summary>`);
    lines.push("");
    lines.push(fenceSafe(errMsg));
    lines.push("</details></div>");
    lines.push("");
  }

  if (failingFindings.length > shown.length) {
    const more = failingFindings.length - shown.length;
    lines.push(`_+ ${more} more failing tests — see artifact_`);
  }

  return lines.join("\n");
}

export function renderStatsCallout(o: ProviderOutcome<unknown>): string | null {
  const comparisons = o.findings.filter((f) => f.kind === "comparison");
  if (comparisons.length === 0) return null;

  const rows = comparisons.map((f) => {
    if (f.kind !== "comparison") return "";
    const before = f.unit === "B" ? formatHumanBytes(f.baseValue) : `${f.baseValue}${f.unit ?? ""}`;
    const after = f.unit === "B" ? formatHumanBytes(f.headValue) : `${f.headValue}${f.unit ?? ""}`;
    const diff = f.unit === "B" ? formatHumanBytes(f.diff) : `${f.diff >= 0 ? "+" : ""}${f.diff}${f.unit ?? ""}`;
    const signed = f.diff >= 0 && f.unit === "B" ? `+${diff}` : diff;
    const color = f.diff > 0 ? "#cf222e" : "#1a7f37";
    return `<tr><td><code>${escapeHtml(f.name)}</code></td><td align="right">${before}</td><td align="right">${after}</td><td align="right" style="color:${color};">${signed}</td></tr>`;
  });

  return [
    `<div style="background:#ddf4ff;border:1px solid #54aeff66;border-radius:6px;padding:10px 14px;margin:10px 0;">`,
    `<strong style="color:#0550ae;">📊 Bundle stats</strong> — ${comparisons.length} file${comparisons.length === 1 ? "" : "s"} changed`,
    `<table>`,
    `<tr><th>File</th><th align="right">Before</th><th align="right">After</th><th align="right">Diff</th></tr>`,
    ...rows,
    `</table>`,
    `</div>`,
  ].join("");
}

export function renderProviderCard(o: ProviderOutcome<unknown>): string {
  if (o.gateResult === "passed" || o.gateResult === "advisory") return "";

  const category = classifyProvider(o.providerId);
  const lines: string[] = [];

  lines.push(`## ${o.providerIcon} ${o.providerName} \`${resultPill(o.gateResult)}\``);
  lines.push("");

  if (o.gateResult === "failed" && o.findings.length > 0) {
    const {errors, warnings} = countBySeverity(o.findings);
    const pills: string[] = [`\`${o.findings.length} findings\``];
    if (errors > 0) pills.push(`\`${errors} 🔴\``);
    if (warnings > 0) pills.push(`\`${warnings} 🟡\``);
    lines.push(pills.join(" "));
    lines.push("");
  }

  if (o.gateResult === "errored") {
    lines.push(fenceSafe(cleanMessage(o.error?.message ?? "Unknown runner error")));
    return lines.join("\n");
  }

  if (category === "lint") {
    const rules = renderRulesTable(o.findings, TOP_RULES_LIMIT);
    if (rules.length > 0) {
      lines.push("#### Top rules");
      lines.push("");
      lines.push(rules);
      lines.push("");
    }
    lines.push("_Full findings list in the [workflow artifact](#)._");
  } else if (category === "test") {
    const payload = o.payload as TestSuitesPayloadLike | null;
    if (payload?.suites && payload.suites.length > 0) {
      const chips = renderSuiteChipRow(payload.suites);
      if (chips.length > 0) {
        lines.push(chips);
        lines.push("");
      }
      for (const suite of payload.suites) {
        if (suite.failed > 0) {
          lines.push(renderSuiteFailures(suite));
          lines.push("");
        }
      }
    } else {
      lines.push("_No suite payload available._");
    }
  } else {
    const hasComparisons = o.findings.some((f) => f.kind === "comparison");
    if (hasComparisons) {
      lines.push("_See bundle stats below._");
    } else {
      lines.push("_No bundle changes detected._");
    }
  }

  return lines.join("\n");
}

export function renderFooter(report: HygieneReport): string {
  return `_🤖 Hygiene v3 · [workflow run](${report.workflowRunUrl})_`;
}

export function buildStepSummary(report: HygieneReport): string {
  const cb = new CommentBuilder();

  cb.addRaw(renderHeader(report));
  cb.addRaw("\n\n");
  cb.addRaw(renderKpiCards(report));
  cb.addRaw("\n\n");
  cb.addHeading("Provider Overview", 3);
  cb.addRaw(renderOverviewTable(report));
  cb.addRaw("\n\n");

  for (const o of report.outcomes) {
    const card = renderProviderCard(o);
    if (card.length > 0) {
      cb.addRaw(card);
      cb.addRaw("\n\n");
    }
  }

  const stats = report.outcomes.find((o) => o.providerId === "stats");
  if (stats) {
    const callout = renderStatsCallout(stats);
    if (callout !== null) {
      cb.addRaw(callout);
      cb.addRaw("\n\n");
    }
  }

  cb.addRaw(renderFooter(report));
  return cb.build();
}

export async function writeStepSummary(report: HygieneReport): Promise<void> {
  const md = buildStepSummary(report);
  await core.summary.addRaw(md).write();
}
