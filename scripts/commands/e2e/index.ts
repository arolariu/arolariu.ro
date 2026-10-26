/**
 * @fileoverview E2E runner for OpenAPI/Postman collections via Newman.
 * @module scripts/commands/e2e
 *
 * @remarks
 * {@link runE2e} runs Postman collections (one per target) through Newman. The auth token is read
 * as a `Redacted` value and unwrapped only for the Newman `--env-var authToken=...` argument
 * (Newman offers no environment channel); tracked collection and environment files are never
 * mutated. Because that argument carries the token, the Newman run never echoes its command line,
 * captures its output and writes it only after redaction, and rebuilds every `ProcessError` as a
 * {@link NewmanFailed} from redacted output alone, never from the error message or command.
 *
 * Each target registers its own report-cleanup work (assertion-summary generation, then JSON,
 * JUnit, and summary sanitization, in that order) immediately before its Newman run. One
 * `Effect.ensuring` finalizer runs every registered cleanup, last registered first, after the last
 * target settles: on success, failure, or interruption. Cleanup always attempts every step, even
 * after an earlier step failed. A Newman failure stays the primary failure, with any cleanup
 * failure appended to its evidence; when Newman succeeded, a cleanup failure becomes the failure.
 */

import {Effect, FileSystem, Path, Redacted, type PlatformError} from "effect";

import {Environment} from "../../platform/Environment.ts";
import {writeTextAtomic} from "../../platform/Files.ts";
import type {PlatformServices} from "../../platform/layers.ts";
import {Presenter, withLogContext} from "../../platform/Output.ts";
import {MAX_EVIDENCE_CHARACTERS, Process, type ProcessError} from "../../platform/Process.ts";
import {NewmanFailed, NewmanReportFailed} from "./errors.ts";

/** Every target the `test:e2e` command accepts, including the `all` alias. */
export type E2ETarget = "all" | "backend" | "frontend" | "cv";

/** One target Newman actually runs a collection against. */
type RunnableE2ETarget = Exclude<E2ETarget, "all">;

type AuthPolicy = "required" | "optional" | "ignored";
type EnvironmentProfile = "local" | "production";

interface TargetConfiguration {
  readonly authPolicy: AuthPolicy;
  readonly directory: string;
  readonly label: string;
}

interface NewmanFailure {
  readonly assertion?: string;
  readonly cursor?: {
    readonly scriptId?: string;
  };
  readonly error?: string | {readonly message?: string};
  readonly parent?: {
    readonly name?: string;
  };
  readonly source?: {
    readonly name?: string;
  };
}

interface NewmanReport {
  readonly run?: {
    readonly failures?: readonly NewmanFailure[];
  };
}

interface SanitizeAccumulator {
  redactionCount: number;
}

/** Typed input accepted by the E2E command. */
export interface E2EInput {
  /** Selected target: one runnable target, or `all` to run every target in {@link EXECUTION_ORDER}. */
  readonly target: E2ETarget;
}

/** Typed business result produced by one E2E invocation. */
export interface E2EResult {
  /** Every target this invocation ran, in the exact order they were attempted. */
  readonly targets: readonly RunnableE2ETarget[];
  /** Targets whose Newman run completed before invocation cleanup, in completion order. */
  readonly completed: readonly RunnableE2ETarget[];
}

const SENSITIVE_KEY_PATTERN = /(authorization|auth[_-]?token|access[_-]?token|refresh[_-]?token|id[_-]?token|token)/i;
const JWT_REPLACEMENT_PATTERN = /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const JWT_DETECTION_PATTERN = /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/;
const BEARER_JWT_REPLACEMENT_PATTERN = /Bearer\s+eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const BEARER_JWT_DETECTION_PATTERN = /Bearer\s+eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/;

/** Preserved target execution order for the `all` alias. */
const EXECUTION_ORDER: readonly RunnableE2ETarget[] = ["frontend", "backend", "cv"];

/** Receives the warnings of {@link readPositiveIntegerEnv} and {@link readBooleanEnv}. */
interface E2EWarningSink {
  /** Records one warning message. */
  readonly warn: (message: string) => void;
}

