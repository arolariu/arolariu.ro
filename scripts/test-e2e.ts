/**
 * @fileoverview E2E runner for OpenAPI/Postman collections via Newman.
 * @module scripts/test-e2e
 *
 * @remarks
 * This script executes Postman collections (one per target) using Newman.
 * Auth tokens are injected exclusively via Newman `--env-var` arguments;
 * tracked collection files are never mutated.
 */

import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {resolve} from "node:path";
import {format as formatText, styleText} from "node:util";
import {commanderExitCode, createToolProgram} from "./common/cli.ts";
import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "./common/logger.ts";
import {defaultCommandRunner, type CommandRunner} from "./common/process.ts";

type E2ETestTarget = "frontend" | "backend" | "cv" | "all";
type RunnableTarget = Exclude<E2ETestTarget, "all">;
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

/** Runtime overrides accepted by {@link main} for testing and composition. */
export interface E2ERunOptions {
  /** Command runner used for Newman execution. */
  readonly runner?: CommandRunner;
  /** Working directory used to resolve collection and environment paths. */
  readonly cwd?: string;
  /** Environment variable overrides merged over `process.env`. */
  readonly env?: Readonly<Record<string, string>>;
}

const SENSITIVE_KEY_PATTERN = /(authorization|auth[_-]?token|access[_-]?token|refresh[_-]?token|id[_-]?token|token)/i;
const JWT_REPLACEMENT_PATTERN = /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const JWT_DETECTION_PATTERN = /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/;
const BEARER_JWT_REPLACEMENT_PATTERN = /Bearer\s+eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const BEARER_JWT_DETECTION_PATTERN = /Bearer\s+eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/;

const targetConfigurationMap: Record<RunnableTarget, TargetConfiguration> = {
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

/**
 * Resolves an E2E environment profile from an environment map.
 *
 * @param env - Environment variables to read from.
 * @returns The selected environment profile.
 */
const resolveEnvironmentProfile = (env: Readonly<Record<string, string | undefined>>): EnvironmentProfile => {
  const rawEnvironment = (env["E2E_TEST_ENVIRONMENT"] ?? env["NEWMAN_ENVIRONMENT"] ?? "production").toLowerCase();
  return rawEnvironment === "local" ? "local" : "production";
};

/**
 * Resolves the collection path for a target.
 *
 * @param target - The target to load the collection for.
 * @param cwd - Working directory used to resolve the path.
 * @returns File path to the Postman collection JSON.
 */
const loadOpenAPITestCollectionPath = (target: RunnableTarget, cwd: string): string => {
  const directory = targetConfigurationMap[target].directory;
  return resolve(cwd, directory, "postman-collection.json");
};

/**
 * Resolves the environment path for a target/profile pair.
 *
 * @param target - Target under test.
 * @param profile - Runtime environment profile.
 * @param cwd - Working directory used to resolve the path.
 * @returns File path to the Postman environment JSON.
 */
const loadOpenAPITestEnvironmentPath = (target: RunnableTarget, profile: EnvironmentProfile, cwd: string): string => {
  const directory = targetConfigurationMap[target].directory;
  return resolve(cwd, directory, `postman-environment.${profile}.json`);
};

/**
 * Ensures the report output directory exists.
 *
 * @param dir - Directory path to create.
 * @returns Nothing.
 */
const ensureReportDir = (dir: string, logger: MonorepositoryLogger): void => {
  try {
    mkdirSync(dir, {recursive: true});
    logger.line(styleText("gray", `   📁 Report directory: ${dir}`));
  } catch (e) {
    logger.line(formatText(styleText("red", "   ✗ Failed to create report directory:"), dir, e), "stderr");
  }
};

/**
 * Writes a Markdown summary of Newman assertion failures.
 *
 * @remarks
 * Uses the JSON reporter output (`newman-<target>.json`) to extract failures.
 * This is primarily intended for CI artifact inspection.
 *
 * @param target - Target identifier used in report filenames.
 * @param reportDir - Report directory path.
 * @returns Nothing.
 */
const writeAssertionSummary = (target: string, reportDir: string, logger: MonorepositoryLogger): void => {
  const jsonPath = `${reportDir}/newman-${target}.json`;
  if (!existsSync(jsonPath)) {
    logger.line(styleText("yellow", `   ⚠ JSON report not found, cannot create summary: ${jsonPath}`), "stderr");
    return;
  }
  try {
    const data = JSON.parse(readFileSync(jsonPath, "utf-8")) as NewmanReport;
    const failures = (data.run?.failures ?? []).map((failure) => ({
      assertion: failure.assertion ?? "Unknown assertion",
      error: typeof failure.error === "string" ? failure.error : (failure.error?.message ?? "Unknown error"),
      item: failure.source?.name ?? failure.parent?.name ?? failure.cursor?.scriptId ?? "Unknown",
    }));

    let md = `### Failed Assertions (${target})\n`;
    if (!failures.length) {
      md += "No failed assertions.\n";
      logger.line(styleText("green", `   ✓ No failed assertions for ${target}`));
    } else {
      failures.forEach((failure, index) => {
        md += `${index + 1}. AssertionError  ${failure.assertion}\n   ${failure.error}\n   in "${failure.item}"\n\n`;
      });
      logger.line(styleText("yellow", `   ⚠ ${failures.length} failed assertion(s) for ${target}`));
    }
    writeFileSync(`${reportDir}/newman-${target}-summary.md`, md.trim() + "\n");
    logger.line(styleText("gray", `   📄 Summary written to: ${reportDir}/newman-${target}-summary.md`));
  } catch (e) {
    logger.line(formatText(styleText("red", "   ✗ Error while writing assertion summary:"), e), "stderr");
  }
};

/**
 * Reads a positive integer from environment variables.
 *
 * @param key - Environment variable key.
 * @param fallback - Fallback number if variable is missing/invalid.
 * @returns Parsed positive integer.
 */
const readPositiveIntegerEnv = (key: string, fallback: number, logger: MonorepositoryLogger): number => {
  const rawValue = process.env[key];
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    logger.line(styleText("yellow", `⚠ Invalid ${key}="${rawValue}", using default ${fallback}.`), "stderr");
    return fallback;
  }

  return parsedValue;
};

