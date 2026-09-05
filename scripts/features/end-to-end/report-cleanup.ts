/**
 * @fileoverview Ordered report cleanup for one end-to-end target: assertion-summary generation,
 * then JSON, JUnit, and summary sanitization, in that fixed order, with every step attempted even
 * after an earlier one failed and every failure aggregated into one message.
 * @module scripts/features/end-to-end/report-cleanup
 *
 * @remarks
 * The workflow registers {@link performEndToEndReportCleanup} with `runtime.cleanup` immediately
 * before its Newman invocation, so it always runs during that invocation's cleanup drain however
 * the run concluded. Removing an artifact that cannot be made safe is successful sanitization, not
 * a failure; only a read, parse, or write fault is aggregated. */

import {join} from "node:path";

import type {TerminalPresenter} from "../../core/presentation/terminal-presenter.ts";
import type {FileSystem} from "../../core/runtime/runtime-capability.ts";
import {containsJwtPattern, redactReportText, sanitizeJsonValue, type SanitizeAccumulator} from "./redaction.ts";
import type {RunnableEndToEndTarget} from "./targets.ts";

/** One assertion failure entry of a Newman JSON report. */
interface NewmanFailure {
  readonly assertion?: string;
  readonly cursor?: {readonly scriptId?: string};
  readonly error?: string | {readonly message?: string};
  readonly parent?: {readonly name?: string};
  readonly source?: {readonly name?: string};
}

/** The only part of a Newman JSON report the assertion summary reads. */
interface NewmanReport {
  readonly run?: {readonly failures?: readonly NewmanFailure[]};
}

const describeError = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/** Best-effort removal used to make an artifact safe after it could not be sanitized in place. */
async function safeRemoveArtifact(files: FileSystem, path: string): Promise<void> {
  try {
    await files.remove(path, {force: true});
  } catch {
    // Best-effort: a failed safety removal does not further block report cleanup.
  }
}

/** Runs one artifact operation, removing the artifact and throwing `<prefix>: <path> (<reason>)`
 * when it faults, because an artifact that could not be read, parsed, or rewritten is not safe. */
async function attemptOrRemoveArtifact<TValue>(
  files: FileSystem,
  path: string,
  prefix: string,
  operation: () => Promise<TValue>,
): Promise<TValue> {
  try {
    return await operation();
  } catch (error: unknown) {
    await safeRemoveArtifact(files, path);
    throw new Error(`${prefix}: ${path} (${describeError(error)})`);
  }
}

/** Removes an artifact that would still carry a JWT-shaped pattern after sanitization.
 * @returns `true` when the artifact was removed, so the caller must not write it back. */
async function removeArtifactIfUnsafe(
  files: FileSystem,
  path: string,
  content: string,
  presenter: TerminalPresenter,
  label: string,
): Promise<boolean> {
  if (!containsJwtPattern(content)) {
    return false;
  }

  await files.remove(path, {force: true});
  presenter.warn(`Removed unsanitized ${label} due to remaining JWT patterns: ${path}`);
  return true;
}

/** Writes a Markdown summary of Newman assertion failures from the still-unsanitized JSON reporter
 * output, so the summary reflects genuine assertion detail. Missing reporter output is a no-op:
 * Newman may not have produced it, for example after a spawn failure.
 * @throws When the JSON report exists but cannot be parsed. */
export async function writeAssertionSummary(
  files: FileSystem,
  target: string,
  reportDirectory: string,
  presenter: TerminalPresenter,
): Promise<void> {
  const jsonPath = join(reportDirectory, `newman-${target}.json`);
  if (!(await files.exists(jsonPath))) {
    presenter.warn(`JSON report not found, cannot create summary: ${jsonPath}`);
    return;
  }

  let data: NewmanReport;
  try {
    data = JSON.parse(await files.readText(jsonPath)) as NewmanReport;
  } catch (error: unknown) {
    throw new Error(`Failed to read Newman JSON report while generating assertion summary: ${jsonPath} (${describeError(error)})`);
  }

  const failures = (data.run?.failures ?? []).map((failure) => ({
    assertion: failure.assertion ?? "Unknown assertion",
    error: typeof failure.error === "string" ? failure.error : (failure.error?.message ?? "Unknown error"),
    item: failure.source?.name ?? failure.parent?.name ?? failure.cursor?.scriptId ?? "Unknown",
  }));

  let markdown = `### Failed Assertions (${target})\n`;
  if (failures.length === 0) {
    markdown += "No failed assertions.\n";
    presenter.success(`No failed assertions for ${target}.`);
  } else {
    failures.forEach((failure, index) => {
      markdown += `${String(index + 1)}. AssertionError  ${failure.assertion}\n   ${failure.error}\n   in "${failure.item}"\n\n`;
    });
    presenter.warn(`${String(failures.length)} failed assertion(s) for ${target}.`);
  }

  const summaryPath = join(reportDirectory, `newman-${target}-summary.md`);
  await files.writeText(summaryPath, markdown.trim() + "\n");
  presenter.info(`Summary written to: ${summaryPath}`);
}

