/**
 * @fileoverview Single-index, single-read, bounded live report evidence acquisition.
 * @module github/scripts/lib/live-tests/evidence
 */
import {basename} from "node:path";
import {fs, FileSizeLimitError} from "../../helpers/filesystem/index.ts";
import {HEALTH_CHECK_FILENAME} from "../../helpers/constants.ts";
import {newman, type NewmanExecutionStats} from "../../helpers/newman/index.ts";
import {extractNewmanSummaryTable, extractRequestStatusesFromLog} from "../../helpers/newman/logs.ts";
import {redactEvidenceText, redactEvidenceValue} from "../../helpers/reports/redact.ts";
import {record, text} from "../../helpers/reports/validation.ts";
import type {LiveConfiguration} from "./config.ts";
import {jobStatus, type LiveDiagnostic, type LiveEvidence, type LiveTarget, type LogEvidence, type TargetTestResult} from "./results.ts";
import {LIVE_REPORT_LIMITS} from "../workflow-constants.ts";

export interface BackendHealthCheck {
  readonly dependencies?: Record<string, unknown>;
  readonly status: string;
  readonly timestamp: string;
  readonly version?: string;
  readonly [key: string]: unknown;
}
export interface TestArtifactPaths {
  readonly healthCheck?: string;
  readonly logs: readonly string[];
  readonly reports: readonly string[];
  readonly statuses: readonly string[];
  readonly summaries: readonly string[];
}

/** Identifies native Newman JSON filenames without treating arbitrary JSON as a report. */
export function extractTargetFromReportPath(path: string): string | null {
  return /^newman-([a-z0-9-]+)\.json$/i.exec(basename(path))?.[1]?.toLowerCase() ?? null;
}
function liveTarget(value: string | null | undefined): LiveTarget | undefined {
  return value === "frontend" || value === "backend" || value === "cv" ? value : undefined;
}

/**
 * Classifies one complete file index; no repeated full-tree searches.
 * @param baseDir - Evidence artifact root.
 * @returns Existing compatible artifact path groups in deterministic order.
 */
export async function discoverTestArtifacts(baseDir: string): Promise<TestArtifactPaths> {
  const files = (await fs.exists(baseDir)) ? (await fs.find(baseDir, /./)).toSorted() : [];
  const healthCheck = files.find((file) => basename(file).toLowerCase() === HEALTH_CHECK_FILENAME);
  return {
    logs: files.filter((file) => /\.log$/i.test(file)),
    reports: files.filter((file) => /^newman-[a-z0-9-]+\.json$/i.test(basename(file))),
    statuses: files.filter((file) => /^e2e-status-[a-z0-9-]+\.json$/i.test(basename(file))),
    summaries: files.filter((file) => /^newman-[a-z0-9-]+-summary\.md$/i.test(basename(file))),
    ...(healthCheck === undefined ? {} : {healthCheck}),
  };
}
function failure(error: unknown): string {
  return error instanceof SyntaxError
    ? "Evidence is not valid JSON"
    : error instanceof Error
      ? error.message
      : "Evidence could not be read";
}
function mergeStatus(left: TargetTestResult | undefined, right: TargetTestResult): TargetTestResult {
  const priority = {failure: 5, cancelled: 4, skipped: 3, success: 2, unknown: 1};
  return left && priority[left.status] > priority[right.status] ? left : right;
}

/**
 * Reads explicit execution metadata and optional diagnostics without transporting auth.
 * @param configuration - Parsed targets, status metadata, paths, and byte/character bounds.
 * @returns Valid results plus explicit missing/invalid/oversized evidence diagnostics.
 */
