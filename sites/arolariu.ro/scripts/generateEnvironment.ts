/** @format */

import {AppConfigurationClient} from "@azure/app-configuration";
import {DefaultAzureCredential} from "@azure/identity";
import fs from "node:fs";
import path from "node:path";

export async function main() {
  const infra = process.env["INFRA"] ?? "local";
  const environment = process.env.NODE_ENV || "development";
  const isProduction = environment === "production";

  const envVariables = new Map<string, string>();

  // Common variables
  envVariables.set("#### - SITE ENVIRONMENT VARIABLES START - ####", "");
  envVariables.set("SITE_NAME", isProduction ? "arolariu.ro" : "dev.arolariu.ro");
  envVariables.set("SITE_URL", isProduction ? "https://arolariu.ro" : "https://dev.arolariu.ro");
  envVariables.set("SITE_ENV", environment.toUpperCase());
  envVariables.set("#### - SITE ENVIRONMENT VARIABLES END - ####", "\n");

  envVariables.set("#### - API ENVIRONMENT VARIABLES START - ####", "");
  envVariables.set("API_NAME", "api.arolariu.ro");
  envVariables.set("API_URL", "https://api.arolariu.ro");
  envVariables.set("API_ENV", "PRODUCTION");
  envVariables.set("#### - API ENVIRONMENT VARIABLES END - ####", "\n");

  envVariables.set("#### - GENERAL ENVIRONMENT VARIABLES START - ####", "");
  envVariables.set("TIMESTAMP", new Date().toISOString());
  envVariables.set("COMMIT_SHA", process.env["COMMIT_SHA"] ?? "N/A");
  envVariables.set("USE_CDN", isProduction ? "true" : "false");
  envVariables.set("#### - GENERAL ENVIRONMENT VARIABLES END - ####", "\n");

  // GIT_COMMIT_SHA is a common CI variable

  if (infra === "azure") {
    envVariables.set("AZURE_CLIENT_ID", process.env["AZURE_CLIENT_ID"] ?? "");
    envVariables.set("AZURE_TENANT_ID", process.env["AZURE_TENANT_ID"] ?? "");
    const credentials = new DefaultAzureCredential();

    const client = new AppConfigurationClient("https://arolariu-app-config.azconfig.io", credentials);

    envVariables.set("#### - AZURE ENVIRONMENT VARIABLES START - ####", "");
    const API_JWT = await client.getConfigurationSetting({key: "AuthOptions:Secret"});
    envVariables.set("#### - AZURE ENVIRONMENT VARIABLES END - ####", "\n");

    // Secrets that would be set in a CI/CD environment or a secure vault
    envVariables.set("#### - SECRETS START - ####", "");
    envVariables.set("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", process.env["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"] ?? "");
    envVariables.set("CLERK_SECRET_KEY", process.env["CLERK_SECRET_KEY"] ?? "");
    envVariables.set("API_JWT", API_JWT.value ?? "");
    envVariables.set("RESEND_API_KEY", process.env["RESEND_API_KEY"] ?? "");
    envVariables.set("CONFIG_STORE", process.env["CONFIG_STORE"] ?? "");
    envVariables.set("#### - SECRETS END - ####", "\n");
  } else {
    envVariables.set("#### - LOCAL ENVIRONMENT VARIABLES START - ####", "");
    envVariables.set("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "your-local-clerk-publishable-key");
    envVariables.set("CLERK_SECRET_KEY", "your-local-clerk-secret-key");
    envVariables.set("API_JWT", "your-local-api-jwt");
    envVariables.set("RESEND_API_KEY", "your-local-resend-api-key");
    envVariables.set("CONFIG_STORE", "your-local-config-store");
    envVariables.set("#### - LOCAL ENVIRONMENT VARIABLES END - ####", "\n");
  }

  const envContent = Array.from(envVariables.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const outputPath = path.join(process.cwd(), ".env.local");
  fs.writeFileSync(outputPath, envContent);

  console.log(
    `.env.local file generated successfully for ${infra.toUpperCase()} infrastructure and ${environment.toUpperCase()} environment at ${outputPath}`,
  );
}

await main();
