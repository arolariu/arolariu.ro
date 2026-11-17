/**
 * @fileoverview Step Summary projection — builds the GitHub PR comment.
 * @module github/scripts/src/hygiene/projections/stepSummary
 *
 * @remarks
 * GitHub-native overview and scorecard shared by PR comments and step summaries.
 * Execution states, source changes, and tracked-folder measurements are separate;
 * detailed evidence is collapsed without hiding actionable verification errors.
 */

import * as core from "../../../helpers/sdk/core.ts";
import {CommentBuilder, MarkdownUtils} from "../../../helpers/comments/index.ts";
import type {SuiteResult as SuiteResultLike, TestSuitesPayload as TestSuitesPayloadLike} from "../../../lib/testing/suites.ts";
import {isComparisonFinding} from "../domain/types.ts";
import {type Finding, type GateResult, type HygieneReport, type ProviderOutcome} from "../domain/types.ts";
import {PROVIDER_ERROR_MESSAGE_LIMIT} from "../../../lib/hygiene/contracts.ts";
import {redactEvidenceText} from "../../../helpers/reports/redact.ts";
import {summarizePlanSelection} from "../../../lib/planning/presentation.ts";
import {statsPayloadSchema, type StatsPayload, type FolderSize} from "../../../lib/hygiene/payloads.ts";

const TOP_RULES_LIMIT = 5;
const MAX_FAILING_TESTS_PER_SUITE = 10;
const MAX_MESSAGE_LENGTH = 240;

function suiteHasFailure(suite: SuiteResultLike): boolean {
  return suite.failed > 0 || suite.findings.some((finding) => finding.severity === "error" || finding.severity === "critical");
}

// Keep this list aligned with providers/registry.ts. The projection duplicates
// the order intentionally so rendering stays independent from provider modules.
const PROVIDER_ORDER: readonly string[] = ["format", "lint", "test-typescript", "test-dotnet", "test-python", "stats"];

// GitHub strips unsupported HTML but still renders supported tags. Escape every
// dynamic value before interpolating it into markdown tables or details blocks.
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Provider metadata is registry-owned today, but this helper defines the output
// boundary so future dynamic provider labels remain safe by default.
function providerLabel(outcome: ProviderOutcome<unknown>): string {
  return `${escapeHtml(outcome.providerIcon)} ${escapeHtml(outcome.providerName)}`;
}

function resultVerdict(r: GateResult): string {
  switch (r) {
    case "passed":
      return "✅ Passed";
    case "advisory":
      return "ℹ️ Advisory";
    case "failed":
      return "❌ Failed";
    case "errored":
      return "💥 Errored";
  }
}

function resultPill(r: GateResult): string {
  switch (r) {
    case "passed":
      return "PASS";
    case "advisory":
      return "ADVISORY";
    case "failed":
      return "FAIL";
    case "errored":
      return "ERROR";
  }
}

function resultEmoji(r: GateResult): string {
  switch (r) {
    case "passed":
      return "✅";
    case "advisory":
      return "ℹ️";
    case "failed":
      return "❌";
    case "errored":
      return "💥";
  }
}

// MetricFindings are internal measurements, not actionable hygiene issues.
// Keep them out of user-facing counts so every displayed count has a body path.
function visibleFindings(findings: readonly Finding[]): readonly Finding[] {
  return findings.filter((f) => f.kind !== "metric");
}

function formatDurationMs(ms: number, precision = 3): string {
  const milliseconds = Number(ms.toFixed(precision));
  if (milliseconds < 1000) return `${milliseconds}ms`;
  const seconds = Number((ms / 1000).toFixed(precision));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Number((seconds % 60).toFixed(precision));
  return `${minutes}m${remainder < 10 ? "0" : ""}${remainder}s`;
}

function isSkipped(outcome: ProviderOutcome<unknown>): boolean {
  return outcome.gateResult === "passed" && "executionStatus" in outcome && outcome.executionStatus === "skipped";
}