export async function collectLiveEvidence(configuration: LiveConfiguration): Promise<LiveEvidence> {
  const diagnostics: LiveDiagnostic[] = [];
  const statuses: Record<string, TargetTestResult> = {...configuration.statuses};
  const reports: Partial<Record<LiveTarget, NewmanExecutionStats>> = {};
  const completeness: Partial<Record<LiveTarget, "complete" | "missing" | "invalid" | "partial">> = {};
  const summaries: Partial<Record<LiveTarget, string>> = {};
  const logs: Partial<Record<LiveTarget, LogEvidence>> = {};
  const cache = new Map<string, Promise<string>>();
  const read = (path: string, maximum: number): Promise<string> => {
    let value = cache.get(path);
    if (!value) {
      value = fs.readTextBounded(path, maximum).then(redactEvidenceText);
      cache.set(path, value);
    }
    return value;
  };
  const issue = (error: unknown, sourcePath: string, target?: LiveTarget): void => {
    diagnostics.push({
      code: error instanceof FileSizeLimitError ? "oversized-evidence" : "invalid-evidence",
      message: failure(error),
      sourcePath,
      ...(target === undefined ? {} : {target}),
    });
    if (target) completeness[target] = "invalid";
  };
  let artifacts: TestArtifactPaths;
  try {
    artifacts = await discoverTestArtifacts(configuration.artifactsDir);
  } catch (error) {
    artifacts = {logs: [], reports: [], statuses: [], summaries: []};
    issue(error, configuration.artifactsDir);
  }
  const seen = new Set<string>();
  const eligible = (path: string, target: LiveTarget | undefined, kind: string): target is LiveTarget => {
    if (!target || !configuration.targets.includes(target)) return false;
    const key = `${kind}:${target}`;
    if (seen.has(key)) {
      diagnostics.push({
        code: "duplicate-evidence",
        message: "Multiple artifacts claim the same target/category",
        target,
        sourcePath: path,
      });
      completeness[target] = "invalid";
      return false;
    }
    seen.add(key);
    return true;
  };
  for (const path of artifacts.statuses) {
    const target = liveTarget(/^e2e-status-([a-z0-9-]+)\.json$/i.exec(basename(path))?.[1]?.toLowerCase());
    if (!eligible(path, target, "status")) continue;
    try {
      const raw = record(JSON.parse(await read(path, configuration.maxJsonBytes)), "live status artifact");
      if (raw["target"] !== undefined && raw["target"] !== target)
        throw new TypeError("Live status target does not match its artifact identity");
      const status = jobStatus(raw["status"]);
      if (status === "unknown" && raw["status"] !== "unknown") throw new TypeError("Invalid live status artifact state");
      statuses[target] = mergeStatus(statuses[target], {
        status,
        duration: raw["duration"] === undefined ? "N/A" : text(raw["duration"], "live duration"),
      });
    } catch (error) {
      issue(error, path, target);
    }
  }
  for (const path of artifacts.reports) {
    const target = liveTarget(extractTargetFromReportPath(path));
    if (!eligible(path, target, "report")) continue;
    try {
      const raw: unknown = JSON.parse(await read(path, configuration.maxJsonBytes));
      reports[target] = newman.parseReport(redactEvidenceValue(raw));
      if (completeness[target] !== "invalid") completeness[target] = "complete";
    } catch (error) {
      issue(error, path, target);
    }
  }
  for (const path of artifacts.summaries) {
    const target = liveTarget(/^newman-([a-z0-9-]+)-summary\.md$/i.exec(basename(path))?.[1]?.toLowerCase());
    if (!eligible(path, target, "summary")) continue;
    try {
      summaries[target] = await read(path, configuration.maxLogBytes);
    } catch (error) {
      issue(error, path, target);
    }
  }
  for (const path of artifacts.logs) {
    const target = liveTarget(/^e2e-([a-z0-9-]+)\.log$/i.exec(basename(path))?.[1]?.toLowerCase());
    if (!eligible(path, target, "log")) continue;
    try {
      const value = await read(path, configuration.maxLogBytes);
      logs[target] = {
        summaryTable: extractNewmanSummaryTable(value),
        requestStatuses: extractRequestStatusesFromLog(value),
        excerpt: value.slice(-configuration.maxLogTailChars),
      };
    } catch (error) {
      issue(error, path, target);
    }
  }
  let health: LiveEvidence["health"] = null;
  if (configuration.healthJson && configuration.healthJson !== "No health data available") {
    try {
      if (Buffer.byteLength(configuration.healthJson) > configuration.maxJsonBytes)
        throw new FileSizeLimitError("HEALTH_JSON", configuration.maxJsonBytes);
      health = record(redactEvidenceValue(JSON.parse(configuration.healthJson)), "health snapshot");
    } catch (error) {
      issue(error, "HEALTH_JSON");
    }
  }
  if (health === null && artifacts.healthCheck) {
    try {
      health = record(redactEvidenceValue(JSON.parse(await read(artifacts.healthCheck, configuration.maxJsonBytes))), "health snapshot");
    } catch (error) {
      issue(error, artifacts.healthCheck);
    }
  }
  let templateText: string | undefined;
  try {
    if (await fs.exists(configuration.templatePath)) templateText = await read(configuration.templatePath, configuration.maxLogBytes);
  } catch (error) {
    issue(error, configuration.templatePath);
  }
  for (const target of configuration.targets)
    if (completeness[target] === undefined) completeness[target] = logs[target] || summaries[target] ? "partial" : "missing";
  return {statuses, reports, completeness, summaries, logs, health, diagnostics, ...(templateText === undefined ? {} : {templateText})};
}

/**
 * Compatible report loader; invalid files are diagnosed while valid reports remain available.
 * @param artifacts - Previously indexed paths.
 * @returns Parsed report map without performing another directory traversal.
 */
export async function loadNewmanReports(
  artifacts: TestArtifactPaths,
  onIssue?: (issue: LiveDiagnostic) => void,
): Promise<Readonly<Record<string, NewmanExecutionStats>>> {
  const reports: Record<string, NewmanExecutionStats> = {};
  for (const path of artifacts.reports) {
    const target = extractTargetFromReportPath(path);
    if (!target) continue;
    try {
      reports[target] = await fs.readValidatedJson(
        path,
        (value) => newman.parseReport(redactEvidenceValue(value)),
        LIVE_REPORT_LIMITS.jsonBytes,
      );
    } catch (error) {
      if (!onIssue) throw error;
      onIssue({code: "invalid-evidence", message: failure(error), sourcePath: path});
    }
  }
  return reports;
}