const targetConfigurationMap: Record<RunnableE2ETarget, TargetConfiguration> = {
  backend: {
    authPolicy: "required",
    directory: "sites/api.arolariu.ro",
    label: "api.arolariu.ro",
  },
  cv: {
    authPolicy: "ignored",
    directory: "sites/cv.arolariu.ro",
    label: "cv.arolariu.ro",
  },
  frontend: {
    authPolicy: "optional",
    directory: "sites/arolariu.ro",
    label: "arolariu.ro",
  },
};

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Resolves an E2E environment profile from an environment map.
 *
 * @param env - Environment variables to read from.
 * @returns The selected environment profile.
 */
function resolveEnvironmentProfile(env: Readonly<Record<string, string | undefined>>): EnvironmentProfile {
  const rawEnvironment = (env["E2E_TEST_ENVIRONMENT"] ?? env["NEWMAN_ENVIRONMENT"] ?? "production").toLowerCase();
  return rawEnvironment === "local" ? "local" : "production";
}

/**
 * Reads a positive integer from an environment map.
 *
 * @param key - Environment variable key.
 * @param fallback - Fallback number if variable is missing/invalid.
 * @param logger - Receives the warning about an invalid value.
 * @param env - Environment map to read from.
 * @returns Parsed positive integer.
 */
function readPositiveIntegerEnv(
  key: string,
  fallback: number,
  logger: E2EWarningSink,
  env: Readonly<Record<string, string | undefined>>,
): number {
  const rawValue = env[key];
  if (rawValue === undefined || rawValue === "") {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    logger.warn(`Invalid ${key}="${rawValue}", using default ${String(fallback)}.`);
    return fallback;
  }

  return parsedValue;
}

/**
 * Reads a boolean from an environment map.
 *
 * @param key - Environment variable key.
 * @param fallback - Fallback value.
 * @param logger - Receives the warning about an invalid value.
 * @param env - Environment map to read from.
 * @returns Parsed boolean value.
 */
function readBooleanEnv(
  key: string,
  fallback: boolean,
  logger: E2EWarningSink,
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  const rawValue = env[key];
  if (rawValue === undefined || rawValue === "") {
    return fallback;
  }

  const normalizedValue = rawValue.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalizedValue)) {
    return false;
  }

  logger.warn(`Invalid ${key}="${rawValue}", using default ${String(fallback)}.`);
  return fallback;
}

/**
 * Redacts known secret patterns from a string value.
 *
 * @param value - The raw value to sanitize.
 * @param key - The owning object key, when available.
 * @param accumulator - Mutable counter of performed redactions.
 * @param runtimeAuthToken - Optional runtime auth token to redact by exact match.
 * @returns The sanitized string value.
 */
export function redactSensitiveString(
  value: string,
  key: string | null,
  accumulator: SanitizeAccumulator,
  runtimeAuthToken?: string,
): string {
  if (key !== null && SENSITIVE_KEY_PATTERN.test(key) && value.trim().length > 0) {
    accumulator.redactionCount++;
    return "[REDACTED]";
  }

  let sanitizedValue = value;

  if (runtimeAuthToken !== undefined && runtimeAuthToken.length > 0) {
    const redactedRuntimeToken = sanitizedValue.replaceAll(runtimeAuthToken, "[REDACTED]");
    if (redactedRuntimeToken !== sanitizedValue) {
      accumulator.redactionCount++;
      sanitizedValue = redactedRuntimeToken;
    }
  }

  const redactedBearerValue = sanitizedValue.replace(BEARER_JWT_REPLACEMENT_PATTERN, "******");
  if (redactedBearerValue !== sanitizedValue) {
    accumulator.redactionCount++;
    sanitizedValue = redactedBearerValue;
  }

  const redactedJwtValue = sanitizedValue.replace(JWT_REPLACEMENT_PATTERN, "[REDACTED_JWT]");
  if (redactedJwtValue !== sanitizedValue) {
    accumulator.redactionCount++;
    sanitizedValue = redactedJwtValue;
  }

  return sanitizedValue;
}

/**
 * Recursively sanitizes JSON-compatible values for secure artifact storage.
 *
 * @param value - The value to sanitize.
 * @param accumulator - Mutable counter of performed redactions.
 * @param key - The owning object key, when available.
 * @param runtimeAuthToken - Optional runtime auth token to redact from every string leaf.
 * @returns The sanitized value.
 */
