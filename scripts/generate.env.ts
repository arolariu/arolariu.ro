import {AppConfigurationClient} from "@azure/app-configuration";
import {DefaultAzureCredential} from "@azure/identity";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import pc from "picocolors";
import {getSecretFromKeyVault, isKeyVaultRef, isSecretKey} from "./azure/index.ts";
import type {TypedDevelopmentEnvironmentVariablesType, TypedProductionEnvironmentVariablesType} from "./types/index.ts";

type AllEnvironmentVariablesKeys = keyof (TypedProductionEnvironmentVariablesType | TypedDevelopmentEnvironmentVariablesType);
type TypedConfigurationType = Record<AllEnvironmentVariablesKeys | (string & {}), string>;

const APPCONFIG_MAPPING = {
  "Common:Site:Environment": "SITE_ENV",
  "Common:Site:Name": "SITE_NAME",
  "Common:Site:Url": "SITE_URL",
  "Common:Api:Environment": "API_ENV",
  "Common:Api:Name": "API_NAME",
  "Common:Api:Url": "API_URL",
  "Common:Auth:Secret": "API_JWT",
  "Other:ClerkPublishableKey": "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "Other:ClerkSecretKey": "CLERK_SECRET_KEY",
  "Other:ResendKey": "RESEND_API_KEY",
  "Other:UseCdn": "USE_CDN",
} satisfies Record<string, AllEnvironmentVariablesKeys>;

const isProduction = process.env["PRODUCTION"] === "true";
const isAzure = process.env["INFRA"] === "azure";
const isVerbose = process.env["VERBOSE"] === "true";
const isCI = !!(process.env["CI"] ?? process.env["GITHUB_ACTIONS"]);

async function fetchFromAzure(): Promise<TypedConfigurationType> {
  const appConfigStore = "https://qtcy47appconfig.azconfig.io";
  const credentials = new DefaultAzureCredential();
  const client = new AppConfigurationClient(appConfigStore, credentials);

  const config = {} as TypedConfigurationType;
  const label = isProduction ? "PRODUCTION" : "DEVELOPMENT";

  console.log(pc.cyan(`\n☁️  Fetching configuration from Azure App Configuration...`));
  console.log(pc.gray(`   Store: ${appConfigStore}`));
  console.log(pc.gray(`   Label: ${label}\n`));

  for (const [key, envVar] of Object.entries(APPCONFIG_MAPPING)) {
    try {
      const setting = await client.getConfigurationSetting({key: key, label: label});
      if (!setting.value) {
        console.log(pc.yellow(`   ⚠ No value found for ${key}`));
        continue;
      }

      if (isKeyVaultRef(setting.value)) {
        console.log(pc.cyan(`   🔑 Fetching secret: ${pc.bold(key)}`));
        const ref = JSON.parse(setting.value);
        config[envVar] = await getSecretFromKeyVault(ref.uri);
        console.log(pc.green(`      ✓ Retrieved from Key Vault`));
      } else {
        console.log(pc.gray(`   📝 Retrieved: ${key}`));
        config[envVar] = setting.value;
      }
    } catch (error) {
      console.log(pc.red(`   ✗ Failed to fetch ${key}: ${error instanceof Error ? error.message : "Unknown error"}`));
    }
  }

  console.log(pc.green(`\n   ✓ Fetched ${Object.keys(config).length} configuration values from Azure\n`));
  return config;
}

function parseExistingEnvFile(): TypedConfigurationType {
  const envPath = ".env";
  const config = {} as TypedConfigurationType;

  if (!fs.existsSync(envPath)) {
    console.log(pc.gray("   📄 No existing .env file found"));
    return config;
  }

  console.log(pc.cyan(`\n📖 Parsing existing .env file...`));

  try {
    const content = fs.readFileSync(envPath, "utf-8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          let value = valueParts.join("=");
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          config[key as AllEnvironmentVariablesKeys] = value;
        }
      }
    }

    console.log(pc.green(`   ✓ Parsed ${Object.keys(config).length} existing environment variables\n`));
  } catch (error) {
    console.log(pc.yellow(`   ⚠ Warning: Failed to parse existing .env: ${error}\n`));
  }

  return config;
}

async function promptForMissingKeys(missingKeys: AllEnvironmentVariablesKeys[]): Promise<TypedConfigurationType> {
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
      console.log(pc.yellow(`      ⚠️ Warning: Empty value provided for ${key}. Please ensure this is intentional.`));
    }
    count++;
  }

  rl.close();
  console.log(pc.green("\n   ✓ All missing keys have been provided!\n"));
  return config;
}

async function ensureLocalEnv(): Promise<TypedConfigurationType> {
  console.log(pc.cyan("\n🔧 Ensuring local environment configuration...\n"));

  // Parse existing .env if it exists
  const existingConfig = parseExistingEnvFile();
  const existingConfigKeys = Object.keys(existingConfig);

  // Find missing keys from REQUIRED array
  const missingKeys = Object.values(APPCONFIG_MAPPING).filter((key) => !existingConfigKeys.includes(key));
  if (missingKeys.length === 0) {
    console.log(pc.green("   ✅ All required environment variables are present!\n"));
    return existingConfig;
  }

  console.log(pc.yellow(`   📝 Missing ${missingKeys.length} required environment variable(s):`));
  missingKeys.forEach((key) => console.log(pc.gray(`      • ${key}`)));
  console.log();

  // Prompt user for missing keys
  const newValues = await promptForMissingKeys(missingKeys);
  // Merge and return complete config
  console.log(pc.green("   ✓ Configuration merged successfully!\n"));
  return {...existingConfig, ...newValues};
}

