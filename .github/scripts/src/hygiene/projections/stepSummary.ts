/**
 * @fileoverview Step Summary projection — builds the GitHub PR comment.
 * @module github/scripts/src/hygiene/projections/stepSummary
 *
 * @remarks
 * Minimal scorecard redesign (2026-05-31). The comment is composed from
 * GitHub-safe markdown only: verdict header, one provider scorecard, collapsed
 * provider details for failures/errors, optional collapsed stats details, and a
 * compact footer.
 */

import * as core from "@actions/core";
import {CommentBuilder} from "../../../helpers/comments/index.ts";
import {isComparisonFinding} from "../domain/types.ts";
import {
  type Finding,
  type GateResult,
  type HygieneReport,
  type ProviderOutcome,
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
// Keep this list aligned with providers/registry.ts. The projection duplicates
// the order intentionally so rendering stays independent from provider modules.
const PROVIDER_ORDER: readonly string[] = ["format", "lint", "test-typescript", "test-dotnet", "test-python", "stats"];

// GitHub strips unsupported HTML but still renders supported tags. Escape every
// dynamic value before interpolating it into markdown tables or details blocks.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Provider metadata is registry-owned today, but this helper defines the output
// boundary so future dynamic provider labels remain safe by default.
function providerLabel(outcome: ProviderOutcome<unknown>): string {
  return `${escapeHtml(outcome.providerIcon)} ${escapeHtml(outcome.providerName)}`;
}

// Error messages may contain triple-backtick snippets. Use a longer fence so
// the message cannot break out of the details block.
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

// MetricFindings are internal measurements, not actionable hygiene issues.
// Keep them out of user-facing counts so every displayed count has a body path.
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

/**
 * Formats a byte count for compact display in GitHub markdown tables.
 *
 * @param bytes - The signed byte count to format.
 * @returns A human-readable byte, kilobyte, or megabyte string preserving sign.
 */
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

interface ReportTotals {
  readonly visibleFindings: readonly Finding[];
  readonly passed: number;
  readonly failed: number;
  readonly errored: number;
  readonly durationMs: number;
}

function collectReportTotals(report: HygieneReport): ReportTotals {
  let visible: Finding[] = [];
  let passed = 0;
  let failed = 0;
  let errored = 0;
  let durationMs = 0;

  for (const outcome of report.outcomes) {
    visible = visible.concat(visibleFindings(outcome.findings));
    durationMs += outcome.durationMs;
    if (outcome.gateResult === "passed") passed++;
    else if (outcome.gateResult === "failed") failed++;
    else if (outcome.gateResult === "errored") errored++;
  }

  return {visibleFindings: visible, passed, failed, errored, durationMs};
}

function topRule(findings: readonly Finding[]): string | null {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    const ruleId = finding.kind === "line" || finding.kind === "file" ? finding.ruleId : undefined;
    if (ruleId) counts.set(ruleId, (counts.get(ruleId) ?? 0) + 1);
  }

  const first = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return first?.[0] ?? null;
}

/**
 * Converts runner-local or Windows workspace paths to repository-relative paths.
 *
 * @param file - A raw file path emitted by a provider or test runner.
 * @returns A normalized path suitable for PR comments and details blocks.
 */
export function normalizePath(file: string): string {
  const runnerMatch = file.match(/^\/home\/runner\/work\/[^/]+\/[^/]+\/(.*)$/);
  if (runnerMatch?.[1]) return runnerMatch[1];
  const wsMatch = file.match(/^(?:[A-Za-z]:)?[\\/](?:.*?[\\/])?(arolariu\.ro)[\\/](.*)$/);
  if (wsMatch?.[2]) return wsMatch[2].replace(/\\/g, "/");
  return file;
}

/**
 * Removes noisy terminal formatting and stack frames from provider messages.
 *
 * @param msg - The raw provider, linter, or test-runner message.
 * @returns A trimmed message capped to the renderer's maximum summary length.
 */
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

/**
 * Classifies a provider id into the renderer category that controls detail output.
 *
 * @param id - The provider id from a hygiene outcome.
 * @returns The renderer category used for lint, test, or stats presentation.
 */
export function classifyProvider(id: string): ProviderCategory {
  if (id === "stats") return "stats";
  if (id.startsWith("test-")) return "test";
  return "lint";
}

/**
 * Renders the compact verdict header for the hygiene comment.
 *
 * @param report - The aggregate hygiene report.
 * @returns GitHub-flavored markdown containing verdict, counts, duration, commit, and run link.
 */
