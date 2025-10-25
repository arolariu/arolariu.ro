import {AppConfigurationClient} from "@azure/app-configuration";
import {DefaultAzureCredential} from "@azure/identity";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import pc from "picocolors";
import {APP_CONFIGURATION_MAPPING, APP_CONFIGURATION_SERVER, getSecretFromKeyVault, isKeyVaultRef, isSecretKey} from "./azure/index.ts";
import {isAzureInfrastructure, isInCI, isProductionEnvironment, isVerboseMode} from "./common/index.ts";
import type {AllEnvironmentVariablesKeys, TypedConfigurationType} from "./types/index.ts";

/**
 * Fetch configuration values from Azure App Configuration.
 * @returns A promise that resolves to the typed configuration object.
 */
async function fetchConfigurationFromAzureAppConfiguration(verbose: boolean = false): Promise<TypedConfigurationType> {
  const appConfigStore = APP_CONFIGURATION_SERVER;
  const appConfigValues = Object.entries(APP_CONFIGURATION_MAPPING);

  verbose && console.info(`🔍 Azure App Configuration server hostname: ${appConfigStore}`);
  verbose && console.info(`🔍 Azure App Configuration values: ${JSON.stringify(appConfigValues, null, 2)}`);

  const credentials = new DefaultAzureCredential();
  const client = new AppConfigurationClient(appConfigStore, credentials);
  const label = isProductionEnvironment ? "PRODUCTION" : "DEVELOPMENT";
  verbose && console.info(`🔍 Azure App Configuration requested label : ${label}`);

  const config = {} as TypedConfigurationType;

  for (const [key, envVar] of appConfigValues) {
    try {
      const setting = await client.getConfigurationSetting({key: key, label: label});
      if (!setting.value) {
        console.log(pc.yellow(`⚠️ No value found for key: ${key}`));
        continue;
      }

      // Check if the value is a Key Vault reference.
      if (isKeyVaultRef(setting.value)) {
        console.log(pc.gray(`📝 Retrieved Key Vault reference for: ${key}`));
        console.log(pc.cyan(`🔑 Fetching secret for KV reference: ${pc.bold(key)}`));
        try {
          const ref = JSON.parse(setting.value);
          config[envVar] = await getSecretFromKeyVault(ref.uri);
          console.log(pc.green(`✅ Retrieved value from Key Vault!`));
        } catch (error: unknown) {
          console.log(pc.red(`❌ Failed to retrieve secret from Key Vault: ${error instanceof Error ? error.message : "Unknown error"}`));
        }
      } else {
        console.log(pc.gray(`📝 Retrieved key: ${key}`));
        config[envVar] = setting.value;
      }
    } catch (error) {
      console.log(pc.red(`❌ Failed to fetch ${key}: ${error instanceof Error ? error.message : "Unknown error"}`));
    }
  }

  console.log(pc.green(`\n   ✓ Fetched ${Object.keys(config).length} configuration values from Azure\n`));
  return config;
}

/**
 * Function to parse an existing .env file and extract key-value pairs.
 * @returns The parsed configuration as a typed object.
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
 * Function to prompt the user for missing environment variable values.
 *
 * @remarks
 * This function interactively requests input from the user for any environment
 * variables that are not already defined in the existing configuration.
 * @param missingKeys An array of keys representing the missing environment variables.
 * @returns A promise that resolves to a partial object containing the newly provided configuration values.
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
 * Function that ensures all required environment variables are present,
 * prompting the user for any that are missing.
 * @returns A promise that resolves to the complete typed configuration object.
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
  let escaped = value.replace(/\\/g, '\\\\');
  // Then escape double quotes
  escaped = escaped.replace(/"/g, '\\"');
  // Escape newlines as literal \n
  escaped = escaped.replace(/\n/g, '\\n');
  // Escape carriage returns as literal \r
  escaped = escaped.replace(/\r/g, '\\r');
  // Escape tabs as literal \t
  escaped = escaped.replace(/\t/g, '\\t');

  return `"${escaped}"`;
}

/**
 * Helper function to add a configuration section to the env file lines.
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

  // API config
  addConfigSection(lines, "API", "🌐", ["API_ENV", "API_NAME", "API_URL", "API_JWT"], config);

  // Auth config
  addConfigSection(lines, "Authentication", "🔐", ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "RESEND_API_KEY"], config);

  // Metadata config
  console.log(pc.gray("   📊 Adding Metadata Configuration..."));
  const timestamp = new Date().toISOString();
  const commitSha = process.env["COMMIT_SHA"] ?? process.env["GITHUB_SHA"] ?? "N/A";
  const configStore = config["CONFIG_STORE"];
  const useCdn = config["USE_CDN"] ?? "false";

  lines.push(
    "",
    "# Metadata Configuration Start",
    `TIMESTAMP=${quoteIfNeeded(timestamp)}`,
    `COMMIT_SHA=${quoteIfNeeded(commitSha)}`,
    ...(configStore ? [`CONFIG_STORE=${quoteIfNeeded(configStore)}`] : []),
    `USE_CDN=${quoteIfNeeded(useCdn)}`,
    "# Metadata Configuration End",
  );

  console.log(pc.green("   ✓ File content generated successfully!\n"));

  return lines.join("\n");
}

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
      isVerboseMode && console.log(pc.cyan("☁️  Fetching configuration from Azure App Configuration...\n"));
      config = await fetchConfigurationFromAzureAppConfiguration(verbose);
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
