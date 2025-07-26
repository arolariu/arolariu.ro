/** @format */

import {execSync} from "child_process";

/**
 * Build Next.js website
 */
export async function main() {
  console.log("🌐 Building website...");
  
  try {
    execSync("cd sites/arolariu.ro && npm run build", {stdio: "inherit"});
    console.log("✅ Website built successfully!");
  } catch (error) {
    console.error("❌ Error building website:", error);
    process.exit(1);
  }
}

main();