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

import {AzureCliCredential, DefaultAzureCredential} from "@azure/identity";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import pc from "picocolors";
import {APP_CONFIGURATION_MAPPING, isSecretKey} from "./azure/index.ts";
import {isAzureInfrastructure, isInCI, isProductionEnvironment, isVerboseMode} from "./common/index.ts";
import type {AllEnvironmentVariablesKeys, TypedConfigurationType} from "./types/index.ts";

/** exp service URL — same deterministic logic as the runtime consumers. */
const EXP_BASE_URL = process.env["AZURE_CLIENT_ID"] ? "https://exp.arolariu.ro" : "http://exp";

/** Config label derived from SITE_ENV (matches website configProxy.ts logic). */
const CONFIG_LABEL: string =
  (process.env["SITE_ENV"] ?? "").toUpperCase() === "PRODUCTION" ? "PRODUCTION" : "DEVELOPMENT";

console.log(`[generate.env] SITE_ENV=${process.env["SITE_ENV"] ?? "(unset)"} → CONFIG_LABEL=${CONFIG_LABEL}`);

/** Azure AD token scope for authenticating to the exp service. */
const EXP_TOKEN_SCOPE = "api://950ac239-5c2c-4759-bd83-911e68f6a8c9/.default";

/**
 * Fetches build-time configuration from the exp service.
 *
 * @remarks
 * Calls `GET /api/v1/build-time?for=website` to get the full build-time config
 * document, then maps exp config keys to environment variable names using
 * {@link APP_CONFIGURATION_MAPPING}.
 *
 * @param verbose - Enables verbose logging.
 * @returns A promise that resolves to the typed configuration object.
 */
async function fetchConfigurationFromExp(verbose: boolean = false): Promise<TypedConfigurationType> {
  verbose && console.info(`🔍 Exp service URL: ${EXP_BASE_URL}`);

  const headers: Record<string, string> = {"X-Exp-Target": "website"};

  // Acquire a bearer token when running with Azure identity.
  if (process.env["AZURE_CLIENT_ID"]) {
    try {
      // In CI (GitHub Actions), azure/login sets up AzureCliCredential via OIDC.
      // DefaultAzureCredential with AZURE_CLIENT_ID tries ManagedIdentity first,
      // which doesn't exist in CI. Use AzureCliCredential directly in CI.
      const isCI = Boolean(process.env["CI"] || process.env["GITHUB_ACTIONS"]);
      const credential = isCI ? new AzureCliCredential() : new DefaultAzureCredential();
      console.log(pc.gray(`🔐 Acquiring token for scope: ${EXP_TOKEN_SCOPE} (via ${isCI ? "AzureCliCredential" : "DefaultAzureCredential"})`));
      const token = await credential.getToken(EXP_TOKEN_SCOPE);
      if (token?.token) {
        headers["Authorization"] = `Bearer ${token.token}`;
        console.log(pc.green("🔐 Bearer token acquired successfully"));
      } else {
        console.log(pc.yellow("⚠️ Token acquisition returned empty token"));
      }
    } catch (error) {
      console.log(pc.yellow(`⚠️ Failed to acquire bearer token: ${error instanceof Error ? error.message : String(error)}`));
    }
  } else {
    console.log(pc.gray("ℹ️  No AZURE_CLIENT_ID — skipping bearer token acquisition"));
  }

  const url = `${EXP_BASE_URL}/api/v1/build-time?for=website&label=${CONFIG_LABEL}`;
  console.log(pc.gray(`🌐 Fetching: ${url}`));

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.log(pc.red(`❌ exp returned ${response.status} for ${url}`));
    if (errorBody) console.log(pc.gray(`   Response body: ${errorBody.substring(0, 500)}`));
    throw new Error(`exp returned ${response.status} for /api/v1/build-time?for=website`);
  }

  const payload = (await response.json()) as {config: Record<string, string>};
  if (!payload?.config || typeof payload.config !== "object") {
    throw new Error("exp build-time response missing 'config' object");
  }

  verbose && console.info(`📦 Received ${Object.keys(payload.config).length} config keys from exp`);

  // Map exp config keys to environment variable names.
  const config = {} as TypedConfigurationType;
  for (const [expKey, envVar] of Object.entries(APP_CONFIGURATION_MAPPING)) {
    const value = payload.config[expKey];
    if (value !== undefined && value !== null) {
      config[envVar] = value;
      console.log(pc.gray(`📝 Mapped ${expKey} → ${envVar}`));
    } else {
      console.log(pc.yellow(`⚠️ Key ${expKey} not found in exp build-time response`));
    }
  }

  console.log(pc.green(`\n   ✓ Fetched ${Object.keys(config).length} configuration values from exp\n`));
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
 * @returns The parsed configuration as a partial typed object.
 */
