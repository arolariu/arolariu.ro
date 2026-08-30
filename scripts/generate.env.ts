/**
 * @fileoverview Environment generator from the exp service or manual prompts.
 * @module scripts/generate.env
 *
 * @remarks
 * This script generates a `.env` file for website container builds.
 *
 * Depending on runtime detection, it either:
 * - fetches build-time configuration from the exp service
 *   (`/api/v1/build-time?for=website`), or
 * - prompts the developer for missing values based on required keys.
 */

import fs from "node:fs";
import path from "node:path";
import {APP_CONFIGURATION_MAPPING, isSecretKey} from "./azure/index.ts";
import {isAzureInfrastructure, isInCI, isProductionEnvironment, isVerboseMode} from "./common/index.ts";
import {MonorepositoryConsoleLogger, type MonorepositoryLogger} from "./common/logger.ts";
import {createTerminalPromptProvider, type PromptProvider} from "./common/prompts.ts";
import type {AllEnvironmentVariablesKeys, TypedConfigurationType} from "./types/index.ts";

/** exp service URL — same deterministic logic as the runtime consumers. EXP_PROXY_URL overrides for bare-metal dev. */
const AZURE_EXP_URL = "https://exp.arolariu.ro";
const EXP_BASE_URL = process.env["EXP_PROXY_URL"]?.trim() || (process.env["AZURE_CLIENT_ID"] ? AZURE_EXP_URL : "http://exp");

/** Whether to acquire Azure AD tokens — only when targeting the Azure-hosted exp instance. */
const USE_AZURE_AUTH = EXP_BASE_URL === AZURE_EXP_URL;

/** Config label derived from SITE_ENV (matches website configProxy.ts logic). */
const CONFIG_LABEL: string = (process.env["SITE_ENV"] ?? "").toUpperCase() === "PRODUCTION" ? "PRODUCTION" : "DEVELOPMENT";

/** Azure AD token scope for authenticating to the exp service. */
const EXP_TOKEN_SCOPE = "api://950ac239-5c2c-4759-bd83-911e68f6a8c9/.default";

const SETUP_SECTION_START = "# arolariu.ro setup-managed values";
const SETUP_SECTION_END = "# End arolariu.ro setup-managed values";

const AZURE_RUNTIME_IDENTITY_KEYS = [
  "AZURE_CLIENT_ID",
  "AZURE_TENANT_ID",
  "AZURE_SUBSCRIPTION_ID",
] as const;

const REEMITTABLE_ENVIRONMENT_KEYS: ReadonlySet<string> = new Set([
  ...Object.values(APP_CONFIGURATION_MAPPING),
  ...AZURE_RUNTIME_IDENTITY_KEYS,
]);

function isReemittableEnvironmentKey(key: string): boolean {
  return REEMITTABLE_ENVIRONMENT_KEYS.has(key);
}

/**
 * Parses environment assignments without logging or evaluating their values.
 *
 * @param content - Raw environment file contents.
 * @returns Parsed assignments, with the final assignment winning.
 */
export function parseEnvironmentFile(content: string): ReadonlyMap<string, string> {
  const values = new Map<string, string>();

  for (const line of content.split(/\r\n|\n|\r/u)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    if (key === "") {
      continue;
    }

    let value = trimmed.slice(separator + 1).trim();
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }

  return values;
}

function environmentNewline(content: string): "\r\n" | "\n" | "\r" {
  return (content.match(/\r\n|\n|\r/u)?.[0] as "\r\n" | "\n" | "\r" | undefined) ?? "\n";
}

/**
 * Appends one setup-owned section containing only missing, nonempty values.
 *
 * @param original - Existing environment file contents.
 * @param additions - Candidate assignments in desired output order.
 * @returns The unchanged original or an additive environment payload.
 */