function generateEnvFileContent(config: TypedConfigurationType): string {
  console.log(pc.cyan("\n📝 Generating .env file content...\n"));

  const lines = [
    "# Generated environment configuration",
    `# Site Environment: ${process.env["NODE_ENV"] || "development"}`,
    `# CI/CD: ${isCI ? "true" : "false"}`,
    `# Commit SHA: ${process.env["COMMIT_SHA"] ?? process.env["GITHUB_SHA"] ?? "N/A"}`,
    `# Generated at: ${new Date().toISOString()}`,
    "# !!!! DO NOT EDIT MANUALLY !!!",
    "",
  ];

  // Site config
  console.log(pc.gray("   📦 Adding Site Configuration..."));
  lines.push("# Site Configuration Start");
  ["SITE_ENV", "SITE_NAME", "SITE_URL"].forEach((key) => {
    if (config[key]) {
      const quoted = config[key].includes(" ") || config[key].includes("=") ? `"${config[key]}"` : config[key];
      lines.push(`${key}=${quoted}`);
    }
  });
  lines.push("# Site Configuration End");

  // Auth config
  console.log(pc.gray("   🔐 Adding Authentication Configuration..."));
  lines.push("", "# Authentication Configuration Start");
  ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "RESEND_API_KEY"].forEach((key) => {
    if (config[key]) {
      lines.push(`${key}=${config[key]}`);
    }
  });
  lines.push("# Authentication Configuration End");

  // API config
  console.log(pc.gray("   🌐 Adding API Configuration..."));
  lines.push("", "# API Configuration Start");
  ["API_ENV", "API_NAME", "API_URL", "API_JWT"].forEach((key) => {
    if (config[key]) {
      const quoted = config[key].includes(" ") || config[key].includes("=") ? `"${config[key]}"` : config[key];
      lines.push(`${key}=${quoted}`);
    }
  });
  lines.push("# API Configuration End");

  // Metadata config
  console.log(pc.gray("   📊 Adding Metadata Configuration..."));
  lines.push("", "# Metadata Configuration Start");
  lines.push(`TIMESTAMP=${new Date().toISOString()}`);
  lines.push(`COMMIT_SHA=${process.env["COMMIT_SHA"] ?? process.env["GITHUB_SHA"] ?? "N/A"}`);
  lines.push(`CONFIG_STORE=${config["CONFIG_STORE"]}`);
  lines.push(`USE_CDN=${config["USE_CDN"] ?? "false"}`);
  lines.push("# Metadata Configuration End");

  console.log(pc.green("   ✓ File content generated successfully!\n"));

  return lines.join("\n");
}

export async function main(): Promise<number> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(pc.magenta("\n╔══════════════════════════════════════════════════════════════════╗"));
    console.log(pc.magenta("║       Environment Configuration Generator - Help                 ║"));
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
    return 0;
  }

  console.log(pc.magenta("\n╔══════════════════════════════════════════════════════════════════╗"));
  console.log(pc.magenta("║       Environment Configuration Generator                        ║"));
  console.log(pc.magenta("╚══════════════════════════════════════════════════════════════════╝\n"));

  console.log(pc.cyan("🔧 Configuration:\n"));
  console.log(pc.gray(`   Infrastructure: ${isAzure ? pc.blue("Azure") : pc.yellow("Local")}`));
  console.log(pc.gray(`   Environment: ${isProduction ? pc.red("production") : pc.green("development")}`));
  console.log(pc.gray(`   Verbose: ${isVerbose ? pc.green("✅ Enabled") : pc.gray("❌ Disabled")}`));
  console.log(pc.gray(`   Agent: ${isCI ? pc.cyan("CI/CD") : pc.yellow("Local")}`));
  console.log(pc.gray(`   Working Directory: ${pc.dim(path.resolve("."))}`));
  console.log(pc.gray(`   Output File: ${pc.cyan(".env")}\n`));

  let config = {} as TypedConfigurationType;
  try {
    if (isAzure) {
      isVerbose && console.log(pc.cyan("☁️  Fetching configuration from Azure App Configuration...\n"));
      config = await fetchFromAzure();
    } else {
      isVerbose && console.log(pc.yellow("📝 Populating configuration via manual input...\n"));
      config = await ensureLocalEnv();
    }
  } catch (error) {
    console.error(pc.red(`\n✗ Error: ${error instanceof Error ? error.message : String(error)}\n`));
    process.exit(1);
  }

  const content = generateEnvFileContent(config);

  console.log(pc.cyan("💾 Writing .env file...\n"));
  fs.writeFileSync(".env", content, {mode: 0o600});

  console.log(pc.green("╔══════════════════════════════════════════════════════════════════╗"));
  console.log(pc.green("║                    ✓ Success!                                    ║"));
  console.log(pc.green("╚══════════════════════════════════════════════════════════════════╝\n"));
  console.log(pc.gray(`   Generated ${pc.green(Object.keys(config).length)} environment variables`));
  console.log(pc.gray(`   File: ${pc.cyan(path.resolve(".env"))}\n`));

  return 0;
}

if (import.meta.main) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
