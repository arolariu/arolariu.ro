/**
 * @fileoverview E2E runner command for OpenAPI/Postman collections via Newman.
 * @module scripts/test-e2e
 *
 * @remarks
 * Runs Postman collections (one per target) through Newman. Auth tokens are injected exclusively
 * via a Newman `--env-var authToken=...` argument; tracked collection and environment files are
 * never mutated. Every filesystem, process, and cancellation concern flows through the injected
 * {@link CommandExecutionContext.runtime} instead of `node:fs`, a bespoke command runner, or ambient
 * `process` state, so the whole pipeline is exercised deterministically by the declarative
 * command runtime's test fakes.
 *
 * Each target registers its own report-cleanup work (assertion-summary generation, then JSON,
 * JUnit, and summary sanitization, in that order) with `runtime.cleanup` immediately before its
 * Newman invocation. Cleanup always attempts every registered step, even after an earlier step
 * failed, and a Newman failure keeps its own `ProcessRunnerError` as the primary failure: a later
 * sanitization failure is appended as cleanup evidence, never replacing it. When Newman succeeds
 * but a report step fails, the command itself is reported as failed.
 */

import {join, resolve} from "node:path";
import {CommandInputError, type CommandExecutionContext} from "./core/command/command-execution.ts";
import {defineCommand, type LazyMonorepoCommand} from "./core/command/lazy-monorepo-command.ts";
import type {CommandConstructionOptions, CommandHost} from "./core/command/command-specification.ts";
import type {TerminalPresenter} from "./core/presentation/terminal-presenter.ts";
import {ProcessRunnerError} from "./core/process/process-runner.ts";
import {commandCancellationFromSignal, type FileSystem} from "./common/runtime.ts";

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

/**
 * Validates a target value, whether it originated from Commander parsing or a programmatic
 * `invoke()` call.
 *
 * @remarks
 * `invoke()` bypasses `decode()`, so this is the only validation point for programmatic input;
 * `decode()` calls it too so both entry points share one source of truth.
 *
 * @param target - Candidate target value.
 * @returns The validated target.
 * @throws {CommandInputError} When `target` is not `all`, `backend`, `frontend`, or `cv`.
 */