function fetchConfigurationFromLocalEnvFile(envPath: string = ".env", verbose: boolean = false): Partial<TypedConfigurationType> {
  const config = {} as Partial<TypedConfigurationType>;

  if (!fs.existsSync(envPath)) {
    console.log(pc.gray("📄 No existing .env file found in the supplied path."));
    console.log(pc.gray(`⚙️ Supplied path (raw): ${envPath}\n`));
    console.log(pc.gray(`⚙️ Supplied path (built): ${path.resolve(envPath)}\n`));
    return config;
  }

  console.log(pc.gray("Path found:"), pc.cyan(path.resolve(envPath)));
  console.log(pc.cyan(`\n📖 Parsing existing .env file...`));

  try {
    const content = fs.readFileSync(envPath, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        const [key, ...valueParts] = trimmedLine.split("=");
        // TODO: Check if key is part of AllEnvironmentVariablesKeys type
        if (key && valueParts.length > 0) {
          let value = valueParts.join("=");
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          config[key as AllEnvironmentVariablesKeys] = value;
          // ---------^ this type casting is not safe.
          // TODO: Check if key is part of AllEnvironmentVariablesKeys type
        }
      }
    }

    console.log(pc.green(`✅ Parsed ${Object.keys(config).length} existing environment variables\n`));
  } catch (error) {
    console.log(pc.yellow(`⚠️ Encountered error while parsing .env file.\n`));
    verbose && console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
 * @returns A partial configuration object containing newly provided values.
 */
async function promptForMissingKeys(
  missingKeys: AllEnvironmentVariablesKeys[],
  verbose: boolean = false,
): Promise<Partial<TypedConfigurationType>> {
  console.log(pc.cyan("\n🔍 Prompting for missing environment variables...\n"));

  if (missingKeys.length === 0) {
    console.log(pc.green("   ✓ All required keys are present!\n"));
    return {} as TypedConfigurationType;
  }

  console.log(pc.yellow(`   ⚠ Found ${missingKeys.length} missing key(s) that need to be provided:\n`));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const config = {} as TypedConfigurationType;
  let count = 1;

  for (const key of missingKeys) {
    const isSecret = isSecretKey(key);
    const prefix = isSecret ? pc.magenta("🔐") : pc.blue("🔑");
    const keyLabel = isSecret ? pc.magenta(key) : pc.cyan(key);
    const secretHint = isSecret ? pc.gray(" (hidden)") : "";
    const prompt = `   ${prefix} [${count}/${missingKeys.length}] ${keyLabel}${secretHint}: `;

    const value = await new Promise<string>((resolve) => {
      if (isSecret) {
        // Hide input for secrets
        rl.question(prompt, (answer) => {
          resolve(answer.trim());
        });
        // Hide the input by moving cursor and clearing line
        process.stdout.write(prompt + pc.gray("*".repeat(8)) + "\n");
      } else {
        rl.question(prompt, (answer) => {
          resolve(answer.trim());
        });
      }
    });

    if (value) {
      config[key] = value;
    } else {
      console.log(pc.yellow(` ⚠️ Warning: Empty value provided for ${key}. Please ensure this is intentional.`));
    }
    count++;
  }

  rl.close();
  console.log(pc.green("✅ All missing keys have been provided!\n"));
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
 * @returns The completed typed configuration.
 */
async function ensureLocalEnvIsComplete(verbose: boolean = false): Promise<TypedConfigurationType> {
  console.log(pc.cyan("\n🔧 Ensuring local environment configuration is complete...\n"));
  const configurationKeys = Object.values(APP_CONFIGURATION_MAPPING);

  // Parse existing .env if it exists, first (redundant in cloud / ci);
  const existingConfig = fetchConfigurationFromLocalEnvFile();
  const existingConfigKeys = Object.keys(existingConfig);
  verbose && console.info(`🔍 Existing configuration keys: ${JSON.stringify(existingConfigKeys, null, 2)}`);

  // Find missing keys from REQUIRED array
  const missingKeys = configurationKeys.filter((key) => !existingConfigKeys.includes(key));
  if (missingKeys.length === 0) {
    console.log(pc.green("✅ All required environment variables are present!\n"));
    return existingConfig as TypedConfigurationType; // safe cast.
  }

  console.log(pc.yellow(`📝 Missing ${missingKeys.length} required environment variable(s):`));
  for (const missingKey of missingKeys) {
    console.log(pc.gray(`      • ${missingKey}`));
  }

  console.log(pc.yellow("Do you want to provide the missing values now? (Y/n)"));
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await new Promise<string>((resolve) => {
    rl.question(pc.yellow("> "), (input) => {
      resolve(input.trim().toLowerCase());
    });
  });
  rl.close();

  if (answer === "n" || answer === "no") {
    throw new Error("Aborting: Missing environment variables were not provided.");
  }

  // Prompt user for missing keys
  const newValues = await promptForMissingKeys(missingKeys, verbose);
  // Merge and return complete config
  console.log(pc.green("✅ Configuration merged successfully!\n"));

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
function quoteIfNeeded(value: string): string {
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
 * @returns Nothing.
 */
function addConfigSection(lines: string[], sectionName: string, emoji: string, keys: string[], config: TypedConfigurationType): void {
  console.log(pc.gray(`   ${emoji} Adding ${sectionName} Configuration...`));
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
 * @returns A newline-separated `.env` payload.
 */
function generateEnvFileContent(config: TypedConfigurationType): string {
  console.log(pc.cyan("\n📝 Generating .env file content...\n"));

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
  addConfigSection(lines, "Site", "📦", ["SITE_ENV", "SITE_NAME", "SITE_URL"], config);

  // Accepted auth config
  addConfigSection(lines, "Accepted Authentication", "🔐", ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"], config);

  // Accepted Azure runtime identity config (preserved if present)
  addConfigSection(
    lines,
    "Accepted Azure Runtime Identity",
    "☁️",
    ["AZURE_CLIENT_ID", "AZURE_TENANT_ID", "AZURE_SUBSCRIPTION_ID"],
    config,
  );

  // Metadata config
  console.log(pc.gray("   📊 Adding Metadata Configuration..."));
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

  console.log(pc.green("   ✓ File content generated successfully!\n"));

  return lines.join("\n");
}

/**
 * Copies the generated `.env` file into configured sub-repositories.
 *
 * @param sourcePath - Source `.env` path.
 * @param targetPaths - Relative target paths to copy to.
 * @param verbose - Enables verbose error logging.
 * @returns Nothing.
 */
function copyEnvFileToSubRepos(sourcePath: string, targetPaths: string[], verbose: boolean = false): void {
  console.log(pc.cyan("\n📂 Copying .env file to sub-repositories...\n"));
  for (const targetPath of targetPaths) {
    console.log(pc.gray(`Raw target path:${targetPath}`));
    const builtTargetPath = path.resolve(`.${targetPath}`);
    console.log(pc.gray(`Built target path: ${builtTargetPath}`));
    try {
      fs.copyFileSync(sourcePath, builtTargetPath);
    } catch (error: unknown) {
      console.error(pc.red(`   ✗ Error copying to ${builtTargetPath}.`));
      verbose && console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
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
 * @returns Process exit code (0 for success, non-zero for failure).
 */
export async function main(verbose: boolean = false): Promise<number> {
  console.log(pc.cyan("🔧 Configuration:\n"));
  console.log(pc.gray(`   Infrastructure: ${isAzureInfrastructure ? pc.blue("Azure") : pc.yellow("Local")}`));
  console.log(pc.gray(`   Environment: ${isProductionEnvironment ? pc.red("production") : pc.green("development")}`));
  console.log(pc.gray(`   Verbose: ${isVerboseMode ? pc.green("✅ Enabled") : pc.gray("❌ Disabled")}`));
  console.log(pc.gray(`   Agent: ${isInCI ? pc.cyan("CI/CD") : pc.yellow("Local")}`));
  console.log(pc.gray(`   Working Directory: ${pc.dim(path.resolve("."))}`));
  console.log(pc.gray(`   Output File: ${pc.cyan(".env")}\n`));

  let config = {} as TypedConfigurationType;
  try {
    if (isAzureInfrastructure) {
      isVerboseMode && console.log(pc.cyan("☁️  Fetching configuration from exp service...\n"));
      config = await fetchConfigurationFromExp(verbose);
    } else {
      isVerboseMode && console.log(pc.yellow("📝 Populating configuration via manual input...\n"));
      config = await ensureLocalEnvIsComplete(verbose);
    }
  } catch (error) {
    console.error(pc.red(`\n✗ Error: ${error instanceof Error ? error.message : String(error)}\n`));
    process.exit(1);
  }

  const content = generateEnvFileContent(config);

  console.log(pc.cyan("💾 Writing .env file...\n"));
  fs.writeFileSync(".env", content, {mode: 0o600});

  console.log(pc.green(`   Generated ${pc.green(Object.keys(config).length)} environment variables`));
  console.log(pc.green(`   File: ${pc.cyan(path.resolve(".env"))}\n`));

  // Copy to sub-repositories if needed
  copyEnvFileToSubRepos(".env", ["/sites/arolariu.ro/.env"], verbose);
  return 0;
}

if (import.meta.main) {
  const verbose = process.argv.includes("/verbose") || process.argv.includes("/v");
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(pc.magenta("\n╔══════════════════════════════════════════════════════════════════╗"));
    console.log(pc.magenta("║       ||arolariu.ro|| Environment Generator - Help               ║"));
    console.log(pc.magenta("╚══════════════════════════════════════════════════════════════════╝\n"));
    console.log(pc.cyan("📋 Description:"));
    console.log(pc.gray("   Generates .env file from Azure App Configuration or manual input\n"));
    console.log(pc.cyan("🚀 Usage:"));
    console.log(pc.gray("   npm run generate:env [options]\n"));
    console.log(pc.cyan("⚙️  Options:"));
    console.log(pc.gray("   --help, -h        Show this help message"));
    console.log(pc.gray("   --verbose, -v     Enable verbose logging"));
    console.log(pc.gray("   --azure           Fetch from Azure App Configuration"));
    console.log(pc.gray("   --production      Use production configuration\n"));
    console.log(pc.cyan("📦 Environment Variables:"));
    console.log(pc.gray("   AZURE_CONFIG      Enable Azure mode (true/false)"));
    console.log(pc.gray("   NODE_ENV          Set environment (production/development)"));
    console.log(pc.gray("   CI                Detect CI/CD environment\n"));
    console.log(pc.cyan("📖 Examples:"));
    console.log(pc.gray("   npm run generate:env --azure --production"));
    console.log(pc.gray("   npm run generate:env --verbose\n"));
    process.exit(1);
  }

  try {
    const code = await main(verbose);
    process.exit(code);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