export function sanitizeJsonValue(
  value: unknown,
  accumulator: SanitizeAccumulator,
  key: string | null = null,
  runtimeAuthToken?: string,
): unknown {
  if (typeof value === "string") {
    return redactSensitiveString(value, key, accumulator, runtimeAuthToken);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJsonValue(item, accumulator, null, runtimeAuthToken));
  }

  if (typeof value === "object" && value !== null) {
    const recordValue = value as Record<string, unknown>;
    const sanitizedRecord: Record<string, unknown> = {};

    for (const [entryKey, entryValue] of Object.entries(recordValue)) {
      sanitizedRecord[entryKey] = sanitizeJsonValue(entryValue, accumulator, entryKey, runtimeAuthToken);
    }

    return sanitizedRecord;
  }

  return value;
}

/** One target's report-cleanup work, registered immediately before its Newman run. */
interface TargetReportCleanup {
  /** The target whose reports are cleaned. */
  readonly target: RunnableE2ETarget;
  /** The directory Newman exports the target's reports to. */
  readonly reportDir: string;
  /** The token Newman received, redacted from every report; `undefined` when none was passed. */
  readonly runtimeAuthToken: Redacted.Redacted<string> | undefined;
  /** The configured token, redacted from every cleanup diagnostic; `undefined` when none is set. */
  readonly outputToken: Redacted.Redacted<string> | undefined;
}

/** One target's report-cleanup failure, already redacted. */
interface CleanupFailure {
  readonly target: RunnableE2ETarget;
  readonly message: string;
}

/**
 * Redacts the configured auth token and JWT-shaped values from text that may be written as output.
 *
 * @param text - Text derived from Newman output or a report diagnostic.
 * @param token - The configured auth token, when one is set.
 * @returns The redacted text.
 */
function redactOutput(text: string, token: Redacted.Redacted<string> | undefined): string {
  return redactSensitiveString(text, null, {redactionCount: 0}, token === undefined ? undefined : Redacted.value(token));
}

/**
 * Removes an artifact that could not be sanitized in place.
 *
 * @param path - Path of the artifact to remove.
 * @returns An effect that never fails: a failed safety removal does not further block report cleanup.
 */
function safeRemoveArtifact(path: string): Effect.Effect<void, never, FileSystem.FileSystem> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    yield* Effect.ignore(fs.remove(path, {force: true}));
  });
}

/**
 * Writes a Markdown summary of Newman assertion failures from the (still unsanitized) JSON
 * reporter output.
 *
 * @remarks
 * Missing JSON reporter output is a no-op with a warning: Newman may not have produced it (for
 * example, a spawn failure). Reads the JSON report before {@link sanitizeNewmanJsonReport} runs so
 * the summary reflects genuine assertion detail.
 *
 * @param target - Target identifier used in report filenames.
 * @param reportDir - Report directory path.
 * @returns An effect writing `newman-<target>-summary.md`, failing with {@link NewmanReportFailed}
 * when the JSON report exists but cannot be read or parsed.
 */
export function writeAssertionSummary(
  target: string,
  reportDir: string,
): Effect.Effect<void, PlatformError.PlatformError | NewmanReportFailed, FileSystem.FileSystem | Path.Path | Presenter> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const presenter = yield* Presenter;
    const jsonPath = paths.join(reportDir, `newman-${target}.json`);
    if (!(yield* fs.exists(jsonPath))) {
      yield* Effect.logWarning(`JSON report not found, cannot create summary: ${jsonPath}`);
      return;
    }

    const unreadable = (detail: string): NewmanReportFailed =>
      new NewmanReportFailed({
        path: jsonPath,
        message: `Failed to read Newman JSON report while generating assertion summary: ${jsonPath} (${detail})`,
      });
    const parsed = yield* fs.readFileString(jsonPath).pipe(
      Effect.flatMap((text) => Effect.try({try: (): unknown => JSON.parse(text), catch: (error) => error})),
      Effect.mapError((error) => unreadable(describeError(error))),
    );
    if (typeof parsed !== "object" || parsed === null) {
      return yield* unreadable("the report is not a JSON object");
    }
    const data = parsed as NewmanReport;

    const failures = (data.run?.failures ?? []).map((failure) => ({
      assertion: failure.assertion ?? "Unknown assertion",
      error: typeof failure.error === "string" ? failure.error : (failure.error?.message ?? "Unknown error"),
      item: failure.source?.name ?? failure.parent?.name ?? failure.cursor?.scriptId ?? "Unknown",
    }));

    let markdown = `### Failed Assertions (${target})\n`;
    if (failures.length === 0) {
      markdown += "No failed assertions.\n";
      yield* presenter.success(`No failed assertions for ${target}.`);
    } else {
      failures.forEach((failure, index) => {
        markdown += `${String(index + 1)}. AssertionError  ${failure.assertion}\n   ${failure.error}\n   in "${failure.item}"\n\n`;
      });
      yield* Effect.logWarning(`${String(failures.length)} failed assertion(s) for ${target}.`);
    }

    const summaryPath = paths.join(reportDir, `newman-${target}-summary.md`);
    yield* writeTextAtomic(summaryPath, markdown.trim() + "\n");
    yield* Effect.logInfo(`Summary written to: ${summaryPath}`);
  });
}

