/** @format */

import {execSync} from "child_process";

/**
 * Start Storybook development server
 */
export async function main() {
  console.log("🚀 Starting Storybook development server...");
  
  try {
    execSync("cd packages/components && npm run storybook", {stdio: "inherit"});
  } catch (error) {
    console.error("❌ Error starting Storybook:", error);
    process.exit(1);
  }
}

main();