function requireValidTarget(target: string): E2ETarget {
  if (target === "all" || target === "backend" || target === "frontend" || target === "cv") {
    return target;
  }

  throw new CommandInputError(`Invalid target "${target}". Valid targets: all, backend, frontend, cv.`);
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
 * @param logger - Logger for diagnostic output.
 * @param env - Environment map to read from.
 * @returns Parsed positive integer.
 */
function readPositiveIntegerEnv(
  key: string,
  fallback: number,
  logger: TerminalPresenter,
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
 * @param logger - Logger for diagnostic output.
 * @param env - Environment map to read from.
 * @returns Parsed boolean value.
 */
function readBooleanEnv(
  key: string,
  fallback: boolean,
  logger: TerminalPresenter,
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

/**
 * Best-effort removal used to make an artifact safe after it could not be sanitized in place.
 *
 * @param files - Injected filesystem capability.
 * @param path - Path of the artifact to remove.
 */
async function safeRemoveArtifact(files: FileSystem, path: string): Promise<void> {
  try {
    await files.remove(path, {force: true});
  } catch {
    // Best-effort: a failed safety removal does not further block report cleanup.
  }
}

/**
 * Writes a Markdown summary of Newman assertion failures from the (still unsanitized) JSON
 * reporter output.
 *
 * @remarks
 * Missing JSON reporter output is a no-op: Newman may not have produced it (for example, a
 * spawn failure). Reads the JSON report before {@link sanitizeNewmanJsonReport} runs so the
 * summary reflects genuine assertion detail.
 *
 * @param files - Injected filesystem capability.
 * @param target - Target identifier used in report filenames.
 * @param reportDir - Report directory path.
 * @param logger - Logger used for diagnostic output.
 * @throws When the JSON report exists but cannot be parsed.
 */
export async function writeAssertionSummary(
  files: FileSystem,
  target: string,
  reportDir: string,
  logger: TerminalPresenter,
): Promise<void> {
  const jsonPath = join(reportDir, `newman-${target}.json`);
  if (!(await files.exists(jsonPath))) {
    logger.warn(`JSON report not found, cannot create summary: ${jsonPath}`);
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
    logger.success(`No failed assertions for ${target}.`);
  } else {
    failures.forEach((failure, index) => {
      markdown += `${String(index + 1)}. AssertionError  ${failure.assertion}\n   ${failure.error}\n   in "${failure.item}"\n\n`;
    });
    logger.warn(`${String(failures.length)} failed assertion(s) for ${target}.`);
  }

  const summaryPath = join(reportDir, `newman-${target}-summary.md`);
  await files.writeText(summaryPath, markdown.trim() + "\n");
  logger.info(`Summary written to: ${summaryPath}`);
}

/**
 * Sanitizes a Newman JSON report in place and removes it if redaction safety checks fail.
 *
 * @remarks
 * A missing report is a no-op. A read/parse failure removes the artifact (there is nothing safe
 * left to keep) and throws. When the sanitized document would still contain a JWT-shaped pattern,
 * removing the artifact is successful sanitization, not a failure.
 *
 * @param files - Injected filesystem capability.
 * @param jsonPath - Path to the Newman JSON report.
 * @param logger - Logger used for diagnostic output.
 * @param runtimeAuthToken - Optional runtime auth token to redact from every string leaf.
 * @throws When the existing report cannot be parsed or the sanitized document cannot be written.
 */
export async function sanitizeNewmanJsonReport(
  files: FileSystem,
  jsonPath: string,
  logger: TerminalPresenter,
  runtimeAuthToken?: string,
): Promise<void> {
  if (!(await files.exists(jsonPath))) {
    return;
  }

  let parsedReport: unknown;
  try {
    parsedReport = JSON.parse(await files.readText(jsonPath));
  } catch (error: unknown) {
    await safeRemoveArtifact(files, jsonPath);
    throw new Error(`Failed to parse Newman JSON report, removed it: ${jsonPath} (${describeError(error)})`);
  }

  const accumulator: SanitizeAccumulator = {redactionCount: 0};
  const sanitizedReport = sanitizeJsonValue(parsedReport, accumulator, null, runtimeAuthToken);
  const serializedReport = JSON.stringify(sanitizedReport, null, 2);

  if (BEARER_JWT_DETECTION_PATTERN.test(serializedReport) || JWT_DETECTION_PATTERN.test(serializedReport)) {
    await files.remove(jsonPath, {force: true});
    logger.warn(`Removed unsanitized Newman JSON report due to remaining JWT patterns: ${jsonPath}`);
    return;
  }

  try {
    await files.writeText(jsonPath, serializedReport);
  } catch (error: unknown) {
    await safeRemoveArtifact(files, jsonPath);
    throw new Error(`Failed to write sanitized Newman JSON report, removed it: ${jsonPath} (${describeError(error)})`);
  }

  logger.info(`Sanitized Newman JSON report (${String(accumulator.redactionCount)} redaction(s)): ${jsonPath}`);
}

/**
 * Sanitizes a text-based report (JUnit XML, Markdown summary) by removing JWT patterns and the
 * exact runtime auth token.
 *
 * @remarks
 * A missing report is a no-op. A read/write failure removes the artifact and throws. When the
 * sanitized content would still contain a JWT-shaped pattern, removing the artifact is successful
 * sanitization, not a failure.
 *
 * @param files - Injected filesystem capability.
 * @param filePath - Path to the text report.
 * @param logger - Logger used for diagnostic output.
 * @param runtimeAuthToken - Optional runtime auth token to redact by exact match.
 * @throws When the existing report cannot be read or the sanitized content cannot be written.
 */
export async function sanitizeNewmanTextReport(
  files: FileSystem,
  filePath: string,
  logger: TerminalPresenter,
  runtimeAuthToken?: string,
): Promise<void> {
  if (!(await files.exists(filePath))) {
    return;
  }

  let content: string;
  try {
    content = await files.readText(filePath);
  } catch (error: unknown) {
    await safeRemoveArtifact(files, filePath);
    throw new Error(`Failed to read text report, removed it: ${filePath} (${describeError(error)})`);
  }

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
    await files.remove(filePath, {force: true});
    logger.warn(`Removed unsanitized text report due to remaining JWT patterns: ${filePath}`);
    return;
  }

  try {
    await files.writeText(filePath, content);
  } catch (error: unknown) {
    await safeRemoveArtifact(files, filePath);
    throw new Error(`Failed to write sanitized text report, removed it: ${filePath} (${describeError(error)})`);
  }

  if (redactionCount > 0) {
    logger.info(`Sanitized text report (${String(redactionCount)} redaction pass(es)): ${filePath}`);
  }
}

/**
 * Runs every target report-cleanup step in the required order, attempting every step even after
 * an earlier one fails.
 *
 * @remarks
 * Order: assertion-summary generation, JSON sanitization, JUnit sanitization, summary
 * sanitization. Every failing step contributes its own message; if any step failed, the aggregate
 * is thrown once every step has been attempted.
 *
 * @param files - Injected filesystem capability.
 * @param target - Target identifier used in report filenames.
 * @param reportDir - Report directory path.
 * @param logger - Logger used for diagnostic output.
 * @param runtimeAuthToken - Optional runtime auth token to redact by exact match.
 * @throws When one or more report-cleanup steps failed.
 */
async function performReportCleanup(
  files: FileSystem,
  target: RunnableE2ETarget,
  reportDir: string,
  logger: TerminalPresenter,
  runtimeAuthToken: string | undefined,
): Promise<void> {
  const jsonPath = join(reportDir, `newman-${target}.json`);
  const junitPath = join(reportDir, `newman-${target}.xml`);
  const summaryPath = join(reportDir, `newman-${target}-summary.md`);
  const failures: string[] = [];

  try {
    await writeAssertionSummary(files, target, reportDir, logger);
  } catch (error: unknown) {
    failures.push(`assertion summary: ${describeError(error)}`);
  }

  try {
    await sanitizeNewmanJsonReport(files, jsonPath, logger, runtimeAuthToken);
  } catch (error: unknown) {
    failures.push(`JSON report sanitization: ${describeError(error)}`);
  }

  try {
    await sanitizeNewmanTextReport(files, junitPath, logger, runtimeAuthToken);
  } catch (error: unknown) {
    failures.push(`JUnit report sanitization: ${describeError(error)}`);
  }

  try {
    await sanitizeNewmanTextReport(files, summaryPath, logger, runtimeAuthToken);
  } catch (error: unknown) {
    failures.push(`summary sanitization: ${describeError(error)}`);
  }

  if (failures.length > 0) {
    throw new Error(`Report cleanup failed for ${target}:\n${failures.join("\n")}`);
  }
}

/**
 * Runs the Newman testing flow for a single target: resolves paths, validates the auth-token
 * policy, registers report cleanup, and runs Newman.
 *
 * @remarks
 * Token behavior is target-specific: `backend` requires a token, `frontend` accepts one
 * optionally, and `cv` never transports one. Whenever a token is present it is registered with
 * the logger for redaction before any command is constructed or logged. Report-cleanup work is
 * registered with `runtime.cleanup` immediately before the Newman invocation, so it always runs
 * during this invocation's cleanup drain regardless of how the Newman run itself concludes.
 *
 * @param context - Command context providing filesystem, process runner, cleanup, and cancellation.
 * @param target - The target to run Newman tests for.
 * @param cwd - Working directory used to resolve collection, environment, and report paths.
 * @throws When the collection or environment file is missing, a required auth token is absent, or
 * Newman does not succeed.
 */
async function runNewmanForTarget(context: Readonly<CommandExecutionContext>, target: RunnableE2ETarget, cwd: string): Promise<void> {
  const {files, runner, signal, cleanup, environment} = context.runtime;
  const env = environment.variables;
  const logger = context.runtime.presenter.child(target);
  const config = targetConfigurationMap[target];

  const collectionPath = resolve(cwd, config.directory, "postman-collection.json");
  const profile = resolveEnvironmentProfile(env);
  const environmentPath = resolve(cwd, config.directory, `postman-environment.${profile}.json`);

  if (!(await files.exists(collectionPath))) {
    throw new Error(`Collection file not found: ${collectionPath}`);
  }
  if (!(await files.exists(environmentPath))) {
    throw new Error(`Environment file not found: ${environmentPath}`);
  }

  const authToken = (env["E2E_TEST_AUTH_TOKEN"] ?? "").trim();
  if (config.authPolicy === "required" && authToken.length === 0) {
    throw new Error(`E2E_TEST_AUTH_TOKEN environment variable is required for ${target}.`);
  }
  if (config.authPolicy === "optional" && authToken.length === 0) {
    logger.warn(`E2E_TEST_AUTH_TOKEN is not set. Continuing ${target} run without auth token injection.`);
  }
  if (config.authPolicy === "ignored" && authToken.length > 0) {
    logger.info(`${target} does not require auth token; skipping auth injection.`);
  }

  const shouldPassAuthToken = config.authPolicy !== "ignored" && authToken.length > 0;

  // Register the token for redaction before any command construction, diagnostics, or cleanup
  // evidence retains it.
  if (authToken.length > 0) {
    logger.redact(authToken);
  }

  logger.section(`E2E Testing: ${target}`, "🧪");
  logger.line(`Collection: ${collectionPath}`);
  logger.line(`Environment: ${environmentPath} (${profile})`);

  const rawReportDir = env["NEWMAN_REPORT_DIR"] === undefined || env["NEWMAN_REPORT_DIR"] === "" ? "e2e-logs" : env["NEWMAN_REPORT_DIR"];
  const reportDir = resolve(cwd, rawReportDir);
  try {
    await files.createDirectory(reportDir, {recursive: true});
  } catch (error: unknown) {
    logger.warn(`Failed to create report directory: ${reportDir} (${describeError(error)})`);
  }

  const jsonPath = join(reportDir, `newman-${target}.json`);
  const junitPath = join(reportDir, `newman-${target}.xml`);
  const collectionTimeout = readPositiveIntegerEnv("NEWMAN_TIMEOUT", 600_000, logger, env);
  const requestTimeout = readPositiveIntegerEnv("NEWMAN_TIMEOUT_REQUEST", 30_000, logger, env);
  const scriptTimeout = readPositiveIntegerEnv("NEWMAN_TIMEOUT_SCRIPT", 10_000, logger, env);
  const strictMode = readBooleanEnv("NEWMAN_STRICT_MODE", false, logger, env);

  logger.line(`JSON report: ${jsonPath}`);
  logger.line(`JUnit report: ${junitPath}`);
  logger.line(`Timeout: ${String(collectionTimeout)}ms (request: ${String(requestTimeout)}ms, script: ${String(scriptTimeout)}ms)`);
  logger.line(`Strict mode (--bail): ${String(strictMode)}`);

  // Registered before the Newman launch so cleanup always runs the report work for this target,
  // regardless of how the Newman invocation below concludes.
  cleanup.register(`e2e report cleanup (${target})`, () =>
    performReportCleanup(files, target, reportDir, logger, shouldPassAuthToken ? authToken : undefined),
  );

  const args = [
    "newman",
    "run",
    collectionPath,
    "--environment",
    environmentPath,
    ...(shouldPassAuthToken ? ["--env-var", `authToken=${authToken}`] : []),
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

  try {
    await runner.expectSuccess({command: "npx", args}, {cwd, output: "inherit", signal, presenter: logger});
  } catch (error: unknown) {
    if (error instanceof ProcessRunnerError && error.result.kind === "cancelled" && signal.aborted) {
      throw commandCancellationFromSignal(signal);
    }

    throw error;
  }

  logger.success(`Completed Newman tests for: ${target}`);
}

/**
 * Runs the E2E command's business logic: expands `all` into {@link EXECUTION_ORDER}, then runs
 * every target sequentially so an earlier target's report cleanup is registered, and a later
 * target's failure never starts a target that has not been reached yet.
 *
 * @param context - Command context providing every runtime capability.
 * @param input - Typed command input.
 * @returns The expanded target list and every target that completed before this invocation ended.
 * @throws {CommandInputError} When `input.target` is invalid (guards a programmatic `invoke()`
 * call, which never runs through `decode()`).
 * @throws When any target's Newman run does not succeed.
 */
async function executeE2e(context: Readonly<CommandExecutionContext>, input: Readonly<E2EInput>): Promise<E2EResult> {
  const {tasks, signal, environment, presenter: logger} = context.runtime;
  const validatedTarget = requireValidTarget(input.target);
  const targets: readonly RunnableE2ETarget[] = validatedTarget === "all" ? [...EXECUTION_ORDER] : [validatedTarget];
  const completed: RunnableE2ETarget[] = [];

  logger.section("arolariu.ro E2E Test Runner", "🎯");

  await tasks.sequential(
    targets.map((target) => async () => {
      await runNewmanForTarget(context, target, environment.cwd);
      completed.push(target);
    }),
    signal,
  );

  return {targets, completed};
}

/** The only edge from this entrypoint into the Node command host; core never names it. */
const loadProductionCommandHost = async (): Promise<CommandHost> =>
  import("./adapters/node/node-command-host.ts").then(({createNodeCommandHost}) => createNodeCommandHost("test:e2e"));

/**
 * Creates the E2E command.
 *
 * @param options - Injected command host or literal loader; defaults to the Node adapter.
 * @returns The typed `test:e2e` command object.
 */
export function createE2eCommand(
  options: Readonly<CommandConstructionOptions> = {loadHost: loadProductionCommandHost},
): LazyMonorepoCommand<E2EInput, E2EResult, never> {
  return defineCommand<E2EInput, E2EResult>(
    {
      name: "test:e2e",
      description: "Runs Postman/Newman E2E tests for arolariu.ro targets.",
      usage: "<target>",
      examples: ["npm run test:e2e -- backend", "npm run test:e2e -- frontend", "npm run test:e2e -- cv", "npm run test:e2e -- all"],
      configure: (program) => {
        program.argument("<target>", "Target to test: all, backend, frontend, or cv.").allowExcessArguments(false);
      },
      decode: (program) => {
        const [rawTarget] = program.args as [string | undefined];
        return {target: requireValidTarget(rawTarget ?? "")};
      },
      execute: (context, input) => executeE2e(context, input),
      complete: (result) => ({
        exitCode: 0,
        value: result,
        human: (logger) => {
          logger.success(
            `Completed ${String(result.completed.length)} of ${String(result.targets.length)} E2E target(s): ${result.completed.join(", ")}.`,
          );
        },
      }),
    },
    options,
  );
}

/** Production singleton used by `npm run test:e2e` and this module's direct entrypoint. */
export const e2eCommand: LazyMonorepoCommand<E2EInput, E2EResult, never> = createE2eCommand();

await e2eCommand.runIfMain(import.meta.url);