/**
 * Sanitizes a Newman JSON report in place and removes it if redaction safety checks fail.
 *
 * @remarks
 * A missing report is a no-op. A read/parse failure removes the artifact (there is nothing safe
 * left to keep) and fails. When the sanitized document would still contain a JWT-shaped pattern,
 * removing the artifact is successful sanitization, not a failure.
 *
 * @param jsonPath - Path to the Newman JSON report.
 * @param runtimeAuthToken - Optional runtime auth token to redact from every string leaf.
 * @returns An effect rewriting the report, failing with {@link NewmanReportFailed} when the
 * existing report cannot be parsed or the sanitized document cannot be written.
 */
export function sanitizeNewmanJsonReport(
  jsonPath: string,
  runtimeAuthToken?: string,
): Effect.Effect<void, PlatformError.PlatformError | NewmanReportFailed, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    if (!(yield* fs.exists(jsonPath))) {
      return;
    }

    const parsedReport = yield* fs.readFileString(jsonPath).pipe(
      Effect.flatMap((text) => Effect.try({try: (): unknown => JSON.parse(text), catch: (error) => error})),
      Effect.catch((error) =>
        Effect.andThen(
          safeRemoveArtifact(jsonPath),
          Effect.fail(
            new NewmanReportFailed({
              path: jsonPath,
              message: `Failed to parse Newman JSON report, removed it: ${jsonPath} (${describeError(error)})`,
            }),
          ),
        ),
      ),
    );

    const accumulator: SanitizeAccumulator = {redactionCount: 0};
    const sanitizedReport = sanitizeJsonValue(parsedReport, accumulator, null, runtimeAuthToken);
    const serializedReport = JSON.stringify(sanitizedReport, null, 2);

    if (BEARER_JWT_DETECTION_PATTERN.test(serializedReport) || JWT_DETECTION_PATTERN.test(serializedReport)) {
      yield* fs.remove(jsonPath, {force: true});
      yield* Effect.logWarning(`Removed unsanitized Newman JSON report due to remaining JWT patterns: ${jsonPath}`);
      return;
    }

    yield* writeTextAtomic(jsonPath, serializedReport).pipe(
      Effect.catch((error) =>
        Effect.andThen(
          safeRemoveArtifact(jsonPath),
          Effect.fail(
            new NewmanReportFailed({
              path: jsonPath,
              message: `Failed to write sanitized Newman JSON report, removed it: ${jsonPath} (${error.message})`,
            }),
          ),
        ),
      ),
    );

    yield* Effect.logInfo(`Sanitized Newman JSON report (${String(accumulator.redactionCount)} redaction(s)): ${jsonPath}`);
  });
}

/**
 * Sanitizes a text-based report (JUnit XML, Markdown summary) by removing JWT patterns and the
 * exact runtime auth token.
 *
 * @remarks
 * A missing report is a no-op. A read/write failure removes the artifact and fails. When the
 * sanitized content would still contain a JWT-shaped pattern, removing the artifact is successful
 * sanitization, not a failure.
 *
 * @param filePath - Path to the text report.
 * @param runtimeAuthToken - Optional runtime auth token to redact by exact match.
 * @returns An effect rewriting the report, failing with {@link NewmanReportFailed} when the
 * existing report cannot be read or the sanitized content cannot be written.
 */