/** Sanitizes a Newman JSON report in place, redacting `runtimeAuthToken` from every string leaf. A
 * missing report is a no-op, and a document that would still carry a JWT-shaped pattern is removed
 * rather than retained — which is successful sanitization, not a failure.
 * @throws When the existing report cannot be parsed or the sanitized document cannot be written. */
export async function sanitizeNewmanJsonReport(
  files: FileSystem,
  jsonPath: string,
  presenter: TerminalPresenter,
  runtimeAuthToken?: string,
): Promise<void> {
  if (!(await files.exists(jsonPath))) {
    return;
  }

  const parsedReport = await attemptOrRemoveArtifact(files, jsonPath, "Failed to parse Newman JSON report, removed it", async () =>
    JSON.parse(await files.readText(jsonPath)),
  );
  const accumulator: SanitizeAccumulator = {redactionCount: 0};
  const serializedReport = JSON.stringify(sanitizeJsonValue(parsedReport, accumulator, null, runtimeAuthToken), null, 2);
  if (await removeArtifactIfUnsafe(files, jsonPath, serializedReport, presenter, "Newman JSON report")) {
    return;
  }

  const jsonWritePrefix = "Failed to write sanitized Newman JSON report, removed it";
  await attemptOrRemoveArtifact(files, jsonPath, jsonWritePrefix, () => files.writeText(jsonPath, serializedReport));
  presenter.info(`Sanitized Newman JSON report (${String(accumulator.redactionCount)} redaction(s)): ${jsonPath}`);
}

/** Sanitizes a text-based report (JUnit XML or Markdown summary) by removing JWT patterns and the
 * exact runtime auth token. A missing report is a no-op, and content that would still carry a
 * JWT-shaped pattern is removed rather than retained — successful sanitization, not a failure.
 * @throws When the existing report cannot be read or the sanitized content cannot be written. */
export async function sanitizeNewmanTextReport(
  files: FileSystem,
  filePath: string,
  presenter: TerminalPresenter,
  runtimeAuthToken?: string,
): Promise<void> {
  if (!(await files.exists(filePath))) {
    return;
  }

  const rawContent = await attemptOrRemoveArtifact(files, filePath, "Failed to read text report, removed it", () =>
    files.readText(filePath),
  );
  const {content, redactionCount} = redactReportText(rawContent, runtimeAuthToken);
  if (await removeArtifactIfUnsafe(files, filePath, content, presenter, "text report")) {
    return;
  }

  const textWritePrefix = "Failed to write sanitized text report, removed it";
  await attemptOrRemoveArtifact(files, filePath, textWritePrefix, () => files.writeText(filePath, content));
  if (redactionCount > 0) {
    presenter.info(`Sanitized text report (${String(redactionCount)} redaction pass(es)): ${filePath}`);
  }
}

/** Runs every report-cleanup step for one target in the required order — assertion-summary
 * generation, JSON sanitization, JUnit sanitization, then summary sanitization — attempting every
 * step even after an earlier one fails.
 * @throws When one or more report-cleanup steps failed, aggregating each labeled failure. */
export async function performEndToEndReportCleanup(
  files: FileSystem,
  target: RunnableEndToEndTarget,
  reportDirectory: string,
  presenter: TerminalPresenter,
  runtimeAuthToken: string | undefined,
): Promise<void> {
  const artifact = (suffix: string): string => join(reportDirectory, `newman-${target}${suffix}`);
  const sanitizeText = (path: string) => (): Promise<void> => sanitizeNewmanTextReport(files, path, presenter, runtimeAuthToken);
  const steps = [
    ["assertion summary", (): Promise<void> => writeAssertionSummary(files, target, reportDirectory, presenter)],
    ["JSON report sanitization", (): Promise<void> => sanitizeNewmanJsonReport(files, artifact(".json"), presenter, runtimeAuthToken)],
    ["JUnit report sanitization", sanitizeText(artifact(".xml"))],
    ["summary sanitization", sanitizeText(artifact("-summary.md"))],
  ] as const satisfies readonly (readonly [string, () => Promise<void>])[];
  const failures: string[] = [];

  for (const [label, run] of steps) {
    try {
      // Intentionally sequential: the fixed order is the contract, and a later step reads what an
      // earlier step wrote.
      // eslint-disable-next-line no-await-in-loop
      await run();
    } catch (error: unknown) {
      failures.push(`${label}: ${describeError(error)}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Report cleanup failed for ${target}:\n${failures.join("\n")}`);
  }
}
