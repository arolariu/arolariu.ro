/** @format */

import {execSync} from "child_process";

/**
 * Build React component library
 */
export async function main() {
  console.log("📦 Building components...");
  
  try {
    execSync("cd packages/components && npm run build", {stdio: "inherit"});
    console.log("✅ Components built successfully!");
  } catch (error) {
    console.error("❌ Error building components:", error);
    process.exit(1);
  }
}

main();