export function renderHeader(report: HygieneReport): string {
  const totals = collectReportTotals(report);
  const {errors, warnings, infos} = countBySeverity(totals.visibleFindings);
  const total = report.outcomes.length;

  const lines: string[] = [];
  lines.push(`## 🩺 Hygiene Check — ${resultVerdict(report.overallResult)}`);
  lines.push("");
  lines.push(
    `> **${totals.passed}/${total} providers passed** · **${totals.visibleFindings.length} findings** · ` +
      `${errors} errors · ${warnings} warnings · ${infos} info · ${formatDurationMs(totals.durationMs)}`,
  );
  lines.push(`> Commit \`${report.commitSha.substring(0, 7)}\` · [view run](${report.workflowRunUrl})`);
  return lines.join("\n");
}

function comparisonDiffLabel(finding: Finding): string {
  if (finding.kind !== "comparison") return "= 0";

  const absDiff = finding.unit === "B"
    ? formatHumanBytes(Math.abs(finding.diff))
    : `${Math.abs(finding.diff)}${finding.unit ?? ""}`;

  if (finding.diff > 0) return `▲ +${absDiff}`;
  if (finding.diff < 0) return `▼ -${absDiff}`;
  return "= 0";
}

function statsSignal(outcome: ProviderOutcome<unknown>): string {
  const comparisons = outcome.findings.filter(isComparisonFinding);
  if (comparisons.length === 0) return "no bundle changes";

  const largest = comparisons
    .slice()
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))[0];
  const changed = `${comparisons.length} file${comparisons.length === 1 ? "" : "s"} changed`;
  return largest ? `${changed} · ${comparisonDiffLabel(largest)}` : changed;
}

function testSignal(outcome: ProviderOutcome<unknown>): string | null {
  const payload = outcome.payload as TestSuitesPayloadLike | null;
  if (!payload) return null;

  if (payload.failed > 0) return `**${payload.failed} failed** of ${payload.totalTests}`;
  return `${payload.passed} passed`;
}

function providerSignal(outcome: ProviderOutcome<unknown>): string {
  if (outcome.gateResult === "errored") return "runner error";

  const category = classifyProvider(outcome.providerId);
  if (category === "stats") return statsSignal(outcome);

  if (category === "test") {
    const signal = testSignal(outcome);
    if (signal) return signal;
  }

  const visible = visibleFindings(outcome.findings);
  if (visible.length === 0) return "clean";

  const rule = topRule(visible);
  const count = `**${visible.length} finding${visible.length === 1 ? "" : "s"}**`;
  return rule ? `${count} · top: \`${escapeHtml(rule)}\`` : count;
}

function providerSortIndex(providerId: string): number {
  const index = PROVIDER_ORDER.indexOf(providerId);
  return index === -1 ? PROVIDER_ORDER.length : index;
}

/**
 * Renders the provider scorecard table in canonical provider order.
 *
 * @param report - The aggregate hygiene report whose outcomes should be displayed.
 * @returns A GitHub-flavored markdown table with check, result, signal, and duration columns.
 *
 * @remarks
 * Provider order is intentionally normalized here because outcome artifacts may
 * be read from the filesystem in a non-registry order.
 */
export function renderScorecard(report: HygieneReport): string {
  const header = `| Check | Result | Signal | Time |\n|---|:---:|---|---:|`;
  const rows = report.outcomes
    .slice()
    .sort((a, b) => providerSortIndex(a.providerId) - providerSortIndex(b.providerId))
    .map((outcome) => {
      return `| ${providerLabel(outcome)} | ${resultEmoji(outcome.gateResult)} ${resultPill(outcome.gateResult)} | ${providerSignal(outcome)} | ${formatDurationMs(outcome.durationMs)} |`;
    });
  return [header, ...rows].join("\n");
}

/**
 * Renders the most frequent lint rule ids for a provider.
 *
 * @param findings - Provider findings to group by rule id.
 * @param limit - Maximum number of rule rows to include.
 * @returns A markdown table, or an empty string when no rule ids are present.
 */
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

/**
 * Renders a compact status-token row for multi-suite test providers.
 *
 * @param suites - Test suites from a provider payload.
 * @returns Inline markdown tokens ordered with failing suites first, or an empty string for single-suite providers.
 */
export function renderSuiteStatusRow(suites: readonly SuiteResultLike[]): string {
  if (suites.length < 2) return "";

  const failed = suites.filter((s) => s.failed > 0).slice().sort((a, b) => a.name.localeCompare(b.name));
  const passed = suites.filter((s) => s.failed === 0).slice().sort((a, b) => a.name.localeCompare(b.name));

  const statusTokens: string[] = [];
  for (const s of failed) {
    statusTokens.push(`❌ **${escapeHtml(s.name)}**`);
  }
  for (const s of passed) {
    statusTokens.push(`✅ ${escapeHtml(s.name)}`);
  }
  return statusTokens.join(" · ");
}