export function sanitizeNewmanTextReport(
  filePath: string,
  runtimeAuthToken?: string,
): Effect.Effect<void, PlatformError.PlatformError | NewmanReportFailed, FileSystem.FileSystem | Path.Path> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    if (!(yield* fs.exists(filePath))) {
      return;
    }

    let content = yield* fs
      .readFileString(filePath)
      .pipe(
        Effect.catch((error) =>
          Effect.andThen(
            safeRemoveArtifact(filePath),
            Effect.fail(
              new NewmanReportFailed({path: filePath, message: `Failed to read text report, removed it: ${filePath} (${error.message})`}),
            ),
          ),
        ),
      );

    let redactionCount = 0;

    if (runtimeAuthToken !== undefined && runtimeAuthToken.length > 0 && content.includes(runtimeAuthToken)) {
      content = content.replaceAll(runtimeAuthToken, "[REDACTED]");
      redactionCount++;
    }

    const bearerRedacted = content.replace(BEARER_JWT_REPLACEMENT_PATTERN, "******");
    if (bearerRedacted !== content) {
      content = bearerRedacted;
      redactionCount++;
    }

    const jwtRedacted = content.replace(JWT_REPLACEMENT_PATTERN, "[REDACTED_JWT]");
    if (jwtRedacted !== content) {
      content = jwtRedacted;
      redactionCount++;
    }

    if (JWT_DETECTION_PATTERN.test(content) || BEARER_JWT_DETECTION_PATTERN.test(content)) {
      yield* fs.remove(filePath, {force: true});
      yield* Effect.logWarning(`Removed unsanitized text report due to remaining JWT patterns: ${filePath}`);
      return;
    }

    yield* writeTextAtomic(filePath, content).pipe(
      Effect.catch((error) =>
        Effect.andThen(
          safeRemoveArtifact(filePath),
          Effect.fail(
            new NewmanReportFailed({
              path: filePath,
              message: `Failed to write sanitized text report, removed it: ${filePath} (${error.message})`,
            }),
          ),
        ),
      ),
    );

    if (redactionCount > 0) {
      yield* Effect.logInfo(`Sanitized text report (${String(redactionCount)} redaction pass(es)): ${filePath}`);
    }
  });
}

/**
 * Runs every report-cleanup step of one target in the required order, attempting every step even
 * after an earlier one fails.
 *
 * @remarks
 * Order: assertion-summary generation, JSON sanitization, JUnit sanitization, summary
 * sanitization. Every failing step contributes its own line to one redacted aggregate failure.
 *
 * @param cleanup - The registered cleanup of one target.
 * @returns An effect that never fails, yielding the aggregate failure, or `undefined` when every step succeeded.
 */
function performReportCleanup(
  cleanup: TargetReportCleanup,
): Effect.Effect<CleanupFailure | undefined, never, FileSystem.FileSystem | Path.Path | Presenter> {
  return Effect.gen(function* () {
    const paths = yield* Path.Path;
    const {target, reportDir} = cleanup;
    const token = cleanup.runtimeAuthToken === undefined ? undefined : Redacted.value(cleanup.runtimeAuthToken);
    const failures: string[] = [];
    const attempt = <R>(
      label: string,
      step: Effect.Effect<void, PlatformError.PlatformError | NewmanReportFailed, R>,
    ): Effect.Effect<void, never, R> =>
      step.pipe(
        Effect.catch((error) =>
          Effect.sync(() => {
            failures.push(`${label}: ${error.message}`);
          }),
        ),
      );

    yield* attempt("assertion summary", writeAssertionSummary(target, reportDir));
    yield* attempt("JSON report sanitization", sanitizeNewmanJsonReport(paths.join(reportDir, `newman-${target}.json`), token));
    yield* attempt("JUnit report sanitization", sanitizeNewmanTextReport(paths.join(reportDir, `newman-${target}.xml`), token));
    yield* attempt("summary sanitization", sanitizeNewmanTextReport(paths.join(reportDir, `newman-${target}-summary.md`), token));

    if (failures.length === 0) {
      return undefined;
    }
    return {target, message: redactOutput(`Report cleanup failed for ${target}:\n${failures.join("\n")}`, cleanup.outputToken)};
  }).pipe(withLogContext(`test:e2e::${cleanup.target}`));
}

