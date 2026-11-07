/** @fileoverview Raw Newman CLI log/summary parsing; no workflow or resource policy. */

/** One executed/failed metric from a native Newman CLI summary table. */
export interface SummaryTableMetric {
  readonly executed: number;
  readonly failed: number;
}

/** Independently available request and assertion summary metrics. */
export interface SummaryTableMetrics {
  readonly assertions: SummaryTableMetric | null;
  readonly requests: SummaryTableMetric | null;
}

/**
 * Removes the native folder prefix used in assertion-summary request names.
 * @param name - CLI request title.
 * @returns Trimmed leaf title for matching summary and log evidence.
 */
export function normalizeRequestName(name: string): string {
  const trimmedName = name.trim();
  const segments = trimmedName.split(" / ");
  return (segments.at(-1) ?? trimmedName).trim();
}

/**
 * Locates a complete native box-drawn execution summary without retaining log noise.
 * @param logContent - Complete bounded/redacted log text.
 * @returns The first matching table, or null when no complete summary exists.
 */
export function extractNewmanSummaryTable(logContent: string): string | null {
  const lines = logContent.split(/\r?\n/);

  for (let index = 0; index < lines.length; index++) {
    const candidateLine = lines[index] ?? "";
    if (!candidateLine.includes("┌") || !candidateLine.includes("┬")) {
      continue;
    }

    let endIndex = index + 1;
    while (endIndex < lines.length) {
      const currentLine = lines[endIndex] ?? "";
      if (currentLine.includes("└") && currentLine.includes("┘")) {
        const candidateBlock = lines.slice(index, endIndex + 1).join("\n");
        if (
          candidateBlock.includes("executed")
          && candidateBlock.includes("failed")
          && candidateBlock.includes("requests")
          && candidateBlock.includes("assertions")
        ) {
          return candidateBlock;
        }

        break;
      }

      endIndex++;
    }
  }

  return null;
}

/**
 * Parses a request/assertion row from native CLI summary text.
 * @param summaryTable - Complete native table.
 * @param metricName - Exact supported row.
 * @returns Parsed counters, or null for unavailable/unparseable evidence.
 */
export function parseSummaryTableMetric(summaryTable: string, metricName: "requests" | "assertions"): SummaryTableMetric | null {
  const metricPattern = new RegExp(`[\\|│]\\s*${metricName}\\s*[\\|│]\\s*(\\d+)\\s*[\\|│]\\s*(\\d+)\\s*[\\|│]`, "i");
  const match = metricPattern.exec(summaryTable);

  if (!match?.[1] || !match[2]) {
    return null;
  }

  const executed = Number.parseInt(match[1], 10);
  const failed = Number.parseInt(match[2], 10);

  if (!Number.isFinite(executed) || !Number.isFinite(failed)) {
    return null;
  }

  return {executed, failed};
}

/**
 * Reads both independent native summary counters.
 * @param summaryTable - Observed table, or explicit absence.
 * @returns Nullable metrics rather than fabricated zero counts.
 */
export function parseSummaryTableMetrics(summaryTable: string | null): SummaryTableMetrics {
  if (!summaryTable) {
    return {assertions: null, requests: null};
  }

  return {
    assertions: parseSummaryTableMetric(summaryTable, "assertions"),
    requests: parseSummaryTableMetric(summaryTable, "requests"),
  };
}

/**
 * Associates observed status-code lines with their preceding native request title.
 * @param logContent - Complete bounded/redacted log text.
 * @returns Only observed request/status pairs.
 */
export function extractRequestStatusesFromLog(logContent: string): Readonly<Record<string, number>> {
  const requestStatuses: Record<string, number> = {};
  const lines = logContent.split(/\r?\n/);

  let currentRequestName: string | null = null;

  for (const line of lines) {
    const requestMatch = /^\s*↳\s+(.+?)\s*$/.exec(line);
    if (requestMatch?.[1]) {
      currentRequestName = normalizeRequestName(requestMatch[1]);
      continue;
    }

    if (!currentRequestName) {
      continue;
    }

    const statusMatch = /\[(\d{3})\s+[^\]]+\]/.exec(line);
    if (!statusMatch?.[1]) {
      continue;
    }

    requestStatuses[currentRequestName] = Number.parseInt(statusMatch[1], 10);
    currentRequestName = null;
  }

  return requestStatuses;
}

/**
 * Parses the existing Newman assertion-summary format by native request name.
 * @param summaryContent - Complete bounded/redacted Markdown summary.
 * @returns Per-request observed error messages, not workflow findings.
 */
export function parseSummaryFailuresByRequest(summaryContent: string): Readonly<Record<string, readonly string[]>> {
  const failuresByRequest = new Map<string, string[]>();
  const lines = summaryContent.split(/\r?\n/);

  let currentErrorMessage = "";

  for (const line of lines) {
    const requestMatch = /^\s*in\s+"([^"]+)"/.exec(line);
    if (requestMatch?.[1]) {
      const requestName = normalizeRequestName(requestMatch[1]);
      const messages = failuresByRequest.get(requestName) ?? [];
      messages.push(currentErrorMessage);
      failuresByRequest.set(requestName, messages);
      currentErrorMessage = "";
      continue;
    }

    const messageMatch = /^\s{3}(.+)$/.exec(line);
    if (!messageMatch?.[1]) {
      continue;
    }

    const message = messageMatch[1].trim();
    if (!message.startsWith('in "')) {
      currentErrorMessage = message;
    }
  }

  const serializedFailures: Record<string, readonly string[]> = {};
  for (const [requestName, messages] of failuresByRequest.entries()) {
    serializedFailures[requestName] = messages;
  }

  return serializedFailures;
}