/**
 * Reads a boolean from environment variables.
 *
 * @param key - Environment variable key.
 * @param fallback - Fallback value.
 * @returns Parsed boolean value.
 */
const readBooleanEnv = (key: string, fallback: boolean, logger: MonorepositoryLogger): boolean => {
  const rawValue = process.env[key];
  if (!rawValue) {
    return fallback;
  }

  const normalizedValue = rawValue.trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalizedValue)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalizedValue)) {
    return false;
  }

  logger.line(styleText("yellow", `⚠ Invalid ${key}="${rawValue}", using default ${fallback}.`), "stderr");
  return fallback;
};

/**
 * Redacts known secret patterns from a string value.
 *
 * @param value - The raw value to sanitize.
 * @param key - The owning object key, when available.
 * @param accumulator - Mutable counter of performed redactions.
 * @returns The sanitized string value.
 */
const redactSensitiveString = (value: string, key: string | null, accumulator: SanitizeAccumulator): string => {
  if (key && SENSITIVE_KEY_PATTERN.test(key) && value.trim().length > 0) {
    accumulator.redactionCount++;
    return "[REDACTED]";
  }

  let sanitizedValue = value;

  const redactedBearerValue = sanitizedValue.replace(BEARER_JWT_REPLACEMENT_PATTERN, "Bearer [REDACTED_JWT]");
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
};

/**
 * Recursively sanitizes JSON-compatible values for secure artifact storage.
 *
 * @param value - The value to sanitize.
 * @param accumulator - Mutable counter of performed redactions.
 * @param key - The owning object key, when available.
 * @returns The sanitized value.
 */
const sanitizeJsonValue = (value: unknown, accumulator: SanitizeAccumulator, key: string | null = null): unknown => {
  if (typeof value === "string") {
    return redactSensitiveString(value, key, accumulator);
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeJsonValue(item, accumulator));
  }

  if (typeof value === "object" && value !== null) {
    const recordValue = value as Record<string, unknown>;
    const sanitizedRecord: Record<string, unknown> = {};

    for (const [entryKey, entryValue] of Object.entries(recordValue)) {
      sanitizedRecord[entryKey] = sanitizeJsonValue(entryValue, accumulator, entryKey);
    }

    return sanitizedRecord;
  }

  return value;
};