/**
 * Builds the bounded, redacted evidence line of one captured Newman stream.
 *
 * @param stream - The stream name.
 * @param text - The captured stream.
 * @param token - The configured auth token, when one is set.
 * @returns `[]` for an empty stream, else `"<stream>: <last MAX_EVIDENCE_CHARACTERS of the redacted text>"`.
 */
function streamEvidence(stream: "stdout" | "stderr", text: string, token: Redacted.Redacted<string> | undefined): readonly string[] {
  if (text.length === 0) {
    return [];
  }
  // Redact before bounding, so the bound can never cut the token into an unredactable fragment.
  const redacted = redactOutput(text, token);
  return [`${stream}: ${redacted.length > MAX_EVIDENCE_CHARACTERS ? redacted.slice(-MAX_EVIDENCE_CHARACTERS) : redacted}`];
}

/**
 * Rebuilds a failed Newman run as a {@link NewmanFailed} without its message or command line.
 *
 * @remarks
 * The `ProcessError` message and `command` contain the Newman arguments, including
 * `--env-var authToken=<token>`, so neither is read. The message names only the target and the
 * outcome; the evidence holds the redacted, bounded captured output.
 *
 * @param target - The target Newman ran for.
 * @param error - The Newman process failure.
 * @param token - The configured auth token, when one is set.
 * @returns The redacted failure.
 */
function newmanFailure(target: RunnableE2ETarget, error: ProcessError, token: Redacted.Redacted<string> | undefined): NewmanFailed {
  const evidence = [...streamEvidence("stdout", error.stdout, token), ...streamEvidence("stderr", error.stderr, token)];
  switch (error._tag) {
    case "ProcessExited":
      return new NewmanFailed({
        message: `Newman exited with code ${String(error.exitCode)} for ${target}.`,
        target,
        exitCode: error.exitCode,
        evidence,
      });
    case "ProcessSignalled":
      return new NewmanFailed({message: `Newman was terminated by ${redactOutput(error.signal, token)} for ${target}.`, target, evidence});
    case "ProcessSpawnFailed":
      return new NewmanFailed({message: `Newman failed to start for ${target}: ${redactOutput(error.reason, token)}`, target, evidence});
    case "ProcessTimedOut":
      return new NewmanFailed({message: `Newman timed out after ${String(error.timeoutMs)} ms for ${target}.`, target, evidence});
  }
}

/**
 * Writes the captured Newman output after redaction (human mode only).
 *
 * @param output - The captured streams.
 * @param token - The configured auth token, when one is set.
 * @returns An effect writing each non-empty stream to its own stream.
 */
function writeNewmanOutput(
  output: {readonly stdout: string; readonly stderr: string},
  token: Redacted.Redacted<string> | undefined,
): Effect.Effect<void, never, Presenter> {
  return Effect.gen(function* () {
    const presenter = yield* Presenter;
    if (output.stdout.length > 0) {
      yield* presenter.write("stdout", redactOutput(output.stdout, token));
    }
    if (output.stderr.length > 0) {
      yield* presenter.write("stderr", redactOutput(output.stderr, token));
    }
  });
}

/**
 * Runs the Newman testing flow for a single target: resolves paths, validates the auth-token
 * policy, registers report cleanup, and runs Newman.
 *
 * @remarks
 * Token behavior is target-specific: `backend` requires a token, `frontend` accepts one
 * optionally, and `cv` never transports one. The token stays `Redacted` until the Newman argument
 * is built. The report cleanup is registered immediately before the Newman run, so the caller's
 * finalizer runs it however the run concludes. Newman runs with captured output and no command
 * echo; its output is written after redaction, and a failure becomes {@link newmanFailure}.
 *
 * @param target - The target to run Newman tests for.
 * @param cleanups - The registry the target's report cleanup is appended to.
 * @returns An effect that succeeds once Newman exited with code `0`.
 */