/**
 * Renders collapsed failure details for one failing test suite.
 *
 * @param suite - The suite whose failing findings should be displayed.
 * @returns Markdown containing capped failure entries, or an empty string when the suite passed.
 */
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
    lines.push(summary);
    lines.push(`<details><summary>error</summary>`);
    lines.push("");
    lines.push(fenceSafe(errMsg));
    lines.push("</details>");
    lines.push("");
  }

  if (failingFindings.length > shown.length) {
    const more = failingFindings.length - shown.length;
    lines.push(`_+ ${more} more failing tests — see artifact_`);
  }

  return lines.join("\n");
}

/**
 * Renders collapsed bundle comparison details for the stats provider.
 *
 * @param o - The stats provider outcome.
 * @returns Collapsed GitHub markdown details, or null when there are no comparison findings.
 */
export function renderStatsDetails(o: ProviderOutcome<unknown>): string | null {
  const comparisons = o.findings.filter(isComparisonFinding);
  if (comparisons.length === 0) return null;

  const rows = comparisons.map((f) => {
    const before = f.unit === "B" ? formatHumanBytes(f.baseValue) : `${f.baseValue}${f.unit ?? ""}`;
    const after = f.unit === "B" ? formatHumanBytes(f.headValue) : `${f.headValue}${f.unit ?? ""}`;
    return `| \`${escapeHtml(f.name)}\` | ${before} | ${after} | ${comparisonDiffLabel(f)} |`;
  });

  return [
    `<details>`,
    `<summary>📦 Bundle stats · ${comparisons.length} file${comparisons.length === 1 ? "" : "s"} changed</summary>`,
    ``,
    `| File | Before | After | Diff |`,
    `|---|---:|---:|---:|`,
    ...rows,
    `</details>`,
  ].join("\n");
}

function providerDetailsSummary(o: ProviderOutcome<unknown>): string {
  if (o.gateResult === "errored") {
    return `${providerLabel(o)} · ${resultPill(o.gateResult)} · runner error`;
  }

  const visible = visibleFindings(o.findings);
  const findingLabel = `${visible.length} finding${visible.length === 1 ? "" : "s"}`;
  return `${providerLabel(o)} · ${resultPill(o.gateResult)} · ${findingLabel}`;
}

/**
 * Renders collapsed details for a failed or errored provider.
 *
 * @param o - The provider outcome to render.
 * @returns Collapsed details markdown, or an empty string for passing/advisory providers.
 */
export function renderProviderCard(o: ProviderOutcome<unknown>): string {
  if (o.gateResult === "passed" || o.gateResult === "advisory") return "";

  const category = classifyProvider(o.providerId);
  const lines: string[] = [];

  lines.push(`<details>`);
  lines.push(`<summary>${providerDetailsSummary(o)}</summary>`);
  lines.push("");

  if (o.gateResult === "failed" && o.findings.length > 0) {
    const visible = visibleFindings(o.findings);
    const {errors, warnings} = countBySeverity(visible);
    const pills: string[] = [`\`${visible.length} findings\``];
    if (errors > 0) pills.push(`\`${errors} 🔴\``);
    if (warnings > 0) pills.push(`\`${warnings} 🟡\``);
    lines.push(pills.join(" "));
    lines.push("");
  }

  if (o.gateResult === "errored") {
    lines.push(fenceSafe(cleanMessage(o.error?.message ?? "Unknown runner error")));
    lines.push("</details>");
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
    lines.push("_Full findings list in the workflow artifact._");
  } else if (category === "test") {
    const payload = o.payload as TestSuitesPayloadLike | null;
    if (payload?.suites && payload.suites.length > 0) {
      const statusRow = renderSuiteStatusRow(payload.suites);
      if (statusRow.length > 0) {
        lines.push(statusRow);
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
  }

  lines.push("</details>");
  return lines.join("\n");
}

/**
 * Renders the hygiene automation footer.
 *
 * @param report - The aggregate hygiene report containing the workflow run URL.
 * @returns A compact markdown attribution line.
 */
export function renderFooter(report: HygieneReport): string {
  return `_🤖 Hygiene v3 · [workflow run](${report.workflowRunUrl})_`;
}

/**
 * Builds the full hygiene PR comment/step summary markdown.
 *
 * @param report - The aggregate hygiene report to project into markdown.
 * @returns The complete GitHub-safe hygiene summary.
 */
export function buildStepSummary(report: HygieneReport): string {
  const cb = new CommentBuilder();

  cb.addRaw(renderHeader(report));
  cb.addRaw("\n\n");
  cb.addRaw(renderScorecard(report));
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
    const details = renderStatsDetails(stats);
    if (details !== null) {
      cb.addRaw(details);
      cb.addRaw("\n\n");
    }
  }

  cb.addRaw(renderFooter(report));
  return cb.build();
}

/**
 * Writes the hygiene summary to the GitHub Actions step summary.
 *
 * @param report - The aggregate hygiene report to render and write.
 * @returns A promise that resolves when the summary has been written.
 */
export async function writeStepSummary(report: HygieneReport): Promise<void> {
  const md = buildStepSummary(report);
  await core.summary.addRaw(md).write();
}
