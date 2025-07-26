/** @format */

import {execSync} from "child_process";

/**
 * Lint all projects
 */
export async function main() {
  console.log("🔍 Linting all projects...");
  
  try {
    // Lint components (when configured)
    console.log("📦 Linting components...");
    console.log("⚠️  Component linting not configured yet");
    
    // Lint website
    console.log("🌐 Linting website...");
    execSync("cd sites/arolariu.ro && npm run lint", {stdio: "inherit"});
    
    console.log("✅ All linting completed!");
  } catch (error) {
    console.error("❌ Error linting projects:", error);
    process.exit(1);
  }
}

main();