function skipSignal(outcome: ProviderOutcome<unknown>, report: HygieneReport): string {
  const reason =
    "skipReason" in outcome && typeof outcome.skipReason === "string" && outcome.skipReason.trim()
      ? outcome.skipReason
      : report.plan?.providers.find((provider) => provider.id === outcome.providerId)?.reason;
  if (!reason) return "Skipped — reason unavailable";
  if (reason === "No affected inputs for this provider") return "Skipped — no changed files affect this check";
  if (reason === "No changed files") return "Skipped — no changed files";
  return `Skipped — ${escapeHtml(reason)}`;
}

/**
 * Formats a byte count for compact display in GitHub markdown tables.
 *
 * @param bytes - The signed byte count to format.
 * @returns A human-readable byte, kibibyte, or mebibyte string preserving sign.
 */
export function formatHumanBytes(bytes: number): string {
  const sign = bytes < 0 ? "-" : "";
  const abs = Math.abs(bytes);
  if (abs < 1024) return `${sign}${abs} B`;
  if (abs < 1024 * 1024) return `${sign}${(abs / 1024).toFixed(1)} KiB`;
  return `${sign}${(abs / (1024 * 1024)).toFixed(1)} MiB`;
}

function countBySeverity(findings: readonly Finding[]): {errors: number; warnings: number; infos: number} {
  let errors = 0,
    warnings = 0,
    infos = 0;
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
  readonly advisory: number;
  readonly skipped: number;
  readonly durationMs: number;
}

function collectReportTotals(report: HygieneReport): ReportTotals {
  let visible: Finding[] = [];
  let passed = 0;
  let failed = 0;
  let errored = 0;
  let advisory = 0;
  let skipped = 0;
  let durationMs = 0;

  for (const outcome of report.outcomes) {
    visible = visible.concat(visibleFindings(outcome.findings));
    if (isSkipped(outcome)) {
      skipped++;
      continue;
    }
    durationMs += outcome.durationMs;
    if (outcome.gateResult === "passed") passed++;
    else if (outcome.gateResult === "failed") failed++;
    else if (outcome.gateResult === "errored") errored++;
    else if (outcome.gateResult === "advisory") advisory++;
  }

  return {visibleFindings: visible, passed, failed, errored, advisory, skipped, durationMs};
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
 * @param maxLength - Character budget for this presentation surface.
 * @returns A trimmed message capped to the renderer's maximum summary length.
 */
export function cleanMessage(msg: string, maxLength = MAX_MESSAGE_LENGTH): string {
  let cleaned = msg.replace(/\u001b\[[0-9;]*m/g, "");
  cleaned = cleaned
    .split("\n")
    .filter((line) => !/^\s*at\s+(file:\/\/\/.*node_modules|\/.*node_modules)/.test(line))
    .join("\n")
    .trim();
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength - 1).trimEnd() + "…";
  }
  return cleaned;
}

/**
 * Renderer category for provider detail presentation.
 */
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
  const measurements = totals.visibleFindings.filter((finding) => finding.kind === "comparison" && finding.severity === "info").length;
  const infoFindings = infos - measurements;
  const executed = [
    `${totals.passed} passed`,
    ...(totals.failed ? [`${totals.failed} failed`] : []),
    ...(totals.errored ? [`${totals.errored} errored`] : []),
    ...(totals.advisory ? [`${totals.advisory} advisory`] : []),
  ].join(" · ");
  const diagnostics = [
    `**${errors} error${errors === 1 ? "" : "s"} · ${warnings} warning${warnings === 1 ? "" : "s"}**`,
    ...(infoFindings ? [`${infoFindings} informational finding${infoFindings === 1 ? "" : "s"}`] : []),
    ...(measurements ? [`${measurements} informational measurement${measurements === 1 ? "" : "s"}`] : []),
  ].join("<br>");
  return [
    `## 🩺 Hygiene Check — ${resultVerdict(report.overallResult)}`,
    "",
    `Commit \`${report.commitSha.substring(0, 7)}\`${report.plan ? ` · Scope **${report.plan.mode}**` : ""} · [Workflow run ↗](${report.workflowRunUrl})`,
    "",
    "| ✅ Executed checks | ⏭️ Skipped checks | 🚦 Diagnostics | ⏱️ Provider time |",
    "|:---:|:---:|:---:|:---:|",
    `| **${executed}** | **${totals.skipped} skipped** | ${diagnostics} | **${formatDurationMs(totals.durationMs, 0)}**<br>sum of provider durations |`,
  ].join("\n");
}

