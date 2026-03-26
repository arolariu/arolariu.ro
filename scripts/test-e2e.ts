/**
 * @fileoverview E2E runner for OpenAPI/Postman collections via Newman.
 * @module scripts/test-e2e
 *
 * @remarks
 * This script executes Postman collections (one per target) using Newman.
 * It keeps `injectAuthTokenIntoCollection` as the auth injection strategy,
 * while guaranteeing collection restoration after every run.
 */

import {execSync} from "node:child_process";
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {styleText} from "node:util";

type E2ETestTarget = "frontend" | "backend" | "cv" | "all";
type RunnableTarget = Exclude<E2ETestTarget, "all">;
type AuthPolicy = "required" | "optional" | "ignored";
type EnvironmentProfile = "local" | "production";

interface TargetConfiguration {
  readonly authPolicy: AuthPolicy;
  readonly directory: string;
  readonly label: string;
}

interface CollectionVariable {
  readonly key: string;
  readonly type?: string;
  value: string;
}

interface PostmanCollectionDocument {
  variable?: CollectionVariable[];
  readonly [key: string]: unknown;
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
 * Injects an authentication token into a Postman collection JSON file.
 *
 * @remarks
 * Newman collections may store variables under `collection.variable`.
 * This function ensures an `authToken` variable exists and is set.
 *
 * @param collectionPath - File path to the Postman collection JSON file.
 * @param token - Authentication token to inject.
 * @returns Nothing.
 */
const injectAuthTokenIntoCollection = (collectionPath: string, token: string): void => {
  console.log(styleText("cyan", `\n🔑 Injecting auth token into collection...`));
  console.log(styleText("gray", `   Path: ${collectionPath}`));

  const parsedCollection = JSON.parse(readFileSync(collectionPath, "utf-8")) as unknown;
  if (typeof parsedCollection !== "object" || parsedCollection === null) {
    throw new TypeError(`Collection at ${collectionPath} is not a valid JSON object.`);
  }

  const collection = parsedCollection as PostmanCollectionDocument;
  const collectionVariables = Array.isArray(collection.variable) ? collection.variable : [];
  const authTokenVariable = collectionVariables.find((variable) => variable.key === "authToken");

  if (authTokenVariable) {
    authTokenVariable.value = token;
  } else {
    collectionVariables.push({key: "authToken", type: "string", value: token});
  }

  collection.variable = collectionVariables;
  writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
  console.log(styleText("green", `   ✓ Auth token injected successfully`));
};

/**
 * Restores a collection file to its exact original content.
 *
 * @param collectionPath - File path to the Postman collection JSON file.
 * @param originalContent - Original content captured before mutation.
 * @returns Nothing.
 */
const restoreCollectionContent = (collectionPath: string, originalContent: string): void => {
  writeFileSync(collectionPath, originalContent, "utf-8");
  const restoredContent = readFileSync(collectionPath, "utf-8");

  if (restoredContent !== originalContent) {
    throw new Error(`Collection restore verification failed for ${collectionPath}.`);
  }

  console.log(styleText("green", `   ✓ Collection restored to original content`));
};

/**
 * Resolves an E2E environment profile from process environment.
 *
 * @returns The selected environment profile.
 */
const resolveEnvironmentProfile = (): EnvironmentProfile => {
  const rawEnvironment = (process.env["E2E_TEST_ENVIRONMENT"] ?? process.env["NEWMAN_ENVIRONMENT"] ?? "production").toLowerCase();
  return rawEnvironment === "local" ? "local" : "production";
};

/**
 * Resolves the collection path for a target.
 *
 * @param target - The target to load the collection for.
 * @returns File path to the Postman collection JSON.
 */
const loadOpenAPITestCollectionPath = (target: RunnableTarget): string => {
  const directory = targetConfigurationMap[target].directory;
  return `${directory}/postman-collection.json`;
};

/**
 * Resolves the environment path for a target/profile pair.
 *
 * @param target - Target under test.
 * @param profile - Runtime environment profile.
 * @returns File path to the Postman environment JSON.
 */
const loadOpenAPITestEnvironmentPath = (target: RunnableTarget, profile: EnvironmentProfile): string => {
  const directory = targetConfigurationMap[target].directory;
  return `${directory}/postman-environment.${profile}.json`;
};

/**
 * Ensures the report output directory exists.
 *
 * @param dir - Directory path to create.
 * @returns Nothing.
 */
const ensureReportDir = (dir: string): void => {
  try {
    mkdirSync(dir, {recursive: true});
    console.log(styleText("gray", `   📁 Report directory: ${dir}`));
  } catch (e) {
    console.error(styleText("red", "   ✗ Failed to create report directory:"), dir, e);
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
const writeAssertionSummary = (target: string, reportDir: string): void => {
  const jsonPath = `${reportDir}/newman-${target}.json`;
  if (!existsSync(jsonPath)) {
    console.warn(styleText("yellow", `   ⚠ JSON report not found, cannot create summary: ${jsonPath}`));
    return;
  }
  try {
    const data = JSON.parse(readFileSync(jsonPath, "utf-8")) as NewmanReport;
    const failures = (data.run?.failures ?? []).map((failure) => ({
      assertion: failure.assertion ?? "Unknown assertion",
      error:
        typeof failure.error === "string"
          ? failure.error
          : (failure.error?.message ?? "Unknown error"),
      item: failure.source?.name ?? failure.parent?.name ?? failure.cursor?.scriptId ?? "Unknown",
    }));

    let md = `### Failed Assertions (${target})\n`;
    if (!failures.length) {
      md += "No failed assertions.\n";
      console.log(styleText("green", `   ✓ No failed assertions for ${target}`));
    } else {
      failures.forEach((failure, index) => {
        md += `${index + 1}. AssertionError  ${failure.assertion}\n   ${failure.error}\n   in "${failure.item}"\n\n`;
      });
      console.log(styleText("yellow", `   ⚠ ${failures.length} failed assertion(s) for ${target}`));
    }
    writeFileSync(`${reportDir}/newman-${target}-summary.md`, md.trim() + "\n");
    console.log(styleText("gray", `   📄 Summary written to: ${reportDir}/newman-${target}-summary.md`));
  } catch (e) {
    console.error(styleText("red", "   ✗ Error while writing assertion summary:"), e);
  }
};

/**
 * Reads a positive integer from environment variables.
 *
 * @param key - Environment variable key.
 * @param fallback - Fallback number if variable is missing/invalid.
 * @returns Parsed positive integer.
 */
const readPositiveIntegerEnv = (key: string, fallback: number): number => {
  const rawValue = process.env[key];
  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    console.warn(styleText("yellow", `⚠ Invalid ${key}="${rawValue}", using default ${fallback}.`));
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
const readBooleanEnv = (key: string, fallback: boolean): boolean => {
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

  console.warn(styleText("yellow", `⚠ Invalid ${key}="${rawValue}", using default ${fallback}.`));
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
const redactSensitiveString = (
  value: string,
  key: string | null,
  accumulator: SanitizeAccumulator,
): string => {
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
const sanitizeJsonValue = (
  value: unknown,
  accumulator: SanitizeAccumulator,
  key: string | null = null,
): unknown => {
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
const sanitizeNewmanJsonReport = (jsonPath: string): void => {
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
      console.warn(styleText("yellow", `   ⚠ Removed unsanitized Newman JSON report due to remaining JWT patterns: ${jsonPath}`));
      return;
    }

    writeFileSync(jsonPath, serializedReport, "utf-8");
    console.log(styleText("gray", `   🔐 Sanitized Newman JSON report (${accumulator.redactionCount} redactions)`));
  } catch (error) {
    rmSync(jsonPath, {force: true});
    console.warn(styleText("yellow", `   ⚠ Failed to sanitize Newman JSON report and removed it: ${jsonPath}`));
    console.warn(styleText("gray", `      Reason: ${error instanceof Error ? error.message : String(error)}`));
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
 * @param runtimeAuthToken - Optional runtime auth token passed as Newman env-var.
 * @returns A promise that resolves when execution completes.
 */
const runOpenAPITestCollection = async (
  target: RunnableTarget,
  collectionPath: string,
  environmentPath: string,
  reportDir: string,
  runtimeAuthToken?: string,
): Promise<void> => {
  console.log(styleText("cyan", `\n🧪 Running Newman test collection for: ${styleText("bold", target)}`));
  ensureReportDir(reportDir);
  const jsonPath = `${reportDir}/newman-${target}.json`;
  const junitPath = `${reportDir}/newman-${target}.xml`;
  const collectionTimeout = readPositiveIntegerEnv("NEWMAN_TIMEOUT", 600_000);
  const requestTimeout = readPositiveIntegerEnv("NEWMAN_TIMEOUT_REQUEST", 30_000);
  const scriptTimeout = readPositiveIntegerEnv("NEWMAN_TIMEOUT_SCRIPT", 10_000);
  const strictMode = readBooleanEnv("NEWMAN_STRICT_MODE", false);

  console.log(styleText("gray", `   📦 Collection path: ${collectionPath}`));
  console.log(styleText("gray", `   🌍 Environment path: ${environmentPath}`));
  console.log(styleText("gray", `   📊 JSON report: ${jsonPath}`));
  console.log(styleText("gray", `   📊 JUnit report: ${junitPath}`));
  console.log(styleText("gray", `   ⏱ Timeout: ${collectionTimeout}ms (request: ${requestTimeout}ms, script: ${scriptTimeout}ms)`));
  console.log(styleText("gray", `   🚦 Strict mode (--bail): ${strictMode}`));
  console.log(styleText("cyan", `\n⚡ Executing tests...\n`));

  try {
    const commandParts = [
      `npx newman run "${collectionPath}"`,
      `--environment "${environmentPath}"`,
      runtimeAuthToken ? `--env-var "authToken=${runtimeAuthToken}"` : "",
      "--reporters cli,json,junit",
      `--reporter-json-export "${jsonPath}"`,
      `--reporter-junit-export "${junitPath}"`,
      `--timeout ${collectionTimeout}`,
      `--timeout-request ${requestTimeout}`,
      `--timeout-script ${scriptTimeout}`,
      strictMode ? "--bail" : "",
    ].filter((part) => part.length > 0);

    execSync(commandParts.join(" "), {stdio: "inherit"});
    console.log(styleText("green", `\n   ✓ Newman tests passed for ${target}`));
  } catch (error) {
    console.error(styleText("red", `\n   ✗ Newman tests failed for ${target}`));
    throw error;
  } finally {
    try {
      console.log(styleText("cyan", `\n📝 Generating assertion summary...`));
      writeAssertionSummary(target, reportDir);
    } catch (e) {
      console.error(styleText("red", "   ✗ Failed generating assertion summary:"), e);
    }

    try {
      sanitizeNewmanJsonReport(jsonPath);
    } catch (e) {
      console.error(styleText("red", "   ✗ Failed sanitizing Newman JSON report:"), e);
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
 * @returns A promise that resolves when the flow completes.
 */
const startNewmanTesting = async (target: RunnableTarget): Promise<void> => {
  console.log(styleText(["bold", "magenta"], `\n╔════════════════════════════════════════╗`));
  console.log(styleText(["bold", "magenta"], `║   E2E Testing: ${target.padEnd(23)} ║`));
  console.log(styleText(["bold", "magenta"], `╚════════════════════════════════════════╝`));

  const targetConfiguration = targetConfigurationMap[target];
  const collectionPath = loadOpenAPITestCollectionPath(target);
  const environmentProfile = resolveEnvironmentProfile();
  const environmentPath = loadOpenAPITestEnvironmentPath(target, environmentProfile);
  const authToken = (process.env["E2E_TEST_AUTH_TOKEN"] ?? "").trim();
  const reportDir = process.env["NEWMAN_REPORT_DIR"] || "e2e-logs";

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
    console.warn(styleText("yellow", `⚠ E2E_TEST_AUTH_TOKEN is not set. Continuing ${target} run without auth token injection.`));
  }

  if (targetConfiguration.authPolicy === "ignored" && authToken.length > 0) {
    console.log(styleText("gray", `ℹ ${target} does not require auth token; skipping auth injection.`));
  }

  console.log(styleText("cyan", `\n📦 Target: ${styleText("bold", target)} (${targetConfiguration.label})`));
  console.log(styleText("gray", `   Collection: ${collectionPath}`));
  console.log(styleText("gray", `   Environment: ${environmentPath} (${environmentProfile})`));
  console.log(styleText("gray", `   Reports: ${reportDir}`));

  const shouldInjectAuthToken = targetConfiguration.authPolicy !== "ignored" && authToken.length > 0;
  const originalCollectionContent = shouldInjectAuthToken ? readFileSync(collectionPath, "utf-8") : "";

  try {
    if (shouldInjectAuthToken) {
      injectAuthTokenIntoCollection(collectionPath, authToken);
    }

    await runOpenAPITestCollection(
      target,
      collectionPath,
      environmentPath,
      reportDir,
      shouldInjectAuthToken ? authToken : undefined,
    );
  } finally {
    if (shouldInjectAuthToken) {
      console.log(styleText("cyan", `\n🔄 Restoring collection content...`));
      restoreCollectionContent(collectionPath, originalCollectionContent);
    }
  }

  console.log(styleText(["bold", "green"], `\n✅ Completed Newman tests for: ${target}\n`));
};

/**
 * Runs the E2E CLI.
 *
 * @remarks
 * This is the script entrypoint used by `npm run test:e2e`.
 *
 * @param arg - Target selector (`frontend`, `backend`, `cv`, `all`).
 * @returns Process exit code (0 for success, non-zero for failure).
 */
export async function main(arg?: string): Promise<number> {
  console.log(styleText(["bold", "magenta"], "\n╔════════════════════════════════════════╗"));
  console.log(styleText(["bold", "magenta"], "║   arolariu.ro E2E Test Runner          ║"));
  console.log(styleText(["bold", "magenta"], "╚════════════════════════════════════════╝\n"));

  if (!arg) {
    console.error(styleText("red", "✗ Missing target argument"));
    console.log(styleText("gray", "\n💡 Usage: test:e2e <frontend|backend|cv|all>"));
    console.log(styleText("gray", "   - frontend: Run frontend E2E tests"));
    console.log(styleText("gray", "   - backend:  Run backend API tests"));
    console.log(styleText("gray", "   - cv:       Run CV website/API tests"));
    console.log(styleText("gray", "   - all:      Run all E2E tests"));
    console.log(styleText("yellow", "\n⚠️  Notes:"));
    console.log(styleText("yellow", "   - E2E_TEST_AUTH_TOKEN is required for backend"));
    console.log(styleText("yellow", "   - E2E_TEST_AUTH_TOKEN is optional for frontend"));
    console.log(styleText("yellow", "   - E2E_TEST_AUTH_TOKEN is ignored for cv"));
    console.log(styleText("yellow", "   - E2E_TEST_ENVIRONMENT can be local|production (default: production)\n"));
    return 1;
  }

  try {
    switch (arg) {
      case "frontend":
        await startNewmanTesting("frontend");
        break;
      case "backend":
        await startNewmanTesting("backend");
        break;
      case "cv":
        await startNewmanTesting("cv");
        break;
      case "all":
        console.log(styleText(["bold", "cyan"], "\n🎯 Running all E2E tests...\n"));
        await startNewmanTesting("frontend");
        console.log(styleText("gray", "\n─────────────────────────────────────────────────\n"));
        await startNewmanTesting("backend");
        console.log(styleText("gray", "\n─────────────────────────────────────────────────\n"));
        await startNewmanTesting("cv");
        break;
      default:
        console.error(styleText("red", `✗ Invalid target: "${arg}"`));
        console.log(styleText("gray", "\n💡 Valid targets: frontend, backend, cv, all\n"));
        return 1;
    }

    console.log(styleText(["bold", "green"], "\n🎉 All E2E tests completed successfully!\n"));
    return 0;
  } catch (error) {
    console.error(styleText(["bold", "red"], "\n❌ E2E tests failed with errors\n"));
    return 1;
  }
}

if (import.meta.main) {
  const arg = process.argv[2];
  main(arg)
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
