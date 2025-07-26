/** @format */

import {execSync} from "child_process";

/**
 * Format all projects
 */
export async function main() {
  console.log("💅 Formatting all projects...");
  
  try {
    // Format components (when configured)
    console.log("📦 Formatting components...");
    console.log("⚠️  Component formatting not configured yet");
    
    // Format website
    console.log("🌐 Formatting website...");
    execSync("cd sites/arolariu.ro && npm run format", {stdio: "inherit"});
    
    console.log("✅ All formatting completed!");
  } catch (error) {
    console.error("❌ Error formatting projects:", error);
    process.exit(1);
  }
}

main();