function statsPayload(outcome: ProviderOutcome<unknown>): StatsPayload | null {
  return outcome.payload === null ? null : statsPayloadSchema.parse(outcome.payload);
}

function measuredFolders(outcome: ProviderOutcome<unknown>): readonly FolderSize[] {
  const payload = statsPayload(outcome);
  if (payload) return payload.bundleSizes;
  return outcome.findings
    .filter(isComparisonFinding)
    .filter((finding) => finding.unit === "B")
    .map((finding) => ({
      folder: finding.name.replace(/^bundle\./, ""),
      mainTotal: finding.baseValue,
      headTotal: finding.headValue,
    }));
}

interface ChangeCount {
  readonly label: string;
  readonly icon: string;
  readonly count: number;
}

function changeCounts(report: HygieneReport): readonly ChangeCount[] | null {
  const changes = report.plan?.changes;
  if (changes?.scope !== "known") return null;
  const statuses = [
    ["added", "🆕"],
    ["modified", "✏️"],
    ["deleted", "🗑️"],
    ["renamed", "🔀"],
    ["copied", "📋"],
    ["type-changed", "🔄"],
    ["unmerged", "⚠️"],
  ] as const;
  return statuses
    .map(([label, icon]) => ({label, icon, count: changes.entries.filter((entry) => entry.kind === label).length}))
    .filter((entry, index) => index < 3 || entry.count > 0);
}

function fileChangeSignal(report: HygieneReport, payload: StatsPayload | null): string {
  const counts = changeCounts(report);
  if (counts) {
    const total = counts.reduce((sum, entry) => sum + entry.count, 0);
    return `**${total} file${total === 1 ? "" : "s"}** · ${counts.map((entry) => `${entry.count} ${entry.label}`).join(" · ")}`;
  }
  return payload
    ? `**${payload.filesChanged} file${payload.filesChanged === 1 ? "" : "s"}** · status breakdown unavailable`
    : "File changes unavailable";
}

function signedBytes(bytes: number): string {
  if (bytes === 0) return "= 0 B";
  return `${bytes > 0 ? "+" : "-"}${formatHumanBytes(Math.abs(bytes))}`;
}

function footprintSignal(folders: readonly FolderSize[]): string {
  if (folders.length === 0) return "No tracked-folder measurements";
  const changed = folders.filter((folder) => folder.mainTotal !== folder.headTotal).length;
  const delta = folders.reduce((sum, folder) => sum + folder.headTotal - folder.mainTotal, 0);
  return `Tracked size vs \`main\`: net ${signedBytes(delta)} · ${changed} folder${changed === 1 ? "" : "s"} changed`;
}

function statsSignal(outcome: ProviderOutcome<unknown>, report: HygieneReport): string {
  return `${fileChangeSignal(report, statsPayload(outcome))}\n${footprintSignal(measuredFolders(outcome))}`;
}

function testSignal(outcome: ProviderOutcome<unknown>): string | null {
  const payload = outcome.payload as TestSuitesPayloadLike | null;
  if (!payload) return null;

  const skipped = payload.skipped > 0 ? ` · ${payload.skipped.toLocaleString("en-US")} tests skipped` : "";
  if (payload.failed > 0)
    return `**${payload.failed.toLocaleString("en-US")} failed** of ${payload.totalTests.toLocaleString("en-US")}${skipped}`;
  return `**${payload.passed.toLocaleString("en-US")} passed**${skipped}`;
}