/**
 * Sanitizes a Newman JSON report in-place and removes it if redaction safety checks fail.
 *
 * @param jsonPath - Path to the Newman JSON report.
 * @returns Nothing.
 */
const sanitizeNewmanJsonReport = (jsonPath: string, logger: MonorepositoryLogger): void => {
  if (!existsSync(jsonPath)) {
    return;
  }

  try {
    const parsedReport = JSON.parse(readFileSync(jsonPath, "utf-8")) as unknown;
    const accumulator: SanitizeAccumulator = {redactionCount: 0};
    const sanitizedReport = sanitizeJsonValue(parsedReport, accumulator);
    const serializedReport = JSON.stringify(sanitizedReport, null, 2);

    if (BEARER_JWT_DETECTION_PATTERN.test(serializedReport) || JWT_DETECTION_PATTERN.test(serializedReport)) {
      rmSync(jsonPath, {force: true});
      logger.line(styleText("yellow", `   ⚠ Removed unsanitized Newman JSON report due to remaining JWT patterns: ${jsonPath}`), "stderr");
      return;
    }

    writeFileSync(jsonPath, serializedReport, "utf-8");
    logger.line(styleText("gray", `   🔐 Sanitized Newman JSON report (${accumulator.redactionCount} redactions)`));
  } catch (error) {
    rmSync(jsonPath, {force: true});
    logger.line(styleText("yellow", `   ⚠ Failed to sanitize Newman JSON report and removed it: ${jsonPath}`), "stderr");
    logger.line(styleText("gray", `      Reason: ${error instanceof Error ? error.message : String(error)}`), "stderr");
  }
};

/**
 * Runs a Newman collection and produces JSON/JUnit reports.
 *
 * @remarks
 * Throws when Newman exits with a non-zero code.
 *
 * @param target - The target whose collection is being executed.
 * @param collectionPath - Path to the Postman collection JSON.
 * @param environmentPath - Path to the Postman environment JSON.
 * @param reportDir - Directory to write report artifacts.
 * @param logger - Logger used for Newman lifecycle and report output.
 * @param runner - Command runner used for Newman execution.
 * @returns A promise that resolves when execution completes.
 */