export function appendMissingEnvironmentValues(original: string, additions: ReadonlyMap<string, string>): string {
  const existing = parseEnvironmentFile(original);
  const missing: string[] = [];

  for (const [key, value] of additions) {
    const trimmedValue = value.trim();
    if (!existing.has(key) && trimmedValue !== "") {
      missing.push(`${key}=${quoteIfNeeded(trimmedValue)}`);
    }
  }

  if (missing.length === 0) {
    return original;
  }

  const newline = environmentNewline(original);
  const separator = original === "" || original.endsWith("\n") || original.endsWith("\r") ? "" : newline;
  return `${original}${separator}${[SETUP_SECTION_START, ...missing, SETUP_SECTION_END, ""].join(newline)}`;
}

/**
 * Fetches build-time configuration from the exp service.
 *
 * @remarks
 * Calls `GET /api/v1/build-time?for=website` to get the full build-time config
 * document, then maps exp config keys to environment variable names using
 * {@link APP_CONFIGURATION_MAPPING}.
 *
 * @param verbose - Enables verbose logging.
 * @param logger - Logger used for fetch, mapping, and failure output.
 * @returns A promise that resolves to the typed configuration object.
 */
async function fetchConfigurationFromExp(verbose: boolean, logger: MonorepositoryLogger): Promise<TypedConfigurationType> {
  if (verbose) {
    logger.debug(`Exp service URL: ${EXP_BASE_URL}`);
  }

  const headers: Record<string, string> = {"X-Exp-Target": "website"};

  // Acquire a bearer token only when targeting the Azure-hosted exp service.
  if (USE_AZURE_AUTH) {
    try {
      const {AzureCliCredential, DefaultAzureCredential} = await import("@azure/identity");
      // In CI (GitHub Actions), azure/login sets up AzureCliCredential via OIDC.
      // DefaultAzureCredential with AZURE_CLIENT_ID tries ManagedIdentity first,
      // which doesn't exist in CI. Use AzureCliCredential directly in CI.
      const isCI = Boolean(process.env["CI"] || process.env["GITHUB_ACTIONS"]);
      const credential = isCI ? new AzureCliCredential() : new DefaultAzureCredential();
      logger.info(`Acquiring token for scope ${EXP_TOKEN_SCOPE} via ${isCI ? "AzureCliCredential" : "DefaultAzureCredential"}.`);
      const token = await credential.getToken(EXP_TOKEN_SCOPE);
      if (token?.token) {
        headers["Authorization"] = `Bearer ${token.token}`;
        logger.success("Bearer token acquired successfully.");
      } else {
        logger.warn("Token acquisition returned an empty token.");
      }
    } catch (error: unknown) {
      logger.warn(`Failed to acquire bearer token: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    logger.info("No AZURE_CLIENT_ID; skipping bearer token acquisition.");
  }

  const url = `${EXP_BASE_URL}/api/v1/build-time?for=website&label=${CONFIG_LABEL}`;
  logger.info(`Fetching ${url}.`);

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    logger.error(`exp returned ${response.status} for ${url}.`);
    if (errorBody && verbose) {
      logger.debug(`exp response included a non-empty error body (${errorBody.length} characters).`);
    }
    throw new Error(`exp returned ${response.status} for /api/v1/build-time?for=website`);
  }

  const payload = (await response.json()) as {config: Record<string, string>};
  if (!payload?.config || typeof payload.config !== "object") {
    throw new Error("exp build-time response missing 'config' object");
  }

  if (verbose) {
    logger.debug(`Received ${Object.keys(payload.config).length} config keys from exp.`);
  }

  // Map exp config keys to environment variable names.
  const config = {} as TypedConfigurationType;
  for (const [expKey, envVar] of Object.entries(APP_CONFIGURATION_MAPPING)) {
    const value = payload.config[expKey];
    if (value !== undefined && value !== null) {
      config[envVar] = value;
      logger.info(`Mapped ${expKey} to ${envVar}.`);
    } else {
      logger.warn(`Key ${expKey} was not found in the exp build-time response.`);
    }
  }

  logger.success(`Fetched ${Object.keys(config).length} configuration values from exp.`);
  return config;
}

/**
 * Parses an existing `.env` file and extracts key/value pairs.
 *
 * @remarks
 * This is a best-effort parser intended for local developer convenience.
 *
 * @param envPath - Path to the `.env` file (defaults to `.env`).
 * @param verbose - Enables verbose error logging.
 * @param logger - Logger used for parsing and failure output.
 * @returns The parsed configuration as a partial typed object.
 */
function fetchConfigurationFromLocalEnvFile(
  envPath: string,
  verbose: boolean,
  logger: MonorepositoryLogger,
): Partial<TypedConfigurationType> {
  const config = {} as Partial<TypedConfigurationType>;

  if (!fs.existsSync(envPath)) {
    logger.info("No existing .env file found in the supplied path.");
    logger.info(`Supplied path (raw): ${envPath}`);
    logger.info(`Supplied path (built): ${path.resolve(envPath)}`);
    return config;
  }

  logger.info(`Path found: ${path.resolve(envPath)}`);
  logger.info("Parsing existing .env file.");

  try {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const [key, value] of parseEnvironmentFile(content)) {
      if (isReemittableEnvironmentKey(key)) {
        config[key] = value;
      }
    }

    logger.success(`Parsed ${Object.keys(config).length} existing environment variables.`);
  } catch (error: unknown) {
    logger.warn("Encountered an error while parsing the .env file.");
    if (verbose) {
      logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return config;
}

/**
 * Prompts the user for missing environment variable values.
 *
 * @remarks
 * This function interactively requests input for keys that are required but
 * not present in the existing configuration.
 *
 * Secret keys are treated specially (they are not echoed back plainly).
 *
 * @param missingKeys - Keys representing missing environment variables.
 * @param verbose - Enables verbose logging.
 * @param logger - Logger used for prompts without exposing entered values.
 * @param prompts - Shared interactive prompt provider.
 * @returns A partial configuration object containing newly provided values.
 */
async function promptForMissingKeys(
  missingKeys: AllEnvironmentVariablesKeys[],
  verbose: boolean,
  logger: MonorepositoryLogger,
  prompts: PromptProvider,
): Promise<Partial<TypedConfigurationType>> {
  logger.section("Prompting for missing environment variables", "🔍");

  if (missingKeys.length === 0) {
    logger.success("All required keys are present.");
    return {} as TypedConfigurationType;
  }

  logger.warn(`Found ${missingKeys.length} missing key(s) that need to be provided.`);

  const config = {} as TypedConfigurationType;
  let count = 1;

  for (const key of missingKeys) {
    const isSecret = isSecretKey(key);
    const prefix = isSecret ? "🔐" : "🔑";
    const secretHint = isSecret ? " (hidden)" : "";
    logger.info(`${prefix} [${count}/${missingKeys.length}] Requesting ${key}${secretHint}.`);

    const value = (isSecret ? await prompts.secret(key) : await prompts.text(key)).trim();
    if (isSecret && value !== "") {
      logger.redact(value);
    }

    if (value) {
      config[key] = value;
    } else {
      logger.warn(`Empty value provided for ${key}. Please ensure this is intentional.`);
    }
    count++;
  }

  if (verbose) {
    logger.debug(`Collected ${Object.keys(config).length} prompted environment value(s).`);
  }
  logger.success("All missing keys have been provided.");
  return config;
}

/**
 * Ensures all required environment variables are present for local usage.
 *
 * @remarks
 * The function first parses any existing `.env` file and then prompts for
 * missing required keys.
 *
 * @param verbose - Enables verbose logging.
 * @param logger - Logger used for parsing, prompts, and completion output.
 * @param prompts - Shared interactive prompt provider.
 * @returns The completed typed configuration.
 */
async function ensureLocalEnvIsComplete(
  verbose: boolean,
  logger: MonorepositoryLogger,
  prompts: PromptProvider,
): Promise<TypedConfigurationType> {
  logger.section("Ensuring local environment configuration is complete", "🔧");
  const configurationKeys = Object.values(APP_CONFIGURATION_MAPPING);

  // Parse existing .env if it exists, first (redundant in cloud / ci);
  const existingConfig = fetchConfigurationFromLocalEnvFile(".env", verbose, logger);
  const existingConfigKeys = Object.keys(existingConfig);
  if (verbose) {
    logger.debug(`Existing configuration keys: ${JSON.stringify(existingConfigKeys, null, 2)}`);
  }

  // Find missing keys from REQUIRED array
  const missingKeys = configurationKeys.filter((key) => !existingConfigKeys.includes(key));
  if (missingKeys.length === 0) {
    logger.success("All required environment variables are present.");
    return existingConfig as TypedConfigurationType; // safe cast.
  }

  logger.warn(`Missing ${missingKeys.length} required environment variable(s):`);
  for (const missingKey of missingKeys) {
    logger.line([{text: `      • ${missingKey}`, styles: ["gray"]}]);
  }

  const shouldPrompt = await prompts.confirm("Do you want to provide the missing values now?", true);
  if (!shouldPrompt) {
    throw new Error("Aborting: Missing environment variables were not provided.");
  }

  // Prompt user for missing keys
  const newValues = await promptForMissingKeys(missingKeys, verbose, logger, prompts);
  // Merge and return complete config
  logger.success("Configuration merged successfully.");

  const completedConfig = {...existingConfig, ...newValues};
  return completedConfig as TypedConfigurationType; // safe cast.
}

/**
 * Helper function to determine if a value needs to be quoted in .env format.
 * Values containing special characters must be quoted to prevent:
 * - Shell expansion (backticks, dollar signs)
 * - Comment interpretation (hash symbols)
 * - Variable substitution
 * - Newlines/tabs breaking the .env format
 * - Shell metacharacters causing execution issues
 *
 * @param value The string value to check and potentially quote
 * @returns The value, quoted and escaped if necessary
 */
export function quoteIfNeeded(value: string): string {
  // Empty values should be represented as empty strings
  if (!value) {
    return '""';
  }

  // List of characters that require quoting:
  // - Whitespace: space, tab, newline, carriage return
  // - Shell expansion: backtick (`), dollar sign ($)
  // - Comments: hash (#)
  // - Delimiters: equals (=), semicolon (;)
  // - Shell metacharacters: pipe (|), ampersand (&), asterisk (*), question mark (?), less than (<), greater than (>)
  // - Quotes: single quote ('), double quote (")
  // - Backslash (\)
  const needsQuoting = /[\s`$#=;|&*?<>'"\\]/.test(value);

  if (!needsQuoting) {
    return value;
  }

  // Escape backslashes first (must be done before escaping quotes)
  let escaped = value.replace(/\\/g, "\\\\");
  // Then escape double quotes
  escaped = escaped.replace(/"/g, '\\"');
  // Escape newlines as literal \n
  escaped = escaped.replace(/\n/g, "\\n");
  // Escape carriage returns as literal \r
  escaped = escaped.replace(/\r/g, "\\r");
  // Escape tabs as literal \t
  escaped = escaped.replace(/\t/g, "\\t");

  return `"${escaped}"`;
}

/**
 * Adds a named configuration section to the `.env` output lines.
 *
 * @param lines - Mutable array of output lines.
 * @param sectionName - Human-friendly section name.
 * @param emoji - Emoji used in console output.
 * @param keys - Keys to include in this section.
 * @param config - Completed configuration object.
 * @param logger - Logger used for section progress output.
 * @returns Nothing.
 */
function addConfigSection(
  lines: string[],
  sectionName: string,
  emoji: string,
  keys: readonly string[],
  config: TypedConfigurationType,
  logger: MonorepositoryLogger,
): void {
  logger.info(`${emoji} Adding ${sectionName} Configuration.`);
  lines.push("", `# ${sectionName} Configuration Start`);

  for (const key of keys) {
    if (config[key] !== undefined && config[key] !== null) {
      lines.push(`${key}=${quoteIfNeeded(config[key])}`);
    }
  }

  lines.push(`# ${sectionName} Configuration End`);
}

/**
 * Generates the `.env` file content from a configuration object.
 *
 * @param config - Completed configuration object.
 * @param logger - Logger used for content-construction progress.
 * @returns A newline-separated `.env` payload.
 */
function generateEnvFileContent(config: TypedConfigurationType, logger: MonorepositoryLogger): string {
  logger.section("Generating .env file content", "📝");

  const lines = [
    "# Generated environment configuration file",
    `# Site Environment: ${process.env["NODE_ENV"] || "development"}`,
    `# CI/CD: ${isInCI ? "true" : "false"}`,
    `# Commit SHA: ${process.env["COMMIT_SHA"] ?? process.env["GITHUB_SHA"] ?? "N/A"}`,
    `# Generated at: ${new Date().toISOString()}`,
    "# !!!! DO NOT EDIT MANUALLY !!!",
    "",
  ];

  // Site config
  addConfigSection(lines, "Site", "📦", ["SITE_ENV", "SITE_NAME", "SITE_URL"], config, logger);

  // Accepted auth config
  addConfigSection(lines, "Accepted Authentication", "🔐", ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"], config, logger);

  // Accepted Azure runtime identity config (preserved if present)
  addConfigSection(
    lines,
    "Accepted Azure Runtime Identity",
    "☁️",
    AZURE_RUNTIME_IDENTITY_KEYS,
    config,
    logger,
  );

  // Metadata config
  logger.info("📊 Adding Metadata Configuration.");
  const timestamp = new Date().toISOString();
  const commitSha = process.env["COMMIT_SHA"] ?? process.env["GITHUB_SHA"] ?? "N/A";
  const useCdn = config["USE_CDN"] ?? "false";

  lines.push(
    "",
    "# Metadata Configuration Start",
    `TIMESTAMP=${quoteIfNeeded(timestamp)}`,
    `COMMIT_SHA=${quoteIfNeeded(commitSha)}`,
    `USE_CDN=${quoteIfNeeded(useCdn)}`,
    "# Metadata Configuration End",
  );

  logger.success("File content generated successfully.");

  return lines.join("\n");
}

/**
 * Copies the generated `.env` file into configured sub-repositories.
 *
 * @param sourcePath - Source `.env` path.
 * @param targetPaths - Relative target paths to copy to.
 * @param verbose - Enables verbose error logging.
 * @param logger - Logger used for copy progress and failures.
 * @returns Nothing.
 */
function copyEnvFileToSubRepos(sourcePath: string, targetPaths: string[], verbose: boolean, logger: MonorepositoryLogger): void {
  logger.section("Copying .env file to sub-repositories", "📂");
  for (const targetPath of targetPaths) {
    logger.info(`Raw target path: ${targetPath}`);
    const builtTargetPath = path.resolve(`.${targetPath}`);
    logger.info(`Built target path: ${builtTargetPath}`);
    try {
      fs.copyFileSync(sourcePath, builtTargetPath);
    } catch (error: unknown) {
      logger.error(`Error copying to ${builtTargetPath}.`);
      if (verbose) {
        logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}

/**
 * Runs the environment generator CLI.
 *
 * @remarks
 * This is the script entrypoint used by `npm run generate:env`.
 *
 * @param verbose - Enables verbose logging.
 * @param logger - Logger used for all script-authored output.
 * @param prompts - Optional injected prompt provider.
 * @returns Process exit code (0 for success, non-zero for failure).
 */
export async function main(
  verbose: boolean = false,
  logger: MonorepositoryLogger = new MonorepositoryConsoleLogger("generate::env", {verbose: verbose || isVerboseMode}),
  prompts: PromptProvider = createTerminalPromptProvider(),
): Promise<number> {
  const effectiveVerbose = verbose || isVerboseMode;
  logger.line([{text: "🔧 Configuration:", styles: ["cyan"]}]);
  logger.line();
  logger.line([
    {text: "   Infrastructure: ", styles: ["gray"]},
    {text: isAzureInfrastructure ? "Azure" : "Local", styles: [isAzureInfrastructure ? "blue" : "yellow"]},
  ]);
  logger.line([
    {text: "   Environment: ", styles: ["gray"]},
    {text: isProductionEnvironment ? "production" : "development", styles: [isProductionEnvironment ? "red" : "green"]},
  ]);
  logger.line([
    {text: "   Verbose: ", styles: ["gray"]},
    {text: effectiveVerbose ? "✅ Enabled" : "❌ Disabled", styles: [effectiveVerbose ? "green" : "gray"]},
  ]);
  logger.line([
    {text: "   Agent: ", styles: ["gray"]},
    {text: isInCI ? "CI/CD" : "Local", styles: [isInCI ? "cyan" : "yellow"]},
  ]);
  logger.line([
    {text: "   Working Directory: ", styles: ["gray"]},
    {text: path.resolve("."), styles: ["dim"]},
  ]);
  logger.line([
    {text: "   Output File: ", styles: ["gray"]},
    {text: ".env", styles: ["cyan"]},
  ]);
  logger.line();
  if (effectiveVerbose) {
    logger.debug("SITE_ENV was evaluated without logging its value.");
  }

  let config = {} as TypedConfigurationType;
  try {
    if (isAzureInfrastructure) {
      if (effectiveVerbose) {
        logger.debug("Fetching configuration from the exp service.");
      }
      config = await fetchConfigurationFromExp(verbose, logger);
    } else {
      if (effectiveVerbose) {
        logger.debug("Populating configuration via manual input.");
      }
      config = await ensureLocalEnvIsComplete(verbose, logger, prompts);
    }
  } catch (error: unknown) {
    logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  for (const [key, value] of Object.entries(config)) {
    if (isSecretKey(key) && typeof value === "string") {
      logger.redact(value);
    }
  }
  const content = generateEnvFileContent(config, logger);

  logger.info("Writing .env file.");
  fs.writeFileSync(".env", content, {mode: 0o600});

  logger.success(`Generated ${Object.keys(config).length} environment variables.`);
  logger.line([
    {text: "   File: ", styles: ["green"]},
    {text: path.resolve(".env"), styles: ["cyan"]},
  ]);
  logger.line();

  // Copy to sub-repositories if needed
  copyEnvFileToSubRepos(".env", ["/sites/arolariu.ro/.env"], verbose, logger);
  return 0;
}

if (import.meta.main) {
  const verbose = process.argv.includes("/verbose") || process.argv.includes("/v");
  const logger = new MonorepositoryConsoleLogger("generate::env", {verbose: verbose || isVerboseMode});
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    logger.banner(
      [
        "",
        "╔══════════════════════════════════════════════════════════════════╗",
        "║       ||arolariu.ro|| Environment Generator - Help               ║",
        "╚══════════════════════════════════════════════════════════════════╝",
        "",
      ],
      "magenta",
    );
    logger.line([{text: "📋 Description:", styles: ["cyan"]}]);
    logger.line([{text: "   Generates .env file from Azure App Configuration or manual input", styles: ["gray"]}]);
    logger.line();
    logger.line([{text: "🚀 Usage:", styles: ["cyan"]}]);
    logger.line([{text: "   npm run generate:env [options]", styles: ["gray"]}]);
    logger.line();
    logger.line([{text: "⚙️  Options:", styles: ["cyan"]}]);
    logger.line([{text: "   --help, -h        Show this help message", styles: ["gray"]}]);
    logger.line([{text: "   --verbose, -v     Enable verbose logging", styles: ["gray"]}]);
    logger.line([{text: "   --azure           Fetch from Azure App Configuration", styles: ["gray"]}]);
    logger.line([{text: "   --production      Use production configuration", styles: ["gray"]}]);
    logger.line();
    logger.line([{text: "📦 Environment Variables:", styles: ["cyan"]}]);
    logger.line([{text: "   AZURE_CONFIG      Enable Azure mode (true/false)", styles: ["gray"]}]);
    logger.line([{text: "   NODE_ENV          Set environment (production/development)", styles: ["gray"]}]);
    logger.line([{text: "   CI                Detect CI/CD environment", styles: ["gray"]}]);
    logger.line();
    logger.line([{text: "📖 Examples:", styles: ["cyan"]}]);
    logger.line([{text: "   npm run generate:env --azure --production", styles: ["gray"]}]);
    logger.line([{text: "   npm run generate:env --verbose", styles: ["gray"]}]);
    logger.line();
    process.exit(1);
  }

  try {
    const code = await main(verbose, logger);
    process.exit(code);
  } catch (error: unknown) {
    logger.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