function providerSignal(outcome: ProviderOutcome<unknown>, report: HygieneReport): string {
  if (outcome.gateResult === "errored") return "runner error";
  if (isSkipped(outcome)) return skipSignal(outcome, report);
  if ("executionStatus" in outcome && outcome.executionStatus === "cancelled") return "execution cancelled";

  const category = classifyProvider(outcome.providerId);
  if (category === "stats") return statsSignal(outcome, report);

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
      const skipped = isSkipped(outcome);
      const result = skipped ? "⏭️ SKIP" : `${resultEmoji(outcome.gateResult)} ${resultPill(outcome.gateResult)}`;
      return `| ${MarkdownUtils.tableCell(providerLabel(outcome))} | ${result} | ${MarkdownUtils.tableCell(providerSignal(outcome, report))} | ${skipped ? "—" : formatDurationMs(outcome.durationMs)} |`;
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
    const ruleId = f.kind === "line" || f.kind === "file" ? f.ruleId : undefined;
    if (!ruleId) continue;
    counts.set(ruleId, (counts.get(ruleId) ?? 0) + 1);
  }
  if (counts.size === 0) return "";

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  const header = `| Rule | Count |\n|---|---:|`;
  const rows = sorted.map(([rule, count]) => `| \`${MarkdownUtils.tableCell(escapeHtml(rule))}\` | ${count} |`);
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

  const failed = suites
    .filter(suiteHasFailure)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const passed = suites
    .filter((s) => !suiteHasFailure(s))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

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
  if (!suiteHasFailure(suite)) return "";

  const lines: string[] = [];
  lines.push(`#### \`${suite.name}\` · ${suite.failed > 0 ? `${suite.failed} failed of ${suite.totalTests}` : "runner error"}`);
  lines.push("");

  const failingFindings = suite.findings.filter((f) => f.severity === "error" || f.severity === "critical");
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
    lines.push(MarkdownUtils.fence(errMsg));
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
 * Renders committed-folder sizes against main, not production bundle measurements.
 *
 * @param o - The stats provider outcome.
 * @returns Collapsed GitHub markdown details, or null when no folder measurements exist.
 */
export function renderStatsDetails(o: ProviderOutcome<unknown>): string | null {
  const folders = measuredFolders(o);
  if (folders.length === 0) return null;
  const rows = folders.map((folder) => {
    const diff = folder.headTotal - folder.mainTotal;
    const percent =
      folder.mainTotal === 0
        ? diff === 0
          ? "0%"
          : "new"
        : `${diff > 0 ? "+" : ""}${Number(((diff / folder.mainTotal) * 100).toFixed(1))}%`;
    const delta = diff === 0 ? "↔️ 0 B" : `${diff > 0 ? "📈" : "📉"} ${signedBytes(diff)}`;
    return `| \`${MarkdownUtils.tableCell(escapeHtml(folder.folder))}\` | ${formatHumanBytes(folder.mainTotal)} | ${formatHumanBytes(folder.headTotal)} | ${delta} | ${percent} |`;
  });

  return [
    `<details>`,
    `<summary>📦 Git-tracked folder size · vs main</summary>`,
    ``,
    "> All committed files are counted, including documentation and screenshots. This is not a production bundle, compressed download, or deployed artifact measurement.",
    "",
    `| 📁 Folder | 🏠 Main | 🚀 PR head | ⚖️ Change | 📊 Relative |`,
    `|---|---:|---:|---:|---:|`,
    ...rows,
    "",
    "**🔢 Exact bytes:**",
    ...folders.map((folder) => {
      const diff = folder.headTotal - folder.mainTotal;
      return `- \`${MarkdownUtils.tableCell(escapeHtml(folder.folder))}\`: ${folder.mainTotal.toLocaleString("en-US")} → ${folder.headTotal.toLocaleString("en-US")} (${diff > 0 ? "+" : ""}${diff.toLocaleString("en-US")} B)`;
    }),
    "",
    "Size comparisons use `main`; file and line counts use the PR merge-base diff.",
    `</details>`,
  ].join("\n");
}