const runOpenAPITestCollection = async (
  target: RunnableTarget,
  collectionPath: string,
  environmentPath: string,
  reportDir: string,
  logger: MonorepositoryLogger,
  runner: CommandRunner,
  runtimeAuthToken?: string,
): Promise<void> => {
  logger.line(styleText("cyan", `\n🧪 Running Newman test collection for: ${styleText("bold", target)}`));
  ensureReportDir(reportDir, logger);
  const jsonPath = `${reportDir}/newman-${target}.json`;
  const junitPath = `${reportDir}/newman-${target}.xml`;
  const collectionTimeout = readPositiveIntegerEnv("NEWMAN_TIMEOUT", 600_000, logger);
  const requestTimeout = readPositiveIntegerEnv("NEWMAN_TIMEOUT_REQUEST", 30_000, logger);
  const scriptTimeout = readPositiveIntegerEnv("NEWMAN_TIMEOUT_SCRIPT", 10_000, logger);
  const strictMode = readBooleanEnv("NEWMAN_STRICT_MODE", false, logger);

  logger.line(styleText("gray", `   📦 Collection path: ${collectionPath}`));
  logger.line(styleText("gray", `   🌍 Environment path: ${environmentPath}`));
  logger.line(styleText("gray", `   📊 JSON report: ${jsonPath}`));
  logger.line(styleText("gray", `   📊 JUnit report: ${junitPath}`));
  logger.line(styleText("gray", `   ⏱ Timeout: ${collectionTimeout}ms (request: ${requestTimeout}ms, script: ${scriptTimeout}ms)`));
  logger.line(styleText("gray", `   🚦 Strict mode (--bail): ${strictMode}`));
  logger.line(styleText("cyan", `\n⚡ Executing tests...\n`));

  try {
    const args = [
      "newman",
      "run",
      collectionPath,
      "--environment",
      environmentPath,
      ...(runtimeAuthToken === undefined ? [] : ["--env-var", `authToken=${runtimeAuthToken}`]),
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
    const result = await runner.run({command: "npx", args}, {output: "inherit"});
    if (result.code !== 0) {
      throw new Error(result.spawnError ?? `Newman exited with code ${result.code}.`);
    }
    logger.line(styleText("green", `\n   ✓ Newman tests passed for ${target}`));
  } catch (error) {
    logger.line(styleText("red", `\n   ✗ Newman tests failed for ${target}`), "stderr");
    throw error;
  } finally {
    try {
      logger.line(styleText("cyan", `\n📝 Generating assertion summary...`));
      writeAssertionSummary(target, reportDir, logger);
    } catch (e) {
      logger.line(formatText(styleText("red", "   ✗ Failed generating assertion summary:"), e), "stderr");
    }

    try {
      sanitizeNewmanJsonReport(jsonPath, logger);
    } catch (e) {
      logger.line(formatText(styleText("red", "   ✗ Failed sanitizing Newman JSON report:"), e), "stderr");
    }
  }
};

/**
 * Runs the Newman testing flow for a specific target.
 *
 * @remarks
 * Token behavior is target-specific:
 * - backend: required
 * - frontend: optional
 * - cv: ignored
 *
 * @param target - The target to run Newman tests for.
 * @param logger - Target-specific child logger.
 * @param runner - Command runner used for Newman execution.
 * @param cwd - Working directory for path resolution.
 * @param env - Environment variable overrides.
 * @returns A promise that resolves when the flow completes.
 */
const startNewmanTesting = async (
  target: RunnableTarget,
  logger: MonorepositoryLogger,
  runner: CommandRunner,
  cwd: string,
  env: Readonly<Record<string, string | undefined>>,
): Promise<void> => {
  logger.line(styleText(["bold", "magenta"], `\n╔════════════════════════════════════════╗`));
  logger.line(styleText(["bold", "magenta"], `║   E2E Testing: ${target.padEnd(23)} ║`));
  logger.line(styleText(["bold", "magenta"], `╚════════════════════════════════════════╝`));

  const targetConfiguration = targetConfigurationMap[target];
  const collectionPath = loadOpenAPITestCollectionPath(target, cwd);
  const environmentProfile = resolveEnvironmentProfile(env);
  const environmentPath = loadOpenAPITestEnvironmentPath(target, environmentProfile, cwd);
  const authToken = (env["E2E_TEST_AUTH_TOKEN"] ?? "").trim();
  const reportDir = env["NEWMAN_REPORT_DIR"] || "e2e-logs";

  if (!existsSync(collectionPath)) {
    throw new Error(`Collection file not found: ${collectionPath}`);
  }

  if (!existsSync(environmentPath)) {
    throw new Error(`Environment file not found: ${environmentPath}`);
  }

  if (targetConfiguration.authPolicy === "required" && authToken.length === 0) {
    throw new Error(`E2E_TEST_AUTH_TOKEN environment variable is required for ${target}.`);
  }

  if (targetConfiguration.authPolicy === "optional" && authToken.length === 0) {
    logger.line(styleText("yellow", `⚠ E2E_TEST_AUTH_TOKEN is not set. Continuing ${target} run without auth token injection.`), "stderr");
  }

  if (targetConfiguration.authPolicy === "ignored" && authToken.length > 0) {
    logger.line(styleText("gray", `ℹ ${target} does not require auth token; skipping auth injection.`));
  }

  const shouldPassAuthToken = targetConfiguration.authPolicy !== "ignored" && authToken.length > 0;

  // Register the token for redaction before any command construction or logging.
  if (authToken.length > 0) {
    logger.redact(authToken);
  }

  logger.line(styleText("cyan", `\n📦 Target: ${styleText("bold", target)} (${targetConfiguration.label})`));
  logger.line(styleText("gray", `   Collection: ${collectionPath}`));
  logger.line(styleText("gray", `   Environment: ${environmentPath} (${environmentProfile})`));
  logger.line(styleText("gray", `   Reports: ${reportDir}`));

  await runOpenAPITestCollection(
    target,
    collectionPath,
    environmentPath,
    reportDir,
    logger.child("newman"),
    runner,
    shouldPassAuthToken ? authToken : undefined,
  );

  logger.line(styleText(["bold", "green"], `\n✅ Completed Newman tests for: ${target}\n`));
};

/**
 * Runs the E2E CLI.
 *
 * @remarks
 * This is the script entrypoint used by `npm run test:e2e`.
 *
 * @param arg - Target selector (`frontend`, `backend`, `cv`, `all`) or help flag.
 * @param logger - Optional logger used for E2E output and target child contexts.
 * @param options - Optional runtime overrides for runner, working directory, and environment.
 * @returns Process exit code (0 for success, non-zero for failure).
 */
export async function main(arg?: string, logger?: MonorepositoryLogger, options?: Readonly<E2ERunOptions>): Promise<number> {
  const output = logger ?? new MonorepositoryConsoleLogger("test::e2e");
  const runner = options?.runner ?? defaultCommandRunner;
  const cwd = options?.cwd ?? process.cwd();
  const env: Readonly<Record<string, string | undefined>> = options?.env ?? process.env;

  const program = createToolProgram({
    name: "test:e2e",
    description: "Run E2E tests for arolariu.ro targets using Newman.",
    usage: "<target>",
    examples: ["npm run test:e2e -- backend", "npm run test:e2e -- frontend", "npm run test:e2e -- cv", "npm run test:e2e -- all"],
    logger: output,
  });

  program.argument("<target>", "Target to test", (value: string) => {
    const valid: readonly string[] = ["all", "backend", "frontend", "cv"];
    if (!valid.includes(value)) {
      throw new Error(`Invalid target "${value}". Valid targets: ${valid.join(", ")}`);
    }
    return value as E2ETestTarget;
  });

  let parsedTarget: E2ETestTarget | undefined;
  try {
    program.action((target: E2ETestTarget) => {
      parsedTarget = target;
    });
    program.parse(arg === undefined ? process.argv : ["node", "test:e2e", arg]);
  } catch (error: unknown) {
    const exitCode = commanderExitCode(error);
    if (exitCode !== null) {
      return exitCode;
    }
    output.line(styleText("red", `✗ ${error instanceof Error ? error.message : String(error)}`), "stderr");
    return 1;
  }

  if (parsedTarget === undefined) {
    return 1;
  }

  output.line(styleText(["bold", "magenta"], "\n╔════════════════════════════════════════╗"));
  output.line(styleText(["bold", "magenta"], "║   arolariu.ro E2E Test Runner          ║"));
  output.line(styleText(["bold", "magenta"], "╚════════════════════════════════════════╝\n"));

  try {
    switch (parsedTarget) {
      case "frontend":
        await startNewmanTesting("frontend", output.child("frontend"), runner, cwd, env);
        break;
      case "backend":
        await startNewmanTesting("backend", output.child("backend"), runner, cwd, env);
        break;
      case "cv":
        await startNewmanTesting("cv", output.child("cv"), runner, cwd, env);
        break;
      case "all":
        output.section("Running all E2E tests", "🎯");
        await startNewmanTesting("frontend", output.child("frontend"), runner, cwd, env);
        output.line(styleText("gray", "\n─────────────────────────────────────────────────\n"));
        await startNewmanTesting("backend", output.child("backend"), runner, cwd, env);
        output.line(styleText("gray", "\n─────────────────────────────────────────────────\n"));
        await startNewmanTesting("cv", output.child("cv"), runner, cwd, env);
        break;
    }

    output.line(styleText(["bold", "green"], "\n🎉 All E2E tests completed successfully!\n"));
    return 0;
  } catch (error) {
    output.line(styleText(["bold", "red"], "\n❌ E2E tests failed with errors\n"), "stderr");
    return 1;
  }
}

if (import.meta.main) {
  const output = new MonorepositoryConsoleLogger("test::e2e");
  const arg = process.argv[2];
  main(arg, output)
    .then((code) => process.exit(code))
    .catch((err) => {
      output.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
      process.exit(1);
    });
}