function runNewmanForTarget(
  target: RunnableE2ETarget,
  cleanups: TargetReportCleanup[],
): Effect.Effect<void, NewmanFailed | PlatformError.PlatformError, Environment | FileSystem.FileSystem | Path.Path | Presenter | Process> {
  return Effect.gen(function* () {
    const environment = yield* Environment;
    const fs = yield* FileSystem.FileSystem;
    const paths = yield* Path.Path;
    const presenter = yield* Presenter;
    const processes = yield* Process;
    const env = environment.variables;
    const cwd = environment.cwd;
    const config = targetConfigurationMap[target];

    const collectionPath = paths.resolve(cwd, config.directory, "postman-collection.json");
    const profile = resolveEnvironmentProfile(env);
    const environmentPath = paths.resolve(cwd, config.directory, `postman-environment.${profile}.json`);

    if (!(yield* fs.exists(collectionPath))) {
      return yield* new NewmanFailed({message: `Collection file not found: ${collectionPath}`, target, evidence: []});
    }
    if (!(yield* fs.exists(environmentPath))) {
      return yield* new NewmanFailed({message: `Environment file not found: ${environmentPath}`, target, evidence: []});
    }

    const authToken = Redacted.make((env["E2E_TEST_AUTH_TOKEN"] ?? "").trim());
    const hasAuthToken = Redacted.value(authToken).length > 0;
    if (config.authPolicy === "required" && !hasAuthToken) {
      return yield* new NewmanFailed({
        message: `E2E_TEST_AUTH_TOKEN environment variable is required for ${target}.`,
        target,
        evidence: [],
      });
    }
    if (config.authPolicy === "optional" && !hasAuthToken) {
      yield* Effect.logWarning(`E2E_TEST_AUTH_TOKEN is not set. Continuing ${target} run without auth token injection.`);
    }
    if (config.authPolicy === "ignored" && hasAuthToken) {
      yield* Effect.logInfo(`${target} does not require auth token; skipping auth injection.`);
    }

    const shouldPassAuthToken = config.authPolicy !== "ignored" && hasAuthToken;
    const outputToken = hasAuthToken ? authToken : undefined;

    yield* presenter.section(`E2E Testing: ${target}`, "🧪");
    yield* presenter.line("stdout", `Collection: ${collectionPath}`);
    yield* presenter.line("stdout", `Environment: ${environmentPath} (${profile})`);

    const rawReportDir = env["NEWMAN_REPORT_DIR"] === undefined || env["NEWMAN_REPORT_DIR"] === "" ? "e2e-logs" : env["NEWMAN_REPORT_DIR"];
    const reportDir = paths.resolve(cwd, rawReportDir);
    yield* fs
      .makeDirectory(reportDir, {recursive: true})
      .pipe(Effect.catch((error) => Effect.logWarning(`Failed to create report directory: ${reportDir} (${error.message})`)));

    const jsonPath = paths.join(reportDir, `newman-${target}.json`);
    const junitPath = paths.join(reportDir, `newman-${target}.xml`);
    const warnings: string[] = [];
    const warningSink: E2EWarningSink = {warn: (message) => warnings.push(message)};
    const collectionTimeout = readPositiveIntegerEnv("NEWMAN_TIMEOUT", 600_000, warningSink, env);
    const requestTimeout = readPositiveIntegerEnv("NEWMAN_TIMEOUT_REQUEST", 30_000, warningSink, env);
    const scriptTimeout = readPositiveIntegerEnv("NEWMAN_TIMEOUT_SCRIPT", 10_000, warningSink, env);
    const strictMode = readBooleanEnv("NEWMAN_STRICT_MODE", false, warningSink, env);
    yield* Effect.forEach(warnings, (warning) => Effect.logWarning(warning), {discard: true});

    yield* presenter.line("stdout", `JSON report: ${jsonPath}`);
    yield* presenter.line("stdout", `JUnit report: ${junitPath}`);
    yield* presenter.line(
      "stdout",
      `Timeout: ${String(collectionTimeout)}ms (request: ${String(requestTimeout)}ms, script: ${String(scriptTimeout)}ms)`,
    );
    yield* presenter.line("stdout", `Strict mode (--bail): ${String(strictMode)}`);

    // Registered before the Newman launch so the report work runs however the launch below concludes.
    cleanups.push({target, reportDir, runtimeAuthToken: shouldPassAuthToken ? authToken : undefined, outputToken});

    const args = [
      "newman",
      "run",
      collectionPath,
      "--environment",
      environmentPath,
      ...(shouldPassAuthToken ? ["--env-var", `authToken=${Redacted.value(authToken)}`] : []),
      "--reporters",
      "cli,json,junit",
      "--reporter-json-export",
      jsonPath,
      "--reporter-junit-export",
      junitPath,
      "--timeout",
      String(collectionTimeout),
      "--timeout-request",
      String(requestTimeout),
      "--timeout-script",
      String(scriptTimeout),
      ...(strictMode ? ["--bail"] : []),
    ];

    // The arguments carry the token: never echo them, and rebuild every failure from redacted output only.
    const result = yield* processes
      .run({command: "npx", args}, {cwd, output: "capture", echo: false, failureOutput: "full"})
      .pipe(
        Effect.catch((error) =>
          Effect.andThen(writeNewmanOutput(error, outputToken), Effect.fail(newmanFailure(target, error, outputToken))),
        ),
      );
    yield* writeNewmanOutput(result, outputToken);

    yield* presenter.success(`Completed Newman tests for: ${target}`);
  }).pipe(withLogContext(`test:e2e::${target}`));
}

