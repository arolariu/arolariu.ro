/** @format */

import {execSync} from "child_process";

/**
 * Build DocFX documentation
 */
export async function main() {
  console.log("📚 Building documentation...");
  
  try {
    execSync("cd sites/docs.arolariu.ro && docfx docfx.json", {stdio: "inherit"});
    console.log("✅ Documentation built successfully!");
  } catch (error) {
    console.log("⚠️  DocFX not available - install DocFX to build documentation");
    process.exit(1);
  }
}

main();