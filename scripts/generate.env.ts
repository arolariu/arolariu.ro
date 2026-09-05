/**
 * @fileoverview Environment generator command object.
 * @module scripts/generate.env
 *
 * @remarks
 * This script generates a `.env` file for website container builds.
 *
 * Depending on runtime detection, it either:
 * - fetches build-time configuration from the exp service
 *   (`/api/v1/build-time?for=website`), or
 * - prompts the developer for missing values based on required keys.
 *
 * Every ambient effect (filesystem, HTTP, prompts, environment variables, and the wall clock)
 * is routed through the injected {@link CommandExecutionContext.runtime} instead of touching Node globals
 * directly, so the command is fully exercised by the declarative command runtime's test fakes.
 */

import path from "node:path";
import {APP_CONFIGURATION_MAPPING, AZURE_RUNTIME_IDENTITY_KEYS, isSecretKey} from "./azure/index.ts";
import type {AppConfigurationEnvironmentKey, GeneratedEnvironmentConfiguration, GeneratedEnvironmentKey} from "./azure/index.ts";
import type {CommandExecutionContext} from "./core/command/command-execution.ts";
import {defineCommand, type LazyMonorepoCommand} from "./core/command/lazy-monorepo-command.ts";
import type {CommandConstructionOptions, CommandHost} from "./core/command/command-specification.ts";
import type {TerminalPresenter} from "./core/presentation/terminal-presenter.ts";

/** Typed input accepted by every migrated `generate` leaf command. */
export interface GenerateLeafInput {
  /** Enables diagnostic output. */
  readonly verbose: boolean;
}

/** Typed business result produced by every migrated `generate` leaf command. */
export interface GenerateLeafResult {
  /** Human-readable completion summary rendered by the command's human presentation. */
  readonly summary: string;
  /** Paths of every file this command created or modified. */
  readonly changedFiles: readonly string[];
}

/** Logical command name shared by this command's metadata and its effective-verbosity logger fork. */
const COMMAND_NAME = "generate:env";

/** exp service URL — same deterministic logic as the runtime consumers. EXP_PROXY_URL overrides for bare-metal dev. */
const AZURE_EXP_URL = "https://exp.arolariu.ro";

/** Azure AD token scope for authenticating to the exp service. */
const EXP_TOKEN_SCOPE = "api://950ac239-5c2c-4759-bd83-911e68f6a8c9/.default";

const SETUP_SECTION_START = "# arolariu.ro setup-managed values";
const SETUP_SECTION_END = "# End arolariu.ro setup-managed values";

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
 * @param context - Command context whose runtime owns environment, HTTP, and logging.
 * @param verbose - Enables verbose logging.
 * @returns A promise that resolves to the typed configuration object.
 */