function renderChangeDetails(report: HygieneReport): string {
  const outcome = report.outcomes.find((item) => item.providerId === "stats");
  if (!outcome || isSkipped(outcome) || outcome.gateResult === "errored") return "";
  const payload = statsPayload(outcome);
  const counts = changeCounts(report);
  if (!counts && !payload) return "";
  const total = counts ? counts.reduce((sum, entry) => sum + entry.count, 0) : payload?.filesChanged;
  const churn = payload ? ` · +${payload.linesAdded.toLocaleString("en-US")} / −${payload.linesDeleted.toLocaleString("en-US")} lines` : "";
  const lines = [
    "<details>",
    `<summary>📂 Change breakdown · ${total} file${total === 1 ? "" : "s"}${churn}</summary>`,
    "",
    "PR merge-base diff for this run.",
    "",
  ];
  if (counts) {
    lines.push(
      `| ${counts.map((entry) => `${entry.icon} ${entry.label[0]?.toUpperCase()}${entry.label.slice(1)}`).join(" | ")} | 🗂️ Total |`,
      `| ${counts.map(() => "---:").join(" | ")} | ---: |`,
      `| ${counts.map((entry) => entry.count).join(" | ")} | ${total} |`,
    );
  } else {
    lines.push("File status breakdown unavailable.");
  }
  if (payload) {
    lines.push(
      "",
      "**🧩 Top file types:**",
      ...payload.topExtensions.map((entry) => `- \`${MarkdownUtils.tableCell(escapeHtml(entry.extension))}\`: ${entry.count}`),
    );
    lines.push(
      "",
      "**📁 Top directories:**",
      ...payload.topDirectories.map((entry) => `- \`${MarkdownUtils.tableCell(escapeHtml(entry.directory))}\`: ${entry.count}`),
    );
  }
  lines.push("", "</details>");
  return lines.join("\n");
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
    lines.push(
      MarkdownUtils.fence(cleanMessage(redactEvidenceText(o.error?.message ?? "Unknown runner error"), PROVIDER_ERROR_MESSAGE_LIMIT)),
    );
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
        if (suiteHasFailure(suite)) {
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
  return `_🤖 Hygiene v3${report.plan ? ` · Plan \`${report.plan.id.slice(0, 12)}\`` : ""} · [Full evidence & artifacts](${report.workflowRunUrl}#artifacts)_`;
}

/** Renders additive plan/provenance details only when versioned evidence is available. */
function renderPlanEvidence(report: HygieneReport): string {
  if (!report.plan && !report.evidenceIssues?.length) return "";
  const lines: string[] = [];
  if (report.plan) {
    const selection = summarizePlanSelection(report.plan);
    if (report.plan.diagnostics.length > 0 || report.plan.mode === "full")
      lines.push(`> ${selection.level === "warning" ? "⚠️" : "ℹ️"} ${selection.message}`, "");
    if (report.plan.diagnostics.length > 0)
      lines.push(
        report.workflowRunUrl
          ? `[Full planning details in the workflow artifacts](${report.workflowRunUrl}#artifacts).`
          : "Full planning details are retained in the hygiene plan artifact.",
      );
    for (const outcome of report.outcomes) {
      if (
        "workflowRunAttempt" in outcome
        && typeof outcome.workflowRunAttempt === "number"
        && report.workflowRunAttempt !== undefined
        && outcome.workflowRunAttempt < report.workflowRunAttempt
      )
        lines.push(`- Reused \`${outcome.providerId}\` from compatible attempt ${outcome.workflowRunAttempt}`);
    }
  }
  if (report.evidenceIssues?.length) {
    lines.push("", "**Evidence verification issues:**");
    for (const issue of report.evidenceIssues.slice(0, 50))
      lines.push(`- \`${issue.code}\`${issue.providerId ? ` (${escapeHtml(issue.providerId)})` : ""}: ${escapeHtml(issue.message)}`);
    if (report.evidenceIssues.length > 50)
      lines.push(`- ${report.evidenceIssues.length - 50} more issue(s); see the required JSON report.`);
  }
  return lines.join("\n");
}

/**
 * Builds the full hygiene PR comment/step summary with explicit plan/evidence details.
 * @param report - Aggregate report retaining all valid outcomes and diagnostics.
 * @returns Complete GitHub-safe Markdown retaining check identities and evidence.
 */
export function buildStepSummary(report: HygieneReport): string {
  const cb = new CommentBuilder();
  const stats = report.outcomes.find((o) => o.providerId === "stats");
  const sections = [
    renderHeader(report),
    renderPlanEvidence(report),
    "### Check results",
    renderScorecard(report),
    ...report.outcomes.map(renderProviderCard),
    renderChangeDetails(report),
    stats ? renderStatsDetails(stats) : null,
    "---",
    renderFooter(report),
  ];
  cb.addRaw(
    sections
      .filter((section) => section?.trim())
      .map((section) => section?.trim())
      .join("\n\n"),
  );
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