/**
 * Appends report-cleanup failures to a Newman failure, which stays primary.
 *
 * @param error - The primary Newman failure.
 * @param failures - The redacted report-cleanup failures.
 * @returns `error` itself when nothing failed, else a copy with every cleanup failure appended to `evidence`.
 */
function withCleanupEvidence(error: NewmanFailed, failures: readonly CleanupFailure[]): NewmanFailed {
  if (failures.length === 0) {
    return error;
  }
  return new NewmanFailed({
    message: error.message,
    target: error.target,
    ...(error.exitCode === undefined ? {} : {exitCode: error.exitCode}),
    evidence: [...error.evidence, ...failures.map((failure) => failure.message)],
  });
}

/**
 * Runs the E2E business logic: expands `all` into {@link EXECUTION_ORDER}, then runs every target
 * sequentially, so a later target's failure never starts a target that has not been reached yet.
 *
 * @remarks
 * Every target registers its report cleanup before its Newman run; one `Effect.ensuring`
 * finalizer runs the registered cleanups, last registered first, once the targets settle,
 * including on interruption. A {@link NewmanFailed} keeps its place as the failure with the
 * cleanup failures appended to its evidence; after a successful run, the first cleanup failure
 * becomes the failure (the others are its evidence).
 *
 * @param input - Typed command input.
 * @returns The expanded target list and every target that completed.
 */
export const runE2e: (input: E2EInput) => Effect.Effect<E2EResult, NewmanFailed | PlatformError.PlatformError, PlatformServices> =
  Effect.fn("e2e.run")(function* (input: E2EInput) {
    const presenter = yield* Presenter;
    const targets: readonly RunnableE2ETarget[] = input.target === "all" ? [...EXECUTION_ORDER] : [input.target];
    const completed: RunnableE2ETarget[] = [];
    const cleanups: TargetReportCleanup[] = [];
    const cleanupFailures: CleanupFailure[] = [];

    yield* presenter.section("arolariu.ro E2E Test Runner", "🎯");

    const cleanUp = Effect.suspend(() =>
      Effect.forEach(
        cleanups.toReversed(),
        (cleanup) =>
          Effect.map(performReportCleanup(cleanup), (failure) => {
            if (failure !== undefined) {
              cleanupFailures.push(failure);
            }
          }),
        {discard: true},
      ),
    );

    yield* Effect.forEach(
      targets,
      (target) =>
        Effect.map(runNewmanForTarget(target, cleanups), () => {
          completed.push(target);
        }),
      {discard: true},
    ).pipe(
      Effect.ensuring(cleanUp),
      Effect.catchTag("NewmanFailed", (error) => Effect.fail(withCleanupEvidence(error, cleanupFailures))),
    );

    const [first, ...rest] = cleanupFailures;
    if (first !== undefined) {
      return yield* new NewmanFailed({message: first.message, target: first.target, evidence: rest.map((failure) => failure.message)});
    }

    return {targets, completed: [...completed]};
  });
