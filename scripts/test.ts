/** @format */

import {execSync} from "child_process";

/**
 * Run all tests across the monorepo
 */
export async function main() {
  console.log("🧪 Running all tests...");
  
  try {
    // Test components (when configured)
    console.log("📦 Testing components...");
    console.log("⚠️  Component tests not configured yet");
    
    // Test website
    console.log("🌐 Testing website...");
    execSync("cd sites/arolariu.ro && npm run test", {stdio: "inherit"});
    
    console.log("✅ All tests completed!");
  } catch (error) {
    console.error("❌ Error running tests:", error);
    process.exit(1);
  }
}

main();