/** @format */

import {AppConfigurationClient} from "@azure/app-configuration";
import {DefaultAzureCredential} from "@azure/identity";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import type {
  TypedProductionEnvironmentVariablesType as TypedDevelopmentEnvironment,
  TypedDevelopmentEnvironmentVariablesType as TypedProductionEnvironment,
} from "../src/types";
import {getSecretFromKeyVault, isKeyVaultRef} from "./utils.azure";
import {isSecretKey} from "./utils.generic";

type AllEnvironmentVariablesKeys = keyof (TypedProductionEnvironment | TypedDevelopmentEnvironment);
type TypedConfigurationType = Record<AllEnvironmentVariablesKeys | (string & {}), string>;

const APPCONFIG_MAPPING = {
  "Site:Environment": "SITE_ENV",
  "Site:Name": "SITE_NAME",
  "Site:Url": "SITE_URL",
  "Api:Environment": "API_ENV",
  "Api:Name": "API_NAME",
  "Api:Url": "API_URL",
  "AuthOptions:ClerkPublishableKey": "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "AuthOptions:ClerkSecretKey": "CLERK_SECRET_KEY",
  "AuthOptions:Secret": "API_JWT",
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

  for (const [key, envVar] of Object.entries(APPCONFIG_MAPPING)) {
    try {
      const setting = await client.getConfigurationSetting({key: key, label: label});
      if (!setting.value) continue;

      if (isKeyVaultRef(setting.value)) {
        console.log(`🔑 Fetching secret for ${key} with label ${label} from Key Vault...`);
        const ref = JSON.parse(setting.value);
        config[envVar] = await getSecretFromKeyVault(ref.uri);
      } else {
        config[envVar] = setting.value;
      }
    } catch (error) {
      console.log(`💥 Error: Failed to fetch ${key} with label ${label}: ${JSON.stringify(error, null, 2)}`);
    }
  }

  return config;
}

function parseExistingEnvFile(): TypedConfigurationType {
  const envPath = ".env";
  const config = {} as TypedConfigurationType;

  if (!fs.existsSync(envPath)) {
    console.log("No existing .env file found");
    return config;
  }

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

    console.log(`Parsed ${Object.keys(config).length} existing environment variables`);
  } catch (error) {
    console.log(`Warning: Failed to parse existing .env: ${error}`);
  }

  return config;
}

async function promptForMissingKeys(missingKeys: AllEnvironmentVariablesKeys[]): Promise<TypedConfigurationType> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const config = {} as TypedConfigurationType;

  for (const key of missingKeys) {
    const isSecret = isSecretKey(key);
    const prompt = isSecret ? `Enter value for ${key} (hidden): ` : `Enter value for ${key}: `;

    const value = await new Promise<string>((resolve) => {
      if (isSecret) {
        // Hide input for secrets
        rl.question(prompt, (answer) => {
          resolve(answer.trim());
        });
        // Hide the input by moving cursor and clearing line
        process.stdout.write(prompt + "*".repeat(8) + "\n");
      } else {
        rl.question(prompt, (answer) => {
          resolve(answer.trim());
        });
      }
    });

    if (value) {
      config[key] = value;
    } else {
      console.log(`⚠️ Warning: Empty value provided for ${key}. Please ensure this is intentional.`);
    }
  }

  rl.close();
  return config;
}

async function ensureLocalEnv(): Promise<TypedConfigurationType> {
  // Parse existing .env if it exists
  const existingConfig = parseExistingEnvFile();
  const existingConfigKeys = Object.keys(existingConfig);

  // Find missing keys from REQUIRED array
  const missingKeys = Object.values(APPCONFIG_MAPPING).filter((key) => !existingConfigKeys.includes(key));
  if (missingKeys.length === 0) {
    console.log("✅ All required environment variables are present!");
    return existingConfig;
  }

  console.log(`📝 Missing ${missingKeys.length} required environment variable(s): ${missingKeys.join(", ")}`);

  // Prompt user for missing keys
  const newValues = await promptForMissingKeys(missingKeys);
  // Merge and return complete config
  return {...existingConfig, ...newValues};
}

function generateEnvFileContent(config: TypedConfigurationType): string {
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
  lines.push("# Site Configuration Start");
  ["SITE_ENV", "SITE_NAME", "SITE_URL"].forEach((key) => {
    if (config[key]) {
      const quoted = config[key].includes(" ") || config[key].includes("=") ? `"${config[key]}"` : config[key];
      lines.push(`${key}=${quoted}`);
    }
  });
  lines.push("# Site Configuration End");

  // Auth config
  lines.push("", "# Authentication Configuration Start");
  ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY", "RESEND_API_KEY"].forEach((key) => {
    if (config[key]) {
      lines.push(`${key}=${config[key]}`);
    }
  });
  lines.push("# Authentication Configuration End");

  // API config
  lines.push("", "# API Configuration Start");
  ["API_ENV", "API_NAME", "API_URL", "API_JWT"].forEach((key) => {
    if (config[key]) {
      const quoted = config[key].includes(" ") || config[key].includes("=") ? `"${config[key]}"` : config[key];
      lines.push(`${key}=${quoted}`);
    }
  });
  lines.push("# API Configuration End");

  // Metadata config
  lines.push("", "# Metadata Configuration Start");
  lines.push(`TIMESTAMP=${new Date().toISOString()}`);
  lines.push(`COMMIT_SHA=${process.env["COMMIT_SHA"] ?? process.env["GITHUB_SHA"] ?? "N/A"}`);
  lines.push(`CONFIG_STORE=${config["CONFIG_STORE"]}`);
  lines.push(`USE_CDN=${config["USE_CDN"] ?? "false"}`);
  lines.push("# Metadata Configuration End");

  return lines.join("\n");
}

export async function main(): Promise<void> {
  console.log("Starting environment configuration generation...");
  console.log(`Infrastructure requested: ${isAzure ? "Azure" : "Local"}`);
  console.log(`Infrastructure environment: ${isProduction ? "production" : "development"}`);
  console.log(`Agent is verbose: ${isVerbose ? "✅ True" : "❌ False"}`);
  console.log(`Agent environment: ${isCI ? "CI/CD" : "Local"}`);
  console.log(`Agent working directory: ${path.resolve(".")}`);
  console.log(`Agent output file: .env`);

  let config = {} as TypedConfigurationType;
  try {
    if (isAzure) {
      isVerbose && console.log("Fetching configuration from Azure App Configuration...");
      config = await fetchFromAzure();
    } else {
      isVerbose && console.log("Populating configuration via manual input...");
      config = await ensureLocalEnv();
    }
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  const content = generateEnvFileContent(config);
  fs.writeFileSync(".env", content, {mode: 0o600});
  console.log(`✅ Generated ${Object.keys(config).length} environment variables.`);
  console.log(`📁 File: ${path.resolve(".env")}`);
}

await main();