async function fetchConfigurationFromExp(
  context: Readonly<CommandExecutionContext>,
  verbose: boolean,
): Promise<GeneratedEnvironmentConfiguration> {
  const {presenter: logger, environment, http, signal} = context.runtime;
  const expBaseUrl =
    environment.variables["EXP_PROXY_URL"]?.trim() || (environment.variables["AZURE_CLIENT_ID"] ? AZURE_EXP_URL : "http://exp");
  const useAzureAuth = expBaseUrl === AZURE_EXP_URL;
  const configLabel: string = (environment.variables["SITE_ENV"] ?? "").toUpperCase() === "PRODUCTION" ? "PRODUCTION" : "DEVELOPMENT";

  if (verbose) {
    logger.debug(`Exp service URL: ${expBaseUrl}`);
  }

  const headers: Record<string, string> = {"X-Exp-Target": "website"};

  // Acquire a bearer token only when targeting the Azure-hosted exp service.
  if (useAzureAuth) {
    try {
      const {AzureCliCredential, DefaultAzureCredential} = await import("@azure/identity");
      // In CI (GitHub Actions), azure/login sets up AzureCliCredential via OIDC.
      // DefaultAzureCredential with AZURE_CLIENT_ID tries ManagedIdentity first,
      // which doesn't exist in CI. Use AzureCliCredential directly in CI.
      const credential = environment.isCI ? new AzureCliCredential() : new DefaultAzureCredential();
      logger.info(`Acquiring token for scope ${EXP_TOKEN_SCOPE} via ${environment.isCI ? "AzureCliCredential" : "DefaultAzureCredential"}.`);
      const token = await credential.getToken(EXP_TOKEN_SCOPE);
      if (token?.token) {
        logger.redact(token.token);
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

  const url = `${expBaseUrl}/api/v1/build-time?for=website&label=${configLabel}`;
  logger.info(`Fetching ${url}.`);

  const response = await http.request({
    url: new URL(url),
    headers,
    timeoutMs: 30_000,
    signal,
  });

  if (!response.ok) {
    logger.error(`exp returned ${response.status} for ${url}.`);
    if (response.text !== "" && verbose) {
      logger.debug(`exp response included a non-empty error body (${response.text.length} characters).`);
    }
    throw new Error(`exp returned ${response.status} for /api/v1/build-time?for=website`);
  }

  const payload = JSON.parse(response.text) as {config?: Record<string, string>};
  if (!payload?.config || typeof payload.config !== "object") {
    throw new Error("exp build-time response missing 'config' object");
  }

  if (verbose) {
    logger.debug(`Received ${Object.keys(payload.config).length} config keys from exp.`);
  }

  // Map exp config keys to environment variable names.
  const config: GeneratedEnvironmentConfiguration = {};
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
 * @param context - Command context whose runtime owns the filesystem and logging.
 * @param envPath - Path to the `.env` file (defaults to `.env`).
 * @param verbose - Enables verbose error logging.
 * @returns The parsed configuration as a partial typed object.
 */
async function fetchConfigurationFromLocalEnvFile(
  context: Readonly<CommandExecutionContext>,
  envPath: string,
  verbose: boolean,
): Promise<GeneratedEnvironmentConfiguration> {
  const {presenter: logger, files, environment} = context.runtime;
  const config: GeneratedEnvironmentConfiguration = {};

  if (!(await files.exists(envPath))) {
    logger.info("No existing .env file found in the supplied path.");
    logger.info(`Supplied path (raw): ${envPath}`);
    logger.info(`Supplied path (built): ${path.resolve(environment.cwd, envPath)}`);
    return config;
  }

  logger.info(`Path found: ${path.resolve(environment.cwd, envPath)}`);
  logger.info("Parsing existing .env file.");

  try {
    const content = await files.readText(envPath);
    for (const [key, value] of parseEnvironmentFile(content)) {
      if (isReemittableEnvironmentKey(key)) {
        config[key as GeneratedEnvironmentKey] = value;
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
 * @param context - Command context whose runtime owns prompts and logging.
 * @param missingKeys - Keys representing missing environment variables.
 * @param verbose - Enables verbose logging.
 * @returns A partial configuration object containing newly provided values.
 */
async function promptForMissingKeys(
  context: Readonly<CommandExecutionContext>,
  missingKeys: readonly AppConfigurationEnvironmentKey[],
  verbose: boolean,
): Promise<GeneratedEnvironmentConfiguration> {
  const {presenter: logger, prompts} = context.runtime;
  logger.section("Prompting for missing environment variables", "🔍");

  if (missingKeys.length === 0) {
    logger.success("All required keys are present.");
    return {};
  }

  logger.warn(`Found ${missingKeys.length} missing key(s) that need to be provided.`);

  const config: GeneratedEnvironmentConfiguration = {};
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
 * @param context - Command context whose runtime owns the filesystem, prompts, and logging.
 * @param verbose - Enables verbose logging.
 * @returns The completed typed configuration.
 */
async function ensureLocalEnvIsComplete(
  context: Readonly<CommandExecutionContext>,
  verbose: boolean,
): Promise<GeneratedEnvironmentConfiguration> {
  const {presenter: logger, prompts} = context.runtime;
  logger.section("Ensuring local environment configuration is complete", "🔧");
  const configurationKeys = Object.values(APP_CONFIGURATION_MAPPING);

  // Parse existing .env if it exists, first (redundant in cloud / ci);
  const existingConfig = await fetchConfigurationFromLocalEnvFile(context, ".env", verbose);
  const existingConfigKeys = Object.keys(existingConfig);
  if (verbose) {
    logger.debug(`Existing configuration keys: ${JSON.stringify(existingConfigKeys, null, 2)}`);
  }

  // Find missing keys from REQUIRED array
  const missingKeys = configurationKeys.filter((key) => !existingConfigKeys.includes(key));
  if (missingKeys.length === 0) {
    logger.success("All required environment variables are present.");
    return existingConfig;
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
  const newValues = await promptForMissingKeys(context, missingKeys, verbose);
  // Merge and return complete config
  logger.success("Configuration merged successfully.");

  const completedConfig: GeneratedEnvironmentConfiguration = {...existingConfig, ...newValues};
  return completedConfig;
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
  config: GeneratedEnvironmentConfiguration,
  logger: TerminalPresenter,
): void {
  logger.info(`${emoji} Adding ${sectionName} Configuration.`);
  lines.push("", `# ${sectionName} Configuration Start`);

  for (const key of keys) {
    const value = config[key as GeneratedEnvironmentKey];
    if (value !== undefined && value !== null) {
      lines.push(`${key}=${quoteIfNeeded(value)}`);
    }
  }

  lines.push(`# ${sectionName} Configuration End`);
}

/**
 * Generates the `.env` file content from a configuration object.
 *
 * @param context - Command context whose runtime owns environment and clock capabilities.
 * @param config - Completed configuration object.
 * @returns A newline-separated `.env` payload.
 */
function generateEnvFileContent(context: Readonly<CommandExecutionContext>, config: GeneratedEnvironmentConfiguration): string {
  const {presenter: logger, environment, clock} = context.runtime;
  logger.section("Generating .env file content", "📝");

  const timestamp = clock.isoTimestamp();
  const commitSha = environment.variables["COMMIT_SHA"] ?? environment.variables["GITHUB_SHA"] ?? "N/A";

  const lines = [
    "# Generated environment configuration file",
    `# Site Environment: ${environment.variables["NODE_ENV"] || "development"}`,
    `# CI/CD: ${environment.isCI ? "true" : "false"}`,
    `# Commit SHA: ${commitSha}`,
    `# Generated at: ${timestamp}`,
    "# !!!! DO NOT EDIT MANUALLY !!!",
    "",
  ];

  // Site config
  addConfigSection(lines, "Site", "📦", ["SITE_ENV", "SITE_NAME", "SITE_URL"], config, logger);

  // Accepted auth config
  addConfigSection(lines, "Accepted Authentication", "🔐", ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"], config, logger);

  // Accepted Azure runtime identity config (preserved if present)
  addConfigSection(lines, "Accepted Azure Runtime Identity", "☁️", AZURE_RUNTIME_IDENTITY_KEYS, config, logger);

  // Metadata config
  logger.info("📊 Adding Metadata Configuration.");
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
 * @param context - Command context whose runtime owns the filesystem, environment, and logging.
 * @param sourcePath - Source `.env` path.
 * @param targetPaths - Relative target paths to copy to.
 * @param verbose - Enables verbose error logging.
 * @returns Absolute destination paths that were successfully written.
 */
async function copyEnvFileToSubRepos(
  context: Readonly<CommandExecutionContext>,
  sourcePath: string,
  targetPaths: readonly string[],
  verbose: boolean,
): Promise<readonly string[]> {
  const {presenter: logger, files, environment} = context.runtime;
  logger.section("Copying .env file to sub-repositories", "📂");
  const copiedFiles: string[] = [];

  for (const targetPath of targetPaths) {
    logger.info(`Raw target path: ${targetPath}`);
    const builtTargetPath = path.resolve(environment.cwd, `.${targetPath}`);
    logger.info(`Built target path: ${builtTargetPath}`);
    try {
      // eslint-disable-next-line no-await-in-loop
      await files.copy(sourcePath, builtTargetPath);
      copiedFiles.push(builtTargetPath);
    } catch (error: unknown) {
      logger.error(`Error copying to ${builtTargetPath}.`);
      if (verbose) {
        logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  return copiedFiles;
}

/**
 * Resolves the effective verbosity from the CLI flag and the `VERBOSE` environment variable.
 *
 * @remarks
 * Verbosity is resolved per invocation instead of through a module-level constant so
 * callers and tests observe the environment as it is at call time.
 *
 * @param flag - Verbosity requested through the CLI flag.
 * @param variables - Environment variables snapshot used to resolve `VERBOSE`.
 * @returns True when either the flag or the environment enables verbose logging.
 */
function resolveVerbose(flag: boolean, variables: Readonly<Record<string, string | undefined>>): boolean {
  return flag || variables["VERBOSE"] === "true";
}

/**
 * Runs the environment generator's business logic.
 *
 * @param context - Command context whose runtime owns every ambient capability.
 * @param input - Typed command input.
 * @returns The completion summary and every file this invocation created or modified.
 */
async function generateEnvironment(
  context: Readonly<CommandExecutionContext>,
  input: Readonly<GenerateLeafInput>,
): Promise<GenerateLeafResult> {
  const {environment} = context.runtime;
  const effectiveVerbose = resolveVerbose(input.verbose, environment.variables);

  // `commander.ts` derives the invocation logger's own verbosity from the typed CLI flag alone
  // (see `readVerboseFlag`), so `VERBOSE=true` alone would otherwise leave every `logger.debug()`
  // call below silently suppressed. Forking a scope keyed to the effective verbosity preserves
  // the documented environment override while still sharing this invocation's sink, redactions,
  // and presentation mode.
  const scopedContext: Readonly<CommandExecutionContext> = {
    ...context,
    runtime: {
      ...context.runtime,
      presenter: context.runtime.presenter.fork(COMMAND_NAME, {mode: context.presentation, verbose: effectiveVerbose}),
    },
  };
  const {runtime} = scopedContext;
  const {presenter: logger} = runtime;
  const isAzure = environment.variables["INFRA"] === "azure";
  const isProduction = environment.variables["PRODUCTION"] === "true";

  logger.line([{text: "🔧 Configuration:", styles: ["cyan"]}]);
  logger.line();
  logger.line([
    {text: "   Infrastructure: ", styles: ["gray"]},
    {text: isAzure ? "Azure" : "Local", styles: [isAzure ? "blue" : "yellow"]},
  ]);
  logger.line([
    {text: "   Environment: ", styles: ["gray"]},
    {text: isProduction ? "production" : "development", styles: [isProduction ? "red" : "green"]},
  ]);
  logger.line([
    {text: "   Verbose: ", styles: ["gray"]},
    {text: effectiveVerbose ? "✅ Enabled" : "❌ Disabled", styles: [effectiveVerbose ? "green" : "gray"]},
  ]);
  logger.line([
    {text: "   Agent: ", styles: ["gray"]},
    {text: environment.isCI ? "CI/CD" : "Local", styles: [environment.isCI ? "cyan" : "yellow"]},
  ]);
  logger.line([
    {text: "   Working Directory: ", styles: ["gray"]},
    {text: environment.cwd, styles: ["dim"]},
  ]);
  logger.line([
    {text: "   Output File: ", styles: ["gray"]},
    {text: ".env", styles: ["cyan"]},
  ]);
  logger.line();
  if (effectiveVerbose) {
    logger.debug("SITE_ENV was evaluated without logging its value.");
  }

  const config = isAzure
    ? await fetchConfigurationFromExp(scopedContext, effectiveVerbose)
    : await ensureLocalEnvIsComplete(scopedContext, effectiveVerbose);

  for (const [key, value] of Object.entries(config)) {
    if (isSecretKey(key) && typeof value === "string") {
      logger.redact(value);
    }
  }
  const content = generateEnvFileContent(scopedContext, config);

  logger.info("Writing .env file.");
  await runtime.files.writeText(".env", content, {mode: 0o600});

  logger.success(`Generated ${Object.keys(config).length} environment variables.`);
  logger.line([
    {text: "   File: ", styles: ["green"]},
    {text: path.resolve(environment.cwd, ".env"), styles: ["cyan"]},
  ]);
  logger.line();

  // Copy to sub-repositories if needed
  const copiedFiles = await copyEnvFileToSubRepos(scopedContext, ".env", ["/sites/arolariu.ro/.env"], effectiveVerbose);

  return {
    summary: `Generated ${Object.keys(config).length} environment variable(s).`,
    changedFiles: [".env", ...copiedFiles],
  };
}

/** The only edge from this entrypoint into the Node command host; core never names it. */
const loadProductionCommandHost = async (): Promise<CommandHost> =>
  import("./adapters/node/node-command-host.ts").then(({createNodeCommandHost}) => createNodeCommandHost(COMMAND_NAME));

/**
 * Creates the environment generator command.
 *
 * @param options - Injected command host or literal loader; defaults to the Node adapter.
 * @returns The typed `generate:env` command object.
 */
export function createGenerateEnvironmentCommand(
  options: Readonly<CommandConstructionOptions> = {loadHost: loadProductionCommandHost},
): LazyMonorepoCommand<GenerateLeafInput, GenerateLeafResult, never> {
  return defineCommand<GenerateLeafInput, GenerateLeafResult>(
    {
      name: COMMAND_NAME,
      description: "Generate the website environment file.",
      examples: ["npm run generate:env", "npm run generate:env -- --verbose"],
      slashAliases: {"/v": "--verbose", "/verbose": "--verbose"},
      configure: (program) => {
        program.option("-v, --verbose", "Enable diagnostic output.");
      },
      decode: (program) => ({verbose: program.opts<{verbose?: boolean}>().verbose === true}),
      execute: generateEnvironment,
      complete: (result) => ({
        exitCode: 0,
        value: result,
        human: (logger) => logger.success(result.summary),
      }),
    },
    options,
  );
}

/** Production singleton used by the aggregate CLI and this module's direct entrypoint. */
export const generateEnvironmentCommand: LazyMonorepoCommand<GenerateLeafInput, GenerateLeafResult, never> =
  createGenerateEnvironmentCommand();

await generateEnvironmentCommand.runIfMain(import.meta.url);
