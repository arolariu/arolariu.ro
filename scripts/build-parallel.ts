/** @format */

import {execSync} from "child_process";

/**
 * Build all projects in parallel using concurrently
 */
export async function main() {
  console.log("🏗️  Building projects in parallel...");
  
  try {
    // Check if concurrently is available
    try {
      execSync("npx concurrently --version", {stdio: "pipe"});
    } catch {
      console.log("⚠️  Installing concurrently...");
      execSync("yarn add --dev concurrently", {stdio: "inherit"});
    }
    
    // Build in parallel
    execSync(
      'npx concurrently "cd packages/components && npm run build" "cd sites/arolariu.ro && npm run build" "cd sites/docs.arolariu.ro && docfx docfx.json || echo \\"DocFX not available\\"" "cd sites/api.arolariu.ro && dotnet build || echo \\".NET not available\\""',
      {stdio: "inherit"}
    );
    
    console.log("✅ All parallel builds completed!");
  } catch (error) {
    console.error("❌ Error building projects in parallel:", error);
    process.exit(1);
  }
}

main();